import { compile as compileImpl, sql } from '@valeneiko/postgres';

interface CompiledQuery {
  sql: string;
  parameters: readonly unknown[];
}

function compile(node: Parameters<typeof compileImpl>[0]): CompiledQuery {
  const result = compileImpl(node);
  return {
    sql: result.state.final,
    parameters: result.parameters,
  };
}

export function simple(): CompiledQuery {
  return compile(sql`SELECT * FROM users`);
}

export function parametrized(id: number): CompiledQuery {
  return compile(sql`SELECT * FROM users WHERE id = ${id}`);
}

export function fromFragments(): CompiledQuery {
  const select = sql`SELECT *`;
  const from = sql`FROM users`;
  return compile(sql`${select} ${from}`);
}

export function fromFragmentsWithParameters(id: number): CompiledQuery {
  const select = sql`SELECT * FROM users`;
  const where = sql`WHERE id = ${id}`;
  return compile(sql`${select} ${where}`);
}
