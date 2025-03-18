/**
 * TeleDrive - Server
 * Responsible for starting the server and initializing services
 */

const app = require('./app');
const config = require('./modules/common/config');
const { logger } = require('./modules/common/utils');
const telegramService = require('./modules/storage/services/telegramService');
const dbService = require('./modules/db/services/dbService');

// Process command line arguments
const args = process.argv.slice(2);
const shouldSync = args.includes('--sync');
const shouldCleanup = args.includes('--cleanup');

/**
 * Start the server
 */
async function startServer() {
  try {
    // Start HTTP server
    const PORT = config.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
    
    // Initialize Telegram bot
    logger.info('Initializing Telegram bot...');
    const botResult = await telegramService.initialize();
    
    if (botResult.success) {
      logger.info('Telegram bot initialized successfully');
      
      // Run synchronization if requested
      if (shouldSync || config.AUTO_SYNC) {
        // Wait a moment for bot to fully initialize
        setTimeout(async () => {
          try {
            // Sync files if requested
            logger.info('Starting file synchronization...');
            // TODO: Implement file sync
          } catch (syncError) {
            logger.error(`Error during sync: ${syncError.message}`);
          }
        }, 5000);
      }
    } else {
      logger.error(`Failed to initialize Telegram bot: ${botResult.error}`);
    }
    
    // Set up cleanup if needed
    if (shouldCleanup) {
      // TODO: Implement cleanup task
    }
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await telegramService.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server...');
  await telegramService.stop();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`, err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
});

// Start the server
startServer(); 