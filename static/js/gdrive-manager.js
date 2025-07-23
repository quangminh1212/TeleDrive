/**
 * Google Drive Manager
 * Manages Google Drive integration for TeleDrive
 */

// Check if gdriveManager is already defined
if (typeof window.gdriveManager === 'undefined') {
    console.log('Loading Google Drive Manager...');
    
    window.gdriveManager = {
        initialized: false,
        
        init: function() {
            if (this.initialized) return;
            
            console.log('Google Drive Manager initialized');
            this.initialized = true;
            
            // Delegate to existing GDriveManager if available
            if (typeof GDriveManager !== 'undefined') {
                this.manager = new GDriveManager();
            }
        },
        
        // Google Drive specific methods
        authenticate: function() {
            console.log('Google Drive authentication requested');
            if (this.manager && this.manager.authenticate) {
                return this.manager.authenticate();
            }
            return Promise.reject('Google Drive manager not available');
        },
        
        listFiles: function(folderId = 'root') {
            console.log('Listing Google Drive files for folder:', folderId);
            if (this.manager && this.manager.listFiles) {
                return this.manager.listFiles(folderId);
            }
            return Promise.resolve([]);
        },
        
        downloadFile: function(fileId) {
            console.log('Downloading Google Drive file:', fileId);
            if (this.manager && this.manager.downloadFile) {
                return this.manager.downloadFile(fileId);
            }
            return Promise.reject('Download not available');
        },
        
        uploadFile: function(file, folderId = 'root') {
            console.log('Uploading file to Google Drive:', file.name);
            if (this.manager && this.manager.uploadFile) {
                return this.manager.uploadFile(file, folderId);
            }
            return Promise.reject('Upload not available');
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.gdriveManager.init();
        });
    } else {
        window.gdriveManager.init();
    }
} else {
    console.log('Google Drive Manager already loaded');
}
