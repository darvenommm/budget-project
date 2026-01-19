import { mock } from 'bun:test';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';

interface MockRequestOptions<TBody = unknown, TParams = unknown, TQuery = unknown> {
  body?: TBody;
  params?: TParams;
  query?: TQuery;
  user?: { id: string; email?: string };
}

export function createMockRequest<
  TRoute extends RouteGenericInterface = RouteGenericInterface,
  TBody = unknown,
  TParams = unknown,
  TQuery = unknown,
>(options: MockRequestOptions<TBody, TParams, TQuery> = {}): FastifyRequest<TRoute> {
  return {
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
    user: options.user,
  } as FastifyRequest<TRoute>;
}

interface MockReplyMethods {
  status: ReturnType<typeof mock>;
  send: ReturnType<typeof mock>;
}

export function createMockReply(): FastifyReply & MockReplyMethods {
  const noop = (): void => {
    // intentionally empty
  };

  const reply = {
    status: mock(function (this: MockReplyMethods) {
      return this;
    }),
    send: mock(noop),
  };

  return reply as FastifyReply & MockReplyMethods;
}

export async function expectToReject(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject but it resolved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected promise to reject but it resolved') {
      throw error;
    }
  }
}
