import { useState } from 'react';

interface HeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
}

// Filter dropdown icon
const FilterIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
    </svg>
);

// Help icon
const HelpIcon = () => (
    <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
    </svg>
);

// Settings icon
const SettingsIcon = () => (
    <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
);

// Apps grid icon
const AppsIcon = () => (
    <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 14c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM6 20c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
    </svg>
);

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

const Header = ({ searchQuery, onSearchChange, viewMode, onViewModeChange }: HeaderProps) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);

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
                    <button className="p-2 mr-2 hover:bg-gray-100 rounded-full">
                        <FilterIcon />
                    </button>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
                {/* Help */}
                <button className="p-2 hover:bg-gray-200 rounded-full" title="Hỗ trợ">
                    <HelpIcon />
                </button>

                {/* Settings */}
                <button className="p-2 hover:bg-gray-200 rounded-full" title="Cài đặt">
                    <SettingsIcon />
                </button>

                {/* Apps */}
                <button className="p-2 hover:bg-gray-200 rounded-full" title="Ứng dụng Google">
                    <AppsIcon />
                </button>

                {/* User Avatar */}
                <button
                    className="ml-2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium overflow-hidden"
                    title="Tài khoản Google"
                >
                    <img
                        src="https://lh3.googleusercontent.com/a/default-user=s40"
                        alt="User"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.textContent = 'U';
                        }}
                    />
                </button>
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
