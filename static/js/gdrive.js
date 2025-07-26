// Google Drive Clone - Enhanced JavaScript
document.addEventListener('DOMContentLoaded', function() {

    // Initialize application
    initializeApp();

    function initializeApp() {
        setupViewToggle();
        setupFileSelection();
        setupCreateButton();
        setupSearch();
        setupFileActions();
        setupSidebarNavigation();
        setupKeyboardShortcuts();
        setupAccessibility();
        setupDragAndDrop();

        console.log('TeleDrive initialized successfully');
    }

    // View Toggle Functionality
    function setupViewToggle() {
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        const filesDisplay = document.getElementById('filesDisplay');

        if (gridViewBtn && listViewBtn && filesDisplay) {
            // Load saved view preference
            const savedView = localStorage.getItem('teledrive-view') || 'grid';
            setView(savedView);

            gridViewBtn.addEventListener('click', () => setView('grid'));
            listViewBtn.addEventListener('click', () => setView('list'));

            function setView(view) {
                if (view === 'grid') {
                    gridViewBtn.classList.add('active');
                    listViewBtn.classList.remove('active');
                    filesDisplay.className = 'gdrive-files-display gdrive-grid-view';
                } else {
                    listViewBtn.classList.add('active');
                    gridViewBtn.classList.remove('active');
                    filesDisplay.className = 'gdrive-files-display gdrive-list-view';
                }
                localStorage.setItem('teledrive-view', view);
            }
        }
    }
    
    // File Selection System
    function setupFileSelection() {
        let selectedFiles = [];

        function updateSelection() {
            const selectedCount = selectedFiles.length;
            updateSelectionUI(selectedCount);

            // Dispatch custom event for other components
            document.dispatchEvent(new CustomEvent('selectionChanged', {
                detail: { count: selectedCount, files: selectedFiles }
            }));
        }

        function updateSelectionUI(count) {
            // Update selection toolbar if exists
            const selectionToolbar = document.querySelector('.gdrive-selection-toolbar');
            const selectionCount = document.querySelector('.gdrive-selection-count');

            if (selectionToolbar && selectionCount) {
                if (count > 0) {
                    selectionToolbar.classList.add('active');
                    selectionCount.textContent = `${count} đã chọn`;
                } else {
                    selectionToolbar.classList.remove('active');
                }
            }
        }

        // File Card Click Handler
        document.addEventListener('click', function(e) {
            const fileCard = e.target.closest('.gdrive-file-card');
            if (fileCard && !e.target.closest('.gdrive-file-actions')) {
                const fileId = fileCard.dataset.id || Math.random().toString(36);
                const checkbox = fileCard.querySelector('.select-checkbox');

                // Handle Ctrl+Click for multi-selection
                if (!e.ctrlKey && !e.metaKey) {
                    // Clear other selections if not holding Ctrl
                    document.querySelectorAll('.gdrive-file-card.selected').forEach(card => {
                        if (card !== fileCard) {
                            card.classList.remove('selected');
                            const cb = card.querySelector('.select-checkbox');
                            if (cb) cb.classList.remove('active');
                        }
                    });
                    selectedFiles = [];
                }

                if (fileCard.classList.contains('selected')) {
                    // Deselect
                    fileCard.classList.remove('selected');
                    if (checkbox) checkbox.classList.remove('active');
                    selectedFiles = selectedFiles.filter(id => id !== fileId);
                } else {
                    // Select
                    fileCard.classList.add('selected');
                    if (checkbox) checkbox.classList.add('active');
                    selectedFiles.push(fileId);
                }

                updateSelection();
            }
        });

        // Clear selection function
        window.clearSelection = function() {
            document.querySelectorAll('.gdrive-file-card.selected').forEach(card => {
                card.classList.remove('selected');
                const checkbox = card.querySelector('.select-checkbox');
                if (checkbox) checkbox.classList.remove('active');
            });
            selectedFiles = [];
            updateSelection();
        };
    }
    
    // Create Button Functionality
    const createButton = document.getElementById('createButton');
    if (createButton) {
        createButton.addEventListener('click', function() {
            showCreateMenu();
        });
    }
    
    function showCreateMenu() {
        // Simple implementation - can be enhanced
        const options = [
            'Thư mục mới',
            'Tải file lên',
            'Quét từ Telegram'
        ];
        
        const choice = prompt('Chọn:\n1. Thư mục mới\n2. Tải file lên\n3. Quét từ Telegram\n\nNhập số (1-3):');
        
        switch(choice) {
            case '1':
                const folderName = prompt('Nhập tên thư mục mới:');
                if (folderName) {
                    alert('Tạo thư mục: ' + folderName);
                    // TODO: Call API to create folder
                }
                break;
            case '2':
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.click();
                input.onchange = function() {
                    if (input.files.length > 0) {
                        alert(`Đã chọn ${input.files.length} file để tải lên`);
                        // TODO: Handle file upload
                    }
                };
                break;
            case '3':
                window.location.href = '/scan';
                break;
        }
    }
    
    // Search Functionality
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const fileCards = document.querySelectorAll('.gdrive-file-card');
            
            fileCards.forEach(card => {
                const fileName = card.querySelector('.gdrive-file-name').textContent.toLowerCase();
                if (fileName.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
    
    // File Actions
    document.addEventListener('click', function(e) {
        const actionBtn = e.target.closest('.gdrive-action-btn');
        if (actionBtn) {
            e.stopPropagation();
            const fileCard = actionBtn.closest('.gdrive-file-card');
            const fileName = fileCard.querySelector('.gdrive-file-name').textContent;
            
            // Simple context menu
            const actions = [
                'Xem trước',
                'Tải xuống', 
                'Chia sẻ',
                'Đổi tên',
                'Xóa'
            ];
            
            const choice = prompt(`File: ${fileName}\n\nChọn hành động:\n1. Xem trước\n2. Tải xuống\n3. Chia sẻ\n4. Đổi tên\n5. Xóa\n\nNhập số (1-5):`);
            
            switch(choice) {
                case '1':
                    alert('Xem trước: ' + fileName);
                    break;
                case '2':
                    alert('Tải xuống: ' + fileName);
                    break;
                case '3':
                    alert('Chia sẻ: ' + fileName);
                    break;
                case '4':
                    const newName = prompt('Nhập tên mới:', fileName);
                    if (newName && newName !== fileName) {
                        alert('Đổi tên thành: ' + newName);
                    }
                    break;
                case '5':
                    if (confirm('Bạn có chắc muốn xóa: ' + fileName + '?')) {
                        alert('Đã xóa: ' + fileName);
                    }
                    break;
            }
        }
    });
    
    // Sidebar Navigation
    document.addEventListener('click', function(e) {
        const navItem = e.target.closest('.gdrive-nav-item');
        if (navItem) {
            // Remove active class from all nav items
            document.querySelectorAll('.gdrive-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked item
            navItem.classList.add('active');
            
            // Handle navigation
            const action = navItem.dataset.action;
            console.log('Navigate to:', action);
            
            // TODO: Implement navigation logic
        }
    });
    
    // Responsive Sidebar Toggle (for mobile)
    function toggleSidebar() {
        const sidebar = document.querySelector('.gdrive-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('mobile-hidden');
        }
    }
    
    // Add mobile styles if needed
    if (window.innerWidth <= 768) {
        const style = document.createElement('style');
        style.textContent = `
            .gdrive-sidebar.mobile-hidden {
                transform: translateX(-100%);
            }
            
            .gdrive-sidebar {
                transition: transform 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            const sidebar = document.querySelector('.gdrive-sidebar');
            if (sidebar) {
                sidebar.classList.remove('mobile-hidden');
            }
        }
    });
    
    // Keyboard Shortcuts
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl+A - Select All
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                selectAllFiles();
            }

            // Escape - Clear Selection
            if (e.key === 'Escape') {
                if (window.clearSelection) window.clearSelection();
            }

            // Delete - Delete selected files
            if (e.key === 'Delete' && document.querySelectorAll('.gdrive-file-card.selected').length > 0) {
                e.preventDefault();
                deleteSelectedFiles();
            }
        });
    }

    function selectAllFiles() {
        document.querySelectorAll('.gdrive-file-card').forEach(card => {
            card.classList.add('selected');
            const checkbox = card.querySelector('.select-checkbox');
            if (checkbox) checkbox.classList.add('active');
        });

        // Trigger selection update
        const event = new Event('click');
        const firstCard = document.querySelector('.gdrive-file-card');
        if (firstCard) firstCard.dispatchEvent(event);
    }

    function deleteSelectedFiles() {
        const selectedCards = document.querySelectorAll('.gdrive-file-card.selected');
        if (selectedCards.length > 0) {
            const fileNames = Array.from(selectedCards).map(card =>
                card.querySelector('.gdrive-file-name').textContent
            );

            if (confirm(`Bạn có chắc muốn xóa ${selectedCards.length} file(s)?\n${fileNames.join(', ')}`)) {
                // TODO: Implement actual deletion
                console.log('Deleting files:', fileNames);
                alert('Tính năng xóa file sẽ được triển khai sau');
            }
        }
    }

    // Accessibility Improvements
    function setupAccessibility() {
        // Add ARIA labels
        document.querySelectorAll('.gdrive-file-card').forEach((card, index) => {
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `File ${index + 1}`);

            // Add keyboard navigation
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });

        // Add ARIA labels to buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
                const icon = button.querySelector('i');
                if (icon) {
                    const iconClass = icon.className;
                    if (iconClass.includes('fa-search')) button.setAttribute('aria-label', 'Tìm kiếm');
                    if (iconClass.includes('fa-th')) button.setAttribute('aria-label', 'Chế độ xem lưới');
                    if (iconClass.includes('fa-list')) button.setAttribute('aria-label', 'Chế độ xem danh sách');
                    if (iconClass.includes('fa-plus')) button.setAttribute('aria-label', 'Tạo mới');
                }
            }
        });
    }

    // Drag and Drop Functionality
    function setupDragAndDrop() {
        const dropOverlay = document.getElementById('dropOverlay');
        const filesDisplay = document.getElementById('filesDisplay');
        let dragCounter = 0;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, handleDragEnter, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, handleDragLeave, false);
        });

        function handleDragEnter(e) {
            dragCounter++;
            if (dropOverlay) {
                dropOverlay.style.display = 'flex';
            }
        }

        function handleDragLeave(e) {
            dragCounter--;
            if (dragCounter === 0 && dropOverlay) {
                dropOverlay.style.display = 'none';
            }
        }

        // Handle dropped files
        document.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            dragCounter = 0;
            if (dropOverlay) {
                dropOverlay.style.display = 'none';
            }

            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length > 0) {
                handleFiles(files);
            }
        }

        function handleFiles(files) {
            console.log('Files dropped:', files.length);

            // Show loading state
            showLoading('Đang tải lên file...');

            // Simulate file upload (replace with actual upload logic)
            setTimeout(() => {
                hideLoading();
                alert(`Đã tải lên ${files.length} file(s) thành công!`);
                // TODO: Implement actual file upload
            }, 2000);
        }
    }

    // Loading State Management
    function showLoading(message = 'Đang tải...') {
        const loadingState = document.getElementById('loadingState');
        const filesDisplay = document.getElementById('filesDisplay');

        if (loadingState && filesDisplay) {
            loadingState.querySelector('span').textContent = message;
            loadingState.style.display = 'flex';
            filesDisplay.style.opacity = '0.5';
        }
    }

    function hideLoading() {
        const loadingState = document.getElementById('loadingState');
        const filesDisplay = document.getElementById('filesDisplay');

        if (loadingState && filesDisplay) {
            loadingState.style.display = 'none';
            filesDisplay.style.opacity = '1';
        }
    }

    // Performance Optimization - Debounced Search
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Expose useful functions globally
    window.TeleDrive = {
        showLoading,
        hideLoading,
        clearSelection: window.clearSelection,
        debounce
    };

    console.log('TeleDrive initialized successfully');
});
