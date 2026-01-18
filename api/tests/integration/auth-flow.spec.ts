import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildApp } from '../../src/app.js';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

describe('Auth Flow', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should complete full auth flow: register -> login -> refresh', async () => {
    const email = `test-${String(Date.now())}@test.com`;
    const password = 'password123';

    // Register
    const register = await supertest(app.server)
      .post('/api/auth/register')
      .send({ email, password });

    expect(register.status).toBe(201);
    expect(register.body).toHaveProperty('accessToken');
    expect(register.body).toHaveProperty('refreshToken');

    // Login
    const login = await supertest(app.server).post('/api/auth/login').send({ email, password });

    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('accessToken');
    expect(login.body).toHaveProperty('refreshToken');

    // Use token to access protected resource
    const { accessToken, refreshToken } = login.body as AuthResponse;
    const categories = await supertest(app.server)
      .get('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(categories.status).toBe(200);

    // Refresh token
    const refresh = await supertest(app.server).post('/api/auth/refresh').send({ refreshToken });

    expect(refresh.status).toBe(200);
    expect(refresh.body).toHaveProperty('accessToken');
    expect(refresh.body).toHaveProperty('refreshToken');
  });

  it('should return 401 without token', async () => {
    const response = await supertest(app.server).get('/api/transactions');

    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid email format', async () => {
    const response = await supertest(app.server)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: 'password123' });

    expect(response.status).toBe(400);
  });

  it('should return 400 for short password', async () => {
    const response = await supertest(app.server)
      .post('/api/auth/register')
      .send({ email: 'valid@email.com', password: '123' });

    expect(response.status).toBe(400);
  });

  it('should return 409 for duplicate email', async () => {
    const email = `duplicate-${String(Date.now())}@test.com`;
    const password = 'password123';

    // First registration should succeed
    await supertest(app.server).post('/api/auth/register').send({ email, password });

    // Second registration with same email should fail
    const response = await supertest(app.server)
      .post('/api/auth/register')
      .send({ email, password });

    expect(response.status).toBe(409);
  });

  it('should return 401 for wrong password', async () => {
    const email = `wrongpass-${String(Date.now())}@test.com`;
    const password = 'password123';

    // Register
    await supertest(app.server).post('/api/auth/register').send({ email, password });

    // Login with wrong password
    const response = await supertest(app.server)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' });

    expect(response.status).toBe(401);
  });
});
