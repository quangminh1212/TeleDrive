import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from '../services/api';
import { UploadItem } from '../components/UploadProgress';

interface UploadContextType {
    uploadItems: UploadItem[];
    isUploading: boolean;
    uploadFiles: (files: File[], folderId?: string) => Promise<void>;
    clearCompleted: () => void;
    clearAll: () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
};

interface UploadProviderProps {
    children: ReactNode;
    onUploadComplete?: () => void;
}

export const UploadProvider = ({ children, onUploadComplete }: UploadProviderProps) => {
    const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const uploadFiles = useCallback(async (files: File[], folderId?: string) => {
        if (files.length === 0) return;

        // Create upload items
        const newItems: UploadItem[] = files.map((file, index) => ({
            id: `upload-${Date.now()}-${index}`,
            filename: file.name,
            status: 'pending' as const,
            progress: 0,
        }));

        setUploadItems(prev => [...prev, ...newItems]);
        setIsUploading(true);

        // Upload files one by one
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const itemId = newItems[i].id;

            // Set status to uploading
            setUploadItems(prev => prev.map(item =>
                item.id === itemId ? { ...item, status: 'uploading' as const, progress: 0 } : item
            ));

            try {
                // Simulate progress updates (since we can't track real progress with fetch)
                const progressInterval = setInterval(() => {
                    setUploadItems(prev => prev.map(item =>
                        item.id === itemId && item.status === 'uploading'
                            ? { ...item, progress: Math.min(item.progress + 10, 90) }
                            : item
                    ));
                }, 200);

                const response = await api.uploadFile(file, folderId);

                clearInterval(progressInterval);

                if (response.success) {
                    setUploadItems(prev => prev.map(item =>
                        item.id === itemId ? { ...item, status: 'completed' as const, progress: 100 } : item
                    ));
                } else {
                    setUploadItems(prev => prev.map(item =>
                        item.id === itemId
                            ? { ...item, status: 'error' as const, error: response.error || 'Upload failed' }
                            : item
                    ));
                }
            } catch (error) {
                console.error('Upload error:', error);
                setUploadItems(prev => prev.map(item =>
                    item.id === itemId
                        ? { ...item, status: 'error' as const, error: 'Network error' }
                        : item
                ));
            }
        }

        setIsUploading(false);

        // Trigger refresh callback
        if (onUploadComplete) {
            onUploadComplete();
        }
    }, [onUploadComplete]);

    const clearCompleted = useCallback(() => {
        setUploadItems(prev => prev.filter(item => item.status !== 'completed'));
    }, []);

    const clearAll = useCallback(() => {
        setUploadItems([]);
    }, []);

    return (
        <UploadContext.Provider value={{ uploadItems, isUploading, uploadFiles, clearCompleted, clearAll }}>
            {children}
        </UploadContext.Provider>
    );
};
