/**
 * Auth Request Model
 * Represents an authentication request in the system
 */

/**
 * Create a new auth request object
 * @param {String} code - Authentication code
 * @param {Number} timestamp - Request creation timestamp
 * @returns {Object} Auth request object
 */
function createAuthRequest(code) {
  return {
    code,
    timestamp: Date.now(),
    verified: false,
    verifiedAt: null,
    telegramId: null,
    username: null,
    firstName: null,
    lastName: null
  };
}

/**
 * Verify an auth request
 * @param {Object} request - Auth request to verify
 * @param {Object} userData - User data from authentication
 * @returns {Object} Updated auth request
 */
function verifyAuthRequest(request, userData) {
  return {
    ...request,
    verified: true,
    verifiedAt: Date.now(),
    telegramId: userData.telegramId,
    username: userData.username,
    firstName: userData.firstName,
    lastName: userData.lastName
  };
}

/**
 * Check if an auth request is expired
 * @param {Object} request - Auth request to check
 * @param {Number} expiryMinutes - Expiry time in minutes
 * @returns {Boolean} Whether the request is expired
 */
function isAuthRequestExpired(request, expiryMinutes = 30) {
  const now = Date.now();
  const expiryTime = request.timestamp + (expiryMinutes * 60 * 1000);
  return now > expiryTime;
}

/**
 * Create a user object from an auth request
 * @param {Object} request - Verified auth request
 * @param {String} chatId - Default chat ID if not in request
 * @returns {Object} User object
 */
function createUserFromAuthRequest(request, chatId) {
  return {
    id: request.telegramId || chatId || 'unknown',
    username: request.username || 'telegram_user',
    displayName: [request.firstName, request.lastName].filter(Boolean).join(' ') || 'Telegram User',
    photoUrl: 'https://telegram.org/img/t_logo.png',
    isAdmin: true,
    provider: 'telegram'
  };
}

module.exports = {
  createAuthRequest,
  verifyAuthRequest,
  isAuthRequestExpired,
  createUserFromAuthRequest
}; 