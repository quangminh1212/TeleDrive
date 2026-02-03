import { useState } from 'react';
import UserAccountMenu from './UserAccountMenu';
import { useToast } from './Toast';

interface HeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    userInfo?: {
        name?: string;
        email?: string;
        phone?: string;
        avatar?: string;
    };
}

// Search icon
const SearchIcon = () => (
    <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
);

// List view icon
const ListViewIcon = ({ active }: { active: boolean }) => (
    <svg className={`w-5 h-5 ${active ? 'text-gray-700' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </svg>
);

// Grid view icon
const GridViewIcon = ({ active }: { active: boolean }) => (
    <svg className={`w-5 h-5 ${active ? 'text-gray-700' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z" />
    </svg>
);

// Info icon
const InfoIcon = () => (
    <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
);

// Settings icon
const SettingsIcon = () => (
    <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
);

// Apps icon (9 dots)
const AppsIcon = () => (
    <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 14c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 20c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
    </svg>
);

// Help icon
const HelpIcon = () => (
    <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    </svg>
);

const Header = ({ searchQuery, onSearchChange, userInfo }: HeaderProps) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const toast = useToast();

    const handleLogout = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/v2/telegram/logout', {
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
        <header className="h-16 bg-gdrive-sidebar flex items-center px-4 gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-3xl">
                <div className={`relative flex items-center ${isSearchFocused ? 'bg-white shadow-md' : 'bg-white'} rounded-full transition-all`}>
                    <div className="pl-4 pr-2">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Tìm trong Drive"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className="flex-1 py-3 pr-4 bg-transparent text-sm focus:outline-none placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Right side actions - Google Drive style */}
            <div className="flex items-center gap-1">
                {/* Help button */}
                <button
                    className="p-2.5 rounded-full hover:bg-gray-200 transition-colors"
                    title="Hỗ trợ"
                >
                    <HelpIcon />
                </button>

                {/* Settings button */}
                <button
                    className="p-2.5 rounded-full hover:bg-gray-200 transition-colors"
                    title="Cài đặt"
                >
                    <SettingsIcon />
                </button>

                {/* Apps button */}
                <button
                    className="p-2.5 rounded-full hover:bg-gray-200 transition-colors"
                    title="Ứng dụng Google"
                >
                    <AppsIcon />
                </button>

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

// Export the view mode controls separately for use in FileGrid
export const ViewModeControls = ({ viewMode, onViewModeChange }: { viewMode: 'grid' | 'list'; onViewModeChange: (mode: 'grid' | 'list') => void }) => (
    <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0.5 bg-white">
        <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            title="Chế độ xem danh sách"
        >
            <ListViewIcon active={viewMode === 'list'} />
        </button>
        <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            title="Chế độ xem lưới"
        >
            <GridViewIcon active={viewMode === 'grid'} />
        </button>
        <button className="p-1.5 hover:bg-gray-100 rounded" title="Chi tiết">
            <InfoIcon />
        </button>
    </div>
);

export default Header;
