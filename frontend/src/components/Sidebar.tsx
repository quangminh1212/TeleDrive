import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import CreateFolderModal from './CreateFolderModal';
import { useToast } from './Toast';
import { useI18n, getAvailableLanguages } from '../i18n';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../contexts/ThemeContext';
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
    <img src="/logo.png" alt="TeleDrive" className={`${className} rounded-xl`} />
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

const PlusIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

interface RateLimitItem {
    name: string;
    used: number;
    max: number;
    window: string;
}

const Sidebar = ({ currentFolder, onFolderSelect, totalFileSize, onFilesUploaded, isMobileOpen, onMobileClose }: SidebarProps) => {
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [storageSizeFromAPI, setStorageSizeFromAPI] = useState<number>(0);
    const [fileCount, setFileCount] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [rateLimits, setRateLimits] = useState<RateLimitItem[]>([]);
    const [showDocs, setShowDocs] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const toast = useToast();
    const { t, language, setLanguage } = useI18n();
    const { theme, resolvedTheme, setTheme } = useTheme();

    // Hidden file input refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Fetch storage info from API
    useEffect(() => {
        const fetchStorageInfo = async () => {
            try {
                const res = await fetch('http://127.0.0.1:5000/api/v2/storage');
                const data = await res.json();
                if (data.success) {
                    setStorageSizeFromAPI(data.total_size || 0);
                    setFileCount(data.file_count || 0);
                }
            } catch {
                setStorageSizeFromAPI(0);
                setFileCount(0);
            }
        };

        fetchStorageInfo();
        const interval = setInterval(fetchStorageInfo, 30000);
        return () => clearInterval(interval);
    }, [totalFileSize, onFilesUploaded]);

    // Fetch rate limits info from API
    useEffect(() => {
        const fetchRateLimits = async () => {
            try {
                const res = await fetch('http://127.0.0.1:5000/api/v2/rate-limits');
                const data = await res.json();
                if (data.success && data.limits) {
                    setRateLimits(data.limits);
                }
            } catch {
                // Silent fail - rate limits are informational
            }
        };

        fetchRateLimits();
        const interval = setInterval(fetchRateLimits, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    // Listen for openDocs event from UserAccountMenu
    useEffect(() => {
        const handler = () => setShowDocs(true);
        window.addEventListener('openDocs', handler);
        return () => window.removeEventListener('openDocs', handler);
    }, []);

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
        { id: 'recent', label: t('sidebar.recent'), icon: RecentIcon },
        { id: 'starred', label: t('sidebar.starred'), icon: StarredIcon },
    ];

    const bottomMenuItems: typeof mainMenuItems = [];

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
                fixed md:relative z-50 md:z-10
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
                        <>
                            {/* Backdrop to close menu when clicking outside */}
                            <div
                                className="fixed inset-0 z-[99]"
                                onClick={() => setIsNewMenuOpen(false)}
                            />
                            <div className="absolute left-3 mt-2 w-72 bg-white dark:bg-dark-surface rounded-lg shadow-lg border border-gray-200 dark:border-dark-border z-[100] py-2">
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
                        </>
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

                    <div className="h-2" />

                    {/* Settings items */}
                    <div className="border-t border-gray-200 dark:border-dark-border pt-2 mt-1">
                        {/* Tài liệu */}
                        <button
                            onClick={() => setShowDocs(true)}
                            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors mb-0.5 text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover"
                        >
                            <span className="text-gray-600 dark:text-dark-text-secondary">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                            </span>
                            <span>Tài liệu</span>
                        </button>

                        {/* Ngôn ngữ */}
                        <div className="relative">
                            <button
                                onClick={() => setShowLangMenu(!showLangMenu)}
                                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors mb-0.5 text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover"
                            >
                                <span className="text-gray-600 dark:text-dark-text-secondary">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" /></svg>
                                </span>
                                <span className="flex-1 text-left">Ngôn ngữ</span>
                                <span className="text-[10px] text-gray-400 dark:text-dark-text-secondary">
                                    {getAvailableLanguages().find(l => l.code === language)?.name}
                                </span>
                            </button>
                            {showLangMenu && (
                                <>
                                    <div className="fixed inset-0 z-[99]" onClick={() => setShowLangMenu(false)} />
                                    <div className="absolute left-2 right-2 bottom-8 z-[100] bg-white dark:bg-dark-surface rounded-lg shadow-lg border border-gray-200 dark:border-dark-border max-h-60 overflow-y-auto py-1">
                                        {getAvailableLanguages().map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors ${language === lang.code ? 'bg-blue-50 dark:bg-dark-selected text-blue-600 dark:text-dark-blue font-medium' : 'text-gray-700 dark:text-dark-text'
                                                    }`}
                                            >
                                                {lang.name}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Dark/Light mode */}
                        <button
                            onClick={() => {
                                const modes: Theme[] = ['light', 'dark', 'system'];
                                const idx = modes.indexOf(theme);
                                setTheme(modes[(idx + 1) % 3]);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors mb-0.5 text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover"
                        >
                            <span className="text-gray-600 dark:text-dark-text-secondary">
                                {resolvedTheme === 'dark' ? (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" /></svg>
                                )}
                            </span>
                            <span className="flex-1 text-left">{resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                            <span className="text-[10px] text-gray-400 dark:text-dark-text-secondary capitalize">{theme}</span>
                        </button>

                        {/* Cài đặt */}
                        <button
                            onClick={() => setShowSettings(true)}
                            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors mb-0.5 text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover"
                        >
                            <span className="text-gray-600 dark:text-dark-text-secondary">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z" /></svg>
                            </span>
                            <span>Cài đặt</span>
                        </button>
                    </div>
                </nav>

                {/* Bottom info */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border space-y-3">
                    {/* Storage */}
                    <div className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 mt-0.5 text-gray-400 dark:text-dark-text-secondary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                        </svg>
                        <div className="min-w-0">
                            <p className="text-[13px] text-gray-800 dark:text-dark-text leading-tight">
                                {usedStorageFormatted} <span className="text-gray-400 dark:text-dark-text-secondary">·</span> {fileCount} {fileCount === 1 ? 'file' : 'files'}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-dark-text-secondary mt-0.5">
                                Không giới hạn dung lượng
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    {rateLimits.length > 0 && (
                        <>
                            <div className="border-t border-gray-100 dark:border-dark-border" />
                            {/* Rate Limits */}
                            <div className="space-y-1.5">
                                {rateLimits.map((item) => {
                                    const pct = item.max > 0 ? (item.used / item.max) * 100 : 0;
                                    const isDanger = pct >= 100;
                                    const isWarning = pct > 50 && !isDanger;
                                    return (
                                        <div key={item.name} className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500 dark:text-dark-text-secondary">{item.name}</span>
                                            <span className={`font-mono tabular-nums ${isDanger ? 'text-red-500 font-medium' : isWarning ? 'text-amber-500' : 'text-gray-400 dark:text-dark-text-secondary'}`}>
                                                {item.used}<span className="text-gray-300 dark:text-gray-600">/{item.max}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
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

            {/* Documentation Modal */}
            {showDocs && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowDocs(false)}>
                    <div
                        className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-[90vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Tài liệu TeleDrive</h2>
                            </div>
                            <button
                                onClick={() => setShowDocs(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-700 dark:text-dark-text leading-relaxed space-y-5">
                            {/* Giới thiệu */}
                            <section>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-text mb-2">📌 Giới thiệu</h3>
                                <p>TeleDrive là ứng dụng quản lý file cá nhân sử dụng <strong>Telegram</strong> làm nơi lưu trữ đám mây. File của bạn được lưu vào tin nhắn Telegram (Saved Messages) với dung lượng <strong>không giới hạn</strong> và <strong>miễn phí hoàn toàn</strong>.</p>
                            </section>

                            {/* Upload */}
                            <section>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-text mb-2">📤 Upload File</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Kích thước tối đa: <strong>2 GB</strong> mỗi file (giới hạn của Telegram API)</li>
                                    <li>Hỗ trợ <strong>tất cả định dạng file</strong> — không giới hạn loại file</li>
                                    <li>Upload nhiều file cùng lúc hoặc upload cả thư mục</li>
                                    <li>File được mã hóa và lưu trên máy chủ Telegram</li>
                                </ul>
                            </section>

                            {/* Storage */}
                            <section>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-text mb-2">💾 Bộ nhớ</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Dung lượng: <strong>Không giới hạn (∞)</strong> — Telegram cung cấp lưu trữ đám mây miễn phí</li>
                                    <li>Không có giới hạn băng thông hàng ngày cho upload/download</li>
                                    <li>File được đồng bộ tự động qua Telegram API</li>
                                </ul>
                            </section>

                            {/* Rate Limits */}
                            <section>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-text mb-2">⚡ Giới hạn Rate Limit</h3>
                                <p className="mb-2">Để bảo vệ hệ thống khỏi lạm dụng, các giới hạn sau được áp dụng cho mỗi IP:</p>
                                <div className="bg-gray-50 dark:bg-dark-bg rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-dark-hover">
                                                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-dark-text-secondary">Endpoint</th>
                                                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-dark-text-secondary">Giới hạn</th>
                                                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-dark-text-secondary">Cửa sổ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-t border-gray-200 dark:border-dark-border">
                                                <td className="px-3 py-2">Upload</td>
                                                <td className="px-3 py-2 text-center font-mono">50 request</td>
                                                <td className="px-3 py-2 text-center">5 phút</td>
                                            </tr>
                                            <tr className="border-t border-gray-200 dark:border-dark-border">
                                                <td className="px-3 py-2">Search (Tìm kiếm)</td>
                                                <td className="px-3 py-2 text-center font-mono">100 request</td>
                                                <td className="px-3 py-2 text-center">1 phút</td>
                                            </tr>
                                            <tr className="border-t border-gray-200 dark:border-dark-border">
                                                <td className="px-3 py-2">Auth Login (Đăng nhập)</td>
                                                <td className="px-3 py-2 text-center font-mono">5 request</td>
                                                <td className="px-3 py-2 text-center">5 phút</td>
                                            </tr>
                                            <tr className="border-t border-gray-200 dark:border-dark-border">
                                                <td className="px-3 py-2">Auth Verify (Xác minh)</td>
                                                <td className="px-3 py-2 text-center font-mono">10 request</td>
                                                <td className="px-3 py-2 text-center">10 phút</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
                                    Thanh màu hiển thị mức sử dụng: <span style={{ color: '#3b82f6' }}>■</span> Bình thường — <span style={{ color: '#f59e0b' }}>■</span> Trên 50% — <span style={{ color: '#ef4444' }}>■</span> Đã hết
                                </p>
                            </section>

                            {/* Share Links */}
                            <section>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-text mb-2">🔗 Chia sẻ File</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Tạo link chia sẻ công khai cho bất kỳ file nào</li>
                                    <li>Tùy chọn giới hạn số lần tải xuống cho mỗi link</li>
                                    <li>Đặt thời gian hết hạn cho link chia sẻ</li>
                                    <li>Bảo vệ link bằng mật khẩu (tùy chọn)</li>
                                </ul>
                            </section>

                            {/* Security */}
                            <section>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-text mb-2">🔐 Bảo mật</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Xác thực qua <strong>Telegram</strong> — không cần tạo tài khoản riêng</li>
                                    <li>Chống tấn công brute-force với rate limiting</li>
                                    <li>CSRF protection trên tất cả các form</li>
                                    <li>File được truyền qua kênh mã hóa của Telegram</li>
                                </ul>
                            </section>

                            {/* Telegram Limits */}
                            <section>
                                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-text mb-2">📱 Giới hạn Telegram</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Telegram Free: Upload tối đa <strong>2 GB</strong> / file</li>
                                    <li>Telegram Premium: Upload tối đa <strong>4 GB</strong> / file</li>
                                    <li>Nếu gửi quá nhiều request, Telegram sẽ tạm khóa (FloodWait) — hệ thống tự động chờ và thử lại</li>
                                    <li>Không có giới hạn tổng dung lượng lưu trữ</li>
                                </ul>
                            </section>

                            {/* Tips */}
                            <section className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
                                <h3 className="text-base font-semibold text-blue-700 dark:text-blue-400 mb-2">💡 Mẹo sử dụng</h3>
                                <ul className="list-disc pl-5 space-y-1 text-blue-800 dark:text-blue-300">
                                    <li>Dùng chức năng tìm kiếm để nhanh chóng tìm file trong hàng nghìn file</li>
                                    <li>Tạo thư mục để tổ chức file theo dự án hoặc chủ đề</li>
                                    <li>Đánh dấu sao (⭐) cho các file quan trọng để truy cập nhanh</li>
                                    <li>Sử dụng chế độ xem danh sách để xem nhiều file hơn cùng lúc</li>
                                </ul>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-dark-border flex justify-end">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowSettings(false)}>
                    <div
                        className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-[90vw] max-w-md max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-dark-hover rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-gray-600 dark:text-dark-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Cài đặt</h2>
                            </div>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                            {/* Theme */}
                            <section>
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text mb-3">Giao diện</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { value: 'light' as Theme, label: 'Sáng', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" /></svg> },
                                        { value: 'dark' as Theme, label: 'Tối', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" /></svg> },
                                        { value: 'system' as Theme, label: 'Hệ thống', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v2h12v-2l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z" /></svg> },
                                    ]).map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTheme(opt.value)}
                                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-xs font-medium ${theme === opt.value
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:border-gray-300 dark:hover:border-gray-500'
                                                }`}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Language */}
                            <section>
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text mb-3">Ngôn ngữ</h3>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {getAvailableLanguages().map((lang) => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </section>

                            {/* App Info */}
                            <section className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text mb-2">Thông tin ứng dụng</h3>
                                <div className="space-y-1.5 text-xs text-gray-600 dark:text-dark-text-secondary">
                                    <div className="flex justify-between"><span>Phiên bản</span><span className="font-mono">1.0.0</span></div>
                                    <div className="flex justify-between"><span>Backend</span><span className="font-mono">Flask + Python</span></div>
                                    <div className="flex justify-between"><span>Storage</span><span className="font-mono">Telegram Cloud</span></div>
                                    <div className="flex justify-between"><span>Max file</span><span className="font-mono">2 GB</span></div>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-dark-border flex justify-end">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
