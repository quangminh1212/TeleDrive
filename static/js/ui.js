/**
 * TeleDrive - UI Interactions
 * Simple and clean UI interactions for modern interface
 */

class TeleDriveUI {
    constructor() {
        this.init();
    }

    init() {
        this.setupSidebar();
        this.setupFileCards();
        this.setupSearch();
        this.setupViewToggle();
        this.setupCreateButton();
    }

    // Sidebar functionality
    setupSidebar() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.querySelector('.gdrive-sidebar');
        
        if (mobileMenuToggle && sidebar) {
            mobileMenuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                document.body.classList.toggle('sidebar-open');
            });
        }

        // Navigation items
        document.querySelectorAll('.gdrive-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all items
                document.querySelectorAll('.gdrive-nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                // Add active class to clicked item
                item.classList.add('active');
            });
        });
    }

    // File card interactions
    setupFileCards() {
        document.querySelectorAll('.gdrive-file-card').forEach(card => {
            // Hover effects
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });

            // Click to select
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.gdrive-file-actions')) {
                    card.classList.toggle('selected');
                    this.updateSelectionCount();
                }
            });

            // Double click to open
            card.addEventListener('dblclick', () => {
                this.openFile(card);
            });
        });
    }

    // Search functionality
    setupSearch() {
        const searchInput = document.querySelector('.gdrive-search input');
        
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value);
                }, 300);
            });

            searchInput.addEventListener('focus', () => {
                searchInput.parentElement.classList.add('focused');
            });

            searchInput.addEventListener('blur', () => {
                searchInput.parentElement.classList.remove('focused');
            });
        }
    }

    // View toggle functionality
    setupViewToggle() {
        const viewToggleBtn = document.getElementById('viewToggleButton');
        const filesDisplay = document.querySelector('.gdrive-files-display');
        
        if (viewToggleBtn && filesDisplay) {
            viewToggleBtn.addEventListener('click', () => {
                const isGridView = filesDisplay.classList.contains('gdrive-grid-view');
                
                if (isGridView) {
                    filesDisplay.classList.remove('gdrive-grid-view');
                    filesDisplay.classList.add('gdrive-list-view');
                    viewToggleBtn.querySelector('i').className = 'fas fa-th';
                } else {
                    filesDisplay.classList.remove('gdrive-list-view');
                    filesDisplay.classList.add('gdrive-grid-view');
                    viewToggleBtn.querySelector('i').className = 'fas fa-list';
                }
            });
        }
    }

    // Create button functionality
    setupCreateButton() {
        const createButton = document.getElementById('createButton');
        
        if (createButton) {
            createButton.addEventListener('click', () => {
                this.showCreateMenu();
            });
        }
    }

    // Helper methods
    updateSelectionCount() {
        const selectedCards = document.querySelectorAll('.gdrive-file-card.selected');
        const count = selectedCards.length;
        
        // Update selection toolbar if exists
        const selectionToolbar = document.querySelector('.selection-toolbar');
        if (selectionToolbar) {
            if (count > 0) {
                selectionToolbar.style.display = 'flex';
                selectionToolbar.querySelector('.selection-count').textContent = `${count} selected`;
            } else {
                selectionToolbar.style.display = 'none';
            }
        }
    }

    performSearch(query) {
        const fileCards = document.querySelectorAll('.gdrive-file-card');
        
        fileCards.forEach(card => {
            const fileName = card.querySelector('.gdrive-file-name').textContent.toLowerCase();
            const matches = fileName.includes(query.toLowerCase());
            
            card.style.display = matches ? 'flex' : 'none';
        });
    }

    openFile(card) {
        const fileName = card.querySelector('.gdrive-file-name').textContent;
        const fileType = card.dataset.type;
        
        console.log(`Opening file: ${fileName} (${fileType})`);
        
        // Add your file opening logic here
        if (fileType === 'folder') {
            // Navigate to folder
            window.location.href = `/folder/${fileName}`;
        } else {
            // Open file preview or download
            this.showFilePreview(card);
        }
    }

    showFilePreview(card) {
        // Create and show file preview modal
        const modal = document.createElement('div');
        modal.className = 'file-preview-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${card.querySelector('.gdrive-file-name').textContent}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>File preview will be implemented here</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal functionality
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.modal-backdrop').addEventListener('click', () => {
            modal.remove();
        });
    }

    showCreateMenu() {
        // Create dropdown menu for create button
        const menu = document.createElement('div');
        menu.className = 'create-dropdown-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="upload">
                <i class="fas fa-upload"></i>
                <span>Upload Files</span>
            </div>
            <div class="menu-item" data-action="folder">
                <i class="fas fa-folder-plus"></i>
                <span>New Folder</span>
            </div>
            <div class="menu-item" data-action="scan">
                <i class="fas fa-sync"></i>
                <span>Scan Telegram</span>
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Position menu
        const createButton = document.getElementById('createButton');
        const rect = createButton.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + 8}px`;
        menu.style.left = `${rect.left}px`;
        
        // Handle menu item clicks
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleCreateAction(action);
                menu.remove();
            });
        });
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && !createButton.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    handleCreateAction(action) {
        switch (action) {
            case 'upload':
                document.getElementById('uploadButton')?.click();
                break;
            case 'folder':
                const folderName = prompt('Enter folder name:');
                if (folderName) {
                    this.createFolder(folderName);
                }
                break;
            case 'scan':
                document.getElementById('scanButton')?.click();
                break;
        }
    }

    createFolder(name) {
        // Add folder creation logic here
        console.log(`Creating folder: ${name}`);
    }

    // Notification system
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.teleDriveUI = new TeleDriveUI();
});
