import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decode16Base64, encode18Base64, encode32Base64 } from '@/base64';

describe('encode18Base64', () => {
  it('random 18-bytes', () => {
    const src = randomBytes(18);
    const dst = Buffer.allocUnsafe(24);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    encode18Base64(srcView, dstView);
    expect(dst.toString('ascii')).toStrictEqual(src.toString('base64'));
  });

  it('zero 18-bytes', () => {
    const src = Buffer.alloc(18);
    const dst = Buffer.allocUnsafe(24);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    encode18Base64(srcView, dstView);
    expect(dst.toString('ascii')).toStrictEqual(src.toString('base64'));
  });

  it('all one 18-bytes', () => {
    const src = Buffer.allocUnsafe(18).fill(255);
    const dst = Buffer.allocUnsafe(24);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    encode18Base64(srcView, dstView);
    expect(dst.toString('ascii')).toStrictEqual(src.toString('base64'));
  });
});

describe('encode32Base64', () => {
  it('random 32-bytes', () => {
    const src = randomBytes(32);
    const dst = Buffer.allocUnsafe(44);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    encode32Base64(srcView, dstView);
    expect(dst.toString('ascii')).toStrictEqual(src.toString('base64'));
  });

  it('zero 32-bytes', () => {
    const src = Buffer.alloc(32);
    const dst = Buffer.allocUnsafe(44);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    encode32Base64(srcView, dstView);
    expect(dst.toString('ascii')).toStrictEqual(src.toString('base64'));
  });

  it('all one 32-bytes', () => {
    const src = Buffer.allocUnsafe(32).fill(255);
    const dst = Buffer.allocUnsafe(44);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    encode32Base64(srcView, dstView);
    expect(dst.toString('ascii')).toStrictEqual(src.toString('base64'));
  });
});

describe('decodeBase64', () => {
  it('random 16-bytes', () => {
    const data = randomBytes(16).toString('base64');
    const src = Buffer.from(data);
    const dst = Buffer.allocUnsafe(16);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    decode16Base64(srcView, dstView);
    expect(dst.toString('base64')).toStrictEqual(data);
  });

  it('zero 16-bytes', () => {
    const data = Buffer.alloc(16).toString('base64');
    const src = Buffer.from(data);
    const dst = Buffer.allocUnsafe(16);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    decode16Base64(srcView, dstView);
    expect(dst.toString('base64')).toStrictEqual(data);
  });

  it('all one 16-bytes', () => {
    const data = Buffer.alloc(16).fill(255).toString('base64');
    const src = Buffer.from(data);
    const dst = Buffer.allocUnsafe(16);

    const srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    decode16Base64(srcView, dstView);
    expect(dst.toString('base64')).toStrictEqual(data);
  });
});
