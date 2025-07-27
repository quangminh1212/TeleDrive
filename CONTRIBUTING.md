# Contributing to TeleDrive

Thank you for your interest in contributing to TeleDrive! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Git
- Basic knowledge of Flask, HTML, CSS, and JavaScript
- Telegram API credentials for testing

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/teledrive.git
   cd teledrive
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # Development dependencies
   ```

4. **Set up pre-commit hooks**
   ```bash
   pre-commit install
   ```

5. **Run tests**
   ```bash
   pytest
   ```

## 📝 Code Style

We follow these coding standards:

### Python
- **PEP 8** compliance
- **Black** for code formatting
- **isort** for import sorting
- **flake8** for linting
- **Type hints** where appropriate

### Frontend
- **Prettier** for JavaScript/CSS formatting
- **ESLint** for JavaScript linting
- **BEM methodology** for CSS class naming
- **Semantic HTML** structure

### Git Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(ui): add dark theme support`
- `fix(api): resolve file upload timeout issue`
- `docs(readme): update installation instructions`
- `refactor(auth): simplify login flow`

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected vs actual behavior**
4. **Environment details** (OS, Python version, browser)
5. **Screenshots** if applicable
6. **Error logs** or console output

Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## 💡 Feature Requests

For new features:

1. **Check existing issues** to avoid duplicates
2. **Describe the problem** you're trying to solve
3. **Propose a solution** with implementation details
4. **Consider alternatives** and their trade-offs
5. **Provide mockups** for UI changes

Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

## 🔄 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   pytest
   flake8 src/
   black --check src/
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use our [PR template](.github/PULL_REQUEST_TEMPLATE.md)
   - Link related issues
   - Provide clear description of changes
   - Add screenshots for UI changes

### PR Requirements

- ✅ All tests pass
- ✅ Code follows style guidelines
- ✅ Documentation is updated
- ✅ No merge conflicts
- ✅ Descriptive commit messages
- ✅ Linked to relevant issues

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_file_manager.py

# Run tests with specific marker
pytest -m "not slow"
```

### Writing Tests

- Write tests for all new functionality
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both success and failure cases

Example:
```python
def test_file_upload_success():
    """Test successful file upload with valid data."""
    # Arrange
    client = create_test_client()
    file_data = create_test_file()
    
    # Act
    response = client.post('/upload', data=file_data)
    
    # Assert
    assert response.status_code == 200
    assert 'success' in response.json
```

## 📚 Documentation

### Code Documentation

- Use **docstrings** for all functions and classes
- Follow **Google style** docstring format
- Include **type hints** where appropriate
- Document **complex algorithms** with inline comments

### User Documentation

- Update relevant documentation in `docs/`
- Include **screenshots** for UI changes
- Provide **code examples** for API changes
- Keep documentation **up-to-date** with code changes

## 🏗️ Architecture Guidelines

### Project Structure

```
src/teledrive/
├── api/           # REST API endpoints
├── auth/          # Authentication logic
├── core/          # Core business logic
├── models/        # Database models
├── services/      # Business services
├── utils/         # Utility functions
└── web/           # Web interface
```

### Design Principles

- **Single Responsibility Principle**
- **Dependency Injection**
- **Clean Architecture**
- **RESTful API design**
- **Progressive Enhancement**

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help newcomers get started
- Provide constructive feedback
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)

## 📞 Getting Help

- 💬 [GitHub Discussions](https://github.com/yourusername/teledrive/discussions)
- 🐛 [GitHub Issues](https://github.com/yourusername/teledrive/issues)
- 📧 Email: dev@teledrive.com

## 🎉 Recognition

Contributors will be:
- Listed in our [Contributors](CONTRIBUTORS.md) file
- Mentioned in release notes
- Invited to our contributors Discord server

Thank you for contributing to TeleDrive! 🚀
