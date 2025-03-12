const { ipcRenderer, shell } = require('electron')
ipcRenderer.setMaxListeners(Infinity);

// Thêm hệ thống thông báo toast
const toastStyles = document.createElement('style');
toastStyles.innerHTML = `
    .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
    }
    .toast {
        background: rgba(50, 50, 50, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        margin-bottom: 10px;
        min-width: 250px;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        animation: toast-in 0.3s ease-out;
        transition: all 0.3s ease;
    }
    .toast.success { border-left: 4px solid #4CAF50; }
    .toast.error { border-left: 4px solid #F44336; }
    .toast.warning { border-left: 4px solid #FFC107; }
    .toast.info { border-left: 4px solid #2196F3; }
    .toast .toast-icon {
        margin-right: 12px;
        font-size: 20px;
    }
    .toast .toast-content {
        flex: 1;
    }
    .toast .toast-title {
        font-weight: bold;
        margin-bottom: 4px;
    }
    .toast .toast-message {
        font-size: 14px;
    }
    @keyframes toast-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(toastStyles);

// Thêm theme hiện đại
const appTheme = document.createElement('style');
appTheme.innerHTML = `
    :root {
        --primary-color: #2196F3;
        --primary-dark: #1976D2;
        --accent-color: #FF4081;
        --success-color: #4CAF50;
        --warning-color: #FFC107;
        --error-color: #F44336;
        --dark-bg: #333;
        --light-bg: #f5f5f5;
        --text-primary: #333;
        --text-secondary: #666;
        --text-light: #fff;
        --border-radius: 8px;
        --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        --transition: all 0.3s ease;
    }
    
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        transition: background 0.5s ease;
        margin: 0;
        padding: 0;
        height: 100vh;
        overflow: hidden;
    }
    
    /* Các kiểu dáng chung */
    .card {
        background-color: white;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
        padding: 20px;
        margin: 15px;
        transition: var(--transition);
    }
    
    .card:hover {
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
    }
    
    /* Giao diện đăng nhập */
    .login-container {
        max-width: 400px;
        margin: 50px auto;
        text-align: center;
        padding: 30px;
        background-color: white;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
    }
    
    .profile-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .profile-picture-container {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        overflow: hidden;
        margin-bottom: 10px;
        border: 3px solid var(--primary-color);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition: transform 0.3s ease;
    }
    
    .profile-picture-container:hover {
        transform: scale(1.05);
    }
    
    .profile-picture-container img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .user-name {
        font-size: 24px;
        font-weight: bold;
        margin: 10px 0 5px;
        color: var(--text-primary);
    }
    
    .user-phone {
        font-size: 16px;
        color: var(--text-secondary);
        margin-bottom: 15px;
    }
    
    /* Hiệu ứng nút */
    .button {
        padding: 12px 24px;
        border-radius: 30px;
        border: none;
        background-color: var(--primary-color);
        color: white;
        font-weight: bold;
        cursor: pointer;
        transition: var(--transition);
        text-transform: uppercase;
        letter-spacing: 1px;
        outline: none;
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.2);
    }
    
    .button:hover {
        background-color: var(--primary-dark);
        transform: translateY(-2px);
        box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
    }
    
    .button:active {
        transform: translateY(0);
        box-shadow: 0 2px 3px rgba(0, 0, 0, 0.2);
    }
    
    /* Hiệu ứng ripple cho nút */
    .button-ripple {
        position: relative;
        overflow: hidden;
    }
    
    .button-ripple:after {
        content: "";
        display: block;
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        pointer-events: none;
        background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
        background-repeat: no-repeat;
        background-position: 50%;
        transform: scale(10, 10);
        opacity: 0;
        transition: transform .5s, opacity 1s;
    }
    
    .button-ripple:active:after {
        transform: scale(0, 0);
        opacity: .3;
        transition: 0s;
    }
    
    /* Hiệu ứng cho input */
    .input-animated {
        width: 100%;
        padding: 12px 15px;
        margin: 8px 0;
        border: 1px solid #ddd;
        border-radius: var(--border-radius);
        transition: var(--transition);
        font-size: 16px;
        outline: none;
    }
    
    .input-animated:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }
    
    /* Hiệu ứng loading */
    .loading-spinner {
        width: 40px;
        height: 40px;
        margin: 15px auto;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 4px solid var(--primary-color);
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Hiệu ứng chuyển động */
    .fade-in {
        animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .slide-up {
        animation: slideUp 0.5s ease-out;
    }
    
    @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    /* Màu cho trạng thái kết nối */
    .connection-status {
        transition: var(--transition);
        border-radius: 20px;
        font-weight: bold;
        backdrop-filter: blur(5px);
    }
    
    .connection-status.connected {
        background-color: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
    }
    
    .connection-status.connecting {
        background-color: rgba(255, 193, 7, 0.2);
        color: #FFC107;
    }
    
    .connection-status.disconnected {
        background-color: rgba(244, 67, 54, 0.2);
        color: #F44336;
    }
    
    /* Nút thao tác nhanh */
    .quick-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    }
    
    .action-button {
        background: rgba(0, 0, 0, 0.6);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(5px);
        transition: var(--transition);
    }
    
    .action-button:hover {
        transform: scale(1.15) rotate(5deg);
    }
    
    /* Thanh tiến độ */
    .progress-indicator {
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #4CAF50, #8BC34A);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    
    /* Đường viền cho hình ảnh hồ sơ */
    #profilePicture {
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        transition: transform 0.3s ease;
    }
    
    #profilePicture:hover {
        transform: scale(1.05);
    }
    
    /* Hiệu ứng cho nút CHANGE, THỐNG KÊ, TỐI ƯU */
    .press {
        transition: var(--transition);
        border-radius: 25px;
        font-weight: bold;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 10px 20px;
        margin: 10px;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .press:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
    
    .press:active {
        transform: translateY(1px);
    }
    
    .press.press-blue {
        background: linear-gradient(135deg, #2196F3, #0D47A1);
    }
    
    .press.press-purple {
        background: linear-gradient(135deg, #9C27B0, #4A148C);
    }
    
    /* Màu gradient cho tiêu đề */
    #title {
        background: linear-gradient(90deg, var(--primary-color), var(--primary-dark));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-weight: bold;
        letter-spacing: 1px;
        margin-bottom: 15px;
    }
    
    /* Cải thiện thanh tiến độ */
    #syncProgress {
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
`;
document.head.appendChild(appTheme);

// Thêm màn hình chào mừng khi ứng dụng khởi động
const splashScreen = document.createElement('div');
splashScreen.id = 'splashScreen';
splashScreen.style.position = 'fixed';
splashScreen.style.top = '0';
splashScreen.style.left = '0';
splashScreen.style.width = '100%';
splashScreen.style.height = '100%';
splashScreen.style.backgroundColor = 'white';
splashScreen.style.display = 'flex';
splashScreen.style.flexDirection = 'column';
splashScreen.style.justifyContent = 'center';
splashScreen.style.alignItems = 'center';
splashScreen.style.zIndex = '9999';
splashScreen.style.transition = 'opacity 0.8s ease-out';

// Logo và tên ứng dụng
splashScreen.innerHTML = `
    <div style="text-align: center; margin-bottom: 40px; animation: scale-in 0.6s ease-out;">
        <div style="font-size: 40px; font-weight: bold; margin-bottom: 10px; color: #2196F3; text-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
            TeleDrive
        </div>
        <div style="font-size: 18px; color: #666; max-width: 300px; line-height: 1.5;">
            Giải pháp lưu trữ an toàn tích hợp với Telegram
        </div>
    </div>
    <div class="loading-animation">
        <div class="circle-loading"></div>
    </div>
    <div style="position: absolute; bottom: 20px; color: #999; font-size: 14px;">
        © 2023 TeleDrive
    </div>
`;

// CSS cho hiệu ứng loading
const splashStyle = document.createElement('style');
splashStyle.textContent = `
    @keyframes scale-in {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeOut {
        0% { opacity: 1; }
        100% { opacity: 0; visibility: hidden; }
    }
    .loading-animation {
        margin-top: 30px;
    }
    .circle-loading {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(33, 150, 243, 0.2);
        border-top: 4px solid #2196F3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

document.head.appendChild(splashStyle);
document.body.appendChild(splashScreen);

// Đối tượng quản lý chuyển đổi UI
const uiTransition = {
    // Ẩn màn hình chào mừng
    hideSplash: function() {
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 800);
    },
    
    // Hiện giao diện đăng nhập
    showLogin: function() {
        if (title) title.innerHTML = 'Đăng nhập vào TeleDrive';
        if (description) description.innerHTML = 'Vui lòng nhập thông tin đăng nhập của bạn';
        if (input) {
            input.style.display = '';
            input.placeholder = 'Số điện thoại (gồm mã quốc gia)';
        }
        if (button) {
            button.style.display = '';
            button.innerHTML = 'Tiếp tục';
        }
        
        // Thêm hiệu ứng xuất hiện
        const loginElements = document.querySelectorAll('#title, #description, #input, #button');
        loginElements.forEach(el => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 100);
            }
        });
    },
    
    // Chuyển đổi sang giao diện đã đăng nhập
    showLoggedIn: function(userInfo) {
        // Cập nhật trạng thái kết nối
        updateConnectionStatus('connected');
        
        // Hiện thông tin người dùng
        if (title) title.innerHTML = 'Chào mừng trở lại!';
        if (description) description.innerHTML = 'Đã kết nối với tài khoản Telegram của bạn';
        if (profile) profile.style.display = '';
        
        // Cập nhật thông tin người dùng nếu có
        if (userInfo) {
            if (name) name.innerHTML = userInfo.name || 'Unknown';
            if (number) number.innerHTML = userInfo.number || 'No number';
            if (profilePicture && userInfo.photo) profilePicture.src = userInfo.photo;
        }
        
        // Hiện các nút thao tác
        if (analyticsButton) analyticsButton.style.display = '';
        if (optimizeButton) optimizeButton.style.display = '';
        if (quickActions) showQuickActions(true);
        
        // Thông báo đăng nhập thành công
        showToast('success', 'Đăng nhập tự động', 'Bạn đã được đăng nhập tự động vào tài khoản Telegram.');
    },
    
    // Hiển thị quá trình đồng bộ hóa
    showSyncStatus: function(dirPath) {
        if (dirPath) {
            if (title) title.innerHTML = 'Đang đồng bộ hóa';
            if (description) {
                description.innerHTML = `Đang đồng bộ với thư mục<br>
                <u style="cursor: pointer">${dirPath} 
                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" x="0px" y="0px" viewBox="0 0 100 100" width="15" height="15" style="color: #aaa">
                    <path fill="currentColor" d="M18.8,85.1h56l0,0c2.2,0,4-1.8,4-4v-32h-8v28h-48v-48h28v-8h-32l0,0c-2.2,0-4,1.8-4,4v56C14.8,83.3,16.6,85.1,18.8,85.1z"></path> 
                    <polygon fill="currentColor" points="45.7,48.7 51.3,54.3 77.2,28.5 77.2,37.2 85.2,37.2 85.2,14.9 62.8,14.9 62.8,22.9 71.5,22.9"></polygon>
                </svg></u>`;
                
                description.addEventListener('click', _ => {
                    shell.openPath(dirPath);
                });
            }
            
            // Hiện nút thao tác đồng bộ
            if (syncButton) syncButton.style.display = '';
            if (queueButton) queueButton.style.display = '';
        }
    },
    
    // Hiển thị thống kê đồng bộ hoàn tất
    showStats: function(stats) {
        // Tạo modal hiển thị thống kê sau khi đồng bộ hoàn tất
        const modalContainer = document.createElement('div');
        modalContainer.className = 'sync-stats-modal';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalContainer.style.zIndex = '1000';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.opacity = '0';
        modalContainer.style.transition = 'opacity 0.3s ease';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.backgroundColor = 'white';
        modalContent.style.borderRadius = '10px';
        modalContent.style.width = '400px';
        modalContent.style.maxWidth = '90%';
        modalContent.style.padding = '20px';
        modalContent.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
        modalContent.style.transform = 'translateY(20px)';
        modalContent.style.transition = 'transform 0.3s ease';
        
        modalContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 24px; font-weight: bold; color: #4CAF50; margin-bottom: 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: -8px;">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Đồng bộ hoàn tất!
                </div>
                <div style="font-size: 16px; color: #666;">
                    Quá trình đồng bộ hóa đã hoàn tất thành công
                </div>
            </div>
            
            <div style="background-color: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="font-weight: bold;">Tệp đã xử lý:</div>
                    <div>${stats.filesProcessed} / ${stats.totalFiles}</div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="font-weight: bold;">Thời gian xử lý:</div>
                    <div>${stats.processTime || '0s'}</div>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <div style="font-weight: bold;">Trạng thái:</div>
                    <div style="color: #4CAF50;">Hoàn tất</div>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button id="close-stats-modal" style="background-color: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; cursor: pointer; transition: all 0.2s ease;">
                    Đóng
                </button>
            </div>
        `;
        
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
        
        // Hiệu ứng hiện modal
        setTimeout(() => {
            modalContainer.style.opacity = '1';
            modalContent.style.transform = 'translateY(0)';
        }, 100);
        
        // Xử lý sự kiện cho nút đóng
        document.getElementById('close-stats-modal').addEventListener('click', () => {
            modalContainer.style.opacity = '0';
            modalContent.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (modalContainer.parentNode) {
                    document.body.removeChild(modalContainer);
                }
            }, 300);
        });
        
        // Tự động đóng sau 10 giây
        setTimeout(() => {
            if (modalContainer.parentNode) {
                modalContainer.style.opacity = '0';
                modalContent.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    if (modalContainer.parentNode) {
                        document.body.removeChild(modalContainer);
                    }
                }, 300);
            }
        }, 10000);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded - Starting initialization");

    const title = document.getElementById('title')
    const name = document.getElementById('name')
    const number = document.getElementById('number')
    const description = document.getElementById('description')
    const button = document.getElementById('next')
    const profile = document.getElementById('profile')
    const input = document.getElementById('input')
    const profilePicture = document.getElementById('profilePicture')
    const syncButton = document.getElementById('reDownload')
    const queueButton = document.getElementById('queueButton')
    
    // Thành phần UI mới
    const connectionStatus = document.getElementById('connectionStatus') || createConnectionStatusElement();
    const syncProgress = document.getElementById('syncProgress') || createSyncProgressElement();
    const progressIndicator = document.getElementById('progressIndicator') || document.querySelector('.progress-indicator');
    const progressText = document.getElementById('progressText') || document.querySelector('.progress-text');
    const quickActions = document.getElementById('quickActions') || createQuickActionsElement();
    const actionPause = document.getElementById('actionPause') || document.querySelector('.action-pause');
    const actionResume = document.getElementById('actionResume') || document.querySelector('.action-resume');
    const actionRefresh = document.getElementById('actionRefresh') || document.querySelector('.action-refresh');

    // Thêm classes cho các phần tử UI hiện có
    if (button) {
        button.classList.add('button', 'button-ripple');
    }
    
    if (input) {
        input.classList.add('input-animated');
    }
    
    if (title) {
        title.classList.add('slide-up');
    }
    
    if (description) {
        description.classList.add('fade-in');
    }
    
    if (profile) {
        profile.classList.add('profile-section');
    }
    
    if (profilePicture) {
        const container = document.createElement('div');
        container.className = 'profile-picture-container fade-in';
        profilePicture.parentNode.insertBefore(container, profilePicture);
        container.appendChild(profilePicture);
    }
    
    if (name) {
        name.classList.add('user-name', 'slide-up');
    }
    
    if (number) {
        number.classList.add('user-phone', 'fade-in');
    }
    
    // Thêm container chính để cải thiện layout
    const mainContainer = document.createElement('div');
    mainContainer.className = 'main-container';
    mainContainer.style.maxWidth = '500px';
    mainContainer.style.margin = '0 auto';
    mainContainer.style.padding = '20px';
    
    // Di chuyển các phần tử vào container mới nếu chưa có
    if (!document.querySelector('.main-container')) {
        // Chỉ bao bọc các phần tử nếu trang chưa được khởi tạo
        const elementsToWrap = document.querySelectorAll('#title, #profile, #description, #next, #input');
        if (elementsToWrap.length > 0) {
            document.body.insertBefore(mainContainer, elementsToWrap[0]);
            elementsToWrap.forEach(el => {
                if (el.parentNode !== mainContainer) {
                    mainContainer.appendChild(el);
                }
            });
        }
    }
    
    // Tạo card chính để đặt nội dung
    const mainCard = document.createElement('div');
    mainCard.className = 'card main-card';
    mainCard.style.marginTop = '40px';
    mainCard.style.textAlign = 'center';
    mainCard.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
    mainCard.style.borderRadius = '15px';
    mainCard.style.padding = '30px';
    mainCard.style.backgroundColor = 'white';
    
    // Di chuyển các phần tử vào card chính
    const elementsToMoveToCard = document.querySelectorAll('#title, #profile, #description, #next, #input');
    elementsToMoveToCard.forEach(el => {
        if (el && el.parentNode !== mainCard) {
            mainCard.appendChild(el);
        }
    });
    
    if (mainContainer && !mainContainer.querySelector('.main-card')) {
        mainContainer.appendChild(mainCard);
    }

    // Thêm nút analytics
    const analyticsButton = document.createElement('div');
    analyticsButton.className = 'press press-blue press-pill press-ghost';
    analyticsButton.style.display = 'none';
    analyticsButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width: 25px; height: 25px">
            <path d="M480 496H48a32 32 0 01-32-32V32a16 16 0 0116-16h32a16 16 0 0116 16v432h400a16 16 0 0116 16v16a16 16 0 01-16 16z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 448l-64-64-72 72-40-40-56 56"/>
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 320V192M304 352V192M208 320v-32M112 352V224"/>
        </svg>
        <div>THỐNG KÊ</div>
    `;
    document.body.appendChild(analyticsButton);

    // Thêm nút tối ưu
    const optimizeButton = document.createElement('div');
    optimizeButton.className = 'press press-purple press-pill press-ghost';
    optimizeButton.style.display = 'none';
    optimizeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width: 25px; height: 25px">
            <path d="M262.29 192.31a64 64 0 1057.4 57.4 64.13 64.13 0 00-57.4-57.4zM416.39 256a154.34 154.34 0 01-1.53 20.79l45.21 35.46a10.81 10.81 0 012.45 13.75l-42.77 74a10.81 10.81 0 01-13.14 4.59l-44.9-18.08a16.11 16.11 0 00-15.17 1.75A164.48 164.48 0 01325 400.8a15.94 15.94 0 00-8.82 12.14l-6.73 47.89a11.08 11.08 0 01-10.68 9.17h-85.54a11.11 11.11 0 01-10.69-8.87l-6.72-47.82a16.07 16.07 0 00-9-12.22 155.3 155.3 0 01-21.46-12.57 16 16 0 00-15.11-1.71l-44.89 18.07a10.81 10.81 0 01-13.14-4.58l-42.77-74a10.8 10.8 0 012.45-13.75l38.21-30a16.05 16.05 0 006-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 00-6.07-13.94l-38.19-30A10.81 10.81 0 0149.48 186l42.77-74a10.81 10.81 0 0113.14-4.59l44.9 18.08a16.11 16.11 0 0015.17-1.75A164.48 164.48 0 01187 111.2a15.94 15.94 0 008.82-12.14l6.73-47.89A11.08 11.08 0 01213.23 42h85.54a11.11 11.11 0 0110.69 8.87l6.72 47.82a16.07 16.07 0 009 12.22 155.3 155.3 0 0121.46 12.57 16 16 0 0015.11 1.71l44.89-18.07a10.81 10.81 0 0113.14 4.58l42.77 74a10.8 10.8 0 01-2.45 13.75l-38.21 30a16.05 16.05 0 00-6.05 14.08c.33 4.14.55 8.3.55 12.47z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
        </svg>
        <div>TỐI ƯU</div>
    `;
    document.body.appendChild(optimizeButton);

    let queue = [];
    const queueList = document.createElement('div')
    queueList.id = "queueList"
    queueList.style.lineHeight = "490px"
    queueList.innerHTML = "TeleDrive is Idle"

    // Thêm đối tượng theo dõi trạng thái
    const appState = {
        authenticated: false,
        selectedDir: "",
        isProcessing: false,
        syncComplete: false,
        stats: {
            filesProcessed: 0,
            totalFiles: 0,
            startTime: null,
            endTime: null
        }
    };

    const ensureVisible = () => {
        description.style.display = '' // Setting display to '' resets display to initial state
        button.style.display = ''
        input.style.display = ''
        input.type = ''
        input.classList.remove('shake-horizontal')
        input.offsetHeight // Triggers Reflow
        input.style.border = "1px solid #c4c4c4"
        title.innerHTML = 'Sign in to TeleDrive'
    }

    let retriedOnce = {
        phoneNumber: false,
        code: false,
        password: false
    }

    // Thêm container cho toast notifications
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    // Hàm hiển thị toast notification
    function showToast(type, title, message, duration = 5000) {
        console.log(`Showing toast: ${type} - ${title} - ${message}`);
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconSymbol = '';
        switch(type) {
            case 'success': iconSymbol = '✓'; break;
            case 'error': iconSymbol = '✕'; break;
            case 'warning': iconSymbol = '⚠'; break;
            case 'info': 
            default: iconSymbol = 'ℹ'; break;
        }
        
        toast.innerHTML = `
            <div class="toast-icon">${iconSymbol}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Tự động đóng toast sau một khoảng thời gian
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, duration);
        
        return toast;
    }
    
    // Cập nhật hàm updateConnectionStatus để sử dụng theme mới
    function updateConnectionStatus(status, showNotification = true) {
        console.log(`Updating connection status to: ${status}`);
        
        const statusText = connectionStatus.querySelector('span')
        const statusIndicator = connectionStatus.querySelector('.status-indicator')
        
        // Xóa tất cả các classes
        connectionStatus.classList.remove('connected', 'connecting', 'disconnected')
        statusIndicator.classList.remove('green', 'yellow', 'red')
        
        const oldStatus = statusText.textContent;
        
        if (status === 'connected') {
            connectionStatus.classList.add('connected')
            statusIndicator.classList.add('green')
            statusText.textContent = 'Đã kết nối'
            
            // Thêm hiệu ứng pulse khi kết nối thành công
            statusIndicator.style.animation = 'pulse 2s infinite';
            
            if (showNotification && oldStatus !== 'Đã kết nối') {
                showToast('success', 'Kết nối thành công', 'Đã kết nối đến máy chủ Telegram.');
            }
        } else if (status === 'connecting') {
            connectionStatus.classList.add('connecting')
            statusIndicator.classList.add('yellow')
            statusText.textContent = 'Đang kết nối...'
            
            // Thêm hiệu ứng nhấp nháy cho trạng thái đang kết nối
            statusIndicator.style.animation = 'blink 1s infinite';
            
            if (showNotification && oldStatus === 'Mất kết nối') {
                showToast('info', 'Đang kết nối lại', 'Đang thử kết nối lại với máy chủ Telegram...');
            }
        } else if (status === 'disconnected') {
            connectionStatus.classList.add('disconnected')
            statusIndicator.classList.add('red')
            statusText.textContent = 'Mất kết nối'
            
            // Xóa hiệu ứng animation
            statusIndicator.style.animation = '';
            
            if (showNotification && oldStatus !== 'Mất kết nối') {
                showToast('error', 'Mất kết nối', 'Kết nối đến máy chủ Telegram bị gián đoạn. Hệ thống sẽ tự động kết nối lại.');
            }
        }
    }
    
    // Cập nhật thanh tiến độ
    function updateProgress(value, message) {
        if (value >= 0) {
            progressIndicator.style.width = `${value}%`
            progressText.textContent = `${value}%`
        }
        
        if (message) {
            const progressMessage = document.getElementById('progressMessage') || (() => {
                const el = document.createElement('div');
                el.id = 'progressMessage';
                el.style.fontSize = '12px';
                el.style.marginTop = '4px';
                el.style.color = '#666';
                syncProgress.appendChild(el);
                return el;
            })();
            
            progressMessage.textContent = message;
        }
    }
    
    // Hiển thị các nút thao tác nhanh
    function showQuickActions(show) {
        quickActions.style.display = show ? '' : 'none'
    }
    
    // Hiển thị thanh tiến độ
    function showProgress(show, message = null) {
        syncProgress.style.display = show ? '' : 'none'
        if (show && message) {
            updateProgress(-1, message);
        }
    }

    // Kiểm tra kết nối ngay khi trang được tải
    console.log("Requesting initial connection check");
    
    // Ẩn màn hình chào mừng sau 2 giây
    setTimeout(() => {
        uiTransition.hideSplash();
        
        // Sau khi ẩn splash, gửi yêu cầu kiểm tra kết nối
        setTimeout(() => {
            ipcRenderer.send('checkConnection');
        }, 500);
    }, 2000);
    
    // Tạo một interval để kiểm tra kết nối mỗi 5 giây cho đến khi kết nối thành công
    let initialConnectionCheck = setInterval(() => {
        if (appState.authenticated || title.innerHTML !== 'Connecting...') {
            console.log("Initial connection check no longer needed, clearing interval");
            clearInterval(initialConnectionCheck);
        } else {
            console.log("Still connecting, requesting another connection check");
            ipcRenderer.send('checkConnection');
        }
    }, 5000);

    ipcRenderer.on('auth', async (event, message) => {
        console.log("Auth event received:", message);
        
        // Cập nhật trạng thái kết nối
        updateConnectionStatus('connecting');

        // Xử lý sự kiện xác thực dựa trên loại tin nhắn
        if (message && message._) {
            autoRespond(message._);
        }

        const getInput = () => {
            return new Promise(resolve => {
                const clicked = () => {
                    button.removeEventListener('click', clicked);
                    input.removeEventListener('keydown', pressed);
                    
                    const value = input.value;
                    input.value = '';
                    title.innerHTML = 'Đang xử lý...';
                    description.innerHTML = 'Vui lòng đợi trong giây lát...';
                    
                    console.log(`Input received: ${value}`);
                    resolve(value);
                };

                const pressed = event => {
                    if (event.keyCode === 13) {
                        button.removeEventListener('click', clicked);
                        input.removeEventListener('keydown', pressed);
                        
                        const value = input.value;
                        input.value = '';
                        title.innerHTML = 'Đang xử lý...';
                        description.innerHTML = 'Vui lòng đợi trong giây lát...';
                        
                        console.log(`Input received: ${value}`);
                        resolve(value);
                    }
                };

                button.addEventListener('click', clicked);
                input.addEventListener('keydown', pressed);
            });
        };

        if (message._ === 'authorizationStateWaitPhoneNumber') {
            const phoneNumber = await getInput();
            console.log(`Sending phone number: ${phoneNumber}`);
            ipcRenderer.send('phoneNumber', phoneNumber);
            
            // Lưu số điện thoại để sử dụng lần sau
            localStorage.setItem('phoneNumber', phoneNumber);
            
            // Hiển thị thông báo
            showToast('info', 'Đang kiểm tra', 'Đang kiểm tra số điện thoại của bạn...');
        } else if (message._ === 'authorizationStateWaitCode') {
            const code = await getInput();
            console.log(`Sending verification code: ${code}`);
            ipcRenderer.send('authCode', code);
            
            // Hiển thị thông báo
            showToast('info', 'Đang xác thực', 'Đang xác thực mã code của bạn...');
        } else if (message._ === 'authorizationStateWaitPassword') {
            const password = await getInput();
            console.log(`Sending password: [HIDDEN]`);
            ipcRenderer.send('password', password);
            
            // Hiển thị thông báo
            showToast('info', 'Đang đăng nhập', 'Đang xác thực mật khẩu của bạn...');
        } else if (message._ === 'authorizationStateReady') {
            console.log("Authorization completed successfully");
            
            // Hiển thị giao diện đã xác thực thành công
            title.innerHTML = 'Đã đăng nhập';
            description.innerHTML = 'Đã đăng nhập thành công vào tài khoản Telegram.';
            input.style.display = 'none';
            button.style.display = 'none';
            
            // Hiển thị thông báo
            showToast('success', 'Đăng nhập thành công', 'Bạn đã đăng nhập thành công vào tài khoản Telegram.');
            
            // Cập nhật trạng thái kết nối
            updateConnectionStatus('connected');
            
            // Hiển thị các nút thống kê và tối ưu sau khi đăng nhập thành công
            analyticsButton.style.display = '';
            optimizeButton.style.display = '';
            quickActions.style.display = '';
            
            // Yêu cầu thông tin người dùng
            ipcRenderer.send('getUserInfo');
        } else if (message._ === 'error') {
            console.error("Authentication error:", message.error);
            
            // Hiển thị thông báo lỗi
            showToast('error', 'Lỗi xác thực', `Lỗi khi xác thực: ${message.error}`);
            
            // Yêu cầu xác thực lại
            setTimeout(() => {
                ipcRenderer.send('resetAuth');
            }, 2000);
            
            // Cập nhật trạng thái kết nối
            updateConnectionStatus('disconnected');
        }
    });

    ipcRenderer.on('updateMyInfo', (event, myInfo) => {
        console.log("Updating user info:", myInfo);
        name.innerHTML = myInfo.name || 'Unknown'
        number.innerHTML = myInfo.number || 'No number'
        if (myInfo.photo) {
            console.log("Setting profile picture from:", myInfo.photo);
            profilePicture.src = myInfo.photo
        } else {
            console.log("No profile picture available");
        }
        
        // Đánh dấu là đã xác thực
        appState.authenticated = true;
    })

    ipcRenderer.on('authSuccess', () => {
        console.log("Auth success received - user authenticated successfully");
        
        // Đánh dấu là đã xác thực thành công
        appState.authenticated = true;
        
        // Cập nhật trạng thái kết nối
        updateConnectionStatus('connected');
        
        // Thay đổi UI chỉ khi không đang ở màn hình "Connecting..."
        if (title.innerHTML !== 'Connecting...') {
            title.innerHTML = 'Login Successful'
            profile.style.display = ''

            description.innerHTML = 'Select the location for <br> your synced folder'
            description.style.display = ''
            button.innerHTML = 'Open'

            button.addEventListener('click', function f() {
                console.log("User clicked to open file dialog");
                ipcRenderer.send('openFileDialog')
                button.removeEventListener('click', f)
            })

            button.style.display = ''
            input.style.display = 'none'
            
            // Tự động mở hộp thoại chọn thư mục sau 0.5 giây
            setTimeout(() => {
                console.log("[AUTO] Automatically opening file dialog");
                ipcRenderer.send('openFileDialog')
            }, 500);
            
            // Hiển thị các nút chức năng mới
            analyticsButton.style.display = '';
            optimizeButton.style.display = '';
            
            // Hiển thị các nút thao tác nhanh
            showQuickActions(true);
        } else {
            console.log("Still on connecting screen, waiting for connection status to update UI");
        }
    })

    ipcRenderer.on('dialogCancelled', () => {
        console.log("File dialog was cancelled");
        button.addEventListener('click', function f() {
            ipcRenderer.send('openFileDialog')
            button.removeEventListener('click', f)
        })
    })

    ipcRenderer.on('selectedDir', (event, path) => {
        console.log('Selected directory:', path);
        
        // Cập nhật UI khi đã chọn thư mục
        if (title) title.innerHTML = 'Thiết lập thành công';
        
        // Chuyển sang giao diện đồng bộ hóa
        uiTransition.showSyncStatus(path);
        
        // Cập nhật nút
        if (button) {
            button.innerHTML = 'THAY ĐỔI';
            button.addEventListener('click', function f() {
                ipcRenderer.send('changeTeleDir');
            });
        }

        // Hiện các nút đồng bộ
        if (syncButton) syncButton.style.display = '';
        if (queueButton) queueButton.style.display = '';
        
        // Lưu đường dẫn thư mục đã chọn
        appState.selectedDir = path;
        
        // Thêm dashboard UI nếu chưa có
        const existingDashboard = document.getElementById('dashboard-container');
        if (!existingDashboard && mainCard) {
            const dashboard = createDashboardUI(path);
            mainCard.appendChild(dashboard);
        }

        syncButton.addEventListener('click', function syncAll() {
            syncButton.removeEventListener("click", syncAll)
            syncButton.innerHTML = 'WAITING IN QUEUE'
            ipcRenderer.send('syncAll')
            
            // Bắt đầu theo dõi quá trình đồng bộ
            appState.isProcessing = true;
            appState.stats.startTime = new Date();
            appState.stats.filesProcessed = 0;
            appState.stats.totalFiles = 0;
        })

        queueButton.addEventListener('click', () => {
            // Create swal style
            let swalStyle = document.createElement('style')
            swalStyle.innerHTML = `.swal-title {
                font-size: 16px !important;
                box-shadow: 0 1px 1px rgba(0, 0, 0, 0.21) !important;
                margin: 0 0 28px !important;
            }`

            // Set id so we can remove it later
            swalStyle.id = "swalStyle"

            // Get the first script tag
            let ref = document.querySelector('script')

            // Insert our new styles before the first script tag
            ref.parentNode.insertBefore(swalStyle, ref)

            // noinspection JSUnresolvedFunction
            swal({
                title: "Queue",
                content: queueList,
                button: "Close"
            }).then(_ => {
                document.getElementById("swalStyle").remove()
            })
        })
        
        // Thêm xử lý sự kiện cho nút thống kê
        analyticsButton.addEventListener('click', () => {
            console.log("Analytics button clicked");
            ipcRenderer.send('getAnalytics');
            showToast('info', 'Đang tải', 'Đang tải dữ liệu thống kê...');
        });
        
        // Thêm xử lý sự kiện cho nút tối ưu
        optimizeButton.addEventListener('click', () => {
            console.log("Optimize button clicked");
            showOptimizationOptions();
        });
    })

    // Nhận phản hồi dữ liệu thống kê từ main process
    ipcRenderer.on('analyticsData', (event, data) => {
        console.log("Analytics data received:", data);
        showAnalyticsModal(data);
    });

    // Nhận thông báo tiến độ tối ưu hóa
    ipcRenderer.on('optimizeProgress', (event, data) => {
        updateOptimizeProgress(data);
    });

    // Hàm hiển thị modal tùy chọn tối ưu
    function showOptimizationOptions() {
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalContainer.style.zIndex = '1000';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.backgroundColor = 'white';
        modalContent.style.borderRadius = '8px';
        modalContent.style.width = '400px';
        modalContent.style.maxWidth = '90%';
        modalContent.style.padding = '20px';
        modalContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        
        modalContent.innerHTML = `
            <h3 style="margin-top: 0; color: #333;">Tùy chọn tối ưu hóa</h3>
            <p style="color: #666; font-size: 14px;">Chọn các tùy chọn tối ưu hóa bạn muốn thực hiện:</p>
            
            <div class="optimize-option" style="margin: 15px 0; display: flex; align-items: flex-start;">
                <input type="checkbox" id="opt-compress" style="margin-right: 10px; margin-top: 3px;" checked>
                <div>
                    <label for="opt-compress" style="font-weight: bold; display: block;">Nén tệp</label>
                    <span style="font-size: 13px; color: #666;">Nén các tệp lớn để tiết kiệm không gian lưu trữ.</span>
                </div>
            </div>
            
            <div class="optimize-option" style="margin: 15px 0; display: flex; align-items: flex-start;">
                <input type="checkbox" id="opt-deduplicate" style="margin-right: 10px; margin-top: 3px;" checked>
                <div>
                    <label for="opt-deduplicate" style="font-weight: bold; display: block;">Xóa trùng lặp</label>
                    <span style="font-size: 13px; color: #666;">Xác định và xử lý các tệp trùng lặp.</span>
                </div>
            </div>
            
            <div class="optimize-option" style="margin: 15px 0; display: flex; align-items: flex-start;">
                <input type="checkbox" id="opt-cleanup" style="margin-right: 10px; margin-top: 3px;" checked>
                <div>
                    <label for="opt-cleanup" style="font-weight: bold; display: block;">Dọn dẹp tệp tạm</label>
                    <span style="font-size: 13px; color: #666;">Xóa các tệp tạm thời không còn cần thiết.</span>
                </div>
            </div>
            
            <div class="optimize-option" style="margin: 15px 0; display: flex; align-items: flex-start;">
                <input type="checkbox" id="opt-organize" style="margin-right: 10px; margin-top: 3px;">
                <div>
                    <label for="opt-organize" style="font-weight: bold; display: block;">Sắp xếp lưu trữ</label>
                    <span style="font-size: 13px; color: #666;">Sắp xếp các tệp vào thư mục dựa trên loại tệp.</span>
                </div>
            </div>
            
            <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                <button id="cancel-optimize" style="padding: 8px 16px; margin-right: 10px; background: none; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Hủy</button>
                <button id="start-optimize" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Bắt đầu tối ưu</button>
            </div>
        `;
        
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
        
        // Xử lý sự kiện cho nút Hủy
        document.getElementById('cancel-optimize').addEventListener('click', () => {
            document.body.removeChild(modalContainer);
        });
        
        // Xử lý sự kiện cho nút Bắt đầu tối ưu
        document.getElementById('start-optimize').addEventListener('click', () => {
            const options = {
                compress: document.getElementById('opt-compress').checked,
                deduplicate: document.getElementById('opt-deduplicate').checked,
                cleanup: document.getElementById('opt-cleanup').checked,
                organize: document.getElementById('opt-organize').checked
            };
            
            ipcRenderer.send('startOptimization', options);
            showToast('info', 'Bắt đầu tối ưu', 'Quá trình tối ưu hóa đã bắt đầu. Vui lòng đợi...');
            document.body.removeChild(modalContainer);
        });
    }
    
    // Hàm hiển thị modal thống kê
    function showAnalyticsModal(data) {
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalContainer.style.zIndex = '1000';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.backgroundColor = 'white';
        modalContent.style.borderRadius = '8px';
        modalContent.style.width = '500px';
        modalContent.style.maxWidth = '90%';
        modalContent.style.maxHeight = '80vh';
        modalContent.style.overflowY = 'auto';
        modalContent.style.padding = '20px';
        modalContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        
        // Format thời gian
        const formatDate = (timestamp) => {
            if (!timestamp) return 'N/A';
            const date = new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        };
        
        // Hiển thị thống kê tệp
        let filesContent = '<p>Không có dữ liệu tệp</p>';
        if (data.files && Object.keys(data.files).length > 0) {
            filesContent = `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Tên tệp</th>
                            <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">Kích thước</th>
                            <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            Object.values(data.files).forEach(file => {
                filesContent += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${file.name}</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">${formatBytes(file.size)}</td>
                        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">
                            ${file.isBackedUp ? 
                                '<span style="color: green;">✓ Đã sao lưu</span>' : 
                                '<span style="color: orange;">⟳ Chờ sao lưu</span>'}
                        </td>
                    </tr>
                `;
            });
            
            filesContent += `
                    </tbody>
                </table>
            `;
        }
        
        // Hiển thị thống kê tin nhắn
        let messagesContent = '<p>Không có dữ liệu tin nhắn</p>';
        if (data.messages && data.messages.length > 0) {
            messagesContent = `
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
            `;
            
            data.messages.forEach(message => {
                messagesContent += `
                    <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; justify-content: space-between;">
                            <div style="font-weight: bold;">${message.author}</div>
                            <div style="color: #666; font-size: 12px;">${formatDate(message.timestamp)}</div>
                        </div>
                        <div style="margin: 5px 0;">${message.content}</div>
                        <div style="color: #666; font-size: 12px;">
                            👍 ${message.likes || 0} · 
                            💬 ${message.comments ? message.comments.length : 0} · 
                            🔄 ${message.shares || 0}
                        </div>
                    </div>
                `;
            });
            
            messagesContent += `</div>`;
        }
        
        // Hiển thị thống kê tương tác
        const interactions = data.interactions || { likes: 0, comments: 0, shares: 0 };
        
        // Hiển thị thống kê cơ bản
        const stats = data.stats || { 
            filesBackedUp: 0,
            totalSize: 0,
            lastBackup: null,
            syncRate: '0 files/min',
            errors: 0
        };
        
        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #333;">Thống kê và phân tích</h3>
                <button id="close-analytics" style="background: none; border: none; cursor: pointer; font-size: 20px;">×</button>
            </div>
            
            <div class="analytics-section">
                <h4 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Tổng quan</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div class="stat-card" style="background-color: #f9f9f9; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 12px; color: #666;">Tệp đã sao lưu</div>
                        <div style="font-size: 18px; font-weight: bold;">${stats.filesBackedUp}</div>
                    </div>
                    <div class="stat-card" style="background-color: #f9f9f9; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 12px; color: #666;">Tổng dung lượng</div>
                        <div style="font-size: 18px; font-weight: bold;">${formatBytes(stats.totalSize)}</div>
                    </div>
                    <div class="stat-card" style="background-color: #f9f9f9; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 12px; color: #666;">Lần sao lưu cuối</div>
                        <div style="font-size: 14px; font-weight: bold;">${formatDate(stats.lastBackup)}</div>
                    </div>
                    <div class="stat-card" style="background-color: #f9f9f9; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 12px; color: #666;">Tốc độ đồng bộ</div>
                        <div style="font-size: 18px; font-weight: bold;">${stats.syncRate}</div>
                    </div>
                </div>
            </div>
            
            <div class="analytics-section">
                <h4 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Tương tác</h4>
                <div style="display: flex; gap: 15px; margin-bottom: 20px; text-align: center;">
                    <div style="flex: 1; background-color: #E3F2FD; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 24px; font-weight: bold;">👍 ${interactions.likes}</div>
                        <div style="font-size: 14px; color: #666;">Lượt thích</div>
                    </div>
                    <div style="flex: 1; background-color: #E8F5E9; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 24px; font-weight: bold;">💬 ${interactions.comments}</div>
                        <div style="font-size: 14px; color: #666;">Bình luận</div>
                    </div>
                    <div style="flex: 1; background-color: #FFF3E0; padding: 12px; border-radius: 6px;">
                        <div style="font-size: 24px; font-weight: bold;">🔄 ${interactions.shares}</div>
                        <div style="font-size: 14px; color: #666;">Chia sẻ</div>
                    </div>
                </div>
            </div>
            
            <div class="analytics-tabs" style="margin-bottom: 15px;">
                <div style="display: flex; border-bottom: 1px solid #ddd;">
                    <div id="tab-files" class="tab active" style="padding: 10px 15px; cursor: pointer; border-bottom: 2px solid #2196F3;">Tệp</div>
                    <div id="tab-messages" class="tab" style="padding: 10px 15px; cursor: pointer;">Tin nhắn</div>
                </div>
                
                <div id="content-files" class="tab-content" style="padding: 15px 0;">
                    <h4 style="margin-top: 0;">Danh sách tệp</h4>
                    ${filesContent}
                </div>
                
                <div id="content-messages" class="tab-content" style="display: none; padding: 15px 0;">
                    <h4 style="margin-top: 0;">Tin nhắn gần đây</h4>
                    ${messagesContent}
                </div>
            </div>
            
            <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                <button id="export-data" style="padding: 8px 16px; margin-right: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Xuất dữ liệu</button>
                <button id="refresh-analytics" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Làm mới</button>
            </div>
        `;
        
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
        
        // Xử lý sự kiện cho nút đóng
        document.getElementById('close-analytics').addEventListener('click', () => {
            document.body.removeChild(modalContainer);
        });
        
        // Xử lý sự kiện cho các tab
        document.getElementById('tab-files').addEventListener('click', () => {
            document.getElementById('tab-files').style.borderBottom = '2px solid #2196F3';
            document.getElementById('tab-messages').style.borderBottom = 'none';
            document.getElementById('content-files').style.display = '';
            document.getElementById('content-messages').style.display = 'none';
        });
        
        document.getElementById('tab-messages').addEventListener('click', () => {
            document.getElementById('tab-messages').style.borderBottom = '2px solid #2196F3';
            document.getElementById('tab-files').style.borderBottom = 'none';
            document.getElementById('content-files').style.display = 'none';
            document.getElementById('content-messages').style.display = '';
        });
        
        // Xử lý sự kiện cho nút Xuất dữ liệu
        document.getElementById('export-data').addEventListener('click', () => {
            ipcRenderer.send('exportAnalyticsData');
            showToast('info', 'Xuất dữ liệu', 'Đang chuẩn bị xuất dữ liệu thống kê...');
        });
        
        // Xử lý sự kiện cho nút Làm mới
        document.getElementById('refresh-analytics').addEventListener('click', () => {
            ipcRenderer.send('getAnalytics');
            showToast('info', 'Đang tải', 'Đang làm mới dữ liệu thống kê...');
            document.body.removeChild(modalContainer);
        });
    }
    
    // Lắng nghe sự kiện xuất dữ liệu thống kê thành công
    ipcRenderer.on('exportAnalyticsComplete', (event, path) => {
        console.log("Export analytics complete:", path);
        showToast('success', 'Xuất dữ liệu thành công', `Dữ liệu thống kê đã được xuất ra: ${path}`);
    });
    
    // Cập nhật tiến độ tối ưu
    function updateOptimizeProgress(data) {
        swal.update({
            title: "Đang tối ưu...",
            text: `Đã xử lý ${data.processed}/${data.total} tệp (${Math.round(data.processed/data.total*100)}%)`
        });
    }
    
    // Định dạng kích thước
    function formatSize(size) {
        if (size < 1024) return size + " B";
        else if (size < 1024*1024) return (size/1024).toFixed(2) + " KB";
        else if (size < 1024*1024*1024) return (size/(1024*1024)).toFixed(2) + " MB";
        else return (size/(1024*1024*1024)).toFixed(2) + " GB";
    }

    ipcRenderer.on('syncStarting', _ => {
        syncButton.innerHTML = 'RESTORING...'
        
        // Hiển thị thanh tiến độ
        showProgress(true)
        updateProgress(0, 'Đang bắt đầu đồng bộ hóa...')
        
        // Cập nhật trạng thái
        appState.isProcessing = true;
        appState.stats.startTime = new Date();
    })
    
    // Nhận cập nhật tiến độ đồng bộ
    ipcRenderer.on('syncProgress', (event, data) => {
        // Cập nhật thanh tiến độ
        const percent = Math.round((data.processed / data.total) * 100);
        updateProgress(percent, `Đang đồng bộ (${data.processed}/${data.total})...`);
        
        // Cập nhật số lượng tệp đã xử lý
        appState.stats.filesProcessed = data.processed;
        appState.stats.totalFiles = data.total;
    });

    ipcRenderer.on('syncOver', _ => {
        // Ẩn thanh tiến độ
        showProgress(false)
        
        syncButton.innerHTML =
            `<svg xmlns='http://www.w3.org/2000/svg' style="width: 30px; height: 30px" viewBox='0 0 512 512'>
                     <path d='M320,336h76c55,0,100-21.21,100-75.6s-53-73.47-96-75.6C391.11,99.74,329,48,256,48c-69,0-113.44,45.79-128,91.2-60,5.7-112,35.88-112,98.4S70,336,136,336h56'
                           style='fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round;stroke-width:32px'/>
                     <polyline points='192 400.1 256 464 320 400.1'
                               style='fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round;stroke-width:32px'/>
                     <line x1='256' y1='224' x2='256' y2='448.03'
                           style='fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round;stroke-width:32px'/>
                 </svg>
                 <div>RESTORE AGAIN</div>`

        // Add new listener
        const syncAll = () => {
            syncButton.removeEventListener("click", syncAll)
            syncButton.innerHTML = 'WAITING IN QUEUE'
            ipcRenderer.send('syncAll')
        }
        syncButton.addEventListener('click', syncAll)
        
        // Cập nhật trạng thái
        appState.isProcessing = false;
        appState.syncComplete = true;
        appState.stats.endTime = new Date();
        appState.stats.processTime = ((appState.stats.endTime - appState.stats.startTime) / 1000).toFixed(2) + 's';
        
        // Hiển thị thống kê
        uiTransition.showStats(appState.stats);
        
        // Cập nhật description
        description.innerHTML = 'Đồng bộ hóa hoàn tất!';
    })

    ipcRenderer.on('pushQueue', (event, action) => {
        queue.push(action)
        if (queue.length === 1) {
            queueList.style.lineHeight = ""
            queueList.innerHTML = ""
        }
        let thisAction = document.createElement('div')
        thisAction.innerHTML = "Add " + queue[queue.length - 1].relativePath
        queueList.appendChild(thisAction)
        
        // Cập nhật số lượng tệp
        appState.stats.totalFiles++;
        
        ipcRenderer.once('shiftQueue', () => {
            console.log("SHIFTING QUEUE")
            queue.shift()
            
            // Cập nhật số lượng tệp đã xử lý
            appState.stats.filesProcessed++;
            
            if (queue.length === 0) {
                queueList.style.lineHeight = "440px"
                queueList.innerHTML = "TeleDrive is Idle"
            } else {
                queueList.removeChild(thisAction)
            }
        })
    })

    ipcRenderer.on('uploadConflict', async (event, conflictingFile) => {
        let msg = document.createElement("div");
        msg.innerHTML = `Newer / Unknown version of <br>${conflictingFile}</br> is already on Telegram`;

        // noinspection JSUnresolvedFunction
        let choice = await swal({
            title: "Upload Conflict",
            content: msg,
            icon: "warning",
            buttons: {
                cancel: "Fast-Forward Local",
                confirm: "Overwrite Cloud",
            },
            dangerMode: true,
            closeOnClickOutside: false
        })
        if (choice) { // Overwrite cloud
            // noinspection JSUnresolvedFunction
            swal("Conflict Resolved", "Syncing old version to cloud", "success");
            ipcRenderer.send('conflictResolved', true)
        } else { // Overwrite Local
            // noinspection JSUnresolvedFunction
            swal("Conflict Resolved", "Downloading new version from cloud", "success");
            ipcRenderer.send('conflictResolved', false)
        }
    })

    ipcRenderer.on('movingFiles', _ => {
        let loader = document.createElement("div")
        loader.style.display = "flex"
        loader.style.alignItems = "center"
        loader.style.justifyContent = "center"
        loader.innerHTML = `<div id="loader"></div>`

        // noinspection JSUnresolvedFunction
        swal({
            title: "Moving Files...",
            content: loader,
            closeOnClickOutside: false
        })
    })

    ipcRenderer.on('restarting', _ => {
        let timerElement = document.createElement("div")
        timerElement.innerHTML = `<h1>5</h1>`

        // noinspection JSUnresolvedFunction
        swal({
            title: "Relaunching App...",
            icon: "info",
            content: timerElement,
            closeOnClickOutside: false
        })

        let count = 5
        let timer = setInterval(_ => {
            if (count < 0) {
                clearInterval(timer)
            }
            count--
            timerElement.innerHTML = `<h1>${count.toString()}</h1>`
        }, 1000)
    })

    ipcRenderer.on('quit', _ => {
        // noinspection JSUnresolvedFunction
        swal({
            title: "Cleaning up...",
            icon: "info",
            closeOnClickOutside: false
        })
    })
    
    // Thêm CSS cho các phần tử mới
    const style = document.createElement('style');
    style.textContent = `
        .press-blue {
            background-color: #3498db;
            color: white;
        }
        
        .press-purple {
            background-color: #9b59b6;
            color: white;
        }
        
        .analytics-container {
            padding: 10px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .analytics-section {
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        
        .analytics-section h3 {
            margin: 5px 0;
            color: #555;
        }
        
        .stats-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
        }
        
        .optimize-container {
            padding: 10px;
        }
        
        .optimize-options {
            margin-bottom: 15px;
        }
        
        .optimize-option {
            display: flex;
            align-items: center;
            margin: 8px 0;
        }
        
        .optimize-option input {
            margin-right: 10px;
        }
        
        .optimize-button {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    // Xử lý các nút thao tác nhanh
    actionPause.addEventListener('click', () => {
        console.log("Pause action clicked");
        ipcRenderer.send('pauseSync');
        showToast('info', 'Tạm dừng đồng bộ', 'Đã tạm dừng quá trình đồng bộ hóa.');
    });
    
    actionResume.addEventListener('click', () => {
        console.log("Resume action clicked");
        ipcRenderer.send('resumeSync');
        showToast('success', 'Tiếp tục đồng bộ', 'Đã tiếp tục quá trình đồng bộ hóa.');
    });
    
    actionRefresh.addEventListener('click', () => {
        console.log("Refresh action clicked");
        ipcRenderer.send('refreshSync');
        showToast('info', 'Làm mới đồng bộ', 'Đang làm mới trạng thái đồng bộ hóa...');
    });
    
    // Theo dõi trạng thái kết nối
    let connectionCheckInterval = setInterval(() => {
        console.log("Sending periodic connection check request");
        ipcRenderer.send('checkConnection');
    }, 10000); // Kiểm tra mỗi 10 giây

    // Nhận phản hồi trạng thái kết nối
    ipcRenderer.on('connectionStatus', (event, status) => {
        console.log("Received connection status:", status);
        
        // Đảm bảo cập nhật giao diện khi kết nối thành công
        if (status.connected) {
            // Nếu đã xác thực nhưng giao diện vẫn ở màn hình kết nối, cập nhật nó
            if (appState.authenticated && title.innerHTML === 'Connecting...') {
                console.log("Connection successful, updating UI to logged in state");
                
                // Cập nhật UI để hiển thị màn hình chính
                title.innerHTML = 'Login Successful';
                profile.style.display = '';
                description.innerHTML = 'Select the location for <br> your synced folder';
                description.style.display = '';
                button.innerHTML = 'Open';
                button.style.display = '';
                input.style.display = 'none';
                
                // Hiển thị các nút chức năng
                analyticsButton.style.display = '';
                optimizeButton.style.display = '';
                showQuickActions(true);
                
                // Tự động mở hộp thoại chọn thư mục
                setTimeout(() => {
                    console.log("[AUTO] Automatically opening file dialog after connection");
                    ipcRenderer.send('openFileDialog');
                }, 500);
            }
            
            updateConnectionStatus('connected');
        } else if (status.reconnecting) {
            updateConnectionStatus('connecting');
        } else {
            updateConnectionStatus('disconnected');
        }
    });
    
    // Bắt sự kiện lỗi
    ipcRenderer.on('error', (event, error) => {
        console.error("Received error from main process:", error);
        
        // Hiển thị thông báo lỗi
        swal({
            title: "Lỗi",
            text: error.message || "Đã xảy ra lỗi không xác định",
            icon: "error",
            button: "Đóng"
        });
        
        // Cập nhật trạng thái UI
        updateConnectionStatus('disconnected');
    });
    
    // Debug logging
    console.log("Setting up debug logging for IPC events");
    const originalSend = ipcRenderer.send;
    ipcRenderer.send = function(channel, ...args) {
        console.log(`[IPC Send] ${channel}:`, ...args);
        return originalSend.apply(this, [channel, ...args]);
    };

    console.log("Renderer process initialization complete");

    // Cập nhật hàm autoRespond để thêm thông báo
    function autoRespond(messageType) {
        console.log(`Auto responding to message type: ${messageType}`);
        
        if (messageType === 'authorizationStateWaitPhoneNumber') {
            showToast('info', 'Cần xác thực', 'Vui lòng nhập số điện thoại của bạn để xác thực với Telegram.');
            
            title.innerHTML = 'Xác thực Telegram';
            description.innerHTML = 'Nhập số điện thoại của bạn (bao gồm mã quốc gia)';
            input.style.display = '';
            input.focus();
            button.style.display = '';
            button.innerHTML = 'Tiếp tục';
            
            // Nếu đã có profile và số điện thoại lưu trữ
            if (localStorage.getItem('phoneNumber')) {
                let savedPhone = localStorage.getItem('phoneNumber');
                input.value = savedPhone;
                showToast('info', 'Số điện thoại đã lưu', 'Sử dụng số điện thoại đã lưu trước đó.');
            }
        } else if (messageType === 'authorizationStateWaitCode') {
            showToast('info', 'Mã xác thực', 'Vui lòng nhập mã xác thực được gửi đến điện thoại của bạn.');
            
            title.innerHTML = 'Xác thực Telegram';
            description.innerHTML = 'Nhập mã xác thực được gửi đến điện thoại của bạn';
            input.style.display = '';
            input.value = '';
            input.focus();
            button.style.display = '';
            button.innerHTML = 'Xác thực';
        } else if (messageType === 'authorizationStateWaitPassword') {
            showToast('info', 'Xác nhận mật khẩu', 'Vui lòng nhập mật khẩu 2FA của bạn.');
            
            title.innerHTML = 'Xác thực Telegram';
            description.innerHTML = 'Nhập mật khẩu 2FA của bạn';
            input.style.display = '';
            input.value = '';
            input.type = 'password';
            input.focus();
            button.style.display = '';
            button.innerHTML = 'Đăng nhập';
        } else if (messageType === 'authorizationStateReady') {
            showToast('success', 'Đăng nhập thành công', 'Bạn đã đăng nhập thành công vào tài khoản Telegram.');
            
            title.innerHTML = 'Đã đăng nhập';
            description.innerHTML = 'Đã đăng nhập thành công vào tài khoản Telegram.';
            input.style.display = 'none';
            button.style.display = 'none';
            
            // Hiển thị các nút thống kê và tối ưu
            analyticsButton.style.display = '';
            optimizeButton.style.display = '';
            
            // Hiển thị các nút thao tác nhanh
            quickActions.style.display = '';
            
            // Cập nhật trạng thái kết nối
            updateConnectionStatus('connected');
            
            // Cập nhật thông tin hồ sơ nếu có
            ipcRenderer.send('getUserInfo');
        }
    }

    // Thêm lắng nghe sự kiện nhận thông tin người dùng
    ipcRenderer.on('userInfo', (event, myInfo) => {
        console.log("Updating user info:", myInfo);
        
        // Đánh dấu là đã xác thực
        appState.authenticated = true;
        
        // Cập nhật thông tin người dùng
        if (name) name.innerHTML = myInfo.name || 'Unknown'
        if (number) number.innerHTML = myInfo.number || 'No number'
        if (myInfo.photo && profilePicture) {
            console.log("Setting profile picture from:", myInfo.photo);
            profilePicture.src = myInfo.photo;
        } else {
            console.log("No profile picture available");
        }
        
        // Nếu đang ở màn hình "Connecting...", cập nhật UI
        if (title && title.innerHTML === 'Connecting...') {
            console.log("User info received, updating UI from connecting state");
            
            // Chuyển đổi sang giao diện đã đăng nhập
            uiTransition.showLoggedIn(myInfo);
            
            // Thêm event listener cho nút chọn thư mục
            if (button) {
                button.innerHTML = 'Chọn thư mục';
                button.style.display = '';
                
                button.addEventListener('click', function f() {
                    console.log("User clicked to open file dialog");
                    ipcRenderer.send('openFileDialog');
                    button.removeEventListener('click', f);
                });
            }
            
            // Tự động mở hộp thoại chọn thư mục
            setTimeout(() => {
                console.log("[AUTO] Automatically opening file dialog after user info");
                ipcRenderer.send('openFileDialog');
            }, 500);
        }
    });

    // Hàm tạo phần tử trạng thái kết nối nếu nó không tồn tại
    function createConnectionStatusElement() {
        const element = document.createElement('div');
        element.id = 'connectionStatus';
        element.className = 'connection-status connecting';
        element.innerHTML = `
            <div class="status-indicator yellow"></div>
            <span>Đang kết nối...</span>
        `;
        element.style.position = 'absolute';
        element.style.top = '15px';
        element.style.right = '15px';
        element.style.padding = '8px 15px';
        element.style.borderRadius = '20px';
        element.style.fontSize = '13px';
        element.style.fontWeight = 'bold';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.gap = '8px';
        element.style.boxShadow = '0 3px 8px rgba(0,0,0,0.15)';
        element.style.zIndex = '1000';
        element.style.backdropFilter = 'blur(5px)';
        document.body.appendChild(element);
        
        // Thêm hiệu ứng xuất hiện
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 300);
        
        // Thêm keyframes cho animation
        if (!document.getElementById('status-animations')) {
            const animations = document.createElement('style');
            animations.id = 'status-animations';
            animations.textContent = `
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(animations);
        }
        
        return element;
    }
    
    // Hàm tạo phần tử tiến trình đồng bộ nếu nó không tồn tại
    function createSyncProgressElement() {
        const element = document.createElement('div');
        element.id = 'syncProgress';
        element.className = 'sync-progress fade-in';
        element.style.display = 'none';
        element.innerHTML = `
            <div class="progress-indicator"></div>
            <div class="progress-text">Đang đồng bộ...</div>
        `;
        element.style.position = 'absolute';
        element.style.bottom = '65px';
        element.style.left = '50%';
        element.style.transform = 'translateX(-50%)';
        element.style.width = '90%';
        element.style.maxWidth = '400px';
        element.style.padding = '15px';
        element.style.borderRadius = '10px';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        element.style.color = 'white';
        element.style.textAlign = 'center';
        element.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
        element.style.backdropFilter = 'blur(10px)';
        document.body.appendChild(element);
        return element;
    }
    
    // Hàm tạo phần tử thao tác nhanh nếu nó không tồn tại
    function createQuickActionsElement() {
        const element = document.createElement('div');
        element.id = 'quickActions';
        element.className = 'quick-actions';
        element.style.display = 'none';
        element.innerHTML = `
            <div id="actionPause" class="action-button action-pause" title="Tạm dừng đồng bộ">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22">
                    <path fill="currentColor" d="M224 432h-80V80h80zM368 432h-80V80h80z"/>
                </svg>
            </div>
            <div id="actionResume" class="action-button action-resume" title="Tiếp tục đồng bộ">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22">
                    <path fill="currentColor" d="M133 440a35.37 35.37 0 01-17.5-4.67c-12-6.8-19.46-20-19.46-34.33V111c0-14.37 7.46-27.53 19.46-34.33a35.13 35.13 0 0135.77.45l247.85 148.36a36 36 0 010 61l-247.89 148.4A35.5 35.5 0 01133 440z"/>
                </svg>
            </div>
            <div id="actionRefresh" class="action-button action-refresh" title="Làm mới trạng thái">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22">
                    <path fill="currentColor" d="M320 146s24.36-12-64-12a160 160 0 10160 160" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/>
                    <path fill="currentColor" d="M256 58l80 80-80 80" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
                </svg>
            </div>
        `;
        element.style.position = 'absolute';
        element.style.bottom = '110px';
        element.style.right = '25px';
        element.style.display = 'flex';
        element.style.flexDirection = 'column';
        element.style.gap = '15px';
        element.style.zIndex = '900';
        document.body.appendChild(element);
        
        // Thêm hiệu ứng xuất hiện
        const buttons = element.querySelectorAll('.action-button');
        buttons.forEach((btn, index) => {
            btn.style.opacity = '0';
            btn.style.transform = 'scale(0.5) translateX(20px)';
            btn.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                btn.style.opacity = '1';
                btn.style.transform = 'scale(1) translateX(0)';
            }, 100 * (index + 1));
        });
        
        // Thêm CSS cho các nút thao tác
        const style = document.createElement('style');
        style.textContent = `
            .action-button {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
                backdrop-filter: blur(5px);
            }
            .action-button:hover {
                background-color: rgba(33, 150, 243, 0.9);
                transform: scale(1.15) rotate(5deg);
                box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
            }
            .action-button:active {
                transform: scale(0.95);
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            }
            .status-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                box-shadow: 0 0 5px currentColor;
            }
            .status-indicator.green { 
                background-color: #4CAF50; 
                box-shadow: 0 0 8px #4CAF50;
            }
            .status-indicator.yellow { 
                background-color: #FFC107; 
                box-shadow: 0 0 8px #FFC107;
            }
            .status-indicator.red { 
                background-color: #F44336; 
                box-shadow: 0 0 8px #F44336;
            }
            .progress-indicator {
                height: 6px;
                background: linear-gradient(to right, #4CAF50, #8BC34A);
                width: 0%;
                border-radius: 3px;
                margin-bottom: 8px;
                transition: width 0.5s ease;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            }
        `;
        document.head.appendChild(style);
        
        return element;
    }

    // Sau khi đã chọn thư mục, thêm thẻ điều khiển đẹp hơn
    function createDashboardUI(dirPath) {
        // Container chính
        const dashboardContainer = document.createElement('div');
        dashboardContainer.id = 'dashboard-container';
        dashboardContainer.className = 'dashboard-container';
        dashboardContainer.style.marginTop = '30px';
        dashboardContainer.style.display = 'flex';
        dashboardContainer.style.flexDirection = 'column';
        dashboardContainer.style.gap = '20px';
        
        // Thẻ thông tin tập tin
        const fileInfoCard = document.createElement('div');
        fileInfoCard.className = 'card file-info-card';
        fileInfoCard.style.display = 'flex';
        fileInfoCard.style.flexDirection = 'row';
        fileInfoCard.style.alignItems = 'center';
        fileInfoCard.style.padding = '15px';
        fileInfoCard.style.borderRadius = '12px';
        fileInfoCard.style.border = '1px solid #eee';
        fileInfoCard.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
        
        fileInfoCard.innerHTML = `
            <div style="width: 50px; height: 50px; background-color: #e3f2fd; border-radius: 10px; display: flex; justify-content: center; align-items: center; margin-right: 15px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 3px;">Thư mục đồng bộ</div>
                <div style="font-size: 13px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                    ${dirPath}
                </div>
            </div>
            <div>
                <button id="open-folder-btn" class="button button-small" style="padding: 5px 10px; font-size: 12px; background-color: #f5f5f5; color: #333;">Mở</button>
            </div>
        `;
        
        // Thẻ thống kê
        const statsCard = document.createElement('div');
        statsCard.className = 'card stats-card';
        statsCard.style.padding = '15px';
        statsCard.style.borderRadius = '12px';
        statsCard.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
        statsCard.style.backgroundColor = 'white';
        statsCard.style.border = '1px solid #eee';
        
        const filesCount = appState.stats.filesProcessed || 0;
        const filesTotal = appState.stats.totalFiles || 0;
        const syncPercent = filesTotal > 0 ? Math.round((filesCount / filesTotal) * 100) : 0;
        
        statsCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="font-weight: bold;">Thống kê đồng bộ</div>
                <div style="font-size: 12px; color: #666;">Cập nhật lần cuối: ${new Date().toLocaleTimeString()}</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 10px;">
                <div style="text-align: center; padding: 10px; background-color: #e3f2fd; border-radius: 8px;">
                    <div style="font-size: 22px; font-weight: bold; color: #2196F3;">${filesCount}</div>
                    <div style="font-size: 12px; color: #666;">Tệp đã đồng bộ</div>
                </div>
                <div style="text-align: center; padding: 10px; background-color: #e8f5e9; border-radius: 8px;">
                    <div style="font-size: 22px; font-weight: bold; color: #4CAF50;">${filesTotal}</div>
                    <div style="font-size: 12px; color: #666;">Tổng số tệp</div>
                </div>
                <div style="text-align: center; padding: 10px; background-color: #fff8e1; border-radius: 8px;">
                    <div style="font-size: 22px; font-weight: bold; color: #FFC107;">${syncPercent}%</div>
                    <div style="font-size: 12px; color: #666;">Tỉ lệ đồng bộ</div>
                </div>
            </div>
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <div style="font-size: 12px; font-weight: bold;">Tiến độ đồng bộ</div>
                    <div style="font-size: 12px;">${syncPercent}%</div>
                </div>
                <div style="width: 100%; height: 6px; background-color: #f5f5f5; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${syncPercent}%; height: 100%; background: linear-gradient(to right, #2196F3, #4CAF50); border-radius: 3px;"></div>
                </div>
            </div>
        `;
        
        // Thẻ thao tác nhanh
        const actionsCard = document.createElement('div');
        actionsCard.className = 'card actions-card';
        actionsCard.style.display = 'grid';
        actionsCard.style.gridTemplateColumns = 'repeat(4, 1fr)';
        actionsCard.style.gap = '10px';
        actionsCard.style.padding = '15px';
        actionsCard.style.borderRadius = '12px';
        actionsCard.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
        actionsCard.style.backgroundColor = 'white';
        actionsCard.style.border = '1px solid #eee';
        
        actionsCard.innerHTML = `
            <div id="action-sync" class="action-item" style="text-align: center; padding: 15px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                <div style="width: 40px; height: 40px; background-color: #e3f2fd; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <polyline points="23 20 23 14 17 14"></polyline>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                    </svg>
                </div>
                <div style="font-size: 13px; font-weight: bold;">Đồng bộ</div>
            </div>
            <div id="action-pause" class="action-item" style="text-align: center; padding: 15px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                <div style="width: 40px; height: 40px; background-color: #fff8e1; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFC107" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                </div>
                <div style="font-size: 13px; font-weight: bold;">Tạm dừng</div>
            </div>
            <div id="action-stats" class="action-item" style="text-align: center; padding: 15px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                <div style="width: 40px; height: 40px; background-color: #e8f5e9; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                </div>
                <div style="font-size: 13px; font-weight: bold;">Thống kê</div>
            </div>
            <div id="action-settings" class="action-item" style="text-align: center; padding: 15px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                <div style="width: 40px; height: 40px; background-color: #f3e5f5; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9C27B0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
});
