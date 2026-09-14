.DEFAULT_GOAL := help
.PHONY: help setup dev api taskmania test test-api test-taskmania lint fmt check build up down clean

help: ## Show the available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

setup: ## Install frontend dependencies and resolve Go modules
	cd taskmania && npm install
	cd api && go mod download

dev: ## Reminder of the two processes to run
	@echo "Run these in two terminals:"
	@echo "  make api   # Go server on :8080"
	@echo "  make taskmania   # Vite dev server on :5173"

api: ## Start the Go API
	cd api && go run ./cmd/server

taskmania: ## Start the Vite dev server
	cd taskmania && npm run dev

test: test-api test-taskmania ## Run every test

test-api: ## Run the Go tests
	cd api && go test ./...

test-taskmania: ## Run the frontend tests
	cd taskmania && npm test

lint: ## Vet the Go code and lint the frontend
	cd api && go vet ./...
	cd taskmania && npm run lint

fmt: ## Format the Go code
	cd api && gofmt -w .

check: ## Everything CI runs
	cd api && gofmt -l . && go vet ./... && go test ./...
	cd taskmania && npm run lint && npm run typecheck && npm test

build: ## Build both production artifacts
	cd api && go build -o server ./cmd/server
	cd taskmania && npm run build

up: ## Start the full stack in Docker
	docker compose up --build

down: ## Stop the stack and remove its volumes
	docker compose down -v

clean: ## Remove build output and the local database
	rm -rf api/server api/server.exe api/data taskmania/dist taskmania/.vite taskmania/coverage
