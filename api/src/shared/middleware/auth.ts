import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../../modules/auth/application/jwt.service.ts';
import { prisma } from '../database/index.ts';
import { UnauthorizedError } from '../errors/index.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Safely extracts the authenticated user from the request.
 * Throws UnauthorizedError if user is not present.
 * Use this in route handlers protected by authMiddleware.
 */
export function getAuthenticatedUser(request: FastifyRequest): AuthenticatedUser {
  const user = request.user;
  if (!user) {
    throw new UnauthorizedError('UNAUTHORIZED', 'User not authenticated');
  }
  return user;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
    };
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }

    request.user = user;
  } catch {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}
