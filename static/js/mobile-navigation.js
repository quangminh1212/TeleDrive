/**
 * Mobile Navigation
 * Provides mobile-friendly navigation for TeleDrive
 */

// Check if mobileNavigation is already defined
if (typeof window.mobileNavigation === 'undefined') {
    console.log('Loading Mobile Navigation...');
    
    window.mobileNavigation = {
        initialized: false,
        isMobile: false,
        sidebarVisible: false,
        
        init: function() {
            if (this.initialized) return;
            
            console.log('Mobile Navigation initialized');
            this.initialized = true;
            
            // Detect mobile device
            this.detectMobile();
            
            // Setup mobile navigation
            if (this.isMobile) {
                this.setupMobileNav();
            }
            
            // Setup responsive handlers
            this.setupResponsiveHandlers();
        },
        
        detectMobile: function() {
            // Simple mobile detection
            this.isMobile = window.innerWidth <= 768 || 
                           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            console.log('Mobile device detected:', this.isMobile);
        },
        
        setupMobileNav: function() {
            // Add mobile navigation elements
            const header = document.querySelector('header');
            if (header) {
                // Add hamburger menu button
                const hamburger = document.createElement('button');
                hamburger.className = 'mobile-menu-toggle';
                hamburger.innerHTML = '☰';
                hamburger.onclick = () => this.toggleSidebar();
                header.insertBefore(hamburger, header.firstChild);
            }
            
            // Make sidebar collapsible on mobile
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.add('mobile-sidebar');
                if (this.isMobile) {
                    sidebar.classList.add('hidden');
                }
            }
            
            // Add overlay for mobile sidebar
            const overlay = document.createElement('div');
            overlay.className = 'mobile-overlay';
            overlay.onclick = () => this.hideSidebar();
            document.body.appendChild(overlay);
        },
        
        setupResponsiveHandlers: function() {
            // Handle window resize
            window.addEventListener('resize', () => {
                const wasMobile = this.isMobile;
                this.detectMobile();
                
                if (wasMobile !== this.isMobile) {
                    this.handleResponsiveChange();
                }
            });
            
            // Handle orientation change on mobile
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.detectMobile();
                    this.handleResponsiveChange();
                }, 100);
            });
        },
        
        handleResponsiveChange: function() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            
            if (this.isMobile) {
                // Switch to mobile mode
                if (sidebar) {
                    sidebar.classList.add('mobile-sidebar');
                    if (!this.sidebarVisible) {
                        sidebar.classList.add('hidden');
                    }
                }
            } else {
                // Switch to desktop mode
                if (sidebar) {
                    sidebar.classList.remove('mobile-sidebar', 'hidden');
                }
                if (overlay) {
                    overlay.classList.remove('active');
                }
                this.sidebarVisible = false;
            }
        },
        
        toggleSidebar: function() {
            if (this.sidebarVisible) {
                this.hideSidebar();
            } else {
                this.showSidebar();
            }
        },
        
        showSidebar: function() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            
            if (sidebar) {
                sidebar.classList.remove('hidden');
                sidebar.classList.add('visible');
            }
            
            if (overlay) {
                overlay.classList.add('active');
            }
            
            this.sidebarVisible = true;
            
            // Prevent body scroll when sidebar is open
            document.body.style.overflow = 'hidden';
        },
        
        hideSidebar: function() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            
            if (sidebar) {
                sidebar.classList.remove('visible');
                sidebar.classList.add('hidden');
            }
            
            if (overlay) {
                overlay.classList.remove('active');
            }
            
            this.sidebarVisible = false;
            
            // Restore body scroll
            document.body.style.overflow = '';
        },
        
        // Touch gesture support
        setupTouchGestures: function() {
            let startX = 0;
            let startY = 0;
            
            document.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            });
            
            document.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                
                // Swipe right to open sidebar (from left edge)
                if (deltaX > 50 && Math.abs(deltaY) < 100 && startX < 50) {
                    this.showSidebar();
                }
                
                // Swipe left to close sidebar
                if (deltaX < -50 && Math.abs(deltaY) < 100 && this.sidebarVisible) {
                    this.hideSidebar();
                }
            });
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.mobileNavigation.init();
            window.mobileNavigation.setupTouchGestures();
        });
    } else {
        window.mobileNavigation.init();
        window.mobileNavigation.setupTouchGestures();
    }
} else {
    console.log('Mobile Navigation already loaded');
}
