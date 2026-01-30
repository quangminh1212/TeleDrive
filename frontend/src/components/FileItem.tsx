import { FileInfo } from '../services/api';

interface FileItemProps {
    file: FileInfo;
    viewMode: 'grid' | 'list';
    isSelected: boolean;
    onSelect: (isMultiSelect: boolean) => void;
}

// Google Drive folder icon
const FolderIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#5f6368">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
);

// Large folder icon for grid view
const LargeFolderIcon = () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="#5f6368">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
);

// File icons based on type/extension
const getFileIcon = (file: FileInfo): JSX.Element => {
    if (file.type === 'folder' || file.file_type === 'folder') return <FolderIcon />;

    const mimeType = file.mimeType || file.mime_type || '';
    const name = file.name || file.filename || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const fileType = file.file_type?.toLowerCase() || '';

    // Image
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || fileType === 'image') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#4285f4">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
        );
    }

    // Video
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes(ext) || fileType === 'video') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ea4335">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
            </svg>
        );
    }

    // Audio
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext) || fileType === 'audio') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#fbbc04">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
        );
    }

    // PDF
    if (mimeType.includes('pdf') || ext === 'pdf') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ea4335">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
            </svg>
        );
    }

    // Document (Word, Google Docs)
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || fileType === 'document') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#4285f4">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
        );
    }

    // Spreadsheet (Excel, Google Sheets)
    if (['xls', 'xlsx', 'ods', 'csv'].includes(ext) || fileType === 'spreadsheet') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#34a853">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
        );
    }

    // Presentation (PowerPoint, Google Slides)
    if (['ppt', 'pptx', 'odp'].includes(ext) || fileType === 'presentation') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#fbbc04">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
        );
    }

    // Archive (ZIP, RAR, etc.)
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || fileType === 'archive') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#5f6368">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 6h-2v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2v-2h-2V8h2v2h2v2z" />
            </svg>
        );
    }

    // Default file icon
    return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#5f6368">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
    );
};

// Large file icon for grid view
const getLargeFileIcon = (file: FileInfo): JSX.Element => {
    if (file.type === 'folder' || file.file_type === 'folder') return <LargeFolderIcon />;

    const mimeType = file.mimeType || file.mime_type || '';
    const name = file.name || file.filename || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const fileType = file.file_type?.toLowerCase() || '';

    // Image
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || fileType === 'image') {
        return (
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="#4285f4">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
        );
    }

    // Video
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv'].includes(ext) || fileType === 'video') {
        return (
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="#ea4335">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
            </svg>
        );
    }

    // PDF
    if (mimeType.includes('pdf') || ext === 'pdf') {
        return (
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="#ea4335">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
            </svg>
        );
    }

    // Default file icon
    return (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="#5f6368">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
    );
};

// More actions icon (3 dots)
const MoreIcon = () => (
    <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
);

// Format file size
const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Format date
const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr === '-') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Hôm qua';
        } else if (diffDays < 7) {
            return `${diffDays} ngày trước`;
        } else {
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    } catch {
        return dateStr;
    }
};

const FileItem = ({ file, viewMode, isSelected, onSelect }: FileItemProps) => {
    const handleClick = (e: React.MouseEvent) => {
        onSelect(e.ctrlKey || e.metaKey);
    };

    const handleDoubleClick = () => {
        if (file.type === 'folder') {
            console.log('Open folder:', file.name);
        } else {
            // Open download link
            const filename = file.filename || file.name;
            window.open(`http://127.0.0.1:5000/download/${filename}`, '_blank');
        }
    };

    const displayName = file.name || file.filename || 'Unknown';
    const displaySize = formatFileSize(file.size || file.file_size);
    const displayDate = formatDate(file.modified);
    const displayChannel = file.telegram_channel || '-';
    const displayOwner = file.owner || 'tôi';

    if (viewMode === 'grid') {
        return (
            <div
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all ${isSelected
                    ? 'bg-blue-100 ring-2 ring-blue-400'
                    : 'hover:bg-gray-100'
                    }`}
            >
                {/* File Icon */}
                <div className="flex items-center justify-center h-16 mb-2">
                    {getLargeFileIcon(file)}
                </div>

                {/* File Name */}
                <p className="text-sm text-center text-gray-700 truncate" title={displayName}>
                    {displayName}
                </p>

                {/* File size (below name) */}
                {file.type !== 'folder' && (
                    <p className="text-xs text-center text-gray-400 mt-1">
                        {displaySize}
                    </p>
                )}

                {/* Context Menu Button */}
                <button
                    className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('Show context menu');
                    }}
                >
                    <MoreIcon />
                </button>
            </div>
        );
    }

    // List View - Google Drive style
    return (
        <div
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            className={`group flex items-center px-4 py-2 cursor-pointer transition-all border-b border-gray-100 ${isSelected
                ? 'bg-blue-50'
                : 'hover:bg-gray-50'
                }`}
        >
            {/* Icon */}
            <span className="mr-3 flex-shrink-0">{getFileIcon(file)}</span>

            {/* Name */}
            <span className="flex-1 min-w-0 text-sm text-gray-700 truncate" title={displayName}>
                {displayName}
            </span>

            {/* Owner */}
            <span className="w-32 text-sm text-gray-500 px-2 truncate">{displayOwner}</span>

            {/* Modified Date */}
            <span className="w-48 text-sm text-gray-500 px-2">{displayDate}</span>

            {/* Channel / Source */}
            <span className="w-32 text-sm text-gray-500 px-2 truncate" title={displayChannel}>
                {displayChannel}
            </span>

            {/* Actions */}
            <div className="w-10 flex justify-end">
                <button
                    className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('Show context menu');
                    }}
                >
                    <MoreIcon />
                </button>
            </div>
        </div>
    );
};

export default FileItem;
