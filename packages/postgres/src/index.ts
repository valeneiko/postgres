const isFragment = Symbol('isFragment');
const nextSym = Symbol('next');
type PrimitiveValue =
  | Uint8Array
  | boolean
  | number
  | string
  | bigint
  | Date
  | null
  | PrimitiveValue[];

declare const FRAGMENT: unique symbol;
type FragmentId = TemplateStringsArray & { [FRAGMENT]: never };
interface RawNode {
  readonly [isFragment]: true;
  readonly sqlFragments: FragmentId;
  readonly parameters: readonly MaybeFragmentNode[];
}
type MaybeFragmentNode = RawNode | null | { [isFragment]?: never };

export const sql = (
  sqlFragments: TemplateStringsArray,
  ...parameters: (RawNode | PrimitiveValue)[]
): RawNode => {
  return {
    [isFragment]: true,
    sqlFragments: sqlFragments as FragmentId,
    parameters: parameters as MaybeFragmentNode[],
  };
};

export interface CompiledQuery {
  readonly state: Omit<CacheData, typeof nextSym>;
  readonly parameters: readonly unknown[];
}

interface CacheData {
  readonly [nextSym]: {
    sliceEnd: number;
    store: Map<FragmentId, CacheData>;
  }[];
  final: string;
  statementId: number;
  message: Buffer;
  describeOffset: number;
  bindOffset: number;
  bindBaseLength: number;
  described: boolean;
  writeParameters: (parameters: readonly unknown[], dst: DataView, offset: number) => number;
  parseResult: (src: DataView, offset: number) => unknown;
}

class DefaultQueryCompiler {
  static #NEXT_STATEMENT_ID = 1;
  static readonly #NOOP = () => ({});
  static readonly #DEFAULT_WRITE = () => 0;
  static #EMPTY = Buffer.allocUnsafeSlow(0);

  #cacheStore = new Map<FragmentId, CacheData>();
  #cache: CacheData = {
    [nextSym]: [],
    final: '',
    statementId: 0,
    message: DefaultQueryCompiler.#EMPTY,
    describeOffset: 0,
    bindOffset: 0,
    bindBaseLength: 0,
    described: false,
    writeParameters: DefaultQueryCompiler.#DEFAULT_WRITE,
    parseResult: DefaultQueryCompiler.#NOOP,
  };

  #parameters: unknown[] = [];

  compileQuery(node: RawNode): CompiledQuery {
    this.#parameters = [];

    let cache = this.#cacheStore.get(node.sqlFragments);
    if (cache) {
      this.#cache = cache;
      this.#getCached(node);
    } else {
      cache = {
        [nextSym]: [],
        final: '',
        statementId: 0,
        message: DefaultQueryCompiler.#EMPTY,
        describeOffset: 0,
        bindOffset: 0,
        bindBaseLength: 0,
        described: false,
        writeParameters: DefaultQueryCompiler.#DEFAULT_WRITE,
        parseResult: DefaultQueryCompiler.#NOOP,
      };
      this.#cacheStore.set(node.sqlFragments, cache);
      this.#cache = cache;
      this.#visitRaw(node, 0);
      this.#finalize();
    }

    return {
      state: this.#cache,
      parameters: this.#parameters,
    };
  }

  #getCached(node: RawNode): boolean {
    const { parameters: params } = node;

    for (let i = 0, nextIdx = 0; i < params.length; i++) {
      const param = params[i];
      if (param?.[isFragment]) {
        let next = this.#cache[nextSym][nextIdx] as CacheData[typeof nextSym][number] | undefined;
        if (!next) {
          next = {
            store: new Map(),
            sliceEnd: this.#cache.final.length,
          };
          this.#cache[nextSym].push(next);
        }

        const { store, sliceEnd } = next;
        let nextCache = store.get(param.sqlFragments);
        if (!nextCache) {
          nextCache = {
            [nextSym]: [],
            final: this.#cache.final.slice(0, sliceEnd),
            statementId: 0,
            message: DefaultQueryCompiler.#EMPTY,
            describeOffset: 0,
            bindOffset: 0,
            bindBaseLength: 0,
            described: false,
            writeParameters: DefaultQueryCompiler.#DEFAULT_WRITE,
            parseResult: DefaultQueryCompiler.#NOOP,
          };
          store.set(param.sqlFragments, nextCache);
          this.#cache = nextCache;

          // continue in raw mode from the current state
          this.#visitRaw(param, 0);
          this.#finalize();
          return true;
        }

        this.#cache = nextCache;
        if (this.#getCached(param)) {
          // continue in raw mode from the current state
          const nextIdx = i + 1;
          if (nextIdx < params.length) {
            this.#visitRaw(node, nextIdx);
            this.#finalize();
          }
          return true;
        }
        nextIdx = 0;
      } else {
        this.#parameters.push(param);
        nextIdx++;
      }
    }

    return false;
  }

  #visitRaw(node: RawNode, startIdx: number): void {
    const { sqlFragments, parameters: params } = node;

    this.#cache.final += sqlFragments[startIdx];
    let i = startIdx;

    while (i < params.length) {
      const store = new Map<FragmentId, CacheData>();
      const next = {
        store,
        sliceEnd: this.#cache.final.length,
      };
      this.#cache[nextSym].push(next);

      const param = params[i];
      if (param?.[isFragment]) {
        const nextCache: CacheData = {
          [nextSym]: [],
          final: this.#cache.final,
          statementId: 0,
          message: DefaultQueryCompiler.#EMPTY,
          describeOffset: 0,
          bindOffset: 0,
          bindBaseLength: 0,
          described: false,
          writeParameters: DefaultQueryCompiler.#DEFAULT_WRITE,
          parseResult: DefaultQueryCompiler.#NOOP,
        };
        store.set(param.sqlFragments, nextCache);
        this.#cache = nextCache;
        this.#visitRaw(param, 0);
      } else {
        this.#parameters.push(param);

        // oxlint-disable-next-line @typescript-eslint/restrict-plus-operands
        this.#cache.final += '$' + this.#parameters.length;
      }
      i++;
      this.#cache.final += sqlFragments[i];
    }
  }

  #finalize(): void {
    const state = this.#cache;
    state.statementId = DefaultQueryCompiler.#NEXT_STATEMENT_ID++;
    const statementName = Buffer.from(state.statementId.toString(36), 'ascii');

    let offset: number;
    const message = Buffer.allocUnsafe(34 + statementName.byteLength * 3 + state.final.length);
    // Parse
    message.writeUint8(80 /* P */, 0);
    message.writeUInt32BE(statementName.byteLength + state.final.length + 8, 1);
    statementName.copy(message, 5, 0, statementName.byteLength);
    offset = 5 + statementName.byteLength;
    message.writeUint8(0, offset);
    offset += 1;
    message.write(state.final, offset, 'ascii');

    // Describe
    offset += state.final.length;
    state.describeOffset = offset + 3;
    message.writeUint32BE(68 /* D */, offset);
    message.writeUint32BE(statementName.byteLength + 6, offset + 4);
    message.writeUint8(83 /* S */, offset + 8);
    offset += 9;
    statementName.copy(message, offset, 0, statementName.byteLength);

    // Flush
    offset += statementName.length;
    message.writeUint16BE(72 /* H */, offset);
    message.writeUInt32BE(4, offset + 2);

    // Bind
    offset += 6;
    state.bindOffset = offset;
    state.bindBaseLength = 12 + statementName.byteLength;

    message.writeUint8(66 /* B */, offset);
    // message.writeUint32BE(state.bindBaseLength+params.byteLength, offset+1);
    message.writeUint8(0, offset + 5);
    offset += 6;
    statementName.copy(message, offset, 0, statementName.byteLength);
    offset += statementName.byteLength;
    message.writeUint8(0, offset);
    message.writeUint32BE(0x01_00_01, offset + 1);
    message.writeUint16BE(this.#parameters.length, offset + 5);

    state.message = message;
  }
}

const compiler = new DefaultQueryCompiler();
export function compile(node: RawNode): CompiledQuery {
  return compiler.compileQuery(node);
}
