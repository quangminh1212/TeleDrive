const { app, BrowserWindow, shell, ipcMain, dialog, Menu, Tray } = require('electron');
const path = require('path');
const { authenticate, create, updateInfo, cleanQuit, checkConnectionStatus } = require(path.join(__dirname, 'telegram-binder', 'index.js'));
const log = require('electron-log');

// Cấu hình log
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

// Auto updates - Chỉ sử dụng khi chạy trong Electron thực sự
let autoUpdater;
try {
    if (process.type === 'browser') {
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
let mainWindow;
let client;

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
            try {
                log.debug("Performing periodic connection check");
                const isConnected = await checkConnectionStatus(await mainWindow);
                (await mainWindow).webContents.send('connectionStatus', { connected: isConnected });
            } catch (error) {
                log.error("Error checking connection:", error);
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
        const isConnected = await checkConnectionStatus(await mainWindow);
        (await mainWindow).webContents.send('connectionStatus', { connected: isConnected });
    } catch (error) {
        log.error("Error checking connection:", error);
        (await mainWindow).webContents.send('connectionStatus', { connected: false });
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
