/**
 * Auth Request Model Tests
 */

const authRequest = require('../../../modules/auth/models/authRequest');

// Test createAuthRequest function
describe('createAuthRequest', () => {
  test('should create auth request with specified code', () => {
    const code = 'test1234';
    const request = authRequest.createAuthRequest(code);
    
    expect(request.code).toBe(code);
    expect(request.verified).toBe(false);
    expect(request.verifiedAt).toBeNull();
    expect(request.telegramId).toBeNull();
    expect(request.username).toBeNull();
    expect(request.firstName).toBeNull();
    expect(request.lastName).toBeNull();
    expect(request.timestamp).toBeDefined();
    expect(typeof request.timestamp).toBe('number');
  });
});

// Test verifyAuthRequest function
describe('verifyAuthRequest', () => {
  test('should update request with verification data', () => {
    const originalRequest = {
      code: 'test1234',
      timestamp: Date.now(),
      verified: false,
      verifiedAt: null,
      telegramId: null,
      username: null,
      firstName: null,
      lastName: null
    };
    
    const userData = {
      telegramId: 123456789,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    };
    
    const updatedRequest = authRequest.verifyAuthRequest(originalRequest, userData);
    
    expect(updatedRequest.code).toBe(originalRequest.code);
    expect(updatedRequest.timestamp).toBe(originalRequest.timestamp);
    expect(updatedRequest.verified).toBe(true);
    expect(updatedRequest.verifiedAt).toBeDefined();
    expect(updatedRequest.telegramId).toBe(userData.telegramId);
    expect(updatedRequest.username).toBe(userData.username);
    expect(updatedRequest.firstName).toBe(userData.firstName);
    expect(updatedRequest.lastName).toBe(userData.lastName);
  });
});

// Test isAuthRequestExpired function
describe('isAuthRequestExpired', () => {
  test('should return true for expired requests', () => {
    const request = {
      code: 'test1234',
      timestamp: Date.now() - (31 * 60 * 1000) // 31 minutes ago
    };
    
    const isExpired = authRequest.isAuthRequestExpired(request, 30);
    expect(isExpired).toBe(true);
  });
  
  test('should return false for non-expired requests', () => {
    const request = {
      code: 'test1234',
      timestamp: Date.now() - (25 * 60 * 1000) // 25 minutes ago
    };
    
    const isExpired = authRequest.isAuthRequestExpired(request, 30);
    expect(isExpired).toBe(false);
  });
});

// Test createUserFromAuthRequest function
describe('createUserFromAuthRequest', () => {
  test('should create user from auth request data', () => {
    const request = {
      telegramId: 123456789,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      verified: true,
      verifiedAt: Date.now()
    };
    
    const defaultChatId = 'default123';
    const user = authRequest.createUserFromAuthRequest(request, defaultChatId);
    
    expect(user.id).toBe(request.telegramId);
    expect(user.username).toBe(request.username);
    expect(user.displayName).toBe('Test User');
    expect(user.isAdmin).toBe(true);
    expect(user.provider).toBe('telegram');
  });
  
  test('should use default chatId if telegramId is missing', () => {
    const request = {
      telegramId: null,
      username: 'testuser',
      firstName: 'Test',
      lastName: null,
      verified: true,
      verifiedAt: Date.now()
    };
    
    const defaultChatId = 'default123';
    const user = authRequest.createUserFromAuthRequest(request, defaultChatId);
    
    expect(user.id).toBe(defaultChatId);
    expect(user.username).toBe(request.username);
    expect(user.displayName).toBe('Test');
    expect(user.isAdmin).toBe(true);
    expect(user.provider).toBe('telegram');
  });
}); 