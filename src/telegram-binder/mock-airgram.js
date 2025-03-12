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
    
    // Thêm dữ liệu tệp tin mẫu
    const sampleFiles = {
        'document1.pdf': {
            id: 'doc1',
            name: 'document1.pdf',
            size: 1024 * 1024 * 2.5, // 2.5MB
            mimeType: 'application/pdf',
            uploadDate: new Date(Date.now() - 5400000).toISOString(),
            lastModified: new Date(Date.now() - 4800000).toISOString(),
            path: '/Documents/TeleDriveSync/document1.pdf',
            isBackedUp: true
        },
        'image1.jpg': {
            id: 'img1',
            name: 'image1.jpg',
            size: 1024 * 512, // 512KB
            mimeType: 'image/jpeg',
            uploadDate: new Date(Date.now() - 3600000).toISOString(),
            lastModified: new Date(Date.now() - 3600000).toISOString(),
            path: '/Documents/TeleDriveSync/Photos/image1.jpg',
            isBackedUp: true
        },
        'spreadsheet.xlsx': {
            id: 'xl1',
            name: 'spreadsheet.xlsx',
            size: 1024 * 1024 * 1.2, // 1.2MB
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            uploadDate: new Date(Date.now() - 7200000).toISOString(),
            lastModified: new Date(Date.now() - 7200000).toISOString(),
            path: '/Documents/TeleDriveSync/Work/spreadsheet.xlsx',
            isBackedUp: true
        }
    };
    
    // Thêm vào dữ liệu thu thập
    collectData.messages = posts;
    collectData.files = sampleFiles;
    collectData.interactions = {
        likes: posts.reduce((sum, post) => sum + post.likes, 0),
        comments: posts.reduce((sum, post) => sum + post.comments.length, 0),
        shares: posts.reduce((sum, post) => sum + post.shares, 0)
    };
    collectData.stats = {
        filesBackedUp: Object.keys(sampleFiles).length,
        totalSize: Object.values(sampleFiles).reduce((sum, file) => sum + file.size, 0),
        lastBackup: new Date().toISOString(),
        syncStartTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        syncEndTime: new Date(Date.now() - 86390000).toISOString(),   // 10 min later
        averageSpeed: 1024 * 1024 * 5 // 5MB/s
    };
    
    return collectData;
}

// Giả lập việc thêm dữ liệu theo thời gian thực
let simulationInterval = null;

// Bắt đầu mô phỏng dữ liệu theo thời gian thực
function startDataSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
    
    simulationInterval = setInterval(() => {
        // Thêm file mới ngẫu nhiên
        if (Math.random() > 0.7) {
            const fileId = `file-${Date.now()}`;
            const fileName = `file-${Math.floor(Math.random() * 1000)}.${['pdf', 'jpg', 'docx', 'xlsx'][Math.floor(Math.random() * 4)]}`;
            const fileSize = Math.floor(Math.random() * 1024 * 1024 * 5); // 0-5MB
            
            collectData.files[fileName] = {
                id: fileId,
                name: fileName,
                size: fileSize,
                mimeType: getMimeType(fileName),
                uploadDate: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                path: `/Documents/TeleDriveSync/${fileName}`,
                isBackedUp: true
            };
            
            collectData.stats.filesBackedUp++;
            collectData.stats.totalSize += fileSize;
            collectData.stats.lastBackup = new Date().toISOString();
        }
        
        // Thêm tương tác mới
        if (Math.random() > 0.8) {
            if (collectData.messages.length > 0) {
                const randomPostIndex = Math.floor(Math.random() * collectData.messages.length);
                const randomPost = collectData.messages[randomPostIndex];
                
                if (Math.random() > 0.5) {
                    // Thêm like
                    randomPost.likes++;
                    collectData.interactions.likes++;
                } else {
                    // Thêm bình luận
                    const commentId = `cmt-${Date.now()}`;
                    const comment = {
                        id: commentId,
                        author: `User ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
                        content: `New comment ${Math.floor(Math.random() * 100)}`,
                        timestamp: new Date().toISOString()
                    };
                    
                    randomPost.comments.push(comment);
                    collectData.interactions.comments++;
                }
            }
        }
    }, 30000); // Cập nhật mỗi 30 giây
}

// Dừng mô phỏng dữ liệu
function stopDataSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

// Lấy MIME type từ phần mở rộng của tệp
function getMimeType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'txt': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'zip': 'application/zip'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
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
            
            // Bắt đầu mô phỏng dữ liệu theo thời gian thực
            startDataSimulation();
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
    },
    // Thêm hàm để bắt đầu/dừng mô phỏng dữ liệu
    startDataSimulation,
    stopDataSimulation
}; 