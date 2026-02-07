import { useState, useRef, useEffect } from 'react';
import UserAccountMenu from './UserAccountMenu';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import { useToast } from './Toast';
import { useI18n } from '../i18n';
import { useNotification, NotificationType } from '../contexts/NotificationContext';

// View mode types - Windows File Explorer style
export type ViewMode = 'details' | 'list' | 'small-icons' | 'medium-icons' | 'large-icons';

interface HeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    userInfo?: {
        name?: string;
        email?: string;
        phone?: string;
        avatar?: string;
    };
    onMenuClick?: () => void;
}

// Notification bell icon
const NotificationIcon = ({ hasUnread }: { hasUnread: boolean }) => (
    <svg className={`w-5 h-5 ${hasUnread ? 'text-blue-600 dark:text-dark-blue' : 'text-gray-600 dark:text-dark-text-secondary'}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
);

// Get icon for notification type
const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
        case 'delete':
            return (
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
            );
        case 'rename':
            return (
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
            );
        case 'move':
            return (
                <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12l-4-4h3V10h2v4h3l-4 4z" />
                </svg>
            );
        case 'upload':
            return (
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                </svg>
            );
        case 'create':
            return (
                <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z" />
                </svg>
            );
        case 'star':
            return (
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
            );
        case 'download':
            return (
                <svg className="w-4 h-4 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
            );
        case 'copy':
            return (
                <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
            );
        case 'error':
            return (
                <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
            );
        default:
            return (
                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
            );
    }
};

// Format time ago
const formatTimeAgo = (date: Date, t: (key: string, params?: Record<string, string | number>) => string): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    if (diffDays === 1) return t('dates.yesterday');
    return t('dates.daysAgo', { count: diffDays });
};

// Search icon
const SearchIcon = () => (
    <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
);




// Help icon
const HelpIcon = () => (
    <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    </svg>
);

const Header = ({ searchQuery, onSearchChange, userInfo, onMenuClick }: HeaderProps) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const toast = useToast();
    const { t } = useI18n();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotification();

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };

        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications]);

    // Debounced search with loading indicator
    const handleSearchChange = (value: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (value.length > 0) {
            setIsSearching(true);
        }

        searchTimeoutRef.current = setTimeout(() => {
            onSearchChange(value);
            setIsSearching(false);
        }, 300);
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/v2/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                window.location.reload();
            } else {
                toast.error('Lỗi: ' + (result.error || 'Không thể đăng xuất'));
            }
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Lỗi kết nối đến server');
        }
    };

    return (
        <header className="h-14 md:h-16 bg-white dark:bg-dark-surface flex items-center px-2 md:px-4 gap-2 md:gap-4 border-b border-gray-100 dark:border-dark-border">
            {/* Mobile Menu Button - Hamburger */}
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 hover:bg-gray-200 dark:hover:bg-dark-hover rounded-full transition-colors flex-shrink-0"
                aria-label="Mở menu"
            >
                <svg className="w-6 h-6 text-gray-600 dark:text-dark-text" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                </svg>
            </button>

            {/* Mobile Logo - visible only on mobile when sidebar is hidden */}
            <div className="md:hidden flex items-center gap-1 flex-shrink-0">
                <img src="/logo.png" alt="TeleDrive" className="w-8 h-8 rounded-xl" />
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-3xl">
                <div className={`relative flex items-center ${isSearchFocused ? 'bg-white dark:bg-dark-hover shadow-md' : 'bg-gray-100 dark:bg-dark-hover'} rounded-full transition-all`}>
                    <div className="pl-3 md:pl-4 pr-2">
                        {isSearching ? (
                            <svg className="w-5 h-5 text-blue-500 dark:text-dark-blue animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <SearchIcon />
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder={t('header.search')}
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className="flex-1 py-2.5 md:py-3 pr-4 bg-transparent text-sm focus:outline-none placeholder-gray-500 dark:placeholder-dark-text-secondary text-gray-900 dark:text-dark-text"
                        style={{ outline: 'none' }}
                        aria-label={t('header.search')}
                    />
                </div>
            </div>

            {/* Right side actions - Google Drive style */}
            <div className="flex items-center gap-1 ml-auto">
                {/* Theme Switcher */}
                <div className="hidden md:block">
                    <ThemeSwitcher />
                </div>

                {/* Language Switcher */}
                <div className="hidden md:block">
                    <LanguageSwitcher />
                </div>

                {/* Help button - hidden on mobile */}
                <button
                    className="hidden md:block p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                    title={t('header.help')}
                    aria-label={t('header.help')}
                >
                    <HelpIcon />
                </button>

                {/* Notification button */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors relative"
                        title={t('notifications.title')}
                        aria-label={t('notifications.title')}
                    >
                        <NotificationIcon hasUnread={unreadCount > 0} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-200 dark:border-dark-border z-50 overflow-hidden">
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border flex items-center justify-between bg-gray-50 dark:bg-dark-elevated">
                                <h3 className="font-semibold text-gray-900 dark:text-dark-text">
                                    {t('notifications.title')}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {notifications.length > 0 && (
                                        <>
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-xs text-blue-600 dark:text-dark-blue hover:underline"
                                            >
                                                {t('notifications.markAllRead')}
                                            </button>
                                            <button
                                                onClick={clearAll}
                                                className="text-xs text-red-500 hover:underline ml-2"
                                            >
                                                {t('notifications.clearAll')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Notification List */}
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-dark-border" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                                        </svg>
                                        <p>{t('notifications.empty')}</p>
                                    </div>
                                ) : (
                                    notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => markAsRead(notification.id)}
                                            className={`px-4 py-3 border-b border-gray-100 dark:border-dark-border last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-900 dark:text-dark-text line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    {notification.fileName && (
                                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5 truncate">
                                                            {notification.fileName}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1">
                                                        {formatTimeAgo(notification.timestamp, t)}
                                                    </p>
                                                </div>
                                                {!notification.read && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-dark-blue flex-shrink-0 mt-2"></div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>



                {/* User Account Menu */}
                <div className="ml-2">
                    <UserAccountMenu
                        userInfo={userInfo}
                        onLogout={handleLogout}
                    />
                </div>
            </div>
        </header>
    );
};


// View mode icons
const DetailsViewIcon = ({ active }: { active: boolean }) => (
    <svg className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-dark-blue' : 'text-gray-500 dark:text-dark-text-secondary'}`} viewBox="0 0 16 16" fill="currentColor">
        <path d="M1 2h14v2H1V2zm0 4h14v2H1V6zm0 4h14v2H1v-2zm0 4h14v2H1v-2z" />
    </svg>
);

const CompactListIcon = ({ active }: { active: boolean }) => (
    <svg className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-dark-blue' : 'text-gray-500 dark:text-dark-text-secondary'}`} viewBox="0 0 16 16" fill="currentColor">
        <path d="M1 2h6v2H1V2zm8 0h6v2H9V2zM1 6h6v2H1V6zm8 0h6v2H9V6zM1 10h6v2H1v-2zm8 0h6v2H9v-2zM1 14h6v2H1v-2zm8 0h6v2H9v-2z" />
    </svg>
);

const SmallIconsIcon = ({ active }: { active: boolean }) => (
    <svg className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-dark-blue' : 'text-gray-500 dark:text-dark-text-secondary'}`} viewBox="0 0 16 16" fill="currentColor">
        <path d="M1 1h3v3H1V1zm5 0h3v3H6V1zm5 0h3v3h-3V1zM1 6h3v3H1V6zm5 0h3v3H6V6zm5 0h3v3h-3V6zM1 11h3v3H1v-3zm5 0h3v3H6v-3zm5 0h3v3h-3v-3z" />
    </svg>
);

const MediumIconsIcon = ({ active }: { active: boolean }) => (
    <svg className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-dark-blue' : 'text-gray-500 dark:text-dark-text-secondary'}`} viewBox="0 0 16 16" fill="currentColor">
        <path d="M1 1h6v6H1V1zm8 0h6v6H9V1zM1 9h6v6H1V9zm8 0h6v6H9V9z" />
    </svg>
);

const LargeIconsIcon = ({ active }: { active: boolean }) => (
    <svg className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-dark-blue' : 'text-gray-500 dark:text-dark-text-secondary'}`} viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="14" height="14" rx="1" />
    </svg>
);

const VIEW_MODES: { mode: ViewMode; icon: typeof DetailsViewIcon; labelKey: string }[] = [
    { mode: 'large-icons', icon: LargeIconsIcon, labelKey: 'files.largeIcons' },
    { mode: 'medium-icons', icon: MediumIconsIcon, labelKey: 'files.mediumIcons' },
    { mode: 'small-icons', icon: SmallIconsIcon, labelKey: 'files.smallIcons' },
    { mode: 'list', icon: CompactListIcon, labelKey: 'files.listView' },
    { mode: 'details', icon: DetailsViewIcon, labelKey: 'files.detailsView' },
];

// Get the current active icon for the dropdown button
const getActiveIcon = (viewMode: ViewMode) => {
    switch (viewMode) {
        case 'details': return <DetailsViewIcon active />;
        case 'list': return <CompactListIcon active />;
        case 'small-icons': return <SmallIconsIcon active />;
        case 'medium-icons': return <MediumIconsIcon active />;
        case 'large-icons': return <LargeIconsIcon active />;
    }
};

// Export the view mode controls separately for use in FileGrid
export const ViewModeControls = ({ viewMode, onViewModeChange }: { viewMode: ViewMode; onViewModeChange: (mode: ViewMode) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const currentIndex = VIEW_MODES.findIndex(v => v.mode === viewMode);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${isOpen
                    ? 'border-blue-400 dark:border-dark-blue bg-blue-50 dark:bg-dark-selected shadow-sm'
                    : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-hover'
                    }`}
                title={t('files.viewMode')}
                aria-label={t('files.viewMode')}
                aria-expanded={isOpen}
            >
                {getActiveIcon(viewMode)}
                <svg className={`w-3 h-3 text-gray-500 dark:text-dark-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-200 dark:border-dark-border z-50 overflow-hidden animate-fade-in">
                    {/* Slider indicator */}
                    <div className="px-3 pt-3 pb-2">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 dark:text-dark-text-disabled uppercase tracking-wider font-medium">
                                {t('files.viewMode')}
                            </span>
                        </div>
                        {/* Visual slider */}
                        <div className="relative h-1 bg-gray-200 dark:bg-dark-border rounded-full mb-1">
                            <div
                                className="absolute h-1 bg-blue-500 dark:bg-dark-blue rounded-full transition-all duration-200"
                                style={{
                                    left: '0%',
                                    width: `${((VIEW_MODES.length - 1 - currentIndex) / (VIEW_MODES.length - 1)) * 100}%`,
                                }}
                            />
                            <div
                                className="absolute w-3 h-3 bg-blue-500 dark:bg-dark-blue rounded-full -top-1 shadow-md transition-all duration-200 border-2 border-white dark:border-dark-surface"
                                style={{
                                    left: `calc(${((VIEW_MODES.length - 1 - currentIndex) / (VIEW_MODES.length - 1)) * 100}% - 6px)`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Mode options */}
                    <div className="py-1">
                        {VIEW_MODES.map(({ mode, icon: Icon, labelKey }) => (
                            <button
                                key={mode}
                                onClick={() => {
                                    onViewModeChange(mode);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${viewMode === mode
                                    ? 'bg-blue-50 dark:bg-dark-selected text-blue-700 dark:text-dark-blue font-medium'
                                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover'
                                    }`}
                            >
                                <Icon active={viewMode === mode} />
                                <span>{t(labelKey)}</span>
                                {viewMode === mode && (
                                    <svg className="w-4 h-4 ml-auto text-blue-600 dark:text-dark-blue" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Header;
