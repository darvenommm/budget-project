import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildApp } from '../../src/app.ts';

interface AuthResponse {
  accessToken: string;
}

interface EntityResponse {
  id: string;
}

interface BudgetResponse extends EntityResponse {
  amount: number;
  period: string;
}

describe('Budgets', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let categoryId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });

    // Register a test user
    const register = await supertest(app.server)
      .post('/api/auth/register')
      .send({ email: `budgets-${String(Date.now())}@test.com`, password: 'password123' });

    accessToken = (register.body as AuthResponse).accessToken;

    // Create a category for budgets
    const category = await supertest(app.server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Budget Test Category', type: 'EXPENSE' });

    categoryId = (category.body as EntityResponse).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should create a budget', async () => {
    const response = await supertest(app.server)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId,
        amount: 1000,
        period: 'MONTHLY',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    const body = response.body as BudgetResponse;
    expect(body.amount).toBe(1000);
    expect(body.period).toBe('MONTHLY');
  });

  it('should get all budgets', async () => {
    const response = await supertest(app.server)
      .get('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get budget by id', async () => {
    // Create a new category and budget first
    const category = await supertest(app.server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Category ${String(Date.now())}`, type: 'EXPENSE' });

    const categoryBody = category.body as EntityResponse;
    const created = await supertest(app.server)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId: categoryBody.id,
        amount: 500,
        period: 'WEEKLY',
      });

    const createdBody = created.body as EntityResponse;
    const response = await supertest(app.server)
      .get(`/api/budgets/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const body = response.body as EntityResponse;
    expect(body.id).toBe(createdBody.id);
  });

  it('should update a budget', async () => {
    // Create a new category and budget first
    const category = await supertest(app.server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Category Update ${String(Date.now())}`, type: 'EXPENSE' });

    const categoryBody = category.body as EntityResponse;
    const created = await supertest(app.server)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId: categoryBody.id,
        amount: 750,
        period: 'MONTHLY',
      });

    const createdBody = created.body as EntityResponse;
    const response = await supertest(app.server)
      .put(`/api/budgets/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 900 });

    expect(response.status).toBe(200);
    const body = response.body as BudgetResponse;
    expect(body.amount).toBe(900);
  });

  it('should delete a budget', async () => {
    // Create a new category and budget first
    const category = await supertest(app.server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Category Delete ${String(Date.now())}`, type: 'EXPENSE' });

    const categoryBody = category.body as EntityResponse;
    const created = await supertest(app.server)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId: categoryBody.id,
        amount: 300,
        period: 'WEEKLY',
      });

    const createdBody = created.body as EntityResponse;
    const deleteResponse = await supertest(app.server)
      .delete(`/api/budgets/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(204);

    // Verify deletion
    const getResponse = await supertest(app.server)
      .get(`/api/budgets/${createdBody.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(404);
  });

  it('should return 400 for zero amount', async () => {
    const category = await supertest(app.server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Category Zero ${String(Date.now())}`, type: 'EXPENSE' });

    const categoryBody = category.body as EntityResponse;
    const response = await supertest(app.server)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId: categoryBody.id,
        amount: 0,
        period: 'MONTHLY',
      });

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent budget', async () => {
    const response = await supertest(app.server)
      .get('/api/budgets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
