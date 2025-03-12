const fileManager = require('../utils/fileManager');
const logger = require('../utils/logger');
const { formatSize } = require('../utils/helpers');

// Xử lý khi nhận được file
exports.handleFileUpload = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Lấy thông tin file
        const document = msg.document;
        const fileId = document.file_id;
        const fileName = document.file_name || `file_${Date.now()}`;
        
        // Gửi thông báo đang xử lý
        const processingMsg = await bot.sendMessage(chatId, `⏳ Đang xử lý file "${fileName}"...`);
        
        // Lưu file vào hệ thống
        const result = await fileManager.saveFile(userId, fileId, bot, fileName, 'document');
        
        // Cập nhật thông báo
        if (result.success) {
            const size = formatSize(result.size);
            await bot.editMessageText(
                `✅ Đã tải lên file "${fileName}" (${size})`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
            
            // Hiển thị các tùy chọn cho file
            await bot.sendMessage(chatId, `Bạn có thể thực hiện các thao tác với file "${fileName}":`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⬇️ Tải xuống', callback_data: `download:${fileName}` },
                            { text: '🗑️ Xóa', callback_data: `delete:${fileName}` }
                        ],
                        [
                            { text: '📋 Xem danh sách file', callback_data: 'list' }
                        ]
                    ]
                }
            });
        } else {
            await bot.editMessageText(
                `❌ Lỗi khi tải lên file: ${result.error}`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý file upload cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi tải lên file. Vui lòng thử lại sau.');
    }
};

// Xử lý khi nhận được ảnh
exports.handlePhotoUpload = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Lấy ảnh chất lượng cao nhất (cuối cùng trong mảng)
        const photos = msg.photo;
        const photo = photos[photos.length - 1];
        const fileId = photo.file_id;
        
        // Tạo tên file dựa trên thời gian
        const fileName = `photo_${Date.now()}.jpg`;
        
        // Gửi thông báo đang xử lý
        const processingMsg = await bot.sendMessage(chatId, `⏳ Đang xử lý ảnh "${fileName}"...`);
        
        // Lưu ảnh vào hệ thống
        const result = await fileManager.saveFile(userId, fileId, bot, fileName, 'photo');
        
        // Cập nhật thông báo
        if (result.success) {
            const size = formatSize(result.size);
            await bot.editMessageText(
                `✅ Đã tải lên ảnh "${fileName}" (${size})`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
            
            // Hiển thị các tùy chọn cho file ảnh
            await bot.sendMessage(chatId, `Bạn có thể thực hiện các thao tác với ảnh "${fileName}":`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⬇️ Tải xuống', callback_data: `download:${fileName}` },
                            { text: '🗑️ Xóa', callback_data: `delete:${fileName}` }
                        ],
                        [
                            { text: '📋 Xem danh sách file', callback_data: 'list' }
                        ]
                    ]
                }
            });
        } else {
            await bot.editMessageText(
                `❌ Lỗi khi tải lên ảnh: ${result.error}`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý photo upload cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi tải lên ảnh. Vui lòng thử lại sau.');
    }
};

// Xử lý khi nhận được video
exports.handleVideoUpload = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Lấy thông tin video
        const video = msg.video;
        const fileId = video.file_id;
        const fileName = video.file_name || `video_${Date.now()}.mp4`;
        
        // Gửi thông báo đang xử lý
        const processingMsg = await bot.sendMessage(chatId, `⏳ Đang xử lý video "${fileName}"...`);
        
        // Lưu video vào hệ thống
        const result = await fileManager.saveFile(userId, fileId, bot, fileName, 'video');
        
        // Cập nhật thông báo
        if (result.success) {
            const size = formatSize(result.size);
            await bot.editMessageText(
                `✅ Đã tải lên video "${fileName}" (${size})`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
            
            // Hiển thị các tùy chọn cho file video
            await bot.sendMessage(chatId, `Bạn có thể thực hiện các thao tác với video "${fileName}":`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⬇️ Tải xuống', callback_data: `download:${fileName}` },
                            { text: '🗑️ Xóa', callback_data: `delete:${fileName}` }
                        ],
                        [
                            { text: '📋 Xem danh sách file', callback_data: 'list' }
                        ]
                    ]
                }
            });
        } else {
            await bot.editMessageText(
                `❌ Lỗi khi tải lên video: ${result.error}`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý video upload cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi tải lên video. Vui lòng thử lại sau.');
    }
};

// Xử lý khi nhận được âm thanh
exports.handleAudioUpload = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Lấy thông tin audio
        const audio = msg.audio;
        const fileId = audio.file_id;
        const fileName = audio.title || audio.file_name || `audio_${Date.now()}.mp3`;
        
        // Gửi thông báo đang xử lý
        const processingMsg = await bot.sendMessage(chatId, `⏳ Đang xử lý âm thanh "${fileName}"...`);
        
        // Lưu audio vào hệ thống
        const result = await fileManager.saveFile(userId, fileId, bot, fileName, 'audio');
        
        // Cập nhật thông báo
        if (result.success) {
            const size = formatSize(result.size);
            await bot.editMessageText(
                `✅ Đã tải lên âm thanh "${fileName}" (${size})`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
            
            // Hiển thị các tùy chọn cho file audio
            await bot.sendMessage(chatId, `Bạn có thể thực hiện các thao tác với âm thanh "${fileName}":`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⬇️ Tải xuống', callback_data: `download:${fileName}` },
                            { text: '🗑️ Xóa', callback_data: `delete:${fileName}` }
                        ],
                        [
                            { text: '📋 Xem danh sách file', callback_data: 'list' }
                        ]
                    ]
                }
            });
        } else {
            await bot.editMessageText(
                `❌ Lỗi khi tải lên âm thanh: ${result.error}`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý audio upload cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi tải lên âm thanh. Vui lòng thử lại sau.');
    }
};

// Xử lý tải file xuống
exports.handleDownload = async (bot, msg, fileName) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Lấy thông tin file
        const fileInfo = fileManager.getFileInfo(userId, fileName);
        
        if (!fileInfo.success) {
            await bot.sendMessage(chatId, `❌ Lỗi khi tải xuống: ${fileInfo.error}`);
            return;
        }
        
        // Lấy file để gửi
        const fileForSending = fileManager.getFileForSending(userId, fileName);
        
        if (!fileForSending.success) {
            await bot.sendMessage(chatId, `❌ Lỗi khi tải xuống: ${fileForSending.error}`);
            return;
        }
        
        // Gửi thông báo đang xử lý
        const processingMsg = await bot.sendMessage(chatId, `⏳ Đang chuẩn bị tải xuống "${fileName}"...`);
        
        // Xác định loại media để gửi phù hợp
        const mimeType = fileInfo.mimeType || 'application/octet-stream';
        
        if (mimeType.startsWith('image/')) {
            // Gửi dưới dạng ảnh nếu là file hình ảnh
            await bot.sendPhoto(chatId, fileForSending.stream, {
                caption: `Tên file: ${fileName}\nKích thước: ${formatSize(fileInfo.size)}`
            });
        } else if (mimeType.startsWith('video/')) {
            // Gửi dưới dạng video nếu là file video
            await bot.sendVideo(chatId, fileForSending.stream, {
                caption: `Tên file: ${fileName}\nKích thước: ${formatSize(fileInfo.size)}`
            });
        } else if (mimeType.startsWith('audio/')) {
            // Gửi dưới dạng audio nếu là file âm thanh
            await bot.sendAudio(chatId, fileForSending.stream, {
                caption: `Tên file: ${fileName}\nKích thước: ${formatSize(fileInfo.size)}`
            });
        } else {
            // Gửi dưới dạng file thông thường cho các loại khác
            await bot.sendDocument(chatId, fileForSending.stream, {
                caption: `Tên file: ${fileName}\nKích thước: ${formatSize(fileInfo.size)}`
            });
        }
        
        // Xóa thông báo đang xử lý
        await bot.deleteMessage(chatId, processingMsg.message_id);
        
        logger.info(`Người dùng ${userId} đã tải xuống file: ${fileName}`);
    } catch (error) {
        logger.error(`Lỗi khi xử lý download cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi tải xuống file. Vui lòng thử lại sau.');
    }
};

// Xử lý xem trước file
exports.handlePreview = async (bot, msg, fileName) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Lấy thông tin file
        const fileInfo = fileManager.getFileInfo(userId, fileName);
        
        if (!fileInfo.success) {
            await bot.sendMessage(chatId, `❌ Lỗi khi xem trước: ${fileInfo.error}`);
            return;
        }
        
        // Hiển thị thông tin chi tiết về file
        const createdDate = formatDate(fileInfo.created);
        const modifiedDate = formatDate(fileInfo.modified);
        const size = formatSize(fileInfo.size);
        
        const previewMessage = `
📄 *Thông tin file*

📝 Tên: ${fileInfo.name}
💾 Kích thước: ${size}
📁 Loại: ${fileInfo.mimeType}
📅 Ngày tạo: ${createdDate}
🔄 Sửa đổi lần cuối: ${modifiedDate}
        `;
        
        // Hiển thị các tùy chọn cho file
        await bot.sendMessage(chatId, previewMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '⬇️ Tải xuống', callback_data: `download:${fileName}` },
                        { text: '✏️ Đổi tên', callback_data: `rename:${fileName}` },
                        { text: '🗑️ Xóa', callback_data: `delete:${fileName}` }
                    ],
                    [
                        { text: '◀️ Quay lại', callback_data: 'list' }
                    ]
                ]
            }
        });
    } catch (error) {
        logger.error(`Lỗi khi xử lý preview cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi xem trước file. Vui lòng thử lại sau.');
    }
};

// Xử lý xóa file
exports.handleDelete = async (bot, msg, itemPath) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        // Thực hiện xóa
        const result = fileManager.deleteItem(userId, itemPath);
        
        if (result.success) {
            await bot.sendMessage(chatId, `✅ Đã xóa: ${itemPath}`);
            
            // Cập nhật lại danh sách file
            const commandHandler = require('./commandHandler');
            commandHandler.handleList(bot, msg);
        } else {
            await bot.sendMessage(chatId, `❌ Lỗi khi xóa: ${result.error}`);
        }
    } catch (error) {
        logger.error(`Lỗi khi xử lý delete cho người dùng ${userId}: ${error.message}`);
        await bot.sendMessage(chatId, 'Đã xảy ra lỗi khi xóa. Vui lòng thử lại sau.');
    }
}; 