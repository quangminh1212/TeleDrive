/**
 * Integration script to connect Google Drive interface with existing TeleDrive functionality
 * This script ensures smooth transition between old and new interfaces
 */

// Wait for both the existing TeleDrive scripts and GDriveManager to be loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        initializeGDriveIntegration();
    }, 200);
});

function initializeGDriveIntegration() {
    if (typeof gdriveManager === 'undefined') {
        console.warn('GDriveManager not found, skipping integration');
        return;
    }

    // Luôn sử dụng giao diện Google Drive mặc định
    localStorage.setItem('use-gdrive-interface', 'true');

    // Integrate with existing TeleDrive functionality
    gdriveManager.integrateWithExistingInterface();

    // Override existing functions to work with Google Drive interface
    setupFunctionOverrides();

    // Setup event listeners for seamless integration
    setupIntegrationEventListeners();

    // Force show Google Drive interface immediately
    setTimeout(() => {
        gdriveManager.showGDriveInterface();
        // Force refresh to ensure all elements are visible
        if (typeof gdriveManager.forceRefreshInterface === 'function') {
            gdriveManager.forceRefreshInterface();
        }
    }, 300);

    console.log('Google Drive integration initialized');
}

function setupFunctionOverrides() {
    // Store original functions
    const originalFunctions = {
        loadSessions: window.loadSessions,
        displayFiles: window.displayFiles,
        showFileDetails: window.showFileDetails,
        searchFiles: window.searchFiles
    };

    // Override loadSessions to work with Google Drive interface
    window.loadSessions = function() {
        // Always use Google Drive interface
        if (gdriveManager) {
            gdriveManager.loadFiles();
        } else if (originalFunctions.loadSessions) {
            originalFunctions.loadSessions();
        }
    };

    // Override displayFiles to work with Google Drive interface
    window.displayFiles = function(files, sessionId) {
        // Always use Google Drive interface
        if (gdriveManager) {
            // Convert files to Google Drive format and display
            const gdriveFiles = gdriveManager.convertToGDriveFormat(files, sessionId);
            gdriveManager.files = gdriveFiles;
            gdriveManager.currentSessionId = sessionId;
            gdriveManager.renderFiles();
        } else if (originalFunctions.displayFiles) {
            originalFunctions.displayFiles(files, sessionId);
        }
    };

    // Override searchFiles to work with Google Drive interface
    window.searchFiles = function(query) {
        // Always use Google Drive interface
        if (gdriveManager) {
            gdriveManager.searchFiles(query);
        } else if (originalFunctions.searchFiles) {
            originalFunctions.searchFiles(query);
        }
    };

    // Store original functions for potential restoration
    window._originalTeleDriveFunctions = originalFunctions;
}

function setupIntegrationEventListeners() {
    // Listen for session selection events
    document.addEventListener('sessionSelected', (event) => {
        // Always use Google Drive interface
        if (gdriveManager && event.detail) {
            gdriveManager.loadFiles(event.detail.sessionId);
        }
    });

    // Listen for file scan completion events
    document.addEventListener('scanCompleted', (event) => {
        // Always use Google Drive interface
        if (gdriveManager) {
            // Refresh the current view
            gdriveManager.loadFiles(gdriveManager.currentSessionId);
        }
    });

    // Listen for interface toggle events
    document.addEventListener('interfaceToggled', (event) => {
        const useGDrive = event.detail.useGDrive;
        
        if (gdriveManager) {
            gdriveManager.toggleInterface(useGDrive);
        }
    });

    // Setup mutation observer to detect when files are loaded in the old interface
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // Check if files were added to the old interface
                const filesContainer = document.getElementById('filesContainer');
                if (filesContainer && mutation.target === filesContainer) {
                    // Files were loaded in old interface, but we're using Google Drive interface
                    // This might happen during initial load, so we should switch
                    setTimeout(() => {
                        if (gdriveManager) {
                            gdriveManager.showGDriveInterface();
                            gdriveManager.forceRefreshInterface();
                        }
                    }, 100);
                }
            }
        });
    });

    // Start observing
    const filesContainer = document.getElementById('filesContainer');
    if (filesContainer) {
        observer.observe(filesContainer, { childList: true, subtree: true });
    }
}

function dispatchCustomEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
}

// Utility function to check if Google Drive interface should be used
function shouldUseGDriveInterface() {
    return localStorage.getItem('use-gdrive-interface') !== 'false';
}

// Function to manually trigger interface switch
window.switchToGDriveInterface = function(enable = true) {
    localStorage.setItem('use-gdrive-interface', enable.toString());
    
    if (gdriveManager) {
        gdriveManager.toggleInterface(enable);
    }
    
    dispatchCustomEvent('interfaceToggled', { useGDrive: enable });
};

// Function to get current interface state
window.getCurrentInterface = function() {
    return {
        isGDrive: shouldUseGDriveInterface(),
        manager: gdriveManager
    };
};

// Debug function to restore original TeleDrive functions
window.restoreOriginalFunctions = function() {
    if (window._originalTeleDriveFunctions) {
        Object.assign(window, window._originalTeleDriveFunctions);
        console.log('Original TeleDrive functions restored');
    }
};

// Export for potential use in other scripts
window.gdriveIntegration = {
    initialize: initializeGDriveIntegration,
    switchInterface: window.switchToGDriveInterface,
    getCurrentInterface: window.getCurrentInterface,
    shouldUseGDrive: shouldUseGDriveInterface,
    dispatchEvent: dispatchCustomEvent
};

console.log('Google Drive integration script loaded');
