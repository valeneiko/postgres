import type { UUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  readArray,
  readNumeric,
  readString,
  readUUID,
  writeNumeric,
  writeUUID,
} from '@/value-encoders';

describe('readUUID', () => {
  it('decodes random', () => {
    expect.hasAssertions();

    const src = Buffer.from('3410C66E3AF2489A855A435A12077D5D', 'hex');
    const data = new DataView(src.buffer, src.byteOffset, src.byteLength);

    const result = readUUID(data, 0);
    expect(result).toStrictEqual('3410C66E-3AF2-489A-855A-435A12077D5D');
  });

  it('decodes 00', () => {
    expect.hasAssertions();

    const src = Buffer.from('00000000000000000000000000000000', 'hex');
    const data = new DataView(src.buffer, src.byteOffset, src.byteLength);

    const result = readUUID(data, 0);
    expect(result).toStrictEqual('00000000-0000-0000-0000-000000000000');
  });

  it('decodes FF', () => {
    expect.hasAssertions();

    const src = Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex');
    const data = new DataView(src.buffer, src.byteOffset, src.byteLength);

    const result = readUUID(data, 0);
    expect(result).toStrictEqual('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF');
  });
});

describe('writeUUID', () => {
  it.each([
    '3410C66E-3AF2-489A-855A-435A12077D5D',
    '3410c66e-3af2-489a-855a-435a12077d5d',
    '00000000-0000-0000-0000-000000000000',
    'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
  ] as UUID[])('encodes %s', (uuid) => {
    expect.hasAssertions();

    const dst = Buffer.allocUnsafeSlow(16);
    const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);
    writeUUID(uuid, dstView, 0);
    expect(dst).toStrictEqual(Buffer.from(uuid.replaceAll('-', ''), 'hex'));
  });
});

describe('readArray', () => {
  it('decode simple', () => {
    expect.hasAssertions();

    const src = Buffer.from(
      '00000001 00000000 00000019 00000002 00000001 00000003 666F6F 00000003 626172'.replaceAll(
        ' ',
        '',
      ),
      'hex',
    );
    const data = new DataView(src.buffer, src.byteOffset, src.byteLength);

    const result = readArray(data, 0, readString);
    expect(result).toStrictEqual(['foo', 'bar']);
  });

  it('decode nullable', () => {
    expect.hasAssertions();

    const src = Buffer.from(
      '00000001 00000001 00000019 00000003 00000001 00000003 666F6F FFFFFFFF 00000003 626172'.replaceAll(
        ' ',
        '',
      ),
      'hex',
    );
    const data = new DataView(src.buffer, src.byteOffset, src.byteLength);

    const result = readArray(data, 0, readString);
    expect(result).toStrictEqual(['foo', null, 'bar']);
  });

  it('decode 2D', () => {
    expect.hasAssertions();

    const src = Buffer.from(
      '0000000200000001000000190000000200000001000000030000000100000003666f6fffffffff00000003626172000000037177650000000361736400000003797569',
      'hex',
    );
    const data = new DataView(src.buffer, src.byteOffset, src.byteLength);

    const result = readArray(data, 0, readString);
    expect(result).toStrictEqual(['foo', null, 'bar', 'qwe', 'asd', 'yui']);
  });
});

describe('readNumeric', () => {
  it.each`
    display           | ndigits    | weight     | sign       | dscale     | decimal           | fractional
    ${'123.56'}       | ${'00 02'} | ${'00 00'} | ${'00 00'} | ${'00 02'} | ${'00 7b'}        | ${'15 e0'}
    ${'-123.56'}      | ${'00 02'} | ${'00 00'} | ${'40 00'} | ${'00 02'} | ${'00 7b'}        | ${'15 e0'}
    ${'3.258'}        | ${'00 02'} | ${'00 00'} | ${'00 00'} | ${'00 03'} | ${'00 03'}        | ${'0a 14'}
    ${'NaN'}          | ${'00 00'} | ${'00 00'} | ${'c0 00'} | ${'00 00'} | ${''}             | ${''}
    ${'Infinity'}     | ${'00 00'} | ${'00 00'} | ${'d0 00'} | ${'00 20'} | ${''}             | ${''}
    ${'-Infinity'}    | ${'00 00'} | ${'00 00'} | ${'f0 00'} | ${'00 20'} | ${''}             | ${''}
    ${'0'}            | ${'00 00'} | ${'00 00'} | ${'00 00'} | ${'00 00'} | ${''}             | ${''}
    ${'8'}            | ${'00 01'} | ${'00 00'} | ${'00 00'} | ${'00 00'} | ${'00 08'}        | ${''}
    ${'1234'}         | ${'00 01'} | ${'00 00'} | ${'00 00'} | ${'00 00'} | ${'04 d2'}        | ${''}
    ${'1234567.1234'} | ${'00 03'} | ${'00 01'} | ${'00 00'} | ${'00 04'} | ${'00 7b  11 d7'} | ${'04 d2'}
    ${'0.00001234'}   | ${'00 01'} | ${'ff fe'} | ${'00 00'} | ${'00 08'} | ${'04 d2'}        | ${''}
    ${'123400000000'} | ${'00 01'} | ${'00 02'} | ${'00 00'} | ${'00 00'} | ${'04 d2'}        | ${''}
  `('decode $display', ({ display, ...buf }: Record<string, string>) => {
    expect.hasAssertions();

    const src = Buffer.from(
      Object.values(buf)
        .map((x) => x.replaceAll(' ', ''))
        .join(''),
      'hex',
    );
    const data = new DataView(src.buffer, src.byteOffset, src.byteLength);

    const result = readNumeric(data, 0);
    expect(result.toString()).toStrictEqual(display);
  });
});

describe('writeNumeric', () => {
  it.each`
    display           | ndigits    | weight     | sign       | dscale     | decimal           | fractional
    ${'123.56'}       | ${'00 02'} | ${'00 00'} | ${'00 00'} | ${'00 02'} | ${'00 7b'}        | ${'15 e0'}
    ${'-123.56'}      | ${'00 02'} | ${'00 00'} | ${'40 00'} | ${'00 02'} | ${'00 7b'}        | ${'15 e0'}
    ${'3.258'}        | ${'00 02'} | ${'00 00'} | ${'00 00'} | ${'00 03'} | ${'00 03'}        | ${'0a 14'}
    ${'NaN'}          | ${'00 00'} | ${'00 00'} | ${'c0 00'} | ${'00 00'} | ${''}             | ${''}
    ${'Infinity'}     | ${'00 00'} | ${'00 00'} | ${'d0 00'} | ${'00 20'} | ${''}             | ${''}
    ${'-Infinity'}    | ${'00 00'} | ${'00 00'} | ${'f0 00'} | ${'00 20'} | ${''}             | ${''}
    ${'0'}            | ${'00 00'} | ${'00 00'} | ${'00 00'} | ${'00 00'} | ${''}             | ${''}
    ${'8'}            | ${'00 01'} | ${'00 00'} | ${'00 00'} | ${'00 00'} | ${'00 08'}        | ${''}
    ${'1234'}         | ${'00 01'} | ${'00 00'} | ${'00 00'} | ${'00 00'} | ${'04 d2'}        | ${''}
    ${'1234567.1234'} | ${'00 03'} | ${'00 01'} | ${'00 00'} | ${'00 04'} | ${'00 7b  11 d7'} | ${'04 d2'}
    ${'0.00001234'}   | ${'00 01'} | ${'ff fe'} | ${'00 00'} | ${'00 08'} | ${'04 d2'}        | ${''}
    ${'123400000000'} | ${'00 01'} | ${'00 02'} | ${'00 00'} | ${'00 00'} | ${'04 d2'}        | ${''}
  `('encode $display', ({ display, ...buf }: Record<string, string>) => {
    expect.hasAssertions();

    const expected = Buffer.from(
      Object.values(buf)
        .map((x) => x.replaceAll(' ', ''))
        .join(''),
      'hex',
    );

    const dst = Buffer.alloc(expected.byteLength);
    const view = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

    writeNumeric(display, view, 0);

    expect(dst).toStrictEqual(expected);
  });
});
