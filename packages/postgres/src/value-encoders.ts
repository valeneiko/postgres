// Reference: https://github.com/rust-postgres/rust-postgres/blob/35e50f8c4ae3f3aae727e353528f269e31db9062/postgres-protocol/src/types/mod.rs#L33
// Postgres source (*_send/*_receive): e.g https://doxygen.postgresql.org/backend_2utils_2adt_2numeric_8c_source.html#l01146

import type { UUID } from 'node:crypto';
import { TextEncoder } from 'node:util';

const nanRepr = 0xc0_00_00_00n;
const pinfRepr = 0xd0_00_00_20n;
const ninfRepr = 0xf0_00_00_20n;

const referenceDate = new Date('2000-01-01T00:00:00.000Z').getTime();
const msPerDay = 1 / (1000 * 60 * 60 * 24);
const numericScratch = (() => {
  const buf = Buffer.allocUnsafeSlow(30);
  buf.writeUint32BE(0, 0);
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
})();

const uuidScratch = (() => {
  const buf = Buffer.allocUnsafeSlow(36);
  buf.writeUInt8(45, 8);
  buf.writeUInt8(45, 13);
  buf.writeUInt8(45, 18);
  buf.writeUInt8(45, 23);
  return buf;
})();

export function readBool(data: DataView, offset: number): boolean {
  return data.getUint8(offset) !== 0;
}

export function readBytea(data: DataView, offset: number, length: number): Buffer {
  const result = Buffer.allocUnsafe(length);
  const dst = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const dataEnd = length - 8;
  for (let i = 0; i < dataEnd; i += 8) {
    dst.setBigUint64(i, data.getBigUint64(offset + i));
  }
  if (length >= 8) {
    dst.setBigUint64(dataEnd, data.getBigUint64(offset + dataEnd));
  } else {
    for (let i = 0; i < length; i += 1) {
      dst.setUint8(i, data.getUint8(offset + i));
    }
  }
  return result;
}

export function readString(data: DataView, offset: number, length: number): string {
  return Buffer.from(data.buffer, data.byteOffset + offset, length).toString('utf8');
}

export function readInt2(data: DataView, offset: number): number {
  return data.getInt16(offset);
}

export function readInt4(data: DataView, offset: number): number {
  return data.getInt32(offset);
}

export function readOid(data: DataView, offset: number): number {
  return data.getUint32(offset);
}

export function readInt8(data: DataView, offset: number): number {
  return Number(data.getBigInt64(offset));
}

export function readFloat4(data: DataView, offset: number): number {
  return data.getFloat32(offset);
}

export function readFloat8(data: DataView, offset: number): number {
  return data.getFloat64(offset);
}

export function readTimestamp(data: DataView, offset: number): Date {
  return new Date(Number(data.getBigInt64(offset) / 1000n) + referenceDate);
}

export function readDate(data: DataView, offset: number): Date {
  const date = new Date(referenceDate);
  date.setUTCDate(1 + data.getInt32(offset));
  return date;
}

function readHexGroup(data: DataView, offset: number, dstOffset: number): void {
  let x = data.getUint16(offset);
  x = ((x & 0xff_00) << 8) | (x & 0xff); // 0x1234 --> 0x0012_0034
  x = ((x & 0xf0_00_f0) << 4) | (x & 0x0f_0f_0f); // 0x --> 0x01_02_03_04
  // For each hex-pair compute corresponding ASCII using SWAR: x + 0x30 + ((x + 0x06) >>> 4) * 7
  const group = x + 0x30_30_30_30 + (((x + 0x06_06_06_06) >>> 4) & 0x01_01_01_01) * 7;
  uuidScratch.writeUint32BE(group, dstOffset);
}

export function readUUID(data: DataView, offset: number): UUID {
  readHexGroup(data, offset, 0);
  readHexGroup(data, offset + 2, 4);
  // - [8]
  readHexGroup(data, offset + 4, 9);
  // - [13]
  readHexGroup(data, offset + 6, 14);
  // - [18]
  readHexGroup(data, offset + 8, 19);
  // - [23]
  readHexGroup(data, offset + 10, 24);
  readHexGroup(data, offset + 12, 28);
  readHexGroup(data, offset + 14, 32);

  return uuidScratch.toString('ascii') as UUID;
}

export function readArray<T>(
  data: DataView,
  offset: number,
  parser: (data: DataView, offset: number, length: number) => T,
): (T | null)[] {
  const ndim = data.getInt32(offset);
  // const hasNulls = data.getInt32(offset+4) !== 0;
  // const type = data.getUint32(offset+8);
  let len = 1;
  let currentOffset = offset + 12;
  for (let i = 0; i < ndim; i++, currentOffset += 8) {
    len *= data.getInt32(currentOffset);
    // const lowerBound = data.getInt32(currentOffset+4);
  }

  const result = new Array<T | null>(len);
  for (let i = 0; i < len; i++) {
    const length = data.getInt32(currentOffset);
    currentOffset += 4;
    if (length < 0) {
      result[i] = null;
    } else {
      result[i] = parser(data, currentOffset, length);
      currentOffset += length;
    }
  }

  return result;
}

export function readNumeric(data: DataView, offset: number): number {
  const ndigits = data.getUint16(offset);
  const weight = data.getInt16(offset + 2);

  //  POS: 0x0000
  //  NEG: 0x4000
  //  NAN: 0xC000
  // PINF: 0xD000
  // NINF: 0xF000
  const sign = data.getUint16(offset + 4);
  if (sign === 0xd0_00) {
    return Infinity;
  } else if (sign === 0xf0_00) {
    return -Infinity;
  } else if (sign === 0xc0_00) {
    return Number.NaN;
  } else if (ndigits === 0) {
    return 0;
  }

  let dscale = data.getUint16(offset + 6);

  let result = 0;
  let currentOffset = offset + 8;
  let factor = 0.0001;

  if (weight >= 0) {
    let i = 0;
    const wholeDigits = Math.min(weight, ndigits - 1);
    for (; i <= wholeDigits; i++, currentOffset += 2) {
      const digits = data.getInt16(currentOffset);
      result = result * 10_000 + digits;
    }
    if (i < weight) {
      result *= 10_000 ** (weight - ndigits + 1);
    }
  } else {
    factor *= 0.0001 ** (-weight - 1);
    dscale += (weight + 1) << 2;
  }

  for (let i = 0; i < dscale; i += 4, factor *= 0.0001, currentOffset += 2) {
    const digits = data.getInt16(currentOffset);
    result += digits * factor;
  }

  return sign === 0 ? result : -result;
}

export type JsonValue =
  | string
  | number
  | boolean
  | { [K in string]?: JsonValue }
  | JsonValue[]
  | null;

export function readJson(data: DataView, offset: number, length: number): JsonValue {
  return JSON.parse(
    Buffer.from(data.buffer, data.byteOffset + offset, length).toString('utf8'),
  ) as JsonValue;
}

export function readJsonb(data: DataView, offset: number, length: number): JsonValue {
  return readJson(data, offset + 1, length - 1);
}

export function writeBool(value: boolean, dst: DataView, offset: number): number {
  dst.setUint8(offset, value ? 1 : 0);
  return 1;
}

export function writeBytea(value: Buffer, dst: DataView, offset: number): number {
  const data = new DataView(value.buffer, value.byteOffset, value.byteLength);
  const valueEnd = value.byteLength - 8;
  for (let i = 0; i < valueEnd; i += 8) {
    dst.setBigUint64(offset + i, data.getBigUint64(i));
  }
  if (value.byteLength >= 8) {
    dst.setBigUint64(offset + valueEnd, data.getBigUint64(valueEnd));
  } else {
    for (let i = 0; i < value.byteLength; i += 1) {
      dst.setUint8(offset + i, data.getUint8(i));
    }
  }
  return value.byteLength;
}

export function writeString(value: string, dst: DataView, offset: number): number {
  const dstBuf = new Uint8Array(dst.buffer, dst.byteOffset + offset, dst.byteLength - offset);
  const result = new TextEncoder().encodeInto(value, dstBuf);
  return result.written;
}

export function writeInt2(value: number, dst: DataView, offset: number): number {
  dst.setInt16(offset, value);
  return 2;
}

export function writeInt4(value: number, dst: DataView, offset: number): number {
  dst.setInt32(offset, value);
  return 4;
}

export function writeOid(value: number, dst: DataView, offset: number): number {
  dst.setUint32(offset, value);
  return 4;
}

export function writeInt8(value: number, dst: DataView, offset: number): number {
  dst.setBigInt64(offset, BigInt(value));
  return 8;
}

export function writeFloat4(value: number, dst: DataView, offset: number): number {
  dst.setFloat32(offset, value);
  return 4;
}

export function writeFloat8(value: number, dst: DataView, offset: number): number {
  dst.setFloat64(offset, value);
  return 8;
}

export function writeTimestamp(value: Date, dst: DataView, offset: number): number {
  dst.setBigInt64(offset, BigInt(value.getTime() - referenceDate) * 1000n);
  return 8;
}

export function writeDate(value: Date, dst: DataView, offset: number): number {
  const src = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  const daysSince = (src - referenceDate) * msPerDay;
  dst.setInt32(offset, daysSince);
  return 4;
}

function writeHexGroup(value: UUID, dst: DataView, offset: number, srcOffset: number): void {
  const group =
    (value.charCodeAt(srcOffset) << 24) |
    (value.charCodeAt(srcOffset + 1) << 16) |
    (value.charCodeAt(srcOffset + 2) << 8) |
    value.charCodeAt(srcOffset + 3);

  const nibbles = (group & 0x0f_0f_0f_0f) + ((group >>> 6) & 0x01_01_01_01) * 9;
  const x = ((nibbles & 0x0f_00_0f_00) >>> 4) | (nibbles & 0x00_0f_00_0f);
  dst.setUint16(offset, (x | (x >>> 8)) & 0xff_ff);
}

export function writeUUID(value: UUID, dst: DataView, offset: number): number {
  writeHexGroup(value, dst, offset, 0);
  writeHexGroup(value, dst, offset + 2, 4);
  // - [8]
  writeHexGroup(value, dst, offset + 4, 9);
  // - [13]
  writeHexGroup(value, dst, offset + 6, 14);
  // - [18]
  writeHexGroup(value, dst, offset + 8, 19);
  // - [23]
  writeHexGroup(value, dst, offset + 10, 24);
  writeHexGroup(value, dst, offset + 12, 28);
  writeHexGroup(value, dst, offset + 14, 32);

  return 16;
}

export function writeArray<T>(
  value: (T | null)[],
  type: number,
  dst: DataView,
  offset: number,
  serializer: (value: NoInfer<T>, dst: DataView, offset: number) => number,
): number {
  // ndims
  const ndims = 1;
  dst.setInt32(offset, ndims);
  dst.setUint32(offset + 8, type);
  // dimensions
  let currentOffset = offset + 12;
  for (let i = 0; i < ndims; i++, currentOffset += 8) {
    dst.setInt32(currentOffset, value.length);
    dst.setInt32(currentOffset + 4, 1);
  }

  let hasNulls = false;
  for (let i = 0; i < value.length; i++) {
    const item = value[i + 1];
    if (item === null) {
      hasNulls = true;
      dst.setInt32(currentOffset, -1);
      currentOffset += 4;
      continue;
    }
    const length = serializer(item, dst, currentOffset + 4);
    dst.setInt32(currentOffset, length);
    currentOffset += 4 + length;
  }

  dst.setInt32(offset + 4, hasNulls ? 1 : 0);
  return currentOffset - offset;
}

export function writeNumeric(value: string, dst: DataView, dstOffset: number): number {
  let sign = 0;
  let cp = 0;
  if (value.charCodeAt(cp) === 45 /* - */) {
    sign = 0x40_00;
    cp++;
  }

  let c = value.charCodeAt(cp);
  if (c === 78 /* N -> NaN */) {
    dst.setBigUint64(dstOffset, nanRepr);
    return 8;
  } else if (c === 73 /* I -> Infinity */) {
    dst.setBigUint64(dstOffset, sign === 0 ? pinfRepr : ninfRepr);
    return 8;
  }

  numericScratch.setUint32(0, 0);

  let hasDp = false;
  let dWeight = -1;
  let dScale = 0;
  let i = 4;
  while (cp < value.length) {
    if (c >= 48) {
      if (c <= 57) {
        numericScratch.setUint8(i, c - 48);
        i++;
        if (hasDp) {
          dScale++;
        } else {
          dWeight++;
        }
      } else {
        // exponent
        let exponent = Number.parseInt(value.slice(cp + 1));
        if (sign !== 0) {
          exponent = -exponent;
        }
        dWeight += exponent;
        dScale = Math.min(dScale - exponent, 0);
        break;
      }
    } else {
      // decimal point
      hasDp = true;
    }

    cp++;
    c = value.charCodeAt(cp);
  }

  numericScratch.setUint32(i, 0);

  const weigth = dWeight >= 0 ? ((dWeight + 4) >>> 2) - 1 : -1 - ((-dWeight - 1) >>> 2);
  const offset = ((weigth + 1) << 2) - (dWeight + 1);
  let ndigits = (i + offset - 1) >>> 2;

  i = 4 - offset;
  let leading = true;
  let leadingZeros = 0;
  let trailingZeros = 0;
  const digitEnd = ndigits << 1;
  for (let d = 0; d < digitEnd; d += 2, i += 4) {
    const digit =
      numericScratch.getUint8(i) * 1000 +
      numericScratch.getUint8(i + 1) * 100 +
      numericScratch.getUint8(i + 2) * 10 +
      numericScratch.getUint8(i + 3);
    numericScratch.setUint16(d, digit);

    if (digit === 0) {
      trailingZeros++;
    } else if (leading) {
      leading = false;
      leadingZeros = trailingZeros;
      trailingZeros = 0;
    } else {
      trailingZeros = 0;
    }
  }

  ndigits -= leadingZeros + trailingZeros;
  dst.setUint16(dstOffset, ndigits);
  if (ndigits === 0) {
    dst.setUint32(dstOffset + 2, 0);
  } else {
    dst.setInt16(dstOffset + 2, weigth - leadingZeros);
    dst.setUint16(dstOffset + 4, sign);
  }

  dst.setUint16(dstOffset + 6, dScale);

  let d = dstOffset + 8;
  const normalizedDigitsEnd = d + (ndigits << 1);
  for (let s = leadingZeros << 1; d < normalizedDigitsEnd; d += 2, s += 2) {
    const digit = numericScratch.getUint16(s);
    dst.setUint16(d, digit);
  }

  return d - dstOffset;
}

export function writeJson(value: string, dst: DataView, offset: number): number {
  // const str = JSON.stringify(value);
  return writeString(value, dst, offset);
}

export function writeJsonb(value: string, dst: DataView, offset: number): number {
  dst.setInt8(offset, 1);
  return writeJson(value, dst, offset + 1) + 1;
}
