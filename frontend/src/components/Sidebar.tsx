import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

interface SidebarProps {
    currentFolder: string | null;
    onFolderSelect: (folder: string | null) => void;
    totalFileSize?: number; // Tổng dung lượng file (bytes)
    onFilesUploaded?: () => void; // Callback khi upload xong
}

// Google Drive SVG Icon
const DriveIcon = () => (
    <svg viewBox="0 0 87.3 78" className="w-10 h-10">
        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
);

// Menu Icons as SVG components
const HomeIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
);

const MyDriveIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 18H5V4h14v16z" />
        <path d="M12 6l-5 9h10z" />
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

const SpamIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
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

const Sidebar = ({ currentFolder, onFolderSelect, totalFileSize, onFilesUploaded }: SidebarProps) => {
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [storageSizeFromAPI, setStorageSizeFromAPI] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);

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
                console.log('Upload thành công:', result.data);
                // Callback để refresh danh sách file
                onFilesUploaded?.();
            } else {
                console.error('Upload thất bại:', result.error);
                alert('Upload thất bại: ' + (result.error || 'Lỗi không xác định'));
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Lỗi upload file');
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
        { id: 'home', label: 'Trang chủ', icon: HomeIcon },
        { id: null, label: 'Drive của tôi', icon: MyDriveIcon },
        { id: 'computer', label: 'Máy tính', icon: ComputerIcon },
    ];

    const secondaryMenuItems = [
        { id: 'shared', label: 'Được chia sẻ với tôi', icon: SharedIcon },
        { id: 'recent', label: 'Gần đây', icon: RecentIcon },
        { id: 'starred', label: 'Có gắn dấu sao', icon: StarredIcon },
    ];

    const bottomMenuItems = [
        { id: 'spam', label: 'Nội dung rác', icon: SpamIcon },
        { id: 'trash', label: 'Thùng rác', icon: TrashIcon },
        { id: 'storage', label: 'Bộ nhớ', icon: StorageIcon },
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
        <aside className="w-60 bg-white flex flex-col h-full">
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

            {/* Logo */}
            <div className="flex items-center gap-2 px-4 py-3">
                <DriveIcon />
                <span className="text-[22px] text-gray-600 font-normal">Drive</span>
            </div>

            {/* New Button */}
            <div className="px-3 py-2 relative">
                <button
                    onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                    disabled={isUploading}
                    className={`flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-2xl shadow-md hover:shadow-lg hover:bg-gray-50 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isUploading ? (
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <PlusIcon />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                        {isUploading ? 'Đang tải...' : 'Mới'}
                    </span>
                </button>

                {/* New Dropdown Menu */}
                {isNewMenuOpen && !isUploading && (
                    <div className="absolute left-3 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
                        <button
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-400 cursor-not-allowed"
                            disabled
                            title="Tính năng đang phát triển"
                        >
                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z" />
                            </svg>
                            Thư mục mới (sắp ra mắt)
                        </button>
                        <hr className="my-2 border-gray-200" />
                        <button
                            onClick={triggerFileUpload}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                        >
                            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
                            </svg>
                            Tải tệp lên
                        </button>
                        <button
                            onClick={triggerFolderUpload}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                        >
                            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10zM8 13.01l1.41 1.41L11 12.84V17h2v-4.16l1.59 1.59L16 13.01 12.01 9 8 13.01z" />
                            </svg>
                            Tải thư mục lên
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
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <span className={isActive ? 'text-blue-700' : 'text-gray-600'}>
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
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <span className={isActive ? 'text-blue-700' : 'text-gray-600'}>
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
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <span className={isActive ? 'text-blue-700' : 'text-gray-600'}>
                                <IconComponent />
                            </span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Storage Info */}
            <div className="px-4 py-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                    Tổng dung lượng: {usedStorageFormatted}
                </p>
            </div>

            {/* Logout Button */}
            <div className="px-3 py-2 border-t border-gray-200">
                <button
                    onClick={async () => {
                        if (confirm('Bạn có chắc muốn đăng xuất khỏi Telegram?\nSau khi đăng xuất, bạn cần đăng nhập lại để sử dụng.')) {
                            try {
                                const response = await fetch('http://127.0.0.1:5000/api/v2/auth/logout', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' }
                                });
                                const result = await response.json();
                                if (result.success) {
                                    alert('Đăng xuất thành công!');
                                    window.location.reload();
                                } else {
                                    alert('Lỗi: ' + (result.error || 'Không thể đăng xuất'));
                                }
                            } catch (error) {
                                console.error('Logout error:', error);
                                alert('Lỗi kết nối đến server');
                            }
                        }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                    </svg>
                    <span>Đăng xuất Telegram</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
