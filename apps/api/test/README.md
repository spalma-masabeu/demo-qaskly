# API request tests

Request tests compile with `tsc -p tsconfig.test.json` and run with Node's built-in test runner.

Required environment:

- `DATABASE_URL` must point to a local test or disposable development PostgreSQL database with migrations applied.
- Tests normalize `localhost` to `127.0.0.1` for PrismaClient TCP access.
- Tests truncate durable tables before each case.
- `AUTH_TEST_BYPASS=true` is set only inside the test bootstrap; tests send `x-test-presenter` and never call Auth0.

Run:

```bash
pnpm --filter @qaskly/api test
```
