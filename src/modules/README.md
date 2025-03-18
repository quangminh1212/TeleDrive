# TeleDrive Modules

This directory contains the main modules of the TeleDrive application.

## Module Structure

The application is organized into the following modules:

### Auth Module
Handles user authentication via Telegram.
- `models/`: Data models for authentication
- `services/`: Authentication services
- `controllers/`: API controllers for auth endpoints
- `routes/`: API routes for auth

### Files Module
Manages file operations (upload, download, listing, etc.).
- `models/`: File data models
- `services/`: File management services
- `controllers/`: API controllers for file operations
- `routes/`: API routes for file operations

### Storage Module
Handles the storage backend (Telegram).
- `services/`: Storage services including Telegram API integration
- `models/`: Data models for storage operations

### DB Module
Provides database services for the application.
- `services/`: Database services
- `models/`: Data models for database entities

### Common Module
Contains shared utilities and configurations.
- `config/`: Application configuration
- `middlewares/`: Shared middleware functions
- `utils/`: Utility functions

## Module Communication

Modules communicate through their service interfaces. This keeps the codebase modular and maintainable.

Example:
```js
// File service needs storage services to upload files
const storageService = require('../../storage/services/storageService');

async function uploadFile() {
  // Use storage service through its public interface
  const result = await storageService.uploadFile(...);
}
```

## Testing

Each module has corresponding test files in the `tests` directory.
- `tests/unit/`: Unit tests for individual functions
- `tests/integration/`: Tests for module integration

## Adding New Modules

When adding a new module:

1. Create a directory structure similar to existing modules
2. Document public interfaces
3. Add corresponding tests
4. Update this README if necessary
