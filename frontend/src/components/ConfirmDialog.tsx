import React from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonColor?: 'blue' | 'red' | 'gray';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title = 'Xác nhận',
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    confirmButtonColor = 'blue',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const confirmButtonStyles = {
        blue: 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-dark-blue dark:hover:bg-dark-blue-hover dark:text-dark-bg',
        red: 'bg-red-600 hover:bg-red-700 text-white',
        gray: 'bg-gray-600 hover:bg-gray-700 text-white dark:bg-dark-hover dark:hover:bg-dark-active'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 animate-fadeIn"
                onClick={onCancel}
            />

            {/* Dialog - Google Drive Style */}
            <div className="relative bg-white dark:bg-dark-surface rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl animate-scaleIn">
                {/* Content */}
                <div className="px-6 py-5">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-dark-text mb-2">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 flex items-center justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${confirmButtonStyles[confirmButtonColor]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            {/* Animations */}
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

export default ConfirmDialog;
