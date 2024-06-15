import { bench, describe } from 'vitest';

describe('readUInt32BE', () => {
  const block = Buffer.allocUnsafeSlow(256).buffer;
  const view = new DataView(block);
  const buffer = Buffer.from(block);
  const custom = new Uint8Array(block);

  bench('Buffer', () => {
    let sum = 0;
    for (let offset = 0; offset < 256; offset += 4) {
      sum += buffer.readUint32BE(offset);
    }

    sum;
  });

  bench('DataView', () => {
    let sum = 0;
    for (let offset = 0; offset < 256; offset += 4) {
      sum += view.getUint32(offset, false);
    }

    sum;
  });

  bench('custom1', () => {
    let sum = 0;
    for (let offset = 0; offset < 256; offset += 4) {
      sum += readUint32BE_opt1(custom, offset);
    }

    sum;
  });

  bench('custom2', () => {
    let sum = 0;
    for (let offset = 0; offset < 256; offset += 4) {
      sum += readUint32BE_opt2(custom, offset);
    }

    sum;
  });

  // oxlint-disable-next-line unicorn/consistent-function-scoping
  function readUint32BE_opt1(buf: Uint8Array, offset: number) {
    return (
      buf[offset] * 2 ** 24 + buf[offset + 1] * 2 ** 16 + buf[offset + 2] * 2 ** 8 + buf[offset + 3]
    );
  }

  // oxlint-disable-next-line unicorn/consistent-function-scoping
  function readUint32BE_opt2(buf: Uint8Array, offset: number) {
    return (buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3];
  }
});

describe('copy', () => {
  const block = Buffer.allocUnsafeSlow(256).buffer;
  const header = new Uint8Array(block, 3, 5);
  const lengthView = new DataView(block, 4, 4);
  const length = lengthView.getInt32(0, false);

  const dstBlock = Buffer.allocUnsafeSlow(512).buffer;
  const dstHeader = new Uint8Array(dstBlock, 3, 5);
  const dstLengthView = new DataView(dstBlock, 4, 4);

  bench('Buffer copy', () => {
    const buf = Buffer.from(header);
    buf.copy(dstHeader, 0, 0, 5);
  });

  bench('direct set', () => {
    dstHeader[0] = header[0];
    dstLengthView.setInt32(0, length, false);
  });

  bench('unrolled set', () => {
    dstHeader[0] = header[0];
    dstHeader[1] = header[1];
    dstHeader[2] = header[2];
    dstHeader[3] = header[3];
    dstHeader[4] = header[4];
  });

  bench('loop', () => {
    for (let i = 0; i < 5; i++) {
      dstHeader[i] = header[i];
    }
  });
});

describe('copy - large', () => {
  const srcBuf = Buffer.allocUnsafeSlow(48);
  const srcView = new DataView(srcBuf.buffer, srcBuf.byteOffset, srcBuf.byteLength);
  const srcTyped = new Uint32Array(srcBuf.buffer, srcBuf.byteOffset, srcBuf.byteLength / 4);

  const dstBuf = Buffer.allocUnsafeSlow(48);
  const dstView = new DataView(dstBuf.buffer, dstBuf.byteOffset, dstBuf.byteLength);
  const dstTyped = new Uint32Array(dstBuf.buffer, dstBuf.byteOffset, dstBuf.byteLength / 4);

  bench('Buffer copy', () => {
    srcBuf.copy(dstBuf, 0, 0, 48);
  });

  bench('typed set', () => {
    dstTyped.set(srcTyped);
  });

  bench('loop buffer 1-byte', () => {
    for (let i = 0; i < 48; i++) {
      dstBuf[i] = srcBuf[i];
    }
  });

  bench('loop view 1-byte', () => {
    for (let i = 0; i < 48; i++) {
      dstView.setUint8(i, srcView.getUint8(i));
    }
  });

  bench('loop view 2-byte', () => {
    for (let i = 0; i < 48; i += 2) {
      dstView.setUint16(i, srcView.getUint16(i));
    }
  });

  bench('loop view 4-byte', () => {
    for (let i = 0; i < 48; i += 4) {
      dstView.setUint32(i, srcView.getUint32(i));
    }
  });

  bench('unrolled view 4-byte', () => {
    dstView.setUint32(0, srcView.getUint32(0));
    dstView.setUint32(4, srcView.getUint32(4));
    dstView.setUint32(8, srcView.getUint32(8));
    dstView.setUint32(12, srcView.getUint32(12));
    dstView.setUint32(16, srcView.getUint32(16));
    dstView.setUint32(20, srcView.getUint32(20));
    dstView.setUint32(24, srcView.getUint32(24));
    dstView.setUint32(28, srcView.getUint32(28));
    dstView.setUint32(32, srcView.getUint32(32));
    dstView.setUint32(36, srcView.getUint32(36));
    dstView.setUint32(40, srcView.getUint32(40));
    dstView.setUint32(44, srcView.getUint32(44));
  });

  bench('loop typed 4-byte', () => {
    for (let i = 0; i < 12; i++) {
      dstTyped[i] = srcTyped[i];
    }
  });

  bench('unrolled typed 4-byte', () => {
    dstTyped[0] = srcTyped[0];
    dstTyped[1] = srcTyped[1];
    dstTyped[2] = srcTyped[2];
    dstTyped[3] = srcTyped[3];
    dstTyped[4] = srcTyped[4];
    dstTyped[5] = srcTyped[5];
    dstTyped[6] = srcTyped[6];
    dstTyped[7] = srcTyped[7];
    dstTyped[8] = srcTyped[8];
    dstTyped[9] = srcTyped[9];
    dstTyped[10] = srcTyped[10];
    dstTyped[11] = srcTyped[11];
  });

  bench('loop view 8-byte', () => {
    for (let i = 0; i < 48; i += 8) {
      dstView.setBigUint64(i, srcView.getBigUint64(i));
    }
  });
});
