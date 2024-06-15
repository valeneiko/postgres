/* oxlint-disable no-non-null-assertion */

import { compile as valeneikoCompile, sql as valeneikoSql } from '@valeneiko/postgres';
import {
  Connection as ValeneikoConnection,
  parseOptions as valeneikoParseOptions,
} from '@valeneiko/postgres/connection';
import postgres from 'postgres';
import {
  type DatabaseConnection as SlonikDatabaseConnection,
  type DatabasePool as SlonikDatabasePool,
  createPool as slonikCreatePool,
  sql as slonikSql,
} from 'slonik';
import { type BenchOptions, bench, describe } from 'vitest';

let slonikPool: SlonikDatabasePool | undefined;
let slonikConnection: SlonikDatabaseConnection | undefined;
let slonikConnectionEnd: PromiseWithResolvers<void> | undefined;

const valeneikoConnectionOpts = valeneikoParseOptions({
  host: '127.0.0.1',
  sni: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password: 'qwerty',
  withSSL: false,
});
let valeneikoConnection: ValeneikoConnection | undefined;

let postgresSql: postgres.Sql | undefined;
let postgresConnection: postgres.ReservedSql | undefined;

const slonikBenchOptions: BenchOptions = {
  async setup(_task, mode) {
    if (mode === 'warmup') {
      slonikPool = await slonikCreatePool('postgres://postgres:qwerty@127.0.0.1:5432', {
        captureStackTrace: false,
      });
      slonikConnection = await new Promise((resolve) => {
        slonikConnectionEnd = Promise.withResolvers<void>();
        void slonikPool!.connect((connection) => {
          resolve(connection);

          return slonikConnectionEnd!.promise;
        });
      });
    }
  },
  async teardown(_task, mode) {
    if (mode === 'run') {
      slonikConnectionEnd!.resolve();
      await Promise.allSettled([slonikConnectionEnd!.promise, slonikPool!.end()]);
      slonikPool = undefined;
      slonikConnection = undefined;
      slonikConnectionEnd = undefined;
    }
  },
};

const valeneikoBenchOptions: BenchOptions = {
  async setup(_task, mode) {
    if (mode === 'warmup') {
      valeneikoConnection = new ValeneikoConnection(valeneikoConnectionOpts);
      await valeneikoConnection.connect();
    }
  },
  async teardown(_task, mode) {
    if (mode === 'run') {
      await Promise.allSettled([valeneikoConnection!.close()]);
      valeneikoConnection = undefined;
    }
  },
};

const postgresBenchOptions: BenchOptions = {
  async setup(_task, mode) {
    if (mode === 'warmup') {
      postgresSql = postgres('postgres://postgres:qwerty@127.0.0.1:5432', {
        max: 1,
        fetch_types: false,
        max_lifetime: null,
      });
      // Run a query to make sure connection is open before we try to reserve it
      await postgresSql`SELECT`;
      postgresConnection = await postgresSql.reserve();
    }
  },
  async teardown(_task, mode) {
    if (mode === 'run') {
      postgresConnection!.release();
      postgresConnection = undefined;
      await Promise.allSettled([postgresSql!.end()]);
      postgresSql = undefined;
    }
  },
};

describe('select', () => {
  bench(
    'slonik',
    async () => {
      await slonikConnection!.query(slonikSql.unsafe`SELECT 1 as x`);
    },
    slonikBenchOptions,
  );

  bench(
    'valeneiko',
    async () => {
      await valeneikoConnection!.query(valeneikoCompile(valeneikoSql`SELECT 1 as x`));
    },
    valeneikoBenchOptions,
  );

  bench(
    'postgres',
    async () => {
      await postgresConnection!`SELECT 1 as x`;
    },
    postgresBenchOptions,
  );
});

describe('select arg', () => {
  bench(
    'slonik',
    async () => {
      await slonikConnection!.query(slonikSql.unsafe`SELECT ${1}::int4 as x`);
    },
    slonikBenchOptions,
  );

  bench(
    'valeneiko',
    async () => {
      await valeneikoConnection!.query(valeneikoCompile(valeneikoSql`SELECT ${1}::int4 as x`));
    },
    valeneikoBenchOptions,
  );

  bench(
    'postgres',
    async () => {
      await postgresConnection!`SELECT ${1}::int4 as x`;
    },
    postgresBenchOptions,
  );
});

describe('select args', () => {
  bench(
    'slonik',
    async () => {
      await slonikConnection!.query(slonikSql.unsafe`
        select
          ${1}::int4 as int,
          ${'foo'} as string,
          ${new Date().toISOString()}::timestamp with time zone as timestamp,
          ${null} as null,
          ${false}::bool as boolean,
          ${Buffer.from('bar').toString()}::bytea as bytea,
          ${slonikSql.json(
            JSON.stringify([
              {
                foo: 'bar',
              },
              {
                bar: 'baz',
              },
            ]),
          )}::jsonb as json
    `);
    },
    slonikBenchOptions,
  );

  bench(
    'valeneiko',
    async () => {
      await valeneikoConnection!.query(
        valeneikoCompile(valeneikoSql`
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
    },
    valeneikoBenchOptions,
  );

  bench(
    'postgres',
    async () => {
      await postgresConnection!`
        select
          ${1}::int4 as int,
          ${'foo'} as string,
          ${new Date().toISOString()}::timestamp with time zone as timestamp,
          ${null} as null,
          ${false}::bool as boolean,
          ${Buffer.from('bar').toString()}::bytea as bytea,
          ${postgresSql!.json(
            JSON.stringify([
              {
                foo: 'bar',
              },
              {
                bar: 'baz',
              },
            ]),
          )}::jsonb as json
      `;
    },
    postgresBenchOptions,
  );
});

describe('select where', () => {
  bench(
    'slonik',
    async () => {
      await slonikConnection!.query(
        slonikSql.unsafe`select * from pg_catalog.pg_type where typname = ${'bool'}`,
      );
    },
    slonikBenchOptions,
  );

  bench(
    'valeneiko',
    async () => {
      await valeneikoConnection!.query(
        valeneikoCompile(valeneikoSql`select * from pg_catalog.pg_type where typname = ${'bool'}`),
      );
    },
    valeneikoBenchOptions,
  );

  bench(
    'postgres',
    async () => {
      await postgresConnection!`select * from pg_catalog.pg_type where typname = ${'bool'}`;
    },
    postgresBenchOptions,
  );
});
