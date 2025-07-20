/**
 * Test script to verify all buttons and functionality work correctly
 * This script will be loaded in development mode to test the interface
 */

class TeleDriveButtonTester {
    constructor() {
        this.testResults = [];
        this.init();
    }

    init() {
        console.log('🧪 TeleDrive Button Tester initialized');
        this.addTestButton();
        this.setupTestListeners();
    }

    addTestButton() {
        // Add a floating test button
        const testBtn = document.createElement('button');
        testBtn.innerHTML = '🧪 Test All';
        testBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 9999;
            background: #ff4444;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        testBtn.onclick = () => this.runAllTests();
        document.body.appendChild(testBtn);
    }

    setupTestListeners() {
        // Listen for all button clicks to log them
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                const btn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
                const btnId = btn.id || btn.className || 'unnamed-button';
                console.log(`🔘 Button clicked: ${btnId}`, btn);
            }
        });
    }

    async runAllTests() {
        console.log('🚀 Starting comprehensive button tests...');
        this.testResults = [];

        // Test all buttons systematically
        await this.testToolbarButtons();
        await this.testViewToggleButtons();
        await this.testSearchFunctionality();
        await this.testContextMenus();
        await this.testModalFunctionality();
        await this.testBulkOperations();
        await this.testKeyboardShortcuts();
        await this.testInterfaceToggle();

        this.displayTestResults();
    }

    async testToolbarButtons() {
        console.log('📊 Testing toolbar buttons...');
        
        const tests = [
            { id: 'newBtn', name: 'New Button' },
            { id: 'settingsBtn', name: 'Settings Button' },
            { id: 'toggleInterfaceBtn', name: 'Interface Toggle Button' },
            { id: 'searchFilterBtn', name: 'Search Filter Button' }
        ];

        for (const test of tests) {
            const btn = document.getElementById(test.id);
            if (btn) {
                this.testResults.push({
                    test: test.name,
                    status: 'FOUND',
                    element: btn,
                    clickable: !btn.disabled
                });
                
                // Test click event
                try {
                    btn.click();
                    this.testResults.push({
                        test: `${test.name} Click`,
                        status: 'SUCCESS',
                        message: 'Click event triggered'
                    });
                } catch (error) {
                    this.testResults.push({
                        test: `${test.name} Click`,
                        status: 'ERROR',
                        message: error.message
                    });
                }
            } else {
                this.testResults.push({
                    test: test.name,
                    status: 'NOT_FOUND',
                    message: `Button with ID ${test.id} not found`
                });
            }
            
            await this.delay(100);
        }
    }

    async testViewToggleButtons() {
        console.log('👁️ Testing view toggle buttons...');
        
        const gridBtn = document.querySelector('[data-view="grid"]');
        const listBtn = document.querySelector('[data-view="list"]');
        
        if (gridBtn && listBtn) {
            // Test grid view
            gridBtn.click();
            await this.delay(200);
            const isGridActive = gridBtn.classList.contains('active');
            
            this.testResults.push({
                test: 'Grid View Toggle',
                status: isGridActive ? 'SUCCESS' : 'FAILED',
                message: `Grid view ${isGridActive ? 'activated' : 'not activated'}`
            });
            
            // Test list view
            listBtn.click();
            await this.delay(200);
            const isListActive = listBtn.classList.contains('active');
            
            this.testResults.push({
                test: 'List View Toggle',
                status: isListActive ? 'SUCCESS' : 'FAILED',
                message: `List view ${isListActive ? 'activated' : 'not activated'}`
            });
        } else {
            this.testResults.push({
                test: 'View Toggle Buttons',
                status: 'NOT_FOUND',
                message: 'View toggle buttons not found'
            });
        }
    }

    async testSearchFunctionality() {
        console.log('🔍 Testing search functionality...');
        
        const searchInput = document.getElementById('gdriveSearchInput');
        if (searchInput) {
            // Test search input
            searchInput.focus();
            searchInput.value = 'test search';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.testResults.push({
                test: 'Search Input',
                status: 'SUCCESS',
                message: 'Search input functional'
            });
            
            // Clear search
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            this.testResults.push({
                test: 'Search Input',
                status: 'NOT_FOUND',
                message: 'Search input not found'
            });
        }
    }

    async testContextMenus() {
        console.log('📋 Testing context menus...');
        
        // Try to find a file element to right-click
        const fileElement = document.querySelector('.gdrive-file-card, .gdrive-list-item');
        if (fileElement) {
            // Simulate right-click
            const rightClickEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                button: 2
            });
            
            fileElement.dispatchEvent(rightClickEvent);
            
            await this.delay(100);
            
            const contextMenu = document.getElementById('gdriveContextMenu');
            const isVisible = contextMenu && contextMenu.style.display === 'block';
            
            this.testResults.push({
                test: 'Context Menu',
                status: isVisible ? 'SUCCESS' : 'FAILED',
                message: `Context menu ${isVisible ? 'appeared' : 'did not appear'}`
            });
            
            // Hide context menu
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
        } else {
            this.testResults.push({
                test: 'Context Menu',
                status: 'SKIPPED',
                message: 'No file elements found to test context menu'
            });
        }
    }

    async testModalFunctionality() {
        console.log('🪟 Testing modal functionality...');
        
        const modal = document.getElementById('gdriveModal');
        const closeBtn = document.getElementById('gdriveModalClose');
        
        if (modal && closeBtn) {
            // Show modal
            modal.classList.add('show');
            await this.delay(100);
            
            const isVisible = modal.classList.contains('show');
            this.testResults.push({
                test: 'Modal Show',
                status: isVisible ? 'SUCCESS' : 'FAILED',
                message: `Modal ${isVisible ? 'shown' : 'not shown'}`
            });
            
            // Test close button
            closeBtn.click();
            await this.delay(300);
            
            const isHidden = !modal.classList.contains('show');
            this.testResults.push({
                test: 'Modal Close',
                status: isHidden ? 'SUCCESS' : 'FAILED',
                message: `Modal ${isHidden ? 'closed' : 'not closed'}`
            });
        } else {
            this.testResults.push({
                test: 'Modal Functionality',
                status: 'NOT_FOUND',
                message: 'Modal elements not found'
            });
        }
    }

    async testBulkOperations() {
        console.log('📦 Testing bulk operations...');
        
        const bulkToolbar = document.getElementById('gdriveBulkToolbar');
        const bulkButtons = [
            'bulkDownloadBtn',
            'bulkShareBtn',
            'bulkStarBtn',
            'bulkMoveBtn',
            'bulkDeleteBtn',
            'clearSelectionBtn'
        ];
        
        for (const btnId of bulkButtons) {
            const btn = document.getElementById(btnId);
            this.testResults.push({
                test: `Bulk Operation: ${btnId}`,
                status: btn ? 'FOUND' : 'NOT_FOUND',
                message: btn ? 'Button exists' : 'Button not found'
            });
        }
    }

    async testKeyboardShortcuts() {
        console.log('⌨️ Testing keyboard shortcuts...');
        
        const shortcuts = [
            { key: 'Escape', description: 'Escape key' },
            { key: 'Delete', description: 'Delete key' },
            { key: 'a', ctrlKey: true, description: 'Ctrl+A (Select All)' }
        ];
        
        for (const shortcut of shortcuts) {
            try {
                const event = new KeyboardEvent('keydown', {
                    key: shortcut.key,
                    ctrlKey: shortcut.ctrlKey || false,
                    bubbles: true
                });
                
                document.dispatchEvent(event);
                
                this.testResults.push({
                    test: `Keyboard: ${shortcut.description}`,
                    status: 'SUCCESS',
                    message: 'Keyboard event dispatched'
                });
            } catch (error) {
                this.testResults.push({
                    test: `Keyboard: ${shortcut.description}`,
                    status: 'ERROR',
                    message: error.message
                });
            }
            
            await this.delay(50);
        }
    }

    async testInterfaceToggle() {
        console.log('🔄 Testing interface toggle...');
        
        const toggleBtn = document.getElementById('toggleInterfaceBtn');
        if (toggleBtn) {
            const initialState = localStorage.getItem('use-gdrive-interface');
            
            toggleBtn.click();
            await this.delay(200);
            
            const newState = localStorage.getItem('use-gdrive-interface');
            const stateChanged = initialState !== newState;
            
            this.testResults.push({
                test: 'Interface Toggle',
                status: stateChanged ? 'SUCCESS' : 'FAILED',
                message: `Interface state ${stateChanged ? 'changed' : 'unchanged'}`
            });
            
            // Restore original state
            if (initialState) {
                localStorage.setItem('use-gdrive-interface', initialState);
            }
        } else {
            this.testResults.push({
                test: 'Interface Toggle',
                status: 'NOT_FOUND',
                message: 'Interface toggle button not found'
            });
        }
    }

    displayTestResults() {
        console.log('📊 Test Results Summary:');
        console.log('========================');
        
        const summary = {
            total: this.testResults.length,
            success: this.testResults.filter(r => r.status === 'SUCCESS').length,
            failed: this.testResults.filter(r => r.status === 'FAILED').length,
            error: this.testResults.filter(r => r.status === 'ERROR').length,
            notFound: this.testResults.filter(r => r.status === 'NOT_FOUND').length,
            skipped: this.testResults.filter(r => r.status === 'SKIPPED').length
        };
        
        console.log(`✅ Success: ${summary.success}`);
        console.log(`❌ Failed: ${summary.failed}`);
        console.log(`🚫 Error: ${summary.error}`);
        console.log(`❓ Not Found: ${summary.notFound}`);
        console.log(`⏭️ Skipped: ${summary.skipped}`);
        console.log(`📊 Total: ${summary.total}`);
        
        // Show detailed results
        console.log('\n📋 Detailed Results:');
        this.testResults.forEach((result, index) => {
            const icon = this.getStatusIcon(result.status);
            console.log(`${icon} ${result.test}: ${result.message || result.status}`);
        });
        
        // Show results in UI
        this.showResultsModal(summary);
    }

    getStatusIcon(status) {
        const icons = {
            'SUCCESS': '✅',
            'FAILED': '❌',
            'ERROR': '🚫',
            'NOT_FOUND': '❓',
            'SKIPPED': '⏭️',
            'FOUND': '🔍'
        };
        return icons[status] || '❔';
    }

    showResultsModal(summary) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        content.innerHTML = `
            <h2>🧪 Test Results</h2>
            <div style="margin: 20px 0;">
                <div>✅ Success: ${summary.success}</div>
                <div>❌ Failed: ${summary.failed}</div>
                <div>🚫 Error: ${summary.error}</div>
                <div>❓ Not Found: ${summary.notFound}</div>
                <div>⏭️ Skipped: ${summary.skipped}</div>
                <div><strong>📊 Total: ${summary.total}</strong></div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: #1a73e8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize tester when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only load in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        new TeleDriveButtonTester();
    }
});

console.log('🧪 TeleDrive Button Tester script loaded');
