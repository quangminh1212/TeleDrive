/**
 * TeleDrive - Telegram Service
 * File này chứa các hàm tương tác với Telegram
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Khởi tạo bot Telegram
let bot = null;
let chatId = null;
let isReady = false;
// Biến để theo dõi số lần retry khi khởi tạo bot
let initRetryCount = 0;
// Flag để kiểm soát quá trình khởi tạo bot
let isInitializing = false;
// Mode giả lập - khi không thể kết nối tới Telegram
let simulationMode = false;

/**
 * Dừng bot Telegram nếu đang hoạt động
 */
async function stopBot() {
  try {
    console.log('===== DỪNG BOT TELEGRAM =====');
    console.log('Đang dừng bot...');
    
    if (bot) {
      // Thử dừng bot nếu có
      try {
        await bot.stop();
        console.log('Đã dừng bot thành công');
      } catch (error) {
        console.error('Lỗi khi dừng bot:', error.message);
      }
      
      // Đảm bảo xóa tham chiếu đến bot dù có lỗi hay không
      bot = null;
    }
    
    isReady = false;
    simulationMode = false;
    console.log('Bot Telegram đã bị dừng và giải phóng');
    
    // Đợi thêm thời gian để đảm bảo các kết nối được đóng hoàn toàn
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('Lỗi không mong muốn khi dừng bot:', error.message);
    bot = null;
    isReady = false;
    simulationMode = false;
    return false;
  }
}

/**
 * Khởi tạo bot Telegram
 * @param {Boolean} forceInit Buộc khởi tạo lại bot dù đã tồn tại
 * @returns {Promise<Object>} Promise trả về Bot instance
 */
async function initBot(forceInit = false) {
  try {
    // Nếu đang trong quá trình khởi tạo, tránh khởi tạo nhiều lần
    if (isInitializing) {
      console.log('Bot đang trong quá trình khởi tạo, vui lòng đợi...');
      // Đợi một chút và trả về null để caller có thể xử lý
      await new Promise(resolve => setTimeout(resolve, 2000));
      return null;
    }
    
    isInitializing = true;
    console.log('===== KHỞI TẠO BOT TELEGRAM =====');
    
    // Nếu bot đã tồn tại và đang hoạt động và không buộc khởi tạo lại, trả về bot đó
    if (bot && isReady && !forceInit) {
      console.log('Bot đã được khởi tạo trước đó, sử dụng lại');
      isInitializing = false;
      return bot;
    }
    
    // Nếu đang trong chế độ giả lập và không buộc khởi tạo lại, tiếp tục dùng chế độ giả lập
    if (simulationMode && !forceInit) {
      console.log('Đang trong chế độ giả lập, bỏ qua khởi tạo bot');
      isInitializing = false;
      return null;
    }
    
    // Dừng bot cũ nếu tồn tại
    await stopBot();
    
    // Reset trạng thái
    isReady = false;
    bot = null;
    simulationMode = false;
    
    // Đặt lại số lần retry nếu đây là request khởi tạo mới (không phải retry)
    if (!forceInit) {
      initRetryCount = 0;
    }
    
    // Kiểm tra số lần retry để tránh retry vô hạn
    if (initRetryCount >= config.TELEGRAM_MAX_RETRIES) {
      console.log('Đã thử khởi tạo bot quá nhiều lần không thành công, chuyển sang chế độ giả lập');
      simulationMode = true;
      isInitializing = false;
      return null;
    }
    
    // Tăng số lần retry
    initRetryCount++;
    
    // Lấy token và chat ID từ config
    const telegramToken = config.TELEGRAM_BOT_TOKEN;
    const targetChatId = config.TELEGRAM_CHAT_ID;
    
    if (!telegramToken) {
      console.error('Thiếu cấu hình Telegram Bot Token. Vui lòng kiểm tra .env');
      simulationMode = true;
      isInitializing = false;
      return null;
    }
    
    if (!targetChatId) {
      console.log('Thiếu cấu hình Telegram Chat ID. Bot sẽ khởi động nhưng không thể đồng bộ file.');
    }
    
    console.log(`Đang khởi tạo bot với token: ${telegramToken.slice(0, 5)}...${telegramToken.slice(-5)}`);
    console.log(`Chat ID cấu hình: ${targetChatId || 'chưa thiết lập'}`);
    
    // Chuẩn hóa chat ID
    chatId = targetChatId ? targetChatId.toString() : null;
    
    // Xóa webhook (nếu có) trước khi khởi động polling
    try {
      // Tạo một promise để đợi webhook được xóa
      const deleteWebhook = new Promise((resolve, reject) => {
        axios.post(`https://api.telegram.org/bot${telegramToken}/deleteWebhook?drop_pending_updates=true`, {}, {
          timeout: 5000 // 5 giây timeout cho request này
        })
          .then(() => {
            console.log('Đã xóa webhook để tránh xung đột');
            resolve();
          })
          .catch(err => {
            console.warn('Lỗi khi xóa webhook:', err.message);
            // Vẫn resolve để tiếp tục dù có lỗi
            resolve();
          });
      });
      
      // Đợi webhook bị xóa trước khi tiếp tục với timeout
      await Promise.race([
        deleteWebhook,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout khi xóa webhook')), 5000))
      ]).catch(err => {
        console.log('Timeout khi xóa webhook, tiếp tục khởi tạo bot');
      });
      
    } catch (webhookError) {
      console.warn('Lỗi khi xóa webhook:', webhookError.message);
    }
    
    // Tạo instance bot mới với timeout ngắn
    const botOptions = {
      telegram: {
        apiRoot: 'https://api.telegram.org',
        webhookReply: false,
        apiTimeout: 5000, // 5 giây timeout cho mỗi request API
        testEnv: false
      }
    };
    
    try {
      bot = new Telegraf(telegramToken, botOptions);
      
      // Cấu hình các sự kiện bot cơ bản
      bot.catch((err, ctx) => {
        console.error('Lỗi bot Telegram:', err);
      });
      
      // Thiết lập hàm xử lý lỗi tổng quát
      bot.use(async (ctx, next) => {
        try {
          await next();
        } catch (err) {
          console.error('Lỗi trong middleware bot:', err);
        }
      });
      
      // Lệnh start đơn giản
      bot.start(ctx => {
        ctx.reply(`Bot đã sẵn sàng. Chat ID của bạn là: ${ctx.chat.id}`);
        // Lưu chatId nếu chưa có
        if (!chatId) {
          chatId = ctx.chat.id.toString();
          console.log(`Đã lưu chat ID: ${chatId}`);
        }
      });

      // Khởi động bot với polling có timeout 5 giây
      console.log('Đang khởi động bot với polling giới hạn thời gian...');
      
      // Tạo Promise race để giới hạn thời gian timeout
      try {
        await Promise.race([
          bot.launch({
            dropPendingUpdates: true,
            polling: {
              timeout: 3, // Timeout nhỏ để tránh treo
              limit: 50
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout khi khởi động bot')), 7000)
          )
        ]);
        
        // Khởi động thành công, lấy thông tin bot
        const botInfo = await bot.telegram.getMe();
        bot.botInfo = botInfo;
        console.log(`Bot khởi động thành công: @${botInfo.username}`);
        
        isReady = true;
        isInitializing = false;
        
        return bot;
      } catch (launchError) {
        console.error(`Không thể khởi động bot: ${launchError.message}`);
        
        // Xử lý các trường hợp lỗi
        if (launchError.message.includes('Conflict') || 
            launchError.message.includes('Timeout') || 
            launchError.message.includes('ETIMEOUT')) {
          
          console.log('Phát hiện lỗi kết nối, đang thử khởi động lại...');
          
          // Dừng bot hiện tại
          try {
            if (bot) await bot.stop();
          } catch (e) {}
          
          bot = null;
          isReady = false;
          
          // Đợi một thời gian trước khi thử lại
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Nếu đã thử quá nhiều lần, chuyển sang chế độ giả lập
          if (initRetryCount >= config.TELEGRAM_MAX_RETRIES) {
            console.log(`Đã thử khởi động ${initRetryCount} lần không thành công. Bật chế độ giả lập`);
            simulationMode = true;
            isInitializing = false;
            return null;
          }
          
          // Thử lại với thời gian ngắn hơn
          isInitializing = false;
          return await initBot(true);
        }
        
        // Lỗi khác, bật chế độ giả lập
        console.log('Lỗi không xác định, bật chế độ giả lập');
        simulationMode = true;
        bot = null;
        isReady = false;
        isInitializing = false;
        return null;
      }
    } catch (error) {
      console.error('Lỗi khi khởi tạo bot Telegram:', error.message);
      simulationMode = true;
      isReady = false;
      bot = null;
      isInitializing = false;
      return null;
    }
  } catch (error) {
    console.error('Lỗi nghiêm trọng khi khởi tạo Telegram Bot:', error.message);
    simulationMode = true;
    isReady = false;
    bot = null;
    isInitializing = false;
    return null;
  }
}

/**
 * Cấu hình các sự kiện cho bot
 */
function configureBot() {
  if (!bot) return;
  
  // Kiểm tra thông tin bot
  bot.telegram.getMe().then(botInfo => {
    console.log(`Bot đã khởi tạo: ${botInfo.username} (${botInfo.first_name})`);
    bot.botInfo = botInfo; // Lưu thông tin bot
  }).catch(err => {
    console.error('Không thể lấy thông tin bot:', err.message);
  });
  
  // Sự kiện khi bot được khởi động
  bot.start(async (ctx) => {
    const userChatId = ctx.chat.id;
    ctx.reply(`Bot đã sẵn sàng. Chat ID của bạn là: ${userChatId}`);
    console.log(`Bot đã được khởi động bởi user với chat ID: ${userChatId}`);
    
    // Kiểm tra nếu chat ID khác với cấu hình
    if (userChatId.toString() !== chatId.toString()) {
      console.log(`Chat ID người dùng ${userChatId} khác với chat ID đã cấu hình ${chatId}`);
      await ctx.reply(`⚠️ Chat ID của bạn (${userChatId}) khác với chat ID đã cấu hình (${chatId}).\nBạn có muốn cập nhật ID? Sử dụng lệnh /updatechatid`);
    }
  });
  
  // Thêm lệnh cập nhật chat ID
  bot.command('updatechatid', async (ctx) => {
    const newChatId = ctx.message.text.split(' ')[1] || ctx.chat.id.toString();
    
    console.log(`Nhận lệnh cập nhật chat ID thành: ${newChatId}`);
    
    try {
      // Cập nhật chat ID
      const result = await updateChatId(newChatId);
      
      if (result.success) {
        await ctx.reply(`✅ Đã cập nhật chat ID thành ${newChatId}`);
        console.log(`Đã cập nhật chat ID thành: ${newChatId}`);
      } else {
        await ctx.reply(`❌ Lỗi: ${result.error}`);
        console.error(`Lỗi khi cập nhật chat ID: ${result.error}`);
      }
    } catch (error) {
      await ctx.reply(`❌ Lỗi không xác định: ${error.message}`);
      console.error(`Lỗi không xác định khi cập nhật chat ID: ${error.message}`);
    }
  });
  
  // Sự kiện khi bot nhận được tin nhắn
  bot.on('message', ctx => {
    const message = ctx.message;
    const chatId = ctx.chat.id;
    
    console.log(`Nhận tin nhắn từ chat ID ${chatId}: ${message.text || '[không phải tin nhắn văn bản]'}`);
    
    // Kiểm tra xem tin nhắn có phải là file không
    if (message.document) {
      handleIncomingFile(ctx);
    }
  });
}

/**
 * Cập nhật chat ID
 * @param {String} newChatId Chat ID mới
 * @param {Boolean} saveToConfig Lưu vào config
 * @returns {Promise<Object>} Kết quả cập nhật
 */
async function updateChatId(newChatId, saveToConfig = true) {
  try {
    if (!newChatId) {
      console.error('Thiếu chat ID mới');
      return { success: false, error: 'Thiếu chat ID mới' };
    }
    
    // Cập nhật biến chatId
    chatId = newChatId.toString();
    console.log(`Đã cập nhật chat ID thành: ${chatId}`);
    
    // Lưu vào config nếu cần
    if (saveToConfig) {
      try {
        await config.updateEnv({
          TELEGRAM_CHAT_ID: chatId
        });
        console.log('Đã lưu chat ID vào config');
        return { success: true, chatId, savedToConfig: true };
      } catch (configError) {
        console.error('Lỗi khi lưu chat ID vào config:', configError.message);
        return { success: true, chatId, savedToConfig: false, configError: configError.message };
      }
    }
    
    return { success: true, chatId };
  } catch (error) {
    console.error('Lỗi khi cập nhật chat ID:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Kiểm tra xem bot có đang hoạt động không
 * @returns {Boolean} Trạng thái hoạt động của bot
 */
function isBotActive() {
  try {
    // Nếu đang ở chế độ giả lập, vẫn trả về true để hệ thống hoạt động
    if (simulationMode) {
      return true;
    }
    
    // Kiểm tra xem bot có tồn tại không
    if (!bot) {
      console.log('Bot chưa được khởi tạo');
      return false;
    }
    
    // Kiểm tra xem bot có sẵn sàng không
    if (!isReady) {
      console.log('Bot đã được khởi tạo nhưng chưa sẵn sàng');
      return false;
    }
    
    // Kiểm tra bot có botInfo không
    if (!bot.botInfo) {
      console.log('Bot không có thông tin');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái bot:', error.message);
    return simulationMode; // Trả về true nếu đang ở chế độ giả lập
  }
}

/**
 * Kiểm tra xem bot token có hợp lệ không
 * @returns {Promise<Object>} Kết quả kiểm tra
 */
async function verifyBotToken() {
  try {
    console.log('Xác thực token bot...');
    
    // Lấy token từ config
    const token = config.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      console.error('Thiếu TELEGRAM_BOT_TOKEN trong cấu hình');
      return {
        success: false,
        error: 'Thiếu TELEGRAM_BOT_TOKEN trong cấu hình'
      };
    }
    
    // Tạo URL request tới Telegram API
    const apiUrl = `https://api.telegram.org/bot${token}/getMe`;
    
    // Gửi request bằng axios với timeout 10 giây
    const response = await axios.get(apiUrl, { timeout: 10000 });
    
    if (response.data && response.data.ok && response.data.result) {
      const botInfo = response.data.result;
      console.log(`Xác thực token thành công. Bot: ${botInfo.username}`);
      
      return {
        success: true,
        botInfo: botInfo,
        botUsername: botInfo.username
      };
    } else {
      console.error('Dữ liệu phản hồi không đúng định dạng:', response.data);
      return {
        success: false,
        error: 'Dữ liệu phản hồi không đúng định dạng'
      };
    }
  } catch (error) {
    console.error('Lỗi khi xác thực bot token:', error.message);
    
    // Kiểm tra lỗi cụ thể để đưa ra thông báo chi tiết
    if (error.response) {
      // Lỗi từ API Telegram
      console.error('Lỗi API:', error.response.status, error.response.data);
      return {
        success: false,
        error: `Lỗi API: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      };
    } else if (error.request) {
      // Không nhận được phản hồi (timeout, mất kết nối,...)
      console.error('Không nhận được phản hồi từ Telegram API');
      return {
        success: false,
        error: 'Không nhận được phản hồi từ Telegram API. Vui lòng kiểm tra kết nối mạng.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Lỗi không xác định khi xác thực token'
    };
  }
}

/**
 * Xử lý khi nhận được file từ Telegram
 * @param {Object} ctx Context của bot
 */
async function handleIncomingFile(ctx) {
  try {
    const document = ctx.message.document;
    const fileId = document.file_id;
    const fileName = document.file_name;
    const fileSize = document.file_size;
    const fileType = document.mime_type;
    
    console.log(`Nhận file từ Telegram: ${fileName} (${fileSize} bytes)`);
    
    // Lấy thông tin về file từ Telegram
    const fileLink = await bot.telegram.getFileLink(fileId);
    
    // Tạo đường dẫn lưu file
    const downloadDir = path.join(config.STORAGE_PATH, 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    const filePath = path.join(downloadDir, fileName);
    
    // Tải file về
    const response = await axios({
      method: 'GET',
      url: fileLink.href,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(filePath);
    
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        console.log(`Đã tải file thành công: ${filePath}`);
        
        try {
          // Thêm file vào cơ sở dữ liệu
          const fileService = require('./fileService');
          const filesDb = fileService.readFilesDb();
          
          const newFile = {
            id: require('crypto').randomUUID(),
            name: fileName,
            displayName: fileName,
            size: fileSize,
            uploadDate: new Date().toISOString(),
            fileType: fileType || 'application/octet-stream',
            telegramFileId: fileId,
            telegramUrl: fileLink.href,
            localPath: filePath,
            fileStatus: 'active',
            needsSync: false,
            isDeleted: false
          };
          
          // Kiểm tra xem file đã tồn tại trong DB chưa
          const existingFile = filesDb.find(f => 
            f.telegramFileId === fileId || 
            (f.name === fileName && f.size === fileSize)
          );
          
          if (!existingFile) {
            filesDb.push(newFile);
            fileService.saveFilesDb(filesDb);
            console.log(`Đã thêm file ${fileName} vào cơ sở dữ liệu`);
            ctx.reply(`Đã nhận và lưu file: ${fileName}`);
          } else {
            console.log(`File ${fileName} đã tồn tại trong cơ sở dữ liệu`);
            ctx.reply(`Đã nhận file: ${fileName} (đã tồn tại trong hệ thống)`);
          }
          
          resolve({
            success: true,
            fileId,
            fileName,
            filePath,
            fileSize,
            fileType,
            fileDbId: existingFile ? existingFile.id : newFile.id
          });
        } catch (dbError) {
          console.error(`Lỗi khi lưu thông tin file vào DB: ${dbError.message}`);
          ctx.reply(`Đã nhận file: ${fileName}, nhưng gặp lỗi khi lưu thông tin`);
          resolve({
            success: true,
            fileId,
            fileName,
            filePath,
            fileSize,
            fileType,
            dbError: dbError.message
          });
        }
      });
      
      writer.on('error', error => {
        console.error(`Lỗi khi tải file: ${error.message}`);
        ctx.reply(`Lỗi khi xử lý file: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Lỗi khi xử lý file nhận từ Telegram:', error);
    ctx.reply('Lỗi khi xử lý file. Vui lòng thử lại sau.');
    return {
      success: false,
      error: error.message || 'Lỗi không xác định'
    };
  }
}

/**
 * Tải file từ Telegram
 * @param {String} fileId ID của file cần tải
 * @param {String} savePath Đường dẫn lưu file
 * @param {Object} options Tùy chọn bổ sung
 * @returns {Promise<Object>} Kết quả tải file
 */
async function downloadFile(fileId, savePath, options = {}) {
  try {
    // Kiểm tra bot có sẵn sàng không
    if (!isBotActive()) {
      if (simulationMode) {
        console.log(`[Chế độ giả lập] Tải file: ${fileId} -> ${savePath}`);
        
        // Tạo file giả lập nếu cần
        if (options.createDummyFile) {
          try {
            // Đảm bảo thư mục tồn tại
            const dir = path.dirname(savePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            // Tạo file trống
            fs.writeFileSync(savePath, 'Simulated file content');
            console.log(`[Chế độ giả lập] Đã tạo file giả lập: ${savePath}`);
          } catch (err) {
            console.error(`[Chế độ giả lập] Lỗi khi tạo file giả lập:`, err.message);
          }
        }
        
        return { 
          success: true, 
          simulated: true,
          path: savePath,
          file_id: fileId
        };
      }
      
      console.log('Bot chưa sẵn sàng, không thể tải file');
      return { success: false, error: 'Bot không hoạt động' };
    }
    
    if (!fileId) {
      console.error('Thiếu file ID, không thể tải file');
      return { success: false, error: 'Thiếu file ID' };
    }
    
    // Lấy link file
    const fileUrl = await getFileLink(fileId);
    
    if (!fileUrl) {
      console.error('Không lấy được link file');
      return { success: false, error: 'Không lấy được link file' };
    }
    
    // Đảm bảo thư mục tồn tại
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Tải file với timeout
    const response = await Promise.race([
      axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'stream',
        timeout: 30000 // 30 giây timeout
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout khi tải file')), 30000)
      )
    ]).catch(error => {
      console.error('Lỗi khi tải file:', error.message);
      return null;
    });
    
    if (!response) {
      return { success: false, error: 'Lỗi khi tải file' };
    }
    
    // Lưu file
    const writer = fs.createWriteStream(savePath);
    
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      
      writer.on('close', () => {
        if (!error) {
          console.log(`Đã tải file thành công: ${savePath}`);
          resolve({ 
            success: true, 
            path: savePath,
            file_id: fileId
          });
        }
      });
    });
  } catch (error) {
    console.error('Lỗi khi tải file từ Telegram:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi file lên Telegram
 * @param {String} filePath Đường dẫn đến file cần gửi
 * @param {String} caption Chú thích cho file
 * @param {Object} options Tùy chọn bổ sung
 * @returns {Promise<Object|null>} Kết quả gửi file hoặc null nếu thất bại
 */
async function sendFile(filePath, caption = '', options = {}) {
  try {
    // Kiểm tra bot có sẵn sàng không
    if (!isBotActive()) {
      if (simulationMode) {
        console.log(`[Chế độ giả lập] Gửi file: ${filePath}`);
        return { ok: true, simulated: true, file_path: filePath, caption };
      }
      
      console.log('Bot chưa sẵn sàng, không thể gửi file');
      return null;
    }
    
    // Kiểm tra chat ID
    if (!chatId) {
      console.log('Chưa có chat ID, không thể gửi file');
      return null;
    }
    
    // Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
      console.error(`File không tồn tại: ${filePath}`);
      return null;
    }
    
    // Chuẩn bị options
    const sendOptions = {
      parse_mode: 'HTML',
      disable_notification: false,
      ...options
    };
    
    // Giới hạn độ dài caption
    const MAX_CAPTION_LENGTH = 1024;
    if (caption && caption.length > MAX_CAPTION_LENGTH) {
      console.log(`Caption quá dài (${caption.length} ký tự), cắt bớt xuống ${MAX_CAPTION_LENGTH} ký tự`);
      caption = caption.substring(0, MAX_CAPTION_LENGTH - 50) + '...\n\n<i>[Đã cắt ngắn]</i>';
    }
    
    if (caption) {
      sendOptions.caption = caption;
    }
    
    // Gửi file với timeout
    const result = await Promise.race([
      bot.telegram.sendDocument(chatId, {
        source: filePath,
        filename: path.basename(filePath)
      }, sendOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout khi gửi file')), 30000)
      )
    ]).catch(error => {
      console.error('Lỗi khi gửi file:', error.message);
      return null;
    });
    
    return result;
  } catch (error) {
    console.error('Lỗi khi gửi file lên Telegram:', error.message);
    return null;
  }
}

/**
 * Lấy link tải file từ Telegram
 * @param {String} fileId ID của file cần lấy link
 * @returns {Promise<String|null>} Link tải file hoặc null nếu thất bại
 */
async function getFileLink(fileId) {
  try {
    // Kiểm tra bot có sẵn sàng không
    if (!isBotActive()) {
      if (simulationMode) {
        console.log(`[Chế độ giả lập] Lấy link file: ${fileId}`);
        return `https://simulated-telegram-file-link.com/${fileId}`;
      }
      
      console.log('Bot chưa sẵn sàng, không thể lấy link file');
      return null;
    }
    
    if (!fileId) {
      console.error('Thiếu file ID, không thể lấy link file');
      return null;
    }
    
    // Lấy thông tin file với timeout
    const fileInfo = await Promise.race([
      bot.telegram.getFile(fileId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout khi lấy thông tin file')), 10000)
      )
    ]).catch(error => {
      console.error('Lỗi khi lấy thông tin file:', error.message);
      return null;
    });
    
    if (!fileInfo || !fileInfo.file_path) {
      console.error('Không lấy được thông tin file');
      return null;
    }
    
    // Tạo link tải file
    const telegramToken = config.TELEGRAM_BOT_TOKEN;
    const fileLink = `https://api.telegram.org/file/bot${telegramToken}/${fileInfo.file_path}`;
    
    return fileLink;
  } catch (error) {
    console.error('Lỗi khi lấy link file từ Telegram:', error.message);
    return null;
  }
}

/**
 * Gửi tin nhắn đến chat ID đã cấu hình
 * @param {String} message Nội dung tin nhắn
 * @param {Object} options Tùy chọn bổ sung
 * @returns {Promise<Object|null>} Kết quả gửi tin nhắn hoặc null nếu thất bại
 */
async function sendMessage(message, options = {}) {
  try {
    // Kiểm tra bot có sẵn sàng không
    if (!isBotActive()) {
      if (simulationMode) {
        console.log(`[Chế độ giả lập] Gửi tin nhắn: ${message}`);
        return { ok: true, simulated: true, text: message };
      }
      
      console.log('Bot chưa sẵn sàng, không thể gửi tin nhắn');
      return null;
    }
    
    // Kiểm tra chat ID
    if (!chatId) {
      console.log('Chưa có chat ID, không thể gửi tin nhắn');
      return null;
    }
    
    // Chuẩn bị options
    const messageOptions = {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options
    };
    
    // Giới hạn độ dài tin nhắn
    const MAX_MESSAGE_LENGTH = 4096;
    if (message.length > MAX_MESSAGE_LENGTH) {
      console.log(`Tin nhắn quá dài (${message.length} ký tự), cắt bớt xuống ${MAX_MESSAGE_LENGTH} ký tự`);
      message = message.substring(0, MAX_MESSAGE_LENGTH - 100) + '...\n\n<i>[Tin nhắn đã bị cắt ngắn do quá dài]</i>';
    }
    
    // Gửi tin nhắn với timeout
    const result = await Promise.race([
      bot.telegram.sendMessage(chatId, message, messageOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout khi gửi tin nhắn')), 10000)
      )
    ]).catch(error => {
      console.error('Lỗi khi gửi tin nhắn:', error.message);
      return null;
    });
    
    return result;
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn Telegram:', error.message);
    return null;
  }
}

/**
 * Lấy danh sách file từ chat
 * @param {Number} limit Số lượng file tối đa cần lấy
 * @param {Object} options Tùy chọn bổ sung
 * @returns {Promise<Array>} Danh sách file
 */
async function getFilesFromChat(limit = 10, options = {}) {
  try {
    // Kiểm tra bot có sẵn sàng không
    if (!isBotActive()) {
      if (simulationMode) {
        console.log(`[Chế độ giả lập] Lấy danh sách file từ chat (limit: ${limit})`);
        return [
          { 
            file_id: 'simulated_file_1', 
            file_name: 'simulated_file_1.pdf',
            mime_type: 'application/pdf',
            file_size: 1024,
            date: new Date().toISOString()
          },
          { 
            file_id: 'simulated_file_2', 
            file_name: 'simulated_file_2.jpg',
            mime_type: 'image/jpeg',
            file_size: 2048,
            date: new Date().toISOString()
          }
        ];
      }
      
      console.log('Bot chưa sẵn sàng, không thể lấy danh sách file');
      return [];
    }
    
    // Kiểm tra chat ID
    if (!chatId) {
      console.log('Chưa có chat ID, không thể lấy danh sách file');
      return [];
    }
    
    // Chuẩn bị options
    const fetchOptions = {
      limit: limit > 100 ? 100 : limit, // Giới hạn tối đa 100 tin nhắn
      ...options
    };
    
    // Lấy tin nhắn từ chat với timeout
    const messages = await Promise.race([
      bot.telegram.getChatHistory(chatId, fetchOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout khi lấy lịch sử chat')), 15000)
      )
    ]).catch(error => {
      console.error('Lỗi khi lấy lịch sử chat:', error.message);
      return [];
    });
    
    if (!messages || !Array.isArray(messages)) {
      console.log('Không lấy được tin nhắn từ chat');
      return [];
    }
    
    // Lọc ra các tin nhắn có file
    const files = messages
      .filter(msg => msg.document || msg.photo || msg.video || msg.audio || msg.voice)
      .map(msg => {
        let fileObj = msg.document || (msg.photo ? msg.photo[msg.photo.length - 1] : null) || msg.video || msg.audio || msg.voice;
        
        if (!fileObj) return null;
        
        return {
          message_id: msg.message_id,
          file_id: fileObj.file_id,
          file_unique_id: fileObj.file_unique_id,
          file_name: fileObj.file_name || `file_${fileObj.file_id.substring(0, 10)}`,
          mime_type: fileObj.mime_type,
          file_size: fileObj.file_size,
          date: new Date(msg.date * 1000).toISOString(),
          caption: msg.caption
        };
      })
      .filter(file => file !== null);
    
    return files;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file từ chat:', error.message);
    return [];
  }
}

/**
 * Đồng bộ các file từ Telegram
 * @returns {Promise<Object>} Kết quả đồng bộ hóa
 */
async function syncFiles() {
  console.log('===== BẮT ĐẦU ĐỒNG BỘ FILES =====');
  const results = {
    total: 0,
    new: 0,
    skipped: 0,
    errors: 0
  };
  
  try {
    // Tạo thư mục downloads nếu chưa tồn tại
    const downloadDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
      console.log(`Đã tạo thư mục downloads tại ${downloadDir}`);
    }
    
    // Kiểm tra và khởi tạo bot nếu chưa sẵn sàng
    if (!isBotActive()) {
      console.log('Bot không hoạt động, thử khởi động lại...');
      initBot();
      
      // Đợi bot khởi động với timeout
      const timeout = 5000; // 5 giây
      const startTime = Date.now();
      
      while (!isBotActive() && (Date.now() - startTime < timeout)) {
        // Đợi 200ms mỗi lần kiểm tra
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Kiểm tra nếu vẫn không hoạt động sau khi đợi
      if (!isBotActive()) {
        if (Date.now() - startTime >= timeout) {
          console.error('Không thể khởi động bot Telegram do timeout');
        } else {
          console.error('Không thể khởi động bot Telegram');
        }
        return results;
      }
      
      console.log('Đã khởi động lại bot thành công, tiếp tục đồng bộ');
    }
    
    // Kiểm tra chat ID
    const hasChatId = !!chatId || !!config.TELEGRAM_CHAT_ID;
    if (!hasChatId) {
      console.log('Chưa có chat ID. Hãy nhắn tin với bot để lấy chat ID.');
      console.log(getStartInstructions());
      return results;
    }
    
    // Đồng bộ từ local lên Telegram
    console.log('===== ĐỒNG BỘ TỪ LOCAL LÊN TELEGRAM =====');
    // TODO: Triển khai đồng bộ từ local lên Telegram
    
    // Đồng bộ từ Telegram xuống local
    console.log('===== ĐỒNG BỘ TỪ TELEGRAM XUỐNG LOCAL =====');
    
    // Retry lấy danh sách file nếu cần
    let files = [];
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        // Lấy danh sách file từ chat
        files = await getFilesFromChat();
        
        if (files.length > 0) {
          // Nếu tìm thấy file, không cần retry nữa
          break;
        } else {
          console.log(`Không tìm thấy file nào (lần thử ${retries + 1}/${maxRetries})`);
          
          // Nếu chưa có chat ID, không cần thử lại
          if (!chatId) {
            console.log('Chưa có chat ID, không thể đồng bộ file. Vui lòng thiết lập chat ID trước.');
            console.log(getStartInstructions());
            break;
          }
          
          retries++;
          
          if (retries < maxRetries) {
            // Đợi trước khi thử lại
            console.log(`Đợi 5 giây trước khi thử lại...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      } catch (fetchError) {
        console.error(`Lỗi khi lấy danh sách file (lần thử ${retries + 1}/${maxRetries}):`, fetchError.message);
        
        retries++;
        
        if (retries < maxRetries) {
          // Thử khởi động lại bot trước khi retry
          console.log('Khởi động lại bot trước khi thử lại...');
          stopBot();
          await new Promise(resolve => setTimeout(resolve, 1000));
          initBot();
          
          // Đợi bot khởi động với timeout
          const timeout = 3000; // 3 giây
          const startTime = Date.now();
          
          while (!isBotActive() && (Date.now() - startTime < timeout)) {
            // Đợi 200ms mỗi lần kiểm tra
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
    }
    
    results.total = files.length;
    
    if (files.length === 0) {
      console.log('Không tìm thấy file nào trên Telegram hoặc không thể lấy danh sách file');
      console.log('===== KẾT THÚC ĐỒNG BỘ FILES =====');
      console.log(`Đã đồng bộ: ${results.total} | File mới: ${results.new} | Lỗi: ${results.errors} | Bỏ qua: ${results.skipped}`);
      return results;
    }
    
    console.log(`Tìm thấy ${files.length} file để đồng bộ`);
    
    // Đồng bộ từng file
    for (const file of files) {
      try {
        const fileName = file.name;
        const filePath = path.join(downloadDir, fileName);
        
        // Kiểm tra xem file đã tồn tại chưa
        if (fs.existsSync(filePath)) {
          console.log(`File ${fileName} đã tồn tại, bỏ qua`);
          results.skipped++;
          continue;
        }
        
        // Kiểm tra lại bot trước khi tải file
        if (!bot || !isBotActive()) {
          console.log(`Bot không còn hoạt động, khởi động lại...`);
          initBot();
          // Đợi 2 giây cho bot khởi động
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (!isBotActive()) {
            console.error(`Không thể khởi động lại bot để tải file ${fileName}`);
            results.errors++;
            continue;
          }
        }
        
        // Lấy URL file
        const fileUrl = await bot.telegram.getFileLink(file.id);
        
        // Tải file về
        console.log(`Đang tải file ${fileName}...`);
        const response = await axios({
          method: 'GET',
          url: fileUrl.href,
          responseType: 'stream'
        });
        
        // Lưu file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        console.log(`Đã tải xong file ${fileName}`);
        results.new++;
      } catch (fileError) {
        console.error(`Lỗi khi tải file ${file.name}:`, fileError.message);
        results.errors++;
      }
    }
    
    console.log(`===== KẾT THÚC ĐỒNG BỘ FILES =====`);
    console.log(`Đã đồng bộ: ${results.total} | File mới: ${results.new} | Lỗi: ${results.errors} | Bỏ qua: ${results.skipped}`);
    return results;
    
  } catch (error) {
    console.error('Lỗi khi đồng bộ file:', error.message);
    results.errors++;
    console.log(`===== KẾT THÚC ĐỒNG BỘ FILES =====`);
    console.log(`Đã đồng bộ: ${results.total} | File mới: ${results.new} | Lỗi: ${results.errors} | Bỏ qua: ${results.skipped}`);
    return results;
  }
}

/**
 * Hiển thị hướng dẫn cách lấy chat ID đúng
 * @returns {String} Hướng dẫn cách nhận chat ID
 */
function getStartInstructions() {
  const botUsername = bot?.botInfo?.username || 'lab1212_bot';
  const botUrl = config.TELEGRAM_BOT_URL || `https://t.me/${botUsername}`;
  
  let instructions = '===== HƯỚNG DẪN THIẾT LẬP CHAT ID =====\n';
  instructions += `1. Mở Telegram và truy cập bot tại: ${botUrl}\n`;
  instructions += '2. Nhắn tin với bot: /start\n';
  instructions += '3. Bot sẽ trả về chat ID của bạn\n';
  instructions += '4. Sao chép chat ID và cập nhật trong file .env với khóa TELEGRAM_CHAT_ID\n';
  instructions += '5. Khởi động lại ứng dụng\n';
  instructions += '========================================\n';
  return instructions;
}

module.exports = {
  initBot,
  stopBot,
  isBotActive,
  verifyBotToken,
  handleIncomingFile,
  sendFile,
  getFileLink,
  downloadFile,
  sendMessage,
  getFilesFromChat,
  updateChatId,
  syncFiles,
  getStartInstructions
}; 