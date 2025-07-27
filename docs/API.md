# TeleDrive API Documentation

## Overview

TeleDrive provides a RESTful API for managing Telegram files and user authentication. All API endpoints follow REST conventions and return JSON responses.

## Base URL
```
https://your-domain.com/api
```

## Authentication

Most API endpoints require authentication. TeleDrive uses session-based authentication.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "username": "username",
    "is_admin": false
  }
}
```

### Logout
```http
POST /api/auth/logout
```

## File Management

### Get Files
```http
GET /api/gdrive/files?session_id={session_id}&sort={sort}&order={order}
```

**Parameters:**
- `session_id` (optional): Filter by Telegram session
- `sort` (optional): Sort field (name, size, date)
- `order` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "file_id",
      "name": "filename.pdf",
      "size": 1024000,
      "type": "document",
      "date": "2025-01-23T10:30:00Z",
      "download_url": "/api/download/file_id"
    }
  ],
  "total": 150,
  "page": 1,
  "per_page": 50
}
```

### Search Files
```http
GET /api/gdrive/search?q={query}&session_id={session_id}
```

**Parameters:**
- `q`: Search query
- `session_id` (optional): Filter by session

### Download File
```http
GET /api/download/{file_id}
```

**Response:** File content with appropriate headers

## Session Management

### Get Sessions
```http
GET /api/sessions
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session_id",
      "name": "Session Name",
      "file_count": 1250,
      "last_scan": "2025-01-23T10:30:00Z",
      "status": "active"
    }
  ]
}
```

### Scan Session
```http
POST /api/sessions/{session_id}/scan
```

## Admin API

### User Management
```http
GET /api/admin/users
POST /api/admin/users
PUT /api/admin/users/{user_id}
DELETE /api/admin/users/{user_id}
```

### System Stats
```http
GET /api/admin/system-stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_files": 15000,
    "total_size": "2.5 GB",
    "active_sessions": 5,
    "system_health": "good",
    "uptime": "5 days, 12 hours"
  }
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate limited:
- **General endpoints**: 100 requests per minute
- **Authentication**: 5 requests per minute
- **File downloads**: 50 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642780800
```

## Security

### CSRF Protection
Include CSRF token in POST/PUT/DELETE requests:
```http
X-CSRF-Token: your_csrf_token
```

### Input Validation
All inputs are validated and sanitized. Invalid inputs return `400 Bad Request`.

### File Upload Security
- File type validation
- Size limits enforced
- Malware scanning
- Path traversal prevention

## SDKs and Examples

### Python Example
```python
import requests

# Login
response = requests.post('https://api.teledrive.com/api/auth/login', json={
    'username': 'your_username',
    'password': 'your_password'
})

# Get files
files = requests.get('https://api.teledrive.com/api/gdrive/files')
print(files.json())
```

### JavaScript Example
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'your_username',
    password: 'your_password'
  })
});

// Get files
const files = await fetch('/api/gdrive/files');
const data = await files.json();
console.log(data);
```

## Webhooks

TeleDrive supports webhooks for real-time notifications:

### Configure Webhook
```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["file.uploaded", "scan.completed"],
  "secret": "webhook_secret"
}
```

### Webhook Events
- `file.uploaded`: New file uploaded
- `file.deleted`: File deleted
- `scan.started`: Scan started
- `scan.completed`: Scan completed
- `user.login`: User logged in

## Changelog

### v1.0.0 (2025-01-23)
- Initial API release
- File management endpoints
- Authentication system
- Admin API
- Rate limiting
- Security enhancements
