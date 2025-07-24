# TeleDrive Makefile for development automation
.PHONY: help install install-dev clean lint format test test-cov security check run docker-build docker-run pre-commit init-db

# Default target
help:
	@echo "TeleDrive Development Commands:"
	@echo "  install      - Install production dependencies"
	@echo "  install-dev  - Install development dependencies"
	@echo "  clean        - Clean up cache and temporary files"
	@echo "  lint         - Run all linters (flake8, mypy)"
	@echo "  format       - Format code (black, isort)"
	@echo "  test         - Run tests"
	@echo "  test-cov     - Run tests with coverage"
	@echo "  security     - Run security checks (bandit)"
	@echo "  check        - Run all checks (lint, security, test)"
	@echo "  run          - Run the application"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run Docker container"
	@echo "  pre-commit   - Install pre-commit hooks"
	@echo "  init-db      - Initialize database"

# Installation
install:
	pip install -r requirements.txt

install-dev:
	pip install -e ".[dev]"
	pre-commit install

# Cleaning
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type f -name ".coverage" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	rm -rf build/ dist/ htmlcov/ .tox/

# Code formatting
format:
	black src/ tests/
	isort src/ tests/

# Linting
lint:
	flake8 src/
	mypy src/

# Testing
test:
	pytest tests/ -v

test-cov:
	pytest tests/ --cov=src --cov-report=html --cov-report=term-missing

# Security
security:
	bandit -r src/ -f text

# Full check
check: lint security test
	@echo "All checks completed successfully!"

# Run application
run:
	python main.py

# Docker
docker-build:
	docker build -f config/Dockerfile -t teledrive:latest .

docker-run:
	docker run -p 3000:3000 \
		-v $(PWD)/instance:/app/instance \
		-v $(PWD)/logs:/app/logs \
		--env-file .env \
		teledrive:latest

# Pre-commit
pre-commit:
	pre-commit install
	pre-commit run --all-files

# Initialize database
init-db:
	python -c "from src.teledrive.models import init_db; init_db()"
