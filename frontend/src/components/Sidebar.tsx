import { useState } from 'react';

interface SidebarProps {
    currentFolder: string | null;
    onFolderSelect: (folder: string | null) => void;
}

const Sidebar = ({ currentFolder, onFolderSelect }: SidebarProps) => {
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

    const menuItems = [
        { id: null, label: 'My Drive', icon: '📁' },
        { id: 'shared', label: 'Shared with me', icon: '👥' },
        { id: 'recent', label: 'Recent', icon: '🕐' },
        { id: 'starred', label: 'Starred', icon: '⭐' },
        { id: 'trash', label: 'Trash', icon: '🗑️' },
    ];

    return (
        <aside className="w-64 bg-gdrive-sidebar border-r border-gdrive-border flex flex-col">
            {/* New Button */}
            <div className="p-3">
                <button
                    onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                    className="flex items-center gap-3 px-6 py-3 bg-white border border-gdrive-border rounded-full shadow-sm hover:shadow-md transition-shadow"
                >
                    <svg className="w-6 h-6 text-gdrive-blue" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">New</span>
                </button>

                {/* New Dropdown Menu */}
                {isNewMenuOpen && (
                    <div className="absolute mt-2 w-56 bg-white rounded-lg shadow-lg border border-gdrive-border z-50">
                        <div className="py-2">
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3">
                                <span>📁</span> New folder
                            </button>
                            <hr className="my-1 border-gdrive-border" />
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3">
                                <span>📤</span> File upload
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3">
                                <span>📂</span> Folder upload
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-2 py-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id || 'home'}
                        onClick={() => onFolderSelect(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-full text-sm transition-colors ${currentFolder === item.id
                                ? 'bg-blue-100 text-gdrive-blue font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Storage Info */}
            <div className="p-4 border-t border-gdrive-border">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span>☁️</span>
                    <span>Storage</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                    <div className="bg-gdrive-blue h-1.5 rounded-full" style={{ width: '14%' }}></div>
                </div>
                <p className="text-xs text-gray-500">2.1 GB of 15 GB used</p>
            </div>
        </aside>
    );
};

export default Sidebar;
