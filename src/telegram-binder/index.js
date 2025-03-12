const {ipcMain, dialog, app} = require('electron')
const {Airgram, toObject, resetAuthState} = require('./mock-airgram')
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
 * @param {Airgram} client
 * @param {BrowserWindow} mainWindow
 * */
module.exports.authenticate = async (client, mainWindow) => {
    log.info("[AUTH] Starting authentication process");
    
    // Đặt lại trạng thái xác thực
    resetAuthState();
    authAttempts = 0;
    
    // Đảm bảo client đã được khởi tạo
    if (!client) {
        log.error("[AUTH] Authentication failed: client is not initialized");
        mainWindow.webContents.send('error', {
            message: 'Không thể xác thực: Client Telegram chưa được khởi tạo'
        });
        return;
    }

    // Lưu trữ client để sử dụng sau này
    telegramClient = client;

    client.on('updateAuthorizationState', async (ctx, next) => {
        log.info(`[AUTH] Received auth state update: ${ctx.update.authorizationState._}`);
        
        if (ctx.update.authorizationState._ === "authorizationStateWaitPhoneNumber") {
            let attempt = async isRetry => {
                log.info(`[AUTH] Requesting phone number${isRetry ? ' (retry)' : ''}`);
                const phoneNumber = await get('phoneNumber', isRetry);
                log.info(`[AUTH] Received phone number: ${phoneNumber.substring(0, 2)}****`);
                
                return await client.api.setAuthenticationPhoneNumber({
                    phoneNumber: phoneNumber,
                    settings: {
                        allowFlashCall: false,
                        isCurrentPhoneNumber: false,
                        allowSmsRetrieverApi: false
                    }
                });
            }

            let correct = false;
            authAttempts = 0;

            try {
                let response = await attempt(false);
                log.info(`[AUTH] Phone number response: ${response.response._}`);
                if (response.response._ === "ok") {
                    correct = true;
                }
            } catch (error) {
                log.error(`[AUTH] Error setting phone number: ${error.message}`);
                mainWindow.webContents.send('error', {
                    message: `Lỗi khi nhập số điện thoại: ${error.message}`
                });
            }

            while (!correct && authAttempts < MAX_AUTH_ATTEMPTS) {
                authAttempts++;
                log.info(`[AUTH] Phone number attempt ${authAttempts}/${MAX_AUTH_ATTEMPTS}`);
                
                try {
                    let response = await attempt(true);
                    if (response.response._ === "ok") {
                        correct = true;
                    }
                } catch (error) {
                    log.error(`[AUTH] Error setting phone number (retry): ${error.message}`);
                    if (authAttempts >= MAX_AUTH_ATTEMPTS) {
                        mainWindow.webContents.send('error', {
                            message: `Đã vượt quá số lần thử với số điện thoại. Vui lòng thử lại sau.`
                        });
                        break;
                    }
                }
            }
        } else if (ctx.update.authorizationState._ === "authorizationStateWaitCode") {
            let attempt = async isRetry => {
                log.info(`[AUTH] Requesting auth code${isRetry ? ' (retry)' : ''}`);
                const code = await get('authCode', isRetry);
                log.info(`[AUTH] Received auth code: ****`);
                
                return await client.api.checkAuthenticationCode({
                    code: code,
                });
            }

            let correct = false;
            authAttempts = 0;

            try {
                let response = await attempt(false);
                log.info(`[AUTH] Auth code response: ${response.response._}`);
                if (response.response._ === "ok") {
                    correct = true;
                }
            } catch (error) {
                log.error(`[AUTH] Error checking auth code: ${error.message}`);
                mainWindow.webContents.send('error', {
                    message: `Lỗi khi nhập mã xác thực: ${error.message}`
                });
            }

            while (!correct && authAttempts < MAX_AUTH_ATTEMPTS) {
                authAttempts++;
                log.info(`[AUTH] Auth code attempt ${authAttempts}/${MAX_AUTH_ATTEMPTS}`);
                
                try {
                    let response = await attempt(true);
                    if (response.response._ === "ok") {
                        correct = true;
                    }
                } catch (error) {
                    log.error(`[AUTH] Error checking auth code (retry): ${error.message}`);
                    if (authAttempts >= MAX_AUTH_ATTEMPTS) {
                        mainWindow.webContents.send('error', {
                            message: `Đã vượt quá số lần thử với mã xác thực. Vui lòng thử lại sau.`
                        });
                        break;
                    }
                }
            }
        } else if (ctx.update.authorizationState._ === "authorizationStateWaitPassword") {
            let attempt = async isRetry => {
                log.info(`[AUTH] Requesting password${isRetry ? ' (retry)' : ''}`);
                const password = await get('password', isRetry);
                log.info(`[AUTH] Received password: ****`);
                
                return await client.api.checkAuthenticationPassword({
                    password: password,
                });
            }

            let correct = false;
            authAttempts = 0;

            try {
                let response = await attempt(false);
                log.info(`[AUTH] Password response: ${response.response._}`);
                if (response.response._ === "ok") {
                    correct = true;
                }
            } catch (error) {
                log.error(`[AUTH] Error checking password: ${error.message}`);
                mainWindow.webContents.send('error', {
                    message: `Lỗi khi nhập mật khẩu: ${error.message}`
                });
            }

            while (!correct && authAttempts < MAX_AUTH_ATTEMPTS) {
                authAttempts++;
                log.info(`[AUTH] Password attempt ${authAttempts}/${MAX_AUTH_ATTEMPTS}`);
                
                try {
                    let response = await attempt(true);
                    if (response.response._ === "ok") {
                        correct = true;
                    }
                } catch (error) {
                    log.error(`[AUTH] Error checking password (retry): ${error.message}`);
                    if (authAttempts >= MAX_AUTH_ATTEMPTS) {
                        mainWindow.webContents.send('error', {
                            message: `Đã vượt quá số lần thử với mật khẩu. Vui lòng thử lại sau.`
                        });
                        break;
                    }
                }
            }
        } else if (ctx.update.authorizationState._ === "authorizationStateReady") {
            log.info("[AUTH] Authentication state ready");
            // Không thực hiện gì ở đây, updateInfo sẽ xử lý sau khi nhận được trạng thái này
        }
        return next();
    });

    /**
     * @param {String} what
     * @param {boolean} isRetry
     * @returns {Promise<{String}>}
     */
    const get = async (what, isRetry) => {
        log.info("[AUTH] Prompting for " + what);
        mainWindow.webContents.send('auth', {_: what, isRetry: isRetry});

        return new Promise(resolve => {
            ipcMain.on(what, function listen (event, message) {
                log.info(`[AUTH] Received ${what}: ${what === 'password' ? '****' : (what === 'phoneNumber' ? message.substring(0, 2) + '****' : '****')}`);
                resolve(message);
                ipcMain.removeListener(what, listen);
            });
        });
    }
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
 * @param {string} appStorage
 * @param {string} appPath
 * @param {string} OS
 * */
module.exports.create = (appStorage, appPath, OS) => {
    log.info("[SETUP] App storage:");
    log.info(appStorage);
    
    if (isInitializing) {
        log.warn("[SETUP] Client initialization already in progress");
        return telegramClient;
    }
    
    if (telegramClient) {
        log.info("[SETUP] Reusing existing client");
        return telegramClient;
    }
    
    // Đánh dấu đang khởi tạo
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
 * @ param {Airgram} client
 * @ param {BrowserWindow} mainWindow
 * */
module.exports.updateInfo = async (client, mainWindow, appFilesPath, appVersion) => {
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
            mainWindow.webContents.send('updateMyInfo', myInfo);

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
                        mainWindow.webContents.send('updateMyInfo', myInfo);
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
                let response = await dialog.showOpenDialog({properties: ['openDirectory']})
                if (!response.canceled) {
                    let teleDir = join(response.filePaths[0], 'TeleDriveSync');
                    store.set('teleDir', teleDir)
                    try {
                        await fsPromise.access(teleDir)
                    } catch (e) {
                        await fsPromise.mkdir(teleDir, {recursive: true})
                    } finally {
                        (mainWindow).webContents.send("movingFiles")
                        const { ncp } = require('ncp')
                        const fsPromise = require('fs').promises
                        ncp(oldDir, teleDir, async err => {
                            if (err) {
                                return console.error(err)
                            }
                            await fsPromise.rmdir(oldDir, { recursive: true });
                            (mainWindow).webContents.send("restarting")
                            setTimeout(_ => {
                                app.relaunch()
                                app.quit()
                            }, 5000)
                        })
                    }
                }
            });
            
            addWatches(teleDir, me.id, client, appFilesPath, appVersion, mainWindow)
        } catch (error) {
            log.error("[INFO] Error updating user info:", error);
            mainWindow.webContents.send('error', {
                message: 'Lỗi khi cập nhật thông tin người dùng: ' + error.message
            });
        }
    }

    // Thực hiện update
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
        return Boolean(me);
    } catch (error) {
        log.error("[CHECK] Connection check failed:", error);
        mainWindow.webContents.send('error', {
            message: 'Lỗi khi kiểm tra kết nối: ' + error.message
        });
        return false;
    }
}

/**
 * @param {Airgram} client
 * */
module.exports.cleanQuit = async (client) => {
    log.info("[QUIT] Cleaning up");
    
    if (client) {
        try {
            log.info("[QUIT] Closing client");
            await client.api.close();
            log.info("[QUIT] Client closed successfully");
        } catch (error) {
            log.error("[QUIT] Error closing client:", error);
        }
    }
}
