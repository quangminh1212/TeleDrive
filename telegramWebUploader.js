const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

// Sử dụng plugin stealth để tránh phát hiện bot
puppeteer.use(StealthPlugin());

// Đường dẫn đến thư mục lưu profile Chrome
const userDataDir = path.join(__dirname, '.chrome-profile');

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

// Biến lưu trữ browser instance
let browser = null;
let isInitializing = false;
let isLoggedIn = false;

/**
 * Khởi tạo trình duyệt và kiểm tra đăng nhập
 */
async function initBrowser() {
  if (isInitializing) return;
  isInitializing = true;

  try {
    console.log('[Telegram Web] Khởi tạo trình duyệt...');
    
    // Khởi tạo trình duyệt với profile đã lưu
    browser = await puppeteer.launch({
      headless: false, // Sử dụng headless: false để dễ debug
      userDataDir: userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,720'
      ]
    });

    // Kiểm tra trạng thái đăng nhập
    isLoggedIn = await checkLoginStatus();
    console.log(`[Telegram Web] Trạng thái đăng nhập: ${isLoggedIn ? 'Đã đăng nhập' : 'Chưa đăng nhập'}`);
  } catch (error) {
    console.error('[Telegram Web] Lỗi khởi tạo trình duyệt:', error);
    await closeBrowser();
  } finally {
    isInitializing = false;
  }
}

/**
 * Kiểm tra trạng thái đăng nhập Telegram Web
 */
async function checkLoginStatus() {
  if (!browser) return false;
  
  try {
    const page = await browser.newPage();
    await page.goto('https://web.telegram.org/k/', { waitUntil: 'networkidle2' });
    
    // Kiểm tra xem đã đăng nhập chưa bằng cách tìm kiếm phần tử chỉ xuất hiện sau khi đăng nhập
    const isLoggedIn = await page.evaluate(() => {
      // Kiểm tra các phần tử UI chỉ xuất hiện khi đã đăng nhập
      return document.querySelector('.chat-list') !== null || 
             document.querySelector('.im_dialogs_col') !== null ||
             document.querySelector('.sidebar-header') !== null;
    });
    
    await page.close();
    return isLoggedIn;
  } catch (error) {
    console.error('[Telegram Web] Lỗi kiểm tra đăng nhập:', error);
    return false;
  }
}

/**
 * Upload file lên Telegram Web
 * @param {string} filePath Đường dẫn đến file cần upload
 * @returns {Promise<boolean>} Kết quả upload
 */
async function uploadFile(filePath) {
  if (!browser) {
    await initBrowser();
  }
  
  if (!isLoggedIn) {
    console.log('[Telegram Web] Chưa đăng nhập Telegram Web. Vui lòng đăng nhập trước.');
    return false;
  }
  
  try {
    console.log(`[Telegram Web] Bắt đầu upload file: ${filePath}`);
    
    // Mở trang Telegram Web
    const page = await browser.newPage();
    await page.goto('https://web.telegram.org/k/', { waitUntil: 'networkidle2' });
    
    // Chờ trang tải xong
    await page.waitForSelector('.chat-list, .im_dialogs_col, .sidebar-header', { timeout: 30000 });
    
    // Tìm và nhấp vào Saved Messages (tin nhắn đã lưu)
    console.log('[Telegram Web] Tìm kiếm Saved Messages...');
    
    // Tìm Saved Messages trong danh sách chat
    const savedMessagesSelector = await page.evaluate(() => {
      // Tìm kiếm các phần tử có thể chứa "Saved Messages"
      const elements = Array.from(document.querySelectorAll('.user-title, .im_dialog_title, .chat-title'));
      const savedMessagesElement = elements.find(el => 
        el.textContent.includes('Saved Messages') || 
        el.textContent.includes('Tin nhắn đã lưu')
      );
      
      if (savedMessagesElement) {
        // Tìm phần tử cha có thể click được
        let parent = savedMessagesElement;
        while (parent && !parent.classList.contains('chat-item') && !parent.classList.contains('im_dialog') && !parent.classList.contains('ListItem')) {
          parent = parent.parentElement;
        }
        
        if (parent) {
          return parent.tagName + (parent.id ? '#' + parent.id : '') + '.' + Array.from(parent.classList).join('.');
        }
      }
      
      return null;
    });
    
    if (savedMessagesSelector) {
      console.log('[Telegram Web] Đã tìm thấy Saved Messages, nhấp vào...');
      await page.click(savedMessagesSelector);
      await page.waitForTimeout(2000);
    } else {
      console.log('[Telegram Web] Không tìm thấy Saved Messages, tìm kiếm nút đính kèm...');
    }
    
    // Tìm và nhấp vào nút đính kèm
    const attachButtonSelector = await page.evaluate(() => {
      // Tìm kiếm các nút có thể là nút đính kèm
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const attachButton = buttons.find(btn => {
        // Kiểm tra nếu có icon đính kèm
        return btn.innerHTML.includes('paperclip') || 
               btn.innerHTML.includes('attachment') ||
               btn.querySelector('.icon-paperclip, .icon-attach, .attachment-icon, [data-icon="paperclip"]');
      });
      
      if (attachButton) {
        return attachButton.tagName + (attachButton.id ? '#' + attachButton.id : '') + '.' + Array.from(attachButton.classList).join('.');
      }
      
      return null;
    });
    
    if (!attachButtonSelector) {
      console.log('[Telegram Web] Không tìm thấy nút đính kèm, thử phương pháp khác...');
      // Thử phương pháp khác: nhấn tổ hợp phím tắt để đính kèm
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    } else {
      console.log('[Telegram Web] Đã tìm thấy nút đính kèm, nhấp vào...');
      await page.click(attachButtonSelector);
      await page.waitForTimeout(1000);
    }
    
    // Tải file lên
    console.log('[Telegram Web] Tải file lên...');
    
    // Tìm input file hoặc tạo input file mới
    const fileInputHandle = await page.evaluateHandle(() => {
      // Tìm input file hiện có
      let fileInput = document.querySelector('input[type="file"]');
      
      // Nếu không tìm thấy, tạo input file mới
      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.position = 'fixed';
        fileInput.style.top = '0';
        fileInput.style.left = '0';
        fileInput.style.opacity = '0';
        document.body.appendChild(fileInput);
      }
      
      return fileInput;
    });
    
    // Upload file
    const input = await fileInputHandle.asElement();
    await input.uploadFile(filePath);
    
    // Chờ file được tải lên và gửi
    await page.waitForTimeout(2000);
    
    // Tìm và nhấn nút gửi
    const sendButtonSelector = await page.evaluate(() => {
      // Tìm kiếm các nút có thể là nút gửi
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const sendButton = buttons.find(btn => {
        // Kiểm tra nếu có icon gửi hoặc text "Send"
        return btn.innerHTML.includes('send') || 
               btn.textContent.includes('Send') ||
               btn.textContent.includes('Gửi') ||
               btn.querySelector('.icon-send, [data-icon="send"]');
      });
      
      if (sendButton) {
        return sendButton.tagName + (sendButton.id ? '#' + sendButton.id : '') + '.' + Array.from(sendButton.classList).join('.');
      }
      
      return null;
    });
    
    if (sendButtonSelector) {
      console.log('[Telegram Web] Đã tìm thấy nút gửi, nhấp vào...');
      await page.click(sendButtonSelector);
      await page.waitForTimeout(3000);
    } else {
      console.log('[Telegram Web] Không tìm thấy nút gửi, thử phương pháp khác...');
      // Thử phương pháp khác: nhấn Enter để gửi
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    
    console.log('[Telegram Web] Đã upload file thành công!');
    await page.close();
    return true;
  } catch (error) {
    console.error('[Telegram Web] Lỗi upload file:', error);
    return false;
  }
}

/**
 * Đóng trình duyệt
 */
async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
      console.log('[Telegram Web] Đã đóng trình duyệt');
    } catch (error) {
      console.error('[Telegram Web] Lỗi đóng trình duyệt:', error);
    } finally {
      browser = null;
      isLoggedIn = false;
    }
  }
}

// Khởi tạo trình duyệt khi module được load
initBrowser().catch(console.error);

// Đảm bảo đóng trình duyệt khi ứng dụng kết thúc
process.on('exit', closeBrowser);
process.on('SIGINT', () => {
  closeBrowser().then(() => process.exit(0));
});

module.exports = {
  uploadFile,
  checkLoginStatus,
  initBrowser,
  closeBrowser
}; 