# Integration Tests Bug: Bun + Fastify Compatibility Issue

**Date:** 2026-01-19
**Status:** Partially Resolved
**Resolution Date:** 2026-01-19
**Affects:** api/tests/integration/

## Summary

Integration tests hang indefinitely when running with Bun due to a compatibility issue between Bun's HTTP handling and Fastify's `inject()` method (via `light-my-request` library).

## Resolution

Integration tests have been migrated to Node.js + Jest runtime:

- **Unit tests:** `bun run test:unit` (Bun runtime, 75 tests)
- **Integration tests:** `npm run test:integration` (Node.js + Jest)

Testcontainers work correctly with Node.js. The Bun + Fastify `inject()` incompatibility is bypassed by using Node.js for integration tests.

## Architecture

### Test Configuration Files

| File | Purpose |
|------|---------|
| `jest.config.js` | Unit tests config (Bun-compatible) |
| `jest.integration.config.js` | Integration tests config (Node.js/Jest) |
| `tests/setup.ts` | Unit test setup (mock environment) |
| `tests/setup.env.ts` | Integration test env vars (reads from globalSetup config) |
| `tests/setup.integration.ts` | Integration test DB/RabbitMQ connections |
| `tests/globalSetup.ts` | Starts Testcontainers before all tests |
| `tests/globalTeardown.ts` | Stops containers after all tests |

### Test Flow

1. `globalSetup.ts` starts Postgres and RabbitMQ containers via Testcontainers
2. Writes container URLs to `.integration-test-config.json`
3. `setup.env.ts` reads config and sets environment variables
4. `setup.integration.ts` connects to database and RabbitMQ
5. Tests run with proper connections
6. `setup.integration.ts` afterAll disconnects
7. `globalTeardown.ts` stops and removes containers

## Known Issues

### buildApp() Hang Issue

When using the full `buildApp()` from `src/app.ts`, both `inject()` and `supertest` with `listen()` hang indefinitely. The root cause is not yet identified but is likely related to one of:

- Swagger plugin registration
- Middleware hooks (correlationId, requestCounter)
- Route registration order

**Workaround:** Integration tests use minimal Fastify apps that import specific components (prisma, rabbitmq) rather than the full `buildApp()`.

### Container Cleanup

If tests are interrupted, containers may not be cleaned up. Use:

```bash
docker ps -q --filter "ancestor=postgres:17-alpine" | xargs -r docker stop
docker ps -q --filter "ancestor=rabbitmq:4-alpine" | xargs -r docker stop
```

## Environment

- **Bun:** 1.3.5 (for unit tests)
- **Node.js:** 24.x (for integration tests)
- **Fastify:** 4.25.2
- **Jest:** 29.x with ts-jest
- **Testcontainers:** 10.18.0
- **OS:** Ubuntu 24.04.3 LTS

## Original Symptoms (Bun)

1. `app.inject()` never resolves
2. `supertest(app.server).get('/path')` hangs indefinitely
3. Error when response completes: `Cannot writeHead headers after they are sent to the client`

## Files Modified for Migration

- `api/jest.integration.config.js` - New config for integration tests
- `api/tests/globalSetup.ts` - Container startup
- `api/tests/globalTeardown.ts` - Container cleanup
- `api/tests/setup.env.ts` - Environment variable setup
- `api/tests/setup.integration.ts` - Database/RabbitMQ connection
- `api/tests/integration/health.spec.ts` - Updated to use minimal Fastify app
- `api/package.json` - Added test:integration script
- `api/src/shared/database/index.ts` - Exported pool for cleanup

## Running Tests

```bash
# Unit tests (fast, uses Bun)
bun run test:unit

# Integration tests (uses Node.js + Testcontainers)
npm run test:integration

# All tests
bun run test
```
