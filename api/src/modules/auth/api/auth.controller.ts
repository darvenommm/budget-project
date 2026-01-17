import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../application/auth.service.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.dto.js';
import { logger } from '../../../shared/logger/index.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const tokens = await this.authService.register(result.data);
      reply.status(201).send(tokens);
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already registered') {
        reply.status(409).send({ error: error.message });
        return;
      }
      logger.error('Registration failed', { error });
      reply.status(500).send({ error: 'Registration failed' });
    }
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const tokens = await this.authService.login(result.data);
      reply.send(tokens);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        reply.status(401).send({ error: error.message });
        return;
      }
      logger.error('Login failed', { error });
      reply.status(500).send({ error: 'Login failed' });
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = refreshSchema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const tokens = await this.authService.refresh(result.data.refreshToken);
      reply.send(tokens);
    } catch (error) {
      reply.status(401).send({ error: 'Invalid refresh token' });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = refreshSchema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    await this.authService.logout(result.data.refreshToken);
    reply.status(204).send();
  }

  async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = (request as FastifyRequest & { user?: { id: string; email: string } }).user;
    if (!user) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    reply.send({ id: user.id, email: user.email });
  }
}
