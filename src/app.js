const { app, BrowserWindow, shell, ipcMain, dialog, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const { authenticate, create, updateInfo, cleanQuit, checkConnectionStatus } = require(path.join(__dirname, 'telegram-binder', 'index.js'));
const log = require('electron-log');

// Kiểm tra môi trường chạy
const isRunningInElectron = process.type === 'browser';

// Cấu hình log
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

// Auto updates - Chỉ sử dụng khi chạy trong Electron thực sự
let autoUpdater;
try {
    if (isRunningInElectron) {
        const { autoUpdater: updater } = require("electron-updater");
        autoUpdater = updater;
        if (app.isPackaged) {
            log.info("App is packaged, checking for updates");
            autoUpdater.checkForUpdatesAndNotify();
        } else {
            log.info("Skip checkForUpdatesAndNotify because application is not packed");
        }
    } else {
        log.info("Not running in Electron browser process, skipping auto-updater");
    }
} catch (error) {
    log.error("Error initializing auto-updater:", error);
}

// Biến theo dõi trạng thái
let isAppQuitting = false;
let connectionCheckInterval = null;
let reconnectInterval = null;
let connectionRetryCount = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let lastConnectionStatus = false;
let mainWindow;
let client;

// Kiểm tra kết nối và tự động thử lại khi mất kết nối
async function checkAndHandleConnection(showNotification = true) {
    try {
        log.debug("Checking connection status");
        const window = await mainWindow;
        const isConnected = await checkConnectionStatus(window);
        
        // Cập nhật trạng thái kết nối
        window.webContents.send('connectionStatus', { connected: isConnected });
        
        // Xử lý thay đổi trạng thái kết nối
        if (isConnected !== lastConnectionStatus) {
            log.info(`Connection status changed: ${lastConnectionStatus} -> ${isConnected}`);
            
            if (isConnected) {
                // Kết nối đã được khôi phục
                log.info("Connection restored");
                connectionRetryCount = 0;
                
                // Dừng quá trình thử lại kết nối
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
                
                // Thông báo cho người dùng
                if (showNotification) {
                    window.webContents.send('notification', {
                        type: 'success',
                        message: 'Kết nối đã được khôi phục'
                    });
                }
                
                // Đồng bộ hóa lại dữ liệu nếu cần
                window.webContents.send('syncStatus', { canSync: true });
            } else {
                // Mất kết nối
                log.warn("Connection lost, scheduling reconnection attempts");
                
                // Thông báo cho người dùng
                if (showNotification) {
                    window.webContents.send('notification', {
                        type: 'error',
                        message: 'Mất kết nối đến Telegram'
                    });
                }
                
                // Tắt tính năng đồng bộ
                window.webContents.send('syncStatus', { canSync: false });
                
                // Bắt đầu thử lại kết nối
                if (!reconnectInterval) {
                    startReconnectionAttempts();
                }
            }
            
            lastConnectionStatus = isConnected;
        }
        
        return isConnected;
    } catch (error) {
        log.error("Error in checkAndHandleConnection:", error);
        return false;
    }
}

// Bắt đầu quá trình thử lại kết nối
function startReconnectionAttempts() {
    log.info("Starting reconnection attempts");
    connectionRetryCount = 0;
    
    // Dừng interval hiện tại nếu có
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
    }
    
    // Tạo interval mới để thử lại kết nối
    reconnectInterval = setInterval(async () => {
        if (connectionRetryCount >= MAX_RECONNECT_ATTEMPTS) {
            log.warn(`Reached maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}), stopping automatic reconnection`);
            clearInterval(reconnectInterval);
            reconnectInterval = null;
            
            // Thông báo cho người dùng
            const window = await mainWindow;
            window.webContents.send('notification', {
                type: 'warning',
                message: 'Không thể tự động khôi phục kết nối. Vui lòng thử lại thủ công.'
            });
            
            return;
        }
        
        connectionRetryCount++;
        log.info(`Reconnection attempt ${connectionRetryCount}/${MAX_RECONNECT_ATTEMPTS}`);
        
        // Thông báo đang thử kết nối lại
        const window = await mainWindow;
        window.webContents.send('connectionStatus', { connected: false, reconnecting: true });
        
        // Thử kết nối lại
        const isConnected = await checkAndHandleConnection(false);
        
        if (isConnected) {
            log.info("Reconnection successful");
            clearInterval(reconnectInterval);
            reconnectInterval = null;
            
            // Thông báo kết nối thành công
            window.webContents.send('notification', {
                type: 'success',
                message: `Kết nối thành công sau ${connectionRetryCount} lần thử.`
            });
        } else {
            log.warn(`Reconnection attempt ${connectionRetryCount} failed`);
        }
    }, 10000); // Thử lại sau mỗi 10 giây
}

// Nếu không chạy trong Electron, export các hàm cần thiết và thoát
if (!isRunningInElectron) {
    log.info("Not running in Electron environment, exporting functions only");
    
    // Tạo dữ liệu mẫu khi chạy từ Node.js
    const createSampleData = () => {
        const targetDir = path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Roaming', 'TeleDrive', 'files', 'collected_data');
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const sampleData = {
            files: {},
            messages: [
                {
                    id: '12345',
                    content: 'Đây là tin nhắn mẫu để kiểm tra',
                    author: 'Người dùng mẫu',
                    timestamp: Date.now(),
                    likes: 15,
                    comments: []
                },
                {
                    id: '67890',
                    content: 'Tin nhắn mẫu thứ hai với nhiều tương tác hơn',
                    author: 'Người dùng khác',
                    timestamp: Date.now() - 3600000, // 1 giờ trước
                    likes: 42,
                    comments: [
                        { author: 'Người bình luận', content: 'Đây là bình luận mẫu' }
                    ]
                }
            ],
            interactions: {
                likes: 57,
                comments: 1,
                shares: 5
            },
            stats: {
                filesBackedUp: 42,
                totalSize: 1024 * 1024 * 256, // 256MB
                lastBackup: Date.now()
            }
        };
        
        const sampleFilePath = path.join(targetDir, 'sample_data.json');
        fs.writeFileSync(sampleFilePath, JSON.stringify(sampleData, null, 2), 'utf-8');
        console.log(`Sample data created at: ${sampleFilePath}`);
    };
    
    // Chạy tạo dữ liệu mẫu
    createSampleData();
    
    module.exports = {
        // Export các hàm cần thiết để sử dụng từ Node.js
        createSampleData
    };
} else {
    // Chỉ chạy phần này nếu đang trong môi trường Electron
    const createWindow = async () => {
        log.info("Creating main window");
        mainWindow = new Promise(async resolve => {
            let window = new BrowserWindow({
                width: 400,
                height: 650,
                minWidth: 400,
                minHeight: 600,
                titleBarStyle: 'hiddenInset',
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false // Cần thiết cho IPC
                }
            });

            window.removeMenu();

            try {
                log.info("Loading window HTML file");
                await window.loadFile(path.join(__dirname, 'window', 'index.html'));
                log.info("Window HTML loaded successfully");
            } catch (error) {
                log.error("Error loading window HTML:", error);
            }

            // Bật DevTools trong môi trường phát triển
            if (process.env.NODE_ENV === 'development') {
                window.webContents.openDevTools();
                log.info("DevTools opened (development mode)");
            }

            window.webContents.on('new-window', function (event, url) {
                log.info("Intercepting new window request:", url);
                event.preventDefault();
                shell.openExternal(url);
            });

            window.on('close', (event) => {
                if (isAppQuitting) {
                    log.info("Window closing (app quitting)");
                    window = null;
                    app.quit();
                } else {
                    log.info("Window closing (minimizing to tray)");
                    event.preventDefault();
                    window.hide();
                }
            });

            window.on('ready-to-show', () => {
                log.info("Window ready to show");
            });

            resolve(window);
        });
    };

    let tray;
    app.on('ready', async () => {
        log.info("App ready event triggered");

        try {
            // Tạo biểu tượng khay hệ thống
            let trayIconPath;
            if (process.platform === 'darwin') {
                trayIconPath = path.join(app.getAppPath(), 'icon', 'trayTemplate.png');
            } else if (process.platform === 'win32') {
                trayIconPath = path.join(app.getAppPath(), 'icon', 'tray.ico');
            } else {
                trayIconPath = path.join(app.getAppPath(), 'icon', 'tray.png');
            }

            log.info(`Creating tray icon from: ${trayIconPath}`);
            tray = new Tray(trayIconPath);

            const contextMenu = Menu.buildFromTemplate([
                { label: 'Show', click: async _ => { (await mainWindow).show(); } },
                { label: 'Quit', click: () => { 
                    isAppQuitting = true;
                    app.quit(); 
                }}
            ]);

            contextMenu.items[1].checked = false;
            tray.setToolTip('TeleDrive');
            tray.setContextMenu(contextMenu);

            if (process.platform !== "darwin") {
                tray.on('click', async _ => {
                    log.info("Tray icon clicked, showing window");
                    (await mainWindow).show();
                });
            }

            // Khởi tạo cửa sổ
            await createWindow();
            log.info("Main window created");

            // Khởi tạo client Telegram
            const osMap = {
                "Linux": "linux",
                "Windows_NT": "win",
                "Darwin": "mac"
            };
            try {
                log.info("Creating Telegram client");
                client = create(app.getPath('userData'), app.getAppPath(), osMap[require('os').type()]);
                log.info("Telegram client created");
            } catch (error) {
                log.error("Error creating Telegram client:", error);
                (await mainWindow).webContents.send('error', {
                    message: 'Lỗi khởi tạo client Telegram: ' + error.message
                });
            }

            // Xác thực và cập nhật thông tin
            try {
                log.info("Starting authentication process");
                authenticate(client, await mainWindow);
                
                log.info("Updating user information");
                updateInfo(client, await mainWindow, app.getPath('userData'), app.getVersion());
            } catch (error) {
                log.error("Error during authentication/update:", error);
                (await mainWindow).webContents.send('error', {
                    message: 'Lỗi trong quá trình xác thực: ' + error.message
                });
            }

            // Thiết lập kiểm tra kết nối định kỳ
            connectionCheckInterval = setInterval(async () => {
                if (!isAppQuitting) {
                    await checkAndHandleConnection();
                }
            }, 60000); // Kiểm tra mỗi phút

            app.on('activate', async () => {
                log.info("App activated, showing window");
                (await mainWindow).show();
            });

        } catch (error) {
            log.error("Error during app initialization:", error);
        }
    });

    // Xử lý sự kiện kiểm tra kết nối từ renderer process
    ipcMain.on('checkConnection', async (event) => {
        try {
            log.info("Checking connection on demand");
            await checkAndHandleConnection();
        } catch (error) {
            log.error("Error checking connection:", error);
            (await mainWindow).webContents.send('connectionStatus', { connected: false });
        }
    });

    // Xử lý sự kiện thử kết nối lại từ renderer process
    ipcMain.on('reconnect', async (event) => {
        try {
            log.info("Manual reconnection requested");
            
            // Cập nhật UI để hiển thị đang kết nối lại
            const window = await mainWindow;
            window.webContents.send('connectionStatus', { connected: false, reconnecting: true });
            
            // Thử kết nối lại Telegram client
            if (client) {
                const isConnected = await checkAndHandleConnection();
                
                if (!isConnected && connectionRetryCount === 0) {
                    // Bắt đầu quá trình thử lại tự động
                    startReconnectionAttempts();
                }
            } else {
                log.warn("Cannot reconnect - client is not initialized");
                window.webContents.send('notification', {
                    type: 'error',
                    message: 'Không thể kết nối lại - client chưa được khởi tạo'
                });
            }
        } catch (error) {
            log.error("Error during manual reconnection:", error);
            (await mainWindow).webContents.send('notification', {
                type: 'error',
                message: 'Lỗi khi thử kết nối lại: ' + error.message
            });
        }
    });

    app.on('window-all-closed', _ => {
        log.info("All windows closed");
    }); // Prevent default

    app.on('before-quit', async _ => {
        log.info("App before-quit event triggered");
        // We need to finish the queue, flush the tdlib ram, and make the window close instead of hide
        isAppQuitting = true;
        
        try {
            // Dừng kiểm tra kết nối
            if (connectionCheckInterval) {
                clearInterval(connectionCheckInterval);
                log.info("Connection check interval cleared");
            }
            
            // Hiển thị thông báo đang thoát
            try {
                const window = await mainWindow;
                window.show();
                window.webContents.send('quit');
                log.info("Quit signal sent to renderer");
            } catch (error) {
                log.error("Error sending quit signal:", error);
            }
            
            // Đóng client Telegram
            try {
                log.info("Cleaning up Telegram client");
                await cleanQuit(client);
                log.info("Telegram client cleaned up");
            } catch (error) {
                log.error("Error cleaning up Telegram client:", error);
            }
            
            log.info("App shutdown complete");
        } catch (error) {
            log.error("Error during app shutdown:", error);
        }
    });
}
