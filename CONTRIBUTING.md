# Contributing to TeleDrive

Thank you for your interest in contributing to TeleDrive! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Git
- Basic knowledge of Flask, SQLAlchemy, and Telegram API

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/TeleDrive.git
   cd TeleDrive
   ```

2. **Set up development environment**
   ```bash
   # Install development dependencies
   make install-dev
   
   # Set up pre-commit hooks
   pre-commit install
   
   # Copy environment template
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database**
   ```bash
   make db-init
   ```

4. **Run tests to ensure everything works**
   ```bash
   make test
   ```

## 🛠️ Development Workflow

### Code Style

We use automated code formatting and linting tools:

- **Black** for code formatting
- **isort** for import sorting
- **flake8** for linting
- **mypy** for type checking
- **bandit** for security analysis

Run all formatting and checks:
```bash
# Format code
make format

# Run all checks
make lint
make type-check
make security-check

# Or run all pre-commit hooks
make pre-commit
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add OTP-based authentication
fix(scanner): handle connection timeout errors
docs: update API documentation
test(auth): add unit tests for user creation
```

### Branch Naming

Use descriptive branch names:
- `feature/feature-name` for new features
- `fix/bug-description` for bug fixes
- `docs/documentation-update` for documentation
- `refactor/component-name` for refactoring

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   make test
   make lint
   make type-check
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub.

## 🧪 Testing

### Running Tests

```bash
# Run all tests
make test

# Run with coverage
make test-cov

# Run specific test categories
pytest -m unit          # Unit tests
pytest -m integration   # Integration tests
pytest -m "not slow"    # Skip slow tests
```

### Writing Tests

- Place tests in the `tests/` directory
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for high test coverage (>80%)

Example test:
```python
def test_user_creation(app):
    """Test user creation with valid data."""
    with app.app_context():
        # Arrange
        username = "testuser"
        phone = "+1234567890"
        email = "test@example.com"
        
        # Act
        success, message = auth_manager.create_user(
            username=username,
            phone_number=phone,
            email=email,
            is_admin=False
        )
        
        # Assert
        assert success is True
        assert "successfully" in message.lower()
```

## 📚 Documentation

### Code Documentation

- Use docstrings for all functions, classes, and modules
- Follow Google-style docstrings
- Include type hints
- Document complex logic with inline comments

Example:
```python
def create_user(
    self, 
    username: str, 
    phone_number: str, 
    email: str, 
    is_admin: bool = False
) -> Tuple[bool, str]:
    """Create a new user account.
    
    Args:
        username: The username for the new user
        phone_number: Phone number in international format (+1234567890)
        email: User's email address
        is_admin: Whether the user should have admin privileges
        
    Returns:
        A tuple containing (success: bool, message: str)
        
    Raises:
        ValueError: If phone number format is invalid
    """
```

### API Documentation

- Document all API endpoints
- Include request/response examples
- Specify error codes and messages
- Update OpenAPI/Swagger documentation

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Bug description** - Clear description of the issue
2. **Steps to reproduce** - Detailed steps to reproduce the bug
3. **Expected behavior** - What you expected to happen
4. **Actual behavior** - What actually happened
5. **Environment** - OS, Python version, browser, etc.
6. **Screenshots** - If applicable
7. **Logs** - Relevant error messages or logs

## 💡 Feature Requests

When requesting features:

1. **Use case** - Describe the problem you're trying to solve
2. **Proposed solution** - Your idea for solving it
3. **Alternatives** - Other solutions you've considered
4. **Additional context** - Screenshots, mockups, etc.

## 🔒 Security

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Email us at security@teledrive.dev
3. Include detailed information about the vulnerability
4. Allow time for us to address the issue before public disclosure

## 📋 Code Review Guidelines

### For Contributors

- Keep PRs focused and small
- Write clear PR descriptions
- Respond to feedback promptly
- Update your PR based on review comments

### For Reviewers

- Be constructive and respectful
- Focus on code quality, not personal preferences
- Suggest improvements with examples
- Approve when ready, request changes when needed

## 🏷️ Release Process

1. Update version in `pyproject.toml`
2. Update `CHANGELOG.md`
3. Create release PR
4. Tag release after merge
5. GitHub Actions will handle the rest

## 📞 Getting Help

- 💬 [GitHub Discussions](https://github.com/quangminh1212/TeleDrive/discussions)
- 🐛 [GitHub Issues](https://github.com/quangminh1212/TeleDrive/issues)
- 📧 Email: contact@teledrive.dev

## 📄 License

By contributing to TeleDrive, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TeleDrive! 🎉
