import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import CreateFolderModal from './CreateFolderModal';
import { useToast } from './Toast';
import { useI18n } from '../i18n';
import { logger } from '../utils/logger';

interface SidebarProps {
    currentFolder: string | null;
    onFolderSelect: (folder: string | null) => void;
    totalFileSize?: number; // Tổng dung lượng file (bytes)
    onFilesUploaded?: () => void; // Callback khi upload xong
    isMobileOpen?: boolean; // Trạng thái mở sidebar trên mobile
    onMobileClose?: () => void; // Callback đóng sidebar trên mobile
}

// TeleDrive Logo component using the new logo image
const TeleDriveLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
    <img src="/logo.png" alt="TeleDrive" className={className} />
);

// Menu Icons as SVG components
const HomeIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
);

const ComputerIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
    </svg>
);

const SharedIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
);

const RecentIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
        <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
    </svg>
);

const StarredIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
);

const StorageIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

const Sidebar = ({ currentFolder, onFolderSelect, totalFileSize, onFilesUploaded, isMobileOpen, onMobileClose }: SidebarProps) => {
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [storageSizeFromAPI, setStorageSizeFromAPI] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const toast = useToast();
    const { t } = useI18n();

    // Hidden file input refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Fetch total file size from API if not provided
    useEffect(() => {
        if (totalFileSize === undefined) {
            fetch('http://127.0.0.1:5000/api/v2/files?per_page=1000')
                .then(res => res.json())
                .then(data => {
                    const total = data.files?.reduce((sum: number, f: { file_size?: number }) => sum + (f.file_size || 0), 0) || 0;
                    setStorageSizeFromAPI(total);
                })
                .catch(() => setStorageSizeFromAPI(0));
        }
    }, [totalFileSize]);

    // Handle file upload
    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setIsNewMenuOpen(false);

        try {
            const filesArray = Array.from(files);
            const result = await api.uploadFiles(filesArray);

            if (result.success) {
                logger.info('Sidebar', 'Upload success', result.data);
                toast.success(t('messages.uploadSuccess'));
                // Callback để refresh danh sách file
                onFilesUploaded?.();
            } else {
                logger.error('Sidebar', 'Upload failed', result.error);
                toast.error(t('messages.uploadFailed'));
            }
        } catch (error) {
            logger.error('Sidebar', 'Upload error', error);
            toast.error(t('messages.uploadFailed'));
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (folderInputRef.current) folderInputRef.current.value = '';
        }
    };

    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e.target.files);
    };

    // Handle folder input change
    const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e.target.files);
    };

    // Trigger file picker
    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    // Trigger folder picker
    const triggerFolderUpload = () => {
        folderInputRef.current?.click();
    };

    const mainMenuItems = [
        { id: 'home', label: t('sidebar.home'), icon: HomeIcon },
        { id: 'computer', label: t('sidebar.computer'), icon: ComputerIcon },
    ];

    const secondaryMenuItems = [
        { id: 'shared', label: t('sidebar.sharedWithMe'), icon: SharedIcon },
        { id: 'recent', label: t('sidebar.recent'), icon: RecentIcon },
        { id: 'starred', label: t('sidebar.starred'), icon: StarredIcon },
    ];

    const bottomMenuItems = [
        { id: 'storage', label: t('sidebar.storage'), icon: StorageIcon },
    ];

    // Hàm format dung lượng
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const actualSize = totalFileSize !== undefined ? totalFileSize : storageSizeFromAPI;
    const usedStorageFormatted = formatBytes(actualSize);

    return (
        <>
            <aside className={`
                fixed md:relative z-50 md:z-auto
                w-64 md:w-60 bg-white dark:bg-dark-bg flex-col h-full
                transform transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isMobileOpen ? 'flex' : 'hidden md:flex'}
                shadow-xl md:shadow-none
            `}>
                {/* Hidden file inputs */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    multiple
                    className="hidden"
                />
                <input
                    type="file"
                    ref={folderInputRef}
                    onChange={handleFolderInputChange}
                    // @ts-expect-error - webkitdirectory is not in standard types
                    webkitdirectory=""
                    multiple
                    className="hidden"
                />

                {/* Logo with close button on mobile */}
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <TeleDriveLogo />
                        <span className="text-[22px] text-gray-600 dark:text-dark-text font-normal">TeleDrive</span>
                    </div>
                    {/* Close button - only visible on mobile */}
                    <button
                        onClick={onMobileClose}
                        className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                        aria-label={t('actions.close')}
                    >
                        <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                {/* New Button */}
                <div className="px-3 py-2 relative">
                    <button
                        onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                        disabled={isUploading}
                        className={`flex items-center gap-2 px-4 py-3 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-2xl shadow-md hover:shadow-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isUploading ? (
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <PlusIcon />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-dark-text">
                            {isUploading ? t('messages.loading') : t('sidebar.upload')}
                        </span>
                    </button>

                    {/* New Dropdown Menu */}
                    {isNewMenuOpen && !isUploading && (
                        <div className="absolute left-3 mt-2 w-72 bg-white dark:bg-dark-surface rounded-lg shadow-lg border border-gray-200 dark:border-dark-border z-50 py-2">
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-3 text-gray-700 dark:text-dark-text"
                                onClick={() => {
                                    setIsNewMenuOpen(false);
                                    setIsCreateFolderModalOpen(true);
                                }}
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z" />
                                </svg>
                                {t('folders.newFolder')}
                            </button>
                            <hr className="my-2 border-gray-200 dark:border-dark-border" />
                            <button
                                onClick={triggerFileUpload}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-3 text-gray-700 dark:text-dark-text"
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
                                </svg>
                                {t('sidebar.uploadFiles')}
                            </button>
                            <button
                                onClick={triggerFolderUpload}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-3 text-gray-700 dark:text-dark-text"
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10zM8 13.01l1.41 1.41L11 12.84V17h2v-4.16l1.59 1.59L16 13.01 12.01 9 8 13.01z" />
                                </svg>
                                {t('folders.create')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Navigation Menu */}
                <nav className="flex-1 overflow-y-auto px-2 py-1">
                    {/* Main items */}
                    {mainMenuItems.map((item) => {
                        const IconComponent = item.icon;
                        const isActive = currentFolder === item.id;
                        return (
                            <button
                                key={item.id || 'mydrive'}
                                onClick={() => onFolderSelect(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors mb-0.5 ${isActive
                                    ? 'bg-blue-100 dark:bg-dark-selected text-blue-700 dark:text-dark-blue font-medium'
                                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover'
                                    }`}
                            >
                                <span className={isActive ? 'text-blue-700 dark:text-dark-blue' : 'text-gray-600 dark:text-dark-text-secondary'}>
                                    <IconComponent />
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                    <div className="h-2" />

                    {/* Secondary items */}
                    {secondaryMenuItems.map((item) => {
                        const IconComponent = item.icon;
                        const isActive = currentFolder === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onFolderSelect(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors mb-0.5 ${isActive
                                    ? 'bg-blue-100 dark:bg-dark-selected text-blue-700 dark:text-dark-blue font-medium'
                                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover'
                                    }`}
                            >
                                <span className={isActive ? 'text-blue-700 dark:text-dark-blue' : 'text-gray-600 dark:text-dark-text-secondary'}>
                                    <IconComponent />
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                    <div className="h-2" />

                    {/* Bottom items */}
                    {bottomMenuItems.map((item) => {
                        const IconComponent = item.icon;
                        const isActive = currentFolder === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onFolderSelect(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors mb-0.5 ${isActive
                                    ? 'bg-blue-100 dark:bg-dark-selected text-blue-700 dark:text-dark-blue font-medium'
                                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover'
                                    }`}
                            >
                                <span className={isActive ? 'text-blue-700 dark:text-dark-blue' : 'text-gray-600 dark:text-dark-text-secondary'}>
                                    <IconComponent />
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Storage Info */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border">
                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary truncate">
                        {t('sidebar.storage')}: {usedStorageFormatted}
                    </p>
                </div>
            </aside>

            {/* Create Folder Modal */}
            <CreateFolderModal
                isOpen={isCreateFolderModalOpen}
                onClose={() => setIsCreateFolderModalOpen(false)}
                onCreateFolder={async (name: string) => {
                    try {
                        const result = await api.createFolder(name);
                        if (result.success) {
                            onFilesUploaded?.(); // Refresh file list
                            return { success: true };
                        } else {
                            return { success: false, error: result.error || t('messages.error') };
                        }
                    } catch (error) {
                        logger.error('Sidebar', 'Create folder error', error);
                        return { success: false, error: t('messages.error') };
                    }
                }}
            />
        </>
    );
};

export default Sidebar;
