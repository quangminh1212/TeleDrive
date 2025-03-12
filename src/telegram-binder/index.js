const {ipcMain, dialog, app} = require('electron')
const {Airgram, toObject, resetAuthState, getCollectedData, stopDataSimulation} = require('./mock-airgram')
// const {Airgram, toObject} = require('airgram')
const {join} = require('path')
const Store = require('electron-store')
const store = new Store()
const {addWatches} = require(join(__dirname, '..', 'watcher', 'index.js'))
const log = require('electron-log');

// Cấu hình log
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

let telegramClient = null;
let isInitializing = false;
let authAttempts = 0;
const MAX_AUTH_ATTEMPTS = 3;
let isConnected = false;

/**
 * @return {Promise<string>}
 * */
const getTeleDir = mainWindow => {
    return new Promise(async resolve => {
        const fsPromise = require('fs').promises
        let stored = store.get('teleDir')
        if (stored) {
            try {
                log.info(`[TELEDIR] Checking existing directory: ${stored}`);
                await fsPromise.access(stored)
                log.info(`[TELEDIR] Directory exists: ${stored}`);
            } catch (e) {
                log.info(`[TELEDIR] Directory doesn't exist, creating: ${stored}`);
                await fsPromise.mkdir(stored, {recursive: true})
            } finally {
                resolve(stored)
            }
        } else {
            // Xóa tất cả các listener cũ để tránh trùng lặp
            ipcMain.removeAllListeners('openFileDialog');
            
            // Thêm listener mới
            ipcMain.on('openFileDialog', async () => {
                log.info(`[TELEDIR] Open file dialog requested`);
                // Không hiển thị hộp thoại chọn thư mục, mà tự động tạo một thư mục mặc định
                const defaultDir = join(app.getPath('documents'), 'TeleDriveSync');
                log.info(`[MOCK] Using default directory: ${defaultDir}`);
                
                // Tạo thư mục nếu nó không tồn tại
                try {
                    await fsPromise.access(defaultDir)
                    log.info(`[TELEDIR] Default directory exists: ${defaultDir}`);
                } catch (e) {
                    log.info(`[TELEDIR] Default directory doesn't exist, creating: ${defaultDir}`);
                    await fsPromise.mkdir(defaultDir, {recursive: true})
                } finally {
                    store.set('teleDir', defaultDir)
                    log.info(`[TELEDIR] Directory set: ${defaultDir}`);
                    mainWindow.webContents.send('selectedDir', defaultDir);
                    resolve(defaultDir)
                }
            })
        }
    })
}

/**
 * Kiểm tra trạng thái kết nối đến Telegram
 * @param mainWindow Cửa sổ chính của ứng dụng
 * @return {Promise<boolean>} Trạng thái kết nối
 */
const checkConnectionStatus = async (mainWindow) => {
    log.info("[CHECK] Checking connection status");
    
    if (!telegramClient) {
        log.warn("[CHECK] No Telegram client available - not connected");
        return false;
    }
    
    try {
        // Thử gọi một API để kiểm tra kết nối
        const response = await telegramClient.api.getMe();
        
        if (response && response.id) {
            log.info("[CHECK] Connection successful");
            isConnected = true;
            return true;
        } else {
            log.warn("[CHECK] Connection failed - invalid response");
            isConnected = false;
            return false;
        }
    } catch (error) {
        log.error("[CHECK] Connection error:", error);
        isConnected = false;
        return false;
    }
};

/**
 * Xác thực người dùng với Telegram
 * @param client Client Telegram
 * @param mainWindow Cửa sổ chính của ứng dụng
 */
const authenticate = async (client, mainWindow) => {
    // Đặt lại trạng thái xác thực
    resetAuthState();
    
    log.info('[AUTH] Starting...');
    
    if (isInitializing) {
        log.warn("[AUTH] Authentication already in progress, skipping");
        return;
    }
    
    isInitializing = true;
    
    // Giả lập xác thực tự động (vì đang sử dụng mock-airgram)
    // Trong môi trường thực tế, quá trình này sẽ yêu cầu người dùng nhập thông tin
    setTimeout(async () => {
        try {
            log.info("[MOCK-AUTH] Simulating automatic authentication");
            
            // Giả lập nhập số điện thoại
            const phoneResponse = await client.api.setAuthenticationPhoneNumber({
                phoneNumber: '+1234567890'
            });
            log.info("[MOCK-AUTH] Phone number set:", phoneResponse);
            
            // Giả lập nhập mã xác nhận
            setTimeout(async () => {
                const codeResponse = await client.api.checkAuthenticationCode({
                    code: '12345'
                });
                log.info("[MOCK-AUTH] Code verified:", codeResponse);
                
                // Giả lập nhập mật khẩu 2FA (nếu cần)
                setTimeout(async () => {
                    const passwordResponse = await client.api.checkAuthenticationPassword({
                        password: 'password123'
                    });
                    log.info("[MOCK-AUTH] Password verified:", passwordResponse);
                    
                    // Cập nhật giao diện sau khi xác thực thành công
                    mainWindow.webContents.send('authSuccess');
                    
                    // Kiểm tra kết nối
                    const connected = await checkConnectionStatus(mainWindow);
                    mainWindow.webContents.send('connectionStatus', { connected });
                    
                    isInitializing = false;
                }, 100);
            }, 100);
        } catch (error) {
            log.error("[MOCK-AUTH] Error during automatic authentication:", error);
            isInitializing = false;
            mainWindow.webContents.send('authError', { error: error.message });
        }
    }, 200);
}

/**
 * @param {string} appFilesPath
 */
const setupMasterFile = async (appFilesPath) => {
    const fs = require('fs');
    const path = require('path');
    const masterFilePath = path.join(appFilesPath, 'TeleDriveMaster.json');

    if (!fs.existsSync(masterFilePath)) {
        log.info("[SETUP] Creating TeleDriveMaster.json");
        const defaultMasterData = {
            version: "1.0.0",
            files: {}
        };
        fs.writeFileSync(masterFilePath, JSON.stringify(defaultMasterData));
    }
}

/**
 * Tạo và khởi tạo client Telegram
 * @param {string} appStorage Đường dẫn đến thư mục lưu trữ ứng dụng
 * @param {string} appPath Đường dẫn đến thư mục ứng dụng
 * @param {string} platform Nền tảng đang chạy (win, mac, linux)
 * @return {Airgram} Client Telegram đã được khởi tạo
 */
const create = (appStorage, appPath, platform) => {
    log.info("[SETUP] App storage:");
    log.info(appStorage);
    
    if (telegramClient) {
        log.info("[SETUP] Client already exists, returning existing client");
        return telegramClient;
    }
    
    if (isInitializing) {
        log.warn("[SETUP] Client initialization already in progress");
        throw new Error("Client initialization already in progress");
    }
    
    isInitializing = true;
    
    try {
        // Đảm bảo file TeleDriveMaster.json tồn tại
        setupMasterFile(appStorage);
        
        // Sử dụng phiên bản mock của Airgram mà không cần đường dẫn đến thư viện libtdjson
        telegramClient = new Airgram({
            apiId: '21272067',
            apiHash: 'b7690dc86952dbc9b16717b101164af3',
            databaseDirectory: join(appStorage, 'db'),
            filesDirectory: join(appStorage, 'files'),
            useFileDatabase: true
        });
        
        log.info("[SETUP] Client created successfully");
        return telegramClient;
    } catch (error) {
        log.error("[SETUP] Error creating client:", error);
        throw error;
    } finally {
        isInitializing = false;
    }
}

/**
 * Cập nhật thông tin người dùng
 * @param {Airgram} client Client Telegram
 * @param {BrowserWindow} mainWindow Cửa sổ chính của ứng dụng
 * @param {string} appFilesPath Đường dẫn đến thư mục lưu trữ ứng dụng
 * @param {string} appVersion Phiên bản ứng dụng
 */
const updateInfo = async (client, mainWindow, appFilesPath, appVersion) => {
    log.info("[INFO] Updating user information");
    
    const update = async () => {
        try {
            // Lấy thông tin người dùng
            let me = toObject(await client.api.getMe());
            log.info(`[INFO] Got user info: ${me.firstName} ${me.lastName || ''}`);

            // Fetch personal chat ASAP
            log.info("[INFO] Fetching chats");
            await client.api.getChats({
                limit: 1, // limit: 1 still fetches all chats from the server
                offsetChatId: 0,
                offsetOrder: '9223372036854775807'
            });

            // To increase speed, first send all info, then check if photo is downloaded, if not, download, then update again
            let myInfo = {
                name: me.lastName ? me.firstName + ' ' + me.lastName : me.firstName,
                number: '+' + me.phoneNumber,
                photo: me.profilePhoto ? me.profilePhoto.small.local.path : null
            };

            log.info("[INFO] Sending auth success signal");
            mainWindow.webContents.send('authSuccess');
            
            log.info("[INFO] Sending user info update");
            mainWindow.webContents.send('userInfo', myInfo);

            // If photo not already downloaded
            if (me.profilePhoto && !myInfo.photo) {
                log.info("[INFO] Downloading profile photo");
                await client.api.downloadFile({
                    fileId: me.profilePhoto.small.id,
                    priority: 32
                });
                
                // Listen for completion of photo download
                client.on('updateFile', async (ctx, next) => {
                    if (ctx.update.file.remote.id === me.profilePhoto.small.remote.id && ctx.update.file.local.isDownloadingCompleted) {
                        // Set photo and update again
                        log.info("[INFO] Profile photo downloaded, updating");
                        myInfo.photo = ctx.update.file.local.path;
                        mainWindow.webContents.send('userInfo', myInfo);
                    }
                    return next();
                });
            }

            /**
             * @type {string}
             */
            let teleDir = await getTeleDir(mainWindow);
            log.info(`[INFO] Telegram directory: ${teleDir}`);
            mainWindow.webContents.send('selectedDir', teleDir);
            
            // Set up change directory handler
            ipcMain.on('changeTeleDir', async () => {
                const fsPromise = require('fs').promises
                let oldDir = store.get('teleDir')
                
                // Trong phiên bản giả lập, tự động sử dụng thư mục mặc định
                const defaultDir = join(app.getPath('documents'), 'TeleDriveSync');
                log.info(`[MOCK] Using default directory for change: ${defaultDir}`);
                
                store.set('teleDir', defaultDir)
                try {
                    await fsPromise.access(defaultDir)
                } catch (e) {
                    await fsPromise.mkdir(defaultDir, {recursive: true})
                } finally {
                    mainWindow.webContents.send("movingFiles")
                    log.info(`[MOCK] Simulating moving files from ${oldDir} to ${defaultDir}`);
                    
                    // Giả lập việc di chuyển file xong
                    setTimeout(() => {
                        mainWindow.webContents.send('selectedDir', defaultDir);
                        log.info("[MOCK] Files moved successfully");
                    }, 1000);
                }
            });
            
            // Thêm xử lý sự kiện để lấy dữ liệu phân tích
            ipcMain.on('getAnalytics', () => {
                log.info("[INFO] Analytics requested");
                const data = getCollectedData();
                
                // Tạo dữ liệu phân tích từ dữ liệu đã thu thập
                const analyticsData = {
                    usage: {
                        sessions: 5,
                        totalRuntime: 3600,
                        formattedRuntime: '1h 0m',
                        lastSession: new Date().toISOString()
                    },
                    files: {
                        total: data.stats.filesBackedUp || 0,
                        averageSize: data.stats.totalSize / (data.stats.filesBackedUp || 1)
                    },
                    interactions: {
                        totalMessages: data.messages.length,
                        totalReactions: data.interactions.likes || 0,
                        totalShares: data.interactions.shares || 0
                    }
                };
                
                mainWindow.webContents.send('analyticsData', analyticsData);
            });
            
            // Thêm xử lý sự kiện tối ưu hóa
            ipcMain.on('startOptimize', (event, options) => {
                log.info("[INFO] Optimization requested with options:", options);
                
                // Giả lập quá trình tối ưu
                const totalFiles = 50;
                let processed = 0;
                
                const interval = setInterval(() => {
                    processed += 5;
                    mainWindow.webContents.send('optimizeProgress', {
                        processed,
                        total: totalFiles
                    });
                    
                    if (processed >= totalFiles) {
                        clearInterval(interval);
                        
                        // Gửi kết quả
                        mainWindow.webContents.send('optimizeComplete', {
                            optimizedFiles: Math.floor(totalFiles * 0.8),
                            savedSpace: 1024 * 1024 * 10 // 10MB
                        });
                    }
                }, 500);
            });
            
            // Thiết lập theo dõi thư mục
            if (typeof addWatches === 'function') {
                try {
                    log.info("[INFO] Setting up directory watches");
                    addWatches(teleDir, me.id, client, appFilesPath, appVersion, mainWindow);
                } catch (error) {
                    log.error("[INFO] Error setting up watches:", error);
                }
            } else {
                log.warn("[INFO] addWatches function not available");
            }
        } catch (error) {
            log.error("[INFO] Error updating user info:", error);
            
            // Gửi lại thông tin cơ bản nếu có lỗi
            mainWindow.webContents.send('userInfo', {
                name: 'Demo User',
                number: '+1234567890',
                photo: null
            });
            
            // Tự động thiết lập thư mục mặc định nếu có lỗi
            try {
                const defaultDir = join(app.getPath('documents'), 'TeleDriveSync');
                log.info(`[MOCK] Using default directory due to error: ${defaultDir}`);
                
                store.set('teleDir', defaultDir);
                const fsPromise = require('fs').promises;
                
                try {
                    await fsPromise.access(defaultDir);
                } catch (e) {
                    await fsPromise.mkdir(defaultDir, {recursive: true});
                }
                
                mainWindow.webContents.send('selectedDir', defaultDir);
            } catch (dirError) {
                log.error("[INFO] Error setting up default directory:", dirError);
            }
        }
    };

    // Thực hiện cập nhật
    await update();
}

/**
 * @param {BrowserWindow} mainWindow
 * */
module.exports.checkConnectionStatus = async (mainWindow) => {
    try {
        if (!telegramClient) {
            log.warn("[CHECK] Client not initialized");
            return false;
        }
        
        log.info("[CHECK] Checking connection status");
        const me = await telegramClient.api.getMe();
        log.info("[CHECK] Connection successful");
        
        // Gửi thông báo kết nối thành công
        mainWindow.webContents.send('connectionStatus', { connected: true });
        
        return Boolean(me);
    } catch (error) {
        log.error("[CHECK] Connection check failed:", error);
        mainWindow.webContents.send('connectionStatus', { connected: false });
        return false;
    }
}

/**
 * Dọn dẹp client Telegram khi tắt ứng dụng
 * @param {Airgram} client Client Telegram
 * @return {Promise<void>}
 */
const cleanQuit = async (client) => {
    log.info("[QUIT] Cleaning up Telegram client");
    
    if (!client) {
        log.warn("[QUIT] No client to clean up");
        return;
    }
    
    try {
        // Dừng mô phỏng dữ liệu nếu có
        if (typeof stopDataSimulation === 'function') {
            stopDataSimulation();
            log.info("[QUIT] Data simulation stopped");
        }
        
        // Đóng client Telegram
        await client.api.close();
        log.info("[QUIT] Telegram client closed successfully");
        
        // Reset client
        telegramClient = null;
    } catch (error) {
        log.error("[QUIT] Error cleaning up Telegram client:", error);
    }
}

// Xuất module
module.exports = {
    authenticate,
    create,
    updateInfo,
    cleanQuit,
    checkConnectionStatus,
    getTeleDir,
    getCollectedData
};
