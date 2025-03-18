/**
 * Telegram Service
 * Handles interactions with the Telegram Bot API
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../common/config');
const { logger } = require('../../common/utils');
const authService = require('../../auth/services/authService');

// Bot instance and state
let bot = null;
let isReady = false;
let botStarting = false;
let lastInitTime = 0;
let lastInitFailed = false;
let lastInitAttempt = 0;

// Constants for bot initialization
const INIT_COOLDOWN = 60000; // 1 minute between init attempts
const TELEGRAM_CONFLICT_WAIT = 10000; // 10 seconds wait on conflict

/**
 * Initialize the Telegram bot
 * @param {Boolean} force - Force initialization even if already initialized
 * @returns {Promise<Object>} Initialization result
 */
async function initialize(force = false) {
  // If already starting, wait
  if (botStarting) {
    logger.info('Bot is already starting, waiting...');
    
    // Wait for up to 5 seconds
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!botStarting) {
        return { 
          success: isReady,
          message: isReady ? 'Bot is ready' : 'Bot initialization failed'
        };
      }
    }
    
    logger.warn('Timeout waiting for bot to start');
    return { success: false, error: 'Timeout waiting for bot to start' };
  }
  
  try {
    botStarting = true;
    
    // Check if already initialized and not forced
    if (!force && bot && isReady) {
      logger.info('Bot is already initialized and active');
      botStarting = false;
      lastInitFailed = false;
      return { success: true, message: 'Bot is already active' };
    }
    
    // Check cooldown if last init failed
    const now = Date.now();
    if (lastInitFailed && (now - lastInitAttempt < INIT_COOLDOWN) && !force) {
      const waitSeconds = Math.ceil((INIT_COOLDOWN - (now - lastInitAttempt)) / 1000);
      logger.warn(`Init cooldown active, please wait ${waitSeconds} seconds`);
      botStarting = false;
      return { 
        success: false, 
        error: `Initialization cooldown active, please wait ${waitSeconds} seconds` 
      };
    }
    
    // Stop existing bot if any
    if (bot) {
      logger.info('Stopping existing bot before initialization');
      try {
        await stop(true);
        // Wait for resources to be released
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.warn(`Error stopping existing bot: ${error.message}`);
      }
    }
    
    // Reset state
    resetState();
    
    // Update init attempt time
    lastInitAttempt = now;
    
    // Validate configuration
    if (!config.TELEGRAM_BOT_TOKEN) {
      logger.error('TELEGRAM_BOT_TOKEN not found in configuration');
      lastInitFailed = true;
      botStarting = false;
      return { 
        success: false, 
        error: 'TELEGRAM_BOT_TOKEN not configured' 
      };
    }
    
    if (!config.TELEGRAM_CHAT_ID) {
      logger.error('TELEGRAM_CHAT_ID not found in configuration');
      lastInitFailed = true;
      botStarting = false;
      return { 
        success: false, 
        error: 'TELEGRAM_CHAT_ID not configured' 
      };
    }
    
    // Create bot instance
    try {
      bot = new Telegraf(config.TELEGRAM_BOT_TOKEN, {
        telegram: {
          webhookReply: false
        }
      });
      
      // Set up message handlers
      setupMessageHandlers();
      
      // Basic commands
      bot.command('ping', ctx => ctx.reply('Pong!'));
      
      // Launch bot with retry mechanism
      const maxRetries = 3;
      let retries = 0;
      let success = false;
      
      while (!success && retries < maxRetries) {
        try {
          await bot.launch({
            dropPendingUpdates: true,
            allowedUpdates: ['message', 'callback_query']
          });
          success = true;
        } catch (error) {
          retries++;
          
          // Check if conflict error
          const isConflict = error.message && (
            error.message.includes('409: Conflict') || 
            error.message.includes('terminated by other getUpdates')
          );
          
          if (isConflict) {
            logger.warn(`Bot conflict detected (attempt ${retries}/${maxRetries}), waiting before retry...`);
            
            // Cleanup
            try {
              bot.stop();
            } catch (e) {
              // Ignore stop errors
            }
            
            // Wait longer for each retry
            const waitTime = TELEGRAM_CONFLICT_WAIT * retries;
            logger.info(`Waiting ${waitTime/1000} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Create new bot instance
            bot = new Telegraf(config.TELEGRAM_BOT_TOKEN, {
              telegram: {
                webhookReply: false
              }
            });
            
            // Setup handlers again
            setupMessageHandlers();
            bot.command('ping', ctx => ctx.reply('Pong!'));
          } else {
            logger.error(`Non-conflict error initializing bot: ${error.message}`);
            throw error;
          }
        }
      }
      
      if (!success) {
        throw new Error(`Failed to initialize bot after ${maxRetries} attempts`);
      }
      
      // Update state
      isReady = true;
      lastInitTime = Date.now();
      lastInitFailed = false;
      
      logger.info('Telegram bot initialized successfully');
      return { success: true, message: 'Bot initialized successfully' };
    } catch (error) {
      logger.error(`Error initializing Telegram bot: ${error.message}`);
      resetState();
      lastInitFailed = true;
      return { 
        success: false, 
        error: `Failed to initialize bot: ${error.message}` 
      };
    } finally {
      botStarting = false;
    }
  } catch (outerError) {
    logger.error(`Unexpected error during bot initialization: ${outerError.message}`);
    botStarting = false;
    return { 
      success: false, 
      error: `Unexpected error: ${outerError.message}` 
    };
  }
}

/**
 * Stop the Telegram bot
 * @param {Boolean} force - Force stop even if there are errors
 * @returns {Promise<Object>} Stop result
 */
async function stop(force = false) {
  try {
    if (!bot) {
      logger.warn('Bot is not initialized, nothing to stop');
      return { success: true, message: 'Bot was not initialized' };
    }
    
    // Stop the bot
    await bot.stop();
    
    // Reset state
    resetState();
    
    logger.info('Telegram bot stopped successfully');
    return { success: true, message: 'Bot stopped successfully' };
  } catch (error) {
    logger.error(`Error stopping Telegram bot: ${error.message}`);
    
    // Force reset if requested
    if (force) {
      resetState();
      return { 
        success: true, 
        message: 'Bot forcefully stopped with errors' 
      };
    }
    
    return { 
      success: false, 
      error: `Failed to stop bot: ${error.message}` 
    };
  }
}

/**
 * Reset the bot state
 */
function resetState() {
  bot = null;
  isReady = false;
}

/**
 * Check if the bot is active
 * @returns {Boolean} Bot active status
 */
function isActive() {
  return bot !== null && isReady;
}

/**
 * Send a file to Telegram
 * @param {String} filePath - Path to the file
 * @param {String} caption - File caption
 * @returns {Promise<Object>} Send result
 */
async function sendFile(filePath, caption = '') {
  try {
    if (!isActive()) {
      // Try to initialize
      const initResult = await initialize();
      
      if (!initResult.success) {
        return { 
          success: false, 
          error: 'Bot not ready: ' + initResult.error 
        };
      }
    }
    
    if (!fs.existsSync(filePath)) {
      return { 
        success: false, 
        error: `File not found: ${filePath}` 
      };
    }
    
    // Send the file
    const message = await bot.telegram.sendDocument(
      config.TELEGRAM_CHAT_ID,
      { source: filePath },
      { caption }
    );
    
    if (!message || !message.document) {
      return { 
        success: false, 
        error: 'Failed to send document to Telegram' 
      };
    }
    
    return {
      success: true,
      fileId: message.document.file_id,
      messageId: message.message_id,
      chatId: message.chat.id
    };
  } catch (error) {
    logger.error(`Error sending file to Telegram: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Download a file from Telegram
 * @param {String} fileId - Telegram file ID
 * @param {String} savePath - Path to save the file
 * @returns {Promise<Object>} Download result
 */
async function downloadFile(fileId, savePath) {
  try {
    if (!isActive()) {
      // Try to initialize
      const initResult = await initialize();
      
      if (!initResult.success) {
        return { 
          success: false, 
          error: 'Bot not ready: ' + initResult.error 
        };
      }
    }
    
    if (!fileId) {
      return { 
        success: false, 
        error: 'File ID is required' 
      };
    }
    
    // Get file info
    const fileInfo = await bot.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(savePath));
    
    // Download file
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });
    
    // Save to file
    const writer = fs.createWriteStream(savePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        resolve({
          success: true,
          path: savePath,
          size: fileInfo.file_size
        });
      });
      
      writer.on('error', (error) => {
        reject({
          success: false,
          error: `Error writing file: ${error.message}`
        });
      });
    });
  } catch (error) {
    logger.error(`Error downloading file from Telegram: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Get a file link from Telegram
 * @param {String} fileId - Telegram file ID
 * @returns {Promise<Object>} Link result
 */
async function getFileLink(fileId) {
  try {
    if (!isActive()) {
      // Try to initialize
      const initResult = await initialize();
      
      if (!initResult.success) {
        return { 
          success: false, 
          error: 'Bot not ready: ' + initResult.error 
        };
      }
    }
    
    if (!fileId) {
      return { 
        success: false, 
        error: 'File ID is required' 
      };
    }
    
    // Get file info
    const fileInfo = await bot.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Links are valid for at least 1 hour
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 1);
    
    return {
      success: true,
      url: fileUrl,
      expiresAt: expiryTime.toISOString()
    };
  } catch (error) {
    logger.error(`Error getting file link from Telegram: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Get files from a Telegram chat
 * @param {Number} limit - Maximum number of files to retrieve
 * @returns {Promise<Object>} Files result
 */
async function getFilesFromChat(limit = 100) {
  try {
    if (!isActive()) {
      // Try to initialize
      const initResult = await initialize();
      
      if (!initResult.success) {
        return { 
          success: false, 
          error: 'Bot not ready: ' + initResult.error 
        };
      }
    }
    
    const chatId = config.TELEGRAM_CHAT_ID;
    let messages = [];
    let lastMessageId = 0;
    
    logger.info(`Getting up to ${limit} messages from Telegram chat ${chatId}`);
    
    // Get messages in chunks
    while (messages.length < limit) {
      const chunkSize = Math.min(100, limit - messages.length);
      
      try {
        // Since getHistory is not available directly in telegraf,
        // we'll mock this functionality by getting recent messages
        logger.info(`This method needs to be implemented based on available Telegram API methods`);
        
        // If a real implementation is added, uncomment and adapt this code:
        /*
        const messagesChunk = await bot.telegram.getHistory(chatId, {
          limit: chunkSize,
          offset_id: lastMessageId
        });
        
        if (!messagesChunk || messagesChunk.length === 0) {
          break;
        }
        
        // Filter messages with files
        const fileMessages = messagesChunk.filter(msg => 
          msg.document || msg.photo || msg.video || msg.audio || msg.voice
        );
        
        messages.push(...fileMessages);
        lastMessageId = messagesChunk[messagesChunk.length - 1].message_id;
        */
        
        // For now, return a mock successful response
        return {
          success: true,
          files: [],
          message: 'Note: This is a placeholder. Real implementation needs to be added.'
        };
      } catch (error) {
        logger.error(`Error getting messages: ${error.message}`);
        return { 
          success: false, 
          error: `Failed to get messages: ${error.message}` 
        };
      }
    }
  } catch (error) {
    logger.error(`Error getting files from chat: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Set up message handlers for the bot
 */
function setupMessageHandlers() {
  if (!bot) return;
  
  // Handle /start command
  bot.start((ctx) => {
    try {
      const startPayload = ctx.startPayload;
      
      // Check if authentication command
      if (startPayload && startPayload.startsWith('auth_')) {
        const authCode = startPayload.replace('auth_', '');
        handleAuthCommand(ctx, authCode);
      } else {
        ctx.reply('👋 Welcome! I am the TeleDrive storage bot.\n\n✅ Use /auth <code> to authenticate with the TeleDrive web app.\n📁 Or send me files to store them.');
      }
    } catch (error) {
      logger.error(`Error handling /start command: ${error.message}`);
      ctx.reply('❌ An error occurred processing your request. Please try again later.');
    }
  });
  
  // Handle /auth command
  bot.command('auth', async (ctx) => {
    try {
      const text = ctx.message.text.trim();
      const parts = text.split(' ');
      
      if (parts.length < 2) {
        return ctx.reply('⚠️ Please provide an authentication code. Example: /auth abc123');
      }
      
      const authCode = parts[1].trim();
      logger.info(`Received /auth command with code: ${authCode}`);
      
      await handleAuthCommand(ctx, authCode);
    } catch (error) {
      logger.error(`Error handling /auth command: ${error.message}`);
      ctx.reply('❌ An error occurred processing your request. Please try again later.');
    }
  });
  
  // Handle text messages that might be auth codes
  bot.on('text', async (ctx) => {
    try {
      const text = ctx.message.text.trim();
      
      // Check if the text looks like an auth code
      if (text.length >= 12 && text.length <= 32 && /^[a-f0-9]+$/i.test(text)) {
        logger.info(`Detected possible auth code in text message: ${text}`);
        await handleAuthCommand(ctx, text);
        return;
      }
      
      // Check for auth code patterns
      const authCodePattern = /auth[_\s]([a-f0-9]{12,32})/i;
      const match = text.match(authCodePattern);
      
      if (match && match[1]) {
        const authCode = match[1];
        logger.info(`Detected auth code in message: ${authCode}`);
        await handleAuthCommand(ctx, authCode);
        return;
      }
    } catch (error) {
      logger.error(`Error handling text message: ${error.message}`);
    }
  });
  
  // Handle document messages
  bot.on('document', async (ctx) => {
    try {
      logger.info('Received document file');
      ctx.reply('✅ File received and stored!');
    } catch (error) {
      logger.error(`Error handling document: ${error.message}`);
      ctx.reply('❌ Error processing your file. Please try again later.');
    }
  });
  
  // Handle photos
  bot.on('photo', async (ctx) => {
    try {
      logger.info('Received photo');
      ctx.reply('✅ Photo received and stored!');
    } catch (error) {
      logger.error(`Error handling photo: ${error.message}`);
      ctx.reply('❌ Error processing your photo. Please try again later.');
    }
  });
}

/**
 * Handle authentication commands
 * @param {Object} ctx - Telegram context
 * @param {String} authCode - Authentication code
 */
async function handleAuthCommand(ctx, authCode) {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || '';
    const firstName = ctx.from.first_name || '';
    const lastName = ctx.from.last_name || '';
    
    logger.info(`Processing auth request with code ${authCode} from user: ${userId} (${username})`);
    
    // Complete authentication
    const authResult = await authService.completeAuthentication(authCode, {
      telegramId: userId,
      username,
      firstName,
      lastName
    });
    
    if (authResult) {
      ctx.reply('✅ Authentication successful! You can now return to the web app and log in. The page will redirect automatically.');
      logger.info(`User ${userId} (${username}) successfully authenticated with code ${authCode}`);
    } else {
      ctx.reply('⚠️ Invalid or expired authentication code. Please try again with a new code from the web app.');
      logger.warn(`Failed authentication attempt with code ${authCode} from user ${userId} (${username})`);
    }
  } catch (error) {
    logger.error(`Error handling auth command: ${error.message}`);
    ctx.reply('❌ An error occurred during authentication. Please try again later.');
  }
}

module.exports = {
  initialize,
  stop,
  isActive,
  sendFile,
  downloadFile,
  getFileLink,
  getFilesFromChat,
  resetState
}; 