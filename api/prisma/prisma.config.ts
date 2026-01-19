import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(import.meta.dirname, 'schema.prisma'),
  migrations: {
    path: path.join(import.meta.dirname, 'migrations'),
  },
  datasource: {
    url: getUrl(),
  },
});

function getUrl(): string {
  // Use DATABASE_URL if explicitly set (e.g., for tests)
  if (process.env['DATABASE_URL']) {
    return process.env['DATABASE_URL'];
  }

  // Build URL from individual components
  const host = process.env['DB_HOST'] ?? 'localhost';
  const port = process.env['DB_PORT'] ?? '5432';
  const user = process.env['DB_USER'] ?? 'budget';
  const password = process.env['DB_PASSWORD'] ?? 'budget';
  const database = process.env['DB_NAME'] ?? 'budget_api';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
