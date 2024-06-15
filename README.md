# Postgres

The fastest PostgreSQL client and query builder for Node.
Uses a familiar tagged template literal based interface.
Supports commonly used PG types and dynamic (parametrized) queries.

Current implementation is just a proof of concept: happy-path execute a parametrized query against Postgres database and parse resulting rows. The goal was to validate performance gain.

### Roadmap

- [x] ✅ Construct a SQL query from tagged template literal fragments
- [x] ✅ Custom socket implementation for Zero copy parsing
- [x] ✅ Authenticate with Postgres with Username + Password using SCRAM
- [x] ✅ Send query to postgres using Extended Query Protocol and Named statements
- [x] ✅ Parse commonly user built-in types in query results
- [x] ✅ Support commonly used built-in types in query parameters
- [ ] 🚧 Implement connection pool
- [ ] 🚧 Handle errors and unexpected message types
- [ ] 🚧 Handle scratch buffer resizing when query does not fit in 4KiB
- [ ] 🚧 Support extending type parsing with custom types
- [ ] 🚧 Helper utilities to simplify SQL query construction
- [ ] 🚧 Simplify API surface
- [ ] 🚧 Support simple query protocol and transaction helpers

### Limitations

- ⚠️ Query length with all parameters after serialization needs to fit in 4KiB
  > It's an artificial limitation - I just hard-coded buffer size as 4096 bytes, so it can easily be increased. But the ultimate solution is to dynamically resize the buffer on-demand.
- ⚠️ Only built-in types are supported. And some have unintuitive usage.
  > Parameter types are inferred by Postgres, which determines which function will be called to serialize the parameter. Passing a wrong JS type to the function is likely to throw an error. Adding explicit casts *(e.g.`::bigint`)* to parameters is helpful to ensure correct type is inferred. But for others the JS side values is unintuitive (e.g. JSON expects value to be already stringified or numeric expects a string).
- ⚠️ Only happy-path parametrized query returning rows is implemented.
  > Postgres can return errors or notice messages, or respond with NoData message. None of these are handled, but would have 0 impact on performance. Additionally the only outcome of the query is `resolve`, so if the error occurs and process does not crash - the query will hang indefinitely.

## Usage

```typescript
import { compile, sql } from '@valeneiko/postgres';
import {
  Connection,
  parseOptions,
} from '@valeneiko/postgres/connection';

// Create connection options object - it should be shared between connections
const opts = parseOptions({
  host: '127.0.0.1',
  sni: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password: 'qwerty',
  withSSL: false,
});

// Create a connection and authenticate with the database
const connection = new Connection(opts);
await connection.connect();

...

// Run an example query
const userId = 5;
const users = await connection.query(compile(sql`
  SELECT *
  FROM users
  WHERE user_id = ${userId}
`));

...

// Terminate the connection
await connection.close();
```

## Benchmarks

Tested using *Node v24.11.1* on *AMD 3900X* with *64GB RAM* against Postgres DB running locally inside a docker container.

### Query Builder

This library is ***3.5x - 5.5x faster*** than the fastest library I was able to find: [kysely](https://kysely.dev/docs/intro) (in particular its raw SQL capability)

```text
 ✓  @valeneiko/postgres-bench  src/__tests__/query-builder.bench.ts > simple 3283ms
     name                 hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · kyselyRaw  2,369,929.53  0.0003  0.1948  0.0004  0.0004  0.0005  0.0006  0.0013  ±0.28%  1184965
   · valeneiko  8,685,080.26  0.0001  0.4828  0.0001  0.0001  0.0002  0.0002  0.0003  ±0.54%  4342541

 ✓  @valeneiko/postgres-bench  src/__tests__/query-builder.bench.ts > parametrized 2830ms
     name                 hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · kyselyRaw  1,731,922.61  0.0005  0.4174  0.0006  0.0006  0.0007  0.0008  0.0013  ±0.34%   865962
   · valeneiko  7,249,900.55  0.0001  0.4692  0.0001  0.0002  0.0002  0.0002  0.0007  ±0.54%  3624951

 ✓  @valeneiko/postgres-bench  src/__tests__/query-builder.bench.ts > from fragments 2276ms
     name                 hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · kyselyRaw    960,299.42  0.0009  0.4150  0.0010  0.0011  0.0013  0.0013  0.0017  ±0.23%   480150
   · valeneiko  4,986,869.00  0.0001  0.5419  0.0002  0.0002  0.0003  0.0003  0.0008  ±0.61%  2493435

 ✓  @valeneiko/postgres-bench  src/__tests__/query-builder.bench.ts > from fragments with parameters 2213ms
     name                 hz     min      max    mean     p75     p99    p995    p999     rme  samples
   · kyselyRaw    848,244.30  0.0011   0.4703  0.0012  0.0012  0.0016  0.0018  0.0022  ±0.41%   424123
   · valeneiko  4,482,442.21  0.0001  17.8137  0.0002  0.0002  0.0003  0.0003  0.0008  ±6.99%  2241222

 BENCH  Summary

   @valeneiko/postgres-bench  valeneiko - src/__tests__/query-builder.bench.ts > simple
    3.66x faster than kyselyRaw

   @valeneiko/postgres-bench  valeneiko - src/__tests__/query-builder.bench.ts > parametrized
    4.19x faster than kyselyRaw

   @valeneiko/postgres-bench  valeneiko - src/__tests__/query-builder.bench.ts > from fragments
    5.19x faster than kyselyRaw

   @valeneiko/postgres-bench  valeneiko - src/__tests__/query-builder.bench.ts > from fragments with parameters
    5.28x faster than kyselyRaw
```

### Query Execution

This library is about ***3-5% faster*** than [Postgres.js](https://github.com/porsager/postgres) and ***15-20% faster*** than [Slonik (pg)](https://github.com/gajus/slonik).

```text
✓  @valeneiko/postgres-bench  src/__tests__/serial-single-connection.bench.ts > select 1894ms
    name             hz     min     max    mean     p75     p99    p995    p999     rme  samples
  · slonik     1,269.00  0.6664  1.7957  0.7880  0.8098  1.1179  1.2694  1.7957  ±1.00%      635
  · valeneiko  1,492.55  0.6045  0.8608  0.6700  0.6868  0.7991  0.8333  0.8608  ±0.41%      747
  · postgres   1,417.79  0.6321  1.0418  0.7053  0.7225  0.8794  0.9595  1.0418  ±0.55%      709

✓  @valeneiko/postgres-bench  src/__tests__/serial-single-connection.bench.ts > select arg 1872ms
    name             hz     min     max    mean     p75     p99    p995    p999     rme  samples
  · slonik     1,272.95  0.6877  1.7106  0.7856  0.8069  1.0605  1.1765  1.7106  ±0.79%      637
  · valeneiko  1,446.63  0.6086  1.2035  0.6913  0.7138  0.9083  0.9761  1.2035  ±0.68%      724
  · postgres   1,408.34  0.6322  1.0642  0.7101  0.7295  0.8872  0.9082  1.0642  ±0.54%      705

✓  @valeneiko/postgres-bench  src/__tests__/serial-single-connection.bench.ts > select args 1888ms
    name             hz     min     max    mean     p75     p99    p995    p999     rme  samples
  · slonik     1,186.37  0.7331  1.8783  0.8429  0.8703  1.2065  1.2966  1.8783  ±0.93%      594
  · valeneiko  1,413.50  0.6302  0.9505  0.7075  0.7295  0.8448  0.8916  0.9505  ±0.48%      707
  · postgres   1,334.59  0.6575  1.4897  0.7493  0.7705  1.0895  1.1483  1.4897  ±0.79%      668

✓  @valeneiko/postgres-bench  src/__tests__/serial-single-connection.bench.ts > select where 1855ms
    name             hz     min     max    mean     p75     p99    p995    p999     rme  samples
  · slonik     1,075.86  0.8177  2.6198  0.9295  0.9487  1.1334  1.3327  2.6198  ±0.86%      538
  · valeneiko  1,284.72  0.6659  1.2699  0.7784  0.8059  1.0251  1.0553  1.2699  ±0.67%      643
  · postgres   1,277.75  0.6952  1.0831  0.7826  0.8054  0.9956  1.0210  1.0831  ±0.59%      639

BENCH  Summary

  @valeneiko/postgres-bench  valeneiko - src/__tests__/serial-single-connection.bench.ts > select
    1.05x faster than postgres
    1.18x faster than slonik

  @valeneiko/postgres-bench  valeneiko - src/__tests__/serial-single-connection.bench.ts > select arg
    1.03x faster than postgres
    1.14x faster than slonik

  @valeneiko/postgres-bench  valeneiko - src/__tests__/serial-single-connection.bench.ts > select args
    1.06x faster than postgres
    1.19x faster than slonik

  @valeneiko/postgres-bench  valeneiko - src/__tests__/serial-single-connection.bench.ts > select where
    1.01x faster than postgres
    1.19x faster than slonik
```

## How is it faster?

### Cache everything to avoid repeated computation

The core idea was to use the fact that first argument to tag function is static (i.e. it is created once and is reused for subsequent calls). If we use this static string array as a map key, we can retrieve a pre-computed value when the same query is getting executed for the second time instead of recomputing everything from scratch.

When using extended query protocol, parameters are send separately from the query itself. So the query is static across invocations too. Which means we can cache the binary representation of the query. This avoids repeated string concatenations, Buffer allocation and UTF8 encoding the strings into those buffers.

Since the query is static, the parameter types inferred by Postgres and the shape of the result row is also static. We can use this to dynamically generate optimized parameter serialization and result parsing functions. This avoids unnecessary lookups and loops.

### Custom Socket for zero-copy parsing

The first 5 bytes of the Postgres message are always the same: 1-byte message type and 4-byte message length.
This means we can pre-allocate a buffer of exact size needed to read the next message after reading the first 5 bytes. We can then pass this buffer through the parsing function directly avoiding unnecessary copies, and not needing any logic to parse partial message or recombining partials buffers later.
If we can guarantee message parsing is synchronous we can also reuse the same buffer between messages avoiding unnecessary allocations.

The custom socket implementation does exactly that. At the start is masquerades as a 5-byte buffer, and upon receiving message length it updates bound of the current buffer to exactly fit the full message. When the full message is received, it transforms back to a 5-byte buffer (without actually releasing any memory). The buffer is static for the lifetime of the connection (unless it needs to grow to accommodate a larger message).

### Binary protocol

Modern versions of Node / JS have optimized utilities for dealing with binary data (Buffer / DataView). Binary format is more compact and should result in better query performance as long as parsers JS-side are fast enough, which it seems they are.
