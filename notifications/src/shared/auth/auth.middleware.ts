import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from './jwt.service.ts';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
    };
  }
}

export function authMiddleware(request: FastifyRequest, reply: FastifyReply): void {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    void reply.status(401).send({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    request.user = { id: payload.userId };
  } catch {
    void reply.status(401).send({ error: 'Invalid token' });
  }
}
