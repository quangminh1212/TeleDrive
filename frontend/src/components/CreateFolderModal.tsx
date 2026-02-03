import React, { useState, useRef, useEffect } from 'react';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateFolder: (name: string) => Promise<{ success: boolean; error?: string }>;
}

// Folder icon - Google Drive style
const FolderIcon = () => (
    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
    </div>
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
        } catch {
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

    const suggestions = ['Tài liệu', 'Hình ảnh', 'Video', 'Công việc', 'Cá nhân'];

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={handleKeyDown}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal - Google Drive Style */}
            <div className="relative bg-[#2b2d31] rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl animate-scaleIn border border-gray-700/50">
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <FolderIcon />
                        <div>
                            <h2 className="text-xl font-medium text-white">
                                Tạo thư mục mới
                            </h2>
                            <p className="text-sm text-gray-400 mt-0.5">
                                Nhập tên cho thư mục của bạn
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6">
                    {/* Input Label */}
                    <label className="block text-sm text-gray-300 mb-2">
                        Tên thư mục
                    </label>

                    {/* Input - Google Drive style with blue border */}
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
                            className="w-full px-4 py-3 bg-[#1e1f22] border-2 border-blue-500 rounded-lg text-white placeholder-gray-500 outline-none focus:border-blue-400 transition-colors pr-16"
                            disabled={isCreating}
                            maxLength={255}
                        />
                        {/* Character count */}
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            {folderName.length}/255
                        </span>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Quick suggestions */}
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Gợi ý:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setFolderName(suggestion)}
                                    className="px-3 py-1.5 text-sm bg-[#383a40] text-gray-300 rounded-full border border-gray-600 hover:bg-[#404249] hover:border-gray-500 transition-colors"
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
                            className="flex-1 px-4 py-3 text-white bg-[#4e5058] rounded-lg hover:bg-[#5d5f66] transition-colors font-medium disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || !folderName.trim()}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-lg hover:from-rose-600 hover:to-orange-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
