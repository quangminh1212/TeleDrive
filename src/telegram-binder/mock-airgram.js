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
    interactions: {
        likes: 0,
        comments: 0,
        shares: 0
    },
    stats: {
        filesBackedUp: 0,
        totalSize: 0,
        lastBackup: new Date().toISOString()
    }
};

// Tạo dữ liệu mẫu phong phú hơn
function generateSampleData() {
    // Tạo dữ liệu bài viết mẫu
    const posts = [
        {
            id: 'post1',
            content: 'This is sample post 1 with full content',
            author: 'User A',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            likes: 15,
            comments: [
                { id: 'cmt1', author: 'User B', content: 'Sample comment 1', timestamp: new Date(Date.now() - 3000000).toISOString() },
                { id: 'cmt2', author: 'User C', content: 'Sample comment 2', timestamp: new Date(Date.now() - 2000000).toISOString() }
            ],
            shares: 5,
            url: 'https://example.com/post1'
        },
        {
            id: 'post2',
            content: 'This is sample post 2 with full content and some other information',
            author: 'User D',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            likes: 25,
            comments: [
                { id: 'cmt3', author: 'User E', content: 'Sample comment 3', timestamp: new Date(Date.now() - 6000000).toISOString() },
                { id: 'cmt4', author: 'User F', content: 'Sample comment 4', timestamp: new Date(Date.now() - 5000000).toISOString() }
            ],
            shares: 10,
            url: 'https://example.com/post2'
        }
    ];
    
    // Thêm vào dữ liệu thu thập
    collectData.messages = posts;
    collectData.interactions = {
        likes: posts.reduce((sum, post) => sum + post.likes, 0),
        comments: posts.reduce((sum, post) => sum + post.comments.length, 0),
        shares: posts.reduce((sum, post) => sum + post.shares, 0)
    };
    
    return collectData;
}

class MockAirgram extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        
        log.info("[MOCK] Simulating auth process");
        log.info("[MOCK] Airgram initialized with config:", JSON.stringify(config, null, 2));
        
        // Đăng ký xử lý sự kiện lỗi
        this.on('error', (err) => {
            log.error('[MOCK] Error event:', err);
        });
        
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
            
            // Tạo và lưu dữ liệu mẫu phong phú
            const sampleData = generateSampleData();
            const sampleDataPath = path.join(dataDir, 'sample_data.json');
            fs.writeFileSync(sampleDataPath, JSON.stringify(sampleData, null, 2));
            log.info("[MOCK] Created sample data file at:", sampleDataPath);
        } catch (error) {
            log.error("[MOCK] Error creating directories:", error);
        }
        
        this.api = {
            getAuthorizationState: async () => {
                log.info("[MOCK] getAuthorizationState called");
                
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
                
                // Emit sự kiện
                setTimeout(() => {
                    this.emit('updateAuthorizationState', {
                        update: {
                            authorizationState: {
                                _: "authorizationStateWaitCode"
                            }
                        }
                    }, () => {});
                    
                    log.info("[MOCK] Emitting authorizationStateWaitCode");
                }, 100);
                
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
                    this.emit('updateAuthorizationState', {
                        update: {
                            authorizationState: {
                                _: "authorizationStateWaitPassword"
                            }
                        }
                    }, () => {});
                    
                    log.info("[MOCK] Emitting authorizationStateWaitPassword");
                }, 100);
                
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
                    
                    log.info("[MOCK] Authentication process completed, state: authorizationStateReady");
                }, 100);
                
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            getMe: async () => {
                log.info("[MOCK] getMe called");
                
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
                        chatIds: [1234, 5678, 9012],
                        totalCount: 3
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
                        totalCount: collectData.messages.length,
                        messages: collectData.messages.map((msg, index) => ({
                            id: msg.id || index + 1,
                            content: {
                                _: "messageText",
                                text: {
                                    text: msg.content
                                }
                            },
                            date: new Date(msg.timestamp || Date.now()).getTime() / 1000
                        }))
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
        setTimeout(() => {
            // Bước 1: Gửi trạng thái đợi số điện thoại
            this.emit('updateAuthorizationState', {
                update: {
                    authorizationState: {
                        _: "authorizationStateWaitPhoneNumber"
                    }
                }
            }, () => {});
            
            log.info("[MOCK] Emitting authorizationStateWaitPhoneNumber");
        }, 100);
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