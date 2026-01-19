import type { ZodSchema } from 'zod';
import type { FastifyRequest, FastifyReply } from 'fastify';

export function validateBody<T>(
  schema: ZodSchema<T>,
): (request: FastifyRequest, reply: FastifyReply) => void {
  return (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      void reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten(),
      });
      return;
    }
    (request as FastifyRequest & { validatedBody: T }).validatedBody = result.data;
  };
}

export function validateParams<T>(
  schema: ZodSchema<T>,
): (request: FastifyRequest, reply: FastifyReply) => void {
  return (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      void reply.status(400).send({
        error: 'Invalid parameters',
        code: 'INVALID_PARAMS',
        details: result.error.flatten(),
      });
      return;
    }
    (request as FastifyRequest & { validatedParams: T }).validatedParams = result.data;
  };
}

export function validateQuery<T>(
  schema: ZodSchema<T>,
): (request: FastifyRequest, reply: FastifyReply) => void {
  return (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      void reply.status(400).send({
        error: 'Invalid query parameters',
        code: 'INVALID_QUERY',
        details: result.error.flatten(),
      });
      return;
    }
    (request as FastifyRequest & { validatedQuery: T }).validatedQuery = result.data;
  };
}
