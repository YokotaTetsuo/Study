import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/adapters/gateways/schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5432'),
    user: process.env.DB_USER ?? 'pdfreview',
    password: process.env.DB_PASSWORD ?? 'pdfreview',
    database: process.env.DB_NAME ?? 'pdfreview',
    ssl: false,
  },
});
