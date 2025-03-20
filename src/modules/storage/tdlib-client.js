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
        const tdlibWin = require('tdl-tdlib-addon');
        TDLib = tdlibWin && tdlibWin.TDLib;
        if (TDLib) {
          logger.info('Đã tải thành công tdlib-addon cho Windows');
        } else {
          throw new Error('Không thể lấy TDLib từ tdl-tdlib-addon');
        }
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

    // Cảnh báo nếu không có thông tin xác thực, nhưng vẫn tạo client
    if (!this.hasCredentials) {
      logger.warn('TELEGRAM_API_ID hoặc TELEGRAM_API_HASH không được cung cấp. TDLib vẫn sẽ được khởi tạo nhưng một số tính năng có thể bị hạn chế.');
    }

    // Đảm bảo đường dẫn cho TDLib
    const tdlibDir = path.join(config.paths.data, 'tdlib');
    if (!fs.existsSync(tdlibDir)) {
      fs.mkdirSync(tdlibDir, { recursive: true });
    }

    try {
      // Tạo client TDLib
      const clientOptions = {
        apiId: parseInt(config.telegram.apiId, 10) || 0,
        apiHash: config.telegram.apiHash || '',
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

      // Kiểm tra api_id phải là một số hợp lệ
      if (!clientOptions.apiId || isNaN(clientOptions.apiId) || clientOptions.apiId <= 0) {
        logger.error('API ID không hợp lệ hoặc không được cung cấp');
        this.hasCredentials = false;
        return;
      }

      // Kiểm tra api_hash phải được cung cấp
      if (!clientOptions.apiHash || clientOptions.apiHash.length < 5) {
        logger.error('API Hash không hợp lệ hoặc không được cung cấp');
        this.hasCredentials = false;
        return;
      }

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
    if (this.isInitializing || !this.client) {
      return null;
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

      // Thiết lập tham số TDLib - sử dụng cấu hình đã thiết lập trong constructor
      try {
        await this.client.invoke({
          _: 'setTdlibParameters',
          parameters: {
            _: 'tdlibParameters',
            use_test_dc: false,
            database_directory: path.join(config.paths.data, 'tdlib'),
            files_directory: path.join(config.paths.data, 'tdlib', 'files'),
            use_message_database: true,
            use_secret_chats: false,
            api_id: parseInt(config.telegram.apiId, 10),
            api_hash: config.telegram.apiHash,
            system_language_code: 'vi',
            device_model: 'TeleDrive Server',
            application_version: '1.0.0',
            enable_storage_optimizer: true
          }
        });
      } catch (paramError) {
        logger.error(`Lỗi thiết lập tham số TDLib: ${paramError.message}`);
        // Không dừng quá trình, vẫn cố gắng đăng nhập
      }

      // Lắng nghe update từ TDLib
      this.client.on('update', update => {
        if (update._ === 'updateAuthorizationState') {
          this.handleAuthorizationState(update.authorization_state);
        }
      });

      // Thử đăng nhập theo phương thức ưu tiên
      if (config.telegram.useUserAuth && config.telegram.phoneNumber) {
        // Ưu tiên đăng nhập bằng tài khoản người dùng nếu có số điện thoại
        await this.loginWithPhoneNumber();
      } else if (config.telegram.botToken) {
        // Nếu không có thông tin tài khoản người dùng, sử dụng bot token
        try {
          await this.client.invoke({
            _: 'checkAuthenticationBotToken',
            token: config.telegram.botToken
          });
          
          this.isLoggedIn = true;
          logger.info('Đã đăng nhập thành công vào TDLib bằng bot token');

          // Nếu chưa có chatId, tạo chat riêng tư để lưu trữ file
          if (!this.chatId) {
            try {
              const me = await this.client.invoke({
                _: 'getMe'
              });

              // Tạo chat riêng tư với chính mình để lưu trữ file
              const chat = await this.client.invoke({
                _: 'createPrivateChat',
                user_id: me.id
              });

              this.chatId = chat.id;
              logger.info(`Đã tạo chat riêng tư với ID: ${this.chatId}`);
            } catch (chatError) {
              logger.error(`Không thể tạo chat: ${chatError.message}`);
              // Sử dụng chatId được cung cấp trong config nếu có
              if (config.telegram.chatId) {
                this.chatId = config.telegram.chatId;
                logger.info(`Sử dụng chat ID từ cấu hình: ${this.chatId}`);
              }
            }
          }
        } catch (botError) {
          logger.error(`Lỗi đăng nhập bằng bot token: ${botError.message}`);
          
          // Nếu không thể sử dụng bot token nhưng chatId đã được cung cấp
          if (config.telegram.chatId) {
            this.chatId = config.telegram.chatId;
            logger.info(`Sử dụng chat ID từ cấu hình: ${this.chatId}`);
            this.isLoggedIn = true;
          } else {
            throw new Error(`Không thể đăng nhập và không có chat ID: ${botError.message}`);
          }
        }
      } else if (config.telegram.chatId) {
        // Nếu không có bot token nhưng có chatId
        this.chatId = config.telegram.chatId;
        logger.info(`Sử dụng chat ID từ cấu hình: ${this.chatId}`);
        this.isLoggedIn = true; 
      } else {
        throw new Error('Không có bot token và chat ID. Vui lòng cấu hình trong file .env');
      }

      return this;
    } catch (error) {
      logger.error(`Lỗi khởi tạo TDLib: ${error.message}`);
      this.isConnected = false;
      this.isLoggedIn = false;
      this.isInitializing = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Xử lý trạng thái xác thực từ Telegram
   * @param {Object} authState - Trạng thái xác thực
   */
  async handleAuthorizationState(authState) {
    if (!authState) return;

    // Ghi nhật ký trạng thái xác thực hiện tại
    logger.debug(`Trạng thái xác thực TDLib: ${authState._}`);

    switch (authState._) {
      case 'authorizationStateWaitTdlibParameters':
        // Đã xử lý trong phương thức init
        break;

      case 'authorizationStateWaitEncryptionKey':
        await this.client.invoke({
          _: 'checkDatabaseEncryptionKey',
          encryption_key: config.sessionSecret
        });
        break;

      case 'authorizationStateWaitPhoneNumber':
        if (config.telegram.useUserAuth && config.telegram.phoneNumber) {
          await this.client.invoke({
            _: 'setAuthenticationPhoneNumber',
            phone_number: config.telegram.phoneNumber
          });
          logger.info(`Đã gửi số điện thoại: ${config.telegram.phoneNumber}`);
        } else {
          logger.warn('Cần số điện thoại để đăng nhập nhưng không được cung cấp trong cấu hình. Hãy thêm TELEGRAM_PHONE_NUMBER và USE_USER_AUTH=true trong file .env');
        }
        break;

      case 'authorizationStateWaitCode':
        if (config.telegram.authCode) {
          await this.client.invoke({
            _: 'checkAuthenticationCode',
            code: config.telegram.authCode
          });
          logger.info('Đã gửi mã xác thực');
          
          // Xóa mã xác thực sau khi sử dụng để tránh sử dụng lại mã cũ
          config.telegram.authCode = '';
        } else {
          logger.warn('Cần mã xác thực để đăng nhập. Hãy thêm TELEGRAM_AUTH_CODE trong file .env');
          
          // Lưu trạng thái cho lần chạy tiếp theo
          fs.writeFileSync(
            path.join(config.paths.data, 'auth_state.json'),
            JSON.stringify({ state: 'wait_code', phone: config.telegram.phoneNumber })
          );
        }
        break;

      case 'authorizationStateWaitPassword':
        if (config.telegram.password) {
          await this.client.invoke({
            _: 'checkAuthenticationPassword',
            password: config.telegram.password
          });
          logger.info('Đã gửi mật khẩu xác thực hai yếu tố');
        } else {
          logger.warn('Tài khoản yêu cầu mật khẩu hai yếu tố. Hãy thêm TELEGRAM_PASSWORD trong file .env');
          
          // Lưu trạng thái cho lần chạy tiếp theo
          fs.writeFileSync(
            path.join(config.paths.data, 'auth_state.json'),
            JSON.stringify({ state: 'wait_password', phone: config.telegram.phoneNumber })
          );
        }
        break;

      case 'authorizationStateReady':
        this.isLoggedIn = true;
        logger.info('Đã đăng nhập thành công vào TDLib bằng tài khoản người dùng');
        
        // Lấy thông tin người dùng
        try {
          const me = await this.client.invoke({
            _: 'getMe'
          });
          logger.info(`Đăng nhập với tư cách: ${me.first_name} (ID: ${me.id})`);
          
          // Nếu không có chatId được cấu hình sẵn, tạo chat để lưu trữ file
          if (!this.chatId) {
            const savedMessages = await this.client.invoke({
              _: 'createPrivateChat',
              user_id: me.id
            });
            this.chatId = savedMessages.id;
            logger.info(`Đã tạo chat "Tin nhắn đã lưu" với ID: ${this.chatId}`);
          }
          
          // Xóa file trạng thái xác thực
          try {
            const authStatePath = path.join(config.paths.data, 'auth_state.json');
            if (fs.existsSync(authStatePath)) {
              fs.unlinkSync(authStatePath);
            }
          } catch (e) {
            logger.warn(`Không thể xóa file trạng thái xác thực: ${e.message}`);
          }
        } catch (error) {
          logger.error(`Lỗi sau khi đăng nhập: ${error.message}`);
        }
        break;

      case 'authorizationStateLoggingOut':
        this.isLoggedIn = false;
        logger.info('Đang đăng xuất khỏi tài khoản');
        break;

      case 'authorizationStateClosing':
        this.isConnected = false;
        this.isLoggedIn = false;
        logger.info('Đang đóng kết nối TDLib');
        break;

      case 'authorizationStateClosed':
        this.isConnected = false;
        this.isLoggedIn = false;
        logger.info('Kết nối TDLib đã đóng');
        break;

      default:
        logger.warn(`Trạng thái xác thực không xử lý: ${authState._}`);
    }
  }

  /**
   * Đăng nhập bằng số điện thoại
   * @returns {Promise<boolean>} Kết quả đăng nhập
   */
  async loginWithPhoneNumber() {
    if (!this.client || !this.isConnected || !config.telegram.phoneNumber) {
      logger.error('Không thể đăng nhập: TDLib chưa kết nối hoặc không có số điện thoại');
      return false;
    }

    try {
      // Kiểm tra xem có file trạng thái xác thực không
      const authStatePath = path.join(config.paths.data, 'auth_state.json');
      if (fs.existsSync(authStatePath)) {
        try {
          const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
          
          if (authState.state === 'wait_code' && config.telegram.authCode) {
            await this.client.invoke({
              _: 'checkAuthenticationCode',
              code: config.telegram.authCode
            });
            logger.info('Tiếp tục quá trình xác thực với mã đã lưu');
            return true;
          } else if (authState.state === 'wait_password' && config.telegram.password) {
            await this.client.invoke({
              _: 'checkAuthenticationPassword',
              password: config.telegram.password
            });
            logger.info('Tiếp tục quá trình xác thực với mật khẩu hai yếu tố');
            return true;
          }
        } catch (e) {
          logger.warn(`Lỗi khi đọc/xử lý file trạng thái xác thực: ${e.message}`);
        }
      }

      // Bắt đầu quá trình đăng nhập bằng số điện thoại
      await this.client.invoke({
        _: 'setAuthenticationPhoneNumber',
        phone_number: config.telegram.phoneNumber
      });
      
      logger.info(`Đã gửi yêu cầu đăng nhập với số điện thoại: ${config.telegram.phoneNumber}`);
      
      // Lưu ý: Các trạng thái tiếp theo sẽ được xử lý bởi handleAuthorizationState
      return true;
    } catch (error) {
      logger.error(`Lỗi khi đăng nhập bằng số điện thoại: ${error.message}`);
      return false;
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

  /**
   * Tải lên nhiều phần của file lớn sử dụng TDLib
   * @param {Array<string>} filePaths - Mảng đường dẫn đến các phần file cần tải lên
   * @param {Array<string>} captions - Mảng chú thích tương ứng cho các phần
   * @returns {Promise<Array<Object>>} - Mảng thông tin về các phần file đã tải lên
   */
  async uploadMultipartFile(filePaths, captions = []) {
    if (!this.client || !this.isConnected) {
      throw new Error('TDLib không khả dụng hoặc chưa kết nối');
    }

    const results = [];
    
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const caption = captions[i] || `Part ${i + 1}/${filePaths.length}`;
      
      logger.info(`Tải lên phần ${i + 1}/${filePaths.length} thông qua TDLib: ${filePath}`);
      
      try {
        const result = await this.uploadFile(filePath, caption);
        results.push(result);
        logger.info(`Đã tải lên thành công phần ${i + 1}/${filePaths.length}`);
      } catch (error) {
        logger.error(`Lỗi khi tải lên phần ${i + 1}/${filePaths.length}: ${error.message}`);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Tải xuống và ghép lại các phần của file lớn
   * @param {Array<string>} fileIds - Mảng ID file của các phần
   * @param {string} outputPath - Đường dẫn đầu ra cho file đã ghép
   * @returns {Promise<string>} - Đường dẫn đến file đã ghép
   */
  async downloadMultipartFile(fileIds, outputPath) {
    if (!this.client || !this.isConnected) {
      throw new Error('TDLib không khả dụng hoặc chưa kết nối');
    }
    
    const tempDir = path.join(path.dirname(outputPath), 'temp_parts_' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const downloadedParts = [];
    
    try {
      // Tải xuống từng phần
      for (let i = 0; i < fileIds.length; i++) {
        const fileId = fileIds[i];
        const partPath = path.join(tempDir, `part_${i}.bin`);
        
        logger.info(`Tải xuống phần ${i + 1}/${fileIds.length} thông qua TDLib: ID ${fileId}`);
        
        try {
          const downloadedPath = await this.downloadFile(fileId, partPath);
          downloadedParts.push(downloadedPath);
          logger.info(`Đã tải xuống thành công phần ${i + 1}/${fileIds.length}`);
        } catch (error) {
          logger.error(`Lỗi khi tải xuống phần ${i + 1}/${fileIds.length}: ${error.message}`);
          throw error;
        }
      }
      
      // Ghép các phần đã tải xuống
      logger.info(`Ghép ${downloadedParts.length} phần thành một file duy nhất: ${outputPath}`);
      
      // Đảm bảo thư mục đầu ra tồn tại
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Nếu file đầu ra đã tồn tại, xóa nó
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      // Tạo write stream cho file đầu ra
      const outputStream = fs.createWriteStream(outputPath);
      
      // Ghép các phần
      for (const partPath of downloadedParts) {
        const partContent = fs.readFileSync(partPath);
        outputStream.write(partContent);
      }
      
      // Đóng stream
      outputStream.end();
      
      // Chờ cho đến khi đã ghi xong
      await new Promise((resolve, reject) => {
        outputStream.on('finish', resolve);
        outputStream.on('error', reject);
      });
      
      logger.info(`Đã ghép thành công các phần thành một file: ${outputPath}`);
      
      // Xóa thư mục tạm
      for (const partPath of downloadedParts) {
        try {
          fs.unlinkSync(partPath);
        } catch (error) {
          logger.warn(`Không thể xóa file tạm: ${partPath} - ${error.message}`);
        }
      }
      
      try {
        fs.rmdirSync(tempDir);
      } catch (error) {
        logger.warn(`Không thể xóa thư mục tạm: ${tempDir} - ${error.message}`);
      }
      
      return outputPath;
    } catch (error) {
      logger.error(`Lỗi khi xử lý file đa phần: ${error.message}`);
      
      // Xóa thư mục tạm nếu có lỗi
      try {
        for (const partPath of downloadedParts) {
          if (fs.existsSync(partPath)) {
            fs.unlinkSync(partPath);
          }
        }
        
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      } catch (cleanupError) {
        logger.warn(`Lỗi khi dọn dẹp thư mục tạm: ${cleanupError.message}`);
      }
      
      throw error;
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
  // Kiểm tra cấu hình TDLib
  if (!config.telegram.apiId || !config.telegram.apiHash) {
    logger.warn('TELEGRAM_API_ID hoặc TELEGRAM_API_HASH không được cung cấp. Không thể sử dụng TDLib.');
    return null;
  }
  
  // Kiểm tra xem đã có TDLib instance
  if (TDLib === null) {
    logger.warn('TDLib library không có sẵn trên hệ thống. Không thể khởi tạo TDLib client.');
    return null;
  }

  // Tạo TDLib client nếu chưa có
  if (!tdlibClient) {
    try {
      tdlibClient = new TelegramTDLibClient();
      
      if (tdlibClient.hasCredentials && tdlibClient.client) {
        try {
          await tdlibClient.init();
        } catch (error) {
          logger.error(`Không thể khởi tạo TDLib client: ${error.message}`);
          logger.info('TDLib không khả dụng để sử dụng');
          tdlibClient = null;
          return null;
        }
      } else {
        logger.warn('TDLib client không có đủ thông tin xác thực');
        tdlibClient = null;
        return null;
      }
    } catch (error) {
      logger.error(`Lỗi khởi tạo TDLib client: ${error.message}`);
      tdlibClient = null;
      return null;
    }
  }
  
  // Kiểm tra nếu client đã kết nối
  if (tdlibClient && !tdlibClient.isConnected && tdlibClient.client) {
    try {
      await tdlibClient.init();
    } catch (error) {
      logger.error(`Lỗi kết nối lại TDLib client: ${error.message}`);
      return null;
    }
  }
  
  // Trả về client nếu đã kết nối thành công, ngược lại trả về null
  return (tdlibClient && tdlibClient.isConnected) ? tdlibClient : null;
}

/**
 * Tạo một wrapper để thay thế hoàn toàn telegram.js bằng tdlib-client.js
 * Điều này cho phép sử dụng TDLib thay vì Bot API mà không cần sửa đổi code khác
 */
const tdlibStorage = {
  async uploadFile(filePath, caption = '') {
    const client = await getClient();
    if (!client) {
      throw new Error('TDLib không khả dụng, không thể tải lên file');
    }
    return client.uploadFile(filePath, caption);
  },
  
  async downloadFile(fileId, outputPath = null) {
    const client = await getClient();
    if (!client) {
      throw new Error('TDLib không khả dụng, không thể tải xuống file');
    }
    return client.downloadFile(fileId, outputPath);
  },
  
  async deleteFile(messageId) {
    const client = await getClient();
    if (!client) {
      throw new Error('TDLib không khả dụng, không thể xóa file');
    }
    return client.deleteMessage(messageId);
  },
  
  async getFileInfo(fileId) {
    const client = await getClient();
    if (!client) {
      throw new Error('TDLib không khả dụng, không thể lấy thông tin file');
    }
    return client.getFileInfo(fileId);
  },
  
  // Phương thức tiện ích giống như trong telegram.js
  isImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  },
  
  isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
  },
  
  isAudioFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext);
  },
  
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/m4a',
      '.flac': 'audio/flac',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
};

/**
 * Khởi tạo TDLib client và trả về instance nếu thành công
 * @returns {Promise<TelegramTDLibClient|null>} - TDLib client hoặc null nếu không khởi tạo được
 */
async function initTDLib() {
  try {
    // Kiểm tra cấu hình TDLib
    if (!config.telegram.apiId || !config.telegram.apiHash) {
      logger.warn('TELEGRAM_API_ID hoặc TELEGRAM_API_HASH không được cung cấp. Không thể sử dụng TDLib.');
      return null;
    }
    
    // Khởi tạo TDLib client
    const tdlibClient = await getClient();
    
    if (tdlibClient) {
      if (tdlibClient.isConnected) {
        logger.info('TDLib client đã được khởi tạo và kết nối thành công.');
        return tdlibClient;
      } else {
        try {
          // Khởi tạo kết nối TDLib
          const initializedClient = await tdlibClient.init();
          if (initializedClient && initializedClient.isConnected) {
            logger.info('TDLib client đã được khởi tạo và kết nối thành công.');
            return initializedClient;
          } else {
            logger.warn('TDLib client đã được khởi tạo nhưng chưa thể kết nối. Kiểm tra kết nối mạng và cấu hình.');
            return null;
          }
        } catch (initError) {
          logger.error(`Không thể khởi tạo TDLib client: ${initError.message}`);
          return null;
        }
      }
    } else {
      logger.warn('TDLib client không khả dụng. Vui lòng cài đặt thư viện TDLib và cấu hình API ID/Hash để sử dụng.');
      return null;
    }
  } catch (error) {
    logger.error(`Lỗi khởi tạo TDLib client: ${error.message}`);
    return null;
  }
}

module.exports = {
  getClient,
  tdlibStorage,
  initTDLib
}; 