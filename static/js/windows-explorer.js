/**
 * Windows Explorer Integration
 * Provides Windows Explorer-like functionality for TeleDrive
 */

// Check if windowsExplorer is already defined
if (typeof window.windowsExplorer === 'undefined') {
    console.log('Loading Windows Explorer integration...');
    
    // Create a simple wrapper that delegates to the existing explorer.js
    window.windowsExplorer = {
        initialized: false,
        
        init: function() {
            if (this.initialized) return;
            
            console.log('Windows Explorer integration initialized');
            this.initialized = true;
            
            // Delegate to existing Windows11Explorer if available
            if (typeof Windows11Explorer !== 'undefined') {
                this.explorer = new Windows11Explorer();
            }
        },
        
        // Delegate methods to the main explorer
        navigate: function(path) {
            if (this.explorer && this.explorer.navigate) {
                this.explorer.navigate(path);
            }
        },
        
        refresh: function() {
            if (this.explorer && this.explorer.refresh) {
                this.explorer.refresh();
            }
        },
        
        selectAll: function() {
            if (this.explorer && this.explorer.selectAll) {
                this.explorer.selectAll();
            }
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.windowsExplorer.init();
        });
    } else {
        window.windowsExplorer.init();
    }
} else {
    console.log('Windows Explorer already loaded');
}
