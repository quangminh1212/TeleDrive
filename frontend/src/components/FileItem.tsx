import React, { useState } from 'react';
import { FileInfo } from '../services/api';
import ContextMenu from './ContextMenu';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';

interface FileItemProps {
    file: FileInfo;
    viewMode: 'grid' | 'list';
    isSelected: boolean;
    onSelect: (isMultiSelect: boolean) => void;
    onRename?: (file: FileInfo, newName: string) => void;
    onDelete?: (file: FileInfo) => void;
    onCopy?: (file: FileInfo) => void;
    onMove?: (file: FileInfo) => void;
    onShowInfo?: (file: FileInfo) => void;
    onPreview?: (file: FileInfo) => void;
    onDropFiles?: (targetFolderId: string | number, fileIds: (string | number)[]) => void;
    selectedFiles?: Set<string | number>;
    onFolderOpen?: (folderId: number) => void;
    onStar?: (file: FileInfo) => void;
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
const getFileIcon = (file: FileInfo): React.ReactElement => {
    if (file.type === 'folder' || file.file_type === 'folder') return <FolderIcon />;

    const mimeType = file.mimeType || file.mime_type || '';
    const name = file.name || file.filename || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const fileType = file.file_type?.toLowerCase() || '';

    // Image - Google Drive style (red with mountain scenery)
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || fileType === 'image') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ea4335">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
        );
    }

    // Video - Google Drive style (red with play button)
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes(ext) || fileType === 'video') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ea4335">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM10 16V8l6 4-6 4z" />
            </svg>
        );
    }

    // Audio - Google Drive style (red with musical note)
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext) || fileType === 'audio') {
        return (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ea4335">
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
const getLargeFileIcon = (file: FileInfo): React.ReactElement => {
    if (file.type === 'folder' || file.file_type === 'folder') return <LargeFolderIcon />;

    const mimeType = file.mimeType || file.mime_type || '';
    const name = file.name || file.filename || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const fileType = file.file_type?.toLowerCase() || '';

    // Image - Google Drive style (red with mountain scenery)
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || fileType === 'image') {
        return (
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="#ea4335">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
        );
    }

    // Video - Google Drive style (red with play button)
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv'].includes(ext) || fileType === 'video') {
        return (
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="#ea4335">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM10 16V8l6 4-6 4z" />
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

const FileItem = ({ file, viewMode, isSelected, onSelect, onRename, onDelete, onCopy, onMove, onShowInfo, onPreview, onDropFiles, selectedFiles, onFolderOpen, onStar }: FileItemProps) => {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(file.name || file.filename || '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const toast = useToast();

    const isFolder = file.type === 'folder';

    // Drag handlers
    const handleDragStart = (e: React.DragEvent) => {
        if (isFolder) {
            e.preventDefault();
            return;
        }

        // Set drag data - include all selected files if this file is selected
        const filesToDrag = isSelected && selectedFiles && selectedFiles.size > 1
            ? Array.from(selectedFiles)
            : [file.id];

        e.dataTransfer.setData('application/json', JSON.stringify({ fileIds: filesToDrag }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!isFolder) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (!isFolder || !onDropFiles) return;

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.fileIds && data.fileIds.length > 0) {
                // Extract folder ID from 'folder-123' format
                const folderId = String(file.id).replace('folder-', '');
                onDropFiles(folderId, data.fileIds);
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        onSelect(e.ctrlKey || e.metaKey);
    };

    const handleDoubleClick = () => {
        if (file.type === 'folder') {
            // Navigate to folder
            const folderId = Number(String(file.id).replace('folder-', ''));
            if (onFolderOpen) {
                onFolderOpen(folderId);
            }
        } else if (onPreview) {
            onPreview(file);
        } else {
            // Open download link (fallback)
            const filename = file.filename || file.name;
            window.open(`http://127.0.0.1:5000/download/${encodeURIComponent(filename)}`, '_blank');
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const handleContextMenuAction = (action: string) => {
        switch (action) {
            case 'download':
                const filename = file.filename || file.name;
                window.open(`http://127.0.0.1:5000/download/${filename}`, '_blank');
                break;
            case 'rename':
                setIsRenaming(true);
                break;
            case 'delete':
                if (onDelete) {
                    setShowDeleteConfirm(true);
                }
                break;
            case 'copy':
                onCopy?.(file);
                break;
            case 'move':
                onMove?.(file);
                break;
            case 'info':
                onShowInfo?.(file);
                break;
            case 'share':
                // Copy share link to clipboard
                const shareLink = `http://127.0.0.1:5000/share/${file.id}`;
                navigator.clipboard.writeText(shareLink);
                toast.success('Đã sao chép liên kết chia sẻ!');
                break;
            case 'open':
                handleDoubleClick();
                break;
            case 'star':
                onStar?.(file);
                break;
        }
        setContextMenu(null);
    };

    const handleRenameSubmit = () => {
        if (newName && newName !== (file.name || file.filename)) {
            onRename?.(file, newName);
        }
        setIsRenaming(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
            setNewName(file.name || file.filename || '');
        }
    };

    const displayName = file.name || file.filename || 'Unknown';
    const displaySize = formatFileSize(file.size || file.file_size);
    const displayDate = formatDate(file.modified);
    const displayChannel = file.telegram_channel || '-';
    const displayOwner = file.owner || 'tôi';

    if (viewMode === 'grid') {
        return (
            <>
                <div
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-all ${isSelected
                        ? 'bg-blue-100 ring-2 ring-blue-400'
                        : 'hover:bg-gray-100'
                        }`}
                >
                    {/* File Icon */}
                    <div className="flex items-center justify-center h-16 mb-2">
                        {getLargeFileIcon(file)}
                    </div>

                    {/* File Name - with rename input */}
                    {isRenaming ? (
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={handleRenameKeyDown}
                            className="w-full text-sm text-center px-1 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <p className="text-sm text-center text-gray-700 truncate" title={displayName}>
                            {displayName}
                        </p>
                    )}

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
                            setContextMenu({ x: e.clientX, y: e.clientY });
                        }}
                    >
                        <MoreIcon />
                    </button>
                </div>

                {/* Context Menu */}
                {contextMenu && (
                    <ContextMenu
                        file={file}
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(null)}
                        onAction={handleContextMenuAction}
                    />
                )}
            </>
        );
    }

    // List View - Google Drive style
    return (
        <>
            <div
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                draggable={!isFolder}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group flex items-center px-2 md:px-4 py-2 cursor-pointer transition-all border-b border-gray-100 ${isSelected
                    ? 'bg-blue-50'
                    : isDragOver
                        ? 'bg-blue-100 border-blue-300 border-2'
                        : 'hover:bg-gray-50'
                    }`}
            >
                {/* Checkbox - visible on hover or when selected */}
                <div
                    className={`mr-2 flex-shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(true); // Always multi-select mode when clicking checkbox
                    }}
                >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-400 hover:border-blue-500'
                        }`}
                    >
                        {isSelected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Icon */}
                <span className="mr-3 flex-shrink-0">{getFileIcon(file)}</span>

                {/* Name - with rename input */}
                {isRenaming ? (
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleRenameKeyDown}
                        className="flex-1 min-w-0 text-sm px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="flex-1 min-w-0 text-sm text-gray-700 truncate" title={displayName}>
                        {displayName}
                    </span>
                )}

                {/* Owner - hidden on mobile xs */}
                <span className="hidden sm:block w-24 md:w-32 text-sm text-gray-500 px-2 truncate">{displayOwner}</span>

                {/* Modified Date - hidden on mobile xs/sm */}
                <span className="hidden md:block w-36 lg:w-48 text-sm text-gray-500 px-2">{displayDate}</span>

                {/* Channel / Source - hidden on mobile/tablet */}
                <span className="hidden lg:block w-32 text-sm text-gray-500 px-2 truncate" title={displayChannel}>
                    {displayChannel}
                </span>

                {/* Actions */}
                <div className="w-10 flex justify-end">
                    <button
                        className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200"
                        onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY });
                        }}
                    >
                        <MoreIcon />
                    </button>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    file={file}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onAction={handleContextMenuAction}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Xóa tệp"
                message={`Bạn có chắc chắn muốn xóa "${file.name || file.filename}"? Thao tác này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmButtonColor="red"
                onConfirm={() => {
                    setShowDeleteConfirm(false);
                    onDelete?.(file);
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
};

export default FileItem;

