import { useState, useEffect, useCallback } from 'react';
import FileItem from './FileItem';
import FilePreview from './FilePreview';
import { ViewModeControls } from './Header';
import { api, FileInfo, FolderInfo } from '../services/api';
import { useToast } from './Toast';

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
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ added: number; removed: number } | null>(null);
    const [filterSavedOnly, setFilterSavedOnly] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false,
    });
    const [folders, setFolders] = useState<FolderInfo[]>([]);
    const [moveFileTarget, setMoveFileTarget] = useState<FileInfo | null>(null);
    const toast = useToast();

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
            // Fetch both files and folders in parallel
            const [filesResponse, foldersResponse] = await Promise.all([
                api.getFiles(1, 100),
                api.getFolders()
            ]);

            let allItems: FileInfo[] = [];

            // Add folders first (they appear at top)
            if (foldersResponse.success && foldersResponse.data) {
                const folderItems = foldersResponse.data.folders.map((folder): FileInfo => ({
                    id: `folder-${folder.id}`,
                    name: folder.name,
                    type: 'folder',
                    size: 0,
                    modified: folder.created_at || '',
                    owner: 'tôi',
                    folder_name: folder.parent_id ? 'Subfolder' : 'Root',
                }));
                allItems = [...folderItems];
                setFolders(foldersResponse.data.folders);
            }

            // Add files
            if (filesResponse.success && filesResponse.data) {
                const normalizedFiles = filesResponse.data.files.map(normalizeFile);
                allItems = [...allItems, ...normalizedFiles];
                setPagination({
                    page: filesResponse.data.pagination.page,
                    total: filesResponse.data.pagination.total,
                    pages: filesResponse.data.pagination.pages,
                    hasNext: filesResponse.data.pagination.has_next,
                    hasPrev: filesResponse.data.pagination.has_prev,
                });
            }

            setAllFiles(allItems);

            if (!filesResponse.success && !foldersResponse.success) {
                setError(filesResponse.error || 'Không thể tải danh sách file');
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

        // Filter by Saved Messages only (when enabled)
        if (filterSavedOnly) {
            filtered = filtered.filter(f =>
                f.storage_type === 'telegram' ||
                f.telegram_channel === 'Saved Messages' ||
                f.telegram_channel === 'me'
            );
        }

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
    }, [allFiles, searchQuery, currentFolder, sortColumn, sortDirection, filterSavedOnly]);

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

    // Handle file rename
    const handleFileRename = async (file: FileInfo, newName: string) => {
        try {
            const response = await api.renameFile(Number(file.id), newName);
            if (response.success) {
                // Update local state
                setAllFiles(prev => prev.map(f =>
                    f.id === file.id ? { ...f, name: newName, filename: newName } : f
                ));
                toast.success(`Đã đổi tên thành "${newName}"`);
            } else {
                toast.error(`Lỗi đổi tên: ${response.error}`);
            }
        } catch (err) {
            toast.error('Lỗi đổi tên file');
        }
    };

    // Handle file delete
    const handleFileDelete = async (file: FileInfo) => {
        try {
            // Check if it's a folder (id starts with 'folder-')
            const isFolder = String(file.id).startsWith('folder-');

            if (isFolder) {
                // Extract folder ID from 'folder-123' format
                const folderId = parseInt(String(file.id).replace('folder-', ''));
                const response = await api.deleteFolder(folderId);
                if (response.success) {
                    setAllFiles(prev => prev.filter(f => f.id !== file.id));
                    toast.success(`Đã xóa thư mục "${file.name}"`);
                } else {
                    toast.error(`Lỗi xóa thư mục: ${response.error}`);
                }
            } else {
                const response = await api.deleteFile(file.id);
                if (response.success) {
                    setAllFiles(prev => prev.filter(f => f.id !== file.id));
                    toast.success(`Đã xóa "${file.name || file.filename}"`);
                } else {
                    toast.error(`Lỗi xóa file: ${response.error}`);
                }
            }
        } catch (err) {
            toast.error('Lỗi xóa');
        }
    };

    // Handle file move to folder
    const handleMoveFile = async (file: FileInfo) => {
        // Fetch folders first
        try {
            const response = await api.getFolders();
            if (response.success && response.data) {
                setFolders(response.data.folders);
            }
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
        setMoveFileTarget(file);
    };

    const handleConfirmMove = async (folderId: number | null) => {
        if (!moveFileTarget) return;

        try {
            const response = await api.moveFileToFolder(Number(moveFileTarget.id), folderId);
            if (response.success) {
                const folderName = folderId ? folders.find(f => f.id === folderId)?.name || 'thư mục' : 'Gốc';
                toast.success(`Đã di chuyển "${moveFileTarget.name}" đến "${folderName}"`);
                // Refresh file list
                await fetchFiles();
            } else {
                toast.error(`Lỗi di chuyển: ${response.error}`);
            }
        } catch (err) {
            toast.error('Lỗi di chuyển file');
        } finally {
            setMoveFileTarget(null);
        }
    };

    // Handle show file info
    const [infoFile, setInfoFile] = useState<FileInfo | null>(null);

    const handleShowInfo = (file: FileInfo) => {
        setInfoFile(file);
    };

    // Handle file preview
    const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);

    const handlePreview = (file: FileInfo) => {
        setPreviewFile(file);
    };

    const handleSort = (column: 'name' | 'modified') => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const [removedFilesList, setRemovedFilesList] = useState<string[]>([]);

    const handleRefresh = async () => {
        setIsScanning(true);
        setScanResult(null);
        setRemovedFilesList([]);
        setError(null);

        try {
            // Call rescan API
            const response = await api.rescanSavedMessages();

            if (response.success && response.data) {
                setScanResult({
                    added: response.data.stats.added,
                    removed: response.data.stats.removed
                });

                // Save removed files list for notification
                if (response.data.removed_files && response.data.removed_files.length > 0) {
                    setRemovedFilesList(response.data.removed_files.map(f => f.filename));
                }

                // Enable filter to show only Saved Messages
                setFilterSavedOnly(true);
                // Fetch updated files list
                await fetchFiles();
            } else {
                setError(response.error || 'Rescan failed');
            }
        } catch (err) {
            setError('Failed to rescan Saved Messages');
        } finally {
            setIsScanning(false);
            // Clear result after 10 seconds (more time for user to see removed files)
            setTimeout(() => {
                setScanResult(null);
                setRemovedFilesList([]);
            }, 10000);
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

    const fileTypeFolders = files.filter(f => f.type === 'folder');
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
                            Thời gian tạo
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

                        {/* Filter toggle - show when filter is active */}
                        {filterSavedOnly && (
                            <button
                                onClick={() => setFilterSavedOnly(false)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                                title="Nhấn để hiển thị tất cả file"
                            >
                                <span>Saved Messages</span>
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        )}

                        {/* Scan result notification */}
                        {scanResult && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                    +{scanResult.added} / -{scanResult.removed}
                                </span>
                                {removedFilesList.length > 0 && (
                                    <div className="relative group">
                                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded cursor-help">
                                            🗑️ {removedFilesList.length} file đã xóa
                                        </span>
                                        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 hidden group-hover:block min-w-48 max-w-80">
                                            <p className="text-xs font-medium text-gray-700 mb-1">File không còn trong Saved Messages:</p>
                                            <ul className="text-xs text-gray-600 max-h-32 overflow-y-auto">
                                                {removedFilesList.slice(0, 10).map((filename, idx) => (
                                                    <li key={idx} className="truncate py-0.5">• {filename}</li>
                                                ))}
                                                {removedFilesList.length > 10 && (
                                                    <li className="text-gray-400 italic">...và {removedFilesList.length - 10} file khác</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                            <span>Thời gian tạo</span>
                            {sortColumn === 'modified' && <SortIcon direction={sortDirection} />}
                        </button>
                        <span className="w-32 text-left px-2">Kênh</span>
                        <span className="w-10"></span>
                    </div>

                    {/* File List */}
                    <div>
                        {[...fileTypeFolders, ...regularFiles].map(file => (
                            <FileItem
                                key={file.id}
                                file={file}
                                viewMode="list"
                                isSelected={selectedFiles.has(file.id)}
                                onSelect={(isMulti) => handleFileSelect(file.id, isMulti)}
                                onRename={handleFileRename}
                                onDelete={handleFileDelete}
                                onMove={handleMoveFile}
                                onShowInfo={handleShowInfo}
                                onPreview={handlePreview}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                /* Grid View */
                <div className="flex-1 overflow-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {[...fileTypeFolders, ...regularFiles].map(file => (
                            <FileItem
                                key={file.id}
                                file={file}
                                viewMode="grid"
                                isSelected={selectedFiles.has(file.id)}
                                onSelect={(isMulti) => handleFileSelect(file.id, isMulti)}
                                onRename={handleFileRename}
                                onDelete={handleFileDelete}
                                onMove={handleMoveFile}
                                onShowInfo={handleShowInfo}
                                onPreview={handlePreview}
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

            {/* File Info Panel */}
            {infoFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setInfoFile(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-800">Thông tin về tệp</h3>
                            <button
                                onClick={() => setInfoFile(null)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{infoFile.name}</p>
                                    <p className="text-sm text-gray-500">{infoFile.type === 'folder' ? 'Thư mục' : 'Tệp'}</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Loại:</span>
                                    <span className="text-gray-800">{infoFile.mimeType || infoFile.file_type || 'Không xác định'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Kích thước:</span>
                                    <span className="text-gray-800">
                                        {infoFile.size ? `${(infoFile.size / 1024 / 1024).toFixed(2)} MB` : 'Không xác định'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Ngày sửa đổi:</span>
                                    <span className="text-gray-800">{infoFile.modified || 'Không xác định'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Chủ sở hữu:</span>
                                    <span className="text-gray-800">{infoFile.owner || 'tôi'}</span>
                                </div>
                                {infoFile.telegram_channel && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Kênh Telegram:</span>
                                        <span className="text-gray-800">{infoFile.telegram_channel}</span>
                                    </div>
                                )}
                                {infoFile.storage_type && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Lưu trữ:</span>
                                        <span className="text-gray-800 capitalize">{infoFile.storage_type}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setInfoFile(null)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Preview Modal */}
            {previewFile && (
                <FilePreview
                    file={previewFile}
                    onClose={() => setPreviewFile(null)}
                />
            )}

            {/* Move File Modal */}
            {moveFileTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setMoveFileTarget(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-800">Di chuyển đến thư mục</h3>
                            <button
                                onClick={() => setMoveFileTarget(null)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Di chuyển "<span className="font-medium">{moveFileTarget.name}</span>" đến:
                            </p>

                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {/* Root option */}
                                <button
                                    onClick={() => handleConfirmMove(null)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                >
                                    <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                    </svg>
                                    <span className="text-gray-800">Gốc (Drive của tôi)</span>
                                </button>

                                {/* Folder list */}
                                {folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => handleConfirmMove(folder.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                    >
                                        <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                        </svg>
                                        <div>
                                            <span className="text-gray-800">{folder.name}</span>
                                            <span className="text-xs text-gray-400 ml-2">({folder.file_count} tệp)</span>
                                        </div>
                                    </button>
                                ))}

                                {folders.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">
                                        Chưa có thư mục nào. Hãy tạo thư mục mới trước.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                            <button
                                onClick={() => setMoveFileTarget(null)}
                                className="px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileGrid;
