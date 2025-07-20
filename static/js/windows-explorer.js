/**
 * Windows 11 File Explorer Interface
 * Provides Windows-like file management experience
 */

class Windows11Explorer {
    constructor() {
        this.currentView = 'icons';
        this.currentSort = 'name';
        this.currentSortOrder = 'asc';
        this.selectedItems = new Set();
        this.navigationHistory = [];
        this.historyIndex = -1;
        this.currentPath = 'C:\\VF\\TeleDrive';
        this.clipboard = { items: [], operation: null }; // cut, copy
        this.detailsPaneVisible = false;
        
        this.init();
    }

    init() {
        this.setupRibbonTabs();
        this.setupNavigationControls();
        this.setupAddressBar();
        this.setupSearchBox();
        this.setupNavigationPane();
        this.setupViewControls();
        this.setupFileOperations();
        this.setupDetailsPane();
        this.setupStatusBar();
        this.setupKeyboardShortcuts();
        this.setupContextMenu();
        this.setupFileSelection();

        // Initialize view
        this.updateNavigationButtons();
        this.updateBreadcrumbs();
    }

    // Ribbon Tab Management
    setupRibbonTabs() {
        const tabs = document.querySelectorAll('.ribbon-tab');
        const panels = document.querySelectorAll('.ribbon-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and panels
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));

                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const targetPanel = document.getElementById(tab.dataset.tab + 'Panel');
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    // Navigation Controls
    setupNavigationControls() {
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        const upBtn = document.getElementById('upBtn');

        if (backBtn) {
            backBtn.addEventListener('click', () => this.navigateBack());
        }
        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => this.navigateForward());
        }
        if (upBtn) {
            upBtn.addEventListener('click', () => this.navigateUp());
        }
    }

    navigateBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const path = this.navigationHistory[this.historyIndex];
            this.navigateToPath(path, false);
        }
    }

    navigateForward() {
        if (this.historyIndex < this.navigationHistory.length - 1) {
            this.historyIndex++;
            const path = this.navigationHistory[this.historyIndex];
            this.navigateToPath(path, false);
        }
    }

    navigateUp() {
        const parentPath = this.getParentPath(this.currentPath);
        if (parentPath) {
            this.navigateToPath(parentPath);
        }
    }

    navigateToPath(path, addToHistory = true) {
        if (addToHistory) {
            // Remove any forward history
            this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
            this.navigationHistory.push(path);
            this.historyIndex = this.navigationHistory.length - 1;
        }
        
        this.currentPath = path;
        this.updateBreadcrumbs();
        this.updateNavigationButtons();
        this.loadFiles();
    }

    getParentPath(path) {
        const parts = path.split('\\').filter(p => p);
        if (parts.length <= 1) return null;
        parts.pop();
        return parts.join('\\') || 'C:';
    }

    updateNavigationButtons() {
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        const upBtn = document.getElementById('upBtn');

        if (backBtn) {
            backBtn.disabled = this.historyIndex <= 0;
        }
        if (forwardBtn) {
            forwardBtn.disabled = this.historyIndex >= this.navigationHistory.length - 1;
        }
        if (upBtn) {
            upBtn.disabled = !this.getParentPath(this.currentPath);
        }
    }

    // Address Bar
    setupAddressBar() {
        const addressBar = document.getElementById('addressBar');
        const addressInput = document.getElementById('addressInput');
        const breadcrumbNav = document.getElementById('breadcrumbNav');

        if (addressBar) {
            addressBar.addEventListener('click', () => {
                this.showAddressInput();
            });
        }

        if (addressInput) {
            addressInput.addEventListener('blur', () => {
                this.hideAddressInput();
            });

            addressInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.navigateToPath(addressInput.value);
                    this.hideAddressInput();
                } else if (e.key === 'Escape') {
                    this.hideAddressInput();
                }
            });
        }

        // Breadcrumb navigation
        if (breadcrumbNav) {
            breadcrumbNav.addEventListener('click', (e) => {
                const breadcrumbItem = e.target.closest('.breadcrumb-item');
                if (breadcrumbItem && breadcrumbItem.dataset.path) {
                    this.navigateToPath(breadcrumbItem.dataset.path);
                }
            });
        }
    }

    showAddressInput() {
        const addressInput = document.getElementById('addressInput');
        const breadcrumbNav = document.getElementById('breadcrumbNav');

        if (addressInput && breadcrumbNav) {
            breadcrumbNav.style.display = 'none';
            addressInput.style.display = 'block';
            addressInput.value = this.currentPath;
            addressInput.focus();
            addressInput.select();
        }
    }

    hideAddressInput() {
        const addressInput = document.getElementById('addressInput');
        const breadcrumbNav = document.getElementById('breadcrumbNav');

        if (addressInput && breadcrumbNav) {
            addressInput.style.display = 'none';
            breadcrumbNav.style.display = 'flex';
        }
    }

    updateBreadcrumbs() {
        const breadcrumbNav = document.getElementById('breadcrumbNav');
        if (!breadcrumbNav) return;

        const parts = this.currentPath.split('\\').filter(p => p);
        let html = '';
        let currentPath = '';

        // This PC
        html += `
            <button class="breadcrumb-item" data-path="C:">
                <i class="icon icon-computer"></i>
                <span>This PC</span>
            </button>
        `;

        // Path segments
        parts.forEach((part, index) => {
            currentPath += (index === 0 ? '' : '\\') + part;
            const isLast = index === parts.length - 1;
            
            if (index > 0) {
                html += '<i class="icon icon-chevron-right breadcrumb-separator"></i>';
            }
            
            html += `
                <button class="breadcrumb-item ${isLast ? 'active' : ''}" data-path="${currentPath}">
                    <i class="icon ${index === 0 ? 'icon-drive' : 'icon-folder'}"></i>
                    <span>${part}</span>
                </button>
            `;
        });

        breadcrumbNav.innerHTML = html;
    }

    // Search Box
    setupSearchBox() {
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query) {
                    clearSearch.style.display = 'block';
                    this.performSearch(query);
                } else {
                    clearSearch.style.display = 'none';
                    this.clearSearch();
                }
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                clearSearch.style.display = 'none';
                this.clearSearch();
            });
        }
    }

    performSearch(query) {
        // Implement search functionality
        console.log('Searching for:', query);
    }

    clearSearch() {
        // Clear search results and show normal view
        console.log('Clearing search');
    }

    // Navigation Pane
    setupNavigationPane() {
        const sectionToggles = document.querySelectorAll('.section-toggle');
        
        sectionToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSection(toggle.dataset.section);
            });
        });

        // Navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.path) {
                    this.navigateToPath(item.dataset.path);
                }
            });
        });
    }

    toggleSection(sectionName) {
        const toggle = document.querySelector(`[data-section="${sectionName}"]`);
        const content = document.getElementById(sectionName + 'Content');
        
        if (toggle && content) {
            const isExpanded = toggle.classList.contains('expanded');
            
            if (isExpanded) {
                toggle.classList.remove('expanded');
                toggle.classList.add('collapsed');
                toggle.querySelector('.icon').className = 'icon icon-chevron-right';
                content.style.display = 'none';
            } else {
                toggle.classList.remove('collapsed');
                toggle.classList.add('expanded');
                toggle.querySelector('.icon').className = 'icon icon-chevron-down';
                content.style.display = 'block';
            }
        }
    }

    // View Controls
    setupViewControls() {
        // Ribbon view buttons
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setView(btn.dataset.view);
            });
        });

        // Status bar view mode buttons
        const viewModeBtns = document.querySelectorAll('.view-mode-btn');
        viewModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setView(btn.dataset.view);
            });
        });

        // Zoom controls
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => {
                this.setZoomLevel(parseInt(e.target.value));
            });
        }

        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
    }

    setView(viewMode) {
        this.currentView = viewMode;
        
        // Update active states
        document.querySelectorAll('.view-btn, .view-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });

        // Apply view to files display
        this.applyViewMode();
    }

    applyViewMode() {
        const filesDisplay = document.getElementById('filesDisplay');
        const listHeader = document.getElementById('listHeader');
        
        if (!filesDisplay) return;

        // Remove all view classes
        filesDisplay.className = 'files-display';
        
        // Add current view class
        filesDisplay.classList.add(`${this.currentView}-view`);

        // Show/hide list header
        if (listHeader) {
            listHeader.style.display = this.currentView === 'details' ? 'flex' : 'none';
        }

        // Re-render files with new view
        this.renderFiles();
    }

    setZoomLevel(level) {
        // Implement zoom functionality
        console.log('Setting zoom level:', level);
    }

    zoomIn() {
        const slider = document.getElementById('zoomSlider');
        if (slider && slider.value < slider.max) {
            slider.value = parseInt(slider.value) + 1;
            this.setZoomLevel(parseInt(slider.value));
        }
    }

    zoomOut() {
        const slider = document.getElementById('zoomSlider');
        if (slider && slider.value > slider.min) {
            slider.value = parseInt(slider.value) - 1;
            this.setZoomLevel(parseInt(slider.value));
        }
    }

    // File Operations
    setupFileOperations() {
        // Ribbon buttons
        const cutBtn = document.getElementById('cutBtn');
        const copyBtn = document.getElementById('copyBtn');
        const pasteBtn = document.getElementById('pasteBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const renameBtn = document.getElementById('renameBtn');
        const newFolderBtn = document.getElementById('newFolderBtn');
        const propertiesBtn = document.getElementById('propertiesBtn');

        if (cutBtn) cutBtn.addEventListener('click', () => this.cutSelected());
        if (copyBtn) copyBtn.addEventListener('click', () => this.copySelected());
        if (pasteBtn) pasteBtn.addEventListener('click', () => this.paste());
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteSelected());
        if (renameBtn) renameBtn.addEventListener('click', () => this.renameSelected());
        if (newFolderBtn) newFolderBtn.addEventListener('click', () => this.createNewFolder());
        if (propertiesBtn) propertiesBtn.addEventListener('click', () => this.showProperties());
    }

    cutSelected() {
        if (this.selectedItems.size > 0) {
            this.clipboard = {
                items: Array.from(this.selectedItems),
                operation: 'cut'
            };
            this.updateClipboardButtons();
        }
    }

    copySelected() {
        if (this.selectedItems.size > 0) {
            this.clipboard = {
                items: Array.from(this.selectedItems),
                operation: 'copy'
            };
            this.updateClipboardButtons();
        }
    }

    paste() {
        if (this.clipboard.items.length > 0) {
            console.log(`${this.clipboard.operation}ing items:`, this.clipboard.items);
            // Implement paste functionality
            this.clipboard = { items: [], operation: null };
            this.updateClipboardButtons();
        }
    }

    deleteSelected() {
        if (this.selectedItems.size > 0) {
            const items = Array.from(this.selectedItems);
            if (confirm(`Are you sure you want to delete ${items.length} item(s)?`)) {
                console.log('Deleting items:', items);
                // Implement delete functionality
            }
        }
    }

    renameSelected() {
        if (this.selectedItems.size === 1) {
            const item = Array.from(this.selectedItems)[0];
            console.log('Renaming item:', item);
            // Implement rename functionality
        }
    }

    createNewFolder() {
        const name = prompt('Enter folder name:');
        if (name) {
            console.log('Creating folder:', name);
            // Implement create folder functionality
        }
    }

    showProperties() {
        if (this.selectedItems.size > 0) {
            console.log('Showing properties for:', Array.from(this.selectedItems));
            // Implement properties dialog
        }
    }

    updateClipboardButtons() {
        const pasteBtn = document.getElementById('pasteBtn');
        if (pasteBtn) {
            pasteBtn.disabled = this.clipboard.items.length === 0;
        }
    }

    // Details Pane
    setupDetailsPane() {
        const detailsPaneBtn = document.getElementById('detailsPaneBtn');
        const detailsPaneClose = document.getElementById('detailsPaneClose');

        if (detailsPaneBtn) {
            detailsPaneBtn.addEventListener('click', () => {
                this.toggleDetailsPane();
            });
        }

        if (detailsPaneClose) {
            detailsPaneClose.addEventListener('click', () => {
                this.hideDetailsPane();
            });
        }
    }

    toggleDetailsPane() {
        this.detailsPaneVisible = !this.detailsPaneVisible;
        const detailsPane = document.getElementById('detailsPane');
        
        if (detailsPane) {
            detailsPane.style.display = this.detailsPaneVisible ? 'flex' : 'none';
        }
    }

    hideDetailsPane() {
        this.detailsPaneVisible = false;
        const detailsPane = document.getElementById('detailsPane');
        
        if (detailsPane) {
            detailsPane.style.display = 'none';
        }
    }

    // Status Bar
    setupStatusBar() {
        this.updateStatusBar();
    }

    updateStatusBar() {
        const itemCount = document.getElementById('itemCount');
        const selectedCount = document.getElementById('selectedCount');

        if (itemCount) {
            const count = this.files ? this.files.length : 0;
            itemCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;
        }

        if (selectedCount) {
            const count = this.selectedItems.size;
            if (count > 0) {
                selectedCount.textContent = ` • ${count} item${count !== 1 ? 's' : ''} selected`;
                selectedCount.style.display = 'inline';
            } else {
                selectedCount.style.display = 'none';
            }
        }
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch (e.key) {
                    case 'a':
                        e.preventDefault();
                        this.selectAll();
                        break;
                    case 'c':
                        e.preventDefault();
                        this.copySelected();
                        break;
                    case 'x':
                        e.preventDefault();
                        this.cutSelected();
                        break;
                    case 'v':
                        e.preventDefault();
                        this.paste();
                        break;
                }
            } else {
                switch (e.key) {
                    case 'Delete':
                        e.preventDefault();
                        this.deleteSelected();
                        break;
                    case 'F2':
                        e.preventDefault();
                        this.renameSelected();
                        break;
                    case 'F5':
                        e.preventDefault();
                        this.refresh();
                        break;
                }
            }
        });
    }

    selectAll() {
        // Implement select all functionality
        console.log('Selecting all items');
    }

    refresh() {
        console.log('Refreshing view');
        this.loadFiles();
    }

    // File Loading and Rendering
    loadFiles() {
        // This will be integrated with existing TeleDrive file loading
        console.log('Loading files for path:', this.currentPath);
        this.updateStatusBar();
    }

    renderFiles() {
        // This will be integrated with existing TeleDrive file rendering
        console.log('Rendering files in', this.currentView, 'view');
    }

    // Context Menu
    setupContextMenu() {
        // Create context menu if it doesn't exist
        let contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) {
            contextMenu = this.createContextMenu();
            document.body.appendChild(contextMenu);
        }

        // Right-click on files area
        const filesDisplay = document.getElementById('filesDisplay');
        if (filesDisplay) {
            filesDisplay.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, 'background');
            });
        }

        // Right-click on file items
        document.addEventListener('contextmenu', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, 'file', fileItem);
            }
        });

        // Hide context menu on click outside
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    createContextMenu() {
        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.className = 'context-menu';

        menu.innerHTML = `
            <div class="context-menu-item" data-action="open">
                <i class="icon icon-folder-open"></i>
                <span>Open</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="cut">
                <i class="icon icon-cut"></i>
                <span>Cut</span>
            </div>
            <div class="context-menu-item" data-action="copy">
                <i class="icon icon-copy"></i>
                <span>Copy</span>
            </div>
            <div class="context-menu-item" data-action="paste">
                <i class="icon icon-paste"></i>
                <span>Paste</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="delete">
                <i class="icon icon-trash"></i>
                <span>Delete</span>
            </div>
            <div class="context-menu-item" data-action="rename">
                <i class="icon icon-edit"></i>
                <span>Rename</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="properties">
                <i class="icon icon-info"></i>
                <span>Properties</span>
            </div>
        `;

        // Add event listeners to menu items
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item && !item.classList.contains('disabled')) {
                const action = item.dataset.action;
                this.handleContextMenuAction(action);
                this.hideContextMenu();
            }
        });

        return menu;
    }

    showContextMenu(x, y, type, target = null) {
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;

        // Update menu items based on context
        this.updateContextMenuItems(type, target);

        // Position menu
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';

        // Adjust position if menu goes off screen
        const rect = contextMenu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (rect.right > windowWidth) {
            contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > windowHeight) {
            contextMenu.style.top = (y - rect.height) + 'px';
        }
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }

    updateContextMenuItems(type, target) {
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;

        const items = contextMenu.querySelectorAll('.context-menu-item');

        items.forEach(item => {
            const action = item.dataset.action;
            let disabled = false;

            switch (action) {
                case 'open':
                    disabled = type !== 'file';
                    break;
                case 'cut':
                case 'copy':
                case 'delete':
                case 'rename':
                    disabled = type !== 'file' || this.selectedItems.size === 0;
                    break;
                case 'paste':
                    disabled = this.clipboard.items.length === 0;
                    break;
                case 'properties':
                    disabled = type !== 'file' || this.selectedItems.size === 0;
                    break;
            }

            item.classList.toggle('disabled', disabled);
        });
    }

    handleContextMenuAction(action) {
        switch (action) {
            case 'open':
                this.openSelected();
                break;
            case 'cut':
                this.cutSelected();
                break;
            case 'copy':
                this.copySelected();
                break;
            case 'paste':
                this.paste();
                break;
            case 'delete':
                this.deleteSelected();
                break;
            case 'rename':
                this.renameSelected();
                break;
            case 'properties':
                this.showProperties();
                break;
        }
    }

    openSelected() {
        if (this.selectedItems.size === 1) {
            const item = Array.from(this.selectedItems)[0];
            console.log('Opening item:', item);
            // Implement open functionality
        }
    }

    // File Selection
    setupFileSelection() {
        const filesDisplay = document.getElementById('filesDisplay');
        if (!filesDisplay) return;

        let isSelecting = false;
        let startX, startY;
        let selectionRect;

        // Mouse down for selection rectangle
        filesDisplay.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !e.target.closest('.file-item')) { // Left click on empty space
                isSelecting = true;
                startX = e.clientX;
                startY = e.clientY;

                // Clear existing selection if not holding Ctrl
                if (!e.ctrlKey) {
                    this.clearSelection();
                }

                // Create selection rectangle
                selectionRect = document.createElement('div');
                selectionRect.className = 'selection-rectangle';
                selectionRect.style.left = startX + 'px';
                selectionRect.style.top = startY + 'px';
                selectionRect.style.display = 'block';
                document.body.appendChild(selectionRect);

                e.preventDefault();
            }
        });

        // Mouse move for selection rectangle
        document.addEventListener('mousemove', (e) => {
            if (isSelecting && selectionRect) {
                const currentX = e.clientX;
                const currentY = e.clientY;

                const left = Math.min(startX, currentX);
                const top = Math.min(startY, currentY);
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);

                selectionRect.style.left = left + 'px';
                selectionRect.style.top = top + 'px';
                selectionRect.style.width = width + 'px';
                selectionRect.style.height = height + 'px';

                // Select items within rectangle
                this.selectItemsInRectangle(left, top, width, height);
            }
        });

        // Mouse up to end selection
        document.addEventListener('mouseup', (e) => {
            if (isSelecting) {
                isSelecting = false;
                if (selectionRect) {
                    selectionRect.remove();
                    selectionRect = null;
                }
            }
        });

        // Click on file items
        filesDisplay.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                this.handleFileItemClick(fileItem, e);
            }
        });

        // Double-click on file items
        filesDisplay.addEventListener('dblclick', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                this.handleFileItemDoubleClick(fileItem);
            }
        });
    }

    handleFileItemClick(fileItem, event) {
        const itemId = fileItem.dataset.id;

        if (event.ctrlKey) {
            // Toggle selection
            if (this.selectedItems.has(itemId)) {
                this.selectedItems.delete(itemId);
                fileItem.classList.remove('selected');
            } else {
                this.selectedItems.add(itemId);
                fileItem.classList.add('selected');
            }
        } else if (event.shiftKey && this.selectedItems.size > 0) {
            // Range selection
            this.selectRange(fileItem);
        } else {
            // Single selection
            this.clearSelection();
            this.selectedItems.add(itemId);
            fileItem.classList.add('selected');
        }

        this.updateSelectionUI();
        this.updateDetailsPane();
    }

    handleFileItemDoubleClick(fileItem) {
        const itemId = fileItem.dataset.id;
        console.log('Double-clicking item:', itemId);
        // Implement double-click functionality (open file/folder)
    }

    selectItemsInRectangle(left, top, width, height) {
        const fileItems = document.querySelectorAll('.file-item');

        fileItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const itemLeft = rect.left;
            const itemTop = rect.top;
            const itemRight = rect.right;
            const itemBottom = rect.bottom;

            // Check if item intersects with selection rectangle
            const intersects = !(itemRight < left ||
                               itemLeft > left + width ||
                               itemBottom < top ||
                               itemTop > top + height);

            if (intersects) {
                const itemId = item.dataset.id;
                this.selectedItems.add(itemId);
                item.classList.add('selected');
            }
        });

        this.updateSelectionUI();
    }

    selectRange(endItem) {
        // Implement range selection logic
        console.log('Selecting range to:', endItem.dataset.id);
    }

    clearSelection() {
        this.selectedItems.clear();
        document.querySelectorAll('.file-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        // Update toolbar button states
        const hasSelection = this.selectedItems.size > 0;
        const singleSelection = this.selectedItems.size === 1;

        const cutBtn = document.getElementById('cutBtn');
        const copyBtn = document.getElementById('copyBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const renameBtn = document.getElementById('renameBtn');
        const propertiesBtn = document.getElementById('propertiesBtn');

        if (cutBtn) cutBtn.disabled = !hasSelection;
        if (copyBtn) copyBtn.disabled = !hasSelection;
        if (deleteBtn) deleteBtn.disabled = !hasSelection;
        if (renameBtn) renameBtn.disabled = !singleSelection;
        if (propertiesBtn) propertiesBtn.disabled = !hasSelection;

        // Update status bar
        this.updateStatusBar();
    }

    updateDetailsPane() {
        if (!this.detailsPaneVisible) return;

        const detailsContent = document.getElementById('detailsContent');
        if (!detailsContent) return;

        if (this.selectedItems.size === 0) {
            detailsContent.innerHTML = `
                <div class="no-selection">
                    <i class="icon icon-info"></i>
                    <p>Select an item to view its details</p>
                </div>
            `;
        } else if (this.selectedItems.size === 1) {
            const itemId = Array.from(this.selectedItems)[0];
            // Show details for single item
            detailsContent.innerHTML = `
                <div class="file-details">
                    <h4>File Details</h4>
                    <p>Item ID: ${itemId}</p>
                    <p>More details would go here...</p>
                </div>
            `;
        } else {
            detailsContent.innerHTML = `
                <div class="multiple-selection">
                    <h4>Multiple Items Selected</h4>
                    <p>${this.selectedItems.size} items selected</p>
                </div>
            `;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.windowsExplorer = new Windows11Explorer();
});
