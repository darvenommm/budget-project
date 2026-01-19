import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { runWithCorrelationId } from '../logger/index.ts';

const CORRELATION_ID_HEADER = 'x-correlation-id';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string;
  }
}

export function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  const headerValue = request.headers[CORRELATION_ID_HEADER];
  const correlationId = typeof headerValue === 'string' ? headerValue : uuidv4();

  request.correlationId = correlationId;
  void reply.header(CORRELATION_ID_HEADER, correlationId);

  runWithCorrelationId(correlationId, () => {
    done();
  });
}
