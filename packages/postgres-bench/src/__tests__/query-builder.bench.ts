import { bench, describe } from 'vitest';

import { impl } from '@/index';

describe('simple', () => {
  for (const [name, ns] of Object.entries(impl)) {
    const func = ns.simple;
    bench(name, () => {
      func();
    });
  }
});

describe('parametrized', () => {
  for (const [name, ns] of Object.entries(impl)) {
    const func = ns.parametrized;
    bench(name, () => {
      func(7);
    });
  }
});

describe('from fragments', () => {
  for (const [name, ns] of Object.entries(impl)) {
    const func = ns.fromFragments;
    bench(name, () => {
      func();
    });
  }
});

describe('from fragments with parameters', () => {
  for (const [name, ns] of Object.entries(impl)) {
    const func = ns.fromFragmentsWithParameters;
    bench(name, () => {
      func(3);
    });
  }
});
