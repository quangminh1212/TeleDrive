import { useState, useEffect, useCallback, useRef } from 'react';
import FileItem from './FileItem';
import FilePreview from './FilePreview';
import { ViewModeControls, ViewMode } from './Header';
import { api, FileInfo, FolderInfo } from '../services/api';
import { useToast } from './Toast';
import { useUpload } from '../contexts/UploadContext';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmDialog from './ConfirmDialog';
import { logger } from '../utils/logger';
import { useI18n } from '../i18n';

interface FileGridProps {
    searchQuery: string;
    currentFolder: string | null;
    viewMode: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
    onFolderSelect?: (folderId: number | null) => void;
}

// Dropdown arrow icon
const DropdownIcon = () => (
    <svg className="w-4 h-4 text-gray-600 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5z" />
    </svg>
);

// Sort arrow icon
const SortIcon = ({ direction }: { direction: 'asc' | 'desc' }) => (
    <svg className="w-4 h-4 text-blue-600 dark:text-dark-blue ml-1" viewBox="0 0 24 24" fill="currentColor">
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

const FileGrid = ({ searchQuery, currentFolder, viewMode, onViewModeChange, onFolderSelect }: FileGridProps) => {
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [allFiles, setAllFiles] = useState<FileInfo[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<string | number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<'name' | 'modified'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [localViewMode, setLocalViewMode] = useState<ViewMode>(viewMode);
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
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
    const [isOperationLoading, setIsOperationLoading] = useState(false);
    const [operationMessage, setOperationMessage] = useState<string | null>(null);
    // Page transition animation states
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    const [skipItemAnimation, setSkipItemAnimation] = useState(false);
    const prevFolderRef = useRef<string | null>(null);
    const toast = useToast();
    const { t } = useI18n();
    const { addNotification } = useNotification();

    // Upload context
    const { uploadFiles } = useUpload();

    // Drag selection state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const fileListRef = useRef<HTMLDivElement>(null);

    // Drag & drop upload state
    const [isDragOver, setIsDragOver] = useState(false);
    const dragCounterRef = useRef(0);

    useEffect(() => {
        setLocalViewMode(viewMode);
    }, [viewMode]);

    const handleViewModeChange = (mode: ViewMode) => {
        if (mode === localViewMode) return;
        setIsTransitioning(true);
        setSkipItemAnimation(true); // Skip per-item stagger, use container fade only
        // Wait for fade-out animation to complete
        setTimeout(() => {
            setLocalViewMode(mode);
            onViewModeChange?.(mode);
            setAnimationKey(prev => prev + 1);
            // Double rAF: ensure browser paints the new DOM with entering state,
            // then remove transitioning to trigger fade-in
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsTransitioning(false);
                });
            });
        }, 120);
    };

    // Map ViewMode to FileItem viewMode prop
    const getFileItemViewMode = (mode: ViewMode): 'grid' | 'list' => {
        switch (mode) {
            case 'details':
            case 'list':
                return 'list';
            default:
                return 'grid';
        }
    };

    // Get grid classes based on view mode
    const getGridClasses = (mode: ViewMode): string => {
        switch (mode) {
            case 'small-icons':
                return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2';
            case 'medium-icons':
                return 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
            case 'large-icons':
                return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';
            default:
                return '';
        }
    };

    // Save folder to recent history
    const saveRecentFolder = useCallback((folderId: number) => {
        const MAX_RECENT = 20; // Keep last 20 folders
        const recentFolders: number[] = JSON.parse(localStorage.getItem('teledrive_recent_folders') || '[]');

        // Remove if already exists (to move to front)
        const filtered = recentFolders.filter(id => id !== folderId);

        // Add to front
        filtered.unshift(folderId);

        // Limit size
        if (filtered.length > MAX_RECENT) {
            filtered.splice(MAX_RECENT);
        }

        localStorage.setItem('teledrive_recent_folders', JSON.stringify(filtered));
    }, []);

    // Wrapper for folder open that also saves to recent
    const handleFolderOpen = useCallback((folderId: number | null) => {
        if (folderId !== null) {
            saveRecentFolder(folderId);
        }
        onFolderSelect?.(folderId);
    }, [onFolderSelect, saveRecentFolder]);

    // Fetch files from API
    const fetchFiles = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Special case: recent folders (accessed recently)
            if (currentFolder === 'recent') {
                // Get recent folder IDs from localStorage
                const recentFolderIds: number[] = JSON.parse(localStorage.getItem('teledrive_recent_folders') || '[]');

                if (recentFolderIds.length === 0) {
                    setAllFiles([]);
                    setFolders([]);
                    setPagination({ page: 1, total: 0, pages: 1, hasNext: false, hasPrev: false });
                    setLoading(false);
                    return;
                }

                // Fetch all folders to get details
                const foldersResponse = await api.getFolders();
                if (foldersResponse.success && foldersResponse.data) {
                    // Filter only recent folders that still exist (not deleted)
                    const existingFolders = foldersResponse.data.folders.filter(
                        folder => recentFolderIds.includes(folder.id)
                    );

                    // Sort by recent access order (most recent first)
                    const sortedFolders = existingFolders.sort((a, b) => {
                        return recentFolderIds.indexOf(a.id) - recentFolderIds.indexOf(b.id);
                    });

                    const folderItems = sortedFolders.map((folder): FileInfo => ({
                        id: `folder-${folder.id}`,
                        name: folder.name,
                        type: 'folder',
                        size: 0,
                        modified: folder.created_at || '',
                        owner: 'tôi',
                        is_favorite: folder.is_favorite,
                    }));

                    setAllFiles(folderItems);
                    setFolders([]);
                    setPagination({ page: 1, total: folderItems.length, pages: 1, hasNext: false, hasPrev: false });
                } else {
                    setAllFiles([]);
                }
                setLoading(false);
                return;
            }

            // Special case: starred items
            if (currentFolder === 'starred') {
                const starredResponse = await api.getStarredItems();
                if (starredResponse.success && starredResponse.data) {
                    const folderItems = starredResponse.data.folders.map((folder): FileInfo => ({
                        id: `folder-${folder.id}`,
                        name: folder.name,
                        type: 'folder',
                        size: 0,
                        modified: folder.created_at || '',
                        owner: 'tôi',
                        is_favorite: true,
                    }));
                    const fileItems = starredResponse.data.files.map((f): FileInfo => ({
                        ...f,
                        name: f.filename || f.name,
                        type: f.type || 'file',
                        modified: f.created_at || '',
                        owner: 'tôi',
                        is_favorite: true,
                    }));
                    setAllFiles([...folderItems, ...fileItems]);
                    setFolders([]);
                    setPagination({ page: 1, total: folderItems.length + fileItems.length, pages: 1, hasNext: false, hasPrev: false });
                } else {
                    setError('Không thể tải mục có gắn dấu sao');
                }
                setLoading(false);
                return;
            }

            // Check if currentFolder is a numeric folder ID
            const folderId = currentFolder ? parseInt(currentFolder) : null;
            const isSpecificFolder = folderId !== null && !isNaN(folderId);

            if (isSpecificFolder) {
                // Fetch files from specific folder
                const folderFilesResponse = await api.getFolderFiles(folderId, 1, 100);

                if (folderFilesResponse.success && folderFilesResponse.data) {
                    const normalizedFiles = folderFilesResponse.data.files.map(normalizeFile);
                    setAllFiles(normalizedFiles);
                    setFolders([]);
                    setCurrentFolderName(folderFilesResponse.data.folder?.name || null);
                    setPagination({
                        page: folderFilesResponse.data.pagination.page,
                        total: folderFilesResponse.data.pagination.total,
                        pages: folderFilesResponse.data.pagination.pages,
                        hasNext: folderFilesResponse.data.pagination.has_next,
                        hasPrev: folderFilesResponse.data.pagination.has_prev,
                    });
                } else {
                    setError(folderFilesResponse.error || 'Không thể tải files trong thư mục');
                }
                setLoading(false);
                return;
            }

            // Clear folder name when at root
            setCurrentFolderName(null);

            // Default: Fetch both files and folders in parallel (root view)
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
                    is_favorite: folder.is_favorite,
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
                setError(filesResponse.error || t('messages.error'));
            }
        } catch (err) {
            setError(t('common.connectionError'));
            setAllFiles([]);
        } finally {
            setLoading(false);
        }
    }, [currentFolder]);

    // Trigger page transition animation when folder changes
    useEffect(() => {
        if (prevFolderRef.current !== currentFolder) {
            // Folder changed - trigger transition animation
            setSkipItemAnimation(false); // Re-enable per-item stagger for folder navigation
            setIsTransitioning(true);
            const timer = setTimeout(() => {
                setIsTransitioning(false);
                setAnimationKey(prev => prev + 1);
            }, 150); // Short fade out duration
            prevFolderRef.current = currentFolder;
            return () => clearTimeout(timer);
        }
    }, [currentFolder]);

    useEffect(() => {
        logger.info('FileGrid', 'Component mounted/updated, calling fetchFiles');
        fetchFiles();
    }, [fetchFiles]);

    // Drag & Drop Upload handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;

        // Check if dragging files (not internal drag selection)
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file');
            if (hasFiles) {
                setIsDragOver(true);
            }
        } else if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            setIsDragOver(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragOver(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Set dropEffect to indicate files can be copied here
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    const handleDropUpload = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        // Get current folder ID for upload
        const folderId = currentFolder && !isNaN(parseInt(currentFolder)) ? currentFolder : undefined;

        // Use upload context to handle upload with progress tracking
        // Note: UploadContext will trigger onUploadComplete after a delay,
        // which causes App to remount and refresh the file list automatically
        await uploadFiles(files, folderId);
    }, [currentFolder, uploadFiles]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            handleDropUpload(droppedFiles);
        }
    }, [handleDropUpload]);

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
        setIsOperationLoading(true);
        setOperationMessage(t('messages.renaming'));
        try {
            const response = await api.renameFile(Number(file.id), newName);
            if (response.success) {
                // Update local state
                setAllFiles(prev => prev.map(f =>
                    f.id === file.id ? { ...f, name: newName, filename: newName } : f
                ));
                toast.success(t('files.rename') + `: "${newName}"`);
                // Add notification
                addNotification('rename', `${t('notifications.fileRenamed')} "${newName}"`, file.name);
            } else {
                toast.error(t('messages.error') + `: ${response.error}`);
                addNotification('error', t('messages.error'), file.name);
            }
        } catch (err) {
            toast.error(t('messages.networkError'));
            addNotification('error', t('messages.networkError'), file.name);
        } finally {
            setIsOperationLoading(false);
            setOperationMessage(null);
        }
    };

    // Handle file delete
    const handleFileDelete = async (file: FileInfo) => {
        setIsOperationLoading(true);
        setOperationMessage(t('messages.deleting'));
        try {
            // Check if it's a folder (id starts with 'folder-')
            const isFolder = String(file.id).startsWith('folder-');

            if (isFolder) {
                // Extract folder ID from 'folder-123' format
                const folderId = parseInt(String(file.id).replace('folder-', ''));
                const response = await api.deleteFolder(folderId);
                if (response.success) {
                    setAllFiles(prev => prev.filter(f => f.id !== file.id));
                    toast.success(t('messages.deleteSuccess') + `: "${file.name}"`);
                    // Add notification
                    addNotification('delete', `${t('notifications.fileDeleted')} "${file.name}"`, file.name);
                } else {
                    toast.error(t('messages.deleteFailed') + `: ${response.error}`);
                    addNotification('error', t('messages.deleteFailed'), file.name);
                }
            } else {
                const response = await api.deleteFile(file.id);
                if (response.success) {
                    setAllFiles(prev => prev.filter(f => f.id !== file.id));
                    toast.success(t('messages.deleteSuccess') + `: "${file.name || file.filename}"`);
                    // Add notification
                    addNotification('delete', `${t('notifications.fileDeleted')} "${file.name || file.filename}"`, file.name || file.filename);
                } else {
                    toast.error(t('messages.deleteFailed') + `: ${response.error}`);
                    addNotification('error', t('messages.deleteFailed'), file.name || file.filename);
                }
            }
        } catch (err) {
            toast.error(t('messages.networkError'));
            addNotification('error', t('messages.networkError'), file.name);
        } finally {
            setIsOperationLoading(false);
            setOperationMessage(null);
        }
    };

    // Handle bulk delete (multiple files/folders)
    const handleBulkDelete = async () => {
        if (selectedFiles.size === 0) return;

        setIsOperationLoading(true);
        setOperationMessage(t('messages.deleting'));

        let successCount = 0;
        let errorCount = 0;

        for (const fileId of selectedFiles) {
            try {
                const isFolder = String(fileId).startsWith('folder-');

                if (isFolder) {
                    const folderId = parseInt(String(fileId).replace('folder-', ''));
                    const response = await api.deleteFolder(folderId);
                    if (response.success) successCount++;
                    else errorCount++;
                } else {
                    const response = await api.deleteFile(fileId);
                    if (response.success) successCount++;
                    else errorCount++;
                }
            } catch (err) {
                errorCount++;
            }
        }

        // Update local state
        setAllFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
        setSelectedFiles(new Set());
        setIsOperationLoading(false);
        setOperationMessage(null);

        if (successCount > 0 && errorCount === 0) {
            toast.success(t('messages.deleteSuccess') + `: ${successCount} ` + t('messages.itemsSelected').replace('{count}', ''));
        } else if (successCount > 0 && errorCount > 0) {
            toast.warning(`${successCount} ${t('messages.deleteSuccess')}, ${errorCount} ${t('messages.error')}`);
        } else {
            toast.error(t('messages.deleteFailed'));
        }
    };

    // Select all files
    const handleSelectAll = () => {
        if (selectedFiles.size === files.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(files.map(f => f.id)));
        }
    };

    // Clear selection
    const handleClearSelection = () => {
        setSelectedFiles(new Set());
    };

    // Drag selection handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        // Only start drag if clicking on empty space (not on a file item)
        if ((e.target as HTMLElement).closest('[data-file-item]')) return;
        if ((e.target as HTMLElement).closest('button')) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;

        setDragStart({ x, y });
        setDragEnd({ x, y });
        setIsDragging(true);

        // Clear selection if not holding Ctrl/Cmd
        if (!e.ctrlKey && !e.metaKey) {
            setSelectedFiles(new Set());
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;

        setDragEnd({ x, y });

        // Calculate selection box
        const selectionBox = {
            left: Math.min(dragStart.x, x),
            top: Math.min(dragStart.y, y),
            right: Math.max(dragStart.x, x),
            bottom: Math.max(dragStart.y, y),
        };

        // Find files within selection box
        const fileItems = fileListRef.current?.querySelectorAll('[data-file-item]');
        if (!fileItems) return;

        const newSelected = new Set(e.ctrlKey || e.metaKey ? selectedFiles : []);

        fileItems.forEach((item) => {
            const itemRect = item.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const itemBox = {
                left: itemRect.left - containerRect.left + container.scrollLeft,
                top: itemRect.top - containerRect.top + container.scrollTop,
                right: itemRect.right - containerRect.left + container.scrollLeft,
                bottom: itemRect.bottom - containerRect.top + container.scrollTop,
            };

            // Check intersection
            if (
                selectionBox.left < itemBox.right &&
                selectionBox.right > itemBox.left &&
                selectionBox.top < itemBox.bottom &&
                selectionBox.bottom > itemBox.top
            ) {
                const fileId = item.getAttribute('data-file-id');
                if (fileId) {
                    // Try parsing as number first, fallback to string (for folder-xxx)
                    const id = fileId.startsWith('folder-') ? fileId : parseInt(fileId) || fileId;
                    newSelected.add(id);
                }
            }
        });

        setSelectedFiles(newSelected);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Get selection box style
    const getSelectionBoxStyle = () => {
        if (!isDragging) return { display: 'none' };

        const left = Math.min(dragStart.x, dragEnd.x);
        const top = Math.min(dragStart.y, dragEnd.y);
        const width = Math.abs(dragEnd.x - dragStart.x);
        const height = Math.abs(dragEnd.y - dragStart.y);

        return {
            display: 'block',
            position: 'absolute' as const,
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: 'rgba(26, 115, 232, 0.1)',
            border: '1px solid rgba(26, 115, 232, 0.5)',
            pointerEvents: 'none' as const,
            zIndex: 100,
        };
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

        setIsOperationLoading(true);
        setOperationMessage(t('messages.moving'));
        try {
            const response = await api.moveFileToFolder(Number(moveFileTarget.id), folderId);
            if (response.success) {
                const folderName = folderId ? folders.find(f => f.id === folderId)?.name || t('folders.newFolder') : t('sidebar.myDrive');
                toast.success(`${t('files.move')}: "${moveFileTarget.name}" → "${folderName}"`);
                // Add notification
                addNotification('move', `${t('notifications.fileMoved')} "${folderName}"`, moveFileTarget.name);
                // Refresh file list
                await fetchFiles();
            } else {
                toast.error(t('messages.error') + `: ${response.error}`);
                addNotification('error', t('messages.error'), moveFileTarget.name);
            }
        } catch (err) {
            toast.error(t('messages.networkError'));
            addNotification('error', t('messages.networkError'), moveFileTarget.name);
        } finally {
            setMoveFileTarget(null);
            setIsOperationLoading(false);
            setOperationMessage(null);
        }
    };

    // Handle drop files to folder (drag & drop)
    const handleDropFilesToFolder = async (targetFolderId: string | number, fileIds: (string | number)[]) => {
        const folderId = Number(targetFolderId);
        const validFileIds = fileIds.filter(id => !String(id).startsWith('folder-')).map(id => Number(id));

        if (validFileIds.length === 0) {
            toast.error(t('common.cannotMoveFolder'));
            return;
        }

        // Move all files
        let successCount = 0;
        let errorCount = 0;

        for (const fileId of validFileIds) {
            try {
                const response = await api.moveFileToFolder(fileId, folderId);
                if (response.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch {
                errorCount++;
            }
        }

        if (successCount > 0) {
            toast.success(t('common.movedFiles', { count: successCount }));
            // Clear selection and refresh
            setSelectedFiles(new Set());
            await fetchFiles();
        }
        if (errorCount > 0) {
            toast.error(t('common.moveError', { count: errorCount }));
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

    const handleToggleStar = async (file: FileInfo) => {
        try {
            if (file.type === 'folder') {
                const folderId = Number(String(file.id).replace('folder-', ''));
                const response = await api.toggleFolderStar(folderId);
                if (response.success) {
                    const isStarred = response.data?.is_favorite;
                    toast.success(isStarred ? t('notifications.fileStarred') : t('notifications.fileUnstarred'));
                    // Add notification
                    addNotification('star', isStarred ? t('notifications.fileStarred') : t('notifications.fileUnstarred'), file.name);
                    await fetchFiles();
                } else {
                    toast.error(t('common.starError', { error: response.error || t('common.starDefaultError') }));
                }
            } else {
                const fileId = Number(file.id);
                const response = await api.toggleFileStar(fileId);
                if (response.success) {
                    const isStarred = response.data?.is_favorite;
                    toast.success(isStarred ? t('notifications.fileStarred') : t('notifications.fileUnstarred'));
                    // Add notification
                    addNotification('star', isStarred ? t('notifications.fileStarred') : t('notifications.fileUnstarred'), file.name);
                    await fetchFiles();
                } else {
                    toast.error(t('common.starError', { error: response.error || t('common.starDefaultError') }));
                }
            }
        } catch (error) {
            console.error('Toggle star error:', error);
            toast.error(t('common.starChangeError'));
        }
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gdrive-blue dark:border-dark-blue mb-4"></div>
                <p className="text-gray-500 dark:text-dark-text-secondary">{t('messages.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-dark-text-secondary">
                <svg className="w-16 h-16 mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-lg text-red-500 mb-2">{t('messages.error')}</p>
                <p className="text-sm mb-4">{error}</p>
                <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-600 dark:bg-dark-blue text-white dark:text-dark-bg rounded-lg hover:bg-blue-700 dark:hover:bg-dark-blue-hover transition-colors"
                >
                    {t('actions.retry')}
                </button>
            </div>
        );
    }

    const getFolderLabel = () => {
        // If we have a specific folder name, use it
        if (currentFolderName) {
            return currentFolderName;
        }

        switch (currentFolder) {
            case 'home': return t('sidebar.home');
            case null: return t('sidebar.myDrive');
            case 'shared': return t('sidebar.sharedWithMe');
            case 'recent': return t('sidebar.recent');
            case 'starred': return t('sidebar.starred');
            case 'trash': return t('sidebar.trash');
            case 'computer': return t('sidebar.computer');
            default: return t('sidebar.myDrive');
        }
    };

    // Check if we're inside a specific folder (numeric ID)
    const isInFolder = currentFolderName !== null;

    const fileTypeFolders = files.filter(f => f.type === 'folder');
    const regularFiles = files.filter(f => f.type !== 'folder');

    return (
        <div
            className="h-full flex flex-col relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Drag & Drop Overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 bg-blue-50/95 dark:bg-dark-selected/95 border-4 border-dashed border-blue-500 dark:border-dark-blue rounded-lg flex items-center justify-center backdrop-blur-sm pointer-events-none">
                    <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-6 border-2 border-blue-200 dark:border-dark-border animate-pulse-slow">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-dark-blue dark:to-blue-400 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17-.53-.32-1.14-.53-1.79-.63A5.994 5.994 0 0 0 0 10c0 1.06.28 2.05.76 2.92.3.55.67 1.05 1.1 1.49C2.45 17.55 5.45 20 9 20h10c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-dark-blue mb-2">{t('files.dropHere')}</p>
                            <p className="text-base text-gray-600 dark:text-dark-text-secondary">{t('files.dragAndDrop')}</p>
                            {currentFolder && currentFolder !== 'starred' && currentFolder !== 'shared' && currentFolder !== 'recent' && (
                                <p className="text-sm text-blue-500 mt-2">{t('sidebar.upload')}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Operation Loading Overlay */}
            {isOperationLoading && (
                <div className="absolute inset-0 z-40 bg-white/80 dark:bg-dark-bg/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-lg p-6 flex items-center gap-4 border border-gray-200 dark:border-dark-border">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-dark-blue"></div>
                        <span className="text-gray-700 dark:text-dark-text font-medium">{operationMessage || t('messages.processing')}</span>
                    </div>
                </div>
            )}

            {/* Upload Progress Overlay */}

            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 md:px-4 py-2 border-b border-gray-100 dark:border-dark-border">
                {/* Left side - Folder name and filters OR Selection toolbar */}
                <div className="flex items-center gap-2 md:gap-4">
                    {selectedFiles.size > 0 ? (
                        /* Selection Toolbar - replaces folder name when files selected */
                        <div className="flex items-center gap-3">
                            {/* Close / Clear selection */}
                            <button
                                onClick={handleClearSelection}
                                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                                title={t('actions.clearSelection')}
                            >
                                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>

                            {/* Selection count */}
                            <span className="text-sm font-medium text-gray-800 dark:text-dark-text">
                                {t('messages.itemsSelected', { count: selectedFiles.size })}
                            </span>

                            {/* Divider */}
                            <div className="w-px h-5 bg-gray-300 dark:bg-dark-border" />

                            {/* Select All */}
                            <button
                                onClick={handleSelectAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                                title={t('actions.selectAll')}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z" />
                                </svg>
                                {t('actions.selectAll')}
                            </button>

                            {/* Delete */}
                            <button
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title={t('actions.delete')}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                </svg>
                                {t('actions.delete')}
                            </button>
                        </div>
                    ) : (
                        /* Normal toolbar */
                        <>
                            {/* Back button when inside a folder */}
                            {isInFolder && (
                                <button
                                    onClick={() => onFolderSelect?.(null)}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-dark-hover rounded-full transition-colors mr-1"
                                    title={t('actions.back')}
                                >
                                    <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                                    </svg>
                                </button>
                            )}
                            <button className="flex items-center gap-1 text-lg font-medium text-gray-800 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover px-2 py-1 rounded">
                                {getFolderLabel()}
                                <DropdownIcon />
                            </button>

                            {/* Filter buttons - hidden on mobile/tablet */}
                            <div className="hidden lg:flex items-center gap-2">
                                <button
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-dark-text border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover"
                                    aria-label={t('files.filterByType')}
                                >
                                    {t('files.type')}
                                    <DropdownIcon />
                                </button>
                                <button
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-dark-text border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover"
                                    aria-label={t('files.filterByOwner')}
                                >
                                    {t('files.owner')}
                                    <DropdownIcon />
                                </button>
                                <button
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-dark-text border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover"
                                    aria-label={t('files.filterByDate')}
                                >
                                    {t('files.lastModified')}
                                    <DropdownIcon />
                                </button>
                            </div>
                        </>
                    )}

                    {/* Rescan Saved Messages button - Hide on starred view */}
                    {currentFolder !== 'starred' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={isScanning}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all ${isScanning
                                    ? 'bg-blue-100 dark:bg-dark-selected text-blue-600 dark:text-dark-blue cursor-wait'
                                    : 'text-gray-700 dark:text-dark-text border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover'
                                    }`}
                                title={t('actions.scanTelegram')}
                                aria-label={t('actions.scanTelegram')}
                            >
                                <svg
                                    className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`}
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                </svg>
                                {isScanning ? t('messages.loading') : t('actions.scanTelegram')}
                            </button>

                            {/* Filter toggle - show when filter is active */}
                            {filterSavedOnly && (
                                <button
                                    onClick={() => setFilterSavedOnly(false)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-dark-selected text-blue-700 dark:text-dark-blue rounded-full hover:bg-blue-200 dark:hover:bg-dark-selected-hover transition-colors"
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
                                            <div className="absolute left-0 top-full mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-lg p-2 z-50 hidden group-hover:block min-w-48 max-w-80">
                                                <p className="text-xs font-medium text-gray-700 dark:text-dark-text mb-1">File không còn trong Saved Messages:</p>
                                                <ul className="text-xs text-gray-600 dark:text-dark-text-secondary max-h-32 overflow-y-auto">
                                                    {removedFilesList.slice(0, 10).map((filename, idx) => (
                                                        <li key={idx} className="truncate py-0.5">• {filename}</li>
                                                    ))}
                                                    {removedFilesList.length > 10 && (
                                                        <li className="text-gray-400 dark:text-dark-text-disabled italic">...và {removedFilesList.length - 10} file khác</li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right side - View mode toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                        {files.length} {t('files.items')}
                    </span>
                    <ViewModeControls viewMode={localViewMode} onViewModeChange={handleViewModeChange} />
                </div>
            </div>

            {/* Content */}
            {files.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-dark-text-secondary">
                    {currentFolder === 'starred' ? (
                        /* Empty state for Starred view */
                        <>
                            <svg className="w-20 h-20 mb-4 text-gray-300 dark:text-dark-text-disabled" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            <p className="text-lg mb-2">{t('files.noStarred') || 'Chưa có mục nào được gắn dấu sao'}</p>
                            <p className="text-sm">{t('files.starHint') || 'Gắn dấu sao cho file hoặc thư mục để tìm nhanh hơn'}</p>
                        </>
                    ) : currentFolder === 'recent' ? (
                        /* Empty state for Recent view */
                        <>
                            <svg className="w-20 h-20 mb-4 text-gray-300 dark:text-dark-text-disabled" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                                <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                            </svg>
                            <p className="text-lg mb-2">{t('files.noRecent')}</p>
                            <p className="text-sm">{t('files.recentHint')}</p>
                        </>
                    ) : (
                        /* Empty state for other views */
                        <>
                            <svg className="w-20 h-20 mb-4 text-gray-300 dark:text-dark-text-disabled" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
                            </svg>
                            <p className="text-lg mb-2">{searchQuery ? t('messages.noSearchResults').replace('{query}', searchQuery) : t('files.noFiles')}</p>
                            <p className="text-sm mb-4">{searchQuery ? t('actions.clearSelection') : t('actions.scanHint')}</p>
                            {!searchQuery && (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-dark-blue bg-blue-50 dark:bg-dark-selected px-4 py-2 rounded-lg">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17-.53-.32-1.14-.53-1.79-.63A5.994 5.994 0 0 0 0 10c0 1.06.28 2.05.76 2.92.3.55.67 1.05 1.1 1.49C2.45 17.55 5.45 20 9 20h10c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                                        </svg>
                                        <span>{t('files.dragAndDrop')}</span>
                                    </div>
                                    <button
                                        onClick={handleRefresh}
                                        disabled={isScanning}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-dark-blue text-white dark:text-dark-bg rounded-lg hover:bg-blue-700 dark:hover:bg-dark-blue-hover transition-colors disabled:opacity-50"
                                    >
                                        <svg className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                        </svg>
                                        {isScanning ? t('messages.loading') : t('actions.scanTelegram')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (localViewMode === 'details' || localViewMode === 'list') ? (
                /* Details View / Compact List View */
                <div
                    ref={containerRef}
                    className={`flex-1 overflow-auto relative select-none content-transition ${isTransitioning ? 'content-entering' : 'content-visible'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Selection Box */}
                    <div style={getSelectionBoxStyle()} />

                    {/* Table Header - only for details view */}
                    {localViewMode === 'details' && (
                        <div className="flex items-center px-2 md:px-4 py-2 text-sm text-gray-600 dark:text-dark-text-secondary border-b border-gray-200 dark:border-dark-border sticky top-0 bg-white dark:bg-dark-bg z-10">
                            <button
                                className="flex items-center flex-1 min-w-0 hover:bg-gray-50 dark:hover:bg-dark-hover -ml-2 px-2 py-1 rounded"
                                onClick={() => handleSort('name')}
                            >
                                <span>{t('files.name')}</span>
                                {sortColumn === 'name' && <SortIcon direction={sortDirection} />}
                            </button>
                            <span className="hidden sm:block w-24 md:w-32 text-left px-2">{t('files.owner')}</span>
                            <button
                                className="hidden md:flex w-36 lg:w-48 text-left items-center hover:bg-gray-50 dark:hover:bg-dark-hover px-2 py-1 rounded"
                                onClick={() => handleSort('modified')}
                            >
                                <span>{t('files.lastModified')}</span>
                                {sortColumn === 'modified' && <SortIcon direction={sortDirection} />}
                            </button>
                            <span className="hidden lg:block w-32 text-left px-2">{t('files.owner')}</span>
                            <span className="w-10"></span>
                        </div>
                    )}

                    {/* File List */}
                    <div ref={fileListRef} key={animationKey} className={localViewMode === 'list' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}>
                        {[...fileTypeFolders, ...regularFiles].map((file, index) => (
                            <div
                                key={file.id}
                                data-file-item
                                data-file-id={file.id}
                                className={skipItemAnimation ? '' : 'file-item-animate'}
                                style={skipItemAnimation ? undefined : { animationDelay: `${Math.min(index * 0.02, 0.4)}s` }}
                            >
                                <FileItem
                                    file={file}
                                    viewMode={getFileItemViewMode(localViewMode)}
                                    isSelected={selectedFiles.has(file.id)}
                                    onSelect={(isMulti) => handleFileSelect(file.id, isMulti)}
                                    onRename={handleFileRename}
                                    onDelete={handleFileDelete}
                                    onMove={handleMoveFile}
                                    onShowInfo={handleShowInfo}
                                    onPreview={handlePreview}
                                    onDropFiles={handleDropFilesToFolder}
                                    selectedFiles={selectedFiles}
                                    onFolderOpen={(folderId) => handleFolderOpen(folderId)}
                                    onStar={handleToggleStar}
                                    compact={localViewMode === 'list'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Icon Views (small, medium, large) */
                <div
                    ref={containerRef}
                    className={`flex-1 overflow-auto p-4 relative select-none content-transition ${isTransitioning ? 'content-entering' : 'content-visible'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Selection Box */}
                    <div style={getSelectionBoxStyle()} />

                    <div ref={fileListRef} className={getGridClasses(localViewMode)} key={animationKey}>
                        {[...fileTypeFolders, ...regularFiles].map((file, index) => (
                            <div
                                key={file.id}
                                data-file-item
                                data-file-id={file.id}
                                className={skipItemAnimation ? '' : 'file-item-animate'}
                                style={skipItemAnimation ? undefined : { animationDelay: `${Math.min(index * 0.02, 0.4)}s` }}
                            >
                                <FileItem
                                    file={file}
                                    viewMode="grid"
                                    isSelected={selectedFiles.has(file.id)}
                                    onSelect={(isMulti) => handleFileSelect(file.id, isMulti)}
                                    onRename={handleFileRename}
                                    onDelete={handleFileDelete}
                                    onMove={handleMoveFile}
                                    onShowInfo={handleShowInfo}
                                    onPreview={handlePreview}
                                    onStar={handleToggleStar}
                                    onDropFiles={handleDropFilesToFolder}
                                    selectedFiles={selectedFiles}
                                    onFolderOpen={(folderId) => handleFolderOpen(folderId)}
                                    iconSize={localViewMode === 'small-icons' ? 'small' : localViewMode === 'large-icons' ? 'large' : 'medium'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-200 dark:border-dark-border">
                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                        Trang {pagination.page} / {pagination.pages} ({pagination.total} mục)
                    </span>
                </div>
            )}

            {/* File Info Panel */}
            {infoFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setInfoFile(null)}>
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                            <h3 className="text-lg font-medium text-gray-800 dark:text-dark-text">{t('files.details')}</h3>
                            <button
                                onClick={() => setInfoFile(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-dark-selected rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-dark-blue" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 dark:text-dark-text truncate">{infoFile.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{infoFile.type === 'folder' ? 'Thư mục' : 'Tệp'}</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-dark-text-secondary">Loại:</span>
                                    <span className="text-gray-800 dark:text-dark-text">{infoFile.mimeType || infoFile.file_type || 'Không xác định'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-dark-text-secondary">Kích thước:</span>
                                    <span className="text-gray-800 dark:text-dark-text">
                                        {infoFile.size ? `${(infoFile.size / 1024 / 1024).toFixed(2)} MB` : 'Không xác định'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-dark-text-secondary">Ngày sửa đổi:</span>
                                    <span className="text-gray-800 dark:text-dark-text">{infoFile.modified || 'Không xác định'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-dark-text-secondary">Chủ sở hữu:</span>
                                    <span className="text-gray-800 dark:text-dark-text">{infoFile.owner || 'tôi'}</span>
                                </div>
                                {infoFile.telegram_channel && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-dark-text-secondary">Kênh Telegram:</span>
                                        <span className="text-gray-800 dark:text-dark-text">{infoFile.telegram_channel}</span>
                                    </div>
                                )}
                                {infoFile.storage_type && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-dark-text-secondary">Lưu trữ:</span>
                                        <span className="text-gray-800 dark:text-dark-text capitalize">{infoFile.storage_type}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex justify-end">
                            <button
                                onClick={() => setInfoFile(null)}
                                className="px-4 py-2 bg-blue-600 dark:bg-dark-blue text-white dark:text-dark-bg rounded-lg hover:bg-blue-700 dark:hover:bg-dark-blue-hover transition-colors"
                            >
                                {t('actions.close')}
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
                    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                            <h3 className="text-lg font-medium text-gray-800 dark:text-dark-text">{t('files.move')}</h3>
                            <button
                                onClick={() => setMoveFileTarget(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4">
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                {t('files.move')}: "<span className="font-medium">{moveFileTarget.name}</span>"
                            </p>

                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {/* Root option */}
                                <button
                                    onClick={() => handleConfirmMove(null)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors border border-gray-200 dark:border-dark-border"
                                >
                                    <svg className="w-6 h-6 text-gray-500 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                    </svg>
                                    <span className="text-gray-800 dark:text-dark-text">{t('sidebar.myDrive')}</span>
                                </button>

                                {/* Folder list */}
                                {folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => handleConfirmMove(folder.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors border border-gray-200 dark:border-dark-border"
                                    >
                                        <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                        </svg>
                                        <div>
                                            <span className="text-gray-800 dark:text-dark-text">{folder.name}</span>
                                            <span className="text-xs text-gray-400 dark:text-dark-text-disabled ml-2">({folder.file_count} tệp)</span>
                                        </div>
                                    </button>
                                ))}

                                {folders.length === 0 && (
                                    <p className="text-center text-gray-500 dark:text-dark-text-secondary py-4">
                                        {t('folders.empty')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex justify-end gap-2">
                            <button
                                onClick={() => setMoveFileTarget(null)}
                                className="px-4 py-2 text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                            >
                                {t('actions.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showBulkDeleteConfirm}
                title={t('messages.deleteConfirm')}
                message={t('messages.itemsSelected', { count: selectedFiles.size })}
                confirmText={t('actions.delete')}
                cancelText={t('actions.cancel')}
                confirmButtonColor="red"
                onConfirm={() => {
                    setShowBulkDeleteConfirm(false);
                    handleBulkDelete();
                }}
                onCancel={() => setShowBulkDeleteConfirm(false)}
            />

            {/* Animation styles */}
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                .animate-slideUp {
                    animation: slideUp 0.2s ease-out;
                }
                @keyframes pulse-slow {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.02);
                    }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default FileGrid;
