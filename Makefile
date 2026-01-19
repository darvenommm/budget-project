.PHONY: dev prod stop test lint logs backup

# Development
dev:
	./scripts/dev.sh

dev-infra:
	docker compose up -d postgres-api postgres-notifications rabbitmq

# Production
prod:
	./scripts/start-prod.sh

stop:
	./scripts/stop.sh

stop-prod:
	./scripts/stop.sh prod

# Testing
test:
	npm run api:test && npm run notifications:test

test-cov:
	cd api && bun test tests/unit --coverage

# Code quality
lint:
	npm run check-all

format:
	npm run format

# Logs
logs:
	./scripts/logs.sh

logs-api:
	./scripts/logs.sh api

logs-notifications:
	./scripts/logs.sh notifications

# Backup
backup:
	./scripts/db-backup.sh
