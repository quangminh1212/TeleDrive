const http = require('http');
const app = require('./app');
const { config } = require('./modules/common/config');
const logger = require('./modules/common/logger');
const { connectDB } = require('./modules/db');
const { setupAuthBot } = require('./modules/auth/telegram-auth');

// Normalize port
const normalizePort = (val) => {
  const port = parseInt(val, 10);
  
  if (isNaN(port)) {
    return val;
  }
  
  if (port >= 0) {
    return port;
  }
  
  return false;
};

// Get port from environment and store in Express
const port = normalizePort(config.port);
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

// Event listener for HTTP server "error" event
const onError = (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;
  
  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
};

// Event listener for HTTP server "listening" event
const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.info('Server listening on ' + bind);
};

// Initialize application
const init = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start Telegram bot
    setupAuthBot();
    
    // Start server
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
    
    logger.info(`Server started in ${config.nodeEnv} mode`);
  } catch (error) {
    logger.error(`Server initialization error: ${error.message}`);
    process.exit(1);
  }
};

// Start the application
init(); 