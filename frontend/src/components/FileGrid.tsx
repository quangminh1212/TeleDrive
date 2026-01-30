import { useState, useEffect } from 'react';
import FileItem from './FileItem';
import { ViewModeControls } from './Header';

interface FileData {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: number;
    modified: string;
    mimeType?: string;
    owner?: string;
}

interface FileGridProps {
    searchQuery: string;
    currentFolder: string | null;
    viewMode: 'grid' | 'list';
    onViewModeChange?: (mode: 'grid' | 'list') => void;
}

// Mock data - will be replaced with API calls
const mockFiles: FileData[] = [
    { id: '1', name: '0.CERT', type: 'folder', modified: '2024-01-15', owner: 'tôi' },
    { id: '2', name: '0.Hakinet', type: 'folder', modified: '2024-01-14', owner: 'tôi' },
    { id: '3', name: '0.LEARNING', type: 'folder', modified: '2024-01-13', owner: 'tôi' },
    { id: '4', name: '0.Xlab', type: 'folder', modified: '2024-01-12', owner: 'tôi' },
    { id: '5', name: '1.Lưu trữ', type: 'folder', modified: '2024-01-11', owner: 'tôi' },
    { id: '6', name: '3 anh', type: 'folder', modified: '2024-01-10', owner: 'tôi' },
    { id: '7', name: '3.Danh sách', type: 'folder', modified: '2024-01-09', owner: 'tôi' },
    { id: '8', name: '4 ảnh', type: 'folder', modified: '2024-01-08', owner: 'tôi' },
    { id: '9', name: '4.Lộp day', type: 'folder', modified: '2024-01-07', owner: 'tôi' },
    { id: '10', name: '687', type: 'folder', modified: '2024-01-06', owner: 'tôi' },
    { id: '11', name: 'abaaa', type: 'folder', modified: '2024-01-05', owner: 'tôi' },
    { id: '12', name: 'alexxc', type: 'folder', modified: '2024-01-04', owner: 'tôi' },
    { id: '13', name: 'back to future', type: 'folder', modified: '2024-01-03', owner: 'tôi' },
    { id: '14', name: 'be good', type: 'folder', modified: '2024-01-02', owner: 'tôi' },
    { id: '15', name: 'bkg', type: 'folder', modified: '2024-01-01', owner: 'tôi' },
    { id: '16', name: 'black3.1', type: 'folder', modified: '2023-12-30', owner: 'tôi' },
    { id: '17', name: 'bundle greenland png', type: 'folder', modified: '2023-12-29', owner: 'tôi' },
    { id: '18', name: 'carrfi', type: 'folder', modified: '2023-12-28', owner: 'tôi' },
    { id: '19', name: 'cgh', type: 'folder', modified: '2023-12-27', owner: 'tôi' },
    { id: '20', name: 'chu cai', type: 'folder', modified: '2023-12-26', owner: 'tôi' },
    { id: '21', name: 'CUSTOM', type: 'folder', modified: '2023-12-25', owner: 'tôi' },
    { id: '22', name: 'doll', type: 'folder', modified: '2023-12-24', owner: 'tôi' },
    { id: '23', name: 'Dung', type: 'folder', modified: '2023-12-23', owner: 'tôi' },
    { id: '24', name: 'ĐĂNG KÝ MỞ NGÀNH', type: 'folder', modified: '2023-12-22', owner: 'tôi' },
    { id: '25', name: 'elp', type: 'folder', modified: '2023-12-21', owner: 'tôi' },
];

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

const FileGrid = ({ searchQuery, currentFolder, viewMode, onViewModeChange }: FileGridProps) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [sortColumn, setSortColumn] = useState<'name' | 'modified'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [localViewMode, setLocalViewMode] = useState<'grid' | 'list'>(viewMode);

    useEffect(() => {
        setLocalViewMode(viewMode);
    }, [viewMode]);

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setLocalViewMode(mode);
        onViewModeChange?.(mode);
    };

    useEffect(() => {
        // Simulate API call
        setLoading(true);
        setTimeout(() => {
            let filtered = mockFiles;

            if (searchQuery) {
                filtered = filtered.filter(f =>
                    f.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            // Sort files
            filtered = [...filtered].sort((a, b) => {
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
            setLoading(false);
        }, 300);
    }, [searchQuery, currentFolder, sortColumn, sortDirection]);

    const handleFileSelect = (id: string, isMultiSelect: boolean) => {
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

    const folders = files.filter(f => f.type === 'folder');
    const regularFiles = files.filter(f => f.type === 'file');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gdrive-blue"></div>
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

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2">
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
                </div>

                {/* Right side - View mode toggle */}
                <ViewModeControls viewMode={localViewMode} onViewModeChange={handleViewModeChange} />
            </div>

            {/* Content */}
            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p className="text-lg">Không tìm thấy tệp nào</p>
                    <p className="text-sm">Thả tệp vào đây hoặc sử dụng nút "Mới"</p>
                </div>
            ) : localViewMode === 'list' ? (
                /* List View */
                <div className="flex-1 overflow-auto">
                    {/* Table Header */}
                    <div className="flex items-center px-4 py-2 text-sm text-gray-600 border-b border-gray-200 sticky top-0 bg-white">
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
                        <span className="w-24 text-left px-2">Nguồn</span>
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
        </div>
    );
};

export default FileGrid;
