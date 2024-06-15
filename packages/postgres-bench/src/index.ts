import * as kyselyRaw from '@/kysely-raw';
import * as valeneiko from '@/valeneiko';

export const impl = {
  kyselyRaw,
  valeneiko,
};

export const scenarios = Object.keys(kyselyRaw);
