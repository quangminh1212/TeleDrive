import React, { useState, useRef, useEffect } from 'react';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateFolder: (name: string) => Promise<{ success: boolean; error?: string }>;
}

// Folder icon with plus
const FolderPlusIcon = () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="url(#folderGradient)" strokeWidth="1.5">
        <defs>
            <linearGradient id="folderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4B9EF7" />
                <stop offset="100%" stopColor="#7B5AF9" />
            </linearGradient>
        </defs>
        <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" fill="url(#folderGradient)" opacity="0.2" />
        <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
        <line x1="12" y1="10" x2="12" y2="16" strokeLinecap="round" />
        <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" />
    </svg>
);

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose, onCreateFolder }) => {
    const [folderName, setFolderName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFolderName('');
            setError('');
            // Focus input when modal opens
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = folderName.trim();
        if (!trimmedName) {
            setError('Vui lòng nhập tên thư mục');
            return;
        }

        // Validate folder name
        const invalidChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
        if (invalidChars.some(char => trimmedName.includes(char))) {
            setError('Tên thư mục chứa ký tự không hợp lệ');
            return;
        }

        if (trimmedName.length > 255) {
            setError('Tên thư mục quá dài (tối đa 255 ký tự)');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            const result = await onCreateFolder(trimmedName);
            if (result.success) {
                onClose();
            } else {
                setError(result.error || 'Không thể tạo thư mục');
            }
        } catch (err) {
            setError('Có lỗi xảy ra khi tạo thư mục');
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={handleKeyDown}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scaleIn">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-px">
                    <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl">
                                <FolderPlusIcon />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                    Tạo thư mục mới
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Nhập tên cho thư mục của bạn
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6">
                    {/* Input */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tên thư mục
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={folderName}
                                onChange={(e) => {
                                    setFolderName(e.target.value);
                                    setError('');
                                }}
                                placeholder="Ví dụ: Tài liệu quan trọng"
                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 transition-all duration-200 outline-none ${error
                                        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                        : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30'
                                    }`}
                                disabled={isCreating}
                                maxLength={255}
                            />
                            {/* Character count */}
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${folderName.length > 200 ? 'text-orange-500' : 'text-gray-400'
                                }`}>
                                {folderName.length}/255
                            </span>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="mt-2 flex items-center gap-2 text-red-500 text-sm animate-shake">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Quick suggestions */}
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Gợi ý:</p>
                        <div className="flex flex-wrap gap-2">
                            {['Tài liệu', 'Hình ảnh', 'Video', 'Công việc', 'Cá nhân'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setFolderName(suggestion)}
                                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
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
                            className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || !folderName.trim()}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                        >
                            {isCreating ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                    </svg>
                                    Tạo thư mục
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
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
                .animate-shake {
                    animation: shake 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default CreateFolderModal;
