# Contributing to TeleDrive

Thank you for considering contributing to TeleDrive! This document outlines the process for contributing to the project and provides guidelines to help you get started.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## How Can I Contribute?

There are many ways to contribute to TeleDrive:

- **Reporting bugs**: Submit detailed bug reports following our bug report template
- **Suggesting enhancements**: Propose new features or improvements
- **Code contributions**: Submit pull requests to fix bugs or add features
- **Documentation**: Improve or create documentation
- **Testing**: Help test the application and report issues

## Development Setup

### Prerequisites

- Python 3.8 or higher
- Git
- A code editor of your choice
- Telegram API credentials (for testing)

### Setting Up the Development Environment

1. **Fork the repository**
   
   Start by forking the repository on GitHub.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/TeleDrive.git
   cd TeleDrive
   ```

3. **Install dependencies**
   ```bash
   # Create and activate a virtual environment (optional but recommended)
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install development dependencies
   pip install -e ".[dev]"
   
   # Install pre-commit hooks
   pre-commit install
   ```

4. **Configure the application**
   ```bash
   # Copy the environment template
   cp .env-example .env
   
   # Edit .env with your Telegram API credentials and other settings
   ```

5. **Initialize database**
   ```bash
   make init-db
   # or python -c "from src.teledrive.models import init_db; init_db()"
   ```

## Development Workflow

1. **Create a new branch for your changes**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the [coding standards](#coding-standards)
   - Add tests for new features
   - Ensure all tests pass

3. **Run linting and tests**
   ```bash
   # Run linting
   make lint
   
   # Run tests
   make test
   
   # Run all checks
   make check
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add a descriptive commit message"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Submit a pull request**
   - Go to the TeleDrive repository on GitHub
   - Click on "Pull Request"
   - Select your fork and branch
   - Provide a clear description of the changes
   - Reference any related issues

## Coding Standards

### Python Style Guide

- Follow [PEP 8](https://pep8.org/) style guidelines
- Use [Black](https://github.com/psf/black) for code formatting
- Sort imports using [isort](https://pycqa.github.io/isort/)
- Use type hints according to [PEP 484](https://peps.python.org/pep-0484/)

### Documentation

- Use Google-style docstrings for functions and classes
- Document all public functions, classes, and methods
- Keep documentation up to date with code changes

### Testing

- Write unit tests for all new functionality
- Aim for high test coverage
- Tests should be fast, isolated, and deterministic

## Pull Request Process

1. Ensure your code passes all tests and linting checks
2. Update documentation if needed
3. Add appropriate tests for your changes
4. Make sure your commits have descriptive messages
5. Squash related commits before submitting the pull request
6. Wait for code review and address any feedback

## Release Process

The project maintainers follow these steps for releases:

1. Update version number in appropriate files
2. Update CHANGELOG.md with notable changes
3. Create a new GitHub release with release notes
4. Publish to PyPI (if applicable)

## Contact

If you have questions or need help, you can:

- Open an issue on GitHub
- Contact the project maintainers

Thank you for contributing to TeleDrive! 