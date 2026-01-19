interface HistogramBucket {
  le: number;
  count: number;
}

interface Histogram {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

const histograms = new Map<string, Histogram>();

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function getOrCreateHistogram(name: string): Histogram {
  const existing = histograms.get(name);
  if (existing) {
    return existing;
  }
  const newHistogram: Histogram = {
    buckets: DEFAULT_BUCKETS.map((le) => ({ le, count: 0 })),
    sum: 0,
    count: 0,
  };
  histograms.set(name, newHistogram);
  return newHistogram;
}

function recordDuration(name: string, durationSeconds: number): void {
  const histogram = getOrCreateHistogram(name);
  histogram.sum += durationSeconds;
  histogram.count++;

  for (const bucket of histogram.buckets) {
    if (durationSeconds <= bucket.le) {
      bucket.count++;
    }
  }
}

type AsyncMethod = (...args: unknown[]) => Promise<unknown>;

export function LatencyHistogram(name: string): MethodDecorator {
  return function (
    _target: unknown,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as AsyncMethod;

    descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      const start = performance.now();
      try {
        return await originalMethod.apply(this, args);
      } finally {
        const durationMs = performance.now() - start;
        recordDuration(name, durationMs / 1000);
      }
    };

    return descriptor;
  };
}

export function formatHistogramMetrics(): string {
  const lines: string[] = [];

  for (const [name, histogram] of histograms) {
    for (const bucket of histogram.buckets) {
      lines.push(
        `${name}_duration_seconds_bucket{le="${String(bucket.le)}"} ${String(bucket.count)}`,
      );
    }
    lines.push(`${name}_duration_seconds_bucket{le="+Inf"} ${String(histogram.count)}`);
    lines.push(`${name}_duration_seconds_sum ${String(histogram.sum)}`);
    lines.push(`${name}_duration_seconds_count ${String(histogram.count)}`);
  }

  return lines.join('\n');
}
