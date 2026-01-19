/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testTimeout: 120000,
  extensionsToTreatAsEsm: ['.ts'],
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  setupFiles: ['<rootDir>/tests/setup.env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
  testMatch: ['**/tests/integration/**/*.spec.ts'],
  maxWorkers: 1, // Run sequentially to avoid container conflicts
};
