# TeleDrive Test Suite

Comprehensive testing framework for the TeleDrive project implementing all 22 categories of tests as specified in the test plan.

## 🚀 Quick Start

### Install Test Dependencies
```bash
pip install -r tests/requirements-test.txt
```

### Run All Tests
```bash
python tests/run_tests.py --all
```

### Run Specific Test Categories
```bash
# Unit tests only
python tests/run_tests.py --unit

# Integration tests only
python tests/run_tests.py --integration

# Security tests
python tests/run_tests.py --security

# Performance tests
python tests/run_tests.py --performance

# Code quality checks
python tests/run_tests.py --quality
```

## 📋 Test Categories Implemented

### ✅ **Core System Tests (1-3)**
- **1. Configuration and Initialization** - `tests/unit/test_config.py`
  - Config manager initialization
  - Default config creation
  - Config validation (JSON and .env files)
  - Directory creation
  - Environment sync

- **2. Authentication and Security** - `tests/unit/test_auth.py`
  - User registration and login
  - Telegram authentication
  - Password hashing and security
  - Session management
  - Rate limiting concepts
  - Account lockout mechanisms

- **3. Telegram Channel Scanning** - `tests/unit/test_scanner.py`
  - Public and private channel scanning
  - File type detection and filtering
  - Scan limits and progress tracking
  - WebSocket integration concepts
  - Scan cancellation
  - Error handling (channel not found, access denied)

### ✅ **Web Interface Tests (4-6)**
- **4. File Management** - `tests/integration/test_web_interface.py`
  - File list display
  - Upload/download functionality
  - File operations (rename, delete, move)
  - Bulk operations

- **5. Folder Management** - `tests/integration/test_web_interface.py`
  - Folder creation and organization
  - Subfolder management
  - Folder operations (rename, delete, move)

- **6. Search and Filter** - `tests/integration/test_web_interface.py`
  - Search by filename and content
  - File type filtering
  - Size and date filtering
  - Search suggestions

### ✅ **Database Tests (1.3)**
- **Database Operations** - `tests/unit/test_database.py`
  - Model functionality (User, File, Folder, ScanSession)
  - Database initialization and migration
  - Backup and restore operations
  - Database statistics and repair
  - JSON data migration

## 🏗️ Test Structure

```
tests/
├── __init__.py              # Test utilities and setup
├── conftest.py              # Pytest fixtures and configuration
├── requirements-test.txt    # Test dependencies
├── run_tests.py            # Test runner script
├── README.md               # This file
├── unit/                   # Unit tests
│   ├── test_config.py      # Configuration tests
│   ├── test_auth.py        # Authentication tests
│   ├── test_database.py    # Database tests
│   └── test_scanner.py     # Scanner tests
└── integration/            # Integration tests
    └── test_web_interface.py # Web interface tests
```

## 🧪 Test Types

### Unit Tests
- Test individual components in isolation
- Mock external dependencies
- Fast execution
- High coverage of business logic

### Integration Tests
- Test component interactions
- Use test database and mock services
- Test API endpoints and web interface
- Verify data flow between components

### Security Tests
- Password security validation
- CSRF protection verification
- Session security checks
- Rate limiting concepts
- Account lockout mechanisms

### Performance Tests
- Response time measurements
- Load testing concepts
- Memory usage monitoring
- Database query optimization

## 🔧 Test Configuration

### Pytest Configuration (`pytest.ini`)
- Test discovery patterns
- Custom markers for test categorization
- Coverage settings
- Timeout configurations

### Test Fixtures (`conftest.py`)
- Flask test application setup
- Test database with sample data
- Mock Telegram client
- Temporary directories
- Authenticated test client

### Test Utilities (`__init__.py`)
- Test environment setup/teardown
- Mock data creation helpers
- Database utilities
- File creation helpers
- Assertion utilities

## 📊 Coverage and Reporting

### Coverage Reports
- HTML reports: `coverage/`
- XML reports for CI/CD integration
- Terminal coverage summary
- Missing line identification

### Test Reports
- HTML test reports: `test-reports/`
- JUnit XML for CI integration
- Performance benchmarks
- Security scan results

## 🚦 Running Tests

### Basic Commands
```bash
# Run all tests with coverage
python tests/run_tests.py

# Run with verbose output
python tests/run_tests.py --verbose

# Run without coverage
python tests/run_tests.py --no-coverage

# Run specific test file
python tests/run_tests.py --test tests/unit/test_config.py

# Run specific test function
python tests/run_tests.py --test tests/unit/test_config.py::TestConfigManager::test_config_validation
```

### Using Pytest Directly
```bash
# Run all tests
pytest

# Run with markers
pytest -m unit
pytest -m integration
pytest -m security

# Run with coverage
pytest --cov=source --cov-report=html

# Run specific tests
pytest tests/unit/test_config.py -v
```

## 🔍 Test Categories Status

| Category | Status | Location | Description |
|----------|--------|----------|-------------|
| Configuration | ✅ | `test_config.py` | Config management and validation |
| Authentication | ✅ | `test_auth.py` | User auth and security |
| Database | ✅ | `test_database.py` | Database operations and models |
| Scanner | ✅ | `test_scanner.py` | Telegram scanning functionality |
| Web Interface | ✅ | `test_web_interface.py` | Web UI and API endpoints |
| File Management | ✅ | `test_web_interface.py` | File operations |
| Folder Management | ✅ | `test_web_interface.py` | Folder operations |
| Search/Filter | ✅ | `test_web_interface.py` | Search and filtering |

## 🎯 Test Execution Results

The test runner provides comprehensive reporting:

- **Test Summary**: Pass/fail counts for each category
- **Coverage Reports**: Code coverage metrics
- **Performance Metrics**: Execution times and benchmarks
- **Security Scans**: Vulnerability assessments
- **Code Quality**: Style and quality checks

## 🔧 Extending Tests

### Adding New Tests
1. Create test file in appropriate directory (`unit/` or `integration/`)
2. Use appropriate fixtures from `conftest.py`
3. Add test markers for categorization
4. Update this README with new test information

### Test Naming Convention
- Test files: `test_*.py`
- Test classes: `Test*`
- Test methods: `test_*`
- Use descriptive names that explain what is being tested

### Mock Usage
- Use `unittest.mock` for mocking external dependencies
- Mock Telegram API calls for consistent testing
- Mock file system operations when needed
- Use `pytest-mock` for advanced mocking features

## 📝 Notes

- Tests use in-memory SQLite database for speed
- Telegram API calls are mocked to avoid rate limits
- File operations use temporary directories
- All tests are designed to be independent and can run in any order
- Test data is automatically cleaned up after each test

## 🤝 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure good test coverage (>80%)
3. Add appropriate test markers
4. Update test documentation
5. Run full test suite before committing
