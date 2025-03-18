/**
 * General Utilities for TeleDrive
 * Contains common utility functions
 */

const crypto = require('crypto');

/**
 * Generate a random ID
 * @param {Number} length - Length of the ID
 * @returns {String} Random ID
 */
function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format a date to a readable string
 * @param {Date|String|Number} date - Date to format
 * @param {Boolean} includeTime - Whether to include time
 * @returns {String} Formatted date
 */
function formatDate(date, includeTime = true) {
  const d = new Date(date);
  
  // Format date
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  let result = `${day}/${month}/${year}`;
  
  // Add time if requested
  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    result += ` ${hours}:${minutes}`;
  }
  
  return result;
}

/**
 * Generate a secure random token
 * @param {Number} length - Desired byte length
 * @returns {String} Hexadecimal token
 */
function generateToken(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Wait for specified milliseconds
 * @param {Number} ms - Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after timeout
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Number} maxRetries - Maximum number of retries
 * @param {Number} baseDelay - Base delay in ms
 * @returns {Promise<any>} Result of the function
 */
async function retry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Sanitize a string for safe display
 * @param {String} str - String to sanitize
 * @returns {String} Sanitized string
 */
function sanitizeString(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  generateId,
  formatDate,
  generateToken,
  sleep,
  retry,
  sanitizeString
}; 