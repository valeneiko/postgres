/* eslint-disable vitest/valid-title -- dynamic test name */
import { describe, expect, test } from 'vitest';

import { impl } from '@/index';

describe('simple', () => {
  for (const [name, ns] of Object.entries(impl)) {
    const func = ns.simple;
    test(name, () => {
      expect.hasAssertions();
      const result = func();
      expect(result.sql).toStrictEqual('SELECT * FROM users');
      expect(result.parameters).toStrictEqual([]);
      expect(() => func()).not.toThrow();
    });
  }
});

describe('parametrized', () => {
  for (const [name, ns] of Object.entries(impl)) {
    const func = ns.parametrized;
    test(name, () => {
      expect.hasAssertions();
      const result = func(7);
      expect(result.sql).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result.parameters).toStrictEqual([7]);
      expect(() => func(56)).not.toThrow();
    });
  }
});

describe('from fragments', () => {
  for (const [name, ns] of Object.entries(impl)) {
    const func = ns.fromFragments;
    test(name, () => {
      expect.hasAssertions();
      const result = func();
      expect(result.sql).toStrictEqual('SELECT * FROM users');
      expect(result.parameters).toStrictEqual([]);
      expect(() => func()).not.toThrow();
    });
  }
});

describe('from fragments with parameters', () => {
  for (const [name, ns] of Object.entries(impl)) {
    const func = ns.fromFragmentsWithParameters;
    test(name, () => {
      expect.hasAssertions();
      const result = func(3);
      expect(result.sql).toStrictEqual('SELECT * FROM users WHERE id = $1');
      expect(result.parameters).toStrictEqual([3]);
      expect(() => func(21)).not.toThrow();
    });
  }
});
