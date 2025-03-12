const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Khởi tạo bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Đường dẫn file lưu trữ
const DATA_FILE = path.join(__dirname, '.data', 'filestore.json');

// Tạo thư mục .data nếu chưa tồn tại
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Lưu trữ thông tin file
let fileStore = {
  files: [],
  folders: []
};

// Load dữ liệu từ file
try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    fileStore = JSON.parse(data);
    console.log(`[Bot] Đã tải ${fileStore.files.length} file và ${fileStore.folders.length} thư mục`);
  }
} catch (error) {
  console.error('[Bot] Lỗi khi tải dữ liệu:', error);
}

// Hàm lưu dữ liệu
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(fileStore, null, 2));
    console.log('[Bot] Đã lưu dữ liệu');
  } catch (error) {
    console.error('[Bot] Lỗi khi lưu dữ liệu:', error);
  }
}

// Lưu dữ liệu định kỳ (5 phút)
setInterval(saveData, 5 * 60 * 1000);

// Lưu dữ liệu khi có thay đổi
function saveOnChange() {
  clearTimeout(saveOnChange.timer);
  saveOnChange.timer = setTimeout(saveData, 1000);
}

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
    saveOnChange(); // Lưu khi có thay đổi
    
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
  
  saveOnChange(); // Lưu khi có thay đổi
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

// Thêm lệnh /help
bot.command('help', (ctx) => {
  ctx.reply(
    '🤖 Hướng dẫn sử dụng bot:\n\n' +
    '1. Quản lý file:\n' +
    '   /files - Xem danh sách file và thư mục\n' +
    '   /upload - Hướng dẫn upload file\n' +
    '   /mkdir <tên> - Tạo thư mục mới\n' +
    '   /mv <file> <thư mục> - Di chuyển file\n' +
    '   /rm <file> - Xóa file\n\n' +
    '2. Tìm kiếm và sắp xếp:\n' +
    '   /search <từ khóa> - Tìm file/thư mục\n' +
    '   /sort size - Sắp xếp theo kích thước\n' +
    '   /sort date - Sắp xếp theo ngày\n' +
    '   /sort name - Sắp xếp theo tên\n\n' +
    '3. Dọn dẹp và bảo trì:\n' +
    '   /clean - Dọn dẹp file rác\n' +
    '   /stats - Xem thống kê dung lượng\n' +
    '   /zip <thư mục> - Nén thư mục\n' +
    '   /unzip <file> - Giải nén file\n\n' +
    '4. Chia sẻ:\n' +
    '   /share <file> - Tạo link chia sẻ\n' +
    '   /unshare <file> - Hủy chia sẻ\n' +
    '   /shared - Xem các file đã chia sẻ'
  );
});

// Thêm lệnh /mv để di chuyển file
bot.command('mv', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('Cú pháp: /mv <tên file> <thư mục đích>');
  }
  
  const fileName = args[1];
  const targetFolder = args[2];
  
  const file = fileStore.files.find(f => f.name === fileName);
  const folder = fileStore.folders.find(f => f.name === targetFolder);
  
  if (!file) {
    return ctx.reply(`❌ Không tìm thấy file: ${fileName}`);
  }
  if (!folder) {
    return ctx.reply(`❌ Không tìm thấy thư mục: ${targetFolder}`);
  }
  
  // Di chuyển file
  file.path = path.join(folder.path, file.name);
  
  await ctx.reply(`✅ Đã di chuyển file ${fileName} vào thư mục ${targetFolder}`);
});

// Thêm lệnh /rm để xóa file
bot.command('rm', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Cú pháp: /rm <tên file>');
  }
  
  const fileName = args[1];
  const fileIndex = fileStore.files.findIndex(f => f.name === fileName);
  
  if (fileIndex === -1) {
    return ctx.reply(`❌ Không tìm thấy file: ${fileName}`);
  }
  
  // Xóa file
  fileStore.files.splice(fileIndex, 1);
  saveOnChange(); // Lưu khi có thay đổi
  
  await ctx.reply(`🗑 Đã xóa file: ${fileName}`);
});

// Thêm lệnh /stats để xem thống kê
bot.command('stats', async (ctx) => {
  const totalFiles = fileStore.files.length;
  const totalFolders = fileStore.folders.length;
  const totalSize = fileStore.files.reduce((sum, file) => sum + (file.size || 0), 0);
  
  const fileTypes = {};
  fileStore.files.forEach(file => {
    const type = file.mime_type?.split('/')[0] || 'unknown';
    fileTypes[type] = (fileTypes[type] || 0) + 1;
  });
  
  const statsMessage = 
    `📊 Thống kê lưu trữ:\n\n` +
    `Tổng số file: ${totalFiles}\n` +
    `Tổng số thư mục: ${totalFolders}\n` +
    `Tổng dung lượng: ${Math.round(totalSize / 1024 / 1024)} MB\n\n` +
    `📝 Phân loại:\n` +
    Object.entries(fileTypes)
      .map(([type, count]) => `${type}: ${count} file`)
      .join('\n');
  
  await ctx.reply(statsMessage);
});

// Thêm lệnh /sort để sắp xếp file
bot.command('sort', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply(
      'Cú pháp: /sort <tiêu chí>\n' +
      'Tiêu chí: size, date, name'
    );
  }
  
  const criterion = args[1].toLowerCase();
  let sortedFiles = [...fileStore.files];
  
  switch (criterion) {
    case 'size':
      sortedFiles.sort((a, b) => (b.size || 0) - (a.size || 0));
      break;
    case 'date':
      sortedFiles.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'name':
      sortedFiles.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      return ctx.reply('❌ Tiêu chí không hợp lệ. Sử dụng: size, date, name');
  }
  
  const message = 
    `📋 Danh sách file (sắp xếp theo ${criterion}):\n\n` +
    sortedFiles.map(file => 
      `📄 ${file.name}\n` +
      `   Kích thước: ${Math.round(file.size / 1024)} KB\n` +
      `   Ngày tạo: ${new Date(file.date).toLocaleDateString()}`
    ).join('\n\n');
  
  await ctx.reply(message);
});

// Thêm lệnh /share để chia sẻ file
bot.command('share', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Cú pháp: /share <tên file>');
  }
  
  const fileName = args[1];
  const file = fileStore.files.find(f => f.name === fileName);
  
  if (!file) {
    return ctx.reply(`❌ Không tìm thấy file: ${fileName}`);
  }
  
  // Tạo link chia sẻ
  const shareId = Math.random().toString(36).substring(7);
  file.shareId = shareId;
  file.shareDate = new Date();
  
  await ctx.reply(
    `🔗 Link chia sẻ cho file ${fileName}:\n` +
    `https://t.me/your_bot?start=share_${shareId}\n\n` +
    `Link có hiệu lực trong 7 ngày`
  );
});

// Thêm lệnh /shared để xem file đã chia sẻ
bot.command('shared', async (ctx) => {
  const sharedFiles = fileStore.files.filter(f => f.shareId);
  
  if (sharedFiles.length === 0) {
    return ctx.reply('Không có file nào đang được chia sẻ');
  }
  
  const message = 
    `🔗 Các file đang chia sẻ:\n\n` +
    sharedFiles.map(file => 
      `📄 ${file.name}\n` +
      `   Link: https://t.me/your_bot?start=share_${file.shareId}\n` +
      `   Ngày chia sẻ: ${new Date(file.shareDate).toLocaleDateString()}`
    ).join('\n\n');
  
  await ctx.reply(message);
});

// Thêm lệnh /unshare để hủy chia sẻ
bot.command('unshare', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Cú pháp: /unshare <tên file>');
  }
  
  const fileName = args[1];
  const file = fileStore.files.find(f => f.name === fileName);
  
  if (!file) {
    return ctx.reply(`❌ Không tìm thấy file: ${fileName}`);
  }
  
  if (!file.shareId) {
    return ctx.reply(`❌ File ${fileName} chưa được chia sẻ`);
  }
  
  // Hủy chia sẻ
  delete file.shareId;
  delete file.shareDate;
  
  await ctx.reply(`✅ Đã hủy chia sẻ file: ${fileName}`);
});

// Thêm lệnh /backup để sao lưu file lên Telegram
bot.command('backup', async (ctx) => {
  try {
    // Kiểm tra xem có file nào không
    if (fileStore.files.length === 0) {
      return ctx.reply('❌ Không có file nào để sao lưu');
    }

    // Tạo tin nhắn sao lưu
    const backupMessage = 
      `📦 Bắt đầu sao lưu ${fileStore.files.length} file\n` +
      `⏱ Thời gian: ${new Date().toLocaleString()}`;
    
    await ctx.reply(backupMessage);

    // Sao lưu từng file
    let successCount = 0;
    let errorCount = 0;

    for (const file of fileStore.files) {
      try {
        if (file.telegram_file_id) {
          // Gửi file đã có trên Telegram
          await ctx.telegram.copyMessage(
            ctx.chat.id,
            ctx.chat.id,
            file.telegram_file_id,
            {
              caption: `📄 ${file.name}\n📅 ${new Date(file.date).toLocaleString()}`
            }
          );
          successCount++;
        }
      } catch (error) {
        console.error(`[Bot] Lỗi sao lưu file ${file.name}:`, error);
        errorCount++;
      }
    }

    // Gửi thống kê kết quả
    await ctx.reply(
      `✅ Đã sao lưu xong:\n` +
      `- Thành công: ${successCount} file\n` +
      `- Lỗi: ${errorCount} file`
    );
  } catch (error) {
    console.error('[Bot] Lỗi khi sao lưu:', error);
    ctx.reply('❌ Có lỗi xảy ra khi sao lưu');
  }
});

// Thêm lệnh /restore để khôi phục file từ Telegram
bot.command('restore', async (ctx) => {
  try {
    // Kiểm tra tin nhắn được reply
    if (!ctx.message.reply_to_message) {
      return ctx.reply(
        '❌ Vui lòng reply tin nhắn chứa file cần khôi phục\n' +
        'Hoặc sử dụng /restore all để khôi phục tất cả file từ tin nhắn đã lưu'
      );
    }

    const message = ctx.message.reply_to_message;
    
    // Kiểm tra xem tin nhắn có file không
    if (!message.document && !message.photo && !message.video && !message.audio) {
      return ctx.reply('❌ Tin nhắn này không chứa file');
    }

    // Lấy thông tin file
    const file = message.document || message.photo?.[0] || message.video || message.audio;
    const fileName = file.file_name || `file_${Date.now()}${mime.extension(file.mime_type)}`;

    // Thêm vào fileStore nếu chưa có
    if (!fileStore.files.find(f => f.telegram_file_id === file.file_id)) {
      fileStore.files.push({
        id: file.file_id,
        name: fileName,
        type: 'file',
        path: '/' + fileName,
        size: file.file_size,
        mime_type: file.mime_type,
        date: new Date(),
        telegram_file_id: file.file_id
      });
      saveOnChange();
    }

    await ctx.reply(
      `✅ Đã khôi phục file: ${fileName}\n` +
      `📦 Kích thước: ${Math.round(file.file_size / 1024)} KB`
    );
  } catch (error) {
    console.error('[Bot] Lỗi khi khôi phục:', error);
    ctx.reply('❌ Có lỗi xảy ra khi khôi phục file');
  }
});

// Thêm lệnh /restore all để khôi phục tất cả file
bot.command('restore_all', async (ctx) => {
  try {
    // Lấy 100 tin nhắn gần nhất
    const messages = await ctx.telegram.getChatHistory(ctx.chat.id, {
      limit: 100
    });

    let restoredCount = 0;
    let skipCount = 0;

    // Duyệt qua từng tin nhắn
    for (const message of messages) {
      const file = message.document || message.photo?.[0] || message.video || message.audio;
      if (!file) continue;

      // Kiểm tra xem file đã có trong fileStore chưa
      if (fileStore.files.find(f => f.telegram_file_id === file.file_id)) {
        skipCount++;
        continue;
      }

      // Thêm file mới
      const fileName = file.file_name || `file_${Date.now()}${mime.extension(file.mime_type)}`;
      fileStore.files.push({
        id: file.file_id,
        name: fileName,
        type: 'file',
        path: '/' + fileName,
        size: file.file_size,
        mime_type: file.mime_type,
        date: new Date(message.date * 1000),
        telegram_file_id: file.file_id
      });
      restoredCount++;
    }

    saveOnChange();

    await ctx.reply(
      `✅ Đã quét xong:\n` +
      `- Khôi phục: ${restoredCount} file mới\n` +
      `- Bỏ qua: ${skipCount} file đã có`
    );
  } catch (error) {
    console.error('[Bot] Lỗi khi khôi phục tất cả:', error);
    ctx.reply('❌ Có lỗi xảy ra khi khôi phục');
  }
});

// Xử lý khi bot dừng
bot.stop = () => {
  saveData(); // Lưu dữ liệu trước khi dừng
  bot.telegram.close();
};

module.exports = bot; 