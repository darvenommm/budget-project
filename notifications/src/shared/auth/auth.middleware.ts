import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from './jwt.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
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
    request.user = { id: payload.userId };
  } catch {
    reply.status(401).send({ error: 'Invalid token' });
  }
}
