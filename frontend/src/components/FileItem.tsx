interface FileData {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: number;
    modified: string;
    mimeType?: string;
}

interface FileItemProps {
    file: FileData;
    viewMode: 'grid' | 'list';
    isSelected: boolean;
    onSelect: (isMultiSelect: boolean) => void;
}

const getFileIcon = (file: FileData): string => {
    if (file.type === 'folder') return '📁';

    const mimeType = file.mimeType || '';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
    if (mimeType.includes('text')) return '📄';

    return '📄';
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const FileItem = ({ file, viewMode, isSelected, onSelect }: FileItemProps) => {
    const handleClick = (e: React.MouseEvent) => {
        onSelect(e.ctrlKey || e.metaKey);
    };

    const handleDoubleClick = () => {
        if (file.type === 'folder') {
            // Navigate to folder
            console.log('Open folder:', file.name);
        } else {
            // Download or preview file
            console.log('Open file:', file.name);
        }
    };

    if (viewMode === 'grid') {
        return (
            <div
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all ${isSelected
                        ? 'bg-blue-100 ring-2 ring-gdrive-blue'
                        : 'hover:bg-gray-100'
                    }`}
            >
                {/* File Icon */}
                <div className="flex items-center justify-center h-24 mb-2">
                    <span className="text-5xl">{getFileIcon(file)}</span>
                </div>

                {/* File Name */}
                <p className="text-sm text-center text-gray-700 truncate" title={file.name}>
                    {file.name}
                </p>

                {/* Context Menu Button */}
                <button
                    className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('Show context menu');
                    }}
                >
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
            </div>
        );
    }

    // List View
    return (
        <div
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            className={`group flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all ${isSelected
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-50'
                }`}
        >
            {/* Checkbox */}
            <div className={`w-5 h-5 mr-3 rounded border flex items-center justify-center ${isSelected ? 'bg-gdrive-blue border-gdrive-blue' : 'border-gray-300'
                }`}>
                {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                )}
            </div>

            {/* Icon */}
            <span className="text-2xl mr-3">{getFileIcon(file)}</span>

            {/* Name */}
            <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>

            {/* Size */}
            <span className="w-24 text-sm text-gray-500 text-right">
                {formatFileSize(file.size)}
            </span>

            {/* Modified Date */}
            <span className="w-32 text-sm text-gray-500 text-right">
                {formatDate(file.modified)}
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
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default FileItem;
