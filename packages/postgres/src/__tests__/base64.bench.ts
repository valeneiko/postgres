import { randomBytes } from 'node:crypto';

import { bench, describe } from 'vitest';

describe('encode', () => {
  const buf = randomBytes(18);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let dst: Buffer;

  const dstBuf = Buffer.allocUnsafe(24);
  const dstView = new DataView(dstBuf.buffer, dstBuf.byteOffset, dstBuf.byteLength);

  bench('buffer', () => {
    dst = Buffer.from(buf.toString('base64'), 'utf8');
  });

  bench('v1', () => {
    encodeV1(view, dstView);
  });

  bench('v2', () => {
    encodeV2(view, dstView);
  });

  bench('v3', () => {
    encodeV3(view, dstView);
  });
});

describe('decode', () => {
  const data = randomBytes(16).toString('base64');
  const buf = Buffer.from(data, 'ascii');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let dst: Buffer;

  const dstBuf = Buffer.allocUnsafe(16);
  const dstView = new DataView(dstBuf.buffer, dstBuf.byteOffset, dstBuf.byteLength);

  bench('buffer', () => {
    dst = Buffer.from(buf.toString('utf8'), 'base64');
  });

  bench('v1', () => {
    decodeV1(view, dstView);
  });
});

const chars = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].map((x) =>
  x.charCodeAt(0),
);
// oxlint-disable-next-line unicorn/no-array-reduce
const values = chars.reduce((acc, x, i) => {
  acc[x] = i;
  return acc;
}, new Array<number>(123));

function encodeV1(buf: DataView, dst: DataView) {
  let srcOffset = 0;
  const dstOffset = 0;
  while (srcOffset < 18) {
    const s1 = buf.getInt8(srcOffset++);
    const s2 = buf.getInt8(srcOffset++);
    const s3 = buf.getInt8(srcOffset++);

    const v1 = s1 >> 2;
    const v2 = ((s1 & 3) << 4) | (s2 >> 4);
    const v3 = ((s2 & 15) << 2) | (s3 >> 6);
    const v4 = s3 & 64;

    const c1 = chars[v1];
    const c2 = chars[v2];
    const c3 = chars[v3];
    const c4 = chars[v4];

    dst.setUint32(dstOffset, (c1 << 24) | (c2 << 16) | (c3 << 8) | c4, false);
  }
}

function encodeV2(buf: DataView, dst: DataView) {
  let srcOffset = 0;
  let dstOffset = 0;
  while (srcOffset < 15) {
    const s1 = buf.getUint32(srcOffset, false);
    srcOffset += 3;

    const v1 = s1 >>> 26;
    const v2 = (s1 >>> 20) & 63;
    const v3 = (s1 >>> 14) & 63;
    const v4 = (s1 >>> 8) & 63;

    const c1 = chars[v1];
    const c2 = chars[v2];
    const c3 = chars[v3];
    const c4 = chars[v4];

    dst.setUint32(dstOffset, (c1 << 24) | (c2 << 16) | (c3 << 8) | c4, false);
    dstOffset += 4;
  }

  const s1 = buf.getUint32(14, false);

  const v1 = s1 >>> 18;
  const v2 = (s1 >>> 12) & 64;
  const v3 = (s1 >>> 6) & 64;
  const v4 = s1 & 64;

  const c1 = chars[v1];
  const c2 = chars[v2];
  const c3 = chars[v3];
  const c4 = chars[v4];

  dst.setUint32(dstOffset, (c1 << 24) | (c2 << 16) | (c3 << 8) | c4, false);
}

function encodeV3(buf: DataView, dst: DataView) {
  let srcOffset = 0;
  let dstOffset = 0;
  while (srcOffset < 18) {
    const s1 = buf.getInt8(srcOffset++);
    const s2 = buf.getInt8(srcOffset++);
    const s3 = buf.getInt8(srcOffset++);
    const s = (s1 << 16) | (s2 << 8) | s3;

    const v1 = s >>> 18;
    const v2 = (s >>> 12) & 63;
    const v3 = (s >>> 6) & 63;
    const v4 = s & 63;

    const c1 = chars[v1];
    const c2 = chars[v2];
    const c3 = chars[v3];
    const c4 = chars[v4];

    dst.setUint32(dstOffset, (c1 << 24) | (c2 << 16) | (c3 << 8) | c4, false);
    dstOffset += 4;
  }
}

function decodeV1(src: DataView, dst: DataView) {
  let srcOffset = 0;
  let dstOffset = 0;
  while (srcOffset < 20) {
    const s1 = src.getUint32(srcOffset, false);
    srcOffset += 4;

    const c1 = s1 >>> 24;
    const c2 = (s1 >>> 16) & 0xff;
    const c3 = (s1 >>> 8) & 0xff;
    const c4 = s1 & 0xff;

    const v1 = values[c1];
    const v2 = values[c2];
    const v3 = values[c3];
    const v4 = values[c4];

    dst.setInt32(dstOffset, (v1 << 26) | (v2 << 20) | (v3 << 14) | (v4 << 8), false);
    dstOffset += 3;
  }

  const s1 = src.getUint16(srcOffset, false);

  const c1 = s1 >>> 8;
  const c2 = s1 & 0xff;

  const v1 = values[c1];
  const v2 = values[c2];
  dst.setUint8(dstOffset, (v1 << 2) | (v2 >> 4));
}
