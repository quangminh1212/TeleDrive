const express = require('express');
const router = express.Router();
const { tdlibStorage } = require('../storage/tdlib-client');
const logger = require('../common/logger');
const { config } = require('../common/config');

// Telegram API status route
router.get('/status', async (req, res) => {
  try {
    const status = {
      config: {
        api_id_provided: !!config.telegram.apiId,
        api_hash_provided: !!config.telegram.apiHash,
        bot_token_provided: !!config.telegram.botToken,
        chat_id_provided: !!config.telegram.chatId
      },
      tdlib: {
        isAvailable: !!tdlibStorage,
        isConnected: tdlibStorage ? true : false,
        isLoggedIn: tdlibStorage ? true : false,
        chatId: config.telegram.chatId || null
      },
      using_tdlib: !!tdlibStorage,
      fallback_to_bot_api: !tdlibStorage
    };
    
    res.json(status);
  } catch (error) {
    logger.error(`Error checking Telegram status: ${error.message}`);
    res.status(500).json({
      error: error.message,
      status: 500
    });
  }
});

// Test upload route (development only)
if (config.nodeEnv === 'development') {
  router.post('/test-upload', async (req, res) => {
    try {
      if (!req.body.filePath) {
        return res.status(400).json({ error: 'filePath is required', status: 400 });
      }
      
      const result = await tdlibStorage.uploadFile(req.body.filePath, req.body.caption || 'Test upload');
      res.json({
        success: true,
        fileId: result.fileId,
        messageId: result.messageId,
        fileName: result.fileName,
        size: result.size
      });
    } catch (error) {
      logger.error(`Error in test upload: ${error.message}`);
      res.status(500).json({
        error: error.message,
        status: 500
      });
    }
  });
}

module.exports = router; 