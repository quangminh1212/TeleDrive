# TeleDrive Makefile
# Cross-platform development commands

.PHONY: help install install-dev test lint format clean build docs serve-docs

# Default target
help:
	@echo "TeleDrive Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Setup:"
	@echo "  install      Install production dependencies"
	@echo "  install-dev  Install development dependencies"
	@echo ""
	@echo "Development:"
	@echo "  test         Run test suite"
	@echo "  lint         Run linting checks"
	@echo "  format       Format code with black and isort"
	@echo "  clean        Clean build artifacts and cache"
	@echo ""
	@echo "Build:"
	@echo "  build        Build distribution packages"
	@echo "  docs         Build documentation"
	@echo "  serve-docs   Serve documentation locally"
	@echo ""
	@echo "Quality:"
	@echo "  check        Run all quality checks"
	@echo "  security     Run security checks"
	@echo ""

# Installation targets
install:
	pip install -r requirements/prod.txt
	pip install .

install-dev:
	pip install -r requirements/dev.txt
	pip install -e .
	pre-commit install

# Development targets
test:
	pytest tests/ -v --cov=src/teledrive --cov-report=html --cov-report=term-missing

lint:
	flake8 src/ tests/ --max-line-length=88 --extend-ignore=E203,W503
	mypy src/teledrive --ignore-missing-imports

format:
	black src/ tests/
	isort src/ tests/

clean:
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf .mypy_cache/
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Build targets
build: clean
	python -m build
	twine check dist/*

docs:
	cd docs && make html

serve-docs:
	cd docs/_build/html && python -m http.server 8000

# Quality targets
check: lint test security

security:
	bandit -r src/ -f json -o bandit-report.json || true
	safety check --json --output safety-report.json || true

# CI targets
ci-test:
	pytest tests/ -v --cov=src/teledrive --cov-report=xml --cov-report=term-missing

ci-lint:
	flake8 src/ tests/ --max-line-length=88 --extend-ignore=E203,W503
	black --check src/ tests/
	isort --check-only src/ tests/
	mypy src/teledrive --ignore-missing-imports
