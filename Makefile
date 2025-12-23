.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: up
up: ## Start infrastructure services
	docker-compose up -d

.PHONY: down
down: ## Stop infrastructure services
	docker-compose down

.PHONY: migrate-up
migrate-up: ## Run database migrations
	goose -dir migrations postgres "host=localhost port=5432 user=user password=password dbname=auction_db sslmode=disable" up

.PHONY: migrate-down
migrate-down: ## Rollback last database migration
	goose -dir migrations postgres "host=localhost port=5432 user=user password=password dbname=auction_db sslmode=disable" down

.PHONY: migrate-status
migrate-status: ## Check migration status
	goose -dir migrations postgres "host=localhost port=5432 user=user password=password dbname=auction_db sslmode=disable" status

.PHONY: migrate-create
migrate-create: ## Create a new migration file (usage: make migrate-create NAME=add_users_table)
	goose -dir migrations create $(NAME) sql

.PHONY: run
run: ## Run the API server
	go run cmd/api/main.go

.PHONY: test
test: ## Run tests
	go test -v ./...

.PHONY: tidy
tidy: ## Tidy go modules
	go mod tidy

