const File = require('../models/file');
const TelegramService = require('../services/telegramService');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Temporary directory for file operations
const tempDir = path.join(os.tmpdir(), 'teledrive');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

class FileController {
  // Upload a file
  static async uploadFile(req, res) {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const uploadedFile = req.files.file;
      const { parent_folder } = req.body;
      
      // Save the file to a temporary location
      const tempFilePath = path.join(tempDir, uploadedFile.name);
      await uploadedFile.mv(tempFilePath);
      
      // Upload the file to Telegram
      const telegramFileInfo = await TelegramService.uploadFile(tempFilePath, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });
      
      // Create a record in the database
      const fileData = {
        name: uploadedFile.name,
        mime_type: uploadedFile.mimetype,
        size: uploadedFile.size,
        parent_folder,
        ...telegramFileInfo
      };
      
      const file = await File.create(fileData);
      
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      res.status(201).json(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Download a file
  static async downloadFile(req, res) {
    try {
      const { id } = req.params;
      
      // Get the file information from the database
      const file = await File.getById(id);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (file.is_folder) {
        return res.status(400).json({ error: 'Cannot download a folder' });
      }
      
      // Create a temporary file path
      const tempFilePath = path.join(tempDir, file.name);
      
      // Download the file from Telegram
      await TelegramService.downloadFile(file, tempFilePath, (progress) => {
        console.log(`Download progress: ${progress}%`);
      });
      
      // Send the file to the client
      res.download(tempFilePath, file.name, (err) => {
        if (err) {
          console.error('Error sending file:', err);
        }
        
        // Clean up the temporary file
        fs.unlinkSync(tempFilePath);
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // List files in a folder
  static async listFiles(req, res) {
    try {
      const { folder_id } = req.query;
      
      // Get files from the database
      const files = await File.getByParentFolder(folder_id || null);
      
      res.json(files);
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Create a folder
  static async createFolder(req, res) {
    try {
      const { name, parent_folder } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Folder name is required' });
      }
      
      // Create a folder in Telegram
      const telegramFolderInfo = await TelegramService.createFolder(name);
      
      // Create a record in the database
      const folderData = {
        name,
        parent_folder,
        is_folder: 1,
        ...telegramFolderInfo
      };
      
      const folder = await File.create(folderData);
      
      res.status(201).json(folder);
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Delete a file or folder
  static async deleteFile(req, res) {
    try {
      const { id } = req.params;
      
      // Get the file information from the database
      const file = await File.getById(id);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // If it's a folder, check if it's empty
      if (file.is_folder) {
        const children = await File.getByParentFolder(id);
        
        if (children.length > 0) {
          return res.status(400).json({ error: 'Cannot delete non-empty folder' });
        }
      }
      
      // Delete the file from Telegram
      await TelegramService.deleteFile(file);
      
      // Delete the record from the database
      await File.delete(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Search for files
  static async searchFiles(req, res) {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      // Search for files in the database
      const files = await File.search(query);
      
      res.json(files);
    } catch (error) {
      console.error('Error searching files:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Rename a file or folder
  static async renameFile(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'New name is required' });
      }
      
      // Update the record in the database
      const file = await File.update(id, { name });
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.json(file);
    } catch (error) {
      console.error('Error renaming file:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Move a file or folder
  static async moveFile(req, res) {
    try {
      const { id } = req.params;
      const { parent_folder } = req.body;
      
      // Update the record in the database
      const file = await File.update(id, { parent_folder });
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.json(file);
    } catch (error) {
      console.error('Error moving file:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = FileController; 