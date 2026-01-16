import { loadEnv } from './env.js';

export const config = loadEnv();

export const jwtConfig = {
  accessSecret: config.JWT_ACCESS_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiresIn: config.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
};

export const serverConfig = {
  port: config.PORT,
  nodeEnv: config.NODE_ENV,
};

export const databaseConfig = {
  url: config.DATABASE_URL,
};

export const rabbitmqConfig = {
  url: config.RABBITMQ_URL,
};
