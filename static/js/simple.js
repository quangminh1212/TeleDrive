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

    // Check if we're in demo mode
    var isDemoMode = window.location.pathname === '/demo';

    if (isDemoMode) {
        // Use mock data for demo mode
        var mockSessions = [
            {
                'session_id': 'demo_session_001',
                'session_name': 'Demo Telegram Scan',
                'created_at': '2025-01-20T10:30:00Z',
                'total_files': 1247,
                'total_size': 2847392857,
                'total_chats': 15,
                'file_count': 1247,
                'timestamp': '2025-01-20T10:30:00Z'
            },
            {
                'session_id': 'demo_session_002',
                'session_name': 'Demo Media Files',
                'created_at': '2025-01-19T15:45:00Z',
                'total_files': 856,
                'total_size': 1923847562,
                'total_chats': 8,
                'file_count': 856,
                'timestamp': '2025-01-19T15:45:00Z'
            }
        ];

        hideLoading();
        displaySessions(mockSessions);
        return;
    }

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

    // Load files from API instead of cache
    var isDemoMode = window.location.pathname === '/demo';

    if (isDemoMode) {
        // Use mock data for demo mode
        var mockData = {
            'success': true,
            'files': [
                {
                    'message_id': 1001,
                    'file_name': 'demo_document.pdf',
                    'file_size': 2048576,
                    'file_info': {
                        'size': 2048576,
                        'type': 'document',
                        'upload_date': '2025-01-20T10:30:00Z'
                    },
                    'message_info': {
                        'message_id': 1001,
                        'date': '2025-01-20T10:30:00Z'
                    },
                    'download_url': '/api/demo/download/1001'
                },
                {
                    'message_id': 1002,
                    'file_name': 'demo_image.jpg',
                    'file_size': 1024768,
                    'file_info': {
                        'size': 1024768,
                        'type': 'photo',
                        'upload_date': '2025-01-20T09:15:00Z'
                    },
                    'message_info': {
                        'message_id': 1002,
                        'date': '2025-01-20T09:15:00Z'
                    },
                    'download_url': '/api/demo/download/1002'
                },
                {
                    'message_id': 1003,
                    'file_name': 'demo_video.mp4',
                    'file_size': 15728640,
                    'file_info': {
                        'size': 15728640,
                        'type': 'video',
                        'upload_date': '2025-01-19T16:45:00Z'
                    },
                    'message_info': {
                        'message_id': 1003,
                        'date': '2025-01-19T16:45:00Z'
                    },
                    'download_url': '/api/demo/download/1003'
                }
            ],
            'scan_info': {
                'session_id': sessionId,
                'total_files': 3,
                'scan_date': '2025-01-20T10:30:00Z'
            }
        };

        console.log('Session files loaded from mock data:', mockData.files.length, 'files');
        displayFiles(mockData.files, mockData.scan_info);
        return;
    }

    fetch('/api/files/' + sessionId)
        .then(function(response) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            if (data && data.files) {
                console.log('Session files loaded from API:', data.files.length, 'files');
                teleDrive.files = data.files;
                displayFiles(data.files);

                // Update session info if available
                if (data.scan_info) {
                    updateSessionInfo(data.scan_info);
                }
            } else {
                showError('Không có files trong session này');
            }
            hideLoading();
        })
        .catch(function(error) {
            console.error('Error loading session files:', error);
            showError('Không thể tải files: ' + error.message);
            hideLoading();
        });
}

// Display files in main area
function displayFiles(files) {
    var welcomeScreen = document.getElementById('welcomeScreen');
    var filesContainer = document.getElementById('filesContainer');

    if (!filesContainer) {
        console.error('Files container not found');
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
    var html = '<div class="files-grid">';
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        html += createFileCard(file);
    }
    html += '</div>';

    // Set the HTML directly to filesContainer
    filesContainer.innerHTML = html;
    bindFileEvents();
    updateStatusBar();
}

// Create HTML for file card
function createFileCard(file) {
    var fileSize = formatFileSize(file.file_info ? file.file_info.size : 0);
    var fileDate = formatDate(file.file_info ? file.file_info.upload_date : new Date().toISOString());
    var fileType = file.file_info ? file.file_info.type : 'document';
    var fileIcon = getFileIcon(fileType, file.file_name);
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
function getFileIcon(fileType, fileName) {
    // Check file extension for more specific icons
    if (fileName) {
        var ext = fileName.toLowerCase().split('.').pop();
        var extIcons = {
            'pdf': 'pdf',
            'doc': 'word',
            'docx': 'word',
            'xls': 'excel',
            'xlsx': 'excel',
            'ppt': 'powerpoint',
            'pptx': 'powerpoint',
            'zip': 'archive',
            'rar': 'archive',
            '7z': 'archive',
            'tar': 'archive',
            'gz': 'archive',
            'js': 'code',
            'html': 'code',
            'css': 'code',
            'py': 'code',
            'java': 'code',
            'cpp': 'code',
            'c': 'code',
            'php': 'code',
            'txt': 'text',
            'exe': 'executable',
            'msi': 'executable',
            'mp3': 'audio',
            'wav': 'audio',
            'flac': 'audio',
            'mp4': 'video',
            'avi': 'video',
            'mkv': 'video',
            'mov': 'video',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'gif': 'image',
            'bmp': 'image',
            'svg': 'image'
        };

        if (extIcons[ext]) {
            return extIcons[ext];
        }
    }

    // Fallback to file type
    var icons = {
        'document': 'file',
        'photo': 'image',
        'image': 'image',
        'video': 'video',
        'audio': 'audio',
        'voice': 'audio',
        'archive': 'archive',
        'code': 'code',
        'sticker': 'image'
    };
    return icons[fileType] || 'file';
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

    // New Scan button
    var newScanBtn = document.getElementById('newScanBtn');
    if (newScanBtn) {
        newScanBtn.addEventListener('click', function() {
            startNewScan();
        });
    }

    // Refresh files button
    var refreshFilesBtn = document.getElementById('refreshFiles');
    if (refreshFilesBtn) {
        refreshFilesBtn.addEventListener('click', function() {
            if (teleDrive.currentSession) {
                loadFiles(teleDrive.currentSession);
            }
        });
    }

    // View toggle buttons
    var viewBtns = document.querySelectorAll('[data-view]');
    for (var i = 0; i < viewBtns.length; i++) {
        viewBtns[i].addEventListener('click', function() {
            toggleView(this.dataset.view);
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

// Start new scan
function startNewScan() {
    if (confirm('Bạn có muốn tạo phiên quét mới không? Điều này sẽ quét lại toàn bộ Telegram của bạn.')) {
        showLoading();
        fetch('/api/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            if (result.success) {
                showSuccess('Đã bắt đầu quét mới! Vui lòng đợi...');
                setTimeout(function() {
                    loadSessions();
                }, 2000);
            } else {
                showError('Không thể bắt đầu quét: ' + (result.error || 'Unknown error'));
            }
        })
        .catch(function(error) {
            console.error('Error starting scan:', error);
            showError('Không thể bắt đầu quét mới');
        })
        .finally(function() {
            hideLoading();
        });
    }
}

// Toggle view mode
function toggleView(viewMode) {
    var viewBtns = document.querySelectorAll('[data-view]');
    for (var i = 0; i < viewBtns.length; i++) {
        viewBtns[i].classList.remove('active');
    }

    var activeBtn = document.querySelector('[data-view="' + viewMode + '"]');
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    var filesGrid = document.querySelector('.files-grid');
    if (filesGrid) {
        if (viewMode === 'list') {
            filesGrid.classList.add('list-view');
        } else {
            filesGrid.classList.remove('list-view');
        }
    }
}

// Update status bar
function updateStatusBar() {
    var itemCount = document.getElementById('itemCount');
    var selectedCount = document.getElementById('selectedCount');
    var totalSize = document.getElementById('totalSize');
    var sessionInfo = document.getElementById('sessionInfo');

    if (itemCount) {
        itemCount.textContent = teleDrive.files.length + ' mục';
    }

    if (selectedCount) {
        var selected = document.querySelectorAll('.file-card.selected').length;
        selectedCount.textContent = selected + ' đã chọn';
    }

    if (totalSize && teleDrive.files.length > 0) {
        var total = 0;
        for (var i = 0; i < teleDrive.files.length; i++) {
            total += teleDrive.files[i].file_size || 0;
        }
        totalSize.textContent = formatFileSize(total);
    }

    if (sessionInfo && teleDrive.currentSession) {
        sessionInfo.textContent = 'Phiên: ' + teleDrive.currentSession;
    }
}

// Update session info display
function updateSessionInfo(scanInfo) {
    if (!scanInfo) return;

    // Update session info in UI if there's a dedicated area
    var sessionInfo = document.getElementById('sessionInfo');
    if (sessionInfo) {
        sessionInfo.innerHTML =
            '<div class="session-stats">' +
                '<span class="stat-item">Tổng files: ' + scanInfo.total_files + '</span>' +
                '<span class="stat-item">Scan date: ' + formatDate(scanInfo.scan_date) + '</span>' +
            '</div>';
    }

    // Update page title or header
    var pageTitle = document.querySelector('.content-header h2');
    if (pageTitle) {
        pageTitle.textContent = 'Session Files (' + scanInfo.total_files + ' files)';
    }
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
