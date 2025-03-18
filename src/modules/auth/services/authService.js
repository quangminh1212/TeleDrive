/**
 * Auth Service
 * Handles authentication-related functionality
 */

const crypto = require('crypto');
const authRequest = require('../models/authRequest');
const config = require('../../common/config');
const { logger } = require('../../common/utils');
const dbService = require('../../db/services/dbService');

/**
 * Generate a new authentication code
 * @returns {Promise<String|null>} Authentication code or null if failed
 */
async function generateAuthCode() {
  try {
    // Generate random authentication code
    const code = crypto.randomBytes(16).toString('hex');
    
    // Create new auth request
    const request = authRequest.createAuthRequest(code);
    
    // Save to database
    const authRequests = await dbService.loadDb('auth_requests', []);
    authRequests.push(request);
    
    // Filter out expired auth requests (older than 60 minutes)
    const filteredRequests = authRequests.filter(req => 
      !authRequest.isAuthRequestExpired(req, 60)
    );
    
    const saveResult = await dbService.saveDb('auth_requests', filteredRequests);
    
    if (!saveResult) {
      logger.error('Failed to save auth request to database');
      return null;
    }
    
    logger.info(`Generated new auth code: ${code}`);
    return code;
  } catch (error) {
    logger.error(`Error generating auth code: ${error.message}`);
    return null;
  }
}

/**
 * Verify an authentication request
 * @param {String} code - Authentication code to verify
 * @returns {Promise<Object|null>} User object if verified, null otherwise
 */
async function verifyAuthRequest(code) {
  try {
    if (!code) {
      logger.warn('No auth code provided for verification');
      return null;
    }
    
    // Clean the code (remove auth_ prefix if present)
    const cleanCode = code.replace('auth_', '');
    
    // Load auth requests from database
    const authRequests = await dbService.loadDb('auth_requests', []);
    
    // Find auth request with matching code (case-insensitive)
    const exactMatch = authRequests.find(req => req.code === cleanCode);
    const caseInsensitiveMatch = !exactMatch ? 
      authRequests.find(req => req.code.toLowerCase() === cleanCode.toLowerCase()) : null;
    
    const request = exactMatch || caseInsensitiveMatch;
    const index = exactMatch ? 
      authRequests.findIndex(req => req.code === cleanCode) : 
      caseInsensitiveMatch ? 
        authRequests.findIndex(req => req.code.toLowerCase() === cleanCode.toLowerCase()) : -1;
    
    if (!request || index === -1) {
      logger.warn(`Auth request not found for code: ${cleanCode}`);
      return null;
    }
    
    // Check if auth request is expired
    if (authRequest.isAuthRequestExpired(request)) {
      logger.info(`Auth request has expired for code: ${cleanCode}`);
      
      // Remove expired request
      authRequests.splice(index, 1);
      await dbService.saveDb('auth_requests', authRequests);
      
      return null;
    }
    
    // Check if request is verified
    if (!request.verified) {
      logger.info(`Auth request found but not yet verified: ${cleanCode}`);
      return null;
    }
    
    // Create user object from verified request
    const user = authRequest.createUserFromAuthRequest(request, config.TELEGRAM_CHAT_ID);
    
    logger.info(`Successfully verified auth request for user: ${user.username}`);
    return user;
  } catch (error) {
    logger.error(`Error verifying auth request: ${error.message}`);
    return null;
  }
}

/**
 * Complete authentication for a user
 * @param {String} code - Authentication code
 * @param {Object} userData - User data from authentication source
 * @returns {Promise<Boolean>} Success or failure
 */
async function completeAuthentication(code, userData) {
  try {
    if (!code || !userData) {
      logger.warn('Missing auth code or user data for authentication');
      return false;
    }
    
    // Clean the code
    const cleanCode = code.replace('auth_', '');
    
    // Load auth requests
    const authRequests = await dbService.loadDb('auth_requests', []);
    
    // Find matching request and index
    const exactMatch = authRequests.find(req => req.code === cleanCode);
    const caseInsensitiveMatch = !exactMatch ? 
      authRequests.find(req => req.code.toLowerCase() === cleanCode.toLowerCase()) : null;
    
    const request = exactMatch || caseInsensitiveMatch;
    const index = exactMatch ? 
      authRequests.findIndex(req => req.code === cleanCode) : 
      caseInsensitiveMatch ? 
        authRequests.findIndex(req => req.code.toLowerCase() === cleanCode.toLowerCase()) : -1;
    
    if (!request || index === -1) {
      logger.warn(`Auth request not found for code: ${cleanCode}`);
      return false;
    }
    
    // Check expiry
    if (authRequest.isAuthRequestExpired(request)) {
      logger.info(`Auth request has expired for code: ${cleanCode}`);
      
      // Remove expired request
      authRequests.splice(index, 1);
      await dbService.saveDb('auth_requests', authRequests);
      
      return false;
    }
    
    // Update the request to verified state
    const updatedRequest = authRequest.verifyAuthRequest(request, userData);
    authRequests[index] = updatedRequest;
    
    // Save updated requests
    const saveResult = await dbService.saveDb('auth_requests', authRequests);
    
    if (!saveResult) {
      logger.error('Failed to save verified auth request');
      return false;
    }
    
    logger.info(`Authentication completed for user: ${userData.username}`);
    return true;
  } catch (error) {
    logger.error(`Error completing authentication: ${error.message}`);
    return false;
  }
}

/**
 * Check the status of an authentication request
 * @param {String} code - Authentication code
 * @returns {Promise<Object>} Status object
 */
async function checkAuthStatus(code) {
  try {
    if (!code) {
      return { status: 'error', message: 'No authentication code provided' };
    }
    
    // Clean the code
    const cleanCode = code.replace('auth_', '');
    
    // Load auth requests
    const authRequests = await dbService.loadDb('auth_requests', []);
    
    // Find matching request
    const exactMatch = authRequests.find(req => req.code === cleanCode);
    const caseInsensitiveMatch = !exactMatch ? 
      authRequests.find(req => req.code.toLowerCase() === cleanCode.toLowerCase()) : null;
    
    const request = exactMatch || caseInsensitiveMatch;
    
    if (!request) {
      return { status: 'not_found', message: 'Authentication code not found' };
    }
    
    // Check if expired
    if (authRequest.isAuthRequestExpired(request)) {
      return { status: 'expired', message: 'Authentication code has expired' };
    }
    
    // Check verification status
    if (request.verified) {
      const user = authRequest.createUserFromAuthRequest(request, config.TELEGRAM_CHAT_ID);
      return { 
        status: 'authenticated', 
        user,
        message: 'Authentication successful' 
      };
    }
    
    return { status: 'pending', message: 'Waiting for authentication' };
  } catch (error) {
    logger.error(`Error checking auth status: ${error.message}`);
    return { status: 'error', message: 'Internal server error' };
  }
}

module.exports = {
  generateAuthCode,
  verifyAuthRequest,
  completeAuthentication,
  checkAuthStatus
}; 