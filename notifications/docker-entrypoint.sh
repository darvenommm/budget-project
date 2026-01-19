#!/bin/sh
set -e

echo "Waiting for database..."
sleep 2

echo "Running database migrations..."
bunx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting application..."
exec bun run dist/main.js
