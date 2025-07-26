// Google Drive Clone - JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    // View Toggle Functionality
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const filesDisplay = document.getElementById('filesDisplay');
    
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', function() {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            filesDisplay.className = 'gdrive-files-display gdrive-grid-view';
        });
        
        listViewBtn.addEventListener('click', function() {
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            filesDisplay.className = 'gdrive-files-display gdrive-list-view';
        });
    }
    
    // File Selection
    let selectedFiles = [];
    
    function updateSelection() {
        const selectedCount = selectedFiles.length;
        // Update UI based on selection
        console.log(`${selectedCount} files selected`);
    }
    
    // File Card Click Handler
    document.addEventListener('click', function(e) {
        const fileCard = e.target.closest('.gdrive-file-card');
        if (fileCard && !e.target.closest('.gdrive-file-actions')) {
            const fileId = fileCard.dataset.id;
            const checkbox = fileCard.querySelector('.select-checkbox');
            
            if (fileCard.classList.contains('selected')) {
                // Deselect
                fileCard.classList.remove('selected');
                checkbox.classList.remove('active');
                selectedFiles = selectedFiles.filter(id => id !== fileId);
            } else {
                // Select
                fileCard.classList.add('selected');
                checkbox.classList.add('active');
                selectedFiles.push(fileId);
            }
            
            updateSelection();
        }
    });
    
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
    
    console.log('Google Drive Clone initialized');
});
