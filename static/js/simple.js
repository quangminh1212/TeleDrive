/**
 * TeleDrive - Simple ES5 JavaScript
 */

// Global variables
var teleDrive = {
    sessions: [],
    currentSession: null,
    files: [],
    currentFilter: 'all'
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('TeleDrive initializing...');
    loadSessions();
    bindEvents();
});

// Load sessions from API
function loadSessions() {
    console.log('Loading sessions...');
    showLoading();
    
    fetch('/api/scans')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(function(result) {
            console.log('Sessions loaded:', result);
            // API returns array directly, not {success: true, sessions: [...]}
            if (Array.isArray(result)) {
                teleDrive.sessions = result;
                displaySessions();
            } else if (result.success) {
                teleDrive.sessions = result.sessions;
                displaySessions();
            } else {
                showError('Không thể tải danh sách sessions: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(function(error) {
            console.error('Error loading sessions:', error);
            showError('Không thể tải danh sách sessions');
        })
        .finally(function() {
            hideLoading();
        });
}

// Display sessions in sidebar
function displaySessions() {
    var container = document.getElementById('sessionsList');
    if (!container) {
        console.error('Sessions container not found');
        return;
    }

    if (teleDrive.sessions.length === 0) {
        container.innerHTML = 
            '<div class="no-sessions">' +
                '<i class="icon icon-cloud"></i>' +
                '<p>Chưa có session nào</p>' +
            '</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < teleDrive.sessions.length; i++) {
        var session = teleDrive.sessions[i];
        html += 
            '<div class="session-item" data-session-id="' + session.session_id + '">' +
                '<div class="session-info">' +
                    '<div class="session-name">' + session.session_id + '</div>' +
                    '<div class="session-stats">' + session.file_count + ' files</div>' +
                '</div>' +
            '</div>';
    }
    container.innerHTML = html;

    // Bind click events
    var sessionItems = container.querySelectorAll('.session-item');
    for (var i = 0; i < sessionItems.length; i++) {
        sessionItems[i].addEventListener('click', function() {
            var sessionId = this.dataset.sessionId;
            loadSession(sessionId);
        });
    }
}

// Load specific session
function loadSession(sessionId) {
    console.log('Loading session:', sessionId);
    showLoading();
    teleDrive.currentSession = sessionId;

    // Update active session
    var sessionItems = document.querySelectorAll('.session-item');
    for (var i = 0; i < sessionItems.length; i++) {
        sessionItems[i].classList.remove('active');
    }
    var activeSession = document.querySelector('[data-session-id="' + sessionId + '"]');
    if (activeSession) {
        activeSession.classList.add('active');
    }

    // Find the session data (files are already included in the session)
    var session = null;
    for (var i = 0; i < teleDrive.sessions.length; i++) {
        if (teleDrive.sessions[i].session_id === sessionId) {
            session = teleDrive.sessions[i];
            break;
        }
    }

    if (session && session.files) {
        console.log('Session files loaded from cache:', session.files.length, 'files');
        teleDrive.files = session.files;
        displayFiles(session.files);
        hideLoading();
    } else {
        showError('Không thể tìm thấy session hoặc files');
        hideLoading();
    }
}

// Display files in main area
function displayFiles(files) {
    var welcomeScreen = document.getElementById('welcomeScreen');
    var filesContainer = document.getElementById('filesContainer');
    var filesGrid = document.getElementById('filesGrid');

    if (!filesContainer || !filesGrid) {
        console.error('Files container or grid not found');
        return;
    }

    if (!files || files.length === 0) {
        // Show welcome screen, hide files container
        if (welcomeScreen) welcomeScreen.style.display = 'block';
        filesContainer.style.display = 'none';
        return;
    }

    // Hide welcome screen, show files container
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    filesContainer.style.display = 'block';

    // Generate files HTML
    var html = '';
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        html += createFileCard(file);
    }

    filesGrid.innerHTML = html;
    bindFileEvents();
}

// Create HTML for file card
function createFileCard(file) {
    var fileSize = formatFileSize(file.file_info ? file.file_info.size : 0);
    var fileDate = formatDate(file.file_info ? file.file_info.upload_date : new Date().toISOString());
    var fileType = file.file_info ? file.file_info.type : 'document';
    var fileIcon = getFileIcon(fileType);
    var messageId = file.message_info ? file.message_info.message_id : 0;

    return '<div class="file-card" data-file-id="' + messageId + '">' +
            '<div class="file-icon ' + fileType + '">' +
                '<i class="icon ' + fileIcon + '"></i>' +
            '</div>' +
            '<div class="file-info">' +
                '<div class="file-name" title="' + file.file_name + '">' + file.file_name + '</div>' +
                '<div class="file-meta">' + fileSize + ' • ' + fileDate + '</div>' +
            '</div>' +
            '<div class="file-actions">' +
                '<button class="file-btn" data-action="info">' +
                    '<i class="icon icon-info"></i>' +
                    'Chi tiết' +
                '</button>' +
                '<button class="file-btn" data-action="view">' +
                    '<i class="icon icon-eye"></i>' +
                    'Xem' +
                '</button>' +
            '</div>' +
        '</div>';
}

// Get icon for file type
function getFileIcon(fileType) {
    var icons = {
        'document': 'icon-file-alt',
        'photo': 'icon-image',
        'image': 'icon-image',
        'video': 'icon-video',
        'audio': 'icon-audio',
        'voice': 'icon-microphone',
        'archive': 'icon-archive',
        'code': 'icon-code',
        'sticker': 'icon-smile'
    };
    return icons[fileType] || 'icon-file';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
function formatDate(dateString) {
    var date = new Date(dateString);
    var now = new Date();
    var diffTime = Math.abs(now - date);
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return diffDays + ' ngày trước';
    return date.toLocaleDateString('vi-VN');
}

// Bind events
function bindEvents() {
    // Search functionality
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchFiles(e.target.value);
        });
    }
    
    // Refresh button
    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadSessions();
        });
    }
}

// Bind file events
function bindFileEvents() {
    var fileBtns = document.querySelectorAll('.file-btn');
    for (var i = 0; i < fileBtns.length; i++) {
        fileBtns[i].addEventListener('click', function(e) {
            e.stopPropagation();
            var action = this.dataset.action;
            var fileCard = this.closest('.file-card');
            var fileId = fileCard.dataset.fileId;
            handleFileAction(action, fileId);
        });
    }
}

// Handle file actions
function handleFileAction(action, fileId) {
    console.log('File action:', action, fileId);
    // Implementation for file actions
}

// Search files
function searchFiles(query) {
    if (!query.trim()) {
        displayFiles(teleDrive.files);
        return;
    }
    
    var filteredFiles = [];
    for (var i = 0; i < teleDrive.files.length; i++) {
        var file = teleDrive.files[i];
        if (file.file_name.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
            filteredFiles.push(file);
        }
    }
    displayFiles(filteredFiles);
}

// Show loading
function showLoading() {
    var container = document.getElementById('filesContainer');
    if (container) {
        container.innerHTML = 
            '<div class="loading-screen">' +
                '<i class="icon icon-spinner"></i>' +
                '<p>Đang tải...</p>' +
            '</div>';
    }
}

// Hide loading
function hideLoading() {
    // Loading will be hidden when content is displayed
}

// Show error
function showError(message) {
    console.error(message);
    var container = document.getElementById('filesContainer');
    if (container) {
        container.innerHTML = 
            '<div class="error-screen">' +
                '<i class="icon icon-times"></i>' +
                '<p>' + message + '</p>' +
            '</div>';
    }
}

// Show success
function showSuccess(message) {
    console.log(message);
}
