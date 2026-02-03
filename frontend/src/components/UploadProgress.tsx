import { useState } from 'react';

export interface UploadItem {
    id: string;
    filename: string;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    progress: number; // 0-100
    error?: string;
}

interface UploadProgressProps {
    items: UploadItem[];
    onClose: () => void;
    onClear: () => void;
}

const UploadProgress = ({ items, onClose, onClear }: UploadProgressProps) => {
    const [isMinimized, setIsMinimized] = useState(false);

    if (items.length === 0) return null;

    const completedCount = items.filter(item => item.status === 'completed').length;
    const errorCount = items.filter(item => item.status === 'error').length;
    const uploadingCount = items.filter(item => item.status === 'uploading' || item.status === 'pending').length;
    const allCompleted = uploadingCount === 0;

    // Get status text
    const getStatusText = () => {
        if (allCompleted) {
            if (errorCount > 0) {
                return `${completedCount} hoàn thành, ${errorCount} lỗi`;
            }
            return `${completedCount} tải lên hoàn tất`;
        }
        return `Đang tải ${uploadingCount} mục lên`;
    };

    // Get file icon based on filename
    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
            return (
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
            );
        }
        if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext || '')) {
            return (
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                </svg>
            );
        }
        if (['pdf'].includes(ext || '')) {
            return (
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
                </svg>
            );
        }
        if (['doc', 'docx'].includes(ext || '')) {
            return (
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
            );
        }
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
            return (
                <svg className="w-5 h-5 text-yellow-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 6h-2v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2v-2h-2V8h2v2h2v2z" />
                </svg>
            );
        }
        return (
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
            </svg>
        );
    };

    // Get status icon for each item
    const getStatusIcon = (item: UploadItem) => {
        switch (item.status) {
            case 'completed':
                return (
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                );
            case 'uploading':
                return (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                    </svg>
                );
        }
    };

    return (
        <div className="fixed bottom-0 sm:bottom-4 right-0 sm:right-4 w-full sm:w-[360px] bg-[#3c4043] sm:rounded-lg shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#4a4e51] transition-colors"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <span className="text-white text-sm font-medium">
                    {getStatusText()}
                </span>
                <div className="flex items-center gap-2">
                    {/* Minimize/Expand button */}
                    <button
                        className="p-1 hover:bg-[#5f6368] rounded-full transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(!isMinimized);
                        }}
                    >
                        <svg className={`w-5 h-5 text-white transition-transform ${isMinimized ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                        </svg>
                    </button>
                    {/* Close button */}
                    {allCompleted && (
                        <button
                            className="p-1 hover:bg-[#5f6368] rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                                onClose();
                            }}
                        >
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* File list */}
            {!isMinimized && (
                <div className="max-h-[300px] overflow-y-auto bg-white">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                        >
                            {/* File icon */}
                            {getFileIcon(item.filename)}

                            {/* Filename and progress */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 truncate">{item.filename}</p>
                                {item.status === 'uploading' && (
                                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                                        <div
                                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                            style={{ width: `${item.progress}%` }}
                                        ></div>
                                    </div>
                                )}
                                {item.status === 'error' && (
                                    <p className="text-xs text-red-500 mt-0.5">{item.error || 'Lỗi tải lên'}</p>
                                )}
                            </div>

                            {/* Status icon */}
                            {getStatusIcon(item)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UploadProgress;
