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
            tinyMobileBp: 375, // Tiny mobile breakpoint (iPhone SE, etc.)
            animationDuration: 300, // Duration for animations (ms)
            safeBottomMargin: 20, // Bottom margin for safe area on mobile
            touchSwipeThreshold: 30, // Ngưỡng để phát hiện thao tác vuốt (px)
            doubleTapDelay: 300, // Độ trễ giữa 2 lần tap để phát hiện double tap (ms)
            longPressDelay: 600, // Độ trễ để phát hiện long press (ms)
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches // Kiểm tra người dùng có thích giảm chuyển động không
        };

        // Trạng thái
        this.state = {
            isMobile: false,
            isTablet: false,
            isSmallMobile: false,
            isTinyMobile: false,
            isPortrait: window.innerHeight > window.innerWidth,
            sidebarOpen: false,
            currentView: 'grid', // grid hoặc list
            lastWindowWidth: window.innerWidth,
            touchStartX: null,
            touchStartY: null,
            touchStartTime: null,
            lastTapTime: 0, // Thời điểm của lần tap trước đó
            hasNotch: this.detectNotch(), // Phát hiện notch trên iPhone X+
            safeAreaInsets: this.getSafeAreaInsets(), // Lấy safe area insets
            isHighContrastMode: window.matchMedia('(forced-colors: active)').matches, // Phát hiện chế độ tương phản cao
            isReducedDataMode: navigator.connection ? navigator.connection.saveData : false, // Chế độ tiết kiệm dữ liệu
            scrollPositions: new Map(), // Lưu vị trí cuộn cho các phần tử
            accessibilityMode: false // Chế độ trợ năng bổ sung
        };

        // Initialize
        this.init();
    }

    /**
 * Phát hiện notch hoặc dynamic island trên thiết bị
 * @returns {boolean} - Có notch hay không
 */
detectNotch() {
    // Kiểm tra xem thiết bị có notch hay không
    // Phát hiện qua CSS env()
    if (CSS && CSS.supports && CSS.supports('padding-top: env(safe-area-inset-top)')) {
        // Tạo một div test
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            visibility: hidden;
        `;
        document.body.appendChild(div);

        // Lấy computed style
        const computedStyle = getComputedStyle(div);
        const topInset = parseInt(computedStyle.paddingTop) || 0;
        
        // Xóa div test
        document.body.removeChild(div);
        
        // Nếu top inset > 0, thiết bị có notch
        if (topInset > 0) return true;
    }
    
    // Phát hiện qua kích thước màn hình (phương pháp cũ)
    const ratio = window.devicePixelRatio || 1;
    const screen = {
        width: window.screen.width * ratio,
        height: window.screen.height * ratio
    };
    
    // Danh sách thiết bị iPhone có notch
    const notchedDevices = [
        // iPhone X, XS, 11 Pro
        { width: 1125, height: 2436 },
        // iPhone XR, 11
        { width: 828, height: 1792 },
        // iPhone XS Max, 11 Pro Max
        { width: 1242, height: 2688 },
        // iPhone 12, 12 Pro, 13, 13 Pro, 14
        { width: 1170, height: 2532 },
        // iPhone 12 Mini, 13 Mini
        { width: 1080, height: 2340 },
        // iPhone 12 Pro Max, 13 Pro Max
        { width: 1284, height: 2778 },
        // iPhone 14 Pro
        { width: 1179, height: 2556 },
        // iPhone 14 Pro Max
        { width: 1290, height: 2796 },
        // iPhone 14 Plus
        { width: 1284, height: 2778 }
    ];
    
    // Kiểm tra với cả chiều dọc và chiều ngang
    for (const device of notchedDevices) {
        if (
            (Math.abs(screen.width - device.width) < 10 && Math.abs(screen.height - device.height) < 10) ||
            (Math.abs(screen.width - device.height) < 10 && Math.abs(screen.height - device.width) < 10)
        ) {
            return true;
        }
    }
    
    // Phát hiện notch trên Android (khó hơn)
    // Android không có cách chuẩn để phát hiện notch
    // Thêm kiểm tra tỷ lệ màn hình không chuẩn và inset bất thường
    const aspectRatio = Math.max(screen.width, screen.height) / Math.min(screen.width, screen.height);
    
    // Tỷ lệ bất thường (>2.1) thường là màn hình có notch trên Android
    if (aspectRatio > 2.1) {
        return true;
    }
    
    return false;
}

    /**
     * Lấy safe area insets từ CSS
     * @returns {Object} - Các giá trị inset
     */
    getSafeAreaInsets() {
        const safeAreaInsets = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };

        try {
            // Kiểm tra hỗ trợ CSS env()
            if (CSS && CSS.supports && CSS.supports('padding-top: env(safe-area-inset-top)')) {
                // Tạo một div test
                const div = document.createElement('div');
                div.style.cssText = `
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    padding: 
                        env(safe-area-inset-top) 
                        env(safe-area-inset-right) 
                        env(safe-area-inset-bottom) 
                        env(safe-area-inset-left);
                    visibility: hidden;
                `;
                document.body.appendChild(div);

                // Lấy computed style
                const computedStyle = getComputedStyle(div);
                safeAreaInsets.top = parseInt(computedStyle.paddingTop) || 0;
                safeAreaInsets.right = parseInt(computedStyle.paddingRight) || 0;
                safeAreaInsets.bottom = parseInt(computedStyle.paddingBottom) || 0;
                safeAreaInsets.left = parseInt(computedStyle.paddingLeft) || 0;

                // Xóa div test
                document.body.removeChild(div);
            }
        } catch (e) {
            console.warn('Cannot detect safe area insets', e);
        }

        return safeAreaInsets;
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

        // Thêm meta viewport tag
        this.setupViewport();

        // Phát hiện và xử lý bàn phím ảo
        this.setupVirtualKeyboardDetection();

        console.log(`ResponsiveManager initialized. isMobile: ${this.state.isMobile}, isTablet: ${this.state.isTablet}, safeArea: ${JSON.stringify(this.state.safeAreaInsets)}`);
    }
    
    /**
     * Thiết lập phát hiện bàn phím ảo
     * Quan trọng cho trải nghiệm mobile khi nhập liệu
     */
    setupVirtualKeyboardDetection() {
        if (!this.state.isMobile) return;
        
        // Cập nhật state
        this.state.virtualKeyboardVisible = false;
        this.state.originalWindowHeight = window.innerHeight;

        // Sự kiện resize được kích hoạt khi bàn phím ảo xuất hiện trên nhiều thiết bị
        const keyboardResizeThreshold = 150; // Ngưỡng phát hiện bàn phím (px)
        
        window.addEventListener('resize', this.debounce(() => {
            // Nếu đang ở chế độ portrait và chiều cao giảm đáng kể
            // thì có thể đang hiển thị bàn phím ảo
            if (this.state.isPortrait) {
                const heightDiff = Math.abs(this.state.originalWindowHeight - window.innerHeight);
                const isKeyboardVisible = heightDiff > keyboardResizeThreshold;
                
                // Nếu trạng thái thay đổi, cập nhật và thông báo
                if (this.state.virtualKeyboardVisible !== isKeyboardVisible) {
                    this.state.virtualKeyboardVisible = isKeyboardVisible;
                    this.handleVirtualKeyboardChange(isKeyboardVisible);
                }
            }
        }, 100));
        
        // Cho iOS, thêm sự kiện focus và blur trên các trường input
        document.addEventListener('focus', (e) => {
            if (this.state.isMobile && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                this.state.virtualKeyboardVisible = true;
                this.handleVirtualKeyboardChange(true);
            }
        }, true);
        
        document.addEventListener('blur', (e) => {
            if (this.state.isMobile && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                // Chờ một chút để đảm bảo không phải chuyển từ input này sang input khác
                setTimeout(() => {
                    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                        this.state.virtualKeyboardVisible = false;
                        this.handleVirtualKeyboardChange(false);
                    }
                }, 100);
            }
        }, true);
        
        // Thêm VisualViewport API (Chrome, Safari mới)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.debounce(() => {
                // So sánh visualViewport.height với window.innerHeight
                const isKeyboardVisible = window.visualViewport.height < window.innerHeight - 150;
                
                if (this.state.virtualKeyboardVisible !== isKeyboardVisible) {
                    this.state.virtualKeyboardVisible = isKeyboardVisible;
                    this.handleVirtualKeyboardChange(isKeyboardVisible);
                }
            }, 100));
        }
    }
    
    /**
     * Xử lý khi trạng thái bàn phím ảo thay đổi
     * @param {boolean} isVisible - Bàn phím có đang hiển thị hay không
     */
    handleVirtualKeyboardChange(isVisible) {
        // Thêm/xóa class khỏi body
        document.body.classList.toggle('virtual-keyboard-visible', isVisible);
        
        // Điều chỉnh UI khi bàn phím hiện lên
        if (isVisible) {
            // Cuộn trang để đảm bảo input field hiện tại nhìn thấy được
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                setTimeout(() => {
                    document.activeElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 300);
            }
            
            // Ẩn các phần tử không cần thiết khi bàn phím hiển thị
            const elementsToHide = [
                '.gdrive-fab',
                '.mobile-menu-toggle',
                '.gdrive-bottom-controls',
                '.gdrive-footer'
            ];
            
            elementsToHide.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el) el.classList.add('keyboard-hidden');
                });
            });
        } else {
            // Khôi phục các phần tử đã ẩn
            document.querySelectorAll('.keyboard-hidden').forEach(el => {
                el.classList.remove('keyboard-hidden');
            });
        }
        
        // Dispatch event để các thành phần khác có thể phản ứng
        window.dispatchEvent(new CustomEvent('virtualKeyboardChanged', {
            detail: { isVisible }
        }));
    }

    /**
     * Thiết lập viewport meta tag cho responsive
     */
    setupViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        // Thiết lập viewport với content tối ưu cho mobile
        viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no';
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
        const wasTinyMobile = this.state.isTinyMobile;
        const wasPortrait = this.state.isPortrait;
        
        this.state.isMobile = width <= this.config.mobileBp;
        this.state.isTablet = width > this.config.mobileBp && width <= this.config.tabletBp;
        this.state.isSmallMobile = width <= this.config.smallMobileBp;
        this.state.isTinyMobile = width <= this.config.tinyMobileBp;
        this.state.isPortrait = height > width;
        this.state.lastWindowWidth = width;

        // Cập nhật safe area insets khi resize
        this.state.safeAreaInsets = this.getSafeAreaInsets();
        
        // Kiểm tra nếu có sự thay đổi về trạng thái
        const deviceStateChanged = 
            wasMobile !== this.state.isMobile || 
            wasTablet !== this.state.isTablet || 
            wasSmallMobile !== this.state.isSmallMobile ||
            wasTinyMobile !== this.state.isTinyMobile;
            
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
        document.body.classList.toggle('is-tiny-mobile', this.state.isTinyMobile);
        document.body.classList.toggle('has-notch', this.state.hasNotch);
        
        // Cập nhật sidebar
        if (this.state.isMobile) {
            this.closeSidebar();
            this.enableSwipeGestures();
            this.optimizeForMobile();
        } else {
            this.openSidebar();
            this.disableSwipeGestures();
            this.state.isTablet ? this.optimizeForTablet() : this.optimizeForDesktop();
        }
        
        // Thay đổi view mode dựa trên kích thước màn hình
        if (this.state.isSmallMobile && this.state.currentView !== 'grid') {
            this.setView('grid');
        }
        
        // Dispatch event để các thành phần khác có thể phản ứng
        window.dispatchEvent(new CustomEvent('deviceStateChanged', {
            detail: {
                isMobile: this.state.isMobile,
                isTablet: this.state.isTablet,
                isSmallMobile: this.state.isSmallMobile,
                isTinyMobile: this.state.isTinyMobile,
                hasNotch: this.state.hasNotch,
                safeAreaInsets: this.state.safeAreaInsets
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
                    if (this.state.isTinyMobile) {
                        gridView.style.gridTemplateColumns = 'repeat(1, 1fr)';
                    } else if (this.state.isSmallMobile) {
                        gridView.style.gridTemplateColumns = 'repeat(2, 1fr)';
                    } else {
                        gridView.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    }
                } else {
                    // Landscape mode - tùy thuộc vào kích thước màn hình
                    if (this.state.isSmallMobile) {
                        gridView.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    } else {
                        gridView.style.gridTemplateColumns = 'repeat(4, 1fr)';
                    }
                }
            }

            // Điều chỉnh padding cho safe area
            if (this.state.hasNotch) {
                const main = document.querySelector('.gdrive-content');
                if (main) {
                    // Áp dụng padding cho vùng an toàn
                    if (this.state.isPortrait) {
                        main.style.paddingBottom = `max(${this.config.safeBottomMargin}px, env(safe-area-inset-bottom))`;
                    } else {
                        main.style.paddingLeft = `max(0px, env(safe-area-inset-left))`;
                        main.style.paddingRight = `max(0px, env(safe-area-inset-right))`;
                    }
                }

                // FAB positioning
                const fab = document.querySelector('.gdrive-fab');
                if (fab) {
                    fab.style.bottom = `max(${this.config.safeBottomMargin + 16}px, calc(16px + env(safe-area-inset-bottom)))`;
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
        document.body.classList.toggle('is-tiny-mobile', this.state.isTinyMobile);
        document.body.classList.toggle('is-portrait', this.state.isPortrait);
        document.body.classList.toggle('is-landscape', !this.state.isPortrait);
        document.body.classList.toggle('has-notch', this.state.hasNotch);
        
        // Thêm responsive styles
        this.addResponsiveStyles();
        
        // Điều chỉnh layout theo hướng màn hình
        this.adjustLayoutForOrientation();
    }

    /**
     * Thêm responsive styles
     */
    addResponsiveStyles() {
        // Xóa style cũ nếu có
        const oldStyle = document.getElementById('responsive-styles');
        if (oldStyle) {
            oldStyle.remove();
        }
        
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

            /* Mobile Layout Fixes */
            @supports (padding-top: env(safe-area-inset-top)) {
                .has-notch .gdrive-header {
                    padding-top: env(safe-area-inset-top);
                    height: calc(64px + env(safe-area-inset-top));
                }
                
                .has-notch.is-landscape .gdrive-header {
                    padding-left: env(safe-area-inset-left);
                    padding-right: env(safe-area-inset-right);
                }
            }
            
            /* Mobile Sidebar Styles */
            .is-mobile .gdrive-sidebar {
                position: fixed;
                left: 0;
                top: 0;
                bottom: 0;
                transform: translateX(-100%);
                z-index: 1000;
                transition: transform ${this.config.animationDuration}ms cubic-bezier(0.2, 0.0, 0.0, 1.0);
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
                width: 85% !important;
                max-width: 320px;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
            }
            
            /* Safe area adjustments for sidebar */
            @supports (padding-top: env(safe-area-inset-top)) {
                .has-notch .gdrive-sidebar {
                    padding-top: env(safe-area-inset-top);
                    padding-left: env(safe-area-inset-left);
                    height: 100%;
                    height: -webkit-fill-available; /* For Safari */
                }
            }
            
            .is-mobile .gdrive-sidebar.open {
                transform: translateX(0);
            }
            
            /* Mobile Menu Toggle */
            .mobile-menu-toggle {
                display: none;
                width: 44px;
                height: 44px;
                border: none;
                background: transparent;
                cursor: pointer;
                z-index: 1001;
                align-items: center;
                justify-content: center;
                position: relative;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            
            .is-mobile .mobile-menu-toggle {
                display: flex;
            }

            .is-tiny-mobile .mobile-menu-toggle {
                width: 40px;
                height: 40px;
                padding: 0;
                margin-right: 0;
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
                overscroll-behavior: contain;
                touch-action: none; /* Ngăn chặn scroll khi đang hiển thị backdrop */
            }
            
            .is-mobile .mobile-backdrop.visible {
                display: block;
                opacity: 1;
            }
            
            /* Mobile Search */
            .is-mobile .gdrive-search-box {
                max-width: calc(100vw - 120px);
                transition: max-width 0.3s ease;
                height: 40px;
            }

            .is-mobile.is-small-mobile .gdrive-search-box {
                max-width: calc(100vw - 100px);
                height: 36px;
            }

            .is-mobile.is-tiny-mobile .gdrive-search-box {
                max-width: calc(100vw - 90px);
                margin-left: 4px;
                height: 34px;
            }

            .is-mobile .gdrive-search-input {
                font-size: 14px;
            }

            .is-mobile.is-tiny-mobile .gdrive-search-input {
                font-size: 13px;
            }
            
            /* Mobile View Adjustments */
            .is-mobile .gdrive-files-display {
                padding: 8px;
            }

            .is-mobile.is-tiny-mobile .gdrive-files-display {
                padding: 4px;
            }
            
            .is-mobile .gdrive-toolbar {
                height: auto;
                padding: 8px;
                flex-wrap: wrap;
                row-gap: 8px;
            }

            .is-mobile.is-tiny-mobile .gdrive-toolbar {
                padding: 4px;
                row-gap: 4px;
            }
            
            .is-mobile .gdrive-breadcrumbs {
                width: 100%;
                margin-bottom: 8px;
                white-space: nowrap;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                scroll-behavior: smooth;
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE/Edge */
            }

            .is-mobile .gdrive-breadcrumbs::-webkit-scrollbar {
                display: none; /* Chrome/Safari */
            }

            .is-mobile.is-tiny-mobile .gdrive-breadcrumb-item {
                font-size: 12px;
                padding: 4px 6px;
            }

            .is-mobile.is-tiny-mobile .gdrive-breadcrumb-separator {
                margin: 0 2px;
            }
            
            /* Simplified breadcrumbs for small mobile */
            .is-mobile.is-small-mobile .gdrive-breadcrumbs {
                display: flex;
                flex-wrap: nowrap;
            }

            .is-mobile.is-small-mobile .gdrive-breadcrumb-ellipsis {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                opacity: 0.7;
                width: 20px;
                min-width: 20px;
                overflow: hidden;
            }
            
            /* Grid View Adjustments for Mobile */
            .is-mobile .gdrive-grid-view {
                grid-template-columns: repeat(3, 1fr);
                grid-gap: 8px;
            }
            
            .is-mobile.is-small-mobile .gdrive-grid-view {
                grid-template-columns: repeat(2, 1fr);
                grid-gap: 8px;
            }

            .is-mobile.is-tiny-mobile .gdrive-grid-view {
                grid-template-columns: repeat(1, 1fr);
                grid-gap: 6px;
            }
            
            .is-tablet .gdrive-grid-view {
                grid-template-columns: repeat(4, 1fr);
            }
            
            .is-mobile .gdrive-file-card {
                width: calc(100% - 8px);
                margin: 4px;
                height: 160px;
            }

            .is-mobile.is-small-mobile .gdrive-file-card {
                height: 150px;
            }

            .is-mobile.is-tiny-mobile .gdrive-file-card {
                height: 140px;
            }
            
            /* Tối ưu hiển thị cho file card trên mobile */
            .is-mobile .gdrive-file-name {
                font-size: 14px;
                line-height: 1.3;
            }

            .is-mobile.is-tiny-mobile .gdrive-file-name {
                font-size: 13px;
                line-height: 1.2;
                max-height: 2.4em;
                -webkit-line-clamp: 2;
            }

            .is-mobile .gdrive-file-meta {
                font-size: 12px;
            }

            .is-mobile.is-tiny-mobile .gdrive-file-meta {
                font-size: 11px;
            }
            
            /* File actions on mobile */
            .is-mobile .gdrive-file-actions {
                display: flex;
                opacity: 1;
            }

            .is-mobile.is-tiny-mobile .gdrive-file-action-btn {
                width: 36px;
                height: 36px;
            }
            
            /* Mobile Header */
            .is-mobile .gdrive-header {
                padding: 0 8px;
                height: auto;
                min-height: 56px;
                align-items: center;
            }

            .is-mobile.is-tiny-mobile .gdrive-header {
                padding: 0 4px;
                min-height: 48px;
            }
            
            /* Mobile Button Sizing */
            .is-mobile .gdrive-btn-primary,
            .is-mobile .gdrive-btn-secondary {
                height: 40px;
                min-height: 40px;
                padding: 0 12px;
            }

            .is-mobile.is-tiny-mobile .gdrive-btn-primary,
            .is-mobile.is-tiny-mobile .gdrive-btn-secondary {
                height: 36px;
                min-height: 36px;
                padding: 0 10px;
                font-size: 13px;
            }
            
            /* Mobile FAB positioning */
            .is-mobile .gdrive-fab {
                bottom: 16px;
                right: 16px;
                width: 56px;
                height: 56px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: transform 0.3s ease, opacity 0.3s ease, bottom 0.3s ease;
            }

            .is-mobile.is-small-mobile .gdrive-fab {
                width: 52px;
                height: 52px;
            }

            .is-mobile.is-tiny-mobile .gdrive-fab {
                width: 48px;
                height: 48px;
                bottom: 12px;
                right: 12px;
            }
            
            /* Landscape specific adjustments */
            .is-mobile.is-landscape .gdrive-grid-view {
                grid-template-columns: repeat(4, 1fr);
            }

            .is-mobile.is-landscape.is-small-mobile .gdrive-grid-view {
                grid-template-columns: repeat(3, 1fr);
            }
            
            .is-mobile.is-landscape .gdrive-file-card {
                height: 140px;
            }

            .is-mobile.is-landscape.is-small-mobile .gdrive-file-card {
                height: 130px;
            }
            
            /* List View Adjustments for Mobile */
            .is-mobile .gdrive-list-view {
                font-size: 14px;
            }

            .is-mobile.is-small-mobile .gdrive-list-view {
                font-size: 13px;
            }

            .is-mobile.is-tiny-mobile .gdrive-list-view {
                font-size: 12px;
            }

            .is-mobile .gdrive-list-item {
                padding: 8px 6px;
            }

            .is-mobile.is-small-mobile .gdrive-list-item {
                padding: 6px 4px;
            }

            .is-mobile .gdrive-list-name {
                max-width: calc(100vw - 150px);
            }

            .is-mobile.is-small-mobile .gdrive-list-name {
                max-width: calc(100vw - 120px);
            }

            .is-mobile.is-tiny-mobile .gdrive-list-name {
                max-width: calc(100vw - 90px);
            }
            
            /* Better touch targets on mobile */
            .is-mobile button,
            .is-mobile .gdrive-btn-primary,
            .is-mobile .gdrive-btn-secondary,
            .is-mobile .gdrive-action-btn {
                min-height: 40px;
                min-width: 40px;
            }

            .is-mobile.is-tiny-mobile button,
            .is-mobile.is-tiny-mobile .gdrive-btn-primary,
            .is-mobile.is-tiny-mobile .gdrive-btn-secondary,
            .is-mobile.is-tiny-mobile .gdrive-action-btn {
                min-height: 36px;
                min-width: 36px;
            }

            /* Fix for mobile modal views */
            .is-mobile .gdrive-modal-content {
                width: 95%;
                max-height: 80vh;
                border-radius: 12px;
            }

            .is-mobile.is-tiny-mobile .gdrive-modal-content {
                width: 98%;
                border-radius: 10px;
            }

            /* Use dynamic sizing for dialog boxes on very small screens */
            @media (max-height: 600px) {
                .is-mobile .gdrive-modal-content {
                    max-height: 95vh;
                }
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

            /* Safe area inset support */
            @supports (padding-bottom: env(safe-area-inset-bottom)) {
                .has-notch .gdrive-content {
                    padding-bottom: env(safe-area-inset-bottom);
                }
                
                .has-notch .gdrive-fab {
                    bottom: calc(16px + env(safe-area-inset-bottom));
                }
                
                .has-notch.is-landscape .gdrive-content {
                    padding-left: env(safe-area-inset-left);
                    padding-right: env(safe-area-inset-right);
                }
            }
            
            /* Mobile Context Menu Adjustments */
            .is-mobile .context-menu {
                min-width: 200px;
                padding: 8px 0;
                border-radius: 12px;
            }

            .is-mobile.is-tiny-mobile .context-menu {
                min-width: 180px;
            }

            .is-mobile .context-menu-item {
                padding: 12px 16px;
                font-size: 14px;
                min-height: 44px;
            }

            .is-mobile.is-tiny-mobile .context-menu-item {
                padding: 10px 14px;
                font-size: 13px;
                min-height: 40px;
            }
            
            /* Custom scrollbars for better touch */
            .is-mobile .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
            }
            
            .is-mobile .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            
            .is-mobile .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
            }
            
            /* Virtual Keyboard Adjustments */
            .virtual-keyboard-visible .keyboard-hidden {
                opacity: 0 !important;
                transform: translateY(100px) !important;
                pointer-events: none !important;
                visibility: hidden !important;
            }
            
            .virtual-keyboard-visible .gdrive-files-display {
                padding-bottom: 80px; /* Thêm padding để tránh nội dung bị che khuất */
            }
            
            .virtual-keyboard-visible .gdrive-modal-content {
                max-height: 60vh; /* Giảm chiều cao modal khi bàn phím hiển thị */
            }
            
            /* Context menu animations */
            .context-menu {
                animation: contextMenuAppear 0.15s ease-out;
                transform-origin: top left;
            }
            
            @keyframes contextMenuAppear {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            /* Thêm lớp overlay cho tất cả các modal/popup */
            .gdrive-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 1050;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(2px);
            }
            
            /* Loading và error states cải thiện */
            .gdrive-loading-overlay {
                display: flex;
                align-items: center;
                justify-content: center;
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(255, 255, 255, 0.7);
                z-index: 100;
            }
            
            .dark-theme .gdrive-loading-overlay {
                background-color: rgba(0, 0, 0, 0.5);
            }
            
            .gdrive-loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(0, 0, 0, 0.1);
                border-radius: 50%;
                border-left-color: var(--primary, #1a73e8);
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Cải thiện accessibility */
            .is-mobile button:focus-visible,
            .is-mobile a:focus-visible,
            .is-mobile input:focus-visible {
                outline: 2px solid var(--primary, #1a73e8);
                outline-offset: 2px;
            }
            
            /* Hiệu ứng ripple cho các phần tử có thể click trên mobile */
            .is-mobile .ripple {
                position: relative;
                overflow: hidden;
            }
            
            .is-mobile .ripple::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                background-color: rgba(0, 0, 0, 0.1);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: width 0.3s, height 0.3s, opacity 0.3s;
            }
            
            .is-mobile .ripple:active::after {
                width: 200%;
                height: 200%;
                opacity: 1;
            }
            
            .dark-theme.is-mobile .ripple:active::after {
                background-color: rgba(255, 255, 255, 0.1);
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
        
        // Theo dõi thay đổi preferredColorScheme
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeMediaQuery.addEventListener('change', (e) => {
            const isDarkMode = e.matches;
            if (localStorage.getItem('theme') === null) { // Nếu người dùng chưa đặt theme thủ công
                document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
                document.body.classList.toggle('dark-theme', isDarkMode);
            }
        });
        
        // Theo dõi thay đổi prefers-reduced-motion
        const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotionMediaQuery.addEventListener('change', (e) => {
            this.config.prefersReducedMotion = e.matches;
            document.body.classList.toggle('reduced-motion', e.matches);
        });
        
        // Theo dõi thay đổi contrast
        const highContrastMediaQuery = window.matchMedia('(forced-colors: active)');
        if (highContrastMediaQuery.addEventListener) {
            highContrastMediaQuery.addEventListener('change', (e) => {
                this.state.isHighContrastMode = e.matches;
                document.body.classList.toggle('high-contrast-mode', e.matches);
                if (e.matches) {
                    this.applyHighContrastStyles();
                }
            });
        }
        
        // Theo dõi trạng thái kết nối mạng
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                this.state.isReducedDataMode = navigator.connection.saveData || false;
                document.body.classList.toggle('reduced-data-mode', this.state.isReducedDataMode);
            });
        }
        
        // Lắng nghe sự kiện phím tắt
        document.addEventListener('keydown', (e) => {
            // Alt + A để bật/tắt chế độ trợ năng
            if (e.altKey && e.key === 'a') {
                this.toggleAccessibilityMode();
                e.preventDefault();
            }
        });
    }
    
    /**
     * Bật/tắt chế độ trợ năng nâng cao
     */
    toggleAccessibilityMode() {
        this.state.accessibilityMode = !this.state.accessibilityMode;
        document.body.classList.toggle('accessibility-mode', this.state.accessibilityMode);
        
        // Thông báo cho người dùng
        this.announceToScreenReader(
            this.state.accessibilityMode 
                ? 'Chế độ trợ năng nâng cao đã được bật' 
                : 'Chế độ trợ năng nâng cao đã được tắt'
        );
        
        // Lưu vào localStorage
        localStorage.setItem('accessibility-mode', this.state.accessibilityMode ? 'on' : 'off');
        
        // Áp dụng các điều chỉnh trợ năng
        if (this.state.accessibilityMode) {
            this.applyAccessibilityEnhancements();
        }
    }
    
    /**
     * Áp dụng các cải tiến trợ năng khi bật chế độ accessibility
     */
    applyAccessibilityEnhancements() {
        // Tăng kích thước font chữ
        document.documentElement.style.setProperty('--base-font-size', '16px');
        
        // Tăng kích thước button và touch target
        document.body.classList.add('larger-touch-targets');
        
        // Thêm outline rõ ràng cho các phần tử tương tác
        const focusableStyle = document.createElement('style');
        focusableStyle.id = 'accessibility-focus-style';
        focusableStyle.textContent = `
            .accessibility-mode button:focus,
            .accessibility-mode a:focus,
            .accessibility-mode input:focus,
            .accessibility-mode select:focus,
            .accessibility-mode textarea:focus,
            .accessibility-mode [tabindex]:focus {
                outline: 3px solid var(--primary, #1a73e8) !important;
                outline-offset: 3px !important;
            }
            
            .accessibility-mode .gdrive-file-card:focus,
            .accessibility-mode .gdrive-list-item:focus {
                outline: 3px solid var(--primary, #1a73e8) !important;
                outline-offset: 3px !important;
            }
            
            .accessibility-mode button,
            .accessibility-mode a,
            .accessibility-mode [role="button"] {
                min-height: 44px;
                min-width: 44px;
            }
            
            .accessibility-mode input,
            .accessibility-mode select,
            .accessibility-mode textarea {
                min-height: 44px;
                padding: 8px 12px;
                font-size: 16px;
            }
            
            .accessibility-mode label {
                font-size: 16px;
                margin-bottom: 8px;
                display: inline-block;
            }
            
            .accessibility-mode .gdrive-file-name {
                font-size: 16px;
                line-height: 1.5;
            }
        `;
        
        document.head.appendChild(focusableStyle);
        
        // Đảm bảo tất cả các phần tử tương tác có thể focus và có role phù hợp
        document.querySelectorAll('button, a, [role="button"]').forEach(el => {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
            }
        });
        
        // Đảm bảo tất cả các hình ảnh có alt text
        document.querySelectorAll('img:not([alt])').forEach(img => {
            img.setAttribute('alt', 'Image');
        });
    }
    
    /**
     * Áp dụng styles cho chế độ tương phản cao
     */
    applyHighContrastStyles() {
        const highContrastStyle = document.createElement('style');
        highContrastStyle.id = 'high-contrast-style';
        highContrastStyle.textContent = `
            .high-contrast-mode * {
                color: CanvasText !important;
                background-color: Canvas !important;
                border-color: CanvasText !important;
            }
            
            .high-contrast-mode button,
            .high-contrast-mode a,
            .high-contrast-mode input,
            .high-contrast-mode [role="button"],
            .high-contrast-mode .gdrive-file-card,
            .high-contrast-mode .gdrive-list-item {
                border: 1px solid CanvasText !important;
                outline: 1px solid transparent;
                outline-offset: -1px;
            }
            
            .high-contrast-mode button:focus,
            .high-contrast-mode a:focus,
            .high-contrast-mode input:focus,
            .high-contrast-mode [tabindex]:focus {
                outline: 2px solid CanvasText !important;
                outline-offset: 2px !important;
            }
        `;
        
        document.head.appendChild(highContrastStyle);
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

    // Touch event handlers - Nâng cao
    handleTouchStart(e) {
        // Lưu vị trí bắt đầu touch
        this.state.touchStartX = e.touches[0].clientX;
        this.state.touchStartY = e.touches[0].clientY;
        this.state.touchStartTime = Date.now();
        
        // Lưu target để sử dụng sau
        this.state.touchStartTarget = e.target;
        
        // Phát hiện long press
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress(e.target, this.state.touchStartX, this.state.touchStartY);
        }, this.config.longPressDelay);
    }

    handleTouchMove(e) {
        if (!this.state.touchStartX || !this.state.touchStartY) return;
        
        // Hủy timer long press nếu người dùng di chuyển
        clearTimeout(this.longPressTimer);
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        const diffX = touchX - this.state.touchStartX;
        const diffY = touchY - this.state.touchStartY;
        
        // Tính toán khoảng cách di chuyển
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        
        // Nếu di chuyển quá xa, đánh dấu là đang swipe
        if (distance > this.config.touchSwipeThreshold / 2) {
            this.state.isSwiping = true;
        }
        
        // Xử lý swipe ngang
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > this.config.touchSwipeThreshold) {
            // Ngăn không cho trang scroll nếu đang trong vùng edge
            const isEdgeArea = this.state.touchStartX < 50 || this.state.touchStartX > window.innerWidth - 50;
            if (isEdgeArea) {
                e.preventDefault();
            }
            
            // Swipe từ phải qua trái - Đóng sidebar
            if (diffX < 0 && this.state.sidebarOpen) {
                this.closeSidebar();
            }
            
            // Swipe từ trái qua phải - Mở sidebar
            if (diffX > 0 && !this.state.sidebarOpen && this.state.touchStartX < 50) {
                this.openSidebar();
            }
            
            // Áp dụng transform hiệu ứng theo trạng thái sidebar và hướng swipe
            const sidebar = document.querySelector('.gdrive-sidebar');
            if (sidebar && isEdgeArea) {
                if (!this.state.sidebarOpen && diffX > 0 && this.state.touchStartX < 50) {
                    // Đang swipe để mở sidebar
                    const translateX = Math.min(diffX, sidebar.offsetWidth);
                    sidebar.style.transform = `translateX(${translateX - sidebar.offsetWidth}px)`;
                } else if (this.state.sidebarOpen && diffX < 0) {
                    // Đang swipe để đóng sidebar
                    const translateX = Math.max(diffX, -sidebar.offsetWidth);
                    sidebar.style.transform = `translateX(${translateX}px)`;
                }
            }
        }
        
        // Xử lý swipe dọc cho scroll mượt hơn
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > this.config.touchSwipeThreshold) {
            // Phát hiện hướng scroll
            const direction = diffY < 0 ? 'up' : 'down';
            
            // Xử lý scroll behavior riêng nếu cần
            const scrollableParent = this.findScrollableParent(this.state.touchStartTarget);
            
            if (scrollableParent && scrollableParent !== document.body) {
                // Có thể custom scroll behavior ở đây nếu cần
            }
        }
    }

    handleTouchEnd(e) {
        // Hủy long press timer
        clearTimeout(this.longPressTimer);
        
        // Tính thời gian của touch
        const touchDuration = Date.now() - this.state.touchStartTime;
        
        // Xử lý tap và double tap
        if (!this.state.isSwiping && touchDuration < 300) {
            const currentTime = Date.now();
            const timeSinceLastTap = currentTime - this.state.lastTapTime;
            
            if (timeSinceLastTap < this.config.doubleTapDelay) {
                // Double tap detected
                this.handleDoubleTap(this.state.touchStartTarget, this.state.touchStartX, this.state.touchStartY);
                this.state.lastTapTime = 0; // Reset để tránh triple-tap
            } else {
                // Single tap
                this.state.lastTapTime = currentTime;
            }
        }
        
        // Reset sidebar transform
        const sidebar = document.querySelector('.gdrive-sidebar');
        if (sidebar && !this.state.sidebarOpen) {
            sidebar.style.transform = '';
        }
        
        // Reset state
        this.state.touchStartX = null;
        this.state.touchStartY = null;
        this.state.touchStartTime = null;
        this.state.touchStartTarget = null;
        this.state.isSwiping = false;
    }
    
    /**
     * Xử lý sự kiện long press
     * @param {HTMLElement} target - Phần tử được nhấn giữ
     * @param {number} x - Tọa độ X của điểm chạm
     * @param {number} y - Tọa độ Y của điểm chạm
     */
    handleLongPress(target, x, y) {
        // Tìm file hoặc folder bị long press
        const fileItem = target.closest('.gdrive-file-card, .gdrive-list-item');
        
        if (fileItem) {
            // Mô phỏng right-click để hiển thị context menu
            const contextEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 2,
                buttons: 2,
                clientX: x,
                clientY: y
            });
            
            fileItem.dispatchEvent(contextEvent);
            
            // Thêm hiệu ứng phản hồi
            this.addRippleEffect(fileItem, x, y);
        }
    }
    
    /**
     * Xử lý sự kiện double tap
     * @param {HTMLElement} target - Phần tử được double tap
     * @param {number} x - Tọa độ X của điểm chạm
     * @param {number} y - Tọa độ Y của điểm chạm
     */
    handleDoubleTap(target, x, y) {
        // Tìm file hoặc folder bị double tap
        const fileItem = target.closest('.gdrive-file-card, .gdrive-list-item');
        
        if (fileItem) {
            // Double tap trên file/folder sẽ mở nó
            const clickEvent = new MouseEvent('dblclick', {
                bubbles: true,
                cancelable: true,
                view: window,
                detail: 2,
                clientX: x,
                clientY: y
            });
            
            fileItem.dispatchEvent(clickEvent);
            
            // Hiệu ứng ripple
            this.addRippleEffect(fileItem, x, y);
        } else {
            // Double tap trên khoảng trống có thể thực hiện hành động khác
            // Ví dụ: toggle view mode
            const viewModes = ['grid', 'list'];
            const currentViewIndex = viewModes.indexOf(this.state.currentView);
            const nextViewIndex = (currentViewIndex + 1) % viewModes.length;
            this.setView(viewModes[nextViewIndex]);
        }
    }
    
    /**
     * Thêm hiệu ứng ripple khi chạm vào phần tử
     * @param {HTMLElement} element - Phần tử cần thêm hiệu ứng
     * @param {number} x - Tọa độ X của điểm chạm
     * @param {number} y - Tọa độ Y của điểm chạm
     */
    addRippleEffect(element, x, y) {
        if (this.config.prefersReducedMotion) return; // Không thêm hiệu ứng nếu người dùng không muốn
        
        // Tạo phần tử ripple
        const ripple = document.createElement('div');
        ripple.className = 'gdrive-ripple-effect';
        
        // Tính toán vị trí
        const rect = element.getBoundingClientRect();
        const left = x - rect.left;
        const top = y - rect.top;
        
        // Thiết lập style
        ripple.style.left = `${left}px`;
        ripple.style.top = `${top}px`;
        
        // Thêm vào DOM
        element.appendChild(ripple);
        
        // Xóa sau khi animation kết thúc
        setTimeout(() => {
            ripple.remove();
        }, 500);
        
        // Thêm style cho ripple nếu chưa có
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                .gdrive-ripple-effect {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.5s linear;
                    pointer-events: none;
                    z-index: 10;
                }
                
                .dark-theme .gdrive-ripple-effect {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                @keyframes ripple {
                    to {
                        transform: scale(25);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Tìm phần tử cha có thể scroll chứa phần tử hiện tại
     * @param {HTMLElement} element - Phần tử cần tìm cha
     * @returns {HTMLElement} - Phần tử cha có thể scroll
     */
    findScrollableParent(element) {
        if (!element) return document.body;
        
        // Kiểm tra nếu element có thể scroll
        const hasScrollableContent = (el) => {
            return el.scrollHeight > el.clientHeight;
        };
        
        // Bắt đầu từ phần tử hiện tại
        let style = window.getComputedStyle(element);
        const excludeStaticParent = style.position === 'absolute';
        const overflowRegex = /(auto|scroll)/;

        let parent = element;
        
        while (parent) {
            if (parent === document.body) break;
            
            parent = parent.parentElement;
            if (!parent) return document.body;
            
            style = window.getComputedStyle(parent);
            
            if (excludeStaticParent && style.position === 'static') continue;
            
            if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX) && hasScrollableContent(parent)) {
                return parent;
            }
        }
        
        return document.body;
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
        
        // Đơn giản hóa breadcrumbs trên mobile nhỏ
        if (this.state.isSmallMobile) {
            this.optimizeBreadcrumbsForMobile();
        }
        
        // Điều chỉnh kích thước nút và cải thiện touch target
        this.optimizeButtonsForMobile();

        // Điều chỉnh text size cho các thiết bị nhỏ
        if (this.state.isTinyMobile) {
            document.querySelectorAll('.gdrive-file-name, .gdrive-breadcrumb-item').forEach(el => {
                if (!el.classList.contains('size-adjusted')) {
                    el.classList.add('size-adjusted');
                    el.style.fontSize = '13px';
                }
            });

            // Giảm khoảng cách giữa các item
            document.querySelectorAll('.gdrive-grid-view').forEach(grid => {
                grid.style.gridGap = '6px';
            });
        }

        // Đảm bảo FAB không bị che khuất
        this.adjustFABForSafeArea();
    }

    /**
     * Điều chỉnh breadcrumbs cho mobile
     */
    optimizeBreadcrumbsForMobile() {
        const breadcrumbs = document.querySelector('.gdrive-breadcrumbs');
        if (!breadcrumbs) return;

        const items = Array.from(breadcrumbs.querySelectorAll('.gdrive-breadcrumb-item'));
        if (items.length <= 3) return; // Không cần rút gọn

        // Tính toán số lượng mục nên hiển thị dựa trên kích thước màn hình
        let visibleCount = 3; // Mặc định: hiện mục đầu + 2 mục cuối
        
        // Điều chỉnh số lượng breadcrumb hiển thị dựa trên kích thước màn hình
        if (this.state.isTinyMobile) {
            visibleCount = 2; // Mục đầu + 1 mục cuối
        } else if (this.state.isSmallMobile) {
            visibleCount = 3; // Mục đầu + 2 mục cuối
        } else {
            visibleCount = 4; // Mục đầu + 3 mục cuối
        }

        // Luôn giữ lại mục đầu tiên
        const firstItem = items[0];
        // Số lượng mục cuối cần giữ lại
        const lastItemsCount = visibleCount - 1;
        // Mục cuối
        const lastItems = items.slice(-lastItemsCount);
        // Mục giữa cần ẩn đi
        const middleItems = items.slice(1, -lastItemsCount);

        // Reset display cho tất cả trước khi áp dụng thay đổi
        items.forEach(item => {
            item.style.display = '';
        });

        // Ẩn các mục ở giữa
        middleItems.forEach(item => {
            item.style.display = 'none';
        });

        // Xóa ellipsis cũ nếu có
        const oldEllipsis = breadcrumbs.querySelector('.gdrive-breadcrumb-ellipsis');
        if (oldEllipsis) {
            const nextSeparator = oldEllipsis.nextElementSibling;
            if (nextSeparator && nextSeparator.classList.contains('gdrive-breadcrumb-separator')) {
                breadcrumbs.removeChild(nextSeparator);
            }
            breadcrumbs.removeChild(oldEllipsis);
        }

        // Thêm ellipsis nếu có mục giữa bị ẩn
        if (middleItems.length > 0) {
            const ellipsis = document.createElement('div');
            ellipsis.className = 'gdrive-breadcrumb-item gdrive-breadcrumb-ellipsis';
            ellipsis.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
            
            // Thêm tooltip hiển thị đầy đủ đường dẫn
            const tooltipContent = middleItems.map(item => {
                // Lấy văn bản từ link nếu có
                const link = item.querySelector('a');
                return link ? link.textContent.trim() : item.textContent.trim();
            }).join(' / ');
            
            ellipsis.title = tooltipContent;
            ellipsis.setAttribute('aria-label', 'Đường dẫn đã được rút gọn: ' + tooltipContent);
            
            // Thêm sự kiện để hiển thị full path khi click
            ellipsis.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Tạo popup với full path
                this.showFullBreadcrumbsPath(middleItems);
            });
            
            breadcrumbs.insertBefore(ellipsis, lastItems[0]);

            // Thêm separator sau ellipsis
            const separator = document.createElement('div');
            separator.className = 'gdrive-breadcrumb-separator';
            separator.innerHTML = '<i class="fas fa-chevron-right"></i>';
            breadcrumbs.insertBefore(separator, lastItems[0]);
        }
        
        // Đảm bảo cuộn đến phần tử cuối cùng để luôn nhìn thấy thư mục hiện tại
        setTimeout(() => {
            breadcrumbs.scrollLeft = breadcrumbs.scrollWidth;
        }, 0);
    }
    
    /**
     * Hiển thị full path của breadcrumbs trong popup
     * @param {Array} middleItems - Các phần tử bị ẩn
     */
    showFullBreadcrumbsPath(middleItems) {
        // Tạo popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'gdrive-overlay';
        
        // Tạo nội dung popup
        const content = document.createElement('div');
        content.className = 'gdrive-modal-content gdrive-breadcrumbs-popup';
        
        // Tiêu đề
        const title = document.createElement('div');
        title.className = 'gdrive-modal-header';
        title.innerHTML = '<h3>Đường dẫn đầy đủ</h3>';
        
        // Nút đóng
        const closeButton = document.createElement('button');
        closeButton.className = 'gdrive-modal-close';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.setAttribute('aria-label', 'Đóng');
        title.appendChild(closeButton);
        
        // Nội dung danh sách
        const list = document.createElement('div');
        list.className = 'gdrive-modal-body gdrive-breadcrumbs-list';
        
        // Thêm tất cả breadcrumbs vào danh sách
        const breadcrumbs = document.querySelector('.gdrive-breadcrumbs');
        if (breadcrumbs) {
            const allItems = Array.from(breadcrumbs.querySelectorAll('.gdrive-breadcrumb-item'));
            
            allItems.forEach(item => {
                if (!item.classList.contains('gdrive-breadcrumb-ellipsis')) {
                    // Clone phần tử để lấy nội dung
                    const itemClone = item.cloneNode(true);
                    
                    // Tạo mục danh sách mới
                    const listItem = document.createElement('div');
                    listItem.className = 'gdrive-breadcrumb-popup-item';
                    
                    // Thêm nội dung
                    listItem.appendChild(itemClone);
                    
                    // Thêm vào danh sách
                    list.appendChild(listItem);
                }
            });
        }
        
        // Đóng khi click overlay hoặc nút đóng
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Thêm vào DOM
        content.appendChild(title);
        content.appendChild(list);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Thêm CSS cho popup
        const style = document.createElement('style');
        style.textContent = `
            .gdrive-breadcrumbs-popup {
                width: 90%;
                max-width: 400px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .gdrive-breadcrumbs-list {
                padding: 16px;
            }
            
            .gdrive-breadcrumb-popup-item {
                padding: 12px 8px;
                border-bottom: 1px solid var(--border-light, #e0e0e0);
                font-size: 14px;
            }
            
            .gdrive-breadcrumb-popup-item:last-child {
                border-bottom: none;
                font-weight: bold;
            }
        `;
        
        // Thêm style tạm thời
        document.head.appendChild(style);
        
        // Xóa style khi đóng popup
        overlay.addEventListener('transitionend', () => {
            if (!document.body.contains(overlay)) {
                document.head.removeChild(style);
            }
        });
    }

    /**
     * Điều chỉnh kích thước nút cho mobile
     */
    optimizeButtonsForMobile() {
        const minHeight = this.state.isTinyMobile ? '36px' : '40px';
        const minWidth = this.state.isTinyMobile ? '36px' : '40px';

        document.querySelectorAll('button, .gdrive-btn-primary, .gdrive-btn-secondary, .gdrive-action-btn')
            .forEach(btn => {
                if (!btn.classList.contains('mobile-adjusted')) {
                    btn.classList.add('mobile-adjusted');
                    btn.style.minHeight = minHeight;
                    btn.style.minWidth = minWidth;

                    // Tăng cỡ chữ cho dễ đọc
                    if (this.state.isTinyMobile) {
                        btn.style.fontSize = '13px';
                    }
                }
            });

        // Đảm bảo icon đủ lớn
        document.querySelectorAll('.gdrive-action-btn i, .mobile-menu-toggle i')
            .forEach(icon => {
                if (this.state.isTinyMobile) {
                    icon.style.fontSize = '16px';
                } else {
                    icon.style.fontSize = '18px';
                }
            });
    }

    /**
     * Điều chỉnh vị trí FAB dựa trên safe area
     */
    adjustFABForSafeArea() {
        const fab = document.querySelector('.gdrive-fab');
        if (!fab) return;

        if (this.state.hasNotch) {
            if (this.state.isPortrait) {
                fab.style.bottom = `calc(16px + env(safe-area-inset-bottom))`;
            } else {
                fab.style.right = `calc(16px + env(safe-area-inset-right))`;
            }
        } else {
            // Mặc định
            fab.style.bottom = this.state.isTinyMobile ? '12px' : '16px';
            fab.style.right = this.state.isTinyMobile ? '12px' : '16px';
        }
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