// Telegram Channel Scan JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeScanPage();
});

function initializeScanPage() {
    initializeScanForm();
    initializePasteButton();
    initializeConfigStatus();
    loadRecentScans();
}

function initializeScanForm() {
    const scanForm = document.getElementById('scanForm');
    const startScanBtn = document.getElementById('startScanBtn');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    
    if (scanForm) {
        scanForm.addEventListener('submit', function(e) {
            e.preventDefault();
            startChannelScan();
        });
    }
    
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', function() {
            testTelegramConnection();
        });
    }
}

function initializePasteButton() {
    const pasteBtn = document.getElementById('pasteBtn');
    const channelInput = document.getElementById('channelInput');
    
    if (pasteBtn && channelInput) {
        pasteBtn.addEventListener('click', async function() {
            try {
                const text = await navigator.clipboard.readText();
                channelInput.value = text;
                channelInput.focus();
                window.TeleDrive.showToast('Pasted from clipboard', 'success');
            } catch (err) {
                window.TeleDrive.showToast('Could not paste from clipboard', 'error');
            }
        });
    }
}

function initializeConfigStatus() {
    checkConfigurationStatus();
}

function checkConfigurationStatus() {
    const telegramStatus = document.getElementById('telegramStatus');
    const phoneStatus = document.getElementById('phoneStatus');
    const sessionStatus = document.getElementById('sessionStatus');
    
    // Check configuration via API
    fetch('/api/config')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const config = data.config;
                
                // Update Telegram API status
                updateStatusItem(telegramStatus, 
                    config.telegram.api_id ? 'success' : 'error',
                    config.telegram.api_id ? 'Configured' : 'Not configured'
                );
                
                // Update Phone status
                updateStatusItem(phoneStatus,
                    config.telegram.phone_number && config.telegram.phone_number !== '+84xxxxxxxxx' ? 'success' : 'error',
                    config.telegram.phone_number && config.telegram.phone_number !== '+84xxxxxxxxx' ? 'Configured' : 'Not configured'
                );
                
                // Update Session status (simplified check)
                updateStatusItem(sessionStatus, 'warning', 'Check required');
            }
        })
        .catch(error => {
            console.error('Config check failed:', error);
            updateStatusItem(telegramStatus, 'error', 'Check failed');
            updateStatusItem(phoneStatus, 'error', 'Check failed');
            updateStatusItem(sessionStatus, 'error', 'Check failed');
        });
}

function updateStatusItem(statusElement, status, text) {
    if (!statusElement) return;
    
    const indicator = statusElement.querySelector('.status-indicator');
    const statusText = statusElement.querySelector('.status-text');
    
    // Remove existing status classes
    indicator.classList.remove('success', 'error', 'warning');
    
    // Add new status class
    indicator.classList.add(status);
    
    // Update text
    statusText.textContent = text;
}

function startChannelScan() {
    const formData = new FormData(document.getElementById('scanForm'));
    const channelInput = formData.get('channel');
    
    if (!channelInput || !channelInput.trim()) {
        window.TeleDrive.showToast('Please enter a channel URL or username', 'error');
        return;
    }
    
    // Validate channel format
    if (!isValidChannelInput(channelInput)) {
        window.TeleDrive.showToast('Invalid channel format. Please check the examples.', 'error');
        return;
    }
    
    // Show progress container
    const scanProgressContainer = document.getElementById('scanProgressContainer');
    const scanContainer = document.querySelector('.scan-container');
    
    scanProgressContainer.style.display = 'block';
    scanContainer.style.display = 'none';
    
    // Update progress info
    document.getElementById('currentChannel').textContent = channelInput;
    document.getElementById('messagesScanned').textContent = '0';
    document.getElementById('filesFound').textContent = '0';
    
    // Start scan
    performChannelScan(channelInput, formData);
}

function isValidChannelInput(input) {
    const patterns = [
        /^@[a-zA-Z0-9_]+$/,  // @username
        /^https:\/\/t\.me\/[a-zA-Z0-9_]+$/,  // https://t.me/username
        /^https:\/\/t\.me\/joinchat\/[a-zA-Z0-9_-]+$/,  // https://t.me/joinchat/xxx
        /^https:\/\/t\.me\/\+[a-zA-Z0-9_-]+$/  // https://t.me/+xxx
    ];
    
    return patterns.some(pattern => pattern.test(input.trim()));
}

function performChannelScan(channel, formData) {
    const scanData = {
        channel: channel,
        scan_documents: formData.get('scan_documents') === 'on',
        scan_photos: formData.get('scan_photos') === 'on',
        scan_videos: formData.get('scan_videos') === 'on',
        scan_audio: formData.get('scan_audio') === 'on',
        scan_voice: formData.get('scan_voice') === 'on',
        scan_stickers: formData.get('scan_stickers') === 'on',
        max_messages: formData.get('max_messages') || null
    };

    // Add log entry
    addLogEntry('Starting scan for channel: ' + channel);

    // Make API call to start scan
    fetch('/api/scan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(scanData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addLogEntry('Scan request submitted successfully');
            const scanId = data.scan_id;

            // Start polling for progress
            startProgressPolling(scanId);
        } else {
            addLogEntry('Scan failed: ' + data.error, 'error');
            window.TeleDrive.showToast('Scan failed: ' + data.error, 'error');
            resetScanForm();
        }
    })
    .catch(error => {
        console.error('Scan error:', error);
        addLogEntry('Network error occurred', 'error');
        window.TeleDrive.showToast('Network error occurred', 'error');
        resetScanForm();
    });
}

function startProgressPolling(scanId) {
    // Store scan ID for cancellation
    window.currentScanId = scanId;

    // Poll for progress every 2 seconds
    const pollInterval = setInterval(() => {
        fetch(`/api/scan/status/${scanId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const status = data.status;
                    const progress = data.progress || 0;
                    const messagesScanned = data.messages_scanned || 0;
                    const filesFound = data.files_found || 0;

                    // Update progress display
                    updateScanProgress(progress, messagesScanned, filesFound);

                    // Add log entries based on status
                    if (status === 'connecting') {
                        addLogEntry('Connecting to Telegram...');
                    } else if (status === 'scanning') {
                        if (Math.random() > 0.8) { // Occasional log entries
                            addLogEntry(`Processing messages... (${messagesScanned} scanned, ${filesFound} files found)`);
                        }
                    } else if (status === 'completed') {
                        clearInterval(pollInterval);
                        completeScan(filesFound);
                    } else if (status === 'error') {
                        clearInterval(pollInterval);
                        addLogEntry('Scan failed: ' + (data.error || 'Unknown error'), 'error');
                        window.TeleDrive.showToast('Scan failed: ' + (data.error || 'Unknown error'), 'error');
                        resetScanForm();
                    } else if (status === 'cancelled') {
                        clearInterval(pollInterval);
                        addLogEntry('Scan was cancelled', 'warning');
                        resetScanForm();
                    }
                } else {
                    clearInterval(pollInterval);
                    addLogEntry('Failed to get scan status', 'error');
                    resetScanForm();
                }
            })
            .catch(error => {
                console.error('Progress polling error:', error);
                // Continue polling despite errors
            });
    }, 2000);

    // Store interval ID for cleanup
    window.currentProgressInterval = pollInterval;
}



function updateScanProgress(progress, messagesScanned, filesFound) {
    const progressFill = document.getElementById('scanProgressFill');
    const progressText = document.getElementById('scanProgressText');
    const messagesElement = document.getElementById('messagesScanned');
    const filesElement = document.getElementById('filesFound');
    
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    if (progressText) {
        progressText.textContent = `Scanning... ${Math.round(progress)}%`;
    }
    
    if (messagesElement) {
        messagesElement.textContent = messagesScanned.toLocaleString();
    }
    
    if (filesElement) {
        filesElement.textContent = filesFound.toLocaleString();
    }
}

function addLogEntry(message, type = 'info') {
    const progressLog = document.getElementById('progressLog');
    if (!progressLog) return;
    
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    
    logItem.innerHTML = `
        <span class="log-time">${timeString}</span>
        <span class="log-message ${type}">${message}</span>
    `;
    
    progressLog.appendChild(logItem);
    progressLog.scrollTop = progressLog.scrollHeight;
}

function completeScan(filesFound) {
    addLogEntry(`Scan completed! Found ${filesFound} files`, 'success');
    
    setTimeout(() => {
        window.TeleDrive.showToast(`Scan completed! Found ${filesFound} files`, 'success');
        resetScanForm();
        
        // Redirect to main page to see results
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }, 1000);
}

function resetScanForm() {
    const scanProgressContainer = document.getElementById('scanProgressContainer');
    const scanContainer = document.querySelector('.scan-container');

    scanProgressContainer.style.display = 'none';
    scanContainer.style.display = 'block';

    // Clear progress
    document.getElementById('scanProgressFill').style.width = '0%';
    document.getElementById('scanProgressText').textContent = 'Initializing...';
    document.getElementById('messagesScanned').textContent = '0';
    document.getElementById('filesFound').textContent = '0';

    // Clear log
    const progressLog = document.getElementById('progressLog');
    progressLog.innerHTML = '<div class="log-item"><span class="log-time">00:00:00</span><span class="log-message">Scan initialized</span></div>';

    // Clear any running intervals
    if (window.currentProgressInterval) {
        clearInterval(window.currentProgressInterval);
        window.currentProgressInterval = null;
    }

    // Clear scan ID
    window.currentScanId = null;
}

function testTelegramConnection() {
    const testBtn = document.getElementById('testConnectionBtn');
    const originalText = testBtn.innerHTML;
    
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    testBtn.disabled = true;
    
    // Simulate connection test
    setTimeout(() => {
        const success = Math.random() > 0.3; // 70% success rate for demo
        
        if (success) {
            window.TeleDrive.showToast('Telegram connection successful!', 'success');
            updateStatusItem(document.getElementById('telegramStatus'), 'success', 'Connected');
            updateStatusItem(document.getElementById('sessionStatus'), 'success', 'Active');
        } else {
            window.TeleDrive.showToast('Connection failed. Check your configuration.', 'error');
            updateStatusItem(document.getElementById('telegramStatus'), 'error', 'Failed');
            updateStatusItem(document.getElementById('sessionStatus'), 'error', 'Inactive');
        }
        
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
    }, 2000);
}

function loadRecentScans() {
    // In real implementation, this would load from API
    // For now, the HTML template contains sample data
}

// Cancel scan functionality
document.addEventListener('DOMContentLoaded', function() {
    const cancelScanBtn = document.getElementById('cancelScanBtn');

    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to cancel the scan?')) {
                cancelCurrentScan();
            }
        });
    }
});

function cancelCurrentScan() {
    if (window.currentScanId) {
        fetch(`/api/scan/cancel/${window.currentScanId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addLogEntry('Scan cancelled by user', 'warning');
                window.TeleDrive.showToast('Scan cancelled', 'warning');
            } else {
                addLogEntry('Failed to cancel scan: ' + data.error, 'error');
                window.TeleDrive.showToast('Failed to cancel scan', 'error');
            }
            resetScanForm();
        })
        .catch(error => {
            console.error('Cancel error:', error);
            addLogEntry('Error cancelling scan', 'error');
            resetScanForm();
        });
    } else {
        resetScanForm();
    }
}
