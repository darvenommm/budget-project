import type { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.ts';
import { AuthService } from '../application/auth.service.ts';
import { PrismaUserRepository } from '../infrastructure/user.repository.prisma.ts';
import { PrismaTokenRepository } from '../infrastructure/token.repository.prisma.ts';
import { CategoryService } from '../../categories/application/category.service.ts';
import { PrismaCategoryRepository } from '../../categories/infrastructure/category.repository.prisma.ts';
import { authMiddleware } from '../../../shared/middleware/auth.ts';

export function authRoutes(app: FastifyInstance): void {
  const userRepository = new PrismaUserRepository();
  const tokenRepository = new PrismaTokenRepository();
  const categoryRepository = new PrismaCategoryRepository();
  const categoryService = new CategoryService(categoryRepository);
  const authService = new AuthService(userRepository, tokenRepository, categoryService);
  const controller = new AuthController(authService);

  app.post('/api/auth/register', controller.register.bind(controller));
  app.post('/api/auth/login', controller.login.bind(controller));
  app.post('/api/auth/refresh', controller.refresh.bind(controller));
  app.post('/api/auth/logout', controller.logout.bind(controller));
  app.get('/api/auth/me', { preHandler: authMiddleware }, controller.me.bind(controller));
}
