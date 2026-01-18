// Set test environment variables for unit tests
// These are mocked in tests, actual values don't matter
process.env.NODE_ENV = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-min-32-characters-long';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-min-32-characters-long';
process.env['RABBITMQ_URL'] = 'amqp://test:test@localhost:5672';
