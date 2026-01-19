#!/bin/sh
set -e

echo "Waiting for database..."
sleep 2

echo "Running database migrations..."
bunx prisma migrate deploy --config ./prisma/prisma.config.ts

echo "Starting application..."
exec bun run dist/main.js
