const { client } = require('../config/telegram');
const { StringSession } = require('gramjs/sessions');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for user input
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Controller for authentication
class AuthController {
  // Start the login process
  static async login() {
    try {
      // Check if already logged in
      if (await client.isUserAuthorized()) {
        console.log('Already logged in to Telegram');
        return { success: true, session: client.session.save() };
      }
      
      // Start the login process
      console.log('Starting Telegram login process...');
      
      // Ask for phone number
      const phoneNumber = await question('Please enter your phone number (with country code, e.g., +1234567890): ');
      
      // Send the code
      const { phoneCodeHash } = await client.sendCode({
        apiId: client.apiId,
        apiHash: client.apiHash,
        phoneNumber
      });
      
      // Ask for the code
      const phoneCode = await question('Please enter the code you received: ');
      
      // Sign in with the code
      try {
        const user = await client.signIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode
        });
        
        console.log('Successfully logged in to Telegram');
        
        // Save the session for future use
        const sessionString = client.session.save();
        console.log('Please add this to your .env file:');
        console.log(`SESSION_STRING=${sessionString}`);
        
        return { success: true, session: sessionString };
      } catch (error) {
        // Check if we need a password (2FA)
        if (error.message === 'SESSION_PASSWORD_NEEDED') {
          console.log('Two-factor authentication is enabled');
          
          // Ask for the password
          const password = await question('Please enter your 2FA password: ');
          
          // Complete login with password
          await client.checkPassword(password);
          
          console.log('Successfully logged in to Telegram with 2FA');
          
          // Save the session for future use
          const sessionString = client.session.save();
          console.log('Please add this to your .env file:');
          console.log(`SESSION_STRING=${sessionString}`);
          
          return { success: true, session: sessionString };
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      return { success: false, error: error.message };
    } finally {
      rl.close();
    }
  }
  
  // Get the current user info
  static async getMe() {
    try {
      if (!await client.isUserAuthorized()) {
        return { success: false, error: 'Not logged in' };
      }
      
      const me = await client.getMe();
      
      return {
        success: true,
        user: {
          id: me.id,
          firstName: me.firstName,
          lastName: me.lastName,
          username: me.username,
          phone: me.phone
        }
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Logout from Telegram
  static async logout() {
    try {
      await client.logout();
      console.log('Logged out from Telegram');
      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AuthController; 