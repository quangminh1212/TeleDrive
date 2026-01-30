import { useState, useEffect } from 'react';
import FileItem from './FileItem';

interface FileData {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: number;
    modified: string;
    mimeType?: string;
}

interface FileGridProps {
    searchQuery: string;
    currentFolder: string | null;
    viewMode: 'grid' | 'list';
}

// Mock data - will be replaced with API calls
const mockFiles: FileData[] = [
    { id: '1', name: 'Documents', type: 'folder', modified: '2024-01-15' },
    { id: '2', name: 'Photos', type: 'folder', modified: '2024-01-14' },
    { id: '3', name: 'Work Projects', type: 'folder', modified: '2024-01-13' },
    { id: '4', name: 'report_2024.pdf', type: 'file', size: 2456000, modified: '2024-01-15', mimeType: 'application/pdf' },
    { id: '5', name: 'presentation.pptx', type: 'file', size: 5678000, modified: '2024-01-14', mimeType: 'application/vnd.ms-powerpoint' },
    { id: '6', name: 'budget.xlsx', type: 'file', size: 123000, modified: '2024-01-12', mimeType: 'application/vnd.ms-excel' },
    { id: '7', name: 'photo_vacation.jpg', type: 'file', size: 3456000, modified: '2024-01-10', mimeType: 'image/jpeg' },
    { id: '8', name: 'notes.txt', type: 'file', size: 1234, modified: '2024-01-09', mimeType: 'text/plain' },
    { id: '9', name: 'video_meeting.mp4', type: 'file', size: 45678000, modified: '2024-01-08', mimeType: 'video/mp4' },
];

const FileGrid = ({ searchQuery, currentFolder, viewMode }: FileGridProps) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

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

            setFiles(filtered);
            setLoading(false);
        }, 300);
    }, [searchQuery, currentFolder]);

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

    const folders = files.filter(f => f.type === 'folder');
    const regularFiles = files.filter(f => f.type === 'file');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gdrive-blue"></div>
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-lg">No files found</p>
                <p className="text-sm">Drop files here or use the "New" button</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Folders Section */}
            {folders.length > 0 && (
                <section>
                    <h2 className="text-sm font-medium text-gray-700 mb-3">Folders</h2>
                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'
                        : 'space-y-1'
                    }>
                        {folders.map(file => (
                            <FileItem
                                key={file.id}
                                file={file}
                                viewMode={viewMode}
                                isSelected={selectedFiles.has(file.id)}
                                onSelect={(isMulti) => handleFileSelect(file.id, isMulti)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Files Section */}
            {regularFiles.length > 0 && (
                <section>
                    <h2 className="text-sm font-medium text-gray-700 mb-3">Files</h2>
                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'
                        : 'space-y-1'
                    }>
                        {regularFiles.map(file => (
                            <FileItem
                                key={file.id}
                                file={file}
                                viewMode={viewMode}
                                isSelected={selectedFiles.has(file.id)}
                                onSelect={(isMulti) => handleFileSelect(file.id, isMulti)}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default FileGrid;
