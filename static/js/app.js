// TeleDrive - Main JavaScript Application

// Global variables
let socket = null;
let connectionStatus = { connected: false, user: null };

// Initialize application
function initializeApp() {
    initializeSocket();
    checkConnectionStatus();
    setupGlobalEventListeners();
}

// Socket.IO initialization
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
    });
    
    socket.on('connection_status', function(status) {
        updateConnectionStatus(status);
    });
}

// Check initial connection status
function checkConnectionStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(status => {
            updateConnectionStatus(status);
        })
        .catch(error => {
            console.error('Error checking connection status:', error);
        });
}

// Update connection status UI
function updateConnectionStatus(status) {
    connectionStatus = status;
    
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const connectBtn = document.getElementById('connectBtn');
    
    if (status.connected) {
        statusIndicator.classList.add('connected');
        statusText.textContent = 'Connected';
        connectBtn.innerHTML = '<i data-feather="wifi-off"></i><span>Disconnect</span>';
        connectBtn.classList.remove('btn-primary');
        connectBtn.classList.add('btn-secondary');
    } else {
        statusIndicator.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        connectBtn.innerHTML = '<i data-feather="wifi"></i><span>Connect</span>';
        connectBtn.classList.remove('btn-secondary');
        connectBtn.classList.add('btn-primary');
    }
    
    // Update feather icons
    feather.replace();
}

// Toggle connection
function toggleConnection() {
    if (connectionStatus.connected) {
        disconnect();
    } else {
        connect();
    }
}

// Connect to Telegram
function connect() {
    showLoading(true);
    
    fetch('/api/connect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            showToast(data.message, 'success');
            updateConnectionStatus({ connected: true, user: data.user });
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Connection error:', error);
        showToast('Failed to connect to Telegram', 'error');
    });
}

// Disconnect from Telegram
function disconnect() {
    showLoading(true);
    
    fetch('/api/disconnect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            showToast(data.message, 'success');
            updateConnectionStatus({ connected: false, user: null });
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Disconnect error:', error);
        showToast('Failed to disconnect from Telegram', 'error');
    });
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// Toast notification system
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i data-feather="${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    feather.replace();
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    });
}

// Get icon for toast type
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'x-circle';
        case 'warning': return 'alert-triangle';
        case 'info': return 'info';
        default: return 'info';
    }
}

// Setup global event listeners
function setupGlobalEventListeners() {
    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                activeModal.classList.remove('active');
            }
        }
    });
    
    // Click outside modal to close
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // Mobile menu toggle (if needed)
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('open');
        });
    }
}

// Utility functions
function formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// API helper functions
function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    return fetch(url, { ...defaultOptions, ...options })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
}

// Export functions for global use
window.initializeApp = initializeApp;
window.toggleConnection = toggleConnection;
window.showToast = showToast;
window.showLoading = showLoading;
window.formatFileSize = formatFileSize;
window.formatDate = formatDate;
window.truncateText = truncateText;
window.debounce = debounce;
window.apiRequest = apiRequest;
