const { client } = require('../config/telegram');
const { Api } = require('gramjs');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { createReadStream } = require('fs');

class TelegramService {
  // Upload a file to Telegram
  static async uploadFile(filePath, progressCallback = null) {
    try {
      // Get file information
      const fileName = path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      
      // Create a read stream for the file
      const fileStream = createReadStream(filePath);
      
      // Create a saved messages chat to store the file
      // This is the most private way to store files in Telegram
      const result = await client.sendFile('me', {
        file: fileStream,
        fileName,
        fileSize,
        progressCallback
      });
      
      // Extract the necessary information from the result
      return {
        telegram_file_id: result.media.document.id.toString(),
        telegram_message_id: result.id.toString(),
        telegram_chat_id: 'me', // Saved messages
        name: fileName,
        mime_type: mimeType,
        size: fileSize
      };
    } catch (error) {
      console.error('Error uploading file to Telegram:', error);
      throw error;
    }
  }
  
  // Download a file from Telegram
  static async downloadFile(fileInfo, destinationPath, progressCallback = null) {
    try {
      // Get the message containing the file
      const message = await client.getMessages('me', {
        ids: [parseInt(fileInfo.telegram_message_id)]
      });
      
      if (!message || !message[0] || !message[0].media) {
        throw new Error('File not found in Telegram');
      }
      
      // Create the destination directory if it doesn't exist
      const destDir = path.dirname(destinationPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Download the file
      const buffer = await client.downloadMedia(message[0].media, {
        progressCallback
      });
      
      // Save the file to the destination path
      fs.writeFileSync(destinationPath, buffer);
      
      return {
        path: destinationPath,
        size: buffer.length
      };
    } catch (error) {
      console.error('Error downloading file from Telegram:', error);
      throw error;
    }
  }
  
  // Delete a file from Telegram
  static async deleteFile(fileInfo) {
    try {
      // Delete the message containing the file
      await client.deleteMessages('me', [parseInt(fileInfo.telegram_message_id)], {
        revoke: true
      });
      
      return { deleted: true };
    } catch (error) {
      console.error('Error deleting file from Telegram:', error);
      throw error;
    }
  }
  
  // Create a folder (just a message with a special format)
  static async createFolder(folderName) {
    try {
      // We'll use a special message format to represent folders
      const message = await client.sendMessage('me', {
        message: `#TeleDriveFolder: ${folderName}`
      });
      
      return {
        telegram_message_id: message.id.toString(),
        telegram_chat_id: 'me',
        name: folderName
      };
    } catch (error) {
      console.error('Error creating folder in Telegram:', error);
      throw error;
    }
  }
}

module.exports = TelegramService; 