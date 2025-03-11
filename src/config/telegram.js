const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
require('dotenv').config();

// Telegram API configuration
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const sessionString = process.env.SESSION_STRING || '';

if (!apiId || !apiHash) {
  console.error('API_ID and API_HASH must be set in the .env file');
  process.exit(1);
}

const stringSession = new StringSession(sessionString);

// Initialize the Telegram client
const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Function to initialize and connect the client
async function initTelegramClient() {
  try {
    await client.connect();
    
    // Check if we need to sign in
    if (!client.connected) {
      throw new Error('Failed to connect to Telegram');
    }
    
    if (!await client.isUserAuthorized()) {
      console.log('You need to login to Telegram first');
      // The user will need to authenticate through a separate process
      // We'll handle this in the authentication controller
      return false;
    }
    
    // Save the session string to reuse it later
    const newSessionString = client.session.save();
    if (newSessionString !== sessionString) {
      console.log('New session string generated. Please update your .env file:');
      console.log(`SESSION_STRING=${newSessionString}`);
    }
    
    console.log('Connected to Telegram');
    return true;
  } catch (error) {
    console.error('Error connecting to Telegram:', error);
    return false;
  }
}

module.exports = {
  client,
  initTelegramClient,
}; 