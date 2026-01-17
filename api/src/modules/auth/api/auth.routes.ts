import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { AuthService } from '../application/auth.service.js';
import { PrismaUserRepository } from '../infrastructure/user.repository.prisma.js';
import { PrismaTokenRepository } from '../infrastructure/token.repository.prisma.js';
import { authMiddleware } from '../../../shared/middleware/auth.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const userRepository = new PrismaUserRepository();
  const tokenRepository = new PrismaTokenRepository();
  const authService = new AuthService(userRepository, tokenRepository);
  const controller = new AuthController(authService);

  app.post('/api/auth/register', controller.register.bind(controller));
  app.post('/api/auth/login', controller.login.bind(controller));
  app.post('/api/auth/refresh', controller.refresh.bind(controller));
  app.post('/api/auth/logout', controller.logout.bind(controller));
  app.get('/api/auth/me', { preHandler: authMiddleware }, controller.me.bind(controller));
}
