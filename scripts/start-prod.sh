#!/bin/bash
set -e

echo "Starting production environment..."

# Check .env file
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Copy .env.example to .env and fill in the variables"
    exit 1
fi

# Check required variables
source .env
required_vars=("DB_USER" "DB_PASSWORD" "JWT_ACCESS_SECRET" "JWT_REFRESH_SECRET" "TELEGRAM_BOT_TOKEN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: variable $var is not set"
        exit 1
    fi
done

# Build and start
echo "Building images..."
docker compose -f docker-compose.prod.yml build

echo "Starting containers..."
docker compose -f docker-compose.prod.yml up -d

echo "Production environment started"
echo "API available at http://localhost:80"
