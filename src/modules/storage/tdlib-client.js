const { createClient } = require('tdl');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const fetch = require('node-fetch');
const logger = require('../common/logger');
const { config } = require('../common/config');

// Promisify fs functions
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);

let TDLib;
// Thử tải TDLib Addon
try {
  // Thử tải prebuilt-tdlib trước
  try {
    const { getTdjson } = require('prebuilt-tdlib');
    const tdjsonPath = getTdjson();
    logger.info(`Đã tìm thấy tdjson tại đường dẫn: ${tdjsonPath}`);
    
    // Cấu hình tdl để sử dụng tdjson prebuilt
    require('tdl').configure({ tdjson: tdjsonPath });
    TDLib = true; // Không cần thực sự tải TDLib, chỉ cần đánh dấu là có sẵn
    logger.info('Đã cấu hình thành công tdl để sử dụng prebuilt-tdlib');
  } catch (prebuiltError) {
    logger.warn(`Không thể sử dụng prebuilt-tdlib: ${prebuiltError.message}, đang thử phương pháp khác...`);
    
    // Thử tải tdlib-addon
    try {
      const { TDLib: TDLibModule } = require('tdl-tdlib-addon');
      TDLib = TDLibModule;
      logger.info('Đã tải thành công tdlib-addon');
    } catch (addonError) {
      logger.warn(`Không thể tải thư viện tdlib-addon: ${addonError.message}`);
      
      // Nếu không có addon, thử tải phiên bản prebuilt cho Windows
      try {
        TDLib = require('tdl-tdlib-prebuilt-win32-x64');
        logger.info('Đã tải thành công tdlib-prebuilt cho Windows');
      } catch (prebuiltError) {
        logger.warn(`Không thể tải thư viện tdlib-prebuilt: ${prebuiltError.message}`);
        throw new Error('Không thể tải bất kỳ phiên bản TDLib nào');
      }
    }
  }
} catch (e) {
  logger.warn(`Không thể tải thư viện TDLib: ${e.message}`);
  logger.warn('TDLib sẽ không được sử dụng. Để sử dụng TDLib, hãy cài đặt prebuilt-tdlib hoặc biên dịch tdlib cho hệ thống của bạn.');
  TDLib = null;
}

/**
 * Lớp quản lý client TDLib
 * Cung cấp các phương thức để tải lên và tải xuống file từ Telegram sử dụng TDLib
 * Lưu ý: TDLib hỗ trợ tốt hơn cho việc tải lên và tải xuống file lớn so với Bot API
 */
class TelegramTDLibClient {
  constructor() {
    // Kiểm tra nếu có api ID và api Hash
    this.hasCredentials = !!(config.telegram.apiId && config.telegram.apiHash);
    this.isConnected = false;
    this.isLoggedIn = false;
    this.isInitializing = false;
    this.client = null;
    this.chatId = config.telegram.chatId;

    // Kiểm tra xem có TDLib không
    if (!TDLib) {
      logger.warn('TDLib native library không có sẵn trên hệ thống.');
      this.hasCredentials = false;
      return;
    }

    // Nếu không có thông tin xác thực, không tạo client
    if (!this.hasCredentials) {
      logger.warn('TELEGRAM_API_ID hoặc TELEGRAM_API_HASH không được cung cấp. TDLib sẽ không được khởi tạo.');
      return;
    }

    // Đảm bảo đường dẫn cho TDLib
    const tdlibDir = path.join(config.paths.data, 'tdlib');
    if (!fs.existsSync(tdlibDir)) {
      fs.mkdirSync(tdlibDir, { recursive: true });
    }

    try {
      // Tạo client TDLib
      const clientOptions = {
        apiId: parseInt(config.telegram.apiId, 10),
        apiHash: config.telegram.apiHash,
        tdlibParameters: {
          database_directory: tdlibDir,
          files_directory: path.join(tdlibDir, 'files'),
          use_message_database: true,
          use_secret_chats: false,
          system_language_code: 'vi',
          application_version: '1.0.0',
          device_model: 'TeleDrive Server',
          system_version: 'Node.js',
        },
        databaseEncryptionKey: config.sessionSecret
      };

      // Chỉ thêm TDLib instance nếu cần thiết
      if (TDLib !== true) {
        clientOptions.tdlibInstance = TDLib;
      }

      this.client = createClient(clientOptions);

      // Ghi lại ID chat từ token bot
      if (config.telegram.botToken && !this.chatId) {
        const botTokenParts = config.telegram.botToken.split(':');
        if (botTokenParts.length === 2) {
          this.botId = botTokenParts[0];
        }
      }
    } catch (error) {
      logger.error(`Không thể khởi tạo TDLib client: ${error.message}`);
      this.hasCredentials = false;
      this.client = null;
    }
  }

  /**
   * Khởi tạo kết nối với TDLib
   */
  async init() {
    if (!this.hasCredentials || this.isInitializing || !this.client) {
      return;
    }

    this.isInitializing = true;

    try {
      logger.info('Khởi tạo client TDLib...');

      // Lắng nghe lỗi
      this.client.on('error', error => {
        logger.error(`Lỗi TDLib: ${error.message}`);
      });

      // Kết nối đến TDLib
      await this.client.connect();
      this.isConnected = true;
      logger.info('Đã kết nối đến TDLib');

      // Đăng nhập sử dụng bot token
      if (config.telegram.botToken) {
        try {
          await this.client.invoke({
            _: 'checkAuthenticationBotToken',
            token: config.telegram.botToken
          });
          this.isLoggedIn = true;
          logger.info('Đã đăng nhập thành công vào TDLib bằng bot token');

          // Nếu chưa có chatId, tạo chat riêng tư để lưu trữ file
          if (!this.chatId) {
            const me = await this.client.invoke({
              _: 'getMe'
            });

            const chat = await this.client.invoke({
              _: 'createPrivateChat',
              user_id: me.id
            });

            this.chatId = chat.id;
            logger.info(`Đã tạo chat riêng tư với ID: ${this.chatId}`);
          }
        } catch (error) {
          logger.error(`Lỗi đăng nhập bằng bot token: ${error.message}`);
          throw error;
        }
      } else {
        logger.warn('Không có bot token, yêu cầu đăng nhập bằng phương thức khác');
        throw new Error('Không có bot token');
      }
    } catch (error) {
      logger.error(`Lỗi khởi tạo TDLib: ${error.message}`);
      this.isConnected = false;
      this.isLoggedIn = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Tải lên file sử dụng TDLib
   * @param {string} filePath - Đường dẫn đến file cần tải lên
   * @param {string} caption - Chú thích cho file
   * @returns {Promise<Object>} - Thông tin về file đã tải lên
   */
  async uploadFile(filePath, caption = '') {
    if (!this.client || !this.hasCredentials) {
      throw new Error('TDLib không khả dụng');
    }

    if (!this.isConnected || !this.isLoggedIn) {
      await this.init();
    }

    try {
      logger.info(`Tải lên file qua TDLib: ${filePath}`);

      // Kiểm tra xem file có tồn tại
      if (!fs.existsSync(filePath)) {
        throw new Error(`File không tồn tại: ${filePath}`);
      }

      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);

      // Tải lên file lên TDLib
      const uploadedFile = await this.client.invoke({
        _: 'uploadFile',
        file: {
          _: 'inputFileLocal',
          path: filePath
        },
        file_type: { _: 'fileTypeDocument' },
        priority: 1
      });

      // Đợi cho đến khi hoàn tất tải lên
      let file = uploadedFile;
      while (file.remote.is_uploading_active) {
        await new Promise(resolve => setTimeout(resolve, 500));
        file = await this.client.invoke({
          _: 'getFile',
          file_id: file.id
        });
      }

      // Kiểm tra lỗi
      if (file.remote.is_uploading_completed === false) {
        throw new Error(`Lỗi tải lên file: ${file.remote.upload_error}`);
      }

      // Gửi file như một tin nhắn
      const inputMessageContent = {
        _: 'inputMessageDocument',
        document: {
          _: 'inputFileId',
          id: file.id
        }
      };

      if (caption) {
        inputMessageContent.caption = {
          _: 'formattedText',
          text: caption
        };
      }

      // Gửi tin nhắn với file
      const message = await this.client.invoke({
        _: 'sendMessage',
        chat_id: this.chatId,
        input_message_content: inputMessageContent
      });

      // Lấy thông tin về file từ tin nhắn
      const messageContent = message.content;
      const documentFile = messageContent.document.document;

      logger.info(`File đã được tải lên thành công: ${fileName}`);

      // Trả về định dạng giống với Bot API
      return {
        messageId: message.id,
        fileId: documentFile.id,
        fileName,
        mimeType: documentFile.mime_type,
        size: stats.size,
        caption: caption || ''
      };
    } catch (error) {
      logger.error(`Lỗi tải lên file qua TDLib: ${error.message}`);
      throw error;
    }
  }

  /**
   * Tải xuống file từ TDLib
   * @param {number} fileId - ID của file trên Telegram
   * @param {string} outputPath - Đường dẫn đầu ra (tùy chọn)
   * @returns {Promise<string>} - Đường dẫn đến file đã tải xuống
   */
  async downloadFile(fileId, outputPath = null) {
    if (!this.client || !this.hasCredentials) {
      throw new Error('TDLib không khả dụng');
    }

    if (!this.isConnected || !this.isLoggedIn) {
      await this.init();
    }

    try {
      logger.info(`Tải xuống file qua TDLib với ID: ${fileId}`);

      // Tải xuống file
      const file = await this.client.invoke({
        _: 'getFile',
        file_id: parseInt(fileId, 10)
      });

      // Bắt đầu tải xuống
      await this.client.invoke({
        _: 'downloadFile',
        file_id: file.id,
        priority: 1,
        offset: 0,
        limit: 0,
        synchronous: false
      });

      // Đợi cho đến khi hoàn tất tải xuống
      let downloadedFile = file;
      while (!downloadedFile.local.is_downloading_completed) {
        await new Promise(resolve => setTimeout(resolve, 500));
        downloadedFile = await this.client.invoke({
          _: 'getFile',
          file_id: file.id
        });
      }

      // Nếu có đường dẫn đầu ra, sao chép file vào đó
      if (outputPath) {
        // Đảm bảo thư mục tồn tại
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          await mkdir(outputDir, { recursive: true });
        }
        await copyFile(downloadedFile.local.path, outputPath);
        logger.info(`File đã được tải xuống và lưu tại: ${outputPath}`);
        return outputPath;
      }

      logger.info(`File đã được tải xuống tại: ${downloadedFile.local.path}`);
      return downloadedFile.local.path;
    } catch (error) {
      logger.error(`Lỗi tải xuống file qua TDLib: ${error.message}`);
      throw error;
    }
  }

  /**
   * Xóa tin nhắn (và file) từ Telegram
   * @param {number} messageId - ID của tin nhắn cần xóa
   * @returns {Promise<boolean>} - Trạng thái thành công
   */
  async deleteMessage(messageId) {
    if (!this.client || !this.hasCredentials) {
      throw new Error('TDLib không khả dụng');
    }

    if (!this.isConnected || !this.isLoggedIn) {
      await this.init();
    }

    try {
      logger.info(`Xóa tin nhắn với ID: ${messageId}`);

      await this.client.invoke({
        _: 'deleteMessages',
        chat_id: this.chatId,
        message_ids: [parseInt(messageId, 10)],
        revoke: true
      });

      logger.info(`Tin nhắn đã được xóa thành công: ${messageId}`);
      return true;
    } catch (error) {
      logger.error(`Lỗi xóa tin nhắn: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lấy thông tin của file
   * @param {number} fileId - ID của file trên Telegram
   * @returns {Promise<Object>} - Thông tin về file
   */
  async getFileInfo(fileId) {
    if (!this.client || !this.hasCredentials) {
      throw new Error('TDLib không khả dụng');
    }

    if (!this.isConnected || !this.isLoggedIn) {
      await this.init();
    }

    try {
      logger.info(`Lấy thông tin file với ID: ${fileId}`);

      const file = await this.client.invoke({
        _: 'getFile',
        file_id: parseInt(fileId, 10)
      });

      return file;
    } catch (error) {
      logger.error(`Lỗi lấy thông tin file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Đóng kết nối với TDLib
   */
  async close() {
    if (this.client) {
      try {
        await this.client.close();
        this.isConnected = false;
        this.isLoggedIn = false;
        logger.info('Đã đóng kết nối TDLib');
      } catch (error) {
        logger.error(`Lỗi đóng kết nối TDLib: ${error.message}`);
      }
    }
  }
}

// Singleton instance
let tdlibClient = null;

/**
 * Lấy client TDLib hoặc tạo mới nếu chưa có
 * @returns {Promise<TelegramTDLibClient|null>} - Client TDLib hoặc null nếu không khởi tạo được
 */
async function getClient() {
  // Nếu TDLib không tồn tại, trả về null
  if (!TDLib) {
    return null;
  }

  if (!tdlibClient) {
    try {
      tdlibClient = new TelegramTDLibClient();
      
      if (tdlibClient.hasCredentials) {
        try {
          await tdlibClient.init();
        } catch (error) {
          logger.error(`Không thể khởi tạo TDLib client: ${error.message}`);
          logger.info('Tiếp tục sử dụng Bot API thông thường');
          return null;
        }
      } else {
        return null;
      }
    } catch (error) {
      logger.error(`Lỗi khởi tạo TDLib client: ${error.message}`);
      return null;
    }
  }
  
  return tdlibClient;
}

module.exports = {
  getClient
}; 