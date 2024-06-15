import { bench, describe } from 'vitest';

describe('null terminator', () => {
  const buf = Buffer.from('VAAAAB0AAWludDgAAAAAAAAAAAAAFAAI/////wAA', 'base64');
  const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const data = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  bench('buf indexof', () => {
    const end = buf.indexOf(0, 7);
    buf.toString(undefined, 7, end);
  });

  bench('typed array indexof', () => {
    const end = arr.indexOf(0, 7);
    buf.toString(undefined, 7, end);
  });

  bench('loop', () => {
    let i = 6;
    while (buf[++i] !== 0) {}
    buf.toString(undefined, 7, i);
  });

  bench('loop over view', () => {
    let i = 6;
    while (data.getInt8(++i) !== 0) {}
    buf.toString(undefined, 7, i);
  });

  bench('buffer from', () => {
    let i = 6;
    while (data.getInt8(++i) !== 0) {}
    Buffer.from(data.buffer, data.byteOffset + 7, i - 7).toString();
  });
});

describe('command complete', () => {
  const buf = Buffer.from('C\0\0\0\0SELECT 1\0', 'ascii');
  buf.writeInt32BE(buf.length - 1, 1);
  const data = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  bench('loop', () => {
    let i = 9;
    while (data.getInt8(i++) !== 32) {}
    if (data.getInt8(5) === 73) {
      i += 2;
    }
    +buf.toString(undefined, i, buf.length - 1);
  });

  bench('magic loop', () => {
    for (let i = buf.length - 1; i > 0; i--) {
      if (buf[i] === 32) {
        +buf.toString('utf8', i + 1, buf.length - 1);
        return;
      }
    }
  });

  bench('magic loop - parse', () => {
    for (let i = buf.length - 1; i > 0; i--) {
      if (buf[i] === 32) {
        Number.parseInt(buf.toString('utf8', i + 1, buf.length - 1));
        return;
      }
    }
  });

  bench('manual check', () => {
    if (data.getInt8(11) === 32) {
      Number.parseInt(buf.toString(undefined, data.getInt8(5) === 73 ? 14 : 12, buf.length - 1));
    } else if (data.getInt8(9) === 32) {
      Number.parseInt(buf.toString(undefined, 10, buf.length - 1));
    } else if (data.getInt8(10) === 32) {
      Number.parseInt(buf.toString(undefined, 11, buf.length - 1));
    }
  });

  bench('manual check - no parse', () => {
    if (data.getInt8(11) === 32) {
      +buf.toString(undefined, data.getInt8(5) === 73 ? 14 : 12, buf.length - 1);
    } else if (data.getInt8(9) === 32) {
      +buf.toString(undefined, 10, buf.length - 1);
    } else if (data.getInt8(10) === 32) {
      +buf.toString(undefined, 11, buf.length - 1);
    }
  });
});
