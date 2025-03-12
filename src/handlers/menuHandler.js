const fileManager = require('../utils/fileManager');
const logger = require('../utils/logger');
const commandHandler = require('./commandHandler');
const fileHandler = require('./fileHandler');

// Xử lý callback query từ inline keyboard
exports.handleCallbackQuery = async (bot, query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const callbackData = query.data;
    
    try {
        // Thông báo cho Telegram rằng callback query đã được xử lý
        await bot.answerCallbackQuery(query.id);
        
        // Phân tích cú pháp callback_data: action:param
        const parts = callbackData.split(':');
        const action = parts[0];
        const param = parts.length > 1 ? parts.slice(1).join(':') : null;
        
        // Xử lý theo loại action
        switch (action) {
            case 'list':
                // Hiển thị danh sách file/thư mục
                commandHandler.handleList(bot, query.message);
                break;
                
            case 'cd':
                // Di chuyển vào thư mục
                if (param) {
                    await handleCdCallback(bot, query.message, param);
                }
                break;
                
            case 'mkdir':
                // Yêu cầu tên thư mục mới
                await promptForInput(bot, chatId, 'mkdir', 'Nhập tên thư mục mới:');
                break;
                
            case 'upload':
                // Hướng dẫn tải lên
                await bot.sendMessage(chatId, 'Để tải lên file, bạn chỉ cần gửi file đó cho tôi.');
                break;
                
            case 'search':
                // Yêu cầu từ khóa tìm kiếm
                await promptForInput(bot, chatId, 'search', 'Nhập từ khóa tìm kiếm:');
                break;
                
            case 'preview':
                // Xem thông tin chi tiết của file
                if (param) {
                    await fileHandler.handlePreview(bot, query.message, param);
                }
                break;
                
            case 'download':
                // Tải file xuống
                if (param) {
                    await fileHandler.handleDownload(bot, query.message, param);
                }
                break;
                
            case 'delete':
                // Xác nhận xóa
                if (param) {
                    await bot.sendMessage(chatId, `Bạn có chắc chắn muốn xóa "${param}"? Thao tác này không thể hoàn tác.`, {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '✅ Xác nhận xóa', callback_data: `confirm_delete:${param}` },
                                    { text: '❌ Hủy', callback_data: 'cancel_delete' }
                                ]
                            ]
                        }
                    });
                }
                break;
                
            case 'confirm_delete':
                // Xác nhận đã được đưa ra, thực hiện xóa
                if (param) {
                    await fileHandler.handleDelete(bot, query.message, param);
                }
                break;
                
            case 'cancel_delete':
                // Hủy xóa
                await bot.sendMessage(chatId, '❌ Đã hủy thao tác xóa.');
                break;
                
            case 'rename':
                // Yêu cầu tên mới
                if (param) {
                    await promptForRename(bot, chatId, param);
                }
                break;
                
            case 'goto':
                // Di chuyển đến thư mục (từ kết quả tìm kiếm)
                if (param) {
                    await handleGotoCallback(bot, query.message, param);
                }
                break;
                
            case 'gotofile':
                // Di chuyển đến thư mục chứa file (từ kết quả tìm kiếm)
                if (param) {
                    await handleGotoFileCallback(bot, query.message, param);
                }
                break;
                
            case 'info':
                // Hiển thị thông tin kho lưu trữ
                commandHandler.handleInfo(bot, query.message);
                break;
                
            case 'help':
                // Hiển thị trợ giúp
                commandHandler.handleHelp(bot, query.message);
                break;
                
            default:
                logger.warn(`Không xử lý được callback action: ${action}`);
                await bot.sendMessage(chatId, 'Thao tác không hợp lệ hoặc chưa được hỗ trợ.');
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý callback query cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi xử lý thao tác. Vui lòng thử lại sau.');
    }
};

// Xử lý tin nhắn văn bản thông thường
exports.handleTextMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    try {
        // Kiểm tra xem người dùng đang ở trong trạng thái chờ nhập liệu không
        const pendingInput = userInputState[userId];
        
        if (pendingInput) {
            // Xóa trạng thái chờ
            delete userInputState[userId];
            
            // Xử lý dựa trên loại input đang chờ
            switch (pendingInput.type) {
                case 'mkdir':
                    // Tạo thư mục mới với tên đã nhập
                    commandHandler.handleMkdir(bot, msg, text);
                    break;
                    
                case 'search':
                    // Tìm kiếm với từ khóa đã nhập
                    commandHandler.handleSearch(bot, msg, text);
                    break;
                    
                case 'rename':
                    // Đổi tên file/thư mục
                    const args = `${pendingInput.oldName} ${text}`;
                    commandHandler.handleRename(bot, msg, args);
                    break;
                    
                default:
                    await bot.sendMessage(chatId, 'Không thể xử lý yêu cầu. Vui lòng thử lại.');
            }
            
            return;
        }
        
        // Nếu không phải đang chờ nhập liệu, hiển thị menu chính
        const mainMenu = `
Xin chào! Bạn có thể sử dụng các lệnh sau:

/list - Xem danh sách file
/help - Xem hướng dẫn sử dụng
/start - Khởi động lại bot

Hoặc chọn một tùy chọn từ menu bên dưới:
        `;
        
        await bot.sendMessage(chatId, mainMenu, {
            reply_markup: createMainMenu()
        });
    } catch (error) {
        logger.error(`Lỗi khi xử lý tin nhắn văn bản cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi xử lý tin nhắn. Vui lòng thử lại sau.');
    }
};

// Lưu trữ trạng thái chờ nhập liệu của người dùng
const userInputState = {};

// Yêu cầu người dùng nhập thông tin
async function promptForInput(bot, chatId, type, prompt) {
    try {
        const userId = chatId; // Trong trường hợp này, chatId cũng chính là userId
        
        // Lưu trạng thái chờ nhập liệu
        userInputState[userId] = { type };
        
        // Gửi yêu cầu nhập liệu
        await bot.sendMessage(chatId, prompt, {
            reply_markup: {
                force_reply: true
            }
        });
    } catch (error) {
        logger.error(`Lỗi khi yêu cầu nhập liệu: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
        
        // Xóa trạng thái chờ nếu có lỗi
        delete userInputState[chatId];
    }
}

// Yêu cầu người dùng nhập tên mới khi đổi tên
async function promptForRename(bot, chatId, oldName) {
    try {
        const userId = chatId;
        
        // Lưu trạng thái chờ nhập liệu với tên cũ
        userInputState[userId] = { type: 'rename', oldName };
        
        // Gửi yêu cầu nhập tên mới
        await bot.sendMessage(chatId, `Bạn đang đổi tên "${oldName}". Vui lòng nhập tên mới:`, {
            reply_markup: {
                force_reply: true
            }
        });
    } catch (error) {
        logger.error(`Lỗi khi yêu cầu nhập tên mới: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
        
        // Xóa trạng thái chờ nếu có lỗi
        delete userInputState[chatId];
    }
}

// Xử lý callback di chuyển vào thư mục
async function handleCdCallback(bot, msg, targetPath) {
    const chatId = msg.chat.id;
    const userId = msg.chat.id;
    
    try {
        // Di chuyển đến thư mục
        const result = fileManager.changeDirectory(userId, targetPath);
        
        if (result.success) {
            // Liệt kê nội dung của thư mục mới
            commandHandler.handleList(bot, msg);
        } else {
            await bot.sendMessage(chatId, `❌ Lỗi khi di chuyển: ${result.error}`);
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý cd callback: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi di chuyển thư mục. Vui lòng thử lại sau.');
    }
}

// Xử lý callback di chuyển đến thư mục từ kết quả tìm kiếm
async function handleGotoCallback(bot, msg, targetPath) {
    const chatId = msg.chat.id;
    const userId = msg.chat.id;
    
    try {
        // Di chuyển đến thư mục cha của đường dẫn
        const dirPath = targetPath;
        const result = fileManager.changeDirectory(userId, dirPath);
        
        if (result.success) {
            await bot.sendMessage(chatId, `✅ Đã di chuyển đến: ${result.path}`);
            
            // Liệt kê nội dung của thư mục mới
            commandHandler.handleList(bot, msg);
        } else {
            await bot.sendMessage(chatId, `❌ Lỗi khi di chuyển: ${result.error}`);
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý goto callback: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi di chuyển thư mục. Vui lòng thử lại sau.');
    }
}

// Xử lý callback di chuyển đến thư mục chứa file từ kết quả tìm kiếm
async function handleGotoFileCallback(bot, msg, targetPath) {
    const chatId = msg.chat.id;
    const userId = msg.chat.id;
    
    try {
        // Lấy đường dẫn thư mục chứa file
        const dirPath = require('path').dirname(targetPath);
        
        // Di chuyển đến thư mục chứa file
        const result = fileManager.changeDirectory(userId, dirPath);
        
        if (result.success) {
            await bot.sendMessage(chatId, `✅ Đã di chuyển đến thư mục chứa file: ${result.path}`);
            
            // Liệt kê nội dung của thư mục mới
            commandHandler.handleList(bot, msg);
        } else {
            await bot.sendMessage(chatId, `❌ Lỗi khi di chuyển: ${result.error}`);
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý gotofile callback: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi di chuyển thư mục. Vui lòng thử lại sau.');
    }
}

// Tạo menu chính
function createMainMenu() {
    return {
        keyboard: [
            [{ text: '📂 Danh sách file' }, { text: '📤 Tải lên file' }],
            [{ text: '📁 Tạo thư mục' }, { text: '🔍 Tìm kiếm' }],
            [{ text: '📊 Thông tin' }, { text: '❓ Trợ giúp' }]
        ],
        resize_keyboard: true
    };
}

module.exports.createMainMenu = createMainMenu; 