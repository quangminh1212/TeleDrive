import { useState } from 'react';

interface HeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
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

const Header = ({ searchQuery, onSearchChange }: HeaderProps) => {
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
