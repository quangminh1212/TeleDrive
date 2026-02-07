import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../contexts/ThemeContext';
import { useI18n, getAvailableLanguages } from '../i18n';

interface UserAccountMenuProps {
    userInfo?: {
        name?: string;
        email?: string;
        phone?: string;
        avatar?: string;
    };
    onLogout: () => Promise<void>;
}

// Default avatar with initial
const DefaultAvatar = ({ name, size = 40 }: { name?: string; size?: number }) => {
    const initial = name ? name.charAt(0).toUpperCase() : 'U';
    const colors = [
        'bg-gradient-to-br from-blue-400 to-blue-600',
        'bg-gradient-to-br from-green-400 to-green-600',
        'bg-gradient-to-br from-purple-400 to-purple-600',
        'bg-gradient-to-br from-pink-400 to-pink-600',
        'bg-gradient-to-br from-orange-400 to-orange-600',
    ];
    const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

    return (
        <div
            className={`${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium shadow-sm`}
            style={{ width: size, height: size, fontSize: size * 0.45 }}
        >
            {initial}
        </div>
    );
};

const UserAccountMenu: React.FC<UserAccountMenuProps> = ({ userInfo, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme } = useTheme();
    const { t, language, setLanguage } = useI18n();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await onLogout();
        } finally {
            setIsLoggingOut(false);
            setShowLogoutConfirm(false);
        }
    };

    // Format số điện thoại: +84936374950 -> +84 0936374950
    const formatPhone = (phone?: string) => {
        if (!phone) return '';
        // Đảm bảo có dấu +
        let formatted = phone.startsWith('+') ? phone : `+${phone}`;
        // Tách mã quốc gia Việt Nam (+84) và thêm số 0 trước số điện thoại
        if (formatted.startsWith('+84')) {
            const localNumber = formatted.substring(3); // Lấy phần sau +84
            return `+84 0${localNumber}`;
        }
        // Các mã quốc gia khác: chỉ thêm dấu cách sau mã (giả sử 2-3 ký tự)
        const match = formatted.match(/^(\+\d{1,3})(\d+)$/);
        if (match) {
            return `${match[1]} ${match[2]}`;
        }
        return formatted;
    };

    const displayName = userInfo?.name || formatPhone(userInfo?.phone) || t('account.user');
    const displayEmail = userInfo?.email || formatPhone(userInfo?.phone) || '';

    return (
        <>
            <div className="relative" ref={menuRef}>
                {/* Avatar button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-blue focus:ring-offset-2"
                    title={t('header.account')}
                >
                    {userInfo?.avatar ? (
                        <img
                            src={userInfo.avatar}
                            alt={displayName}
                            className="w-9 h-9 rounded-full object-cover"
                        />
                    ) : (
                        <DefaultAvatar name={displayName} size={36} />
                    )}
                </button>

                {/* Dropdown Menu - Google Drive Style */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border z-50 overflow-hidden animate-slideIn">
                        {/* Header with gradient */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-dark-selected dark:to-dark-hover px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary text-center">{displayEmail}</p>
                        </div>

                        {/* User Info */}
                        <div className="p-4 flex flex-col items-center border-b border-gray-100 dark:border-dark-border">
                            {userInfo?.avatar ? (
                                <img
                                    src={userInfo.avatar}
                                    alt={displayName}
                                    className="w-20 h-20 rounded-full object-cover ring-4 ring-white dark:ring-dark-surface shadow-lg"
                                />
                            ) : (
                                <div className="ring-4 ring-white dark:ring-dark-surface shadow-lg rounded-full">
                                    <DefaultAvatar name={displayName} size={80} />
                                </div>
                            )}
                            <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-dark-text">
                                {t('account.hello', { name: displayName.split(' ')[0] })}
                            </h3>

                            {/* Manage Account Button - Google Style */}
                            <button className="mt-3 px-4 py-2 text-sm text-blue-600 dark:text-dark-blue border border-gray-300 dark:border-dark-border rounded-full hover:bg-blue-50 dark:hover:bg-dark-selected hover:border-blue-300 dark:hover:border-dark-blue transition-colors font-medium">
                                {t('account.manageTelegram')}
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-3 transition-colors"
                                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                            >
                                <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                                </svg>
                                <span className="flex-1">{t('header.settings')}</span>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showSettingsPanel ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                                </svg>
                            </button>

                            {/* Settings Sub-panel */}
                            {showSettingsPanel && (
                                <div className="mx-3 mb-2 bg-gray-50 dark:bg-dark-elevated rounded-xl p-3 space-y-3">
                                    {/* Theme Toggle */}
                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('account.theme')}</label>
                                        <div className="flex gap-1 mt-1.5">
                                            {([
                                                { value: 'light' as Theme, label: t('account.themeLight'), icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" /></svg> },
                                                { value: 'dark' as Theme, label: t('account.themeDark'), icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" /></svg> },
                                                { value: 'system' as Theme, label: t('account.themeAuto'), icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v2h12v-2l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z" /></svg> },
                                            ]).map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setTheme(opt.value)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${theme === opt.value
                                                        ? 'bg-blue-500 text-white shadow-sm'
                                                        : 'bg-white dark:bg-dark-surface text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border'
                                                        }`}
                                                >
                                                    {opt.icon}
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Language Selector */}
                                    <div>
                                        <label className="text-[11px] font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('account.language')}</label>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value as any)}
                                            className="w-full mt-1.5 px-3 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-xs text-gray-700 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {getAvailableLanguages().map((lang) => (
                                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Documentation Link */}
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            // Dispatch custom event to open docs modal in Sidebar
                                            window.dispatchEvent(new CustomEvent('openDocs'));
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-xs text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-gray-500 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                                        {t('account.viewDocs')}
                                    </button>
                                </div>
                            )}

                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-3 transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z" />
                                </svg>
                                {t('account.help')}
                            </button>

                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-3 transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
                                </svg>
                                {t('account.sendFeedback')}
                            </button>
                        </div>

                        {/* Logout Section */}
                        <div className="border-t border-gray-100 dark:border-dark-border p-3">
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-full px-4 py-2.5 text-sm text-gray-700 dark:text-dark-text bg-gray-50 dark:bg-dark-elevated hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                                </svg>
                                {t('account.logout')}
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 dark:border-dark-border px-4 py-3 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-elevated">
                            <a href="#" className="hover:text-gray-700 dark:hover:text-dark-text">{t('account.privacyPolicy')}</a>
                            <span>•</span>
                            <a href="#" className="hover:text-gray-700 dark:hover:text-dark-text">{t('account.termsOfService')}</a>
                        </div>
                    </div>
                )}
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
                        onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-scaleIn">
                        {/* Icon */}
                        <div className="pt-6 flex justify-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                                </svg>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4 text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                                {t('account.logoutConfirm')}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-dark-text-secondary">
                                {t('account.logoutDesc')}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                disabled={isLoggingOut}
                                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-dark-text bg-gray-100 dark:bg-dark-elevated rounded-xl hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors font-medium disabled:opacity-50"
                            >
                                {t('actions.cancel')}
                            </button>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="flex-1 px-4 py-2.5 text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoggingOut ? (
                                    <>
                                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        {t('account.loggingOut')}
                                    </>
                                ) : (
                                    t('account.logout')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { 
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to { 
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes slideIn {
                    from { 
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
                .animate-slideIn {
                    animation: slideIn 0.2s ease-out;
                }
            `}</style>
        </>
    );
};

export default UserAccountMenu;
