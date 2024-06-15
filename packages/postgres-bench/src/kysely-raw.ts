import {
  type CompiledQuery,
  Kysely,
  PostgresDialect,
  type PostgresPool,
  type PostgresPoolClient,
  sql,
} from 'kysely';

const db = new Kysely<{ users: { id: string } }>({
  dialect: new PostgresDialect({
    pool: new (class implements PostgresPool {
      // oxlint-disable-next-line class-methods-use-this
      connect(): Promise<PostgresPoolClient> {
        throw new Error('Method not implemented.');
      }
      // oxlint-disable-next-line class-methods-use-this
      end(): Promise<void> {
        throw new Error('Method not implemented.');
      }
    })(),
  }),
});

export function simple(): CompiledQuery {
  return sql`SELECT * FROM users`.compile(db);
}

export function parametrized(id: number): CompiledQuery {
  return sql`SELECT * FROM users WHERE id = ${id}`.compile(db);
}

export function fromFragments(): CompiledQuery {
  const select = sql`SELECT *`;
  const from = sql`FROM users`;
  return sql`${select} ${from}`.compile(db);
}

export function fromFragmentsWithParameters(id: number): CompiledQuery {
  const select = sql`SELECT * FROM users`;
  const where = sql`WHERE id = ${id}`;
  return sql`${select} ${where}`.compile(db);
}
