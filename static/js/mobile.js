/**
 * TeleDrive Mobile Navigation
 * Enhanced mobile navigation with hamburger menu and touch gestures
 */

class MobileNavigation {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.sidebarOpen = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchThreshold = 50;
        
        this.init();
        this.bindEvents();
    }
    
    init() {
        this.createMobileElements();
        this.updateLayout();
    }
    
    createMobileElements() {
        // Create hamburger menu button
        this.createHamburgerButton();
        
        // Create sidebar overlay
        this.createSidebarOverlay();
        
        // Create mobile toolbar
        this.createMobileToolbar();
        
        // Add mobile classes
        this.addMobileClasses();
    }
    
    createHamburgerButton() {
        const headerLeft = document.querySelector('.title-bar-left');
        if (!headerLeft) {
            console.log('Title bar left not found');
            return;
        }

        // Check if hamburger already exists
        if (document.querySelector('.hamburger-btn')) return;

        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.className = 'hamburger-btn';
        hamburgerBtn.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;
        hamburgerBtn.setAttribute('aria-label', 'Toggle navigation menu');

        // Insert at the beginning of header-left
        headerLeft.insertBefore(hamburgerBtn, headerLeft.firstChild);
        console.log('Hamburger button created');
        
        // Add hamburger styles
        this.addHamburgerStyles();
    }
    
    addHamburgerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .hamburger-btn {
                display: none;
                width: 44px;
                height: 44px;
                background: transparent;
                border: none;
                cursor: pointer;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                border-radius: 8px;
                transition: background-color 0.2s ease;
            }
            
            .hamburger-btn:hover {
                background: var(--hover-overlay);
            }
            
            .hamburger-line {
                width: 20px;
                height: 2px;
                background: var(--text-primary);
                border-radius: 1px;
                transition: all 0.3s ease;
            }
            
            .hamburger-btn.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(5px, 5px);
            }
            
            .hamburger-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }
            
            .hamburger-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(7px, -6px);
            }
            
            @media (max-width: 768px) {
                .hamburger-btn {
                    display: flex;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    createSidebarOverlay() {
        if (document.querySelector('.sidebar-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }
    
    createMobileToolbar() {
        // Enhance existing toolbar for mobile
        const ribbon = document.querySelector('.ribbon');
        if (ribbon) {
            ribbon.classList.add('mobile-enhanced');
        }
    }
    
    addMobileClasses() {
        const body = document.body;
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (this.isMobile) {
            body.classList.add('mobile-layout');
            if (sidebar) sidebar.classList.add('mobile-sidebar');
            if (mainContent) mainContent.classList.add('mobile-main');
        }
    }
    
    bindEvents() {
        // Hamburger menu click
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Sidebar overlay click
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeSidebar());
        }
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Touch gestures
        this.bindTouchEvents();
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebarOpen) {
                this.closeSidebar();
            }
        });
    }
    
    bindTouchEvents() {
        // Swipe to open/close sidebar
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (!this.isMobile) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - this.touchStartX;
            const deltaY = Math.abs(touchEndY - this.touchStartY);
            
            // Only trigger if horizontal swipe is dominant
            if (Math.abs(deltaX) > this.touchThreshold && deltaY < this.touchThreshold) {
                if (deltaX > 0 && this.touchStartX < 50 && !this.sidebarOpen) {
                    // Swipe right from left edge - open sidebar
                    this.openSidebar();
                } else if (deltaX < 0 && this.sidebarOpen) {
                    // Swipe left - close sidebar
                    this.closeSidebar();
                }
            }
        }, { passive: true });
    }
    
    toggleSidebar() {
        if (this.sidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }
    
    openSidebar() {
        const sidebar = document.querySelector('.navigation-pane') || document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const hamburgerBtn = document.querySelector('.hamburger-btn');

        if (sidebar) sidebar.classList.add('show');
        if (overlay) overlay.classList.add('show');
        if (hamburgerBtn) hamburgerBtn.classList.add('active');

        document.body.style.overflow = 'hidden';
        this.sidebarOpen = true;

        console.log('Sidebar opened');
        // Announce to screen readers
        this.announceToScreenReader('Navigation menu opened');
    }

    closeSidebar() {
        const sidebar = document.querySelector('.navigation-pane') || document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const hamburgerBtn = document.querySelector('.hamburger-btn');

        if (sidebar) sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        if (hamburgerBtn) hamburgerBtn.classList.remove('active');

        document.body.style.overflow = '';
        this.sidebarOpen = false;

        console.log('Sidebar closed');
        // Announce to screen readers
        this.announceToScreenReader('Navigation menu closed');
    }
    
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            this.updateLayout();
            
            if (!this.isMobile && this.sidebarOpen) {
                this.closeSidebar();
            }
        }
    }
    
    updateLayout() {
        const body = document.body;
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (this.isMobile) {
            body.classList.add('mobile-layout');
            if (sidebar) sidebar.classList.add('mobile-sidebar');
            if (mainContent) mainContent.classList.add('mobile-main');
        } else {
            body.classList.remove('mobile-layout');
            if (sidebar) sidebar.classList.remove('mobile-sidebar');
            if (mainContent) mainContent.classList.remove('mobile-main');
            this.closeSidebar();
        }
    }
    
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

// Screen reader only class
const srOnlyStyle = document.createElement('style');
srOnlyStyle.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
`;
document.head.appendChild(srOnlyStyle);

// Initialize mobile navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileNav = new MobileNavigation();
});

// Export for use in other scripts
window.MobileNavigation = MobileNavigation;
