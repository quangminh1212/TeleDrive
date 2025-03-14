/**
 * Clean uploads directory script
 * 
 * This script cleans up the uploads directory by synchronizing the files in the uploads directory
 * with the Telegram bot. It sends all files to Telegram and then removes them from local storage,
 * while keeping their metadata in the files.json database.
 */

const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATA_DIR = process.env.DATA_DIR || 'data';
const UPLOADS_DIR = 'uploads';

// File paths
const dataDir = path.join(__dirname, DATA_DIR);
const uploadsDir = path.join(__dirname, UPLOADS_DIR);
const filesDbPath = path.join(dataDir, 'files.json');

// Ensure directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory: ${dataDir}`);
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

// Read the files database
function readFilesDb() {
  try {
    if (fs.existsSync(filesDbPath)) {
      const content = fs.readFileSync(filesDbPath, 'utf8');
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    console.error('Error reading files database:', error);
    return [];
  }
}

// Save the files database
function saveFilesDb(filesData) {
  try {
    fs.writeFileSync(filesDbPath, JSON.stringify(filesData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving files database:', error);
    return false;
  }
}

async function main() {
  console.log('Starting uploads directory cleanup...');
  
  // Initialize Telegram bot
  if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token') {
    console.error('Error: BOT_TOKEN not provided or invalid. Please set it in .env file.');
    process.exit(1);
  }
  
  const bot = new Telegraf(BOT_TOKEN);
  
  try {
    // Test bot connection
    await bot.telegram.getMe();
    console.log('Connected to Telegram bot successfully.');
    
    // Read files database
    const filesData = readFilesDb();
    console.log(`Found ${filesData.length} files in database.`);
    
    // Get files in uploads directory
    const uploadFiles = fs.readdirSync(uploadsDir)
      .filter(file => !file.startsWith('.') && file !== '.gitkeep');
    console.log(`Found ${uploadFiles.length} files in uploads directory.`);
    
    // Process each file
    let processedCount = 0;
    let errorCount = 0;
    
    for (const fileName of uploadFiles) {
      const filePath = path.join(uploadsDir, fileName);
      
      // Find corresponding file in database
      const fileRecord = filesData.find(f => f.fileName === fileName);
      
      if (!fileRecord) {
        console.log(`File not found in database: ${fileName}. Skipping.`);
        continue;
      }
      
      // Check if file already has Telegram fileId
      if (fileRecord.fileId && fileRecord.storedOnTelegram) {
        console.log(`File already stored on Telegram: ${fileName}. Removing local copy.`);
        fs.unlinkSync(filePath);
        processedCount++;
        continue;
      }
      
      try {
        console.log(`Processing file: ${fileName}`);
        
        // Get file stats
        const stats = fs.statSync(filePath);
        
        // Skip if file is too large (Telegram limit is 20MB)
        if (stats.size > 20 * 1024 * 1024) {
          console.log(`File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB): ${fileName}. Skipping.`);
          errorCount++;
          continue;
        }
        
        // Find a chat to send the file to
        const updates = await bot.telegram.getUpdates(0, 100, 0, ["message"]);
        let chatId = null;
        
        for (const update of updates) {
          if (update.message && update.message.chat) {
            chatId = update.message.chat.id;
            break;
          }
        }
        
        if (!chatId) {
          console.error('Error: No chat ID found. Please send a message to the bot first.');
          process.exit(1);
        }
        
        // Prepare file display name
        let displayName = fileRecord.originalFileName || fileName;
        try {
          if (displayName.includes('%')) {
            displayName = decodeURIComponent(displayName);
          }
        } catch (e) {
          console.error('Error decoding file name:', e);
        }
        
        // Send file to Telegram
        console.log(`Sending file to Telegram: ${displayName}`);
        const sentMessage = await bot.telegram.sendDocument(
          chatId,
          { source: filePath },
          { 
            caption: `📁 File: "${displayName}"\n👤 Uploaded by: ${fileRecord.uploadedBy.firstName} ${fileRecord.uploadedBy.lastName || ''}\n📅 Date: ${new Date(fileRecord.uploadDate).toLocaleString()}`,
            file_name: displayName
          }
        );
        
        // Update file record
        fileRecord.fileId = sentMessage.document.file_id;
        fileRecord.telegramMessageId = sentMessage.message_id;
        fileRecord.chatId = chatId;
        fileRecord.sentToTelegram = true;
        fileRecord.storedOnTelegram = true;
        fileRecord.localFileStored = false;
        
        // Delete local file
        fs.unlinkSync(filePath);
        
        console.log(`Successfully processed file: ${fileName}`);
        processedCount++;
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);
        errorCount++;
      }
    }
    
    // Save updated database
    saveFilesDb(filesData);
    
    console.log('Cleanup complete.');
    console.log(`Processed ${processedCount} files with ${errorCount} errors.`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    // Stop bot
    bot.stop();
  }
}

// Run main function
main().catch(console.error); 