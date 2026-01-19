#!/bin/bash

echo "Stopping containers..."

if [ "$1" == "prod" ]; then
    docker compose -f docker-compose.prod.yml down
else
    docker compose down
fi

echo "Containers stopped"
