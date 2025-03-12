// Mock của module Airgram để ứng dụng có thể chạy mà không cần thư viện native
const EventEmitter = require('events');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');

class MockAirgram extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.api = {
            getAuthorizationState: async () => {
                return {
                    response: {
                        _: "authorizationStateReady"
                    }
                };
            },
            setAuthenticationPhoneNumber: async () => {
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            checkAuthenticationCode: async () => {
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            checkAuthenticationPassword: async () => {
                return {
                    response: {
                        _: "ok"
                    }
                };
            },
            getMe: async () => {
                // Tạo ảnh hồ sơ giả
                const profileImagePath = path.join(this.config.filesDirectory, 'mock-profile.png');
                if (!fs.existsSync(profileImagePath)) {
                    // Tạo file ảnh trống
                    try {
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
                
                // Giả lập việc tải file xong
                setTimeout(() => {
                    this.emit('updateFile', {
                        update: {
                            file: {
                                id: params.fileId,
                                local: {
                                    path: path.join(this.config.filesDirectory, `mock-file-${params.fileId}`),
                                    isDownloadingCompleted: true
                                },
                                remote: {
                                    id: `remote-${params.fileId}`
                                }
                            }
                        }
                    }, () => {});
                }, 500);
                
                return {
                    response: {
                        _: "file",
                        id: params.fileId,
                        local: {
                            path: path.join(this.config.filesDirectory, `mock-file-${params.fileId}`),
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
                return {
                    response: {
                        _: "message",
                        id: Math.floor(Math.random() * 10000),
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

        // Đảm bảo các thư mục tồn tại
        try {
            if (!fs.existsSync(this.config.databaseDirectory)) {
                fs.mkdirSync(this.config.databaseDirectory, { recursive: true });
            }
            if (!fs.existsSync(this.config.filesDirectory)) {
                fs.mkdirSync(this.config.filesDirectory, { recursive: true });
            }
        } catch (error) {
            log.error("[MOCK] Error creating directories:", error);
        }

        // Giả lập quá trình xác thực
        log.info("[MOCK] Simulating auth process");
        
        // Bước 1: Gửi trạng thái đợi số điện thoại
        setTimeout(() => {
            this.emit('updateAuthorizationState', {
                update: {
                    authorizationState: {
                        _: "authorizationStateWaitPhoneNumber"
                    }
                }
            }, () => {});
            
            // Bước 2: Giả lập đã nhập số điện thoại, chuyển sang đợi mã xác thực
            setTimeout(() => {
                this.emit('updateAuthorizationState', {
                    update: {
                        authorizationState: {
                            _: "authorizationStateWaitCode"
                        }
                    }
                }, () => {});
                
                // Bước 3: Giả lập đã nhập mã xác thực, chuyển sang trạng thái hoàn tất
                setTimeout(() => {
                    this.emit('updateAuthorizationState', {
                        update: {
                            authorizationState: {
                                _: "authorizationStateReady"
                            }
                        }
                    }, () => {});
                }, 500);
            }, 500);
        }, 1000);

        log.info("[MOCK] Airgram initialized with config:", config);
    }
}

module.exports = {
    Airgram: MockAirgram,
    toObject: (obj) => obj
}; 