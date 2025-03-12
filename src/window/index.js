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
    const connectionStatus = document.getElementById('connectionStatus')
    const syncProgress = document.getElementById('syncProgress')
    const progressIndicator = document.getElementById('progressIndicator')
    const progressText = document.getElementById('progressText')
    const quickActions = document.getElementById('quickActions')
    const actionPause = document.getElementById('actionPause')
    const actionResume = document.getElementById('actionResume')
    const actionRefresh = document.getElementById('actionRefresh')

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
    
    // Cập nhật hàm updateConnectionStatus để thêm thông báo
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
            
            if (showNotification && oldStatus !== 'Đã kết nối') {
                showToast('success', 'Kết nối thành công', 'Đã kết nối đến máy chủ Telegram.');
            }
        } else if (status === 'connecting') {
            connectionStatus.classList.add('connecting')
            statusIndicator.classList.add('yellow')
            statusText.textContent = 'Đang kết nối...'
            
            if (showNotification && oldStatus === 'Mất kết nối') {
                showToast('info', 'Đang kết nối lại', 'Đang thử kết nối lại với máy chủ Telegram...');
            }
        } else if (status === 'disconnected') {
            connectionStatus.classList.add('disconnected')
            statusIndicator.classList.add('red')
            statusText.textContent = 'Mất kết nối'
            
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

    // Đăng ký lắng nghe sự kiện từ main process
    console.log("Registering IPC event listeners");

    // Kiểm tra kết nối ngay khi khởi động
    setTimeout(() => {
        console.log("Performing initial connection check");
        ipcRenderer.send('checkConnection');
        
        // Hiển thị trạng thái kết nối mặc định
        updateConnectionStatus('connecting');
    }, 500);

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
        
        // Cập nhật trạng thái kết nối
        updateConnectionStatus('connected');
        
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
        title.innerHTML = 'Setup Successfully'
        description.innerHTML = `Currently syncing <br> <u style="cursor: pointer"> ${path} <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" x="0px" y="0px" viewBox="0 0 100 100" width="15" height="15" style="color: #aaa"><path fill="currentColor" d="M18.8,85.1h56l0,0c2.2,0,4-1.8,4-4v-32h-8v28h-48v-48h28v-8h-32l0,0c-2.2,0-4,1.8-4,4v56C14.8,83.3,16.6,85.1,18.8,85.1z"></path> <polygon fill="currentColor" points="45.7,48.7 51.3,54.3 77.2,28.5 77.2,37.2 85.2,37.2 85.2,14.9 62.8,14.9 62.8,22.9 71.5,22.9"></polygon></svg></u>`
        description.addEventListener('click', _ => {
            shell.openPath(path)
        })
        button.innerHTML = 'CHANGE'

        button.addEventListener('click', function f() {
            ipcRenderer.send('changeTeleDir')
        })

        syncButton.style.display = ''
        queueButton.style.display = ''
        
        // Lưu đường dẫn thư mục đã chọn
        appState.selectedDir = path;

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
        updateConnectionStatus(status.connected ? 'connected' : 'disconnected');
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
    ipcRenderer.on('userInfo', (event, user) => {
        console.log("User info received:", user);
        
        if (user && user.firstName) {
            const userInfo = document.getElementById('userInfo') || (() => {
                const el = document.createElement('div');
                el.id = 'userInfo';
                el.style.marginTop = '15px';
                el.style.textAlign = 'center';
                profile.appendChild(el);
                return el;
            })();
            
            userInfo.innerHTML = `
                <div style="font-weight: bold; font-size: 16px;">${user.firstName} ${user.lastName || ''}</div>
                <div style="color: #666; font-size: 14px;">${user.phoneNumber || user.username || ''}</div>
            `;
            
            if (user.photoUrl) {
                profilePicture.src = user.photoUrl;
                profilePicture.style.display = '';
            }
            
            // Lưu số điện thoại để sử dụng lần sau
            if (user.phoneNumber) {
                localStorage.setItem('phoneNumber', user.phoneNumber);
            }
        }
    });
});
