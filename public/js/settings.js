/**
 * Mã xử lý cài đặt Telegram Bot
 */

// Load cài đặt khi modal mở
$('#settingsModal').on('show.bs.modal', function (e) {
  loadSettings();
});

// Lưu cài đặt khi nhấn nút lưu
$('#saveSettings').on('click', function () {
  saveSettings();
});

// Hàm tải cài đặt hiện tại
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    
    if (data.success) {
      // Fill dữ liệu vào form
      $('#botToken').val(data.settings.botToken || '');
      $('#chatId').val(data.settings.chatId || '');
      
      // Xóa thông báo cũ
      $('#settingsResult').html('');
    } else {
      showSettingsError('Không thể tải cài đặt: ' + data.error);
    }
  } catch (error) {
    console.error('Lỗi tải cài đặt:', error);
    showSettingsError('Lỗi kết nối đến server');
  }
}

// Hàm lưu cài đặt
async function saveSettings() {
  // Lấy dữ liệu
  const botToken = $('#botToken').val().trim();
  const chatId = $('#chatId').val().trim();
  const restartAfterSave = $('#restartAfterSave').is(':checked');
  
  // Validate dữ liệu cơ bản
  if (!botToken) {
    return showSettingsError('Bot Token không được để trống');
  }
  
  // Hiển thị loading
  $('#settingsResult').html('<div class="alert alert-info">Đang lưu cài đặt...</div>');
  $('#saveSettings').prop('disabled', true);
  
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        botToken,
        chatId,
        restartAfterSave
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      $('#settingsResult').html('<div class="alert alert-success">Đã lưu cài đặt thành công!</div>');
      
      // Nếu cần khởi động lại server
      if (restartAfterSave) {
        $('#settingsResult').html(
          '<div class="alert alert-success">Đã lưu cài đặt thành công! Đang khởi động lại server...</div>'
        );
        
        // Đợi 2 giây và tải lại trang
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } else {
      showSettingsError('Lỗi lưu cài đặt: ' + data.error);
    }
  } catch (error) {
    console.error('Lỗi kết nối:', error);
    showSettingsError('Lỗi kết nối đến server');
  } finally {
    $('#saveSettings').prop('disabled', false);
  }
}

// Hiển thị thông báo lỗi
function showSettingsError(message) {
  $('#settingsResult').html(`<div class="alert alert-danger">${message}</div>`);
} 