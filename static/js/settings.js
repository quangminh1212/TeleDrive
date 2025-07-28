// Settings Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeSettingsPage();
});

function initializeSettingsPage() {
    loadCurrentSettings();
    initializeForms();
    initializeDangerZone();
    initializeTooltips();
}

function loadCurrentSettings() {
    // Load current configuration from API
    fetch('/api/config')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateSettings(data.config);
            }
        })
        .catch(error => {
            console.error('Failed to load settings:', error);
            window.TeleDrive.showToast('Failed to load current settings', 'error');
        });
}

function populateSettings(config) {
    // Telegram settings
    if (config.telegram) {
        const apiIdInput = document.getElementById('apiId');
        const apiHashInput = document.getElementById('apiHash');
        const phoneNumberInput = document.getElementById('phoneNumber');
        
        if (apiIdInput && config.telegram.api_id) {
            apiIdInput.value = config.telegram.api_id;
        }
        
        if (apiHashInput && config.telegram.api_hash) {
            // Show masked hash for security
            apiHashInput.value = config.telegram.api_hash ? '••••••••••••••••' : '';
            apiHashInput.dataset.hasValue = config.telegram.api_hash ? 'true' : 'false';
        }
        
        if (phoneNumberInput && config.telegram.phone_number) {
            phoneNumberInput.value = config.telegram.phone_number;
        }
    }
    
    // Scanning settings
    if (config.scanning) {
        const checkboxes = {
            'scan_documents': config.scanning.scan_documents,
            'scan_photos': config.scanning.scan_photos,
            'scan_videos': config.scanning.scan_videos,
            'scan_audio': config.scanning.scan_audio,
            'scan_voice': config.scanning.scan_voice,
            'scan_stickers': config.scanning.scan_stickers
        };
        
        Object.entries(checkboxes).forEach(([name, value]) => {
            const checkbox = document.querySelector(`input[name="${name}"]`);
            if (checkbox) {
                checkbox.checked = value;
            }
        });
        
        const maxMessagesSelect = document.getElementById('defaultMaxMessages');
        if (maxMessagesSelect && config.scanning.max_messages) {
            maxMessagesSelect.value = config.scanning.max_messages.toString();
        }
    }
}

function initializeForms() {
    // Telegram form
    const telegramForm = document.getElementById('telegramForm');
    if (telegramForm) {
        telegramForm.addEventListener('submit', handleTelegramFormSubmit);
    }
    
    // Scanning form
    const scanningForm = document.getElementById('scanningForm');
    if (scanningForm) {
        scanningForm.addEventListener('submit', handleScanningFormSubmit);
    }
    
    // Storage form
    const storageForm = document.getElementById('storageForm');
    if (storageForm) {
        storageForm.addEventListener('submit', handleStorageFormSubmit);
    }
    
    // App form
    const appForm = document.getElementById('appForm');
    if (appForm) {
        appForm.addEventListener('submit', handleAppFormSubmit);
    }
    
    // Test Telegram button
    const testTelegramBtn = document.getElementById('testTelegramBtn');
    if (testTelegramBtn) {
        testTelegramBtn.addEventListener('click', testTelegramConnection);
    }
    
    // Browse output directory button
    const browseOutputBtn = document.getElementById('browseOutputBtn');
    if (browseOutputBtn) {
        browseOutputBtn.addEventListener('click', browseOutputDirectory);
    }
    
    // Cleanup now button
    const cleanupNowBtn = document.getElementById('cleanupNowBtn');
    if (cleanupNowBtn) {
        cleanupNowBtn.addEventListener('click', performCleanup);
    }
    
    // API Hash input handling
    const apiHashInput = document.getElementById('apiHash');
    if (apiHashInput) {
        apiHashInput.addEventListener('focus', function() {
            if (this.dataset.hasValue === 'true' && this.value === '••••••••••••••••') {
                this.value = '';
                this.placeholder = 'Enter new API Hash or leave empty to keep current';
            }
        });
    }
}

function handleTelegramFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const apiId = formData.get('api_id');
    const apiHash = formData.get('api_hash');
    const phoneNumber = formData.get('phone_number');
    
    // Validate required fields
    if (!apiId || !phoneNumber) {
        window.TeleDrive.showToast('API ID and Phone Number are required', 'error');
        return;
    }
    
    // Validate phone number format
    if (!isValidPhoneNumber(phoneNumber)) {
        window.TeleDrive.showToast('Please enter a valid phone number with country code', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    const telegramConfig = {
        api_id: apiId,
        phone_number: phoneNumber
    };
    
    // Only include API hash if it's not the masked value
    if (apiHash && apiHash !== '••••••••••••••••') {
        telegramConfig.api_hash = apiHash;
    }
    
    // Save telegram configuration
    fetch('/api/config/telegram', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(telegramConfig)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessBanner();
            window.TeleDrive.showToast('Telegram settings saved successfully', 'success');
            
            // Update connection status
            updateConnectionStatus('telegram', 'connected');
        } else {
            window.TeleDrive.showToast('Failed to save settings: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Save error:', error);
        window.TeleDrive.showToast('Network error occurred', 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function handleScanningFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const scanningConfig = {
        scan_documents: formData.get('scan_documents') === 'on',
        scan_photos: formData.get('scan_photos') === 'on',
        scan_videos: formData.get('scan_videos') === 'on',
        scan_audio: formData.get('scan_audio') === 'on',
        scan_voice: formData.get('scan_voice') === 'on',
        scan_stickers: formData.get('scan_stickers') === 'on',
        default_max_messages: formData.get('default_max_messages') || null,
        batch_size: parseInt(formData.get('batch_size')) || 100
    };
    
    saveSettings('scanning', scanningConfig, e.target);
}

function handleStorageFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const storageConfig = {
        output_directory: formData.get('output_directory'),
        output_json: formData.get('output_json') === 'on',
        output_csv: formData.get('output_csv') === 'on',
        output_excel: formData.get('output_excel') === 'on',
        max_file_size: parseInt(formData.get('max_file_size')) || 500,
        auto_cleanup_days: parseInt(formData.get('auto_cleanup_days')) || 30
    };
    
    saveSettings('storage', storageConfig, e.target);
}

function handleAppFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const appConfig = {
        theme: formData.get('theme'),
        language: formData.get('language'),
        enable_notifications: formData.get('enable_notifications') === 'on',
        auto_refresh: formData.get('auto_refresh') === 'on',
        detailed_logging: formData.get('detailed_logging') === 'on'
    };
    
    saveSettings('app', appConfig, e.target);
    
    // Apply theme immediately
    if (appConfig.theme) {
        applyTheme(appConfig.theme);
    }
}

function saveSettings(section, config, form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    fetch(`/api/config/${section}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessBanner();
            window.TeleDrive.showToast(`${section} settings saved successfully`, 'success');
        } else {
            window.TeleDrive.showToast('Failed to save settings: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Save error:', error);
        window.TeleDrive.showToast('Network error occurred', 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function testTelegramConnection() {
    const testBtn = document.getElementById('testTelegramBtn');
    const originalText = testBtn.innerHTML;
    
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    testBtn.disabled = true;
    
    fetch('/api/telegram/test', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.TeleDrive.showToast('Telegram connection successful!', 'success');
            updateConnectionStatus('telegram', 'connected');
        } else {
            window.TeleDrive.showToast('Connection failed: ' + data.error, 'error');
            updateConnectionStatus('telegram', 'disconnected');
        }
    })
    .catch(error => {
        console.error('Test error:', error);
        window.TeleDrive.showToast('Connection test failed', 'error');
        updateConnectionStatus('telegram', 'disconnected');
    })
    .finally(() => {
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
    });
}

function browseOutputDirectory() {
    // In a real implementation, this would open a directory picker
    // For now, show a simple prompt
    const currentDir = document.getElementById('outputDirectory').value;
    const newDir = prompt('Enter output directory path:', currentDir);
    
    if (newDir && newDir.trim()) {
        document.getElementById('outputDirectory').value = newDir.trim();
        window.TeleDrive.showToast('Output directory updated', 'info');
    }
}

function performCleanup() {
    if (!confirm('Are you sure you want to cleanup old scan results? This action cannot be undone.')) {
        return;
    }
    
    const cleanupBtn = document.getElementById('cleanupNowBtn');
    const originalText = cleanupBtn.innerHTML;
    
    cleanupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cleaning...';
    cleanupBtn.disabled = true;
    
    fetch('/api/cleanup', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.TeleDrive.showToast(`Cleanup completed! Removed ${data.files_removed} files`, 'success');
        } else {
            window.TeleDrive.showToast('Cleanup failed: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Cleanup error:', error);
        window.TeleDrive.showToast('Cleanup failed', 'error');
    })
    .finally(() => {
        cleanupBtn.innerHTML = originalText;
        cleanupBtn.disabled = false;
    });
}

function initializeDangerZone() {
    const clearDataBtn = document.getElementById('clearDataBtn');
    const resetConfigBtn = document.getElementById('resetConfigBtn');
    const deleteSessionBtn = document.getElementById('deleteSessionBtn');
    
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear all scan data? This action cannot be undone.')) {
                performDangerousAction('clear-data', 'All scan data cleared');
            }
        });
    }
    
    if (resetConfigBtn) {
        resetConfigBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset all configuration to defaults?')) {
                performDangerousAction('reset-config', 'Configuration reset to defaults');
            }
        });
    }
    
    if (deleteSessionBtn) {
        deleteSessionBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete the Telegram session? You will need to re-authenticate.')) {
                performDangerousAction('delete-session', 'Telegram session deleted');
            }
        });
    }
}

function performDangerousAction(action, successMessage) {
    window.TeleDrive.showLoading();
    
    fetch(`/api/admin/${action}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.TeleDrive.showToast(successMessage, 'success');
            
            // Reload page after certain actions
            if (action === 'reset-config') {
                setTimeout(() => {
                    location.reload();
                }, 2000);
            }
        } else {
            window.TeleDrive.showToast('Action failed: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Action error:', error);
        window.TeleDrive.showToast('Action failed', 'error');
    })
    .finally(() => {
        window.TeleDrive.hideLoading();
    });
}

function updateConnectionStatus(service, status) {
    // Add connection status indicators to the form
    const form = document.getElementById('telegramForm');
    if (!form) return;
    
    let statusElement = form.querySelector('.connection-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'connection-status';
        form.appendChild(statusElement);
    }
    
    statusElement.className = `connection-status ${status}`;
    
    const statusText = {
        'connected': '<i class="fas fa-check-circle"></i> Connected',
        'disconnected': '<i class="fas fa-times-circle"></i> Disconnected',
        'testing': '<i class="fas fa-spinner fa-spin"></i> Testing...'
    };
    
    statusElement.innerHTML = statusText[status] || '';
}

function showSuccessBanner() {
    const banner = document.getElementById('successBanner');
    if (banner) {
        banner.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            banner.style.display = 'none';
        }, 3000);
    }
}

function applyTheme(theme) {
    // Apply theme to the document
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'auto') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

function initializeTooltips() {
    // Add tooltips to form elements that need explanation
    const tooltips = {
        'apiId': 'Get this from https://my.telegram.org/apps',
        'apiHash': 'Get this from https://my.telegram.org/apps',
        'phoneNumber': 'Your Telegram phone number with country code',
        'maxFileSize': 'Maximum file size for uploads in megabytes',
        'autoCleanup': 'Automatically delete old scan results after this many days'
    };
    
    Object.entries(tooltips).forEach(([id, tooltip]) => {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute('data-tooltip', tooltip);
            element.classList.add('tooltip');
        }
    });
}

// Utility functions
function isValidPhoneNumber(phone) {
    // Basic phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
}

// Theme switching
function switchTheme(theme) {
    applyTheme(theme);
    
    // Save theme preference
    localStorage.setItem('theme', theme);
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
});
