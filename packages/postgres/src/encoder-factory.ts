import { compileFunction } from 'node:vm';

import { builtinTypes } from './built-in-types';

export function buildParameterEncoder(
  paramTypes: readonly number[],
): (parameters: readonly unknown[], dst: DataView, offset: number) => number {
  const context: Record<string, unknown> = {
    writeValue,
  };
  const code: string[] = ['let currentOffset = offset;'];
  for (let i = 0; i < paramTypes.length; i++) {
    const type = paramTypes[i];
    const writeName = `write_${type}`;
    context[writeName] = builtinTypes[type].write;
    code.push(`currentOffset = writeValue(parameters[${i}], ${writeName}, dst, currentOffset);`);
  }
  code.push('return currentOffset - offset;');

  return compileFunction(code.join('\n'), ['parameters', 'dst', 'offset'], {
    contextExtensions: [context],
  }) as (parameters: readonly unknown[], dst: DataView, offset: number) => number;
}

function writeValue(
  value: unknown,
  write: (value: unknown, dst: DataView, offset: number) => number,
  dst: DataView,
  offset: number,
): number {
  if (value === null) {
    dst.setInt32(offset, -1);
    return offset + 4;
  }

  const valueOffset = offset + 4;
  const length = write(value, dst, valueOffset);
  dst.setInt32(offset, length);
  return valueOffset + length;
}

export interface Field {
  name: string;
  // table: number;
  // columnIdx: number;
  type: number;
  // typeSize: number;
  // typeModifier: number;
  // format: number;
}

export function buildRowParser(
  fields: readonly Field[],
): (src: DataView, offset: number) => unknown {
  const context: Record<string, unknown> = {
    readValue,
  };
  const resultInit = ['const result = {'];
  const code: string[] = ['', 'let currentOffset = offset;', 'const value = {value: null};'];
  for (const { name, type } of fields) {
    const sanitizedName = name.replaceAll("'", String.raw`\'`);
    const readName = `read_${type}`;
    context[readName] = builtinTypes[type].read;
    resultInit.push(`  '${sanitizedName}': null,`);
    code.push(
      `currentOffset = readValue(value, ${readName}, src, currentOffset);`,
      `result['${sanitizedName}'] = value.value;`,
    );
  }
  resultInit.push('};');
  code[0] = resultInit.join('\n');
  code.push('return result;');

  return compileFunction(code.join('\n'), ['src', 'offset'], {
    contextExtensions: [context],
  }) as (src: DataView, offset: number) => unknown;
}

function readValue(
  value: { value: unknown },
  read: (message: DataView, offset: number, length: number) => unknown,
  src: DataView,
  offset: number,
): number {
  const length = src.getInt32(offset);
  const valueOffset = offset + 4;

  if (length === -1) {
    value.value = null;
    return valueOffset;
  }

  value.value = read(src, valueOffset, length);
  return valueOffset + length;
}
