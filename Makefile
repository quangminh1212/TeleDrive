# TeleDrive Makefile

.PHONY: help install install-dev test lint format clean run setup docs

# Default target
help:
	@echo "TeleDrive Development Commands:"
	@echo ""
	@echo "Setup:"
	@echo "  install      Install production dependencies"
	@echo "  install-dev  Install development dependencies"
	@echo "  setup        Initial project setup"
	@echo ""
	@echo "Development:"
	@echo "  run          Run the development server"
	@echo "  test         Run tests"
	@echo "  test-cov     Run tests with coverage"
	@echo "  lint         Run linting checks"
	@echo "  format       Format code with black and isort"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean        Clean up temporary files"
	@echo "  docs         Generate documentation"
	@echo "  security     Run security checks"

# Installation
install:
	pip install -r requirements.txt

install-dev: install
	pip install -r requirements-dev.txt
	pre-commit install

# Setup
setup: install-dev
	@echo "Setting up TeleDrive development environment..."
	@if [ ! -f config/config.json ]; then \
		echo "Creating default config file..."; \
		cp config/config.json.example config/config.json 2>/dev/null || echo "Please create config/config.json manually"; \
	fi
	@echo "Setup complete! Run 'make run' to start the development server."

# Development
run:
	python main.py

test:
	pytest

test-cov:
	pytest --cov=src --cov-report=html --cov-report=term

# Code Quality
lint:
	flake8 src/ tests/
	mypy src/ --ignore-missing-imports

format:
	black src/ tests/
	isort src/ tests/

# Security
security:
	bandit -r src/
	safety check

# Documentation
docs:
	@echo "Generating documentation..."
	@if [ -d "docs/" ]; then \
		cd docs && make html; \
	else \
		echo "Documentation directory not found"; \
	fi

# Maintenance
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type f -name ".coverage" -delete
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +

# Database
db-init:
	python -c "from src.teledrive.models import db; db.create_all()"

db-reset:
	@echo "Warning: This will delete all data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	rm -f instance/*.db
	python -c "from src.teledrive.models import db; db.create_all()"

# Production
build:
	@echo "Building production assets..."
	# Add build steps here if needed

deploy:
	@echo "Deploying to production..."
	# Add deployment steps here

# Docker (if using Docker)
docker-build:
	docker build -t teledrive .

docker-run:
	docker run -p 3000:3000 teledrive

# Git hooks
pre-commit:
	pre-commit run --all-files
