/* oxlint-disable @typescript-eslint/unbound-method */
/* oxlint-disable @typescript-eslint/no-extraneous-class */

import { bench, describe } from 'vitest';

// import { inspect } from 'node:util';
import { readNoticeOrError } from '@/proto';

const authMessages = [
  'UgAAABcAAAAKU0NSQU0tU0hBLTI1NgAA',
  'UgAAAFwAAAALcj1MVExYdTVJU3lRQU9mN3dqQWVmRytndk5VVUlNTWVSYUJxb3hKMU1rejdLVHhTblkscz13RnJHbnhyWmRuc3RzVUM1RW9COEFnPT0saT00MDk2',
  'UgAAADYAAAAMdj03c1ZGcEl1U1EzSlJDQkdkdWRqeUNBOStMU2lScS91UjJQclRlNWJqMDJvPQ==',
  'UgAAAAgAAAAA',
  'UwAAABdpbl9ob3Rfc3RhbmRieQBvZmYA',
  'UwAAABlpbnRlZ2VyX2RhdGV0aW1lcwBvbgA=',
  'UwAAABFUaW1lWm9uZQBVVEMA',
  'UwAAABtJbnRlcnZhbFN0eWxlAHBvc3RncmVzAA==',
  'UwAAABRpc19zdXBlcnVzZXIAb24A',
  'UwAAABZhcHBsaWNhdGlvbl9uYW1lAAA=',
  'UwAAACZkZWZhdWx0X3RyYW5zYWN0aW9uX3JlYWRfb25seQBvZmYA',
  'UwAAABpzY3JhbV9pdGVyYXRpb25zADQwOTYA',
  'UwAAABdEYXRlU3R5bGUASVNPLCBNRFkA',
  'UwAAACNzdGFuZGFyZF9jb25mb3JtaW5nX3N0cmluZ3MAb24A',
  'UwAAACNzZXNzaW9uX2F1dGhvcml6YXRpb24AcG9zdGdyZXMA',
  'UwAAABljbGllbnRfZW5jb2RpbmcAVVRGOAA=',
  'UwAAABhzZXJ2ZXJfdmVyc2lvbgAxNy41AA==',
  'UwAAABlzZXJ2ZXJfZW5jb2RpbmcAVVRGOAA=',
  'SwAAAAwAAACApoYlbw==',
  'WgAAAAVJ',
].map(base64ToDataView);

const queryInit = ['MQAAAAQ=', 'dAAAAAoAAQAAABQ=', 'VAAAAB0AAWludDgAAAAAAAAAAAAAFAAI/////wAA'].map(
  base64ToDataView,
);

const queryExec = [
  'MgAAAAQ=',
  'RAAAABIAAQAAAAgAABvEkGzY4Q==',
  'QwAAAA1TRUxFQ1QgMQA=',
  'WgAAAAVJ',
].map(base64ToDataView);

const dataCounts = [1, 1, 1, 1, 7, 10];

const sparseArray = new Array<(message: DataView) => void>(118);
sparseArray[82 /*R*/] = process_R;
sparseArray[75 /*K*/] = process_K;
sparseArray[50 /*2*/] = process_2;
sparseArray[51 /*3*/] = process_3;
sparseArray[67 /*C*/] = process_C;
sparseArray[100 /*d*/] = process_d;
sparseArray[99 /*c*/] = process_c;
sparseArray[71 /*G*/] = process_G;
sparseArray[72 /*H*/] = process_H;
sparseArray[87 /*W*/] = process_W;
sparseArray[68 /*D*/] = process_D;
sparseArray[73 /*I*/] = process_I;
sparseArray[69 /*E*/] = process_E;
sparseArray[86 /*V*/] = process_V;
sparseArray[118 /*v*/] = process_v;
sparseArray[110 /*n*/] = process_n;
sparseArray[78 /*N*/] = process_N;
sparseArray[65 /*A*/] = process_A;
sparseArray[116 /*t*/] = process_t;
sparseArray[83 /*S*/] = process_S;
sparseArray[49 /*1*/] = process_1;
sparseArray[115 /*s*/] = process_s;
sparseArray[90 /*Z*/] = process_Z;
sparseArray[84 /*T*/] = process_T;

const denseArray = [...sparseArray];
const map = new Map(sparseArray.map((x, i) => [i, x] as const).filter(Boolean));

const smallArray = denseArray.slice(49, 119);

const messages = [...producer()];

describe('parser', () => {
  bench('if', () => {
    for (const message of messages) {
      parseIf(message);
    }
  });

  bench('switch', () => {
    for (const message of messages) {
      parseSwitch(message);
    }
  });

  bench('ternary', () => {
    for (const message of messages) {
      parseTernary(message);
    }
  });

  bench('dense array', () => {
    for (const message of messages) {
      parseDenseArray(message);
    }
  });

  bench('sparse array', () => {
    for (const message of messages) {
      parseSparseArray(message);
    }
  });

  bench('map', () => {
    for (const message of messages) {
      parseMap(message);
    }
  });

  bench('small array', () => {
    for (const message of messages) {
      parseSmallArray(message);
    }
  });

  bench('consumer', () => {
    let handler = ParseConsumer.authSasl;
    for (const message of messages) {
      handler = handler(message);
    }
  });
});

function base64ToDataView(b64: string) {
  const buf = Buffer.from(b64, 'base64');
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
}

function* producer() {
  yield* authMessages;

  for (let i = 0; i < 5; i++) {
    yield* queryInit;
    for (const dc of dataCounts) {
      yield queryExec[0];
      for (let q = 0; q < dc; q++) {
        yield queryExec[1];
      }
      yield queryExec[2];
      yield queryExec[3];
    }
  }
}

function parseIf(message: DataView) {
  const kind = message.getInt8(0);
  if (kind === 68 /*D*/) {
    process_D(message);
  } else if (kind === 50 /*2*/) {
    process_2(message);
  } else if (kind === 67 /*C*/) {
    process_C(message);
  } else if (kind === 90 /*Z*/) {
    process_Z(message);
  } else if (kind === 49 /*1*/) {
    process_1(message);
  } else if (kind === 116 /*t*/) {
    process_t(message);
  } else if (kind === 84 /*T*/) {
    process_T(message);
  } else if (kind === 83 /*S*/) {
    process_S(message);
  } else if (kind === 82 /*R*/) {
    process_R(message);
  } else if (kind === 75 /*K*/) {
    process_K(message);
  } else if (kind === 51 /*3*/) {
    process_3(message);
  } else if (kind === 100 /*d*/) {
    process_d(message);
  } else if (kind === 99 /*c*/) {
    process_c(message);
  } else if (kind === 71 /*G*/) {
    process_G(message);
  } else if (kind === 72 /*H*/) {
    process_H(message);
  } else if (kind === 87 /*W*/) {
    process_W(message);
  } else if (kind === 73 /*I*/) {
    process_I(message);
  } else if (kind === 69 /*E*/) {
    process_E(message);
  } else if (kind === 86 /*V*/) {
    process_V(message);
  } else if (kind === 118 /*v*/) {
    process_v(message);
  } else if (kind === 110 /*n*/) {
    process_n(message);
  } else if (kind === 78 /*N*/) {
    process_N(message);
  } else if (kind === 65 /*A*/) {
    process_A(message);
  } else if (kind === 115 /*s*/) {
    process_s(message);
  }
}

function parseSwitch(message: DataView) {
  const kind = message.getInt8(0);
  switch (kind) {
    case 68 /*D*/: {
      process_D(message);
      break;
    }
    case 50 /*2*/: {
      process_2(message);
      break;
    }
    case 67 /*C*/: {
      process_C(message);
      break;
    }
    case 90 /*Z*/: {
      process_Z(message);
      break;
    }
    case 49 /*1*/: {
      process_1(message);
      break;
    }
    case 116 /*t*/: {
      process_t(message);
      break;
    }
    case 84 /*T*/: {
      process_T(message);
      break;
    }
    case 83 /*S*/: {
      process_S(message);
      break;
    }
    case 82 /*R*/: {
      process_R(message);
      break;
    }
    case 75 /*K*/: {
      process_K(message);
      break;
    }
    case 51 /*3*/: {
      process_3(message);
      break;
    }
    case 100 /*d*/: {
      process_d(message);
      break;
    }
    case 99 /*c*/: {
      process_c(message);
      break;
    }
    case 71 /*G*/: {
      process_G(message);
      break;
    }
    case 72 /*H*/: {
      process_H(message);
      break;
    }
    case 87 /*W*/: {
      process_W(message);
      break;
    }
    case 73 /*I*/: {
      process_I(message);
      break;
    }
    case 69 /*E*/: {
      process_E(message);
      break;
    }
    case 86 /*V*/: {
      process_V(message);
      break;
    }
    case 118 /*v*/: {
      process_v(message);
      break;
    }
    case 110 /*n*/: {
      process_n(message);
      break;
    }
    case 78 /*N*/: {
      process_N(message);
      break;
    }
    case 65 /*A*/: {
      process_A(message);
      break;
    }
    case 115 /*s*/: {
      process_s(message);
      break;
    }
    default: {
      break;
    }
  }
}

function parseTernary(message: DataView) {
  const kind = message.getInt8(0);
  const f =
    kind === 68 /*D*/
      ? process_D
      : kind === 50 /*2*/
        ? process_2
        : kind === 67 /*C*/
          ? process_C
          : kind === 90 /*Z*/
            ? process_Z
            : kind === 49 /*1*/
              ? process_1
              : kind === 116 /*t*/
                ? process_t
                : kind === 84 /*T*/
                  ? process_T
                  : kind === 83 /*S*/
                    ? process_S
                    : kind === 82 /*R*/
                      ? process_R
                      : kind === 75 /*K*/
                        ? process_K
                        : kind === 51 /*3*/
                          ? process_3
                          : kind === 100 /*d*/
                            ? process_d
                            : kind === 99 /*c*/
                              ? process_c
                              : kind === 71 /*G*/
                                ? process_G
                                : kind === 72 /*H*/
                                  ? process_H
                                  : kind === 87 /*W*/
                                    ? process_W
                                    : kind === 73 /*I*/
                                      ? process_I
                                      : kind === 69 /*E*/
                                        ? process_E
                                        : kind === 86 /*V*/
                                          ? process_V
                                          : kind === 118 /*v*/
                                            ? process_v
                                            : kind === 110 /*n*/
                                              ? process_n
                                              : kind === 78 /*N*/
                                                ? process_N
                                                : kind === 65 /*A*/
                                                  ? process_A
                                                  : // oxlint-disable-next-line unicorn/no-nested-ternary -- benchmark
                                                    kind === 115 /*s*/
                                                    ? process_s
                                                    : (undefined as never);
  f(message);
}

function parseDenseArray(message: DataView) {
  const kind = message.getInt8(0);
  denseArray[kind](message);
}

function parseSparseArray(message: DataView) {
  const kind = message.getInt8(0);
  sparseArray[kind](message);
}

function parseMap(message: DataView) {
  const kind = message.getInt8(0);
  // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion
  map.get(kind)!(message);
}

function parseSmallArray(message: DataView) {
  const kind = message.getInt8(0);
  smallArray[kind - 49](message);
}

class ParseConsumer {
  static authSasl(message: DataView) {
    // AuthenticationSASL
    const kind = message.getInt8(0);
    if (kind === 82) {
      process_R(message);
      return ParseConsumer.#authSaslContinue;
    }

    throw new Error('unsupported message');
  }

  static #authSaslContinue(message: DataView) {
    // AuthenticationSASLContinue
    const kind = message.getInt8(0);
    if (kind === 82) {
      process_R(message);
      return ParseConsumer.#authSaslFinal;
    }

    throw new Error('unsupported message');
  }

  static #authSaslFinal(message: DataView) {
    // AuthenticationSASLFinal
    const kind = message.getInt8(0);
    if (kind === 82) {
      process_R(message);
      return ParseConsumer.#authOk;
    }

    throw new Error('unsupported message');
  }

  static #authOk(message: DataView) {
    // AuthenticationOK
    const kind = message.getInt8(0);
    if (kind === 82) {
      process_R(message);
      return ParseConsumer.#parameterStatus;
    }

    throw new Error('unsupported message');
  }

  static #parameterStatus(message: DataView) {
    const kind = message.getInt8(0);
    switch (kind) {
      // ParameterStatus
      case 83: {
        process_S(message);
        return ParseConsumer.#parameterStatus;
      }
      // BackendKeyData
      case 75: {
        process_K(message);
        return ParseConsumer.#readyForQuery;
      }
      default: {
        throw new Error('unsupported message');
      }
    }
  }

  static #readyForQuery(message: DataView) {
    // ReadyForQuery
    const kind = message.getInt8(0);
    if (kind === 90) {
      process_Z(message);
      return ParseConsumer.#query;
    }

    throw new Error('unsupported message');
  }

  static #query(message: DataView) {
    const kind = message.getInt8(0);
    switch (kind) {
      // BindComplete
      case 50: {
        process_2(message);
        return ParseConsumer.#dataRow;
      }
      // ParseComplete
      case 49: {
        process_1(message);
        return ParseConsumer.#parameterDescription;
      }
      default: {
        throw new Error('unsupported message');
      }
    }
  }

  static #parameterDescription(message: DataView) {
    // ParameterDescription
    const kind = message.getInt8(0);
    if (kind === 116) {
      process_t(message);
      return ParseConsumer.#rowDescription;
    }

    throw new Error('unsupported message');
  }

  static #rowDescription(message: DataView) {
    // RowDescription
    const kind = message.getInt8(0);
    if (kind === 84) {
      process_T(message);
      return ParseConsumer.#bindComplete;
    }

    throw new Error('unsupported message');
  }

  static #bindComplete(message: DataView) {
    // BindComplete
    const kind = message.getInt8(0);
    if (kind === 50) {
      process_2(message);
      return ParseConsumer.#dataRow;
    }

    throw new Error('unsupported message');
  }

  static #dataRow(message: DataView) {
    const kind = message.getInt8(0);
    switch (kind) {
      // DataRow
      case 68: {
        process_D(message);
        return ParseConsumer.#dataRow;
      }
      // CommandComplete
      case 67: {
        process_C(message);
        return ParseConsumer.#readyForQuery;
      }
      default: {
        throw new Error('unsupported message');
      }
    }
  }
}

function process_R(message: DataView) {
  // Authentication
  const authType = message.getInt32(5, false);
  switch (authType) {
    case 0: {
      // AuthenticationOk
      return 'AuthenticationOk';
    }
    case 2: {
      // AuthenticationKerberosV5
      return 'AuthenticationKerberosV5';
    }
    case 3: {
      // AuthenticationCleartextPassword
      return 'AuthenticationCleartextPassword';
    }
    case 5: {
      // AuthenticationMD5Password
      const salt = Buffer.from(message.buffer, message.byteOffset + 9, 4);
      return `AuthenticationMD5Password: ${salt.toString('base64')}`;
    }
    case 7: {
      // AuthenticationGSS
      return 'AuthenticationGSS';
    }
    case 8: {
      // AuthenticationGSSContinue
      const authData = Buffer.from(message.buffer, message.byteOffset + 9, message.byteLength - 9);
      return `AuthenticationGSSContinue: ${inspect(authData)}`;
    }
    case 9: {
      // AuthenticationSSPI
      return 'AuthenticationSSPI';
    }
    case 10: {
      // AuthenticationSASL
      const authMethods: string[] = [];
      let offset = 9;
      const messageEnd = message.byteLength;
      const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
      while (offset < messageEnd) {
        const end = buf.indexOf(0, offset);
        if (end === offset) {
          break;
        }

        const name = Buffer.from(
          message.buffer,
          message.byteOffset + offset,
          end - offset,
        ).toString('ascii');
        authMethods.push(name);

        offset = end + 1;
      }
      return `AuthenticationSASL: ${inspect(authMethods, { colors: true, compact: true, showHidden: false })}`;
    }
    case 11: {
      // AuthenticationSASLContinue
      const authData = Buffer.from(
        message.buffer,
        message.byteOffset + 9,
        message.byteLength - 9,
      ).toString('utf8');
      return `AuthenticationSASLContinue: ${authData}`;
    }
    case 12: {
      // AuthenticationSASLFinal
      const authData = Buffer.from(
        message.buffer,
        message.byteOffset + 9,
        message.byteLength - 9,
      ).toString('utf8');
      return `AuthenticationSASLFinal: ${authData}`;
    }
    default: {
      throw Object.assign(new Error('not supported'), { authType });
    }
  }
}
function process_K(message: DataView) {
  // BackendKeyData
  const pid = message.getInt32(5, false);
  const secretKey = message.getInt32(9, false);
  return `BackendKeyData: pid=${pid} ; secretKey=${secretKey}`;
}
function process_2(_message: DataView) {
  // BindComplete
  return 'BindComplete';
}
function process_3(_message: DataView) {
  // CloseComplete
  return 'CloseComplete';
}
function process_C(message: DataView) {
  // CommandComplete
  const tag = Buffer.from(message.buffer, message.byteOffset + 5, message.byteLength - 6).toString(
    'ascii',
  );
  // INSERT 0 count
  // DELETE|UPDATE|MERGE|SELECT|MOVE|FETCH|COPY count
  return `CommandComplete: ${tag}`;
}
function process_d(message: DataView) {
  // CopyData
  const data = Buffer.from(message.buffer, message.byteOffset + 5, message.byteLength - 5);
  return `CopyData ${inspect(data, { colors: true, compact: true })}`;
}
function process_c(_message: DataView) {
  // CopyDone
  return 'CopyDone';
}
function process_G(message: DataView) {
  // CopyInResponse
  const format = message.getInt8(5); // 0 - text, 1 - binary
  const nColumns = message.getInt16(6, false);
  const columnFormats = new Array(nColumns);
  for (let i = 0, offset = 8; i < nColumns; i++, offset += 2) {
    columnFormats[i] = message.getInt16(offset, false);
  }
  return `CopyInResponse: ${inspect({ format, columnFormats }, { colors: true, compact: true })}`;
}
function process_H(message: DataView) {
  // CopyOutResponse
  const format = message.getInt8(5); // 0 - text, 1 - binary
  const nColumns = message.getInt16(6, false);
  const columnFormats = new Array<number>(nColumns);
  for (let i = 0, offset = 8; i < nColumns; i++, offset += 2) {
    columnFormats[i] = message.getInt16(offset, false);
  }
  return `CopyOutResponse: ${inspect({ format, columnFormats }, { colors: true, compact: true })}`;
}
function process_W(message: DataView) {
  // CopyBothResponse
  const format = message.getInt8(5); // 0 - text, 1 - binary
  const nColumns = message.getInt16(6, false);
  const columnFormats = new Array<number>(nColumns);
  for (let i = 0, offset = 8; i < nColumns; i++, offset += 2) {
    columnFormats[i] = message.getInt16(offset, false);
  }
  return `CopyBothResponse: ${inspect({ format, columnFormats }, { colors: true, compact: true })}`;
}
function process_D(message: DataView) {
  // DataRow
  const nColumns = message.getInt16(5, false);
  const values = new Array(nColumns);
  for (let i = 0, offset = 7; i < nColumns; i++) {
    const length = message.getInt32(offset, false);
    if (length === -1) {
      offset += 4;
      values[i] = null;
    } else {
      const start = offset + 4;
      values[i] = Buffer.from(message.buffer, message.byteOffset + start, length);
      offset = start + length;
    }
  }
  return `DataRow: ${inspect(values, { colors: true, compact: false, showHidden: false })}`;
}
function process_I(_message: DataView) {
  // EmptyQueryResponse
  return 'EmptyQueryResponse';
}
function process_E(message: DataView) {
  // ErrorResponse
  const data = readNoticeOrError(message);
  return `ErrorResponse\n${inspect(data, { colors: true, compact: false, showHidden: false })}`;
}
function process_V(message: DataView) {
  // FunctionCallResponse
  const length = message.getInt32(5, false);
  let value: null | Buffer;
  if (length === -1) {
    value = null;
  } else {
    value = Buffer.from(message.buffer, message.byteOffset + 9, length);
  }
  return `FunctionCallResponse: ${value?.toString('utf8') ?? 'null'}`;
}
function process_v(message: DataView) {
  // NegotiateProtocolVersion
  const minor = message.getInt32(5, false);
  const nOptions = message.getInt32(9, false);
  const unrecognizedOptions = new Array<Buffer>(nOptions);

  const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
  for (let i = 0, offset = 13; i < nOptions; i++) {
    const valueEnd = buf.indexOf(0, offset);
    unrecognizedOptions[i] = Buffer.from(
      message.buffer,
      message.byteOffset + offset,
      valueEnd - offset,
    );
    offset = valueEnd + 1;
  }
  return `NegotiateProtocolVersion: ${inspect({ minor, unrecognizedOptions }, { colors: true, compact: true, showHidden: false })}`;
}
function process_n(_message: DataView) {
  // NoData
  return 'NoData';
}
function process_N(message: DataView) {
  // NoticeResponse
  const data = readNoticeOrError(message);
  return `NoticeResponse\n${inspect(data, { colors: true, compact: false, showHidden: false })}`;
}
function process_A(message: DataView) {
  // NotificationResponse

  const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
  const channelEnd = buf.indexOf(0, 9);
  const payloadStart = channelEnd + 1;
  const payloadEnd = buf.indexOf(0, payloadStart);

  const pid = message.getInt32(5, false);
  const channel = Buffer.from(message.buffer, message.byteOffset + 9, channelEnd - 9).toString(
    'ascii',
  );
  const payload = Buffer.from(buf.subarray(payloadStart, payloadEnd)).toString('ascii');
  return `NotificationResponse: ${inspect({ pid, channel, payload }, { colors: true, compact: true })}`;
}
function process_t(message: DataView) {
  // ParameterDescription
  const nParams = message.getInt16(5, false);
  const params = new Array<number>(nParams);
  for (let i = 0, offset = 7; i < nParams; i++, offset += 4) {
    params[i] = message.getInt32(offset, false);
  }
  return `ParameterDescription: ${inspect(params, { colors: true, compact: false, showHidden: false })}`;
}
function process_S(message: DataView) {
  // ParameterStatus
  const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
  const nameEnd = buf.indexOf(0, 5);
  const valueStart = nameEnd + 1;
  const valueEnd = buf.indexOf(0, valueStart);

  const name = Buffer.from(message.buffer, message.byteOffset + 5, nameEnd - 5).toString('ascii');
  const value = Buffer.from(
    message.buffer,
    message.byteOffset + valueStart,
    valueEnd - valueStart,
  ).toString('ascii');
  return `ParameterStatus: name=${name} ; value=${value}`;
}
function process_1(_message: DataView) {
  // ParseComplete
  return 'ParseComplete';
}
function process_s(_message: DataView) {
  // PortalSuspended
  return 'PortalSuspended';
}
function process_Z(message: DataView) {
  // ReadyForQuery
  // I(73) - idle, T(84) - transaction, E(69) - failed transaction
  const status = message.getInt8(5);
  return `ReadyForQuery: ${String.fromCodePoint(status)}`;
}
function process_T(message: DataView) {
  // RowDescription
  const nFields = message.getInt16(5, false);
  const fields = new Array(nFields);
  for (let i = 0, offset = 7; i < nFields; i++) {
    const field = {
      name: '',
      table: 0,
      columnIdx: 0,
      type: 0,
      typeSize: 0,
      typeModifier: 0,
      format: 0,
    };
    fields[i] = field;

    const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
    const nameEnd = buf.indexOf(0, offset);
    field.name = Buffer.from(
      message.buffer,
      message.byteOffset + offset,
      nameEnd - offset,
    ).toString('ascii');
    field.table = message.getInt32(nameEnd + 1, false);
    field.columnIdx = message.getInt16(nameEnd + 5, false);
    field.type = message.getInt32(nameEnd + 7, false);
    field.typeSize = message.getInt16(nameEnd + 11, false);
    field.typeModifier = message.getInt32(nameEnd + 13, false);
    field.format = message.getInt16(nameEnd + 17, false);
    offset = nameEnd + 19;
  }
  return `RowDescription\n${inspect(fields, { colors: true, compact: false, showHidden: false })}`;
}

function inspect(_data: unknown, _opts?: unknown) {
  return '';
}
