import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildApp } from '../../src/app.js';

interface AuthResponse {
  accessToken: string;
}

interface GoalResponse {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

describe('Goals', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });

    // Register a test user
    const register = await supertest(app.server)
      .post('/api/auth/register')
      .send({ email: `goals-${String(Date.now())}@test.com`, password: 'password123' });

    accessToken = (register.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should create a goal', async () => {
    const response = await supertest(app.server)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Vacation Fund',
        targetAmount: 5000,
        currentAmount: 0,
        deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    const body = response.body as GoalResponse;
    expect(body.name).toBe('Vacation Fund');
    expect(body.targetAmount).toBe(5000);
  });

  it('should get all goals', async () => {
    const response = await supertest(app.server)
      .get('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get goal by id', async () => {
    // Create a goal first
    const created = await supertest(app.server)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 1000,
      });

    const createdBody = created.body as GoalResponse;
    const response = await supertest(app.server)
      .get(`/api/goals/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const body = response.body as GoalResponse;
    expect(body.id).toBe(createdBody.id);
    expect(body.name).toBe('Emergency Fund');
  });

  it('should update a goal', async () => {
    // Create a goal first
    const created = await supertest(app.server)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'New Car',
        targetAmount: 20000,
        currentAmount: 5000,
      });

    const createdBody = created.body as GoalResponse;
    const response = await supertest(app.server)
      .put(`/api/goals/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New Car Fund', targetAmount: 25000 });

    expect(response.status).toBe(200);
    const body = response.body as GoalResponse;
    expect(body.name).toBe('New Car Fund');
    expect(body.targetAmount).toBe(25000);
  });

  it('should deposit to a goal', async () => {
    // Create a goal first
    const created = await supertest(app.server)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Home Down Payment',
        targetAmount: 50000,
        currentAmount: 10000,
      });

    const createdBody = created.body as GoalResponse;
    const response = await supertest(app.server)
      .post(`/api/goals/${createdBody.id}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 2500 });

    expect(response.status).toBe(200);
    const body = response.body as GoalResponse;
    expect(body.currentAmount).toBe(12500);
  });

  it('should delete a goal', async () => {
    // Create a goal first
    const created = await supertest(app.server)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Temporary Goal',
        targetAmount: 100,
        currentAmount: 0,
      });

    const createdBody = created.body as GoalResponse;
    const deleteResponse = await supertest(app.server)
      .delete(`/api/goals/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(204);

    // Verify deletion
    const getResponse = await supertest(app.server)
      .get(`/api/goals/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(404);
  });

  it('should return 400 for zero target amount', async () => {
    const response = await supertest(app.server)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Invalid Goal',
        targetAmount: 0,
        currentAmount: 0,
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 for negative deposit', async () => {
    // Create a goal first
    const created = await supertest(app.server)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Negative Deposit',
        targetAmount: 1000,
        currentAmount: 100,
      });

    const createdBody = created.body as GoalResponse;
    const response = await supertest(app.server)
      .post(`/api/goals/${createdBody.id}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: -50 });

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent goal', async () => {
    const response = await supertest(app.server)
      .get('/api/goals/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
