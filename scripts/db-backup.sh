#!/bin/bash
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "Creating database backup..."

# Backup API DB
docker exec budget-postgres-api-prod pg_dump -U "$DB_USER" budget_api > "$BACKUP_DIR/api_$TIMESTAMP.sql"
echo "API backup: $BACKUP_DIR/api_$TIMESTAMP.sql"

# Backup Notifications DB
docker exec budget-postgres-notifications-prod pg_dump -U "$DB_USER" budget_notifications > "$BACKUP_DIR/notifications_$TIMESTAMP.sql"
echo "Notifications backup: $BACKUP_DIR/notifications_$TIMESTAMP.sql"

echo "Backup completed"
