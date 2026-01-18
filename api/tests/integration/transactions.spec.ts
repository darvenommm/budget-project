import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildApp } from '../../src/app.js';

interface AuthResponse {
  accessToken: string;
}

interface EntityResponse {
  id: string;
}

interface TransactionResponse extends EntityResponse {
  amount: number;
  type: string;
  description?: string;
}

describe('Transactions', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let categoryId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });

    // Register a test user
    const register = await supertest(app.server)
      .post('/api/auth/register')
      .send({ email: `transactions-${String(Date.now())}@test.com`, password: 'password123' });

    accessToken = (register.body as AuthResponse).accessToken;

    // Create a category for transactions
    const category = await supertest(app.server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Category', type: 'EXPENSE' });

    categoryId = (category.body as EntityResponse).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should create a transaction', async () => {
    const response = await supertest(app.server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 100.5,
        type: 'EXPENSE',
        categoryId,
        description: 'Test transaction',
        date: new Date().toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    const body = response.body as TransactionResponse;
    expect(body.amount).toBe(100.5);
    expect(body.type).toBe('EXPENSE');
  });

  it('should get all transactions', async () => {
    const response = await supertest(app.server)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get transaction by id', async () => {
    // Create a transaction first
    const created = await supertest(app.server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 50,
        type: 'EXPENSE',
        categoryId,
        date: new Date().toISOString(),
      });

    const createdBody = created.body as EntityResponse;
    const response = await supertest(app.server)
      .get(`/api/transactions/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const body = response.body as EntityResponse;
    expect(body.id).toBe(createdBody.id);
  });

  it('should update a transaction', async () => {
    // Create a transaction first
    const created = await supertest(app.server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 75,
        type: 'EXPENSE',
        categoryId,
        date: new Date().toISOString(),
      });

    const createdBody = created.body as EntityResponse;
    const response = await supertest(app.server)
      .put(`/api/transactions/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 80, description: 'Updated description' });

    expect(response.status).toBe(200);
    const body = response.body as TransactionResponse;
    expect(body.amount).toBe(80);
    expect(body.description).toBe('Updated description');
  });

  it('should delete a transaction', async () => {
    // Create a transaction first
    const created = await supertest(app.server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 25,
        type: 'EXPENSE',
        categoryId,
        date: new Date().toISOString(),
      });

    const createdBody = created.body as EntityResponse;
    const deleteResponse = await supertest(app.server)
      .delete(`/api/transactions/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(204);

    // Verify deletion
    const getResponse = await supertest(app.server)
      .get(`/api/transactions/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(404);
  });

  it('should return 400 for negative amount', async () => {
    const response = await supertest(app.server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: -100,
        type: 'EXPENSE',
        categoryId,
        date: new Date().toISOString(),
      });

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent transaction', async () => {
    const response = await supertest(app.server)
      .get('/api/transactions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
