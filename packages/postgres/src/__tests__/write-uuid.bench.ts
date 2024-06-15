import type { UUID } from 'node:crypto';

import { bench, describe } from 'vitest';

const uuidScratch = (() => {
  const buf = Buffer.allocUnsafeSlow(36);
  buf.writeUInt8(45, 8);
  buf.writeUInt8(45, 13);
  buf.writeUInt8(45, 18);
  buf.writeUInt8(45, 23);
  return buf;
})();

describe('write UUID', () => {
  const value = '3410C66E-3AF2-489A-855A-435A12077D5D';
  const dst = Buffer.allocUnsafeSlow(16);
  const dstView = new DataView(dst.buffer, dst.byteOffset, dst.byteLength);

  bench('scratch buffer', () => {
    writeUUID(value, dstView, 0);
  });

  bench('direct read', () => {
    directRead(value, dstView, 0);
  });
});

function directReadGroup(value: UUID, dst: DataView, offset: number, srcOffset: number): void {
  const group =
    (value.charCodeAt(srcOffset) << 24) |
    (value.charCodeAt(srcOffset + 1) << 16) |
    (value.charCodeAt(srcOffset + 2) << 8) |
    value.charCodeAt(srcOffset + 3);
  const nibbles = (group & 0x0f_0f_0f_0f) + ((group >>> 6) & 0x01_01_01_01) * 9;
  const x = ((nibbles & 0x0f_00_0f_00) >>> 4) | (nibbles & 0x00_0f_00_0f);
  dst.setUint16(offset, (x | (x >>> 8)) & 0xff_ff);
}

function directRead(value: UUID, dst: DataView, offset: number): void {
  directReadGroup(value, dst, offset, 0);
  directReadGroup(value, dst, offset + 2, 4);
  // - [8]
  directReadGroup(value, dst, offset + 4, 9);
  // - [13]
  directReadGroup(value, dst, offset + 6, 14);
  // - [18]
  directReadGroup(value, dst, offset + 8, 19);
  // - [23]
  directReadGroup(value, dst, offset + 10, 24);
  directReadGroup(value, dst, offset + 12, 28);
  directReadGroup(value, dst, offset + 14, 32);
}

function writeHexGroup(data: DataView, offset: number, srcOffset: number): void {
  // 1. Read 4 ASCII chars as a 32-bit integer (Big Endian)
  // e.g., "AB12" (0x41_42_31_32)
  const group = uuidScratch.readUInt32BE(srcOffset);

  // 2. Convert ASCII to Nibbles using bitwise logic (supports Upper & Lower case)
  // Logic: '0'-'9' (0x30s) have bit 6 clear; 'A'-'F' (0x40s/0x60s) have bit 6 set.
  // We take the lower nibble (0-9 or 1-6) and add 9 if it's a letter.
  const nibbles = (group & 0x0f_0f_0f_0f) + ((group >>> 6) & 0x01_01_01_01) * 9;

  // 3. Pack the nibbles: 0x0A_0B_01_02 --> 0x00_AB_00_12
  // We shift the even bytes (A, 1) left by 4 to join their odd neighbors (B, 2).
  const x = ((nibbles & 0x0f_00_0f_00) >>> 4) | (nibbles & 0x00_0f_00_0f);

  // 4. Final Merge: 0x00_AB_00_12 --> 0xAB_12
  // Shift right to close the gap and mask the result.
  data.setUint16(offset, (x | (x >>> 8)) & 0xff_ff);
}

function writeUUID(value: UUID, dst: DataView, offset: number): void {
  new TextEncoder().encodeInto(value, uuidScratch);
  writeHexGroup(dst, offset, 0);
  writeHexGroup(dst, offset + 2, 4);
  // - [8]
  writeHexGroup(dst, offset + 4, 9);
  // - [13]
  writeHexGroup(dst, offset + 6, 14);
  // - [18]
  writeHexGroup(dst, offset + 8, 19);
  // - [23]
  writeHexGroup(dst, offset + 10, 24);
  writeHexGroup(dst, offset + 12, 28);
  writeHexGroup(dst, offset + 14, 32);
}
