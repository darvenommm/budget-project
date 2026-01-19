import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(import.meta.dirname, 'schema.prisma'),
  migrations: {
    path: path.join(import.meta.dirname, 'migrations'),
  },
  datasource: {
    url: buildUrl(),
  },
});

function buildUrl(): string {
  // Use DATABASE_URL if explicitly set (e.g., for Docker/production)
  if (process.env['DATABASE_URL']) {
    return process.env['DATABASE_URL'];
  }

  // Build URL from individual components for development
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5433';
  const user = process.env.DB_USER ?? 'budget';
  const password = process.env.DB_PASSWORD ?? 'budget';
  const database = 'budget_notifications';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
