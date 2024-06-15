import { bench, describe } from 'vitest';

describe('create object', () => {
  const message = (() => {
    const buf = Buffer.from('VAAAAB0AAWludDgAAAAAAAAAAAAAFAAI/////wAA', 'base64');
    return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  })();

  const proto = {
    name: '',
    table: 0,
    columnIdx: 0,
    type: 0,
    typeSize: 0,
    typeModifier: 0,
    format: 0,
  };

  bench('shape then read', () => {
    const field = {
      name: '',
      table: 0,
      columnIdx: 0,
      type: 0,
      typeSize: 0,
      typeModifier: 0,
      format: 0,
    };

    const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
    const nameEnd = buf.indexOf(0, 7);
    field.name = Buffer.from(message.buffer, message.byteOffset + 7, nameEnd - 7).toString('ascii');
    field.table = message.getInt32(nameEnd + 1, false);
    field.columnIdx = message.getInt16(nameEnd + 5, false);
    field.type = message.getInt32(nameEnd + 7, false);
    field.typeSize = message.getInt16(nameEnd + 11, false);
    field.typeModifier = message.getInt32(nameEnd + 13, false);
    field.format = message.getInt16(nameEnd + 17, false);
  });

  bench('direct', () => {
    const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
    const nameEnd = buf.indexOf(0, 7);
    const field = {
      name: Buffer.from(message.buffer, message.byteOffset + 7, nameEnd - 7).toString('ascii'),
      table: message.getInt32(nameEnd + 1, false),
      columnIdx: message.getInt16(nameEnd + 5, false),
      type: message.getInt32(nameEnd + 7, false),
      typeSize: message.getInt16(nameEnd + 11, false),
      typeModifier: message.getInt32(nameEnd + 13, false),
      format: message.getInt16(nameEnd + 17, false),
    };
  });

  bench('from proto', () => {
    const field = Object.create(proto) as typeof proto;

    const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
    const nameEnd = buf.indexOf(0, 7);
    field.name = Buffer.from(message.buffer, message.byteOffset + 7, nameEnd - 7).toString('ascii');
    field.table = message.getInt32(nameEnd + 1, false);
    field.columnIdx = message.getInt16(nameEnd + 5, false);
    field.type = message.getInt32(nameEnd + 7, false);
    field.typeSize = message.getInt16(nameEnd + 11, false);
    field.typeModifier = message.getInt32(nameEnd + 13, false);
    field.format = message.getInt16(nameEnd + 17, false);
  });
});
