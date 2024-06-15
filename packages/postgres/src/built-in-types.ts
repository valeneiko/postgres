import type { UUID } from 'node:crypto';

import {
  type JsonValue,
  readArray,
  readBool,
  readBytea,
  readDate,
  readFloat4,
  readFloat8,
  readInt2,
  readInt4,
  readInt8,
  readJson,
  readJsonb,
  readNumeric,
  readOid,
  readString,
  readTimestamp,
  readUUID,
  writeArray,
  writeBool,
  writeBytea,
  writeDate,
  writeFloat4,
  writeFloat8,
  writeInt2,
  writeInt4,
  writeInt8,
  writeJson,
  writeJsonb,
  writeNumeric,
  writeOid,
  writeString,
  writeTimestamp,
  writeUUID,
} from '@/value-encoders';

interface TypeDefinition<T, W = NoInfer<T>> {
  readonly read: (message: DataView, offset: number, length: number) => NoInfer<T>;
  readonly write: (value: W, dst: DataView, offset: number) => number;
  /** Returns maximum required space in the write buffer */
  readonly length: (value: NoInfer<W>) => number;
  readonly isFixedLength: boolean;
}

interface BuiltInPrimitiveTypeMap {
  /** bool */ readonly 16: TypeDefinition<boolean>;
  /** bytea */ readonly 17: TypeDefinition<Buffer>;
  /** text */ readonly 25: TypeDefinition<string>;
  /** int2 */ readonly 21: TypeDefinition<number>;
  /** int4 */ readonly 23: TypeDefinition<number>;
  /** oid */ readonly 26: TypeDefinition<number>;
  /** int8 */ readonly 20: TypeDefinition<number>;
  /** float4 */ readonly 700: TypeDefinition<number>;
  /** float8 */ readonly 701: TypeDefinition<number>;
  /** timestamp */ readonly 1114: TypeDefinition<Date>;
  /** timestamptz */ readonly 1184: TypeDefinition<Date>;
  /** date */ readonly 1082: TypeDefinition<Date>;
  /** uuid */ readonly 2950: TypeDefinition<UUID>;
  /** numeric */ readonly 1700: TypeDefinition<number, string>;
  /** json */ readonly 114: TypeDefinition<JsonValue, string>;
  /** jsonb */ readonly 3802: TypeDefinition<JsonValue, string>;

  /** char */ readonly 18: TypeDefinition<string>;
  /** name */ readonly 19: TypeDefinition<string>;
  /** regproc */ readonly 24: TypeDefinition<number>;
  /** pg_node_tree */ readonly 194: TypeDefinition<unknown>;
  /** aclitem */ readonly 1033: TypeDefinition<unknown>;
}

interface BuiltInArrayTypeMap {
  /** bool */ readonly 1000: TypeDefinition<(boolean | null)[]>;
  /** bytea */ readonly 1001: TypeDefinition<(Buffer | null)[]>;
  /** text */ readonly 1009: TypeDefinition<(string | null)[]>;
  /** int2 */ readonly 1005: TypeDefinition<(number | null)[]>;
  /** int4 */ readonly 1007: TypeDefinition<(number | null)[]>;
  /** oid */ readonly 1028: TypeDefinition<(number | null)[]>;
  /** int8 */ readonly 1016: TypeDefinition<(number | null)[]>;
  /** float4 */ readonly 1021: TypeDefinition<(number | null)[]>;
  /** float8 */ readonly 1022: TypeDefinition<(number | null)[]>;
  /** timestamp */ readonly 1115: TypeDefinition<(Date | null)[]>;
  /** timestamptz */ readonly 1185: TypeDefinition<(Date | null)[]>;
  /** date */ readonly 1182: TypeDefinition<(Date | null)[]>;
  /** uuid */ readonly 2951: TypeDefinition<(UUID | null)[]>;
  /** numeric */ readonly 1231: TypeDefinition<(number | null)[], (string | null)[]>;
  /** json */ readonly 199: TypeDefinition<(JsonValue | null)[], (string | null)[]>;
  /** jsonb */ readonly 3807: TypeDefinition<(JsonValue | null)[], (string | null)[]>;

  /** aclitem */ readonly 1034: TypeDefinition<unknown[]>;
}

const builtinPrimitiveTypes: BuiltInPrimitiveTypeMap = {
  16: {
    read: readBool,
    write: writeBool,
    length: () => 1,
    isFixedLength: true,
  },
  17: {
    read: readBytea,
    write: writeBytea,
    length: (value) => value.byteLength,
    isFixedLength: false,
  },
  25: {
    read: readString,
    write: writeString,
    length: (value) => value.length,
    isFixedLength: false,
  },
  21: {
    read: readInt2,
    write: writeInt2,
    length: () => 2,
    isFixedLength: true,
  },
  23: {
    read: readInt4,
    write: writeInt4,
    length: () => 4,
    isFixedLength: true,
  },
  26: {
    read: readOid,
    write: writeOid,
    length: () => 4,
    isFixedLength: true,
  },
  20: {
    read: readInt8,
    write: writeInt8,
    length: () => 8,
    isFixedLength: true,
  },
  700: {
    read: readFloat4,
    write: writeFloat4,
    length: () => 4,
    isFixedLength: true,
  },
  701: {
    read: readFloat8,
    write: writeFloat8,
    length: () => 8,
    isFixedLength: true,
  },
  1114: {
    read: readTimestamp,
    write: writeTimestamp,
    length: () => 8,
    isFixedLength: true,
  },
  1184: {
    read: readTimestamp,
    write: writeTimestamp,
    length: () => 8,
    isFixedLength: true,
  },
  1082: {
    read: readDate,
    write: writeDate,
    length: () => 4,
    isFixedLength: true,
  },
  2950: {
    read: readUUID,
    write: writeUUID,
    length: () => 16,
    isFixedLength: true,
  },
  1700: {
    read: readNumeric,
    write: writeNumeric,
    // This is an upper bound length, not exact one
    length: (value) => 8 + (((value.length + 6) >>> 1) & 0xff_ff_ff_fe),
    isFixedLength: false,
  },
  114: {
    read: readJson,
    write: writeJson,
    length: (value) => value.length,
    isFixedLength: false,
  },
  3802: {
    read: readJsonb,
    write: writeJsonb,
    length: (value) => 1 + value.length,
    isFixedLength: false,
  },
  // Needed for benchmark
  18: {
    read: readString,
    write: writeString,
    length: () => 1,
    isFixedLength: true,
  },
  19: {
    read: readString,
    write: writeString,
    length: (value) => value.length,
    isFixedLength: false,
  },
  24: {
    read: readInt4,
    write: writeInt4,
    length: () => 4,
    isFixedLength: true,
  },
  194: {
    read: () => {
      throw new Error('not implemented');
    },
    write: () => {
      throw new Error('not implemented');
    },
    length: () => {
      throw new Error('not implemented');
    },
    isFixedLength: false,
  },
  1033: {
    read: () => {
      throw new Error('not implemented');
    },
    write: () => {
      throw new Error('not implemented');
    },
    length: () => 16,
    isFixedLength: true,
  },
};

const builtinArrayTypes: BuiltInArrayTypeMap = {
  1000: {
    read: (message, offset) => readArray(message, offset, readBool),
    write: (value, dst, offset) => writeArray(value, 16, dst, offset, writeBool),
    length: (value) => 20 + 5 * value.length,
    isFixedLength: false,
  },
  1001: {
    read: (message, offset) => readArray(message, offset, readBytea),
    write: (value, dst, offset) => writeArray(value, 17, dst, offset, writeBytea),
    length: buildLengthEstimator(builtinPrimitiveTypes[17].length),
    isFixedLength: false,
  },
  1009: {
    read: (message, offset) => readArray(message, offset, readString),
    write: (value, dst, offset) => writeArray(value, 25, dst, offset, writeString),
    length: buildLengthEstimator(builtinPrimitiveTypes[25].length),
    isFixedLength: false,
  },
  1005: {
    read: (message, offset) => readArray(message, offset, readInt2),
    write: (value, dst, offset) => writeArray(value, 21, dst, offset, writeInt2),
    length: (value) => 20 + 6 * value.length,
    isFixedLength: false,
  },
  1007: {
    read: (message, offset) => readArray(message, offset, readInt4),
    write: (value, dst, offset) => writeArray(value, 23, dst, offset, writeInt4),
    length: (value) => 20 + 8 * value.length,
    isFixedLength: false,
  },
  1028: {
    read: (message, offset) => readArray(message, offset, readOid),
    write: (value, dst, offset) => writeArray(value, 26, dst, offset, writeOid),
    length: (value) => 20 + 8 * value.length,
    isFixedLength: false,
  },
  1016: {
    read: (message, offset) => readArray(message, offset, readInt8),
    write: (value, dst, offset) => writeArray(value, 20, dst, offset, writeInt8),
    length: (value) => 20 + 12 * value.length,
    isFixedLength: false,
  },
  1021: {
    read: (message, offset) => readArray(message, offset, readFloat4),
    write: (value, dst, offset) => writeArray(value, 700, dst, offset, writeFloat4),
    length: (value) => 20 + 8 * value.length,
    isFixedLength: false,
  },
  1022: {
    read: (message, offset) => readArray(message, offset, readFloat8),
    write: (value, dst, offset) => writeArray(value, 701, dst, offset, writeFloat8),
    length: (value) => 20 + 12 * value.length,
    isFixedLength: false,
  },
  1115: {
    read: (message, offset) => readArray(message, offset, readTimestamp),
    write: (value, dst, offset) => writeArray(value, 1114, dst, offset, writeTimestamp),
    length: (value) => 20 + 12 * value.length,
    isFixedLength: false,
  },
  1185: {
    read: (message, offset) => readArray(message, offset, readTimestamp),
    write: (value, dst, offset) => writeArray(value, 1184, dst, offset, writeTimestamp),
    length: (value) => 20 + 12 * value.length,
    isFixedLength: false,
  },
  1182: {
    read: (message, offset) => readArray(message, offset, readDate),
    write: (value, dst, offset) => writeArray(value, 1082, dst, offset, writeDate),
    length: (value) => 20 + 8 * value.length,
    isFixedLength: false,
  },
  2951: {
    read: (message, offset) => readArray(message, offset, readUUID),
    write: (value, dst, offset) => writeArray(value, 2950, dst, offset, writeUUID),
    length: (value) => 20 + 20 * value.length,
    isFixedLength: false,
  },
  1231: {
    read: (message, offset) => readArray(message, offset, readNumeric),
    write: (value, dst, offset) => writeArray(value, 1700, dst, offset, writeNumeric),
    length: buildLengthEstimator(builtinPrimitiveTypes[1700].length),
    isFixedLength: false,
  },
  199: {
    read: (message, offset) => readArray(message, offset, readJson),
    write: (value, dst, offset) => writeArray(value, 114, dst, offset, writeJson),
    length: buildLengthEstimator(builtinPrimitiveTypes[114].length),
    isFixedLength: false,
  },
  3807: {
    read: (message, offset) => readArray(message, offset, readJsonb),
    write: (value, dst, offset) => writeArray(value, 3802, dst, offset, writeJsonb),
    length: buildLengthEstimator(builtinPrimitiveTypes[114].length, 5),
    isFixedLength: false,
  },
  // Needed for benchmark
  1034: {
    read: (message, offset) =>
      readArray(message, offset, () => {
        throw new Error('not implemented');
      }),
    write: (value, dst, offset) =>
      writeArray(value, 1033, dst, offset, () => {
        throw new Error('not implemented');
      }),
    length: (value) => 20 + 20 * value.length,
    isFixedLength: false,
  },
};

type BuiltInTypeMap = readonly TypeDefinition<unknown>[] &
  BuiltInPrimitiveTypeMap &
  BuiltInArrayTypeMap;
export const builtinTypes: BuiltInTypeMap = (() => {
  // oxlint-disable-next-line no-explicit-any
  const result = new Array<TypeDefinition<unknown>>(3807);

  for (const [key, value] of Object.entries(builtinPrimitiveTypes)) {
    result[Number.parseInt(key)] = value as TypeDefinition<unknown>;
  }

  for (const [key, value] of Object.entries(builtinArrayTypes)) {
    result[Number.parseInt(key)] = value as TypeDefinition<unknown>;
  }

  return result as unknown as BuiltInTypeMap;
})();

function buildLengthEstimator<T>(
  itemLength: (item: T) => number,
  fixedSize = 4,
): (value: (T | null)[]) => number {
  return (value) => {
    let result = 20 + fixedSize * value.length;
    for (const item of value) {
      if (item !== null) {
        result += itemLength(item);
      }
    }
    return result;
  };
}
