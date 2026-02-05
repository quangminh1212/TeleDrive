import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateFolder: (name: string) => Promise<{ success: boolean; error?: string }>;
}

// Folder icon - Google Drive style blue
const FolderIcon = () => (
    <div className="w-12 h-12 bg-blue-100 dark:bg-dark-selected rounded-xl flex items-center justify-center">
        <svg className="w-7 h-7 text-blue-600 dark:text-dark-blue" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
    </div>
);

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose, onCreateFolder }) => {
    const [folderName, setFolderName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { t } = useI18n();

    useEffect(() => {
        if (isOpen) {
            setFolderName('');
            setError('');
            setIsFocused(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = folderName.trim();
        if (!trimmedName) {
            setError(t('messages.folderNameEmpty'));
            return;
        }

        const invalidChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
        if (invalidChars.some(char => trimmedName.includes(char))) {
            setError(t('messages.folderNameInvalidChars'));
            return;
        }

        if (trimmedName.length > 255) {
            setError(t('messages.folderNameTooLong'));
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            const result = await onCreateFolder(trimmedName);
            if (result.success) {
                onClose();
            } else {
                setError(result.error || t('messages.error'));
            }
        } catch {
            setError(t('messages.error'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    const suggestions = ['Tài liệu', 'Hình ảnh', 'Video', 'Công việc', 'Cá nhân'];

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={handleKeyDown}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal - Google Drive Light Style */}
            <div className="relative bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl animate-scaleIn">
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <FolderIcon />
                        <div>
                            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-text">
                                {t('folders.newFolder')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">
                                {t('folders.folderName')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6">
                    {/* Input Label */}
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                        {t('folders.folderName')}
                    </label>

                    {/* Input - Google Drive style */}
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={folderName}
                            onChange={(e) => {
                                setFolderName(e.target.value);
                                setError('');
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={t('folders.newFolder')}
                            className={`w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border-2 rounded-lg text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary outline-none transition-colors pr-16 ${error
                                    ? 'border-red-400'
                                    : isFocused
                                        ? 'border-blue-500 dark:border-dark-blue bg-white dark:bg-dark-surface'
                                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-hover'
                                }`}
                            disabled={isCreating}
                            maxLength={255}
                        />
                        {/* Character count */}
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-dark-text-disabled">
                            {folderName.length}/255
                        </span>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Quick suggestions */}
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-2">{t('messages.suggestions')}:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setFolderName(suggestion)}
                                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-dark-text bg-gray-100 dark:bg-dark-elevated rounded-full border border-gray-200 dark:border-dark-border hover:bg-gray-200 dark:hover:bg-dark-hover hover:border-gray-300 dark:hover:border-dark-hover transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isCreating}
                            className="flex-1 px-4 py-2.5 text-gray-700 dark:text-dark-text bg-gray-100 dark:bg-dark-elevated rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors font-medium disabled:opacity-50"
                        >
                            {t('actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || !folderName.trim()}
                            className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-dark-blue text-white dark:text-dark-bg rounded-lg hover:bg-blue-700 dark:hover:bg-dark-blue-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {t('messages.loading')}
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                    </svg>
                                    {t('folders.create')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Custom animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { 
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to { 
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default CreateFolderModal;
