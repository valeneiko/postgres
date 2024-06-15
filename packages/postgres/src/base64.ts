const chars = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].map((x) =>
  x.charCodeAt(0),
);
// oxlint-disable-next-line unicorn/no-array-reduce
const values = chars.reduce((acc, x, i) => {
  acc[x] = i;
  return acc;
}, new Array<number>(123));

/**
 * Encode 18-byte value as base64
 */
export function encode18Base64(src: DataView, dst: DataView): void {
  let srcOffset = 0;
  let dstOffset = 0;
  while (srcOffset < 15) {
    const s1 = src.getUint32(srcOffset, false);
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

  const s1 = src.getUint32(14, false);

  const v1 = (s1 >>> 18) & 63;
  const v2 = (s1 >>> 12) & 63;
  const v3 = (s1 >>> 6) & 63;
  const v4 = s1 & 63;

  const c1 = chars[v1];
  const c2 = chars[v2];
  const c3 = chars[v3];
  const c4 = chars[v4];

  dst.setUint32(dstOffset, (c1 << 24) | (c2 << 16) | (c3 << 8) | c4, false);
}

/**
 * Encode 32-byte value as base64
 */
export function encode32Base64(src: DataView, dst: DataView): void {
  let srcOffset = 0;
  let dstOffset = 0;
  while (srcOffset < 30) {
    const s1 = src.getUint32(srcOffset, false);
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

  const s1 = src.getUint32(28, false);

  const v2 = (s1 >>> 10) & 63;
  const v3 = (s1 >>> 4) & 63;
  const v4 = (s1 << 2) & 63;

  const c1 = chars[v2];
  const c2 = chars[v3];
  const c3 = chars[v4];
  const c4 = 61 /*=*/;

  dst.setUint32(dstOffset, (c1 << 24) | (c2 << 16) | (c3 << 8) | c4, false);
}

/**
 * Decode 16-byte value from base64
 */
export function decode16Base64(src: DataView, dst: DataView): void {
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
