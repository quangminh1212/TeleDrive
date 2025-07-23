# TeleDrive Makefile for development automation
.PHONY: help install install-dev clean lint format test test-cov security audit build run docker-build docker-run docs pre-commit

# Default target
help:
	@echo "TeleDrive Development Commands:"
	@echo "  install      - Install production dependencies"
	@echo "  install-dev  - Install development dependencies"
	@echo "  clean        - Clean up cache and temporary files"
	@echo "  lint         - Run all linters (flake8, mypy, eslint)"
	@echo "  format       - Format code (black, isort, prettier)"
	@echo "  test         - Run tests"
	@echo "  test-cov     - Run tests with coverage"
	@echo "  security     - Run security checks (bandit, safety)"
	@echo "  audit        - Run full code audit"
	@echo "  build        - Build the application"
	@echo "  run          - Run the application"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run Docker container"
	@echo "  docs         - Generate documentation"
	@echo "  pre-commit   - Install pre-commit hooks"

# Installation
install:
	pip install -e .

install-dev:
	pip install -e ".[dev,docs]"
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
	black src/ scripts/ tests/
	isort src/ scripts/ tests/
	prettier --write static/js/*.js static/css/*.css templates/*.html

# Linting
lint:
	flake8 src/ scripts/
	mypy src/
	eslint static/js/*.js

# Testing
test:
	pytest tests/ -v

test-cov:
	pytest tests/ --cov=src --cov-report=html --cov-report=term-missing

# Security
security:
	bandit -r src/ -f json -o bandit-report.json
	safety check

# Full audit
audit: lint security test-cov
	@echo "Full audit completed!"

# Build
build:
	python -m build

# Run application
run:
	python main.py

# Docker
docker-build:
	docker build -f config/Dockerfile -t teledrive:latest .

docker-run:
	docker run -p 3000:3000 teledrive:latest

# Documentation
docs:
	sphinx-build -b html docs/ docs/_build/html

# Pre-commit
pre-commit:
	pre-commit install
	pre-commit run --all-files
