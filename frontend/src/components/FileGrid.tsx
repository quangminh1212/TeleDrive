import { useState, useEffect, useCallback } from 'react';
import FileItem from './FileItem';
import { ViewModeControls } from './Header';
import { api, FileInfo } from '../services/api';

interface FileGridProps {
    searchQuery: string;
    currentFolder: string | null;
    viewMode: 'grid' | 'list';
    onViewModeChange?: (mode: 'grid' | 'list') => void;
}

// Dropdown arrow icon
const DropdownIcon = () => (
    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5z" />
    </svg>
);

// Sort arrow icon
const SortIcon = ({ direction }: { direction: 'asc' | 'desc' }) => (
    <svg className="w-4 h-4 text-blue-600 ml-1" viewBox="0 0 24 24" fill="currentColor">
        {direction === 'asc'
            ? <path d="M7 14l5-5 5 5z" />
            : <path d="M7 10l5 5 5-5z" />
        }
    </svg>
);

// Normalize file data from backend
const normalizeFile = (file: FileInfo): FileInfo => {
    return {
        ...file,
        name: file.name || file.filename || 'Unknown',
        size: file.size || file.file_size || 0,
        mimeType: file.mimeType || file.mime_type,
        type: file.type === 'folder' || file.file_type === 'folder' ? 'folder' : 'file',
        owner: file.owner || 'tôi',
    };
};

const FileGrid = ({ searchQuery, currentFolder, viewMode, onViewModeChange }: FileGridProps) => {
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [allFiles, setAllFiles] = useState<FileInfo[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<string | number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<'name' | 'modified'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [localViewMode, setLocalViewMode] = useState<'grid' | 'list'>(viewMode);
    const [pagination, setPagination] = useState({
        page: 1,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false,
    });

    useEffect(() => {
        setLocalViewMode(viewMode);
    }, [viewMode]);

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setLocalViewMode(mode);
        onViewModeChange?.(mode);
    };

    // Fetch files from API
    const fetchFiles = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.getFiles(1, 100);

            if (response.success && response.data) {
                const normalizedFiles = response.data.files.map(normalizeFile);
                setAllFiles(normalizedFiles);
                setPagination({
                    page: response.data.pagination.page,
                    total: response.data.pagination.total,
                    pages: response.data.pagination.pages,
                    hasNext: response.data.pagination.has_next,
                    hasPrev: response.data.pagination.has_prev,
                });
            } else {
                setError(response.error || 'Không thể tải danh sách file');
                setAllFiles([]);
            }
        } catch (err) {
            setError('Lỗi kết nối đến server');
            setAllFiles([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Filter and sort files
    useEffect(() => {
        let filtered = [...allFiles];

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(f =>
                f.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by folder (if applicable)
        if (currentFolder === 'shared') {
            filtered = filtered.filter(f => f.telegram_channel);
        } else if (currentFolder === 'recent') {
            // Sort by modified date, most recent first
            filtered = [...filtered].sort((a, b) =>
                new Date(b.modified).getTime() - new Date(a.modified).getTime()
            );
        }

        // Sort files
        filtered = [...filtered].sort((a, b) => {
            // Folders first
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;

            if (sortColumn === 'name') {
                return sortDirection === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else {
                return sortDirection === 'asc'
                    ? new Date(a.modified).getTime() - new Date(b.modified).getTime()
                    : new Date(b.modified).getTime() - new Date(a.modified).getTime();
            }
        });

        setFiles(filtered);
    }, [allFiles, searchQuery, currentFolder, sortColumn, sortDirection]);

    const handleFileSelect = (id: string | number, isMultiSelect: boolean) => {
        setSelectedFiles(prev => {
            const newSet = new Set(isMultiSelect ? prev : []);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSort = (column: 'name' | 'modified') => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ added: number; removed: number } | null>(null);

    const handleRefresh = async () => {
        setIsScanning(true);
        setScanResult(null);
        setError(null);

        try {
            // Call rescan API
            const response = await api.rescanSavedMessages();

            if (response.success && response.data) {
                setScanResult({
                    added: response.data.stats.added,
                    removed: response.data.stats.removed
                });
                // Fetch updated files list
                await fetchFiles();
            } else {
                setError(response.error || 'Rescan failed');
            }
        } catch (err) {
            setError('Failed to rescan Saved Messages');
        } finally {
            setIsScanning(false);
            // Clear result after 5 seconds
            setTimeout(() => setScanResult(null), 5000);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gdrive-blue mb-4"></div>
                <p className="text-gray-500">Đang tải dữ liệu từ Telegram...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg className="w-16 h-16 mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-lg text-red-500 mb-2">Lỗi</p>
                <p className="text-sm mb-4">{error}</p>
                <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    const getFolderLabel = () => {
        switch (currentFolder) {
            case 'home': return 'Trang chủ';
            case null: return 'Drive của tôi';
            case 'shared': return 'Được chia sẻ với tôi';
            case 'recent': return 'Gần đây';
            case 'starred': return 'Có gắn dấu sao';
            case 'trash': return 'Thùng rác';
            case 'computer': return 'Máy tính';
            default: return 'Drive của tôi';
        }
    };

    const folders = files.filter(f => f.type === 'folder');
    const regularFiles = files.filter(f => f.type !== 'folder');

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                {/* Left side - Folder name and filters */}
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-lg font-medium text-gray-800 hover:bg-gray-100 px-2 py-1 rounded">
                        {getFolderLabel()}
                        <DropdownIcon />
                    </button>

                    {/* Filter buttons */}
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Loại
                            <DropdownIcon />
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Người
                            <DropdownIcon />
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Lần sửa đổi gần đây nhất
                            <DropdownIcon />
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Nguồn
                            <DropdownIcon />
                        </button>
                    </div>

                    {/* Rescan Saved Messages button */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isScanning}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all ${isScanning
                                    ? 'bg-blue-100 text-blue-600 cursor-wait'
                                    : 'text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            title="Quét lại Saved Messages từ Telegram"
                        >
                            <svg
                                className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`}
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                            </svg>
                            {isScanning ? 'Đang quét...' : 'Quét Telegram'}
                        </button>

                        {/* Scan result notification */}
                        {scanResult && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                +{scanResult.added} / -{scanResult.removed}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right side - View mode toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                        {files.length} mục
                    </span>
                    <ViewModeControls viewMode={localViewMode} onViewModeChange={handleViewModeChange} />
                </div>
            </div>

            {/* Content */}
            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <svg className="w-20 h-20 mb-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
                    </svg>
                    <p className="text-lg mb-2">Không tìm thấy tệp nào</p>
                    <p className="text-sm">Hãy quét kênh Telegram để thêm tệp vào đây</p>
                </div>
            ) : localViewMode === 'list' ? (
                /* List View */
                <div className="flex-1 overflow-auto">
                    {/* Table Header */}
                    <div className="flex items-center px-4 py-2 text-sm text-gray-600 border-b border-gray-200 sticky top-0 bg-white z-10">
                        <button
                            className="flex items-center flex-1 min-w-0 hover:bg-gray-50 -ml-2 px-2 py-1 rounded"
                            onClick={() => handleSort('name')}
                        >
                            <span>Tên</span>
                            {sortColumn === 'name' && <SortIcon direction={sortDirection} />}
                        </button>
                        <span className="w-32 text-left px-2">Chủ sở hữu</span>
                        <button
                            className="w-48 text-left flex items-center hover:bg-gray-50 px-2 py-1 rounded"
                            onClick={() => handleSort('modified')}
                        >
                            <span>Lần sửa đổi gần đây nhất</span>
                            {sortColumn === 'modified' && <SortIcon direction={sortDirection} />}
                        </button>
                        <span className="w-32 text-left px-2">Kênh</span>
                        <span className="w-10"></span>
                    </div>

                    {/* File List */}
                    <div>
                        {[...folders, ...regularFiles].map(file => (
                            <FileItem
                                key={file.id}
                                file={file}
                                viewMode="list"
                                isSelected={selectedFiles.has(file.id)}
                                onSelect={(isMulti) => handleFileSelect(file.id, isMulti)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                /* Grid View */
                <div className="flex-1 overflow-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {[...folders, ...regularFiles].map(file => (
                            <FileItem
                                key={file.id}
                                file={file}
                                viewMode="grid"
                                isSelected={selectedFiles.has(file.id)}
                                onSelect={(isMulti) => handleFileSelect(file.id, isMulti)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-200">
                    <span className="text-sm text-gray-500">
                        Trang {pagination.page} / {pagination.pages} ({pagination.total} mục)
                    </span>
                </div>
            )}
        </div>
    );
};

export default FileGrid;
