// Mock của module Airgram để ứng dụng có thể chạy mà không cần thư viện native
const EventEmitter = require('events');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');

// Cấu hình log
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

// Trạng thái xác thực
let authState = 'initial';
let authAttempts = 0;
const MAX_AUTH_ATTEMPTS = 3;

// Lưu trữ dữ liệu đã thu thập để hiển thị và phân tích
const collectData = {
    files: {},
    messages: [],
    interactions: {},
    stats: {
        filesBackedUp: 0,
        totalSize: 0,
        lastBackup: new Date().toISOString()
    }
};

class MockAirgram extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        
        log.info("[MOCK] Constructor called with config:", JSON.stringify(config, null, 2));
        
        // Đăng ký xử lý sự kiện lỗi
        this.on('error', (err) => {
            log.error('[MOCK] Error event:', err);
        });
        
        // Log thông tin API đã cập nhật
        log.info("[MOCK] Using API credentials - ID:", config.apiId, "Hash:", config.apiHash);
        
        // Đảm bảo các thư mục tồn tại
        try {
            if (!fs.existsSync(this.config.databaseDirectory)) {
                log.info(`[MOCK] Creating database directory: ${this.config.databaseDirectory}`);
                fs.mkdirSync(this.config.databaseDirectory, { recursive: true });
            }
            if (!fs.existsSync(this.config.filesDirectory)) {
                log.info(`[MOCK] Creating files directory: ${this.config.filesDirectory}`);
                fs.mkdirSync(this.config.filesDirectory, { recursive: true });
            }
            
            // Tạo thư mục cho dữ liệu đã thu thập
            const dataDir = path.join(this.config.filesDirectory, 'collected_data');
            if (!fs.existsSync(dataDir)) {
                log.info(`[MOCK] Creating data directory: ${dataDir}`);
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Lưu dữ liệu mẫu vào thư mục
            const sampleDataPath = path.join(dataDir, 'sample_data.json');
            fs.writeFileSync(sampleDataPath, JSON.stringify(collectData, null, 2));
            log.info("[MOCK] Created sample data file at:", sampleDataPath);
        } catch (error) {
            log.error("[MOCK] Error creating directories:", error);
        }
        
        this.api = {
            getAuthorizationState: async () => {
                log.info("[MOCK] getAuthorizationState called, current state:", authState);
                
                // Trả về trạng thái xác thực hiện tại
                let stateResponse;
                switch (authState) {
                    case 'initial':
                        stateResponse = "authorizationStateWaitPhoneNumber";
                        break;
                    case 'phone_submitted':
                        stateResponse = "authorizationStateWaitCode";
                        break;
                    case 'code_submitted':
                        stateResponse = "authorizationStateWaitPassword";
                        break;
                    case 'authenticated':
                        stateResponse = "authorizationStateReady";
                        break;
                    default:
                        stateResponse = "authorizationStateWaitPhoneNumber";
                }
                
                return {
                    response: {
                        _: stateResponse
                    }
                };
            },
            setAuthenticationPhoneNumber: async (params) => {
                log.info("[MOCK] setAuthenticationPhoneNumber called with params:", params);
                
                // Cập nhật trạng thái
                authState = 'phone_submitted';
                authAttempts++;
                
                // Log mỗi lần thử
                log.info(`[MOCK] Authentication attempt ${authAttempts}/${MAX_AUTH_ATTEMPTS}`);
                
                // Emit sự kiện
                setTimeout(() => {
                    this.emit('updateAuthorizationState', {
                        update: {
                            authorizationState: {
                                _: "authorizationStateWaitCode"
                            }
                        }
                    }, () => {});
                    
                    log.info("[MOCK] Emitted authorizationStateWaitCode event");
                }, 500);
                
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            checkAuthenticationCode: async (params) => {
                log.info("[MOCK] checkAuthenticationCode called with params:", params);
                
                // Cập nhật trạng thái
                authState = 'code_submitted';
                
                // Emit sự kiện
                setTimeout(() => {
                    // Giả lập yêu cầu mật khẩu 2FA
                    this.emit('updateAuthorizationState', {
                        update: {
                            authorizationState: {
                                _: "authorizationStateWaitPassword"
                            }
                        }
                    }, () => {});
                    
                    log.info("[MOCK] Emitted authorizationStateWaitPassword event");
                }, 500);
                
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            checkAuthenticationPassword: async (params) => {
                log.info("[MOCK] checkAuthenticationPassword called with params:", params);
                
                // Cập nhật trạng thái
                authState = 'authenticated';
                
                // Emit sự kiện
                setTimeout(() => {
                    this.emit('updateAuthorizationState', {
                        update: {
                            authorizationState: {
                                _: "authorizationStateReady"
                            }
                        }
                    }, () => {});
                    
                    log.info("[MOCK] Emitted authorizationStateReady event");
                }, 500);
                
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            getMe: async () => {
                log.info("[MOCK] getMe called");
                
                // Nếu chưa xác thực, trả về lỗi
                if (authState !== 'authenticated') {
                    log.warn("[MOCK] getMe called but not authenticated");
                    return null;
                }
                
                // Tạo ảnh hồ sơ giả
                const profileImagePath = path.join(this.config.filesDirectory, 'mock-profile.png');
                if (!fs.existsSync(profileImagePath)) {
                    // Tạo file ảnh trống
                    try {
                        log.info("[MOCK] Creating mock profile image at:", profileImagePath);
                        fs.writeFileSync(profileImagePath, 'mock profile image');
                    } catch (err) {
                        log.error('[MOCK] Error creating profile image:', err);
                    }
                }

                return {
                    id: 12345678,
                    firstName: "Demo",
                    lastName: "User",
                    phoneNumber: "1234567890",
                    profilePhoto: {
                        small: {
                            local: {
                                path: profileImagePath
                            },
                            remote: {
                                id: "profile-photo-id"
                            },
                            id: "photo-id"
                        }
                    }
                };
            },
            getChats: async () => {
                log.info("[MOCK] getChats called");
                return {
                    response: {
                        _: "chats",
                        chatIds: [1234],
                        totalCount: 1
                    }
                };
            },
            downloadFile: async (params) => {
                log.info("[MOCK] Downloading file:", params.fileId);
                
                const mockFilePath = path.join(this.config.filesDirectory, `mock-file-${params.fileId}`);
                
                // Tạo file mẫu nếu nó không tồn tại
                if (!fs.existsSync(mockFilePath)) {
                    fs.writeFileSync(mockFilePath, `Mock file content for file ID: ${params.fileId}`);
                }
                
                // Giả lập việc tải file xong
                setTimeout(() => {
                    this.emit('updateFile', {
                        update: {
                            file: {
                                id: params.fileId,
                                local: {
                                    path: mockFilePath,
                                    isDownloadingCompleted: true
                                },
                                remote: {
                                    id: `remote-${params.fileId}`
                                }
                            }
                        }
                    }, () => {});
                    
                    // Cập nhật thống kê
                    collectData.stats.filesBackedUp++;
                    collectData.stats.totalSize += fs.statSync(mockFilePath).size;
                    collectData.stats.lastBackup = new Date().toISOString();
                    
                    // Lưu lại thống kê
                    const dataDir = path.join(this.config.filesDirectory, 'collected_data');
                    const statsPath = path.join(dataDir, 'stats.json');
                    fs.writeFileSync(statsPath, JSON.stringify(collectData.stats, null, 2));
                    
                }, 300);
                
                return {
                    response: {
                        _: "file",
                        id: params.fileId,
                        local: {
                            path: mockFilePath,
                            isDownloadingCompleted: true
                        },
                        remote: {
                            id: `remote-${params.fileId}`
                        }
                    }
                };
            },
            sendMessage: async (params) => {
                log.info("[MOCK] Sending message:", params);
                
                // Thêm vào danh sách tin nhắn đã thu thập
                const messageId = Math.floor(Math.random() * 10000);
                collectData.messages.push({
                    id: messageId,
                    content: params.inputMessageContent,
                    timestamp: new Date().toISOString()
                });
                
                return {
                    response: {
                        _: "message",
                        id: messageId,
                        content: params.inputMessageContent
                    }
                };
            },
            editMessageMedia: async (params) => {
                log.info("[MOCK] Editing message media:", params);
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            searchChatMessages: async (params) => {
                log.info("[MOCK] Searching chat messages:", params);
                
                // Tạo message giả
                return {
                    response: {
                        _: "messages",
                        totalCount: 1,
                        messages: [
                            {
                                id: 12345,
                                content: {
                                    _: "messageDocument",
                                    document: {
                                        document: {
                                            id: "doc-12345",
                                            remote: {
                                                id: "remote-doc-12345"
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                };
            },
            deleteFile: async (params) => {
                log.info("[MOCK] Deleting file:", params);
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            close: async () => {
                log.info("[MOCK] Airgram closed");
                return {
                    response: {
                        _: "ok"
                    }
                };
            }
        };

        // Giả lập quá trình xác thực
        log.info("[MOCK] Starting authentication simulation");
        
        // Đặt lại trạng thái xác thực
        authState = 'initial';
        
        // Bước 1: Gửi trạng thái đợi số điện thoại ngay lập tức
        setTimeout(() => {
            log.info("[MOCK] Emitting initial authorizationStateWaitPhoneNumber");
            this.emit('updateAuthorizationState', {
                update: {
                    authorizationState: {
                        _: "authorizationStateWaitPhoneNumber"
                    }
                }
            }, () => {});
        }, 100);

        log.info("[MOCK] Airgram initialized with config:", JSON.stringify(config, null, 2));
    }
}

// Xuất các hàm và biến
module.exports = {
    Airgram: MockAirgram,
    toObject: (obj) => obj,
    // Thêm hàm tiện ích để truy cập dữ liệu đã thu thập
    getCollectedData: () => collectData,
    // Thêm hàm để truy cập trạng thái xác thực
    getAuthState: () => authState,
    // Đặt lại trạng thái xác thực
    resetAuthState: () => {
        authState = 'initial';
        authAttempts = 0;
        log.info("[MOCK] Auth state reset to initial");
    }
}; 