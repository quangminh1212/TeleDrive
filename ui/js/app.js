// TeleDrive UI JavaScript
class TeleDriveApp {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.files = [];
        this.currentView = 'grid';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.isScanning = false;
        this.isLoggedIn = false;
        this.loginData = {
            phoneNumber: '',
            phoneCodeHash: '',
            countdownTimer: null
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.bindLoginEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Header events
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        
        // Sidebar events
        document.getElementById('addChannelBtn').addEventListener('click', () => this.openAddChannelModal());
        document.getElementById('welcomeAddBtn').addEventListener('click', () => this.openAddChannelModal());
        document.getElementById('channelSearch').addEventListener('input', (e) => this.searchChannels(e.target.value));
        
        // Main content events
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeView(e.target.dataset.view));
        });
        document.getElementById('filterBtn').addEventListener('click', () => this.openFilterModal());
        
        // Input panel events
        document.getElementById('scanBtn').addEventListener('click', () => this.startScan());
        document.getElementById('channelInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startScan();
        });
        
        // Export events
        document.getElementById('exportJson').addEventListener('click', () => this.exportFiles('json'));
        document.getElementById('exportCsv').addEventListener('click', () => this.exportFiles('csv'));
        document.getElementById('exportExcel').addEventListener('click', () => this.exportFiles('excel'));
        
        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelModal').addEventListener('click', () => this.closeModal());
        document.getElementById('confirmAddChannel').addEventListener('click', () => this.addChannel());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalOverlay')) {
                this.closeModal();
            }
        });
        
        // Progress modal events
        document.getElementById('cancelScan').addEventListener('click', () => this.cancelScan());

        // Pagination events
        document.getElementById('prevPage').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => this.changePage(1));
    }

    bindLoginEvents() {
        // Phone step events
        document.getElementById('sendCodeBtn').addEventListener('click', () => this.sendVerificationCode());
        document.getElementById('phoneInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendVerificationCode();
        });

        // Code step events
        document.getElementById('verifyCodeBtn').addEventListener('click', () => this.verifyCode());
        document.getElementById('codeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyCode();
        });
        document.getElementById('codeInput').addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');

            // Auto-submit when 5 digits entered
            if (e.target.value.length === 5) {
                setTimeout(() => this.verifyCode(), 300);
            }
        });

        // Phone input formatting
        document.getElementById('phoneInput').addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        document.getElementById('backToPhone').addEventListener('click', () => this.showLoginStep('phoneStep'));
        document.getElementById('resendBtn').addEventListener('click', () => this.resendCode());

        // 2FA step events
        document.getElementById('verify2FABtn').addEventListener('click', () => this.verify2FA());
        document.getElementById('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verify2FA();
        });
        document.getElementById('backToCode').addEventListener('click', () => this.showLoginStep('codeStep'));
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePasswordVisibility());

        // Logout event (will be added to header)
        document.querySelector('.user-info').addEventListener('click', () => this.showLogoutMenu());
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();

            if (data.authenticated) {
                this.isLoggedIn = true;
                this.updateUserInfo(data.user);
                this.hideLoginScreen();
                this.loadChannels();
                this.updateStats();
            } else {
                this.isLoggedIn = false;
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Failed to check auth status:', error);
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        document.getElementById('loginOverlay').classList.remove('hidden');
        this.showLoginStep('phoneStep');

        // Pre-fill phone number from config if available
        this.prefillPhoneNumber();
    }

    hideLoginScreen() {
        document.getElementById('loginOverlay').classList.add('hidden');
    }

    showLoginStep(stepId) {
        // Hide all steps
        document.querySelectorAll('.login-step').forEach(step => {
            step.style.display = 'none';
        });

        // Show target step
        document.getElementById(stepId).style.display = 'block';

        // Hide error
        this.hideLoginError();

        // Focus appropriate input
        setTimeout(() => {
            if (stepId === 'phoneStep') {
                document.getElementById('phoneInput').focus();
            } else if (stepId === 'codeStep') {
                document.getElementById('codeInput').focus();
            } else if (stepId === 'twoFactorStep') {
                document.getElementById('passwordInput').focus();
            }
        }, 100);
    }

    async prefillPhoneNumber() {
        try {
            const response = await fetch('/api/config/phone');
            const data = await response.json();

            if (data.phone) {
                const phone = data.phone.replace('+', '');
                const countryCode = this.extractCountryCode(phone);
                const phoneNumber = phone.replace(countryCode.replace('+', ''), '');

                document.getElementById('countrySelect').value = countryCode;
                document.getElementById('phoneInput').value = phoneNumber;

                // Focus on phone input if it's empty, otherwise focus on button
                if (!phoneNumber) {
                    document.getElementById('phoneInput').focus();
                }
            } else {
                document.getElementById('phoneInput').focus();
            }
        } catch (error) {
            console.log('Could not prefill phone number');
            document.getElementById('phoneInput').focus();
        }
    }

    extractCountryCode(phone) {
        // Common country codes
        const codes = ['+84', '+1', '+86', '+7', '+44', '+49', '+33', '+81', '+82', '+91'];

        for (const code of codes) {
            if (phone.startsWith(code.replace('+', ''))) {
                return code;
            }
        }

        return '+84'; // Default to Vietnam
    }

    async sendVerificationCode() {
        const countryCode = document.getElementById('countrySelect').value;
        const phoneNumber = document.getElementById('phoneInput').value.trim();

        if (!phoneNumber) {
            this.showLoginError('Vui lòng nhập số điện thoại');
            document.getElementById('phoneInput').focus();
            return;
        }

        if (phoneNumber.length < 8 || phoneNumber.length > 15) {
            this.showLoginError('Số điện thoại không hợp lệ (8-15 chữ số)');
            document.getElementById('phoneInput').focus();
            return;
        }

        const fullPhone = countryCode + phoneNumber;
        this.loginData.phoneNumber = fullPhone;

        const btn = document.getElementById('sendCodeBtn');
        this.setButtonLoading(btn, true);

        try {
            const response = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: fullPhone
                })
            });

            const data = await response.json();

            if (data.success) {
                this.loginData.phoneCodeHash = data.phone_code_hash;
                document.getElementById('displayPhone').textContent = fullPhone;
                this.showLoginStep('codeStep');
                this.startResendCountdown();
            } else {
                this.showLoginError(data.error || 'Không thể gửi mã xác thực');
            }
        } catch (error) {
            console.error('Send code failed:', error);
            this.showLoginError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    async verifyCode() {
        const code = document.getElementById('codeInput').value.trim();

        if (!code || code.length !== 5) {
            this.showLoginError('Vui lòng nhập mã xác thực 5 số');
            document.getElementById('codeInput').focus();
            return;
        }

        if (!/^\d{5}$/.test(code)) {
            this.showLoginError('Mã xác thực chỉ được chứa số');
            document.getElementById('codeInput').focus();
            return;
        }

        const btn = document.getElementById('verifyCodeBtn');
        this.setButtonLoading(btn, true);

        try {
            const response = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: this.loginData.phoneNumber,
                    code: code,
                    phone_code_hash: this.loginData.phoneCodeHash
                })
            });

            const data = await response.json();

            if (data.success) {
                if (data.requires_2fa) {
                    this.showLoginStep('twoFactorStep');
                } else {
                    this.loginSuccess(data.user);
                }
            } else {
                this.showLoginError(data.error || 'Mã xác thực không đúng');
            }
        } catch (error) {
            console.error('Verify code failed:', error);
            this.showLoginError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    async verify2FA() {
        const password = document.getElementById('passwordInput').value.trim();

        if (!password) {
            this.showLoginError('Vui lòng nhập mật khẩu hai bước');
            return;
        }

        const btn = document.getElementById('verify2FABtn');
        this.setButtonLoading(btn, true);

        try {
            const response = await fetch('/api/auth/verify-2fa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    password: password
                })
            });

            const data = await response.json();

            if (data.success) {
                this.loginSuccess(data.user);
            } else {
                this.showLoginError(data.error || 'Mật khẩu không đúng');
            }
        } catch (error) {
            console.error('2FA verification failed:', error);
            this.showLoginError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    async resendCode() {
        await this.sendVerificationCode();
    }

    loginSuccess(user) {
        this.isLoggedIn = true;

        // Show success step
        document.getElementById('welcomeUserName').textContent = user.first_name || 'User';
        document.getElementById('welcomeUserPhone').textContent = this.loginData.phoneNumber;
        this.showLoginStep('successStep');

        // Update UI
        setTimeout(() => {
            this.updateUserInfo(user);
            this.hideLoginScreen();
            this.loadChannels();
            this.updateStats();
            this.showNotification('Đăng nhập thành công!', 'success');
        }, 2000);
    }

    updateUserInfo(user) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        const userPhone = document.querySelector('.user-phone');

        statusIndicator.classList.add('connected');
        statusText.textContent = 'Connected';
        userPhone.textContent = user.phone || this.loginData.phoneNumber;
    }

    startResendCountdown() {
        let countdown = 60;
        const resendBtn = document.getElementById('resendBtn');
        const countdownSpan = document.getElementById('countdown');

        resendBtn.disabled = true;

        this.loginData.countdownTimer = setInterval(() => {
            countdown--;
            countdownSpan.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(this.loginData.countdownTimer);
                resendBtn.disabled = false;
                document.getElementById('resendText').textContent = 'Gửi lại mã';
            }
        }, 1000);
    }

    setButtonLoading(button, loading) {
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');

        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
            btnText.style.opacity = '0';
            btnLoading.style.display = 'block';
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            btnText.style.opacity = '1';
            btnLoading.style.display = 'none';
        }
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('loginError');
        const errorMessage = document.getElementById('errorMessage');

        errorMessage.textContent = message;
        errorDiv.style.display = 'flex';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideLoginError();
        }, 5000);
    }

    hideLoginError() {
        document.getElementById('loginError').style.display = 'none';
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('passwordInput');
        const toggleBtn = document.getElementById('togglePassword');
        const icon = toggleBtn.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    showLogoutMenu() {
        if (!this.isLoggedIn) return;

        const confirmed = confirm('Bạn có muốn đăng xuất không?');
        if (confirmed) {
            this.logout();
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });

            this.isLoggedIn = false;
            this.channels = [];
            this.files = [];
            this.currentChannel = null;

            // Clear UI
            this.renderChannelList();
            this.renderFiles();
            this.updateStats();

            // Show login screen
            this.showLoginScreen();
            this.showNotification('Đã đăng xuất thành công', 'info');

        } catch (error) {
            console.error('Logout failed:', error);
            this.showNotification('Lỗi khi đăng xuất', 'error');
        }
    }

    async loadChannels() {
        try {
            const response = await fetch('/api/channels');
            const data = await response.json();
            this.channels = data.channels || [];
            this.renderChannelList();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load channels:', error);
            this.showNotification('Failed to load channels', 'error');
        }
    }

    renderChannelList() {
        const channelList = document.getElementById('channelList');
        
        if (this.channels.length === 0) {
            channelList.innerHTML = `
                <div class="channel-item sample-channel">
                    <div class="channel-avatar">
                        <i class="fas fa-hashtag"></i>
                    </div>
                    <div class="channel-info">
                        <div class="channel-name">No channels added</div>
                        <div class="channel-stats">Add a channel to get started</div>
                    </div>
                </div>
            `;
            return;
        }

        channelList.innerHTML = this.channels.map(channel => `
            <div class="channel-item ${channel.id === this.currentChannel?.id ? 'active' : ''}" 
                 data-channel-id="${channel.id}">
                <div class="channel-avatar">
                    <i class="fas fa-hashtag"></i>
                </div>
                <div class="channel-info">
                    <div class="channel-name">${this.escapeHtml(channel.name)}</div>
                    <div class="channel-stats">${channel.fileCount || 0} files</div>
                </div>
            </div>
        `).join('');

        // Add click events to channel items
        document.querySelectorAll('.channel-item').forEach(item => {
            item.addEventListener('click', () => {
                const channelId = item.dataset.channelId;
                if (channelId) {
                    this.selectChannel(channelId);
                }
            });
        });
    }

    async selectChannel(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;

        this.currentChannel = channel;
        this.renderChannelList(); // Re-render to update active state
        
        // Update content header
        document.getElementById('currentChannelName').textContent = channel.name;
        document.querySelector('.content-subtitle').textContent = `${channel.fileCount || 0} files found`;
        
        // Load channel files
        await this.loadChannelFiles(channelId);
    }

    async loadChannelFiles(channelId) {
        try {
            const response = await fetch(`/api/channels/${channelId}/files`);
            const data = await response.json();
            this.files = data.files || [];
            this.renderFiles();
            this.updatePagination();
        } catch (error) {
            console.error('Failed to load channel files:', error);
            this.showNotification('Failed to load channel files', 'error');
        }
    }

    renderFiles() {
        const fileContainer = document.getElementById('fileContainer');
        
        if (this.files.length === 0) {
            fileContainer.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-folder-open welcome-icon"></i>
                    <h3>No files found</h3>
                    <p>This channel doesn't contain any files or hasn't been scanned yet</p>
                    <button class="primary-btn" onclick="app.startScan()">
                        <i class="fas fa-search"></i>
                        Scan Channel
                    </button>
                </div>
            `;
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageFiles = this.files.slice(startIndex, endIndex);

        if (this.currentView === 'grid') {
            fileContainer.innerHTML = `
                <div class="file-grid">
                    ${pageFiles.map(file => this.renderFileCard(file)).join('')}
                </div>
            `;
        } else {
            fileContainer.innerHTML = `
                <div class="file-list">
                    ${pageFiles.map(file => this.renderFileRow(file)).join('')}
                </div>
            `;
        }

        // Add event listeners to file actions
        this.bindFileEvents();
    }

    renderFileCard(file) {
        const fileIcon = this.getFileIcon(file.file_type);
        const fileSize = this.formatFileSize(file.file_size);
        const fileDate = this.formatDate(file.date);

        return `
            <div class="file-card" data-file-id="${file.id}">
                <div class="file-preview">
                    <i class="fas fa-${fileIcon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span>${fileSize}</span>
                        <span>${fileDate}</span>
                    </div>
                    <div class="file-actions">
                        <button class="file-btn primary" onclick="app.downloadFile('${file.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="file-btn" onclick="app.copyLink('${file.download_link}')">
                            <i class="fas fa-link"></i> Copy Link
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderFileRow(file) {
        const fileIcon = this.getFileIcon(file.file_type);
        const fileSize = this.formatFileSize(file.file_size);
        const fileDate = this.formatDate(file.date);

        return `
            <div class="file-row" data-file-id="${file.id}">
                <div class="file-icon">
                    <i class="fas fa-${fileIcon}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span>${fileSize} • ${fileDate}</span>
                    </div>
                </div>
                <div class="file-row-actions">
                    <button class="file-btn primary" onclick="app.downloadFile('${file.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-btn" onclick="app.copyLink('${file.download_link}')">
                        <i class="fas fa-link"></i>
                    </button>
                </div>
            </div>
        `;
    }

    bindFileEvents() {
        // File events are bound via onclick attributes in the HTML
        // This method can be extended for more complex event handling
    }

    changeView(view) {
        this.currentView = view;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Re-render files with new view
        this.renderFiles();
    }

    searchChannels(query) {
        const channelItems = document.querySelectorAll('.channel-item');
        channelItems.forEach(item => {
            const channelName = item.querySelector('.channel-name').textContent.toLowerCase();
            const matches = channelName.includes(query.toLowerCase());
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    openAddChannelModal() {
        document.getElementById('modalOverlay').classList.add('active');
        document.getElementById('modalChannelInput').focus();
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        // Reset form
        document.getElementById('modalChannelInput').value = '';
        document.querySelector('input[name="channelType"][value="existing"]').checked = true;
        document.getElementById('maxMessages').value = '1000';
    }

    async addChannel() {
        const channelInput = document.getElementById('modalChannelInput').value.trim();
        const channelType = document.querySelector('input[name="channelType"]:checked').value;
        const maxMessages = parseInt(document.getElementById('maxMessages').value);

        if (!channelInput) {
            this.showNotification('Please enter a channel URL or username', 'error');
            return;
        }

        try {
            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel: channelInput,
                    type: channelType,
                    maxMessages: maxMessages
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Channel added successfully', 'success');
                this.closeModal();
                await this.loadChannels();
            } else {
                this.showNotification(data.error || 'Failed to add channel', 'error');
            }
        } catch (error) {
            console.error('Failed to add channel:', error);
            this.showNotification('Failed to add channel', 'error');
        }
    }

    async startScan() {
        const channelInput = document.getElementById('channelInput').value.trim();

        if (!channelInput) {
            this.showNotification('Please enter a channel URL or username', 'error');
            return;
        }

        if (this.isScanning) {
            this.showNotification('Scan already in progress', 'warning');
            return;
        }

        this.isScanning = true;
        this.showProgressModal();

        try {
            const fileTypes = {
                photos: document.getElementById('includePhotos').checked,
                videos: document.getElementById('includeVideos').checked,
                documents: document.getElementById('includeDocuments').checked,
                audio: document.getElementById('includeAudio').checked
            };

            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel: channelInput,
                    fileTypes: fileTypes
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Scan completed successfully', 'success');
                await this.loadChannels();
                document.getElementById('channelInput').value = '';
            } else {
                this.showNotification(data.error || 'Scan failed', 'error');
            }
        } catch (error) {
            console.error('Scan failed:', error);
            this.showNotification('Scan failed', 'error');
        } finally {
            this.isScanning = false;
            this.hideProgressModal();
        }
    }

    showProgressModal() {
        document.getElementById('progressModal').classList.add('active');
        document.getElementById('progressStatus').textContent = 'Initializing...';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('filesFound').textContent = '0';
        document.getElementById('messagesScanned').textContent = '0';
    }

    hideProgressModal() {
        document.getElementById('progressModal').classList.remove('active');
    }

    cancelScan() {
        if (this.isScanning) {
            // Send cancel request to backend
            fetch('/api/scan/cancel', { method: 'POST' })
                .then(() => {
                    this.isScanning = false;
                    this.hideProgressModal();
                    this.showNotification('Scan cancelled', 'warning');
                })
                .catch(error => {
                    console.error('Failed to cancel scan:', error);
                });
        }
    }

    async downloadFile(fileId) {
        try {
            const response = await fetch(`/api/files/${fileId}/download`);
            const data = await response.json();

            if (data.success && data.downloadUrl) {
                // Create a temporary link and trigger download
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = data.filename || 'download';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showNotification('Download started', 'success');
            } else {
                this.showNotification(data.error || 'Download failed', 'error');
            }
        } catch (error) {
            console.error('Download failed:', error);
            this.showNotification('Download failed', 'error');
        }
    }

    async copyLink(link) {
        try {
            await navigator.clipboard.writeText(link);
            this.showNotification('Link copied to clipboard', 'success');
        } catch (error) {
            console.error('Failed to copy link:', error);
            this.showNotification('Failed to copy link', 'error');
        }
    }

    async exportFiles(format) {
        if (this.files.length === 0) {
            this.showNotification('No files to export', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/export/${format}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    files: this.files,
                    channel: this.currentChannel?.name || 'Unknown'
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `telegram_files.${format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                this.showNotification(`Files exported as ${format.toUpperCase()}`, 'success');
            } else {
                this.showNotification('Export failed', 'error');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Export failed', 'error');
        }
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.files.length / this.itemsPerPage);
        const newPage = this.currentPage + direction;

        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderFiles();
            this.updatePagination();
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.files.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        document.querySelector('.page-info').textContent = `Page ${this.currentPage} of ${totalPages}`;
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;
    }

    updateStats() {
        const totalFiles = this.channels.reduce((sum, channel) => sum + (channel.fileCount || 0), 0);
        document.getElementById('totalFiles').textContent = totalFiles.toLocaleString();
        document.getElementById('totalChannels').textContent = this.channels.length;
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #666;">×</button>
            </div>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getFileIcon(fileType) {
        const iconMap = {
            'photo': 'image',
            'video': 'video',
            'document': 'file-alt',
            'audio': 'music',
            'voice': 'microphone',
            'sticker': 'smile',
            'animation': 'gif',
            'video_note': 'video'
        };
        return iconMap[fileType] || 'file';
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openSettings() {
        this.showNotification('Settings panel coming soon', 'info');
    }

    openFilterModal() {
        this.showNotification('Filter options coming soon', 'info');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TeleDriveApp();
});
