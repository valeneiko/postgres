/* oxlint-disable @typescript-eslint/unbound-method */
import { createHash, createHmac, pbkdf2, randomFill } from 'node:crypto';
import { isIP, Socket } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

import { decode16Base64, encode18Base64, encode32Base64 } from '@/base64';
import { buildParameterEncoder, buildRowParser, type Field } from '@/encoder-factory';
import { SocketReadBuffer } from '@/socket-read-buffer';

import type { CompiledQuery } from '@/index';

interface ConnectionOptions {
  host?: string;
  sni?: string;
  port?: number;
  user?: string;
  database?: string;
  password?: string;
  withSSL?: boolean;
}

export class NormConnectionOptions {
  static readonly #SCRATCH: Uint32Array;
  static readonly #SCRATCH_VIEW: DataView;
  static readonly #CLIENT_KEY_STR: Uint8Array;
  static readonly #SERVER_KEY_STR: Uint8Array;
  static readonly #COMMA_STR: Uint8Array;

  static {
    const buf = Buffer.allocUnsafeSlow(53);

    // @ts-expect-error init read-only properties
    NormConnectionOptions.#SCRATCH = new Uint32Array(buf.buffer, buf.byteOffset, 8);
    // @ts-expect-error init read-only properties
    NormConnectionOptions.#SCRATCH_VIEW = new DataView(buf.buffer, buf.byteOffset, 32);

    buf.write('Client Key', 32, 'ascii');
    buf.write('Server Key', 42, 'ascii');
    // @ts-expect-error init read-only properties
    NormConnectionOptions.#CLIENT_KEY_STR = new Uint8Array(buf.buffer, buf.byteOffset + 32, 10);
    // @ts-expect-error init read-only properties
    NormConnectionOptions.#SERVER_KEY_STR = new Uint8Array(buf.buffer, buf.byteOffset + 42, 10);
    // @ts-expect-error init read-only properties
    NormConnectionOptions.#COMMA_STR = new Uint8Array(buf.buffer, buf.byteOffset + 52, 1);
    NormConnectionOptions.#COMMA_STR[0] = 44 /*,*/;
  }

  readonly #password: string;
  readonly #clientKey: Uint32Array;
  readonly #storedKey: Uint32Array;
  readonly #serverKey: Uint32Array;

  readonly #deriveCb = [] as (() => void)[];

  readonly host: string;
  readonly sni: string | undefined;
  readonly port: number;
  readonly user: string;
  readonly database: string;

  readonly withSSL: boolean;
  readonly startupMessage: Uint8Array;

  ensureInitialized = this.#deriveKeysInitial;

  constructor(opts: ConnectionOptions) {
    this.host = opts.host ?? 'localhost';
    this.user = opts.user ?? 'postgres';
    this.database = opts.database ?? 'postgres';

    const startupMessageLength = 25 + this.user.length + this.database.length;
    const buf = Buffer.allocUnsafeSlow(startupMessageLength + 96);

    // Create static startup message
    const startupMessage = Buffer.from(buf.buffer, buf.byteOffset + 96, startupMessageLength);
    startupMessage.writeInt32BE(startupMessageLength, 0);
    startupMessage.write(
      `\x00\x03\x00\x00user\0${this.user}\0database\0${this.database}\0\0`,
      4,
      'ascii',
    );

    this.sni = (opts.sni ?? isIP(this.host)) ? undefined : this.host;
    this.port = opts.port ?? 5432;
    this.#password = opts.password ?? '';
    this.withSSL = opts.withSSL ?? false;
    this.startupMessage = new Uint8Array(
      startupMessage.buffer,
      startupMessage.byteOffset,
      startupMessage.byteLength,
    );

    this.#clientKey = new Uint32Array(buf.buffer, buf.byteOffset, 8);
    this.#storedKey = new Uint32Array(buf.buffer, buf.byteOffset + 32, 8);
    this.#serverKey = new Uint32Array(buf.buffer, buf.byteOffset + 64, 8);
  }

  clientProof(
    clientMessage: DataView,
    serverMessage: DataView,
    finalMessage: DataView,
    dst: DataView,
  ): void {
    const clientSignatureBuf = createHmac('sha256', this.#storedKey)
      .update(clientMessage)
      .update(NormConnectionOptions.#COMMA_STR)
      .update(serverMessage)
      .update(NormConnectionOptions.#COMMA_STR)
      .update(finalMessage)
      .digest();
    const clientSignature = new Uint32Array(
      clientSignatureBuf.buffer,
      clientSignatureBuf.byteOffset,
      8,
    );
    NormConnectionOptions.#SCRATCH[0] = this.#clientKey[0] ^ clientSignature[0];
    NormConnectionOptions.#SCRATCH[1] = this.#clientKey[1] ^ clientSignature[1];
    NormConnectionOptions.#SCRATCH[2] = this.#clientKey[2] ^ clientSignature[2];
    NormConnectionOptions.#SCRATCH[3] = this.#clientKey[3] ^ clientSignature[3];
    NormConnectionOptions.#SCRATCH[4] = this.#clientKey[4] ^ clientSignature[4];
    NormConnectionOptions.#SCRATCH[5] = this.#clientKey[5] ^ clientSignature[5];
    NormConnectionOptions.#SCRATCH[6] = this.#clientKey[6] ^ clientSignature[6];
    NormConnectionOptions.#SCRATCH[7] = this.#clientKey[7] ^ clientSignature[7];
    encode32Base64(NormConnectionOptions.#SCRATCH_VIEW, dst);
  }

  serverSignature(
    clientMessage: DataView,
    serverMessage: DataView,
    finalMessage: DataView,
  ): Buffer {
    return createHmac('sha256', this.#serverKey)
      .update(clientMessage)
      .update(NormConnectionOptions.#COMMA_STR)
      .update(serverMessage)
      .update(NormConnectionOptions.#COMMA_STR)
      .update(finalMessage)
      .digest();
  }

  #deriveKeysInitial(req: DataView, cb: () => void) {
    const saltSrc = new DataView(req.buffer, req.byteOffset + 62, 24);

    let iterations = req.getUint8(89) - 48;
    let offset = 90;
    while (offset < req.byteLength) {
      iterations = iterations * 10 + (req.getUint8(offset++) - 48);
    }

    this.ensureInitialized = this.#deriveKeysWait;
    this.#deriveCb.push(cb);
    this.#deriveKeys(saltSrc, iterations);
  }

  #deriveKeysWait(_req: DataView, cb: () => void) {
    this.#deriveCb.push(cb);
  }

  static #deriveKeysDone(_req: DataView, cb: () => void) {
    cb();
  }

  #deriveKeys(saltSrc: DataView, iterations: number) {
    const saltDst = new DataView(this.#clientKey.buffer, this.#clientKey.byteOffset, 16);
    decode16Base64(saltSrc, saltDst);
    pbkdf2(this.#password, saltDst, iterations, 32, 'sha256', (err, saltedPassword) => {
      this.#deriveFinalKeys(err, saltedPassword);
    });
  }

  #deriveFinalKeys(err: Error | null, saltedPassword: Buffer) {
    if (err) {
      throw err;
    }

    const clientKeyBuf = createHmac('sha256', saltedPassword)
      .update(NormConnectionOptions.#CLIENT_KEY_STR)
      .digest();
    const serverKeyBuf = createHmac('sha256', saltedPassword)
      .update(NormConnectionOptions.#SERVER_KEY_STR)
      .digest();

    NormConnectionOptions.copyKey(clientKeyBuf, this.#clientKey);
    NormConnectionOptions.copyKey(serverKeyBuf, this.#serverKey);

    const storedKey = createHash('sha256').update(this.#clientKey).digest();
    NormConnectionOptions.copyKey(storedKey, this.#storedKey);

    this.ensureInitialized = NormConnectionOptions.#deriveKeysDone;
    for (const cb of this.#deriveCb) {
      cb();
    }
    this.#deriveCb.length = 0;
  }

  static copyKey(src: Buffer, dst: Uint32Array): void {
    const src32 = new Uint32Array(src.buffer, src.byteOffset, 8);
    dst[0] = src32[0];
    dst[1] = src32[1];
    dst[2] = src32[2];
    dst[3] = src32[3];
    dst[4] = src32[4];
    dst[5] = src32[5];
    dst[6] = src32[6];
    dst[7] = src32[7];
  }
}

export function parseOptions(opts: ConnectionOptions): NormConnectionOptions {
  return new NormConnectionOptions(opts);
}

export class Connection {
  static readonly #SSL_REQUEST: Uint8Array;

  static {
    const buf = Buffer.allocUnsafeSlow(8);
    buf.writeInt32BE(8, 0);
    buf.writeInt32BE(80_877_103, 4);
    // @ts-expect-error init read-only properties
    Connection.#SSL_REQUEST = new Uint8Array(buf.buffer, buf.byteOffset, 8);
  }

  readonly #keyData = { pid: 0, secretKey: 0 };
  readonly #options: NormConnectionOptions;
  readonly #readBuffer: SocketReadBuffer;

  #socket: Socket;
  #resolve: ((result?: unknown[]) => void) | undefined;

  #scramClientMessage: DataView | undefined;
  // #expectedServerSignature: Buffer | undefined;

  readonly #parsed = new Set<number>();
  #scratch: DataView;
  #query: CompiledQuery | undefined;
  #result: unknown[] | undefined;

  #onSecureConnect = () => {
    this.#doStartupMessage();
  };
  #onConnect: () => void;
  #handle: (message: DataView) => void;
  #nextPipelinedHandle: (message: DataView) => void = this.#onParameterDescription;

  constructor(opts: NormConnectionOptions) {
    this.#options = opts;
    this.#readBuffer = new SocketReadBuffer(opts.withSSL, (message) => {
      this.#handle(message);
    });

    this.#socket = new Socket({ onread: this.#readBuffer });
    this.#socket.on('error', (_err) => {
      // console.log('ERROR', err);
    });
    this.#socket.on('close', (_hadError) => {
      // console.log('onClose', hadError);
      this.#resolve?.();
      this.#reset();
    });

    if (this.#options.withSSL) {
      this.#onConnect = () => {
        this.#doSSLRequest();
      };
      this.#handle = this.#onSSLResponse;
    } else {
      this.#onConnect = this.#onSecureConnect;
      this.#handle = this.#onAuthRequest;
    }

    const scratchBuf = Buffer.allocUnsafe(4096);
    this.#scratch = new DataView(scratchBuf.buffer, scratchBuf.byteOffset, scratchBuf.byteLength);
  }

  connect(): Promise<void> {
    this.#socket.connect(
      {
        host: this.#options.host,
        port: this.#options.port,
        keepAlive: true,
        noDelay: true,
      },
      this.#onConnect,
    );

    const { promise, resolve } = Promise.withResolvers<unknown[] | undefined>();
    this.#resolve = resolve;
    return promise as Promise<void>;
  }

  query<T = unknown>(query: CompiledQuery): Promise<T[]> {
    this.#query = query;
    this.#result = [];
    const state = query.state;
    if (this.#parsed.has(state.statementId)) {
      // Bind + Exec + Sync
      this.#handle = this.#onBindComplete;
      this.#doBindExecSync(0);
    } else if (state.described) {
      // Parse + Bind + Exec + Sync
      this.#handle = this.#onParseComplete;
      this.#nextPipelinedHandle = this.#onBindComplete;

      // Copy Parse
      const copyEnd = state.describeOffset - 8;
      for (let i = 0; i < copyEnd; i += 8) {
        this.#scratch.setBigUint64(i, state.message.readBigUInt64BE(i));
      }
      this.#scratch.setBigUint64(copyEnd, state.message.readBigUInt64BE(copyEnd));

      this.#doBindExecSync(state.describeOffset);
    } else {
      // Pase + Describe + Flush (later: Bind + Exec + Sync)
      this.#handle = this.#onParseComplete;
      this.#nextPipelinedHandle = this.#onParameterDescription;

      this.#socket.write(
        new Uint8Array(state.message.buffer, state.message.byteOffset, state.bindOffset),
      );
    }

    const { promise, resolve } = Promise.withResolvers<unknown[] | undefined>();
    this.#resolve = resolve;
    return promise as Promise<T[]>;
  }

  close(): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<unknown[] | undefined>();
    this.#resolve = resolve;

    this.#socket.destroySoon();
    return promise as Promise<void>;
  }

  #reset() {
    this.#readBuffer.reset();
    this.#handle = this.#onAuthRequest;
    this.#keyData.pid = 0;
    this.#keyData.secretKey = 0;
    this.#parsed.clear();
    this.#query = undefined;
    this.#result = undefined;
  }

  #doSSLRequest() {
    this.#socket.write(Connection.#SSL_REQUEST);
  }

  #doStartupMessage() {
    this.#socket.write(this.#options.startupMessage);
  }

  #doScramInitialMessage() {
    const nonce = Buffer.allocUnsafe(18);
    const nonceView = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);

    // Start generating nonce in the background
    randomFill(nonceView, () => {
      const nonceDst = new DataView(data.buffer, data.byteOffset + data.byteLength - 24, 24);
      encode18Base64(nonceView, nonceDst);
      this.#scramClientMessage = new DataView(
        data.buffer,
        data.byteOffset + 26,
        data.byteLength - 26,
      );
      this.#socket.write(data);
    });

    // While we prepare the rest of the message
    const scramLength = 32 + this.#options.user.length;
    const length = 22 + scramLength;

    const data = Buffer.allocUnsafe(length + 1);
    data.writeUint8(112 /*p*/, 0);
    data.writeInt32BE(length, 1);
    data.write('SCRAM-SHA-256\0', 5, 'ascii');
    data.writeInt32BE(scramLength, 19);

    // SCRAM message
    data.write(`n,,n=${this.#options.user},r=`, 23, 'utf8');
  }

  #doScramFinalMessage(req: DataView) {
    // Start hashing in the background
    const data = Buffer.allocUnsafe(109);

    // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- created in doScramInitialMessage
    const clientMessage = this.#scramClientMessage!;
    const serverMessage = new DataView(req.buffer, req.byteOffset + 9, req.byteLength - 9);
    const finalMessage = new DataView(data.buffer, data.byteOffset + 5, 57);

    // While we prepare the rest of the message
    data.writeInt8(112 /*p*/, 0);
    data.writeInt32BE(108, 1);

    // SCRAM message
    data.write('c=biws,', 5, 'utf8');

    // Copy server nonce to the write buffer (includes the r=)
    const serverNonce = new Uint32Array(req.buffer, req.byteOffset + 9, 12);
    const dstServerNonce = new Uint32Array(data.buffer, data.byteOffset + 12, 12);
    dstServerNonce[0] = serverNonce[0];
    dstServerNonce[1] = serverNonce[1];
    dstServerNonce[2] = serverNonce[2];
    dstServerNonce[3] = serverNonce[3];
    dstServerNonce[4] = serverNonce[4];
    dstServerNonce[5] = serverNonce[5];
    dstServerNonce[6] = serverNonce[6];
    dstServerNonce[7] = serverNonce[7];
    dstServerNonce[8] = serverNonce[8];
    dstServerNonce[9] = serverNonce[9];
    dstServerNonce[10] = serverNonce[10];
    dstServerNonce[11] = serverNonce[11];
    data.writeUint16BE(req.getUint16(57, false), 60);
    data.write(',p=', 62, 'utf8');

    const dstClientProof = new DataView(data.buffer, data.byteOffset + 65, 44);

    this.#options.clientProof(clientMessage, serverMessage, finalMessage, dstClientProof);
    this.#socket.write(data);
    // TODO: validate
    // this.#expectedServerSignature = this.#options.serverSignature(
    //   clientMessage,
    //   serverMessage,
    //   finalMessage,
    // );
    this.#scramClientMessage = undefined;
  }

  #doBindExecSync(scratchOffset: number) {
    // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- initialized in query
    const { state, parameters } = this.#query!;

    // Copy Bind (prefix)
    this.#scratch.setUint8(scratchOffset, 66 /* B */);
    const copyEnd = state.bindBaseLength - 7;
    for (let i = 5; i < copyEnd; i += 8) {
      this.#scratch.setBigUint64(
        scratchOffset + i,
        state.message.readBigUInt64BE(state.bindOffset + i),
      );
    }
    this.#scratch.setBigUint64(
      scratchOffset + state.bindBaseLength - 7,
      state.message.readBigUInt64BE(state.message.byteLength - 8),
    );

    // Write params and bind length
    const paramLength = state.writeParameters(
      parameters,
      this.#scratch,
      scratchOffset + state.bindBaseLength + 1,
    );
    const bindLength = state.bindBaseLength + paramLength + 4;
    this.#scratch.setUint32(scratchOffset + 1, bindLength);

    // Copy Bind (suffix) + Execute + Sync
    const offset = scratchOffset + bindLength - 3;
    this.#scratch.setBigUint64(offset, 281_480_429_305_856n);
    this.#scratch.setBigUint64(offset + 8, 648_518_346_341_372_672n);
    this.#scratch.setUint32(offset + 15, 4);

    this.#socket.write(new Uint8Array(this.#scratch.buffer, this.#scratch.byteOffset, offset + 19));
  }

  #onSSLResponse(message: DataView) {
    if (message.byteLength !== 1) {
      throw Object.assign(new Error('unexpected response'), {
        byteLength: message.byteLength,
      });
    }

    this.#handle = this.#onAuthRequest;
    switch (message.getInt8(0)) {
      case 83 /*S*/: {
        const tcpSocket = this.#socket;
        this.#socket = tlsConnect(
          {
            socket: tcpSocket,
            ALPNProtocols: ['postgresql'],
            servername: this.#options.sni,
          },
          this.#onSecureConnect,
        );

        // Workaround for TLS socket removing onread
        // https://github.com/nodejs/node/blob/2ac18ce50f7689dd2d9f0a9f3dd08d5d7b0c7081/lib/_tls_wrap.js#L568-L576
        Reflect.apply(Socket, this.#socket, [
          {
            handle: (this.#socket as { _handle?: unknown })._handle,
            allowHalfOpen: this.#socket.allowHalfOpen,
            pauseOnCreate: undefined,
            manualStart: true,
            highWaterMark: undefined,
            onread: this.#readBuffer,
            signal: undefined,
          },
        ]);
        (this.#socket as { _parent?: Socket })._parent = tcpSocket;

        return;
      }
      case 78 /*N*/: {
        // TODO: close connection if SSL required
        this.#doStartupMessage();
        return;
      }
      default: {
        throw Object.assign(new Error('unexpected response content'), {
          content: String.fromCodePoint(message.getInt8(0)),
        });
      }
    }
  }

  #onAuthRequest(message: DataView) {
    // Authentication
    const kind = message.getInt8(0);
    if (kind === 82) {
      const authType = message.getInt32(5, false);
      switch (authType) {
        // AuthenticationSASL
        case 10: {
          this.#handle = this.#onAuthSaslContinue;
          this.#doScramInitialMessage();
          return;
        }
        // AuthenticationOk
        case 0: {
          this.#handle = this.#onParameterStatus;
          return;
        }
        // AuthenticationMD5Password
        case 5: {
          // this.handle = ParseConsumer.prototype.#authSaslContinue;
          // return;
          throw new Error('not implemented: AuthenticationMD5Password');
        }
        // AuthenticationCleartextPassword
        case 3: {
          // this.handle = ParseConsumer.prototype.#authSaslContinue;
          // return;
          throw new Error('not implemented: AuthenticationCleartextPassword');
        }
        default: {
          throw Object.assign(new Error('authType not supported'), {
            authType,
          });
        }
      }
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onAuthSaslContinue(message: DataView) {
    // Authentication
    const kind = message.getInt8(0);
    if (kind === 82) {
      const authType = message.getInt32(5, false);
      // AuthenticationSASLContinue
      if (authType === 11) {
        this.#handle = this.#onAuthSaslFinal;
        this.#options.ensureInitialized(message, () => {
          this.#doScramFinalMessage(message);
        });
        return;
      }

      throw Object.assign(new Error('authType not supported'), {
        authType,
      });
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onAuthSaslFinal(message: DataView) {
    // Authentication
    const kind = message.getInt8(0);
    if (kind === 82) {
      const authType = message.getInt32(5, false);
      // AuthenticationSASLFinal
      if (authType === 12) {
        this.#handle = this.#onAuthOk;
        return;
      }

      throw Object.assign(new Error('authType not supported'), {
        authType,
      });
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onAuthOk(message: DataView) {
    // AuthenticationOK
    const kind = message.getInt8(0);
    if (kind === 82) {
      this.#handle = this.#onParameterStatus;
      return;
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onParameterStatus(message: DataView) {
    const kind = message.getInt8(0);
    switch (kind) {
      // ParameterStatus
      case 83: {
        // let nameEnd = 4;
        // while (message.getInt8(++nameEnd) !== 0);
        // let valueEnd = nameEnd;
        // while (message.getInt8(++valueEnd) !== 0);

        // const buf = Buffer.from(
        //   message.buffer,
        //   message.byteOffset,
        //   message.byteLength,
        // );
        // const name = buf.toString(undefined, 5, nameEnd);
        // const value = buf.toString(undefined, nameEnd + 1, valueEnd);
        return;
      }
      // BackendKeyData
      case 75: {
        this.#keyData.pid = message.getInt32(5, false);
        this.#keyData.secretKey = message.getInt32(9, false);
        this.#handle = this.#onReadyForQuery;
        return;
      }
      default: {
        throw Object.assign(new Error('message not supported'), { type: kind });
      }
    }
  }

  #onReadyForQuery(message: DataView) {
    // ReadyForQuery
    const kind = message.getInt8(0);
    if (kind === 90) {
      // I(73) - idle, T(84) - transaction, E(69) - failed transaction
      // const status = message.getInt8(5);
      // this.#handle = this.#onQuery;

      const result = this.#result;
      this.#result = undefined;

      // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- initialized on connection
      this.#resolve!(result);
      return;
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onParseComplete(message: DataView) {
    // ParseComplete
    const kind = message.getInt8(0);
    if (kind === 49) {
      // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- initialized in query
      this.#parsed.add(this.#query!.state.statementId);
      this.#handle = this.#nextPipelinedHandle;
      return;
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onParameterDescription(message: DataView) {
    // ParameterDescription
    const kind = message.getInt8(0);
    if (kind === 116) {
      const nParams = message.getInt16(5, false);
      const paramTypes = new Array<number>(nParams);
      for (let i = 0, offset = 7; i < nParams; i++, offset += 4) {
        paramTypes[i] = message.getInt32(offset, false);
      }

      // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- initialized in query
      this.#query!.state.writeParameters = buildParameterEncoder(paramTypes);
      this.#handle = this.#onRowDescription;
      this.#doBindExecSync(0);
      return;
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onRowDescription(message: DataView) {
    // RowDescription
    const kind = message.getInt8(0);
    if (kind === 84) {
      const nFields = message.getInt16(5, false);
      const fields = new Array<Field>(nFields);
      const buf = Buffer.from(message.buffer, message.byteOffset, message.byteLength);
      for (let i = 0, offset = 7; i < nFields; i++) {
        let nameEnd = offset;
        while (message.getInt8(nameEnd++) !== 0) {}
        fields[i] = {
          name: buf.toString(undefined, offset, nameEnd - 1),
          // table: message.getInt32(nameEnd, false),
          // columnIdx: message.getInt16(nameEnd + 4, false),
          type: message.getInt32(nameEnd + 6, false),
          // typeSize: message.getInt16(nameEnd + 10, false),
          // typeModifier: message.getInt32(nameEnd + 12, false),
          // format: message.getInt16(nameEnd + 16, false),
        };
        offset = nameEnd + 18;
      }

      // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- initialized in query
      const state = this.#query!.state;
      state.parseResult = buildRowParser(fields);
      state.described = true;
      this.#handle = this.#onBindComplete;
      return;
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onBindComplete(message: DataView) {
    // BindComplete
    const kind = message.getInt8(0);
    if (kind === 50) {
      this.#handle = this.#onDataRow;
      return;
    }

    throw Object.assign(new Error('message not supported'), { type: kind });
  }

  #onDataRow(message: DataView) {
    const kind = message.getInt8(0);
    switch (kind) {
      // DataRow
      case 68: {
        // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- initialized in query
        const value = this.#query!.state.parseResult(message, 7);
        // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- initialized in query
        this.#result!.push(value);

        this.#handle = this.#onDataRow;
        return;
      }
      // CommandComplete
      case 67: {
        // TODO
        // const buf = Buffer.from(message.buffer, message.byteOffset, message.byteLength);
        // if (message.getInt8(11) === 32) {
        //   this.#rowCount = Number.parseInt(
        //     buf.toString(undefined, message.getInt8(5) === 73 ? 14 : 12, buf.length - 1),
        //   );
        // } else if (message.getInt8(9) === 32) {
        //   this.#rowCount = Number.parseInt(buf.toString(undefined, 10, buf.length - 1));
        // } else if (message.getInt8(10) === 32) {
        //   this.#rowCount = Number.parseInt(buf.toString(undefined, 11, buf.length - 1));
        // }
        this.#handle = this.#onReadyForQuery;
        return;
      }
      default: {
        throw Object.assign(new Error('message not supported'), { type: kind });
      }
    }
  }
}
