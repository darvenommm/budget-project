import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadEnv();

export const rabbitmqConfig = {
  url: config.RABBITMQ_URL,
};

export const telegramConfig = {
  botToken: config.TELEGRAM_BOT_TOKEN,
};

export const serverConfig = {
  port: config.PORT,
  nodeEnv: config.NODE_ENV,
};

export const jwtConfig = {
  accessSecret: config.JWT_ACCESS_SECRET,
};
