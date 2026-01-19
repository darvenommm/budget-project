#!/bin/bash
set -e

echo "Starting development environment..."

# 1. Start infrastructure
echo "Starting PostgreSQL and RabbitMQ..."
docker compose up -d postgres-api postgres-notifications rabbitmq

# 2. Wait for DB readiness
echo "Waiting for databases to be ready..."
sleep 5

# 3. Run migrations
echo "Applying migrations..."
cd api && bunx prisma migrate dev && cd ..
cd notifications && bunx prisma migrate dev && cd ..

# 4. Generate Prisma clients
echo "Generating Prisma clients..."
cd api && bunx prisma generate && cd ..
cd notifications && bunx prisma generate && cd ..

# 5. Start services in watch mode
echo "Starting services..."
echo "API: http://localhost:3000"
echo "Notifications: http://localhost:3001"
echo ""

# Start services in parallel
npm run api:dev & npm run notifications:dev &
wait
