import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';

interface Metrics {
  totalRequests: number;
  requests2xx: number;
  requests4xx: number;
  requests5xx: number;
}

const metrics: Metrics = {
  totalRequests: 0,
  requests2xx: 0,
  requests4xx: 0,
  requests5xx: 0,
};

export function requestCounterOnRequest(
  _request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  metrics.totalRequests++;
  done();
}

export function requestCounterOnResponse(
  _request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  const statusCode = reply.statusCode;

  if (statusCode >= 200 && statusCode < 300) {
    metrics.requests2xx++;
  } else if (statusCode >= 400 && statusCode < 500) {
    metrics.requests4xx++;
  } else if (statusCode >= 500) {
    metrics.requests5xx++;
  }
  done();
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function formatMetrics(): string {
  return [
    `http_requests_total ${String(metrics.totalRequests)}`,
    `http_requests_2xx_total ${String(metrics.requests2xx)}`,
    `http_requests_4xx_total ${String(metrics.requests4xx)}`,
    `http_requests_5xx_total ${String(metrics.requests5xx)}`,
  ].join('\n');
}
