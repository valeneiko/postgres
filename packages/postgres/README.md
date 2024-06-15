# Postgres

The fastest PostgreSQL client and query builder for node.
Uses a familiar tagged template literal based interface.
Supports commonly used PG types and dynamic (parametrized) queries.

```ts
...
const users = await connection.query(compile(sql`
  SELECT *
  FROM users
  WHERE id = ${userId}
`));
...
```

## Examples

### Prerequisites

Start PostgreSQL in a docker container:

```sh
docker run --rm -d -v ./packages/postgres/pg:/pg:ro -p 5432:5432 -e POSTGRES_PASSWORD="qwerty" -e LANG="en_US.utf8" -e LC_ALL="en_US.utf8" -u postgres postgres:18.1-alpine -c 'config_file=/pg/config/postgresql.conf'
```

### Query

```ts
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

// Run an example query
const result1 = await connection.query(compile(sql`SELECT 1 as num`));
console.log('Result1:', result1); // => Result1: [ { num: 1 } ]

// Terminate the connection
await connection.close();
```

More examples in: [./src/play.ts](https://github.com/valeneiko/postgres/blob/main/packages/postgres/src/play.ts). Which you can run with:

```sh
pnpm dev ./src/play.ts
# or with SSL
NODE_EXTRA_CA_CERTS="./pg/certs/ca.crt" pnpm dev ./src/play.ts withSSL
```
