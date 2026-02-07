import React, { useState, useEffect } from 'react';
import { FileInfo, API_BASE_URL } from '../services/api';
import { useI18n } from '../i18n';

interface FilePreviewProps {
    file: FileInfo;
    onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useI18n();

    const filename = file.filename || file.name;
    const downloadUrl = `${API_BASE_URL}/download/${encodeURIComponent(filename)}`;
    const previewUrl = `${downloadUrl}?inline=true`;

    const mimeType = file.mimeType || file.mime_type || '';
    const name = file.name || file.filename || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';


    const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
    const isVideo = mimeType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
    const isPdf = mimeType === 'application/pdf' || ext === 'pdf';

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleLoad = () => {
        setLoading(false);
    };

    const handleError = () => {
        setLoading(false);
        setError('Không thể tải bản xem trước. Vui lòng thử tải xuống.');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm" onClick={onClose}>
            {/* Close button */}
            <button
                className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-50"
                onClick={onClose}
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Content Container */}
            <div className="relative w-full h-full flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>

                {loading && !error && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                    </div>
                )}

                {/* Image Preview */}
                {isImage && (
                    <img
                        src={previewUrl}
                        alt={name}
                        className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg"
                        onLoad={handleLoad}
                        onError={handleError}
                    />
                )}

                {/* Video Preview */}
                {isVideo && (
                    <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                        <video
                            controls
                            autoPlay
                            className="w-full h-full"
                            onLoadedData={handleLoad}
                            onError={handleError}
                        >
                            <source src={previewUrl} type={mimeType || 'video/mp4'} />
                            Trình duyệt của bạn không hỗ trợ thẻ video.
                        </video>
                    </div>
                )}

                {/* PDF Preview */}
                {isPdf && (
                    <div className="w-full max-w-6xl h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-0"
                            onLoad={handleLoad}
                            onError={handleError}
                            title="PDF Preview"
                        />
                    </div>
                )}

                {/* Unsupported Type */}
                {!isImage && !isVideo && !isPdf && (
                    <div className="bg-white dark:bg-dark-surface p-8 rounded-xl shadow-2xl text-center max-w-md">
                        <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-dark-elevated rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-gray-500 dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 dark:text-dark-text mb-2">{t('common.noPreview')}</h3>
                        <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
                            Định dạng tệp này không hỗ trợ xem trước trực tiếp.
                        </p>
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 dark:bg-dark-blue hover:bg-blue-700 dark:hover:bg-dark-blue-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-dark-blue transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t('common.downloadFile')}
                        </a>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90">
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl text-center">
                            <div className="text-red-500 text-5xl mb-4">⚠️</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">{t('common.errorTitle')}</h3>
                            <p className="text-gray-500 dark:text-dark-text-secondary mb-4">{error}</p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-200 dark:bg-dark-elevated text-gray-800 dark:text-dark-text rounded hover:bg-gray-300 dark:hover:bg-dark-hover transition-colors"
                            >
                                {t('account.close')}
                            </button>
                        </div>
                    </div>
                )}

                {/* File Name Caption */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium z-40 pointer-events-none">
                    {name}
                </div>
            </div>
        </div>
    );
};

export default FilePreview;
