/**
 * TeleDrive - Responsive Layout Manager
 * 
 * Xử lý giao diện responsive cho cả mobile và desktop
 * Thay thế cho mobile.js và mobile-navigation.js
 */

class ResponsiveManager {
    constructor() {
        // Cấu hình mặc định
        this.config = {
            mobileBp: 768, // Mobile breakpoint
            tabletBp: 1024, // Tablet breakpoint
            animationDuration: 300, // Duration for animations (ms)
        };

        // Trạng thái
        this.state = {
            isMobile: false,
            isTablet: false,
            sidebarOpen: false,
            currentView: 'grid', // grid hoặc list
            lastWindowWidth: window.innerWidth,
        };

        // Initialize
        this.init();
    }

    /**
     * Khởi tạo responsive manager
     */
    init() {
        // Kiểm tra kích thước màn hình ban đầu
        this.checkScreenSize();

        // Thiết lập responsive layout
        this.setupResponsiveLayout();

        // Thiết lập event listeners
        this.setupEventListeners();

        // Thiết lập mobile sidebar và navigation
        this.setupMobileNavigation();

        console.log(`ResponsiveManager initialized. isMobile: ${this.state.isMobile}, isTablet: ${this.state.isTablet}`);
    }

    /**
     * Kiểm tra kích thước màn hình và cập nhật trạng thái
     */
    checkScreenSize() {
        const width = window.innerWidth;
        
        // Cập nhật trạng thái thiết bị
        const wasMobile = this.state.isMobile;
        const wasTablet = this.state.isTablet;
        
        this.state.isMobile = width <= this.config.mobileBp;
        this.state.isTablet = width > this.config.mobileBp && width <= this.config.tabletBp;
        this.state.lastWindowWidth = width;
        
        // Kiểm tra nếu có sự thay đổi về trạng thái
        const mobileChanged = wasMobile !== this.state.isMobile;
        const tabletChanged = wasTablet !== this.state.isTablet;
        
        if (mobileChanged || tabletChanged) {
            this.handleDeviceStateChange();
        }
    }

    /**
     * Xử lý khi trạng thái thiết bị thay đổi
     */
    handleDeviceStateChange() {
        // Cập nhật class cho body
        document.body.classList.toggle('is-mobile', this.state.isMobile);
        document.body.classList.toggle('is-tablet', this.state.isTablet);
        
        // Cập nhật sidebar
        if (this.state.isMobile) {
            this.closeSidebar();
            this.enableSwipeGestures();
        } else {
            this.openSidebar();
            this.disableSwipeGestures();
        }
        
        // Thay đổi view mode dựa trên kích thước màn hình
        if (this.state.isMobile && this.state.currentView !== 'grid') {
            this.setView('grid');
        }
        
        // Dispatch event để các thành phần khác có thể phản ứng
        window.dispatchEvent(new CustomEvent('deviceStateChanged', {
            detail: {
                isMobile: this.state.isMobile,
                isTablet: this.state.isTablet
            }
        }));
    }

    /**
     * Thiết lập responsive layout
     */
    setupResponsiveLayout() {
        // Thêm classes cơ bản
        document.body.classList.toggle('is-mobile', this.state.isMobile);
        document.body.classList.toggle('is-tablet', this.state.isTablet);
        
        // Thêm viewport meta tag nếu chưa có
        if (!document.querySelector('meta[name="viewport"]')) {
            const viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(viewport);
        }
        
        // Thêm responsive styles
        this.addResponsiveStyles();
    }

    /**
     * Thêm responsive styles
     */
    addResponsiveStyles() {
        const style = document.createElement('style');
        style.id = 'responsive-styles';
        style.textContent = `
            /* Responsive Base Styles */
            .is-mobile .desktop-only {
                display: none !important;
            }
            
            .is-tablet .tablet-hidden {
                display: none !important;
            }
            
            /* Mobile Sidebar Styles */
            .is-mobile .gdrive-sidebar {
                position: fixed;
                left: 0;
                top: 0;
                bottom: 0;
                transform: translateX(-100%);
                z-index: 1000;
                transition: transform ${this.config.animationDuration}ms ease-in-out;
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
            }
            
            .is-mobile .gdrive-sidebar.open {
                transform: translateX(0);
            }
            
            /* Mobile Menu Toggle */
            .mobile-menu-toggle {
                display: none;
                width: 40px;
                height: 40px;
                border: none;
                background: transparent;
                cursor: pointer;
                z-index: 1001;
            }
            
            .is-mobile .mobile-menu-toggle {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            /* Backdrop for mobile sidebar */
            .mobile-backdrop {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 999;
                opacity: 0;
                transition: opacity ${this.config.animationDuration}ms ease-in-out;
            }
            
            .is-mobile .mobile-backdrop.visible {
                display: block;
                opacity: 1;
            }
            
            /* Mobile Search */
            .is-mobile .gdrive-search-box {
                max-width: calc(100vw - 120px);
            }
            
            /* Mobile View Adjustments */
            .is-mobile .gdrive-files-display {
                padding: 8px;
            }
            
            .is-mobile .gdrive-file-card {
                width: calc(50% - 16px);
                margin: 8px;
                height: 180px;
            }
            
            .is-tablet .gdrive-file-card {
                width: calc(33.33% - 16px);
            }
            
            @media (max-width: 480px) {
                .is-mobile .gdrive-file-card {
                    width: calc(100% - 16px);
                }
            }
            
            /* Mobile Header */
            .is-mobile .gdrive-header {
                padding: 0 8px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Thiết lập event listeners
     */
    setupEventListeners() {
        // Resize event
        window.addEventListener('resize', () => {
            this.checkScreenSize();
        });
        
        // Orientation change event (đặc biệt quan trọng cho mobile)
        window.addEventListener('orientationchange', () => {
            // Chờ một chút để màn hình ổn định kích thước sau khi xoay
            setTimeout(() => this.checkScreenSize(), 100);
        });
    }

    /**
     * Thiết lập mobile navigation
     */
    setupMobileNavigation() {
        // Tạo backdrop cho mobile sidebar
        const backdrop = document.createElement('div');
        backdrop.className = 'mobile-backdrop';
        backdrop.addEventListener('click', () => this.closeSidebar());
        document.body.appendChild(backdrop);
        
        // Tìm hoặc tạo nút toggle menu
        let menuToggle = document.getElementById('mobileMenuToggle');
        
        if (!menuToggle) {
            menuToggle = document.createElement('button');
            menuToggle.id = 'mobileMenuToggle';
            menuToggle.className = 'mobile-menu-toggle';
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
            
            // Thêm vào DOM
            const header = document.querySelector('.gdrive-header');
            if (header) {
                header.prepend(menuToggle);
            } else {
                document.body.appendChild(menuToggle);
            }
        }
        
        // Thêm event listener cho nút toggle
        menuToggle.addEventListener('click', () => this.toggleSidebar());
        
        // Kích hoạt swipe gestures cho mobile
        if (this.state.isMobile) {
            this.enableSwipeGestures();
        }
    }

    /**
     * Mở sidebar
     */
    openSidebar() {
        const sidebar = document.querySelector('.gdrive-sidebar');
        const backdrop = document.querySelector('.mobile-backdrop');
        
        if (sidebar) {
            sidebar.classList.add('open');
            this.state.sidebarOpen = true;
        }
        
        if (backdrop && this.state.isMobile) {
            backdrop.classList.add('visible');
        }
        
        // Thông báo cho screen readers
        this.announceToScreenReader('Menu đã mở');
    }

    /**
     * Đóng sidebar
     */
    closeSidebar() {
        const sidebar = document.querySelector('.gdrive-sidebar');
        const backdrop = document.querySelector('.mobile-backdrop');
        
        if (sidebar) {
            sidebar.classList.remove('open');
            this.state.sidebarOpen = false;
        }
        
        if (backdrop) {
            backdrop.classList.remove('visible');
        }
        
        // Thông báo cho screen readers
        this.announceToScreenReader('Menu đã đóng');
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        if (this.state.sidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    /**
     * Thiết lập chế độ xem (grid/list)
     * @param {string} viewMode - 'grid' hoặc 'list'
     */
    setView(viewMode) {
        this.state.currentView = viewMode;
        
        // Dispatch event cho việc thay đổi view
        window.dispatchEvent(new CustomEvent('viewModeChanged', {
            detail: { viewMode }
        }));
        
        // Cập nhật UI
        const gridView = document.getElementById('gridView');
        const listView = document.getElementById('listView');
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        
        if (gridView && listView) {
            if (viewMode === 'grid') {
                gridView.style.display = 'grid';
                listView.style.display = 'none';
            } else {
                gridView.style.display = 'none';
                listView.style.display = 'flex';
            }
        }
        
        // Cập nhật trạng thái nút
        if (gridBtn && listBtn) {
            if (viewMode === 'grid') {
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
            } else {
                gridBtn.classList.remove('active');
                listBtn.classList.add('active');
            }
        }
    }

    /**
     * Kích hoạt swipe gestures cho mobile
     */
    enableSwipeGestures() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), {passive: true});
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), {passive: false});
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), {passive: true});
    }

    /**
     * Vô hiệu hóa swipe gestures
     */
    disableSwipeGestures() {
        document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    // Touch event handlers
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        const diffX = touchX - this.touchStartX;
        const diffY = touchY - this.touchStartY;
        
        // Chỉ xử lý nếu swipe ngang đủ mạnh và không quá nhiều swipe dọc
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
            // Ngăn không cho trang scroll
            e.preventDefault();
            
            // Swipe từ phải qua trái - Đóng sidebar
            if (diffX < 0 && this.state.sidebarOpen) {
                this.closeSidebar();
            }
            
            // Swipe từ trái qua phải - Mở sidebar
            if (diffX > 0 && !this.state.sidebarOpen && touchX < 50) {
                this.openSidebar();
            }
        }
    }

    handleTouchEnd() {
        this.touchStartX = null;
        this.touchStartY = null;
    }

    /**
     * Thông báo cho screen reader
     * @param {string} message - Nội dung cần thông báo
     */
    announceToScreenReader(message) {
        // Tìm hoặc tạo phần tử aria-live
        let announcer = document.getElementById('sr-announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.classList.add('sr-only');
            document.body.appendChild(announcer);
        }
        
        // Đặt nội dung thông báo
        announcer.textContent = message;
        
        // Xóa sau một khoảng thời gian
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }
}

// Khởi tạo singleton instance
const responsiveManager = new ResponsiveManager();

// Xuất ra window object để có thể sử dụng ở mọi nơi
window.responsiveManager = responsiveManager; 