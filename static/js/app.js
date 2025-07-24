/**
 * TeleDrive - Core Application JavaScript
 * Tích hợp tất cả các chức năng cần thiết từ các file JavaScript hiện có
 */

/**
 * Khởi tạo ứng dụng TeleDrive khi trang đã tải xong
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('TeleDrive application initializing...');

    // Thiết lập ứng dụng
    setupApplication();

    // Khởi tạo giao diện Google Drive
    initGDriveUI();
    
    // Sửa vấn đề encoding tiếng Việt
    initEncodingFixes();

    console.log('TeleDrive application initialized.');
});

/**
 * Thiết lập ứng dụng và các event listeners
 */
function setupApplication() {
    // Lắng nghe sự kiện click trên toàn bộ ứng dụng
    document.addEventListener('click', function(event) {
        // Đóng tất cả các menu khi click ra ngoài
        closePopupsIfClickedOutside(event);
    });

    // Thiết lập các event listeners cho các nút tương tác
    setupEventListeners();

    // Thiết lập tính năng kéo thả (drag and drop)
    setupDragAndDrop();
}

/**
 * Thiết lập các event listeners cho các nút và thành phần tương tác
 */
function setupEventListeners() {
    // Nút chuyển đổi chế độ xem
    const viewButtons = document.querySelectorAll('.gdrive-view-btn');
    if (viewButtons && viewButtons.length > 0) {
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const viewType = this.getAttribute('data-view');
                switchView(viewType);
                
                // Cập nhật trạng thái nút
                viewButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // Nút tìm kiếm
    const searchInput = document.getElementById('gdriveSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchFiles(this.value);
        });
    }

    // Nút tạo mới
    const newBtn = document.getElementById('newBtn');
    if (newBtn) {
        newBtn.addEventListener('click', function() {
            showCreateNewMenu();
        });
    }

    // Nút xóa lựa chọn
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function() {
            clearSelection();
        });
    }
}

/**
 * Thiết lập tính năng kéo thả (drag and drop) cho file
 */
function setupDragAndDrop() {
    const dropArea = document.getElementById('gdriveFilesDisplay');
    if (!dropArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, function() {
            dropArea.classList.add('drag-over-upload');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, function() {
            dropArea.classList.remove('drag-over-upload');
        });
    });

    // Xử lý sự kiện khi file được thả
    dropArea.addEventListener('drop', function(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFilesUpload(files);
        }
    });
}

/**
 * Khởi tạo giao diện Google Drive
 */
function initGDriveUI() {
    // Luôn sử dụng giao diện Google Drive mặc định
    localStorage.setItem('use-gdrive-interface', 'true');
    
    // Hiển thị giao diện Google Drive ngay lập tức
    const gdriveLayout = document.getElementById('gdriveLayout');
    const welcomeScreen = document.getElementById('welcomeScreen');
    
    if (gdriveLayout) {
        gdriveLayout.style.display = 'flex';
    }
    
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    // Cập nhật các phần tử giao diện tiếng Việt
    updateUITextElements();

    // Ẩn giao diện Windows Explorer nếu có
    const explorerRibbon = document.querySelector('.explorer-ribbon');
    if (explorerRibbon) {
        explorerRibbon.style.display = 'none';
    }
}

/**
 * Cập nhật các phần tử giao diện với văn bản tiếng Việt
 */
function updateUITextElements() {
    // Cập nhật placeholder tìm kiếm
    const searchInput = document.getElementById('gdriveSearchInput');
    if (searchInput) {
        searchInput.placeholder = 'Tìm kiếm trong Drive';
    }
    
    // Cập nhật breadcrumb
    const breadcrumb = document.getElementById('gdriveBreadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <div class="gdrive-breadcrumb-item current">
                <i class="icon icon-folder" style="margin-right: 8px; font-size: 24px; color: #1a73e8;"></i>
                <span>TeleDrive</span>
            </div>
        `;
    }
    
    // Cập nhật các mục trong sidebar
    const sidebarItems = document.querySelectorAll('.gdrive-sidebar-item span');
    if (sidebarItems && sidebarItems.length >= 5) {
        const translations = [
            'Telegram Drive',
            'Được chia sẻ với tôi',
            'Gần đây',
            'Có gắn dấu sao',
            'Thùng rác'
        ];
        
        sidebarItems.forEach((item, index) => {
            if (index < translations.length) {
                item.textContent = translations[index];
            }
        });
    }
    
    // Cập nhật nút Tạo mới
    const newBtn = document.getElementById('newBtn');
    if (newBtn) {
        newBtn.innerHTML = '<i class="icon icon-plus" style="margin-right: 8px;"></i>Tạo mới';
    }
    
    const sidebarNewBtn = document.getElementById('sidebarNewBtn');
    if (sidebarNewBtn) {
        sidebarNewBtn.innerHTML = '<i class="icon icon-plus" style="margin-right: 12px;"></i>Tạo mới';
    }
}

/**
 * Khởi tạo các sửa chữa vấn đề encoding tiếng Việt
 */
function initEncodingFixes() {
    // Đảm bảo mã hóa tiếng Việt được hiển thị đúng
    document.documentElement.setAttribute('lang', 'vi');

    // Sửa các vấn đề encoding
    fixEncoding();

    // Theo dõi các thay đổi DOM để áp dụng fixes cho nội dung được thêm vào động
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                fixEncoding();
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Sửa vấn đề encoding tiếng Việt trong các phần tử văn bản
 */
function fixEncoding() {
    // Lấy tất cả các phần tử văn bản
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, a, label, input[placeholder], textarea[placeholder]');
    
    textElements.forEach(function(element) {
        if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
            // Chỉ xử lý các phần tử có nội dung văn bản trực tiếp
            const text = element.textContent;
            if (containsEncodingIssues(text)) {
                element.textContent = decodeVietnamese(text);
            }
        }
        
        // Xử lý placeholder
        if (element.hasAttribute('placeholder')) {
            const placeholder = element.getAttribute('placeholder');
            if (containsEncodingIssues(placeholder)) {
                element.setAttribute('placeholder', decodeVietnamese(placeholder));
            }
        }
    });
}

/**
 * Kiểm tra xem chuỗi có vấn đề về mã hóa không
 */
function containsEncodingIssues(text) {
    // Các ký tự thường bị lỗi khi hiển thị tiếng Việt
    const problematicPatterns = [
        'Ä', 'á»', 'áº', 'á»', 'Ã', 'Æ', 'Æ°', 'Ã´', 'áº¯', 'áº§', 'á»¥', 'á»±'
    ];
    
    return problematicPatterns.some(pattern => text && text.includes(pattern));
}

/**
 * Giải mã tiếng Việt từ các chuỗi bị mã hóa sai
 */
function decodeVietnamese(text) {
    if (!text) return text;
    
    try {
        // Thử giải mã utf-8 hai lần nếu cần
        const decoded = decodeURIComponent(escape(text));
        return decoded;
    } catch (e) {
        console.error("Lỗi giải mã tiếng Việt:", e);
        return text;
    }
}

/**
 * Đóng các popup khi click ra ngoài
 */
function closePopupsIfClickedOutside(event) {
    // Đóng menu ngữ cảnh nếu click ra ngoài
    const contextMenu = document.getElementById('gdriveContextMenu');
    if (contextMenu && contextMenu.style.display === 'block') {
        if (!contextMenu.contains(event.target)) {
            contextMenu.style.display = 'none';
        }
    }
    
    // Đóng menu search filter nếu click ra ngoài
    const searchFilters = document.getElementById('gdriveSearchFilters');
    if (searchFilters && searchFilters.style.display === 'block') {
        const searchFilterBtn = document.getElementById('searchFilterBtn');
        if (!searchFilters.contains(event.target) && event.target !== searchFilterBtn) {
            searchFilters.style.display = 'none';
        }
    }
}

/**
 * Chuyển đổi chế độ xem (grid/list)
 */
function switchView(viewType) {
    const filesDisplay = document.getElementById('gdriveFilesDisplay');
    if (!filesDisplay) return;
    
    // Xóa tất cả các class liên quan đến view
    filesDisplay.className = 'gdrive-files-display';
    
    // Thêm class cho view mới
    filesDisplay.classList.add(`gdrive-${viewType}-view`);
    
    // Lưu trạng thái vào localStorage
    localStorage.setItem('gdrive-view-mode', viewType);
}

/**
 * Tìm kiếm file dựa trên chuỗi truy vấn
 */
function searchFiles(query) {
    const filesDisplay = document.getElementById('gdriveFilesDisplay');
    if (!filesDisplay) return;

    // Nếu không có truy vấn, hiển thị tất cả file
    if (!query) {
        filesDisplay.querySelectorAll('.gdrive-file-card').forEach(file => {
            file.style.display = '';
        });
        return;
    }

    // Tìm kiếm và hiển thị kết quả
    const files = filesDisplay.querySelectorAll('.gdrive-file-card');
    let found = false;
    
    files.forEach(file => {
        const fileName = file.querySelector('.gdrive-file-name').textContent.toLowerCase();
        if (fileName.includes(query.toLowerCase())) {
            file.style.display = '';
            found = true;
        } else {
            file.style.display = 'none';
        }
    });

    // Hiển thị thông báo nếu không tìm thấy kết quả
    const noResults = document.querySelector('.gdrive-empty');
    if (noResults) {
        if (!found && files.length > 0) {
            noResults.style.display = 'flex';
        } else {
            noResults.style.display = 'none';
        }
    }
}

/**
 * Xử lý việc tải lên file
 */
function handleFilesUpload(files) {
    // Trong môi trường thực tế, bạn sẽ gửi file đến server
    console.log(`Uploading ${files.length} files...`);
    
    // Hiển thị thông báo tải lên
    const uploadProgress = document.getElementById('gdriveUploadProgress');
    if (uploadProgress) {
        uploadProgress.style.display = 'block';
        
        const uploadList = document.getElementById('uploadProgressList');
        if (uploadList) {
            uploadList.innerHTML = '';
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const uploadItem = document.createElement('div');
                uploadItem.className = 'gdrive-upload-item';
                uploadItem.innerHTML = `
                    <div class="gdrive-upload-info">
                        <div class="gdrive-upload-name">${file.name}</div>
                    </div>
                    <div class="gdrive-upload-progress-bar">
                        <div class="gdrive-upload-progress-fill" style="width: 0%"></div>
                    </div>
                `;
                uploadList.appendChild(uploadItem);
                
                // Mô phỏng tiến trình tải lên
                simulateUploadProgress(uploadItem.querySelector('.gdrive-upload-progress-fill'));
            }
        }
    }
}

/**
 * Mô phỏng tiến trình tải lên file
 */
function simulateUploadProgress(progressElement) {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // Ẩn tiến trình sau 1s khi hoàn thành
            setTimeout(() => {
                const uploadProgress = document.getElementById('gdriveUploadProgress');
                if (uploadProgress) {
                    uploadProgress.style.display = 'none';
                }
            }, 1000);
        }
        progressElement.style.width = `${progress}%`;
    }, 300);
}

/**
 * Hiển thị menu tạo mới
 */
function showCreateNewMenu() {
    alert('Tính năng tạo mới đang được phát triển.');
}

/**
 * Xóa lựa chọn hiện tại
 */
function clearSelection() {
    const selectedFiles = document.querySelectorAll('.gdrive-file-card.selected');
    selectedFiles.forEach(file => file.classList.remove('selected'));
    
    const bulkToolbar = document.getElementById('gdriveBulkToolbar');
    if (bulkToolbar) {
        bulkToolbar.style.display = 'none';
    }
} 