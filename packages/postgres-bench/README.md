# Benchmarks for Postgres library

There are 2 components to the library: query building and execution. Each is benchmarked separately.

## Query building

Here many libraries where compared, to establish a baseline. Kysely in raw mode was the fastest.
So this project was compared only to the baseline.

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

## Query Execution

Compare using these 3 benchmarks:

- [x] <https://github.com/gajus/slonik/tree/main/packages/benchmark>
  - Serially executed queries using single connection
  - Useful to measure overhead
  - Result:

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

- [ ] ***TODO:*** <https://github.com/porsager/postgres-benchmarks>
  - Similar to above, but using connection pool and running concurrently
  - Useful to measure throughput
- [ ] ***TODO:*** <https://porsager.github.io/imdbench/sql.html>
  - A more realistic usage scenario
