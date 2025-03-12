const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Khởi tạo bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Lưu trữ thông tin file
let fileStore = {
  files: [],
  folders: []
};

// Hàm tạo menu inline keyboard
function createFileMenu(currentPath = '/') {
  const items = [...fileStore.folders, ...fileStore.files].filter(item => 
    path.dirname(item.path) === currentPath
  );
  
  const buttons = items.map(item => [{
    text: item.name,
    callback_data: `view_${item.type}_${item.id}`
  }]);
  
  // Thêm nút quay lại nếu không ở thư mục gốc
  if (currentPath !== '/') {
    buttons.push([{
      text: '⬅️ Quay lại',
      callback_data: `back_${path.dirname(currentPath)}`
    }]);
  }
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Xử lý lệnh /start
bot.command('start', (ctx) => {
  ctx.reply(
    'Chào mừng đến với Bot quản lý file! 📁\n\n' +
    'Các lệnh có sẵn:\n' +
    '/files - Xem danh sách file\n' +
    '/upload - Upload file mới\n' +
    '/mkdir - Tạo thư mục mới\n' +
    '/search - Tìm kiếm file\n' +
    '/clean - Dọn dẹp file rác'
  );
});

// Xử lý lệnh /files
bot.command('files', async (ctx) => {
  const menu = createFileMenu();
  await ctx.reply('📁 Danh sách file của bạn:', menu);
});

// Xử lý lệnh /upload
bot.command('upload', (ctx) => {
  ctx.reply(
    'Để upload file:\n' +
    '1. Gửi file trực tiếp cho bot\n' +
    '2. Hoặc forward tin nhắn chứa file từ chat khác'
  );
});

// Xử lý khi nhận file mới
bot.on(['document', 'photo', 'video', 'audio'], async (ctx) => {
  try {
    const file = ctx.message.document || ctx.message.photo?.[0] || ctx.message.video || ctx.message.audio;
    if (!file) return;

    const fileId = file.file_id;
    const fileName = file.file_name || `file_${Date.now()}${mime.extension(file.mime_type)}`;
    
    // Lưu thông tin file
    const fileInfo = {
      id: fileId,
      name: fileName,
      type: 'file',
      path: '/' + fileName,
      size: file.file_size,
      mime_type: file.mime_type,
      date: new Date(),
      telegram_file_id: fileId
    };
    
    fileStore.files.push(fileInfo);
    
    await ctx.reply(
      `✅ Đã lưu file: ${fileName}\n` +
      `📦 Kích thước: ${Math.round(file.file_size / 1024)} KB\n` +
      `📎 Loại file: ${file.mime_type || 'Không xác định'}`
    );
  } catch (error) {
    console.error('Error handling file:', error);
    ctx.reply('❌ Có lỗi xảy ra khi xử lý file');
  }
});

// Xử lý lệnh /mkdir
bot.command('mkdir', (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Vui lòng nhập tên thư mục. Ví dụ: /mkdir Photos');
  }
  
  const folderName = args[1];
  const folderId = Date.now().toString();
  
  fileStore.folders.push({
    id: folderId,
    name: folderName,
    type: 'folder',
    path: '/' + folderName,
    date: new Date()
  });
  
  ctx.reply(`📁 Đã tạo thư mục: ${folderName}`);
});

// Xử lý lệnh /search
bot.command('search', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Vui lòng nhập từ khóa tìm kiếm. Ví dụ: /search photo');
  }
  
  const keyword = args[1].toLowerCase();
  const results = [...fileStore.files, ...fileStore.folders].filter(item =>
    item.name.toLowerCase().includes(keyword)
  );
  
  if (results.length === 0) {
    return ctx.reply('❌ Không tìm thấy kết quả nào');
  }
  
  const message = results.map(item => 
    `${item.type === 'folder' ? '📁' : '📄'} ${item.name}`
  ).join('\n');
  
  await ctx.reply(`🔍 Kết quả tìm kiếm:\n\n${message}`);
});

// Xử lý lệnh /clean
bot.command('clean', async (ctx) => {
  const now = new Date();
  const oldFiles = fileStore.files.filter(file => {
    const fileDate = new Date(file.date);
    const diffDays = (now - fileDate) / (1000 * 60 * 60 * 24);
    return diffDays > 30; // File cũ hơn 30 ngày
  });
  
  if (oldFiles.length === 0) {
    return ctx.reply('✨ Không có file nào cần dọn dẹp');
  }
  
  const totalSize = oldFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const message = 
    `🗑 Các file có thể xóa:\n\n` +
    oldFiles.map(file => `- ${file.name}`).join('\n') +
    `\n\nTổng dung lượng có thể giải phóng: ${Math.round(totalSize / 1024 / 1024)} MB`;
  
  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [[
        { text: '🗑 Xóa tất cả', callback_data: 'clean_all' },
        { text: '❌ Hủy', callback_data: 'clean_cancel' }
      ]]
    }
  });
});

// Xử lý các callback query
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data.startsWith('view_file_')) {
    const fileId = data.replace('view_file_', '');
    const file = fileStore.files.find(f => f.id === fileId);
    if (file) {
      await ctx.reply(
        `📄 Chi tiết file:\n\n` +
        `Tên: ${file.name}\n` +
        `Kích thước: ${Math.round(file.size / 1024)} KB\n` +
        `Loại: ${file.mime_type || 'Không xác định'}\n` +
        `Ngày tạo: ${file.date.toLocaleDateString()}`
      );
    }
  }
  else if (data.startsWith('view_folder_')) {
    const folderId = data.replace('view_folder_', '');
    const folder = fileStore.folders.find(f => f.id === folderId);
    if (folder) {
      const menu = createFileMenu(folder.path);
      await ctx.editMessageText(`📁 ${folder.name}:`, menu);
    }
  }
  else if (data.startsWith('back_')) {
    const targetPath = data.replace('back_', '');
    const menu = createFileMenu(targetPath);
    await ctx.editMessageText('📁 Quay lại:', menu);
  }
  else if (data === 'clean_all') {
    const now = new Date();
    const oldFiles = fileStore.files.filter(file => {
      const fileDate = new Date(file.date);
      const diffDays = (now - fileDate) / (1000 * 60 * 60 * 24);
      return diffDays > 30;
    });
    
    // Xóa các file cũ
    fileStore.files = fileStore.files.filter(file => {
      const fileDate = new Date(file.date);
      const diffDays = (now - fileDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    });
    
    await ctx.editMessageText(
      `✅ Đã xóa ${oldFiles.length} file\n` +
      `🗑 Đã giải phóng: ${Math.round(oldFiles.reduce((sum, file) => sum + (file.size || 0), 0) / 1024 / 1024)} MB`
    );
  }
  else if (data === 'clean_cancel') {
    await ctx.editMessageText('❌ Đã hủy thao tác dọn dẹp');
  }
  
  // Xóa dấu loading của nút
  await ctx.answerCbQuery();
});

module.exports = bot; 