onst fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const { tdlibStorage } = require('../storage/tdlib-client');
const File = require('../db/models/File');
const User = require('../db/models/User');
const logger = require('../common/logger');
const { config } = require('../common/config');

// Promisify fs functions
const unlinkAsync = promisify(fs.unlink);
const statAsync = promisify(fs.stat);

/**
 * FileService class to handle file operations
 */
class FileService {
  /**
   * Upload a file to Telegram
   * @param {Object} fileData - File data from multer
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Uploaded file data
   */
  async uploadFile(fileData, user) {
    try {
      logger.info(`Chuáº©n bá»‹ táº£i lÃªn file: ${fileData.originalname} cho ngÆ°á»i dÃ¹ng: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Kiá»ƒm tra file
      if (!fileData || !fileData.path || !fileData.size) {
        throw new Error('Dá»¯ liá»‡u file khÃ´ng há»£p lá»‡ hoáº·c bá»‹ thiáº¿u');
      }
      
      // Kiá»ƒm tra náº¿u file cÃ³ tá»“n táº¡i
      if (!fs.existsSync(fileData.path)) {
        throw new Error(`File khÃ´ng tá»“n táº¡i: ${fileData.path}`);
      }
      
      // Kiá»ƒm tra láº¡i kÃ­ch thÆ°á»›c file tá»« há»‡ thá»‘ng
      try {
        const stats = await statAsync(fileData.path);
        if (stats.size !== fileData.size) {
          logger.warn(`KÃ­ch thÆ°á»›c file khÃ´ng khá»›p: ${fileData.size} (reported) vs ${stats.size} (actual)`);
          fileData.size = stats.size; // Cáº­p nháº­t kÃ­ch thÆ°á»›c chÃ­nh xÃ¡c
        }
      } catch (statError) {
        logger.error(`Lá»—i khi kiá»ƒm tra kÃ­ch thÆ°á»›c file: ${statError.message}`);
        throw new Error(`KhÃ´ng thá»ƒ Ä‘á»c file: ${statError.message}`);
      }
      
      // Check if user has enough storage
      if (!user.hasEnoughStorage(fileData.size)) {
        throw new Error('KhÃ´ng Ä‘á»§ dung lÆ°á»£ng lÆ°u trá»¯. Vui lÃ²ng xÃ³a bá»›t file hoáº·c nÃ¢ng cáº¥p tÃ i khoáº£n.');
      }

      // Xá»­ lÃ½ táº£i lÃªn file lá»›n (split file náº¿u cáº§n)
      if (fileData.size > 50 * 1024 * 1024) { // Náº¿u file lá»›n hÆ¡n 50MB
        return await this.handleLargeFileUpload(fileData, user);
      }
      
      // Táº¡o báº£n ghi táº¡m thá»i trong cÆ¡ sá»Ÿ dá»¯ liá»‡u
      const tempFile = await File.create({
        name: fileData.originalname,
        mimeType: fileData.mimetype,
        size: fileData.size,
        createdBy: user._id,
        isUploading: true
      });
      
      logger.info(`ÄÃ£ táº¡o báº£n ghi táº¡m thá»i cho file: ${tempFile._id}`);
      
      try {
        // Upload file sá»­ dá»¥ng TDLib
        const telegramFile = await tdlibStorage.uploadFile(
          fileData.path,
          `Uploaded by: ${user.firstName} (${user.telegramId || user._id})`
        );
        
        // Cáº­p nháº­t báº£n ghi vá»›i thÃ´ng tin tá»« Telegram
        const file = await File.findByIdAndUpdate(
          tempFile._id,
          {
            telegramFileId: telegramFile.fileId,
            telegramMessageId: telegramFile.messageId,
            isUploading: false
          },
          { new: true }
        );
        
        // Update user storage usage
        await user.addStorageUsed(fileData.size);
        
        // Delete temporary file
        try {
          await unlinkAsync(fileData.path);
          logger.info(`ÄÃ£ xÃ³a file táº¡m: ${fileData.path}`);
        } catch (error) {
          logger.warn(`Failed to delete temporary file: ${fileData.path}`);
        }
        
        logger.info(`File uploaded successfully: ${file._id}`);
        
        return file;
      } catch (uploadError) {
        // Náº¿u upload tháº¥t báº¡i, xÃ³a báº£n ghi táº¡m
        await File.findByIdAndRemove(tempFile._id);
        throw uploadError; // Re-throw Ä‘á»ƒ xá»­ lÃ½ á»Ÿ má»©c cao hÆ¡n
      }
    } catch (error) {
      // Delete temporary file if it exists
      if (fileData && fileData.path && fs.existsSync(fileData.path)) {
        try {
          await unlinkAsync(fileData.path);
          logger.info(`ÄÃ£ xÃ³a file táº¡m sau khi xáº£y ra lá»—i: ${fileData.path}`);
        } catch (unlinkError) {
          logger.warn(`Failed to delete temporary file after error: ${fileData.path}`);
        }
      }
      
      logger.error(`Error uploading file: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * Xá»­ lÃ½ táº£i lÃªn file lá»›n báº±ng cÃ¡ch chia thÃ nh nhiá»u pháº§n
   * @param {Object} fileData - File data from multer
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Uploaded file data
   */
  async handleLargeFileUpload(fileData, user) {
    // Giáº£m kÃ­ch thÆ°á»›c chunk tá»« 20MB xuá»‘ng 10MB Ä‘á»ƒ trÃ¡nh lá»—i khi táº£i lÃªn
    const chunkSize = 10 * 1024 * 1024; // 10MB má»—i pháº§n
    const totalChunks = Math.ceil(fileData.size / chunkSize);
    const tempFolder = path.join(config.paths.temp, 'chunks', crypto.randomBytes(8).toString('hex'));
    const chunks = [];
    let telegramMessages = [];
    
    logger.info(`Chia file lá»›n thÃ nh ${totalChunks} pháº§n, má»—i pháº§n ${chunkSize / (1024 * 1024)}MB`);
    
    try {
      // Táº¡o thÆ° má»¥c táº¡m cho cÃ¡c pháº§n
      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }
      
      // Táº¡o báº£n ghi chÃ­nh cho file
      const parentFile = await File.create({
        name: fileData.originalname,
        mimeType: fileData.mimetype,
        size: fileData.size,
        createdBy: user._id,
        isUploading: true,
        isMultipart: true,
        totalParts: totalChunks,
        uploadedParts: 0
      });
      
      // Sá»­ dá»¥ng phÆ°Æ¡ng phÃ¡p chia file an toÃ n hÆ¡n vá»›i stream
      logger.info('Báº¯t Ä‘áº§u chia file thÃ nh cÃ¡c pháº§n nhá»...');
      
      const fileStream = fs.createReadStream(fileData.path, {
        highWaterMark: chunkSize  // Äá»c theo tá»«ng chunk cÃ³ kÃ­ch thÆ°á»›c cá»¥ thá»ƒ
      });
      
      let chunkIndex = 0;
      let bytesProcessed = 0;
      
      // Táº¡o thÆ° má»¥c táº¡m cho cÃ¡c pháº§n náº¿u chÆ°a tá»“n táº¡i
      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }
      
      // Xá»­ lÃ½ tá»«ng chunk dá»¯ liá»‡u
      for await (const chunk of fileStream) {
        // LÆ°u chunk vÃ o file táº¡m
        const chunkPath = path.join(tempFolder, `chunk_${chunkIndex}.bin`);
        fs.writeFileSync(chunkPath, chunk);
        chunks.push(chunkPath);
        
        bytesProcessed += chunk.length;
        
        logger.info(`ÄÃ£ táº¡o pháº§n ${chunkIndex + 1}/${totalChunks}, kÃ­ch thÆ°á»›c: ${chunk.length} bytes (Tá»•ng: ${bytesProcessed}/${fileData.size} bytes)`);
        
        // Cáº­p nháº­t tiáº¿n Ä‘á»™ xá»­ lÃ½
        await File.findByIdAndUpdate(
          parentFile._id,
          { 
            uploadProgress: Math.round(bytesProcessed * 50 / fileData.size) // 50% cho viá»‡c chia file
          }
        );
        
        chunkIndex++;
      }
      
      logger.info(`ÄÃ£ hoÃ n thÃ nh viá»‡c chia file thÃ nh ${chunks.length} pháº§n`);
      
      // Táº£i lÃªn tá»«ng pháº§n lÃªn Telegram sá»­ dá»¥ng TDLib
      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunkPath = chunks[i];
          const caption = `Part ${i + 1}/${chunks.length} of ${fileData.originalname} (${user.telegramId || user._id})`;
          
          logger.info(`Äang táº£i lÃªn pháº§n ${i + 1}/${chunks.length} - ${chunkPath}`);
          
          // Upload vá»›i tá»‘i Ä‘a 5 láº§n thá»­ láº¡i
          let retries = 5;
          let telegramFile;
          let lastError;
          
          while (retries > 0 && !telegramFile) {
            try {
              telegramFile = await tdlibStorage.uploadFile(chunkPath, caption);
            } catch (err) {
              lastError = err;
              retries--;
              logger.warn(`Lá»—i khi táº£i lÃªn pháº§n ${i + 1}, cÃ²n ${retries} láº§n thá»­ láº¡i: ${err.message}`);
              
              if (retries > 0) {
                // TÄƒng thá»i gian chá» giá»¯a cÃ¡c láº§n thá»­
                const waitTime = 5000 * (6 - retries); // 5s, 10s, 15s, 20s, 25s
                logger.info(`Äá»£i ${waitTime/1000}s trÆ°á»›c khi thá»­ láº¡i...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
            }
          }
          
          if (!telegramFile) {
            throw lastError || new Error(`KhÃ´ng thá»ƒ táº£i lÃªn pháº§n ${i + 1} sau nhiá»u láº§n thá»­`);
          }
          
          telegramMessages.push({
            index: i,
            messageId: telegramFile.messageId,
            fileId: telegramFile.fileId
          });
          
          // Cáº­p nháº­t tiáº¿n Ä‘á»™ - 50% cho viá»‡c chia file, 50% cho viá»‡c táº£i lÃªn
          await File.findByIdAndUpdate(
            parentFile._id,
            { 
              $inc: { uploadedParts: 1 },
              $set: { uploadProgress: 50 + Math.round((i + 1) * 50 / chunks.length) }
            }
          );
          
          logger.info(`ÄÃ£ táº£i lÃªn pháº§n ${i + 1}/${chunks.length} thÃ nh cÃ´ng`);
          
          // ThÃªm thá»i gian nghá»‰ giá»¯a cÃ¡c láº§n táº£i lÃªn Ä‘á»ƒ trÃ¡nh bá»‹ giá»›i háº¡n táº§n suáº¥t
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          logger.error(`Lá»—i táº£i lÃªn pháº§n ${i + 1}/${chunks.length}: ${error.message}`);
          
          // XÃ³a cÃ¡c tin nháº¯n Ä‘Ã£ táº£i lÃªn náº¿u cÃ³ lá»—i
          for (const message of telegramMessages) {
            try {
              await tdlibStorage.deleteFile(message.messageId);
              logger.info(`ÄÃ£ xÃ³a pháº§n Ä‘Ã£ táº£i lÃªn trÆ°á»›c Ä‘Ã³ (messageId: ${message.messageId})`);
            } catch (deleteError) {
              logger.warn(`KhÃ´ng thá»ƒ xÃ³a pháº§n Ä‘Ã£ táº£i lÃªn: ${deleteError.message}`);
            }
          }
          
          // Cáº­p nháº­t tráº¡ng thÃ¡i file
          await File.findByIdAndUpdate(
            parentFile._id,
            { isUploading: false, error: error.message }
          );
          
          throw new Error(`Lá»—i khi táº£i lÃªn pháº§n ${i + 1}/${chunks.length}: ${error.message}`);
        }
      }
      
      // Sáº¯p xáº¿p cÃ¡c tin nháº¯n theo thá»© tá»± Ä‘Ãºng
      telegramMessages.sort((a, b) => a.index - b.index);
      
      // LÆ°u danh sÃ¡ch file ID vÃ  message ID vÃ o cÆ¡ sá»Ÿ dá»¯ liá»‡u
      const fileIds = telegramMessages.map(message => message.fileId);
      const messageIds = telegramMessages.map(message => message.messageId);
      
      const updatedFile = await File.findByIdAndUpdate(
        parentFile._id,
        { 
          isUploading: false,
          uploadedParts: chunks.length,
          uploadProgress: 100,
          telegramFileIds: fileIds,
          telegramMessageIds: messageIds
        },
        { new: true }
      );
      
      // Cáº­p nháº­t dung lÆ°á»£ng Ä‘Ã£ sá»­ dá»¥ng
      await user.addStorageUsed(fileData.size);
      
      // XÃ³a file táº¡m vÃ  thÆ° má»¥c táº¡m
      try {
        // XÃ³a file gá»‘c
        if (fs.existsSync(fileData.path)) {
          await unlinkAsync(fileData.path);
          logger.info(`ÄÃ£ xÃ³a file gá»‘c: ${fileData.path}`);
        }
        
        // XÃ³a cÃ¡c pháº§n
        for (const chunkPath of chunks) {
          if (fs.existsSync(chunkPath)) {
            await unlinkAsync(chunkPath);
            logger.info(`ÄÃ£ xÃ³a pháº§n: ${chunkPath}`);
          }
        }
        
        // XÃ³a thÆ° má»¥c táº¡m
        if (fs.existsSync(tempFolder)) {
          fs.rmdirSync(tempFolder);
          logger.info(`ÄÃ£ xÃ³a thÆ° má»¥c táº¡m: ${tempFolder}`);
        }
      } catch (error) {
        logger.warn(`Lá»—i khi xÃ³a file táº¡m: ${error.message}`);
      }
      
      logger.info(`Táº£i lÃªn file Ä‘a pháº§n thÃ nh cÃ´ng: ${updatedFile._id}`);
      
      return updatedFile;
    } catch (error) {
      logger.error(`Lá»—i khi xá»­ lÃ½ file lá»›n: ${error.message}`);
      
      // XÃ³a file táº¡m vÃ  thÆ° má»¥c táº¡m
      try {
        // XÃ³a cÃ¡c pháº§n
        for (const chunkPath of chunks) {
          if (fs.existsSync(chunkPath)) {
            await unlinkAsync(chunkPath);
          }
        }
        
        // XÃ³a thÆ° má»¥c táº¡m
        if (fs.existsSync(tempFolder)) {
          fs.rmdirSync(tempFolder);
        }
        
        // XÃ³a file gá»‘c
        if (fs.existsSync(fileData.path)) {
          await unlinkAsync(fileData.path);
        }
      } catch (cleanupError) {
        logger.warn(`Lá»—i khi dá»n dáº¹p file táº¡m: ${cleanupError.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Táº£i xuá»‘ng file tá»« Telegram
   * @param {string} fileId - ID cá»§a file
   * @param {Object} user - User object
   * @returns {Promise<string>} - Path to downloaded file
   */
  async downloadFile(fileId, user) {
    try {
      logger.info(`Downloading file: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File khÃ´ng tá»“n táº¡i');
      }
      
      // Check if file is deleted
      if (file.isDeleted) {
        throw new Error('File Ä‘Ã£ bá»‹ xÃ³a');
      }
      
      // Check if user has access to file (owner or public file)
      if (!file.isPublic && file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p file nÃ y');
      }
      
      // Kiá»ƒm tra xem file cÃ³ pháº£i lÃ  file Ä‘a pháº§n khÃ´ng
      if (file.isMultipart && file.telegramFileIds && file.telegramFileIds.length > 0) {
        return await this.downloadMultipartFile(file, user);
      }
      
      // Create user-specific download folder
      const userDownloadDir = path.join(config.paths.downloads, user._id.toString());
      if (!fs.existsSync(userDownloadDir)) {
        fs.mkdirSync(userDownloadDir, { recursive: true });
      }
      
      // XÃ¡c Ä‘á»‹nh output path
      const outputPath = path.join(userDownloadDir, file.name);
      
      // Download file using TDLib
      const filePath = await tdlibStorage.downloadFile(file.telegramFileId, outputPath);
      
      logger.info(`File downloaded successfully: ${filePath}`);
      
      // Cáº­p nháº­t thá»‘ng kÃª táº£i xuá»‘ng
      await File.findByIdAndUpdate(fileId, {
        lastDownloadedAt: new Date(),
        $inc: { downloadCount: 1 }
      });
      
      return filePath;
    } catch (error) {
      logger.error(`Error downloading file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Táº£i xuá»‘ng file Ä‘a pháº§n tá»« Telegram vÃ  ghÃ©p láº¡i
   * @param {Object} file - ThÃ´ng tin file tá»« cÆ¡ sá»Ÿ dá»¯ liá»‡u
   * @param {Object} user - User object
   * @returns {Promise<string>} - Path to merged file
   */
  async downloadMultipartFile(file, user) {
    logger.info(`Táº£i xuá»‘ng file Ä‘a pháº§n: ${file._id} (${file.name})`);
    
    // Táº¡o thÆ° má»¥c táº¡m Ä‘á»ƒ lÆ°u cÃ¡c pháº§n
    const tempDir = path.join(config.paths.temp, 'downloads', crypto.randomBytes(8).toString('hex'));
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Táº¡o thÆ° má»¥c download cho ngÆ°á»i dÃ¹ng
    const userDownloadDir = path.join(config.paths.downloads, user._id.toString());
    if (!fs.existsSync(userDownloadDir)) {
      fs.mkdirSync(userDownloadDir, { recursive: true });
    }
    
    const outputPath = path.join(userDownloadDir, file.name);
    const parts = [];
    
    try {
      // Táº£i xuá»‘ng tá»«ng pháº§n
      logger.info(`Táº£i xuá»‘ng ${file.telegramFileIds.length} pháº§n cá»§a file ${file.name}`);
      
      for (let i = 0; i < file.telegramFileIds.length; i++) {
        const fileId = file.telegramFileIds[i];
        const partPath = path.join(tempDir, `part_${i}.bin`);
        
        logger.info(`Äang táº£i xuá»‘ng pháº§n ${i + 1}/${file.telegramFileIds.length} - ${fileId}`);
        
        // Thá»­ táº£i xuá»‘ng tá»‘i Ä‘a 3 láº§n
        let attempts = 0;
        let downloaded = false;
        let error;
        
        while (attempts < 3 && !downloaded) {
          try {
            const downloadedPart = await tdlibStorage.downloadFile(fileId, partPath);
            parts.push(downloadedPart);
            downloaded = true;
            logger.info(`Pháº§n ${i + 1} Ä‘Ã£ Ä‘Æ°á»£c táº£i xuá»‘ng: ${downloadedPart}`);
          } catch (err) {
            attempts++;
            error = err;
            logger.warn(`Lá»—i khi táº£i xuá»‘ng pháº§n ${i + 1}, láº§n thá»­ ${attempts}/3: ${err.message}`);
            
            // Chá» 1 giÃ¢y trÆ°á»›c khi thá»­ láº¡i
            if (attempts < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!downloaded) {
          throw error || new Error(`KhÃ´ng thá»ƒ táº£i xuá»‘ng pháº§n ${i + 1}`);
        }
      }
      
      // GhÃ©p cÃ¡c pháº§n láº¡i thÃ nh file hoÃ n chá»‰nh
      logger.info(`Äang ghÃ©p ${parts.length} pháº§n thÃ nh file hoÃ n chá»‰nh: ${outputPath}`);
      
      // Náº¿u file Ä‘áº§u ra Ä‘Ã£ tá»“n táº¡i, xÃ³a nÃ³
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      // Sá»­ dá»¥ng writeStream Ä‘á»ƒ ghÃ©p file
      const outStream = fs.createWriteStream(outputPath);
      
      for (let i = 0; i < parts.length; i++) {
        const partData = fs.readFileSync(parts[i]);
        outStream.write(partData);
      }
      
      outStream.end();
      
      // Äá»£i stream káº¿t thÃºc
      await new Promise((resolve, reject) => {
        outStream.on('finish', resolve);
        outStream.on('error', reject);
      });
      
      logger.info(`ÄÃ£ ghÃ©p thÃ nh cÃ´ng cÃ¡c pháº§n thÃ nh file: ${outputPath}`);
      
      // Cáº­p nháº­t thá»‘ng kÃª táº£i xuá»‘ng
      await File.findByIdAndUpdate(file._id, {
        lastDownloadedAt: new Date(),
        $inc: { downloadCount: 1 }
      });
      
      // Dá»n dáº¹p cÃ¡c pháº§n táº¡m thá»i
      try {
        for (const part of parts) {
          if (fs.existsSync(part)) {
            fs.unlinkSync(part);
          }
        }
        
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
        
        logger.info('ÄÃ£ dá»n dáº¹p cÃ¡c file táº¡m');
      } catch (cleanupError) {
        logger.warn(`Lá»—i khi dá»n dáº¹p cÃ¡c file táº¡m: ${cleanupError.message}`);
      }
      
      return outputPath;
    } catch (error) {
      logger.error(`Lá»—i khi táº£i xuá»‘ng vÃ  ghÃ©p file Ä‘a pháº§n: ${error.message}`);
      
      // Thá»­ dá»n dáº¹p náº¿u cÃ³ lá»—i
      try {
        // XÃ³a cÃ¡c pháº§n táº¡m náº¿u tá»“n táº¡i
        for (const part of parts) {
          if (fs.existsSync(part)) {
            fs.unlinkSync(part);
          }
        }
        
        // XÃ³a thÆ° má»¥c táº¡m
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
        
        // XÃ³a file Ä‘áº§u ra náº¿u Ä‘Ã£ táº¡o má»™t pháº§n
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (cleanupError) {
        logger.warn(`Lá»—i khi dá»n dáº¹p sau lá»—i: ${cleanupError.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Delete a file
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @param {boolean} permanent - Whether to permanently delete the file
   * @returns {Promise<Object>} - Deleted file data
   */
  async deleteFile(fileId, user, permanent = false) {
    try {
      logger.info(`Deleting file: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id}), permanent: ${permanent}`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File khÃ´ng tá»“n táº¡i');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Báº¡n khÃ´ng cÃ³ quyá»n xÃ³a file nÃ y');
      }
      
      if (permanent) {
        // XÃ³a file Ä‘a pháº§n
        if (file.isMultipart && file.telegramMessageIds && file.telegramMessageIds.length > 0) {
          logger.info(`Äang xÃ³a vÄ©nh viá»…n file Ä‘a pháº§n: ${fileId} (${file.telegramMessageIds.length} pháº§n)`);
          
          for (const messageId of file.telegramMessageIds) {
            try {
              await tdlibStorage.deleteFile(messageId);
              logger.info(`ÄÃ£ xÃ³a pháº§n vá»›i messageId: ${messageId}`);
            } catch (error) {
              logger.warn(`KhÃ´ng thá»ƒ xÃ³a pháº§n vá»›i messageId: ${messageId} - ${error.message}`);
              // Tiáº¿p tá»¥c xÃ³a cÃ¡c pháº§n khÃ¡c
            }
          }
        } else {
          // Permanently delete file from Telegram
          await tdlibStorage.deleteFile(file.telegramMessageId);
        }
        
        // Remove file from database
        await file.deleteOne();
        
        // Update user storage usage
        await user.subtractStorageUsed(file.size);
        
        logger.info(`File permanently deleted: ${fileId}`);
      } else {
        // Soft delete file (move to trash)
        await file.softDelete();
        
        logger.info(`File moved to trash: ${fileId}`);
      }
      
      return file;
    } catch (error) {
      logger.error(`Error deleting file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Restore a file from trash
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Restored file data
   */
  async restoreFile(fileId, user) {
    try {
      logger.info(`Restoring file: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File khÃ´ng tá»“n táº¡i');
      }
      
      // Check if file is in trash
      if (!file.isDeleted) {
        throw new Error('File khÃ´ng á»Ÿ trong thÃ¹ng rÃ¡c');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Báº¡n khÃ´ng cÃ³ quyá»n khÃ´i phá»¥c file nÃ y');
      }
      
      // Restore file
      await file.restore();
      
      logger.info(`File restored: ${fileId}`);
      
      return file;
    } catch (error) {
      logger.error(`Error restoring file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Empty user's trash (permanently delete all trashed files)
   * @param {Object} user - User object
   * @returns {Promise<number>} - Number of files deleted
   */
  async emptyTrash(user) {
    try {
      logger.info(`Emptying trash for user: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Find all trashed files for this user
      const trashedFiles = await File.find({ 
        createdBy: user._id,
        isDeleted: true
      });
      
      if (trashedFiles.length === 0) {
        return 0;
      }
      
      // For each file, permanently delete from Telegram
      let totalSize = 0;
      for (const file of trashedFiles) {
        await tdlibStorage.deleteFile(file.telegramMessageId);
        totalSize += file.size;
      }
      
      // Delete all files from database
      await File.deleteMany({
        createdBy: user._id,
        isDeleted: true
      });
      
      // Update user storage usage
      await user.subtractStorageUsed(totalSize);
      
      logger.info(`Emptied trash for user: ${user.firstName}, deleted ${trashedFiles.length} files`);
      
      return trashedFiles.length;
    } catch (error) {
      logger.error(`Error emptying trash: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get file info
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @returns {Promise<Object>} - File data
   */
  async getFileInfo(fileId, user) {
    try {
      logger.info(`Getting file info: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File khÃ´ng tá»“n táº¡i');
      }
      
      // Check if user has access to file (owner or public file)
      if (!file.isPublic && file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p file nÃ y');
      }
      
      logger.info(`File info retrieved: ${fileId}`);
      
      return file;
    } catch (error) {
      logger.error(`Error getting file info: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * List files for a user
   * @param {Object} user - User object
   * @param {Object} options - List options (page, limit, sortBy, sortOrder, search, tag)
   * @returns {Promise<Object>} - List of files and pagination data
   */
  async listFiles(user, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
        tag = '',
        deleted = false,
      } = options;
      
      logger.info(`Listing files for user: ${user.firstName} (${user.telegramId || user._id}), page: ${page}, limit: ${limit}`);
      
      // Create base query
      let query = {
        createdBy: user._id,
        isDeleted: deleted === true,
      };
      
      // Add search filter if provided
      if (search) {
        query.$text = { $search: search };
      }
      
      // Add tag filter if provided
      if (tag) {
        query.tags = tag;
      }
      
      // Create sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // If searching, add text score to sort
      if (search) {
        sort.score = { $meta: 'textScore' };
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Get total count
      const total = await File.countDocuments(query);
      
      // Get files
      let files;
      if (search) {
        files = await File.find(
          query,
          { score: { $meta: 'textScore' } }
        )
          .sort(sort)
          .skip(skip)
          .limit(limit);
      } else {
        files = await File.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit);
      }
      
      // Calculate pagination data
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      logger.info(`Listed ${files.length} files for user`);
      
      return {
        files,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      logger.error(`Error listing files: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Share a file
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @param {number} expiresInHours - Number of hours until the share link expires (0 for no expiration)
   * @returns {Promise<Object>} - File with share link
   */
  async shareFile(fileId, user, expiresInHours = 24) {
    try {
      logger.info(`Sharing file: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File khÃ´ng tá»“n táº¡i');
      }
      
      // Check if file is deleted
      if (file.isDeleted) {
        throw new Error('File Ä‘Ã£ bá»‹ xÃ³a');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Báº¡n khÃ´ng cÃ³ quyá»n chia sáº» file nÃ y');
      }
      
      // Generate share link
      await file.generateShareLink(expiresInHours);
      
      logger.info(`File shared: ${fileId}, share link: ${file.shareLink}`);
      
      return file;
    } catch (error) {
      logger.error(`Error sharing file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get file by share link
   * @param {string} shareLink - Share link token
   * @returns {Promise<Object>} - File data
   */
  async getFileByShareLink(shareLink) {
    try {
      logger.info(`Getting file by share link: ${shareLink}`);
      
      // Find file in database
      const file = await File.findOne({ shareLink });
      
      if (!file) {
        throw new Error('ÄÆ°á»ng dáº«n chia sáº» khÃ´ng há»£p lá»‡');
      }
      
      // Check if file is deleted
      if (file.isDeleted) {
        throw new Error('File Ä‘Ã£ bá»‹ xÃ³a');
      }
      
      // Check if share link is expired
      if (file.isShareExpired()) {
        throw new Error('ÄÆ°á»ng dáº«n chia sáº» Ä‘Ã£ háº¿t háº¡n');
      }
      
      logger.info(`File retrieved by share link: ${file._id}`);
      
      return file;
    } catch (error) {
      logger.error(`Error getting file by share link: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update file metadata
   * @param {string} fileId - File ID in database
   * @param {Object} user - User object
   * @param {Object} metadata - File metadata to update
   * @returns {Promise<Object>} - Updated file data
   */
  async updateFileMetadata(fileId, user, metadata) {
    try {
      logger.info(`Updating file metadata: ${fileId} for user: ${user.firstName} (${user.telegramId || user._id})`);
      
      // Find file in database
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error('File khÃ´ng tá»“n táº¡i');
      }
      
      // Check if file is deleted
      if (file.isDeleted) {
        throw new Error('File Ä‘Ã£ bá»‹ xÃ³a');
      }
      
      // Check if user has access to file
      if (file.createdBy.toString() !== user._id.toString()) {
        throw new Error('Báº¡n khÃ´ng cÃ³ quyá»n cáº­p nháº­t file nÃ y');
      }
      
      // Update fields
      if (metadata.name) file.name = metadata.name;
      if (metadata.description !== undefined) file.description = metadata.description;
      if (metadata.isPublic !== undefined) file.isPublic = metadata.isPublic;
      if (metadata.tags !== undefined) file.tags = metadata.tags;
      
      // Save changes
      await file.save();
      
      logger.info(`File metadata updated: ${fileId}`);
      
      return file;
    } catch (error) {
      logger.error(`Error updating file metadata: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new FileService(); 