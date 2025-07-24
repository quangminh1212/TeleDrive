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
            smallMobileBp: 480, // Small mobile breakpoint
            animationDuration: 300, // Duration for animations (ms)
        };

        // Trạng thái
        this.state = {
            isMobile: false,
            isTablet: false,
            isSmallMobile: false,
            isPortrait: window.innerHeight > window.innerWidth,
            sidebarOpen: false,
            currentView: 'grid', // grid hoặc list
            lastWindowWidth: window.innerWidth,
            touchStartX: null,
            touchStartY: null
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
        const height = window.innerHeight;
        
        // Cập nhật trạng thái thiết bị
        const wasMobile = this.state.isMobile;
        const wasTablet = this.state.isTablet;
        const wasSmallMobile = this.state.isSmallMobile;
        const wasPortrait = this.state.isPortrait;
        
        this.state.isMobile = width <= this.config.mobileBp;
        this.state.isTablet = width > this.config.mobileBp && width <= this.config.tabletBp;
        this.state.isSmallMobile = width <= this.config.smallMobileBp;
        this.state.isPortrait = height > width;
        this.state.lastWindowWidth = width;
        
        // Kiểm tra nếu có sự thay đổi về trạng thái
        const deviceStateChanged = wasMobile !== this.state.isMobile || wasTablet !== this.state.isTablet || wasSmallMobile !== this.state.isSmallMobile;
        const orientationChanged = wasPortrait !== this.state.isPortrait;
        
        if (deviceStateChanged) {
            this.handleDeviceStateChange();
        }
        
        if (orientationChanged) {
            this.handleOrientationChange();
        }
    }

    /**
     * Xử lý khi trạng thái thiết bị thay đổi
     */
    handleDeviceStateChange() {
        // Cập nhật class cho body
        document.body.classList.toggle('is-mobile', this.state.isMobile);
        document.body.classList.toggle('is-tablet', this.state.isTablet);
        document.body.classList.toggle('is-small-mobile', this.state.isSmallMobile);
        
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
                isTablet: this.state.isTablet,
                isSmallMobile: this.state.isSmallMobile
            }
        }));
    }

    /**
     * Xử lý khi hướng màn hình thay đổi
     */
    handleOrientationChange() {
        // Cập nhật class cho body
        document.body.classList.toggle('is-portrait', this.state.isPortrait);
        document.body.classList.toggle('is-landscape', !this.state.isPortrait);
        
        // Kiểm tra và điều chỉnh layout
        this.adjustLayoutForOrientation();
        
        // Dispatch event để các thành phần khác có thể phản ứng
        window.dispatchEvent(new CustomEvent('orientationChanged', {
            detail: {
                isPortrait: this.state.isPortrait
            }
        }));
    }

    /**
     * Điều chỉnh layout cho phù hợp với hướng màn hình
     */
    adjustLayoutForOrientation() {
        // Điều chỉnh cho mobile
        if (this.state.isMobile) {
            // Đóng sidebar trong chế độ landscape
            if (!this.state.isPortrait && this.state.sidebarOpen) {
                this.closeSidebar();
            }
            
            // Điều chỉnh số cột hiển thị
            const gridView = document.querySelector('.gdrive-grid-view');
            if (gridView) {
                if (this.state.isPortrait) {
                    gridView.style.gridTemplateColumns = this.state.isSmallMobile ? 
                        'repeat(1, 1fr)' : 'repeat(2, 1fr)';
                } else {
                    gridView.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
                }
            }
        }
    }

    /**
     * Thiết lập responsive layout
     */
    setupResponsiveLayout() {
        // Thêm classes cơ bản
        document.body.classList.toggle('is-mobile', this.state.isMobile);
        document.body.classList.toggle('is-tablet', this.state.isTablet);
        document.body.classList.toggle('is-small-mobile', this.state.isSmallMobile);
        document.body.classList.toggle('is-portrait', this.state.isPortrait);
        document.body.classList.toggle('is-landscape', !this.state.isPortrait);
        
        // Thêm viewport meta tag nếu chưa có
        if (!document.querySelector('meta[name="viewport"]')) {
            const viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(viewport);
        }
        
        // Thêm responsive styles
        this.addResponsiveStyles();
        
        // Điều chỉnh layout theo hướng màn hình
        this.adjustLayoutForOrientation();
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
                width: 80% !important;
                max-width: 300px;
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
                align-items: center;
                justify-content: center;
            }
            
            .is-mobile .mobile-menu-toggle {
                display: flex;
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
            
            .is-mobile .gdrive-toolbar {
                height: auto;
                padding: 8px;
                flex-wrap: wrap;
            }
            
            .is-mobile .gdrive-breadcrumbs {
                width: 100%;
                margin-bottom: 8px;
                white-space: nowrap;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                scroll-behavior: smooth;
            }
            
            /* Grid View Adjustments for Mobile */
            .is-mobile .gdrive-grid-view {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .is-mobile.is-small-mobile .gdrive-grid-view {
                grid-template-columns: repeat(1, 1fr);
            }
            
            .is-mobile .gdrive-file-card {
                width: calc(100% - 16px);
                margin: 8px;
                height: 180px;
            }
            
            .is-tablet .gdrive-file-card {
                width: calc(33.33% - 16px);
            }
            
            /* File actions on mobile */
            .is-mobile .gdrive-file-actions {
                display: flex;
                opacity: 1;
            }
            
            /* Mobile Header */
            .is-mobile .gdrive-header {
                padding: 0 8px;
            }
            
            /* Mobile FAB positioning */
            .is-mobile .gdrive-fab {
                bottom: 16px;
                right: 16px;
            }
            
            /* Landscape specific adjustments */
            .is-mobile.is-landscape .gdrive-grid-view {
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            }
            
            .is-mobile.is-landscape .gdrive-file-card {
                height: 150px;
            }
            
            /* Screenreader only elements */
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border-width: 0;
            }
            
            /* Fix for mobile modal views */
            .is-mobile .gdrive-modal-content {
                width: 95%;
                max-height: 80vh;
            }
            
            /* Better touch targets on mobile */
            .is-mobile button,
            .is-mobile .gdrive-btn-primary,
            .is-mobile .gdrive-btn-secondary,
            .is-mobile .gdrive-action-btn {
                min-height: 44px;
                min-width: 44px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Thiết lập event listeners
     */
    setupEventListeners() {
        // Resize event
        window.addEventListener('resize', this.debounce(() => {
            this.checkScreenSize();
        }, 150));
        
        // Orientation change event (đặc biệt quan trọng cho mobile)
        window.addEventListener('orientationchange', () => {
            // Chờ một chút để màn hình ổn định kích thước sau khi xoay
            setTimeout(() => this.checkScreenSize(), 150);
        });
        
        // Click event cho document (đóng các dropdown khi click bên ngoài)
        document.addEventListener('click', (e) => {
            // Kiểm tra xem click có phải là bên ngoài dropdown không
            if (!e.target.closest('.dropdown, .dropdown-menu, .dropdown-toggle')) {
                this.closeAllDropdowns();
            }
        });
    }

    /**
     * Debounce function để hạn chế gọi quá nhiều lần
     * @param {Function} func - Hàm cần debounce
     * @param {number} wait - Thời gian đợi (ms)
     * @returns {Function} - Hàm đã được debounce
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Đóng tất cả các dropdowns
     */
    closeAllDropdowns() {
        document.querySelectorAll('.dropdown-menu.visible, .dropdown.open').forEach(el => {
            el.classList.remove('visible', 'open');
        });
    }

    /**
     * Thiết lập mobile navigation
     */
    setupMobileNavigation() {
        // Tạo backdrop cho mobile sidebar
        let backdrop = document.getElementById('sidebarBackdrop');
        
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'sidebarBackdrop';
            backdrop.className = 'mobile-backdrop';
            backdrop.addEventListener('click', () => this.closeSidebar());
            document.body.appendChild(backdrop);
        }
        
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
        const backdrop = document.getElementById('sidebarBackdrop');
        
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
        const backdrop = document.getElementById('sidebarBackdrop');
        
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
        
        // Điều chỉnh grid layout cho phù hợp với hướng màn hình
        if (viewMode === 'grid') {
            this.adjustLayoutForOrientation();
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
        this.state.touchStartX = e.touches[0].clientX;
        this.state.touchStartY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (!this.state.touchStartX || !this.state.touchStartY) return;
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        const diffX = touchX - this.state.touchStartX;
        const diffY = touchY - this.state.touchStartY;
        
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
        this.state.touchStartX = null;
        this.state.touchStartY = null;
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
    
    /**
     * Điều chỉnh và tối ưu UI cho thiết bị hiện tại
     * Phương thức này có thể được gọi từ bên ngoài để cập nhật UI
     */
    optimizeUIForCurrentDevice() {
        // Kiểm tra lại kích thước màn hình
        this.checkScreenSize();
        
        // Thực hiện các điều chỉnh bổ sung
        if (this.state.isMobile) {
            // Tối ưu cho mobile
            this.optimizeForMobile();
        } else if (this.state.isTablet) {
            // Tối ưu cho tablet
            this.optimizeForTablet();
        } else {
            // Tối ưu cho desktop
            this.optimizeForDesktop();
        }
    }
    
    /**
     * Tối ưu UI cho thiết bị mobile
     */
    optimizeForMobile() {
        // Điều chỉnh các thành phần cho mobile
        
        // Ẩn các phần tử không cần thiết
        document.querySelectorAll('.desktop-only').forEach(el => {
            el.style.display = 'none';
        });
        
        // Đơn giản hóa breadcrumbs trên mobile
        const breadcrumbs = document.querySelector('.gdrive-breadcrumbs');
        if (breadcrumbs) {
            const items = breadcrumbs.querySelectorAll('.gdrive-breadcrumb-item:not(:first-child):not(:last-child)');
            if (items.length > 2) {
                // Nếu có nhiều hơn 2 mục, chỉ giữ lại mục đầu tiên và cuối cùng
                for (let i = 1; i < items.length - 1; i++) {
                    items[i].style.display = 'none';
                }
                
                // Thêm chỉ báo rút gọn
                if (!breadcrumbs.querySelector('.breadcrumb-ellipsis')) {
                    const ellipsis = document.createElement('div');
                    ellipsis.className = 'gdrive-breadcrumb-item breadcrumb-ellipsis';
                    ellipsis.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
                    
                    breadcrumbs.insertBefore(ellipsis, items[items.length - 1]);
                }
            }
        }
        
        // Điều chỉnh kích thước nút
        document.querySelectorAll('button, .gdrive-btn-primary, .gdrive-btn-secondary').forEach(btn => {
            if (!btn.classList.contains('mobile-adjusted')) {
                btn.classList.add('mobile-adjusted');
                // Đảm bảo nút đủ lớn để dễ nhấn
                btn.style.minHeight = '44px';
                btn.style.minWidth = '44px';
            }
        });
    }
    
    /**
     * Tối ưu UI cho thiết bị tablet
     */
    optimizeForTablet() {
        // Điều chỉnh UI cho tablet
        // Thiết lập lại các giá trị bị thay đổi bởi mobile
        document.querySelectorAll('.mobile-adjusted').forEach(el => {
            el.classList.remove('mobile-adjusted');
        });
    }
    
    /**
     * Tối ưu UI cho desktop
     */
    optimizeForDesktop() {
        // Điều chỉnh UI cho desktop
        // Thiết lập lại các giá trị bị thay đổi bởi mobile
        document.querySelectorAll('.mobile-adjusted').forEach(el => {
            el.classList.remove('mobile-adjusted');
        });
    }
}

// Khởi tạo singleton instance
const responsiveManager = new ResponsiveManager();

// Xuất ra window object để có thể sử dụng ở mọi nơi
window.responsiveManager = responsiveManager; 