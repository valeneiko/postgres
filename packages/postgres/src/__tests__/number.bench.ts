import { bench, describe } from 'vitest';

describe('parse number', () => {
  const buf = Buffer.from('i=4096');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let num: number;

  bench('buffer + parseInt', () => {
    const str = buf.toString(undefined, 2, 6);
    num = Number.parseInt(str);
  });

  bench('loop view 1-byte', () => {
    let x = 0;
    let i = 2;
    while (i < 6) {
      x = x * 10 + (view.getUint8(i++) - 48);
    }
    num = x;
  });

  bench('unrolled view 1-byte', () => {
    num =
      (view.getUint8(2) - 48) * 1000 +
      (view.getUint8(3) - 48) * 100 +
      (view.getUint8(4) - 48) * 10 +
      (view.getUint8(5) - 48);
  });

  bench('unrolled view 4-byte', () => {
    const x = view.getUint32(2, false) - 0x30_30_30_30;

    const v1 = x >>> 24;
    const v2 = (x >>> 16) & 15;
    const v3 = (x >>> 8) & 15;
    const v4 = x & 15;
    num = v1 * 1000 + v2 * 100 + v3 * 10 + v4;
  });

  bench('inline view 4-byte', () => {
    const x = view.getUint32(2, false) - 0x30_30_30_30;

    num = (x >>> 24) * 1000 + ((x >>> 16) & 15) * 100 + ((x >>> 8) & 15) * 10 + (x & 15);
  });

  bench('unrolled view 4-byte horner', () => {
    const x = view.getUint32(2, false) - 0x30_30_30_30;

    const v1 = x >>> 24;
    const v2 = (x >>> 16) & 15;
    const v3 = (x >>> 8) & 15;
    const v4 = x & 15;
    num = ((v1 * 10 + v2) * 10 + v3) * 10 + v4;
  });

  bench('inline view 4-byte horner', () => {
    const x = view.getUint32(2, false) - 0x30_30_30_30;
    num = (((x >>> 24) * 10 + ((x >>> 16) & 15)) * 10 + ((x >>> 8) & 15)) * 10 + (x & 15);
  });
});
