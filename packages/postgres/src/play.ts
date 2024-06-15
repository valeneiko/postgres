import { Connection, parseOptions } from '@/connection';
import { compile, sql } from '@/index';

process.on('uncaughtExceptionMonitor', (err) => {
  console.error(err);
});

process.on('unhandledRejection', (err) => {
  console.error(err);
});

const withSSL = process.argv[2] === 'withSSL';

const opts = parseOptions({
  host: '127.0.0.1',
  sni: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password: 'qwerty',
  withSSL,
});
const connection = new Connection(opts);
const connection2 = new Connection(opts);

await Promise.all([connection.connect(), connection2.connect()]);
const connection3 = new Connection(opts);
await connection3.connect();

console.log('Connected');

const result1 = await connection.query(compile(sql`SELECT 1 as num`));
console.log('Result1:', result1);

const result2 = await connection.query(compile(sql`SELECT ${123}::bigint as param`));
console.log('Result2:', result2);

const result3 = await connection.query(compile(sql`SELECT ${'1'} as x`));
console.log('Result3:', result3);

const result4 = await connection.query(
  compile(sql`
    select
      ${1}::int4 as int,
      ${'foo'} as string,
      ${new Date()}::timestamp with time zone as timestamp,
      ${null} as null,
      ${false}::bool as boolean,
      ${Buffer.from('bar')}::bytea as bytea,
      ${JSON.stringify([
        {
          foo: 'bar',
        },
        {
          bar: 'baz',
        },
      ])}::jsonb as json
  `),
);
console.log('Result4:', result4);

const result5 = await connection.query(
  compile(sql`select * from pg_catalog.pg_type where typname = ${'bool'}`),
);
console.log('Result5:', result5);

console.log('Closing...');
await Promise.all([connection.close(), connection2.close(), connection3.close()]);

console.log('Closed');
