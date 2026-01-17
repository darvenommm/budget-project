import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../../modules/auth/application/jwt.service.js';
import { prisma } from '../database/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
    };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      reply.status(401).send({ error: 'User not found' });
      return;
    }

    request.user = user;
  } catch {
    reply.status(401).send({ error: 'Invalid token' });
  }
}
