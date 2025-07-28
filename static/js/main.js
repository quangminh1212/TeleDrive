// TeleDrive Web Interface JavaScript

// Global variables
let toastTimeout;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    // Setup global event listeners
    setupGlobalEventListeners();
    
    // Initialize tooltips and other UI components
    initializeUIComponents();
    
    console.log('TeleDrive Web Interface initialized');
}

// Setup global event listeners
function setupGlobalEventListeners() {
    // Close context menus when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.context-menu')) {
            hideAllContextMenus();
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAllContextMenus();
            hideLoading();
        }
    });
    
    // Handle search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

// Initialize UI components
function initializeUIComponents() {
    // Add ripple effect to buttons
    document.querySelectorAll('.btn').forEach(addRippleEffect);
    
    // Initialize file drag and drop
    initializeFileDragDrop();
}

// Add ripple effect to buttons
function addRippleEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Initialize file drag and drop
function initializeFileDragDrop() {
    const dropZones = document.querySelectorAll('.files-container, .scan-form');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            handleFileDrop(e);
        });
    });
}

// Handle file drop
function handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
}

// Upload files function
function uploadFiles(files) {
    if (!files || files.length === 0) {
        showToast('No files selected', 'error');
        return;
    }

    const formData = new FormData();

    // Add files to form data
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    // Add current folder if available
    if (window.currentFolder) {
        formData.append('folder_id', window.currentFolder);
    }

    // Show loading state
    showLoading('Uploading files...');

    // Upload files
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            showToast(data.message, 'success');
            // Refresh file list
            if (typeof refreshFiles === 'function') {
                refreshFiles();
            } else {
                location.reload();
            }
        } else {
            showToast('Upload failed: ' + data.error, 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showToast('Upload error: ' + error.message, 'error');
    });
}

// Handle search
function handleSearch(query) {
    if (query.trim() === '') {
        // Show all files
        document.querySelectorAll('.file-card').forEach(card => {
            card.style.display = 'flex';
        });
        return;
    }
    
    // Filter files
    document.querySelectorAll('.file-card').forEach(card => {
        const filename = card.dataset.filename || '';
        const isMatch = filename.toLowerCase().includes(query.toLowerCase());
        card.style.display = isMatch ? 'flex' : 'none';
    });
}

// Toast notification system
function showToast(message, type = 'info', duration = 5000) {
    // Clear existing toast timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add icon based on type
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    
    toast.innerHTML = `
        <span class="material-icons">${icons[type] || 'info'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <span class="material-icons">close</span>
        </button>
    `;
    
    // Add to container
    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(toast);
        
        // Auto-remove after duration
        toastTimeout = setTimeout(() => {
            toast.remove();
        }, duration);
    }
}

// Loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.querySelector('.loading-text').textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Context menu helpers
function hideAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

// Utility functions
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

// API helpers
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// File operations
function downloadFile(filename) {
    const link = document.createElement('a');
    link.href = `/download/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Downloading ${filename}`, 'success');
}

function previewFile(filename) {
    // Create preview modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content file-preview-modal">
            <div class="modal-header">
                <h3>File Preview: ${filename}</h3>
                <button class="modal-close" onclick="closePreviewModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="preview-container" id="preview-container">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading preview...</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closePreviewModal()">Close</button>
                <button class="btn btn-primary" onclick="downloadFile('${filename}')">Download</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load preview content
    loadPreviewContent(filename);
}

function deleteFile(filename) {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
        apiRequest('/api/delete_file', 'POST', { filename: filename })
            .then(response => {
                if (response.success) {
                    showToast(`File ${filename} deleted successfully`, 'success');
                    // Remove file card from UI
                    const fileCard = document.querySelector(`[data-filename="${filename}"]`);
                    if (fileCard) {
                        fileCard.remove();
                    }
                    // Refresh stats
                    if (typeof loadStats === 'function') {
                        loadStats();
                    }
                } else {
                    showToast(`Error deleting file: ${response.error}`, 'error');
                }
            })
            .catch(error => {
                showToast(`Error deleting file: ${error.message}`, 'error');
            });
    }
}

function loadPreviewContent(filename) {
    const container = document.getElementById('preview-container');
    const fileExt = filename.split('.').pop().toLowerCase();

    // Determine preview type based on file extension
    if (['json'].includes(fileExt)) {
        loadJsonPreview(filename, container);
    } else if (['csv'].includes(fileExt)) {
        loadCsvPreview(filename, container);
    } else if (['xlsx', 'xls'].includes(fileExt)) {
        loadExcelPreview(filename, container);
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt)) {
        loadImagePreview(filename, container);
    } else if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(fileExt)) {
        loadVideoPreview(filename, container);
    } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(fileExt)) {
        loadAudioPreview(filename, container);
    } else if (['txt', 'md', 'py', 'js', 'html', 'css', 'xml', 'log'].includes(fileExt)) {
        loadTextPreview(filename, container);
    } else if (['pdf'].includes(fileExt)) {
        loadPdfPreview(filename, container);
    } else {
        // Generic file info preview
        loadGenericPreview(filename, container);
    }
}

function loadJsonPreview(filename, container) {
    fetch(`/output/${filename}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = `
                <div class="json-preview">
                    <div class="preview-header">
                        <span class="file-type-badge json">JSON</span>
                        <span class="file-info">${Array.isArray(data) ? data.length : Object.keys(data).length} items</span>
                    </div>
                    <pre class="json-content">${JSON.stringify(data, null, 2)}</pre>
                </div>
            `;
        })
        .catch(error => {
            container.innerHTML = `
                <div class="preview-error">
                    <span class="material-icons">error</span>
                    <p>Error loading JSON preview: ${error.message}</p>
                </div>
            `;
        });
}

function loadCsvPreview(filename, container) {
    fetch(`/output/${filename}`)
        .then(response => response.text())
        .then(data => {
            const lines = data.split('\n').slice(0, 100); // Show first 100 lines
            const rows = lines.map(line => line.split(','));

            let tableHtml = '<div class="csv-preview"><div class="preview-header"><span class="file-type-badge csv">CSV</span><span class="file-info">' + (lines.length - 1) + ' rows</span></div><table class="csv-table"><thead>';

            if (rows.length > 0) {
                tableHtml += '<tr>';
                rows[0].forEach(header => {
                    tableHtml += `<th>${header.replace(/"/g, '')}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';

                for (let i = 1; i < Math.min(rows.length, 21); i++) {
                    tableHtml += '<tr>';
                    rows[i].forEach(cell => {
                        tableHtml += `<td>${cell.replace(/"/g, '')}</td>`;
                    });
                    tableHtml += '</tr>';
                }
                tableHtml += '</tbody></table>';

                if (lines.length > 21) {
                    tableHtml += `<p class="preview-note">Showing first 20 rows of ${lines.length - 1} total rows</p>`;
                }
            }

            tableHtml += '</div>';
            container.innerHTML = tableHtml;
        })
        .catch(error => {
            container.innerHTML = `
                <div class="preview-error">
                    <span class="material-icons">error</span>
                    <p>Error loading CSV preview: ${error.message}</p>
                </div>
            `;
        });
}

function loadExcelPreview(filename, container) {
    container.innerHTML = `
        <div class="excel-preview">
            <div class="preview-header">
                <span class="file-type-badge excel">EXCEL</span>
                <span class="file-info">Excel file</span>
            </div>
            <div class="preview-content">
                <span class="material-icons large">description</span>
                <p>Excel file preview</p>
                <p class="preview-note">Download the file to view its contents in Excel or a compatible application.</p>
            </div>
        </div>
    `;
}

function loadImagePreview(filename, container) {
    container.innerHTML = `
        <div class="image-preview">
            <div class="preview-header">
                <span class="file-type-badge image">IMAGE</span>
                <span class="file-info">Loading...</span>
            </div>
            <div class="image-container">
                <img id="preview-image" src="/output/${filename}" alt="${filename}"
                     onload="handleImageLoad(this)" onerror="handleImageError(this)">
                <div class="image-controls">
                    <button class="btn btn-small" onclick="zoomImage(-0.2)">
                        <span class="material-icons">zoom_out</span>
                    </button>
                    <button class="btn btn-small" onclick="resetImageZoom()">
                        <span class="material-icons">fit_screen</span>
                    </button>
                    <button class="btn btn-small" onclick="zoomImage(0.2)">
                        <span class="material-icons">zoom_in</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function handleImageLoad(img) {
    const fileInfo = img.parentElement.parentElement.querySelector('.file-info');
    fileInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
}

function handleImageError(img) {
    img.parentElement.innerHTML = `
        <div class="preview-error">
            <span class="material-icons">broken_image</span>
            <p>Failed to load image</p>
        </div>
    `;
}

let currentZoom = 1;

function zoomImage(delta) {
    const img = document.getElementById('preview-image');
    if (img) {
        currentZoom = Math.max(0.1, Math.min(5, currentZoom + delta));
        img.style.transform = `scale(${currentZoom})`;
    }
}

function resetImageZoom() {
    const img = document.getElementById('preview-image');
    if (img) {
        currentZoom = 1;
        img.style.transform = 'scale(1)';
    }
}

function loadVideoPreview(filename, container) {
    container.innerHTML = `
        <div class="video-preview">
            <div class="preview-header">
                <span class="file-type-badge video">VIDEO</span>
                <span class="file-info">Video file</span>
            </div>
            <div class="video-container">
                <video controls preload="metadata" style="max-width: 100%; max-height: 400px;">
                    <source src="/output/${filename}" type="video/${filename.split('.').pop()}">
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    `;
}

function loadAudioPreview(filename, container) {
    container.innerHTML = `
        <div class="audio-preview">
            <div class="preview-header">
                <span class="file-type-badge audio">AUDIO</span>
                <span class="file-info">Audio file</span>
            </div>
            <div class="audio-container">
                <audio controls preload="metadata" style="width: 100%;">
                    <source src="/output/${filename}" type="audio/${filename.split('.').pop()}">
                    Your browser does not support the audio tag.
                </audio>
            </div>
        </div>
    `;
}

function loadTextPreview(filename, container) {
    fetch(`/output/${filename}`)
        .then(response => response.text())
        .then(data => {
            const fileExt = filename.split('.').pop().toLowerCase();
            const lines = data.split('\n');
            const displayLines = lines.slice(0, 500); // Show first 500 lines

            container.innerHTML = `
                <div class="text-preview">
                    <div class="preview-header">
                        <span class="file-type-badge text">${fileExt.toUpperCase()}</span>
                        <span class="file-info">${lines.length} lines</span>
                    </div>
                    <pre class="text-content"><code>${displayLines.join('\n')}</code></pre>
                    ${lines.length > 500 ? '<p class="preview-note">Showing first 500 lines</p>' : ''}
                </div>
            `;
        })
        .catch(error => {
            container.innerHTML = `
                <div class="preview-error">
                    <span class="material-icons">error</span>
                    <p>Error loading text preview: ${error.message}</p>
                </div>
            `;
        });
}

function loadPdfPreview(filename, container) {
    container.innerHTML = `
        <div class="pdf-preview">
            <div class="preview-header">
                <span class="file-type-badge pdf">PDF</span>
                <span class="file-info">PDF document</span>
            </div>
            <div class="pdf-container">
                <iframe src="/output/${filename}" style="width: 100%; height: 500px; border: none;">
                    <p>Your browser does not support PDF preview.
                       <a href="/output/${filename}" target="_blank">Click here to open the PDF</a>
                    </p>
                </iframe>
            </div>
        </div>
    `;
}

function loadGenericPreview(filename, container) {
    const fileExt = filename.split('.').pop().toLowerCase();
    const fileSize = 'Unknown size'; // We'll get this from file stats if available

    container.innerHTML = `
        <div class="generic-preview">
            <div class="preview-header">
                <span class="file-type-badge generic">${fileExt.toUpperCase()}</span>
                <span class="file-info">${fileSize}</span>
            </div>
            <div class="preview-content">
                <span class="material-icons large">insert_drive_file</span>
                <p>File: ${filename}</p>
                <p class="preview-note">Preview not available for this file type. Download to view contents.</p>
            </div>
        </div>
    `;
}

function closePreviewModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Theme and preferences
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    
    if (isDark) {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// Initialize theme from localStorage
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Sidebar toggle for mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const isOpen = sidebar.classList.contains('open');
    
    if (isOpen) {
        sidebar.classList.remove('open');
    } else {
        sidebar.classList.add('open');
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Ctrl/Cmd + N for new scan
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (window.location.pathname !== '/scan') {
            window.location.href = '/scan';
        }
    }
    
    // Ctrl/Cmd + , for settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (window.location.pathname !== '/settings') {
            window.location.href = '/settings';
        }
    }
});

// Export functions for global use
window.TeleDrive = {
    showToast,
    hideToast: () => document.querySelectorAll('.toast').forEach(t => t.remove()),
    showLoading,
    hideLoading,
    formatFileSize,
    formatDate,
    downloadFile,
    previewFile,
    deleteFile,
    toggleTheme,
    toggleSidebar,
    apiRequest
};

// Initialize theme on load
initializeTheme();
