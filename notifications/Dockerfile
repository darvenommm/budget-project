# Build stage
FROM oven/bun:1-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Copy root workspace files
COPY package.json bun.lock ./
COPY api/package.json ./api/
COPY notifications/package.json ./notifications/
COPY notifications/prisma ./notifications/prisma/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY notifications ./notifications/
COPY tsconfig.base.json ./

# Build and generate prisma client
WORKDIR /app/notifications
RUN bun run build
RUN bunx prisma generate

# Production stage
FROM oven/bun:1-alpine
RUN apk add --no-cache openssl
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
WORKDIR /app
COPY --from=builder /app/notifications/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/notifications/prisma ./prisma
RUN bunx prisma generate --schema=./prisma/schema.prisma
COPY notifications/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
