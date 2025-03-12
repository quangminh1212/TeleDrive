// Module xử lý phân tích dữ liệu 
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

// Cấu trúc dữ liệu phân tích
const analytics = {
    // Thông kê về sử dụng
    usage: {
        startTime: new Date(),
        sessions: 0,
        totalRuntime: 0,
        lastSession: null
    },
    
    // Thông tin về các tệp
    files: {
        total: 0,
        byType: {},
        sizes: []
    },
    
    // Thông tin về tương tác
    interactions: {
        totalMessages: 0,
        comments: [],
        shares: [],
        reactions: []
    },
    
    // Thông tin thu thập
    collections: {
        posts: [],
        media: [],
        links: []
    }
};

// Khởi tạo phiên phân tích
function initAnalytics(appDataPath) {
    try {
        const analyticsPath = path.join(appDataPath, 'analytics.json');
        
        // Kiểm tra nếu file đã tồn tại
        if (fs.existsSync(analyticsPath)) {
            const data = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
            Object.assign(analytics, data);
        }
        
        // Cập nhật thông tin phiên
        analytics.usage.sessions++;
        analytics.usage.lastSession = new Date();
        
        // Lưu dữ liệu
        saveAnalytics(appDataPath);
        
        log.info('[ANALYTICS] Initialized analytics module');
        return true;
    } catch (error) {
        log.error('[ANALYTICS] Error initializing analytics:', error);
        return false;
    }
}

// Lưu dữ liệu phân tích
function saveAnalytics(appDataPath) {
    try {
        const analyticsPath = path.join(appDataPath, 'analytics.json');
        fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2));
        log.info('[ANALYTICS] Saved analytics data');
        return true;
    } catch (error) {
        log.error('[ANALYTICS] Error saving analytics:', error);
        return false;
    }
}

// Thêm thông tin về tệp
function addFile(fileInfo) {
    try {
        const fileType = fileInfo.type || path.extname(fileInfo.path);
        
        // Tăng số lượng tệp
        analytics.files.total++;
        
        // Phân loại theo loại tệp
        if (!analytics.files.byType[fileType]) {
            analytics.files.byType[fileType] = 0;
        }
        analytics.files.byType[fileType]++;
        
        // Thêm kích thước vào danh sách
        if (fileInfo.size) {
            analytics.files.sizes.push(fileInfo.size);
        }
        
        return true;
    } catch (error) {
        log.error('[ANALYTICS] Error adding file:', error);
        return false;
    }
}

// Thêm thông tin về bài đăng
function addPost(postInfo) {
    try {
        analytics.collections.posts.push({
            id: postInfo.id || `post_${analytics.collections.posts.length + 1}`,
            content: postInfo.content,
            url: postInfo.url,
            timestamp: postInfo.timestamp || new Date(),
            interactions: postInfo.interactions || {}
        });
        
        // Cập nhật thống kê tương tác
        if (postInfo.interactions) {
            if (postInfo.interactions.comments) {
                analytics.interactions.comments.push(...postInfo.interactions.comments);
                analytics.interactions.totalMessages += postInfo.interactions.comments.length;
            }
            
            if (postInfo.interactions.shares) {
                analytics.interactions.shares.push(...postInfo.interactions.shares);
            }
            
            if (postInfo.interactions.reactions) {
                analytics.interactions.reactions.push(...postInfo.interactions.reactions);
            }
        }
        
        return true;
    } catch (error) {
        log.error('[ANALYTICS] Error adding post:', error);
        return false;
    }
}

// Thêm thông tin về media
function addMedia(mediaInfo) {
    try {
        analytics.collections.media.push({
            id: mediaInfo.id || `media_${analytics.collections.media.length + 1}`,
            type: mediaInfo.type,
            url: mediaInfo.url,
            source: mediaInfo.source,
            timestamp: mediaInfo.timestamp || new Date()
        });
        
        return true;
    } catch (error) {
        log.error('[ANALYTICS] Error adding media:', error);
        return false;
    }
}

// Tạo báo cáo tổng quan
function generateSummary() {
    try {
        const now = new Date();
        const runtime = (now - analytics.usage.startTime) / 1000; // Thời gian chạy tính bằng giây
        
        analytics.usage.totalRuntime += runtime;
        
        return {
            sessions: analytics.usage.sessions,
            runtime: {
                current: runtime,
                total: analytics.usage.totalRuntime,
                formatted: formatTime(analytics.usage.totalRuntime)
            },
            files: {
                total: analytics.files.total,
                topTypes: getTopFileTypes(3),
                averageSize: getAverageFileSize()
            },
            interactions: {
                totalMessages: analytics.interactions.totalMessages,
                totalReactions: analytics.interactions.reactions.length,
                totalShares: analytics.interactions.shares.length
            },
            collections: {
                posts: analytics.collections.posts.length,
                media: analytics.collections.media.length,
                links: analytics.collections.links.length
            }
        };
    } catch (error) {
        log.error('[ANALYTICS] Error generating summary:', error);
        return {};
    }
}

// Helper: Lấy các loại tệp phổ biến nhất
function getTopFileTypes(count = 3) {
    const types = Object.entries(analytics.files.byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([type, count]) => ({ type, count }));
    
    return types;
}

// Helper: Tính kích thước trung bình của tệp
function getAverageFileSize() {
    if (analytics.files.sizes.length === 0) return 0;
    
    const total = analytics.files.sizes.reduce((sum, size) => sum + size, 0);
    return Math.round(total / analytics.files.sizes.length);
}

// Helper: Định dạng thời gian
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours}h ${minutes}m ${secs}s`;
}

// Xuất các hàm
module.exports = {
    init: initAnalytics,
    save: saveAnalytics,
    addFile,
    addPost,
    addMedia,
    generateSummary,
    getAnalytics: () => analytics
}; 