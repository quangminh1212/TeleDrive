// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch('http://127.0.0.1:5000/', {
            method: 'GET',
            mode: 'no-cors'
        });
        
        updateStatus(true);
        return true;
    } catch (error) {
        updateStatus(false);
        return false;
    }
}

function updateStatus(isOnline) {
    const statusElement = document.getElementById('status');
    const statusText = statusElement.querySelector('.status-text');
    const serverStatus = document.getElementById('serverStatus');
    
    if (isOnline) {
        statusElement.classList.add('online');
        statusElement.classList.remove('offline');
        statusText.textContent = 'Server Online';
        serverStatus.textContent = 'Running';
        serverStatus.className = 'badge badge-success';
    } else {
        statusElement.classList.add('offline');
        statusElement.classList.remove('online');
        statusText.textContent = 'Server Offline';
        serverStatus.textContent = 'Stopped';
        serverStatus.className = 'badge badge-danger';
    }
}

function openBrowser() {
    const url = document.getElementById('serverUrl').value;
    window.open(url, '_blank');
}

function copyUrl() {
    const urlInput = document.getElementById('serverUrl');
    urlInput.select();
    document.execCommand('copy');
    
    // Show feedback
    const btn = event.target.closest('.btn-icon');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    btn.style.background = '#28a745';
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
    }, 2000);
}

function refreshStatus() {
    const btn = event.target.closest('.btn-secondary');
    const originalHTML = btn.innerHTML;
    
    // Show loading
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="animation: spin 1s linear infinite;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path></svg> Checking...';
    btn.disabled = true;
    
    checkServerStatus().then(() => {
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }, 1000);
    });
}

// Auto-check status every 5 seconds
setInterval(checkServerStatus, 5000);

// Initial check
checkServerStatus();

// Add spin animation for refresh button
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Load user info and stats (mock data for now)
async function loadStats() {
    // This would normally fetch from the Flask API
    // For now, we'll use mock data
    
    // You can implement actual API calls here
    // Example:
    // const response = await fetch('http://127.0.0.1:5000/api/stats');
    // const data = await response.json();
    
    document.getElementById('userName').textContent = 'Guest';
    document.getElementById('fileCount').textContent = '0';
    document.getElementById('storageUsed').textContent = '0 MB';
}

loadStats();
