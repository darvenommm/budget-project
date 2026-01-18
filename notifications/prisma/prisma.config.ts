import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'schema.prisma'),

  migrate: {
    async url() {
      return buildUrl();
    },
  },

  studio: {
    async url() {
      return buildUrl();
    },
  },
});

function buildUrl(): string {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const user = process.env.DB_USER ?? 'budget';
  const password = process.env.DB_PASSWORD ?? 'budget';
  const database = 'budget_notifications';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
