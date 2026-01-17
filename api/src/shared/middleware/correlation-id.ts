import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { runWithCorrelationId } from '../logger/index.js';

const CORRELATION_ID_HEADER = 'x-correlation-id';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string;
  }
}

export function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  const correlationId = (request.headers[CORRELATION_ID_HEADER] as string) ?? uuidv4();

  request.correlationId = correlationId;
  reply.header(CORRELATION_ID_HEADER, correlationId);

  runWithCorrelationId(correlationId, () => {
    done();
  });
}
