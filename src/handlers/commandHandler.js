const fileManager = require('../utils/fileManager');
const logger = require('../utils/logger');
const { formatSize, formatDate, createMainMenu } = require('../utils/helpers');

// Xử lý lệnh /start
exports.handleStart = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Đảm bảo thư mục người dùng tồn tại
        fileManager.ensureUserDirectory(userId);
        
        // Reset vị trí hiện tại về thư mục gốc
        fileManager.setCurrentPath(userId, '/');
        
        // Gửi tin nhắn chào mừng
        const welcomeMessage = `
Chào mừng đến với TeleDrive! 🚀

Bot này giúp bạn quản lý file như một dịch vụ lưu trữ đám mây.

Các lệnh cơ bản:
/help - Xem hướng dẫn sử dụng
/list - Liệt kê các file trong thư mục hiện tại
/mkdir [tên] - Tạo thư mục mới
/cd [đường dẫn] - Di chuyển đến thư mục
/search [từ khóa] - Tìm kiếm file
/info - Xem thông tin về kho lưu trữ
        `;
        
        await bot.sendMessage(chatId, welcomeMessage, {
            reply_markup: createMainMenu()
        });
        
        logger.info(`Người dùng ${userId} đã bắt đầu sử dụng bot`);
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh start cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi khởi động bot. Vui lòng thử lại sau.');
    }
};

// Xử lý lệnh /help
exports.handleHelp = async (bot, msg) => {
    const chatId = msg.chat.id;
    
    const helpMessage = `
📚 *Hướng dẫn sử dụng TeleDrive* 📚

*Quản lý thư mục:*
/list - Liệt kê các file trong thư mục hiện tại
/mkdir [tên] - Tạo thư mục mới
/cd [đường dẫn] - Di chuyển đến thư mục
/cd .. - Quay về thư mục cha
/pwd - Xem đường dẫn hiện tại

*Quản lý file:*
- Gửi file bất kỳ để tải lên thư mục hiện tại
/rename [tên cũ] [tên mới] - Đổi tên file/thư mục
/delete [tên] - Xóa file/thư mục
/download [tên] - Tải file xuống

*Tìm kiếm:*
/search [từ khóa] - Tìm file/thư mục theo tên

*Khác:*
/info - Xem thông tin kho lưu trữ
/start - Khởi động lại bot
/help - Xem trợ giúp này

💡 *Mẹo:* Bạn có thể sử dụng menu bên dưới để truy cập nhanh các chức năng.
    `;
    
    await bot.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown',
        reply_markup: createMainMenu()
    });
};

// Xử lý lệnh /list
exports.handleList = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Lấy đường dẫn hiện tại
        const currentPath = fileManager.getCurrentPath(userId);
        
        // Liệt kê thư mục
        const result = fileManager.listDirectory(userId);
        
        if (!result.success) {
            await bot.sendMessage(chatId, `❌ Lỗi: ${result.error}`);
            return;
        }
        
        if (result.contents.length === 0) {
            await bot.sendMessage(chatId, `📂 *${currentPath}*\n\nThư mục trống.`, {
                parse_mode: 'Markdown'
            });
            return;
        }
        
        // Phân loại nội dung thành thư mục và file
        const folders = result.contents.filter(item => item.isDirectory);
        const files = result.contents.filter(item => !item.isDirectory);
        
        // Sắp xếp theo tên
        folders.sort((a, b) => a.name.localeCompare(b.name));
        files.sort((a, b) => a.name.localeCompare(b.name));
        
        // Tạo danh sách hiển thị
        let message = `📂 *${currentPath}*\n\n`;
        
        if (folders.length > 0) {
            message += '*Thư mục:*\n';
            folders.forEach(folder => {
                message += `📁 ${folder.name}\n`;
            });
            message += '\n';
        }
        
        if (files.length > 0) {
            message += '*File:*\n';
            files.forEach(file => {
                const size = formatSize(file.size);
                const date = formatDate(file.modified);
                message += `📄 ${file.name} (${size}) - ${date}\n`;
            });
        }
        
        // Tạo menu thao tác cho từng item
        const inlineKeyboard = [];
        
        // Nút quay lại nếu không ở thư mục gốc
        if (currentPath !== '/') {
            inlineKeyboard.push([
                { text: '⬆️ Quay lại thư mục cha', callback_data: 'cd:..' }
            ]);
        }
        
        // Thêm nút cho mỗi thư mục
        folders.forEach(folder => {
            inlineKeyboard.push([
                { text: `📁 ${folder.name}`, callback_data: `cd:${folder.name}` },
                { text: '🗑️', callback_data: `delete:${folder.name}` }
            ]);
        });
        
        // Thêm nút cho mỗi file
        files.forEach(file => {
            inlineKeyboard.push([
                { text: `📄 ${file.name}`, callback_data: `preview:${file.name}` },
                { text: '⬇️', callback_data: `download:${file.name}` },
                { text: '🗑️', callback_data: `delete:${file.name}` }
            ]);
        });
        
        // Thêm menu chính ở cuối
        inlineKeyboard.push([
            { text: '📤 Tải lên', callback_data: 'upload' },
            { text: '📁 Tạo thư mục', callback_data: 'mkdir' },
            { text: '🔍 Tìm kiếm', callback_data: 'search' }
        ]);
        
        // Gửi danh sách
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        });
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh list cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi liệt kê thư mục. Vui lòng thử lại sau.');
    }
};

// Xử lý lệnh /mkdir
exports.handleMkdir = async (bot, msg, folderName) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!folderName || folderName.trim() === '') {
        await bot.sendMessage(chatId, 'Vui lòng nhập tên thư mục. Ví dụ: /mkdir ThuMucMoi');
        return;
    }
    
    try {
        // Tạo thư mục mới
        const result = fileManager.createDirectory(userId, folderName);
        
        if (result.success) {
            await bot.sendMessage(chatId, `✅ Đã tạo thư mục: ${folderName}`);
            
            // Liệt kê lại thư mục hiện tại
            exports.handleList(bot, msg);
        } else {
            await bot.sendMessage(chatId, `❌ Lỗi khi tạo thư mục: ${result.error}`);
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh mkdir cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi tạo thư mục. Vui lòng thử lại sau.');
    }
};

// Xử lý lệnh /cd
exports.handleCd = async (bot, msg, targetPath) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!targetPath || targetPath.trim() === '') {
        await bot.sendMessage(chatId, 'Vui lòng nhập đường dẫn thư mục. Ví dụ: /cd ThuMucCon hoặc /cd .. để quay lại thư mục cha');
        return;
    }
    
    try {
        // Di chuyển đến thư mục mới
        const result = fileManager.changeDirectory(userId, targetPath);
        
        if (result.success) {
            await bot.sendMessage(chatId, `✅ Đã di chuyển đến: ${result.path}`);
            
            // Liệt kê nội dung của thư mục mới
            exports.handleList(bot, msg);
        } else {
            await bot.sendMessage(chatId, `❌ Lỗi khi di chuyển: ${result.error}`);
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh cd cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi di chuyển thư mục. Vui lòng thử lại sau.');
    }
};

// Xử lý lệnh /search
exports.handleSearch = async (bot, msg, searchTerm) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!searchTerm || searchTerm.trim() === '') {
        await bot.sendMessage(chatId, 'Vui lòng nhập từ khóa tìm kiếm. Ví dụ: /search document');
        return;
    }
    
    try {
        // Thực hiện tìm kiếm
        const result = fileManager.searchItems(userId, searchTerm);
        
        if (!result.success) {
            await bot.sendMessage(chatId, `❌ Lỗi: ${result.error}`);
            return;
        }
        
        if (result.results.length === 0) {
            await bot.sendMessage(chatId, `🔍 Không tìm thấy kết quả nào cho "${searchTerm}"`);
            return;
        }
        
        // Phân loại kết quả thành thư mục và file
        const folders = result.results.filter(item => item.isDirectory);
        const files = result.results.filter(item => !item.isDirectory);
        
        // Tạo tin nhắn kết quả
        let message = `🔍 *Kết quả tìm kiếm cho "${searchTerm}":*\n\n`;
        
        if (folders.length > 0) {
            message += '*Thư mục:*\n';
            folders.forEach(folder => {
                message += `📁 ${folder.name} (${folder.relativePath})\n`;
            });
            message += '\n';
        }
        
        if (files.length > 0) {
            message += '*File:*\n';
            files.forEach(file => {
                const size = formatSize(file.size);
                message += `📄 ${file.name} (${file.relativePath}) - ${size}\n`;
            });
        }
        
        // Tạo menu thao tác cho từng kết quả
        const inlineKeyboard = [];
        
        // Thêm nút cho mỗi thư mục
        folders.forEach(folder => {
            inlineKeyboard.push([
                { text: `📁 ${folder.name}`, callback_data: `goto:${folder.relativePath}` }
            ]);
        });
        
        // Thêm nút cho mỗi file
        files.forEach(file => {
            inlineKeyboard.push([
                { text: `📄 ${file.name}`, callback_data: `gotofile:${file.relativePath}` }
            ]);
        });
        
        // Gửi kết quả tìm kiếm
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        });
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh search cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại sau.');
    }
};

// Xử lý lệnh /pwd (print working directory)
exports.handlePwd = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        const currentPath = fileManager.getCurrentPath(userId);
        await bot.sendMessage(chatId, `📂 Vị trí hiện tại: *${currentPath}*`, {
            parse_mode: 'Markdown'
        });
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh pwd cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi lấy đường dẫn hiện tại.');
    }
};

// Xử lý lệnh /delete
exports.handleDelete = async (bot, msg, itemPath) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!itemPath || itemPath.trim() === '') {
        await bot.sendMessage(chatId, 'Vui lòng nhập tên file hoặc thư mục cần xóa. Ví dụ: /delete myfile.txt');
        return;
    }
    
    try {
        // Yêu cầu xác nhận trước khi xóa
        await bot.sendMessage(chatId, `Bạn có chắc chắn muốn xóa "${itemPath}"? Thao tác này không thể hoàn tác.`, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Xác nhận xóa', callback_data: `confirm_delete:${itemPath}` },
                        { text: '❌ Hủy', callback_data: 'cancel_delete' }
                    ]
                ]
            }
        });
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh delete cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi xóa item. Vui lòng thử lại sau.');
    }
};

// Xử lý lệnh /rename
exports.handleRename = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Phân tích cú pháp: /rename oldName newName
    const argArray = args.split(' ');
    if (argArray.length !== 2) {
        await bot.sendMessage(chatId, 'Vui lòng sử dụng cú pháp: /rename [tên cũ] [tên mới]');
        return;
    }
    
    const oldName = argArray[0];
    const newName = argArray[1];
    
    try {
        // Thực hiện đổi tên
        const result = fileManager.renameItem(userId, oldName, newName);
        
        if (result.success) {
            await bot.sendMessage(chatId, `✅ Đã đổi tên từ "${oldName}" thành "${newName}"`);
            
            // Liệt kê lại thư mục hiện tại
            exports.handleList(bot, msg);
        } else {
            await bot.sendMessage(chatId, `❌ Lỗi khi đổi tên: ${result.error}`);
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh rename cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi đổi tên. Vui lòng thử lại sau.');
    }
};

// Xử lý lệnh /info
exports.handleInfo = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        const userPath = fileManager.getUserBasePath(userId);
        const currentPath = fileManager.getCurrentPath(userId);
        
        // Tính tổng dung lượng sử dụng
        let totalSize = 0;
        let fileCount = 0;
        let folderCount = 0;
        
        function calculateSize(dirPath) {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    folderCount++;
                    calculateSize(itemPath);
                } else {
                    fileCount++;
                    totalSize += stats.size;
                }
            }
        }
        
        // Tính toán nếu thư mục người dùng tồn tại
        if (fs.existsSync(userPath)) {
            calculateSize(userPath);
        }
        
        // Format dung lượng để hiển thị
        const formattedSize = formatSize(totalSize);
        
        const infoMessage = `
📊 *Thông tin kho lưu trữ của bạn*

📂 Vị trí hiện tại: ${currentPath}
📁 Tổng số thư mục: ${folderCount}
📄 Tổng số file: ${fileCount}
💾 Dung lượng sử dụng: ${formattedSize}
        `;
        
        await bot.sendMessage(chatId, infoMessage, {
            parse_mode: 'Markdown',
            reply_markup: createMainMenu()
        });
    } catch (error) {
        logger.error(`Lỗi khi xử lý lệnh info cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi lấy thông tin kho lưu trữ.');
    }
}; 