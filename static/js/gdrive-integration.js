/**
 * Google Drive Integration
 * Provides seamless integration between TeleDrive and Google Drive
 */

// Check if gdriveIntegration is already defined
if (typeof window.gdriveIntegration === 'undefined') {
    console.log('Loading Google Drive Integration...');
    
    window.gdriveIntegration = {
        initialized: false,
        isAuthenticated: false,
        
        init: function() {
            if (this.initialized) return;
            
            console.log('Google Drive Integration initialized');
            this.initialized = true;
            
            // Check authentication status
            this.checkAuthStatus();
            
            // Setup UI integration
            this.setupUI();
        },
        
        checkAuthStatus: function() {
            // Check if user is authenticated with Google Drive
            fetch('/api/gdrive/auth-status')
                .then(response => response.json())
                .then(data => {
                    this.isAuthenticated = data.authenticated || false;
                    this.updateUI();
                })
                .catch(error => {
                    console.log('Google Drive auth check failed:', error);
                    this.isAuthenticated = false;
                    this.updateUI();
                });
        },
        
        setupUI: function() {
            // Add Google Drive integration buttons to the UI
            const toolbar = document.querySelector('.toolbar');
            if (toolbar) {
                const gdriveButton = document.createElement('button');
                gdriveButton.innerHTML = '📁 Google Drive';
                gdriveButton.className = 'btn btn-secondary';
                gdriveButton.onclick = () => this.toggleGDriveView();
                toolbar.appendChild(gdriveButton);
            }
        },
        
        updateUI: function() {
            // Update UI based on authentication status
            const gdriveButtons = document.querySelectorAll('[data-gdrive]');
            gdriveButtons.forEach(button => {
                if (this.isAuthenticated) {
                    button.classList.remove('disabled');
                    button.removeAttribute('disabled');
                } else {
                    button.classList.add('disabled');
                    button.setAttribute('disabled', 'true');
                }
            });
        },
        
        toggleGDriveView: function() {
            if (!this.isAuthenticated) {
                this.authenticate();
                return;
            }
            
            // Toggle between local files and Google Drive files
            const mainContent = document.querySelector('main');
            if (mainContent) {
                if (mainContent.classList.contains('gdrive-mode')) {
                    this.showLocalFiles();
                } else {
                    this.showGDriveFiles();
                }
            }
        },
        
        authenticate: function() {
            console.log('Starting Google Drive authentication...');
            window.open('/api/gdrive/auth', 'gdrive-auth', 'width=500,height=600');
        },
        
        showGDriveFiles: function() {
            console.log('Switching to Google Drive view');
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.classList.add('gdrive-mode');
                // Load Google Drive files
                this.loadGDriveFiles();
            }
        },
        
        showLocalFiles: function() {
            console.log('Switching to local files view');
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.classList.remove('gdrive-mode');
                // Reload local files
                if (typeof window.windowsExplorer !== 'undefined') {
                    window.windowsExplorer.refresh();
                }
            }
        },
        
        loadGDriveFiles: function() {
            // Load and display Google Drive files
            fetch('/api/gdrive/files')
                .then(response => response.json())
                .then(files => {
                    this.displayGDriveFiles(files);
                })
                .catch(error => {
                    console.error('Failed to load Google Drive files:', error);
                });
        },
        
        displayGDriveFiles: function(files) {
            // Display Google Drive files in the main content area
            const fileList = document.querySelector('.file-list');
            if (fileList) {
                fileList.innerHTML = '<h3>Google Drive Files</h3>';
                files.forEach(file => {
                    const fileElement = document.createElement('div');
                    fileElement.className = 'file-item gdrive-file';
                    fileElement.innerHTML = `
                        <span class="file-icon">📄</span>
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${file.size || 'Unknown'}</span>
                    `;
                    fileList.appendChild(fileElement);
                });
            }
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.gdriveIntegration.init();
        });
    } else {
        window.gdriveIntegration.init();
    }
} else {
    console.log('Google Drive Integration already loaded');
}
