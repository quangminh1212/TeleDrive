import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { api } from '../services/api';
import { UploadItem } from '../components/UploadProgress';
import { logger } from '../utils/logger';

interface UploadContextType {
    uploadItems: UploadItem[];
    isUploading: boolean;
    uploadFiles: (files: File[], folderId?: string) => Promise<void>;
    cancelUpload: (itemId: string) => void;
    retryUpload: (itemId: string) => void;
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

// Store file references for retry functionality
const fileRegistry = new Map<string, { file: File; folderId?: string }>();

export const UploadProvider = ({ children, onUploadComplete }: UploadProviderProps) => {
    const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const abortControllers = useRef<Map<string, AbortController>>(new Map());

    const uploadFiles = useCallback(async (files: File[], folderId?: string) => {
        if (files.length === 0) return;

        // Create upload items and store file references
        const newItems: UploadItem[] = files.map((file, index) => {
            const itemId = `upload-${Date.now()}-${index}`;
            // Store file reference for potential retry
            fileRegistry.set(itemId, { file, folderId });
            return {
                id: itemId,
                filename: file.name,
                status: 'pending' as const,
                progress: 0,
            };
        });

        setUploadItems(prev => [...prev, ...newItems]);
        setIsUploading(true);

        // Upload files one by one
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const itemId = newItems[i].id;

            // Check if upload was cancelled
            const currentItem = uploadItems.find(item => item.id === itemId);
            if (currentItem?.status === 'cancelled') {
                continue;
            }

            // Create abort controller for this upload
            const abortController = new AbortController();
            abortControllers.current.set(itemId, abortController);

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
                abortControllers.current.delete(itemId);

                if (response.success) {
                    setUploadItems(prev => prev.map(item =>
                        item.id === itemId ? { ...item, status: 'completed' as const, progress: 100 } : item
                    ));
                    // Clean up file registry on success
                    fileRegistry.delete(itemId);
                } else {
                    setUploadItems(prev => prev.map(item =>
                        item.id === itemId
                            ? { ...item, status: 'error' as const, error: response.error || 'Upload failed' }
                            : item
                    ));
                }
            } catch (error) {
                logger.error('UploadContext', 'Upload error', { error, filename: file.name });
                abortControllers.current.delete(itemId);
                setUploadItems(prev => prev.map(item =>
                    item.id === itemId
                        ? { ...item, status: 'error' as const, error: 'Network error' }
                        : item
                ));
            }
        }

        setIsUploading(false);

        // Add delay to ensure database has fully committed the changes
        // before triggering the refresh callback
        logger.info('UploadContext', 'All uploads done, waiting 500ms before refresh...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Trigger refresh callback
        logger.info('UploadContext', 'Calling onUploadComplete callback', { hasCallback: !!onUploadComplete });
        if (onUploadComplete) {
            onUploadComplete();
        }
    }, [onUploadComplete, uploadItems]);

    // Cancel an ongoing upload
    const cancelUpload = useCallback((itemId: string) => {
        const controller = abortControllers.current.get(itemId);
        if (controller) {
            controller.abort();
            abortControllers.current.delete(itemId);
        }
        setUploadItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, status: 'cancelled' as const, error: 'Upload cancelled' } : item
        ));
        fileRegistry.delete(itemId);
    }, []);

    // Retry a failed upload
    const retryUpload = useCallback(async (itemId: string) => {
        const fileData = fileRegistry.get(itemId);
        if (!fileData) {
            logger.error('UploadContext', 'Cannot retry: file not found in registry', { itemId });
            return;
        }

        // Reset the item status
        setUploadItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, status: 'uploading' as const, progress: 0, error: undefined } : item
        ));

        setIsUploading(true);

        try {
            const progressInterval = setInterval(() => {
                setUploadItems(prev => prev.map(item =>
                    item.id === itemId && item.status === 'uploading'
                        ? { ...item, progress: Math.min(item.progress + 10, 90) }
                        : item
                ));
            }, 200);

            const response = await api.uploadFile(fileData.file, fileData.folderId);

            clearInterval(progressInterval);

            if (response.success) {
                setUploadItems(prev => prev.map(item =>
                    item.id === itemId ? { ...item, status: 'completed' as const, progress: 100 } : item
                ));
                fileRegistry.delete(itemId);
            } else {
                setUploadItems(prev => prev.map(item =>
                    item.id === itemId
                        ? { ...item, status: 'error' as const, error: response.error || 'Upload failed' }
                        : item
                ));
            }
        } catch (error) {
            logger.error('UploadContext', 'Retry upload error', { error, itemId });
            setUploadItems(prev => prev.map(item =>
                item.id === itemId
                    ? { ...item, status: 'error' as const, error: 'Network error' }
                    : item
            ));
        }

        setIsUploading(false);

        if (onUploadComplete) {
            await new Promise(resolve => setTimeout(resolve, 500));
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
        <UploadContext.Provider value={{ uploadItems, isUploading, uploadFiles, cancelUpload, retryUpload, clearCompleted, clearAll }}>
            {children}
        </UploadContext.Provider>
    );
};
