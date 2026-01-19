#!/bin/bash

SERVICE=${1:-""}

if [ "$SERVICE" == "" ]; then
    echo "Viewing logs for all services..."
    docker compose logs -f
else
    echo "Viewing logs for service: $SERVICE"
    docker compose logs -f "$SERVICE"
fi
