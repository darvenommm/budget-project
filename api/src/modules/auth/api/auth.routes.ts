import type { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.ts';
import { AuthService } from '../application/auth.service.ts';
import { PrismaUserRepository } from '../infrastructure/user.repository.prisma.ts';
import { PrismaTokenRepository } from '../infrastructure/token.repository.prisma.ts';
import { authMiddleware } from '../../../shared/middleware/auth.ts';

export function authRoutes(app: FastifyInstance): void {
  const userRepository = new PrismaUserRepository();
  const tokenRepository = new PrismaTokenRepository();
  const authService = new AuthService(userRepository, tokenRepository);
  const controller = new AuthController(authService);

  app.post('/api/auth/register', controller.register.bind(controller));
  app.post('/api/auth/login', controller.login.bind(controller));
  app.post('/api/auth/refresh', controller.refresh.bind(controller));
  app.post('/api/auth/logout', controller.logout.bind(controller));
  app.get('/api/auth/me', { preHandler: authMiddleware as never }, controller.me.bind(controller));
}
