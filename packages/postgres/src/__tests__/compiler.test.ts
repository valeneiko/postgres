import { describe, expect, it } from 'vitest';

import { compile, sql } from '@/index';

describe('compiler', () => {
  it('simple', () => {
    expect.hasAssertions();

    const result = compile(sql`SELECT * FROM users`);
    expect(result.state.final).toStrictEqual('SELECT * FROM users');
    expect(result.parameters).toStrictEqual([]);
  });

  it('parametrized', () => {
    expect.hasAssertions();

    const result = compile(sql`SELECT * FROM users WHERE id = ${7}`);
    expect(result.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
    expect(result.parameters).toStrictEqual([7]);
  });

  it('from fragments', () => {
    expect.hasAssertions();

    const select = sql`SELECT *`;
    const from = sql`FROM users`;

    const result = compile(sql`${select} ${from}`);
    expect(result.state.final).toStrictEqual('SELECT * FROM users');
    expect(result.parameters).toStrictEqual([]);
  });

  it('from fragments with parameters', () => {
    expect.hasAssertions();

    const select = sql`SELECT * FROM users`;
    const where = sql`WHERE id = ${3}`;

    const result = compile(sql`${select} ${where}`);
    expect(result.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
    expect(result.parameters).toStrictEqual([3]);
  });

  it('from conditional fragments', () => {
    expect.hasAssertions();

    const getQuery = (opt: 'id' | 'name') => {
      const select = sql`SELECT * FROM users`;
      const where = opt === 'id' ? sql`WHERE id = ${3}` : sql`WHERE name = ${'foo'}`;
      return sql`${select} ${where}`;
    };

    const result = compile(getQuery('id'));
    expect(result.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
    expect(result.parameters).toStrictEqual([3]);

    const result2 = compile(getQuery('name'));
    expect(result2.state.final).toStrictEqual('SELECT * FROM users WHERE name = $1');
    expect(result2.parameters).toStrictEqual(['foo']);
  });

  it('from conditional fragments in the middle', () => {
    expect.hasAssertions();

    const getQuery = (opt: 'users' | 'accounts', id: number) => {
      const table = opt === 'users' ? sql`users` : sql`accounts`;
      const select = sql`SELECT * FROM ${table}`;
      const where = sql`WHERE id = ${id}`;
      return sql`${select} ${where}`;
    };

    const result = compile(getQuery('users', 3));
    expect(result.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
    expect(result.parameters).toStrictEqual([3]);

    const result2 = compile(getQuery('accounts', 12));
    expect(result2.state.final).toStrictEqual('SELECT * FROM accounts WHERE id = $1');
    expect(result2.parameters).toStrictEqual([12]);
  });

  describe('cached', () => {
    it('simple', () => {
      expect.hasAssertions();

      const getQuery = () => sql`SELECT * FROM users`;

      const result = compile(getQuery());
      expect(result.state.final).toStrictEqual('SELECT * FROM users');
      expect(result.parameters).toStrictEqual([]);

      const result2 = compile(getQuery());
      expect(result2.state.final).toStrictEqual('SELECT * FROM users');
      expect(result2.parameters).toStrictEqual([]);
    });

    it('parametrized', () => {
      expect.hasAssertions();

      const getQuery = (id: number) => sql`SELECT * FROM users WHERE id = ${id}`;

      const result = compile(getQuery(7));
      expect(result.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result.parameters).toStrictEqual([7]);

      const result2 = compile(getQuery(21));
      expect(result2.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result2.parameters).toStrictEqual([21]);
    });

    it('from fragments', () => {
      expect.hasAssertions();

      const getQuery = () => {
        const select = sql`SELECT *`;
        const from = sql`FROM users`;
        return sql`${select} ${from}`;
      };

      const result = compile(getQuery());
      expect(result.state.final).toStrictEqual('SELECT * FROM users');
      expect(result.parameters).toStrictEqual([]);

      const result2 = compile(getQuery());
      expect(result2.state.final).toStrictEqual('SELECT * FROM users');
      expect(result2.parameters).toStrictEqual([]);
    });

    it('from fragments with parameters', () => {
      expect.hasAssertions();

      const getQuery = (id: number) => {
        const select = sql`SELECT * FROM users`;
        const where = sql`WHERE id = ${id}`;
        return sql`${select} ${where}`;
      };

      const result = compile(getQuery(3));
      expect(result.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result.parameters).toStrictEqual([3]);

      const result2 = compile(getQuery(56));
      expect(result2.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result2.parameters).toStrictEqual([56]);
    });

    it('from conditional fragments', () => {
      expect.hasAssertions();

      const getQuery = (opt: 'id' | 'name', value: number | string) => {
        const select = sql`SELECT * FROM users`;
        const where = opt === 'id' ? sql`WHERE id = ${value}` : sql`WHERE name = ${value}`;
        return sql`${select} ${where}`;
      };

      const result = compile(getQuery('id', 3));
      expect(result.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result.parameters).toStrictEqual([3]);

      const result2 = compile(getQuery('name', 'foo'));
      expect(result2.state.final).toStrictEqual('SELECT * FROM users WHERE name = $1');
      expect(result2.parameters).toStrictEqual(['foo']);

      const result3 = compile(getQuery('id', 88));
      expect(result3.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result3.parameters).toStrictEqual([88]);

      const result4 = compile(getQuery('name', 'bar'));
      expect(result4.state.final).toStrictEqual('SELECT * FROM users WHERE name = $1');
      expect(result4.parameters).toStrictEqual(['bar']);
    });

    it('from conditional fragments in the middle', () => {
      expect.hasAssertions();

      const getQuery = (opt: 'users' | 'accounts', id: number) => {
        const table = opt === 'users' ? sql`users` : sql`accounts`;
        const select = sql`SELECT * FROM ${table}`;
        const where = sql`WHERE id = ${id}`;
        return sql`${select} ${where}`;
      };

      const result = compile(getQuery('users', 3));
      expect(result.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result.parameters).toStrictEqual([3]);

      const result2 = compile(getQuery('accounts', 12));
      expect(result2.state.final).toStrictEqual('SELECT * FROM accounts WHERE id = $1');
      expect(result2.parameters).toStrictEqual([12]);

      const result3 = compile(getQuery('users', 5));
      expect(result3.state.final).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result3.parameters).toStrictEqual([5]);

      const result4 = compile(getQuery('accounts', 66));
      expect(result4.state.final).toStrictEqual('SELECT * FROM accounts WHERE id = $1');
      expect(result4.parameters).toStrictEqual([66]);
    });
  });
});
