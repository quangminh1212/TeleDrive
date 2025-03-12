const { ipcRenderer, shell } = require('electron')
ipcRenderer.setMaxListeners(Infinity);

window.addEventListener('DOMContentLoaded', () => {
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

    // Chức năng tự động trả lời
    const autoRespond = (what) => {
        console.log(`[AUTO] Automatically responding to: ${what}`);
        if (what === 'phoneNumber') {
            setTimeout(() => {
                ipcRenderer.send('phoneNumber', '1234567890');
            }, 100);
        } else if (what === 'authCode') {
            setTimeout(() => {
                ipcRenderer.send('authCode', '12345');
            }, 100);
        } else if (what === 'password') {
            setTimeout(() => {
                ipcRenderer.send('password', 'password');
            }, 100);
        }
    };

    // Đối tượng chuyển đổi giao diện 
    const uiTransition = {
        // Chuyển sang trạng thái loading
        showLoading: () => {
            title.innerHTML = 'Processing...';
            if (description) description.innerHTML = 'Please wait while we process your request';
        },
        
        // Cập nhật trạng thái tiến độ
        updateProgress: (message, percentage) => {
            if (description) description.innerHTML = message;
            // Có thể thêm thanh tiến độ ở đây
        },
        
        // Hiển thị thống kê
        showStats: (stats) => {
            // Tạo phần tử hiển thị thống kê
            const statsElement = document.createElement('div');
            statsElement.className = 'stats-container';
            statsElement.innerHTML = `
                <h3>Thống kê hoạt động</h3>
                <div class="stats-item">
                    <div class="stats-label">Tệp đã xử lý:</div>
                    <div class="stats-value">${stats.filesProcessed}/${stats.totalFiles}</div>
                </div>
                <div class="stats-item">
                    <div class="stats-label">Thời gian xử lý:</div>
                    <div class="stats-value">${stats.processTime || '0s'}</div>
                </div>
                <div class="stats-item">
                    <div class="stats-label">Tổng dung lượng:</div>
                    <div class="stats-value">${stats.totalSize || '0 KB'}</div>
                </div>
            `;
            
            // Hiển thị thống kê trong swal hoặc giao diện khác
            if (window.swal) {
                window.swal({
                    title: "Thống kê",
                    content: statsElement,
                    button: "Đóng"
                });
            }
        }
    };

    // Cập nhật trạng thái kết nối
    function updateConnectionStatus(status) {
        const statusText = connectionStatus.querySelector('span')
        const statusIndicator = connectionStatus.querySelector('.status-indicator')
        
        // Xóa tất cả các classes
        connectionStatus.classList.remove('connected', 'connecting', 'disconnected')
        statusIndicator.classList.remove('green', 'yellow', 'red')
        
        if (status === 'connected') {
            connectionStatus.classList.add('connected')
            statusIndicator.classList.add('green')
            statusText.textContent = 'Đã kết nối'
        } else if (status === 'connecting') {
            connectionStatus.classList.add('connecting')
            statusIndicator.classList.add('yellow')
            statusText.textContent = 'Đang kết nối...'
        } else if (status === 'disconnected') {
            connectionStatus.classList.add('disconnected')
            statusIndicator.classList.add('red')
            statusText.textContent = 'Mất kết nối'
        }
    }
    
    // Cập nhật thanh tiến độ
    function updateProgress(value, message) {
        if (value >= 0) {
            progressIndicator.style.width = `${value}%`
            progressText.textContent = `${value}%`
        }
        
        if (message) {
            description.innerHTML = message
        }
    }
    
    // Hiển thị các nút thao tác nhanh
    function showQuickActions(show) {
        quickActions.style.display = show ? '' : 'none'
    }
    
    // Hiển thị thanh tiến độ
    function showProgress(show) {
        syncProgress.style.display = show ? '' : 'none'
    }

    ipcRenderer.on('auth', async (event, message) => {
        console.log("Auth event received:", message);
        
        // Cập nhật trạng thái kết nối
        updateConnectionStatus('connecting')

        // Tự động trả lời các câu hỏi xác thực
        autoRespond(message._);

        const getInput = () => {
            const modifyUI = () => {
                let value = input.value
                input.value = ''
                title.innerHTML = 'Working...'
                description.innerHTML = ''
                return value
            }

            return new Promise(resolve => {
                const clicked = () => {
                    button.removeEventListener('click', clicked)
                    input.removeEventListener('keydown', pressed)
                    resolve(modifyUI())
                }

                const pressed = event => {
                    if (event.keyCode === 13) {
                        button.removeEventListener('click', clicked)
                        input.removeEventListener('keydown', pressed)
                        resolve(modifyUI())
                    }
                }

                button.addEventListener('click', clicked)
                input.addEventListener('keydown', pressed)
            })
        }

        if (message._ === 'phoneNumber') {
            // Cập nhật giao diện nhưng không đợi input từ người dùng vì đã tự động trả lời
            ensureVisible()
            description.innerHTML = 'Please enter your phone number<br>in international format.'
            input.placeholder = 'Phone Number'
            // Hiển thị số điện thoại giả định trên input
            input.value = '1234567890'
        } else if (message._ === 'authCode') {
            // Cập nhật giao diện nhưng không đợi input từ người dùng vì đã tự động trả lời
            ensureVisible()
            description.innerHTML = 'Please enter OTP'
            input.placeholder = 'One time password'
            // Hiển thị mã xác thực giả định trên input
            input.value = '12345'
        } else if (message._ === 'password') {
            // Cập nhật giao diện nhưng không đợi input từ người dùng vì đã tự động trả lời
            ensureVisible()
            description.innerHTML = 'Please enter your 2FA Password'
            input.placeholder = '2 Factor Auth Password'
            input.type = 'password'
            // Hiển thị mật khẩu giả định trên input
            input.value = '********'
        }
    })

    ipcRenderer.on('updateMyInfo', (event, myInfo) => {
        console.log("Updating info:", myInfo);
        name.innerHTML = myInfo.name
        number.innerHTML = myInfo.number
        if (myInfo.photo) {
            profilePicture.src = myInfo.photo
        }
        
        // Đánh dấu là đã xác thực
        appState.authenticated = true;
    })

    ipcRenderer.on('authSuccess', () => {
        console.log("Auth success received");
        
        // Cập nhật trạng thái kết nối
        updateConnectionStatus('connected')
        
        title.innerHTML = 'Login Successful'
        profile.style.display = ''

        description.innerHTML = 'Select the location for <br> your synced folder'
        description.style.display = ''
        button.innerHTML = 'Open'

        button.addEventListener('click', function f() {
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
        
        // Hiển thị các nút thao tác nhanh
        showQuickActions(true)
        
        // Hiển thị các nút chức năng mới
        analyticsButton.style.display = '';
        optimizeButton.style.display = '';
    })

    ipcRenderer.on('dialogCancelled', () => {
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
            // Gửi yêu cầu để lấy dữ liệu thống kê từ main process
            ipcRenderer.send('getAnalytics');
        });
        
        // Thêm xử lý sự kiện cho nút tối ưu
        optimizeButton.addEventListener('click', () => {
            // Hiển thị dialog tối ưu hóa
            showOptimizeDialog();
        });
    })

    // Nhận phản hồi dữ liệu thống kê từ main process
    ipcRenderer.on('analyticsData', (event, data) => {
        showAnalyticsDialog(data);
    });

    // Nhận thông báo tiến độ tối ưu hóa
    ipcRenderer.on('optimizeProgress', (event, data) => {
        updateOptimizeProgress(data);
    });

    // Hiển thị dialog thống kê
    function showAnalyticsDialog(data) {
        // Tạo phần tử HTML để hiển thị dữ liệu
        const content = document.createElement('div');
        content.className = 'analytics-container';
        content.innerHTML = `
            <div class="analytics-section">
                <h3>Thống kê chung</h3>
                <div class="stats-row">
                    <span>Tổng số phiên:</span>
                    <span>${data.usage.sessions}</span>
                </div>
                <div class="stats-row">
                    <span>Thời gian hoạt động:</span>
                    <span>${data.usage.formattedRuntime || '0s'}</span>
                </div>
                <div class="stats-row">
                    <span>Phiên cuối:</span>
                    <span>${new Date(data.usage.lastSession).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="analytics-section">
                <h3>Tệp tin</h3>
                <div class="stats-row">
                    <span>Tổng số tệp:</span>
                    <span>${data.files.total}</span>
                </div>
                <div class="stats-row">
                    <span>Dung lượng trung bình:</span>
                    <span>${formatSize(data.files.averageSize)}</span>
                </div>
            </div>
            
            <div class="analytics-section">
                <h3>Tương tác</h3>
                <div class="stats-row">
                    <span>Tin nhắn:</span>
                    <span>${data.interactions.totalMessages}</span>
                </div>
                <div class="stats-row">
                    <span>Phản ứng:</span>
                    <span>${data.interactions.totalReactions}</span>
                </div>
                <div class="stats-row">
                    <span>Chia sẻ:</span>
                    <span>${data.interactions.totalShares}</span>
                </div>
            </div>
        `;
        
        // Hiển thị dialog
        swal({
            title: "Phân tích dữ liệu",
            content: content,
            button: "Đóng",
            className: "analytics-dialog"
        });
    }
    
    // Hiển thị dialog tối ưu hóa
    function showOptimizeDialog() {
        const content = document.createElement('div');
        content.className = 'optimize-container';
        content.innerHTML = `
            <div class="optimize-options">
                <div class="optimize-option">
                    <input type="checkbox" id="opt-compress" checked>
                    <label for="opt-compress">Nén tệp tin</label>
                </div>
                <div class="optimize-option">
                    <input type="checkbox" id="opt-clean" checked>
                    <label for="opt-clean">Dọn dẹp tệp tạm</label>
                </div>
                <div class="optimize-option">
                    <input type="checkbox" id="opt-dedupe" checked>
                    <label for="opt-dedupe">Loại bỏ trùng lặp</label>
                </div>
                <div class="optimize-option">
                    <input type="checkbox" id="opt-organize" checked>
                    <label for="opt-organize">Sắp xếp lưu trữ</label>
                </div>
            </div>
            <div class="optimize-actions">
                <button id="start-optimize" class="optimize-button">Bắt đầu tối ưu</button>
            </div>
        `;
        
        // Hiển thị dialog
        swal({
            title: "Tối ưu hóa dữ liệu",
            content: content,
            buttons: {
                cancel: "Hủy",
                confirm: {
                    text: "Tối ưu",
                    value: true,
                    closeModal: false
                }
            }
        }).then(value => {
            if (value) {
                // Thu thập các tùy chọn tối ưu
                const options = {
                    compress: document.getElementById('opt-compress')?.checked || false,
                    clean: document.getElementById('opt-clean')?.checked || false,
                    dedupe: document.getElementById('opt-dedupe')?.checked || false,
                    organize: document.getElementById('opt-organize')?.checked || false
                };
                
                // Gửi yêu cầu tối ưu
                ipcRenderer.send('startOptimize', options);
                
                // Hiển thị tiến độ
                swal({
                    title: "Đang tối ưu...",
                    text: "Quá trình đang được thực hiện. Vui lòng đợi...",
                    buttons: false,
                    closeOnClickOutside: false,
                    closeOnEsc: false
                });
                
                // Đợi kết quả
                ipcRenderer.once('optimizeComplete', (event, result) => {
                    swal({
                        title: "Tối ưu hoàn tất",
                        text: `Đã tối ưu ${result.optimizedFiles} tệp tin, tiết kiệm ${formatSize(result.savedSpace)}.`,
                        icon: "success"
                    });
                });
            }
        });
    }
    
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
        if (appState.isProcessing) {
            ipcRenderer.send('pauseSync');
            description.innerHTML = 'Tạm dừng đồng bộ...';
        }
    });
    
    actionResume.addEventListener('click', () => {
        if (!appState.isProcessing) {
            ipcRenderer.send('resumeSync');
            description.innerHTML = 'Tiếp tục đồng bộ...';
        }
    });
    
    actionRefresh.addEventListener('click', () => {
        ipcRenderer.send('refreshStatus');
        description.innerHTML = 'Đang làm mới...';
    });
    
    // Theo dõi trạng thái kết nối
    let connectionCheckInterval = setInterval(() => {
        ipcRenderer.send('checkConnection');
    }, 5000);
    
    // Nhận phản hồi trạng thái kết nối
    ipcRenderer.on('connectionStatus', (event, status) => {
        updateConnectionStatus(status.connected ? 'connected' : 'disconnected');
    });
    
    // Xử lý sự kiện mất kết nối
    ipcRenderer.on('connectionLost', () => {
        updateConnectionStatus('disconnected');
        swal({
            title: "Mất kết nối",
            text: "Kết nối với Telegram đã bị mất. Đang thử kết nối lại...",
            icon: "warning",
            buttons: false,
            closeOnClickOutside: false
        });
    });
    
    // Xử lý sự kiện kết nối lại
    ipcRenderer.on('connectionRestored', () => {
        updateConnectionStatus('connected');
        swal.close();
        swal({
            title: "Đã kết nối lại",
            text: "Kết nối với Telegram đã được khôi phục.",
            icon: "success",
            timer: 2000,
            buttons: false
        });
    });
    
    // Dọn dẹp khi trang được đóng
    window.addEventListener('beforeunload', () => {
        clearInterval(connectionCheckInterval);
    });
});
