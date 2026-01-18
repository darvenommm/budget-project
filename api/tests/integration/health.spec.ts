import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildApp } from '../../src/app.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should return 200 with status ok', async () => {
    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });

  it('should include correlation-id header in response', async () => {
    const response = await supertest(app.server)
      .get('/health')
      .set('x-correlation-id', 'test-correlation-id');

    expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
  });
});
