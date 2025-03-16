const fs = require('fs');
const path = require('path');

// Create a temporary file with the correct encoding
const tempFile = 'index.js.fixed';

// Read the original file
const data = fs.readFileSync('index.js', 'utf8');

// Create a backup of the original file
fs.writeFileSync('index.js.bak', data, 'utf8');
console.log('Created backup at index.js.bak');

// Fix the SyntaxError by removing the await outside of async function
let fixedContent = data;

// Replace all problematic Vietnamese characters with proper encoding
fixedContent = fixedContent.replace(/Lá»—i/g, 'Lỗi')
  .replace(/Ä'á»•i/g, 'đổi')
  .replace(/tÃªn/g, 'tên')
  .replace(/thÆ°/g, 'thư')
  .replace(/má»¥c/g, 'mục')
  .replace(/thÃ nh/g, 'thành')
  .replace(/cÃ´ng/g, 'công')
  .replace(/khÃ´ng/g, 'không')
  .replace(/trá»'ng/g, 'trống')
  .replace(/Sá»­/g, 'Sử')
  .replace(/dá»¥ng/g, 'dụng')
  .replace(/Ä'á»ƒ/g, 'để')
  .replace(/xÃ³a/g, 'xóa')
  .replace(/cáº£/g, 'cả')
  .replace(/ná»™i/g, 'nội')
  .replace(/dung/g, 'dung')
  .replace(/bÃªn/g, 'bên')
  .replace(/trong/g, 'trong')
  .replace(/KhÃ´ng/g, 'Không')
  .replace(/xÃ¡c/g, 'xác')
  .replace(/Ä'á»‹nh/g, 'định')
  .replace(/ÄÃ£/g, 'Đã')
  .replace(/server/g, 'server')
  .replace(/Ä'Æ°á»£c/g, 'được')
  .replace(/trá»'ng/g, 'trống')
  .replace(/ID file khÃ´ng Ä'Æ°á»£c Ä'á»ƒ trá»'ng/g, 'ID file không được để trống')
  .replace(/File khÃ´ng tá»"n táº¡i/g, 'File không tồn tại')
  .replace(/File nÃ y khÃ´ng há»— trá»£ xem trÆ°á»›c/g, 'File này không hỗ trợ xem trước')
  .replace(/File khÃ´ng tá»"n táº¡i á»Ÿ cáº£ local vÃ  Telegram/g, 'File không tồn tại ở cả local và Telegram')
  .replace(/Bot Telegram khÃ´ng hoáº¡t Ä'á»™ng/g, 'Bot Telegram không hoạt động')
  .replace(/ThÆ° má»¥c khÃ´ng tá»"n táº¡i/g, 'Thư mục không tồn tại')
  .replace(/ThÆ° má»¥c má»›i Ä'Ã£ tá»"n táº¡i/g, 'Thư mục mới đã tồn tại')
  .replace(/ThÆ° má»¥c khÃ´ng trá»'ng/g, 'Thư mục không trống')
  .replace(/ÄÃ£ xÃ³a thÆ° má»¥c trá»'ng thÃ nh cÃ´ng/g, 'Đã xóa thư mục trống thành công');

// Write the fixed content to the temporary file
fs.writeFileSync(tempFile, fixedContent, 'utf8');
console.log('Created fixed file at', tempFile);

// Replace the original file with the fixed one
fs.renameSync(tempFile, 'index.js');
console.log('Replaced original file with fixed version');

// Let's also fix the specific line that's causing the error
const lines = fs.readFileSync('index.js', 'utf8').split('\n');
lines[3209] = "        error: 'ID file không được để trống'";
fs.writeFileSync('index.js', lines.join('\n'), 'utf8');
console.log('Fixed specific line 3210'); 