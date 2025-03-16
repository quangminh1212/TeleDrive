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
  .replace(/server/g, 'server');

// Write the fixed content to the temporary file
fs.writeFileSync(tempFile, fixedContent, 'utf8');
console.log('Created fixed file at', tempFile);

// Replace the original file with the fixed one
fs.renameSync(tempFile, 'index.js');
console.log('Replaced original file with fixed version'); 