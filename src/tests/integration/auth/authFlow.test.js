/**
 * Auth Flow Integration Tests
 */

const authService = require('../../../modules/auth/services/authService');
const dbService = require('../../../modules/db/services/dbService');

// Mock the database service
jest.mock('../../../modules/db/services/dbService', () => ({
  loadDb: jest.fn(),
  saveDb: jest.fn(() => Promise.resolve(true))
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up mocked authentication requests database
    dbService.loadDb.mockImplementation((dbName, defaultValue) => {
      if (dbName === 'auth_requests') {
        return Promise.resolve([]);
      }
      return Promise.resolve(defaultValue);
    });
  });
  
  test('full authentication flow', async () => {
    // 1. Generate auth code
    const authCode = await authService.generateAuthCode();
    expect(authCode).toBeTruthy();
    
    // Verify DB save was called
    expect(dbService.saveDb).toHaveBeenCalledWith('auth_requests', expect.any(Array));
    
    // Set up the database with the generated auth code
    const mockAuthRequest = {
      code: authCode,
      timestamp: Date.now(),
      verified: false
    };
    
    dbService.loadDb.mockImplementation((dbName, defaultValue) => {
      if (dbName === 'auth_requests') {
        return Promise.resolve([mockAuthRequest]);
      }
      return Promise.resolve(defaultValue);
    });
    
    // 2. Check auth status before verification
    const statusBeforeVerify = await authService.checkAuthStatus(authCode);
    expect(statusBeforeVerify.status).toBe('pending');
    
    // 3. Complete authentication
    const userData = {
      telegramId: 12345,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    };
    
    const authResult = await authService.completeAuthentication(authCode, userData);
    expect(authResult).toBe(true);
    
    // Update mock to reflect verification
    const verifiedRequest = {
      ...mockAuthRequest,
      verified: true,
      verifiedAt: Date.now(),
      telegramId: userData.telegramId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName
    };
    
    dbService.loadDb.mockImplementation((dbName, defaultValue) => {
      if (dbName === 'auth_requests') {
        return Promise.resolve([verifiedRequest]);
      }
      return Promise.resolve(defaultValue);
    });
    
    // 4. Check auth status after verification
    const statusAfterVerify = await authService.checkAuthStatus(authCode);
    expect(statusAfterVerify.status).toBe('authenticated');
    expect(statusAfterVerify.user).toBeTruthy();
    expect(statusAfterVerify.user.username).toBe(userData.username);
    
    // 5. Verify user
    const user = await authService.verifyAuthRequest(authCode);
    expect(user).toBeTruthy();
    expect(user.username).toBe(userData.username);
    expect(user.displayName).toBe('Test User');
  });
  
  test('expired auth code flow', async () => {
    // Set up an expired auth code
    const expiredAuthRequest = {
      code: 'expired-code',
      timestamp: Date.now() - (60 * 60 * 1000), // 1 hour ago
      verified: false
    };
    
    dbService.loadDb.mockImplementation((dbName, defaultValue) => {
      if (dbName === 'auth_requests') {
        return Promise.resolve([expiredAuthRequest]);
      }
      return Promise.resolve(defaultValue);
    });
    
    // 1. Check status of expired code
    const status = await authService.checkAuthStatus('expired-code');
    expect(status.status).toBe('expired');
    
    // 2. Attempt to verify an expired code
    const user = await authService.verifyAuthRequest('expired-code');
    expect(user).toBeNull();
    
    // 3. Attempt to complete authentication with expired code
    const userData = {
      telegramId: 12345,
      username: 'testuser'
    };
    
    const authResult = await authService.completeAuthentication('expired-code', userData);
    expect(authResult).toBe(false);
  });
}); 