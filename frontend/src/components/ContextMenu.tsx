import React, { useEffect, useRef, useState } from 'react';
import { FileInfo } from '../services/api';

interface ContextMenuProps {
    file: FileInfo;
    x: number;
    y: number;
    onClose: () => void;
    onAction: (action: string, file: FileInfo) => void;
}

// Icons for menu items
const DownloadIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
);

const RenameIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
);

const CopyIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
);

const ShareIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
    </svg>
);

const MoveIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
    </svg>
);

const InfoIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
);

const DeleteIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
);

const OpenWithIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
);

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactElement;
    shortcut?: string;
    danger?: boolean;
    divider?: boolean;
}

const ContextMenu = ({ file, x, y, onClose, onAction }: ContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x, y });

    const menuItems: MenuItem[] = [
        { id: 'open', label: 'Mở bằng', icon: <OpenWithIcon /> },
        { id: 'download', label: 'Tải xuống', icon: <DownloadIcon /> },
        { id: 'rename', label: 'Đổi tên', icon: <RenameIcon />, shortcut: 'Ctrl+Alt+E', divider: true },
        { id: 'copy', label: 'Tạo bản sao', icon: <CopyIcon />, shortcut: 'Ctrl+C' },
        { id: 'share', label: 'Chia sẻ', icon: <ShareIcon />, divider: true },
        { id: 'move', label: 'Di chuyển đến thư mục', icon: <MoveIcon /> },
        { id: 'info', label: 'Thông tin về tệp', icon: <InfoIcon />, divider: true },
        { id: 'delete', label: 'Chuyển vào thùng rác', icon: <DeleteIcon />, danger: true, shortcut: 'Delete' },
    ];

    useEffect(() => {
        // Adjust position if menu goes off screen
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const newX = x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 10 : x;
            const newY = y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 10 : y;
            setPosition({ x: newX, y: newY });
        }
    }, [x, y]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handleItemClick = (actionId: string) => {
        onAction(actionId, file);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[280px]"
            style={{ left: position.x, top: position.y }}
        >
            {menuItems.map((item, index) => (
                <div key={item.id}>
                    <button
                        onClick={() => handleItemClick(item.id)}
                        className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                            }`}
                    >
                        <span className="mr-3 text-gray-500">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.shortcut && (
                            <span className="text-xs text-gray-400 ml-4">{item.shortcut}</span>
                        )}
                    </button>
                    {item.divider && index < menuItems.length - 1 && (
                        <div className="border-t border-gray-100 my-1" />
                    )}
                </div>
            ))}
        </div>
    );
};

export default ContextMenu;
