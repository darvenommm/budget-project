// Read container config from global setup and set environment variables
// This runs BEFORE any test modules are loaded
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.join(process.cwd(), '.integration-test-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
  DATABASE_URL: string;
  RABBITMQ_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
};

process.env.NODE_ENV = 'test';
process.env['DATABASE_URL'] = config.DATABASE_URL;
process.env['RABBITMQ_URL'] = config.RABBITMQ_URL;
process.env['JWT_ACCESS_SECRET'] = config.JWT_ACCESS_SECRET;
process.env['JWT_REFRESH_SECRET'] = config.JWT_REFRESH_SECRET;
