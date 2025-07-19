# TeleDrive Tests

Test suite cho TeleDrive application.

## Cấu trúc

```
tests/
├── __init__.py          # Package initialization
├── conftest.py          # Pytest configuration và fixtures
├── README.md           # Documentation này
├── test_config.py      # Tests cho configuration
├── test_filesystem.py  # Tests cho filesystem operations
├── test_login_flow.py  # Tests cho authentication flow
└── unit/               # Unit tests
    ├── __init__.py
    ├── test_models.py
    ├── test_services.py
    └── test_utils.py
```

## Chạy Tests

### Chạy tất cả tests
```bash
pytest tests/
```

### Chạy tests với coverage
```bash
pytest tests/ --cov=src --cov-report=html
```

### Chạy tests cụ thể
```bash
pytest tests/test_config.py
pytest tests/test_login_flow.py
```

### Chạy tests với verbose output
```bash
pytest tests/ -v
```

## Requirements

Cài đặt dependencies cho testing:
```bash
pip install pytest pytest-cov pytest-flask
```
