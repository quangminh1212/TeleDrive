.PHONY: help install install-dev clean test test-cov lint format type-check security-check pre-commit run run-dev run-prod build docker-build docker-run docs

# Default target
help: ## Show this help message
	@echo "TeleDrive Development Commands"
	@echo "=============================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation
install: ## Install production dependencies
	pip install -e .

install-dev: ## Install development dependencies
	pip install -e ".[dev,test,docs]"
	pre-commit install

# Cleaning
clean: ## Clean up build artifacts and cache
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf bandit-report.json
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Testing
test: ## Run tests
	pytest

test-cov: ## Run tests with coverage
	pytest --cov=teledrive --cov-report=html --cov-report=term

test-watch: ## Run tests in watch mode
	pytest-watch

# Code Quality
lint: ## Run linting
	flake8 src/ tests/
	bandit -r src/ -f json -o bandit-report.json

format: ## Format code
	black src/ tests/
	isort src/ tests/

format-check: ## Check code formatting
	black --check src/ tests/
	isort --check-only src/ tests/

type-check: ## Run type checking
	mypy src/

security-check: ## Run security checks
	bandit -r src/
	safety check
	python scripts/security_check.py

security-audit: ## Run comprehensive security audit
	python scripts/security_check.py

pre-commit: ## Run all pre-commit hooks
	pre-commit run --all-files

# Development
run: ## Run development server
	python main.py

run-dev: ## Run development server with debug
	ENVIRONMENT=development DEBUG=true python main.py

run-clean: ## Run clean development server
	python clean.py

run-prod: ## Run production server
	python scripts/production.py

# Database
db-init: ## Initialize database
	python scripts/create_admin.py

db-migrate: ## Run database migrations
	python scripts/migrate.py

db-backup: ## Backup database
	python scripts/backup.py

# Docker
docker-build: ## Build Docker image
	docker build -t teledrive:latest .

docker-run: ## Run Docker container
	docker run -p 5000:5000 teledrive:latest

docker-compose-up: ## Start services with docker-compose
	docker-compose up -d

docker-compose-down: ## Stop services with docker-compose
	docker-compose down

# Documentation
docs: ## Build documentation
	cd docs && make html

docs-serve: ## Serve documentation locally
	cd docs/_build/html && python -m http.server 8000

# Utilities
config-check: ## Check configuration
	python scripts/config.py

optimize: ## Run optimization scripts
	python scripts/optimize.py

cleanup: ## Run cleanup scripts
	python scripts/cleanup.py

# CI/CD
ci-test: ## Run CI tests
	pytest --cov=teledrive --cov-report=xml --cov-fail-under=80

ci-lint: ## Run CI linting
	flake8 src/ tests/ --format=json --output-file=flake8-report.json
	bandit -r src/ -f json -o bandit-report.json

ci-security: ## Run CI security checks
	bandit -r src/ -f json -o bandit-report.json
	safety check --json --output safety-report.json

# Release
build: ## Build package
	python -m build

release: ## Build and upload to PyPI
	python -m build
	twine upload dist/*

# Environment
env-create: ## Create .env file from template
	cp .env.example .env
	@echo "Created .env file. Please edit it with your configuration."

env-check: ## Check environment variables
	python -c "from src.config.production import validate_environment; validate_environment()"

# Development setup
setup: install-dev env-create db-init ## Complete development setup
	@echo "Development environment setup complete!"
	@echo "Edit .env file with your configuration, then run 'make run'"
