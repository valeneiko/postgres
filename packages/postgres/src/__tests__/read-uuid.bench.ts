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

describe('read UUID', () => {
  const src = Buffer.from('3410C66E3AF2489A855A435A12077D5D', 'hex');
  const data = new DataView(src.buffer, src.byteOffset, src.byteLength);
  let uuid: string;

  bench('SWAR', () => {
    uuid = readUUID(data, 0);
  });

  bench('SWAR - utf8', () => {
    uuid = readUUIDUtf(data, 0);
  });

  bench('string slice', () => {
    const str = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('hex');
    uuid = `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}-${str.slice(20)}`;
  });

  bench('buffer slice', () => {
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    uuid = `${buf.subarray(0, 8).toString('hex')}-${buf.subarray(8, 12).toString('hex')}-${buf.subarray(12, 16).toString('hex')}-${buf.subarray(16, 20).toString('hex')}-${buf.subarray(20).toString('hex')}`;
  });
});

function readHexGroup(data: DataView, offset: number, dstOffset: number): void {
  let x = data.getUint16(offset);
  x = ((x & 0xff_00) << 8) | (x & 0xff); // 0x1234 --> 0x0012_0034
  x = ((x & 0xf0_00_f0) << 4) | (x & 0x0f_0f_0f); // 0x --> 0x01_02_03_04
  // For each hex-pair compute corresponding ASCII using SWAR: x + 0x30 + ((x + 0x06) >> 4) * 7
  const group = x + 0x30_30_30_30 + (((x + 0x06_06_06_06) >> 4) & 0x01_01_01_01) * 7;
  uuidScratch.writeUint32BE(group, dstOffset);
}

function readUUID(data: DataView, offset: number): UUID {
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

function readUUIDUtf(data: DataView, offset: number): UUID {
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

  return uuidScratch.toString('utf8') as UUID;
}
