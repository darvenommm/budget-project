# Build stage
FROM oven/bun:1 AS builder
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
COPY --from=builder /app/notifications/node_modules ./notifications_node_modules
COPY --from=builder /app/notifications/prisma ./prisma
RUN bunx prisma generate --schema=./prisma/schema.prisma
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1
CMD ["bun", "dist/main.js"]
