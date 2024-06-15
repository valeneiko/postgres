/* oxlint-disable @typescript-eslint/unbound-method */

import type { SocketConstructorOpts } from 'node:net';

// import { readMessage } from '@/proto';

export class SocketReadBuffer implements Exclude<SocketConstructorOpts['onread'], undefined> {
  readonly #withSSL: boolean;

  #block: ArrayBuffer = Buffer.allocUnsafeSlow(16_384).buffer;
  #maxLength: number = this.#block.byteLength - 4;
  #header: Uint8Array = new Uint8Array(this.#block, 3, 5);
  #headerView: DataView = new DataView(this.#block, 3, 5);

  #nextBuffer: Uint8Array = this.#header;
  #length = 4;
  #offset = 8;
  #expectedBytes = 0;

  #nextCallback = this.#onHeader;

  readonly buffer = (): Uint8Array => this.#nextBuffer;
  readonly callback = (bytesWritten: number): boolean => this.#nextCallback(bytesWritten);

  #onMessage: (this: void, message: DataView) => void;

  constructor(withSSL: boolean, onMessage: (this: void, message: DataView) => void) {
    this.#withSSL = withSSL;
    this.#onMessage = onMessage;
    if (withSSL) {
      this.#nextCallback = this.#onSSL;
    }
  }

  reset(): void {
    this.#nextBuffer = this.#header;
    if (this.#withSSL) {
      this.#nextCallback = this.#onSSL;
    } else {
      this.#nextCallback = this.#onHeader;
    }
  }

  #resize(length: number): void {
    const minLength = length + 4;
    let newLength = this.#block.byteLength * 2;
    while (newLength < minLength) {
      newLength *= 2;
    }

    this.#block = Buffer.allocUnsafeSlow(newLength).buffer;
    this.#maxLength = this.#block.byteLength - 4;
    const type = this.#header[0];
    this.#header = new Uint8Array(this.#block, 3, 5);
    this.#headerView = new DataView(this.#block, 3, 5);
    this.#header[0] = type;
    this.#headerView.setInt32(1, length, false);
  }

  #onSSL(bytesWritten: number): boolean {
    const message = new DataView(this.#block, 3, bytesWritten);
    // console.log(`RCV SSLResponse: ${String.fromCodePoint(message.getInt8(0))}`);
    this.#onMessage(message);

    this.#nextCallback = this.#onHeader;
    return true;
  }

  #onHeader(_bytesWritten: number): boolean {
    this.#length = this.#headerView.getInt32(1, false);
    if (this.#length === 4) {
      // console.log(
      //   'RCV',
      //   String.fromCodePoint(this.#headerView.getInt8(0)),
      //   readMessage(this.#headerView),
      // );
      this.#onMessage(this.#headerView);
      return true;
    }

    if (this.#length > this.#maxLength) {
      this.#resize(this.#length);
    }

    this.#expectedBytes = this.#length - 4;
    this.#offset = 8;
    this.#nextBuffer = new Uint8Array(this.#block, this.#offset, this.#expectedBytes);

    this.#nextCallback = this.#onMessageChunk;
    return true;
  }

  #onMessageChunk(bytesWritten: number): boolean {
    this.#expectedBytes -= bytesWritten;
    if (this.#expectedBytes > 0) {
      this.#offset += bytesWritten;
      this.#nextBuffer = new Uint8Array(this.#block, this.#offset, this.#expectedBytes);
      return true;
    }

    const message = new DataView(this.#block, 3, this.#length + 1);
    // console.log('RCV', String.fromCodePoint(message.getInt8(0)), readMessage(message));
    this.#onMessage(message);
    this.#nextBuffer = this.#header;

    this.#nextCallback = this.#onHeader;
    return true;
  }
}
