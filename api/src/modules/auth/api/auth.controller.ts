import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from '../application/auth.service.ts';
import { registerSchema, loginSchema, refreshSchema } from './auth.dto.ts';
import { ValidationError, UnauthorizedError } from '../../../shared/errors/index.ts';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    const tokens = await this.authService.register(result.data);
    return reply.status(201).send(tokens);
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    const tokens = await this.authService.login(result.data);
    return reply.send(tokens);
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = refreshSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    const tokens = await this.authService.refresh(result.data.refreshToken);
    return reply.send(tokens);
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = refreshSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    await this.authService.logout(result.data.refreshToken);
    return reply.status(204).send();
  }

  me(request: FastifyRequest, reply: FastifyReply): void {
    const user = (request as FastifyRequest & { user?: { id: string; email: string } }).user;
    if (!user) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Unauthorized');
    }
    void reply.send({ id: user.id, email: user.email });
  }
}
