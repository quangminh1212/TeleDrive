import React, { useState, useRef, useEffect } from 'react';

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
    const menuRef = useRef<HTMLDivElement>(null);

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

    // Format số điện thoại với mã quốc gia (+)
    const formatPhone = (phone?: string) => {
        if (!phone) return '';
        return phone.startsWith('+') ? phone : `+${phone}`;
    };

    const displayName = userInfo?.name || formatPhone(userInfo?.phone) || 'Người dùng';
    const displayEmail = userInfo?.email || formatPhone(userInfo?.phone) || '';

    return (
        <>
            <div className="relative" ref={menuRef}>
                {/* Avatar button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    title="Tài khoản"
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
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-slideIn">
                        {/* Header with gradient */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b border-gray-100">
                            <p className="text-xs text-gray-500 text-center">{displayEmail}</p>
                        </div>

                        {/* User Info */}
                        <div className="p-4 flex flex-col items-center border-b border-gray-100">
                            {userInfo?.avatar ? (
                                <img
                                    src={userInfo.avatar}
                                    alt={displayName}
                                    className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-lg"
                                />
                            ) : (
                                <div className="ring-4 ring-white shadow-lg rounded-full">
                                    <DefaultAvatar name={displayName} size={80} />
                                </div>
                            )}
                            <h3 className="mt-3 text-lg font-medium text-gray-900">
                                Xin chào, {displayName.split(' ')[0]}!
                            </h3>

                            {/* Manage Account Button - Google Style */}
                            <button className="mt-3 px-4 py-2 text-sm text-blue-600 border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors font-medium">
                                Quản lý tài khoản Telegram
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                                onClick={() => {
                                    setIsOpen(false);
                                    // Add settings action
                                }}
                            >
                                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                                </svg>
                                Cài đặt
                            </button>

                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z" />
                                </svg>
                                Trợ giúp
                            </button>

                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
                                </svg>
                                Gửi phản hồi
                            </button>
                        </div>

                        {/* Logout Section */}
                        <div className="border-t border-gray-100 p-3">
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-full px-4 py-2.5 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                                </svg>
                                Đăng xuất
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-center gap-4 text-xs text-gray-500 bg-gray-50">
                            <a href="#" className="hover:text-gray-700">Chính sách bảo mật</a>
                            <span>•</span>
                            <a href="#" className="hover:text-gray-700">Điều khoản dịch vụ</a>
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
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-scaleIn">
                        {/* Icon */}
                        <div className="pt-6 flex justify-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                                </svg>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4 text-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Đăng xuất khỏi TeleDrive?
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Bạn sẽ cần đăng nhập lại bằng Telegram để tiếp tục sử dụng ứng dụng.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                disabled={isLoggingOut}
                                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                            >
                                Hủy
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
                                        Đang xuất...
                                    </>
                                ) : (
                                    'Đăng xuất'
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
