import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: Toast['type'], message: string, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Toast Icons
const SuccessIcon = () => (
    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
);

const ErrorIcon = () => (
    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
);

const InfoIcon = () => (
    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
);

const WarningIcon = () => (
    <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
);

const getIcon = (type: Toast['type']) => {
    switch (type) {
        case 'success': return <SuccessIcon />;
        case 'error': return <ErrorIcon />;
        case 'info': return <InfoIcon />;
        case 'warning': return <WarningIcon />;
    }
};

const ToastItem: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => onClose(toast.id), 300);
            }, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.duration, toast.id, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(toast.id), 300);
    };

    const bgColors = {
        success: 'bg-white dark:bg-dark-surface border-l-4 border-l-green-500',
        error: 'bg-white dark:bg-dark-surface border-l-4 border-l-red-500',
        info: 'bg-white dark:bg-dark-surface border-l-4 border-l-blue-500',
        warning: 'bg-white dark:bg-dark-surface border-l-4 border-l-yellow-500'
    };

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${bgColors[toast.type]} ${isExiting ? 'animate-slideOut' : 'animate-slideIn'
                }`}
        >
            {getIcon(toast.type)}
            <span className="flex-1 text-sm text-gray-700 dark:text-dark-text">{toast.message}</span>
            <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-dark-text"
            >
                <CloseIcon />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((type: Toast['type'], message: string, duration = 4000) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, message, duration }]);
    }, []);

    const success = useCallback((message: string, duration?: number) => showToast('success', message, duration), [showToast]);
    const error = useCallback((message: string, duration?: number) => showToast('error', message, duration), [showToast]);
    const info = useCallback((message: string, duration?: number) => showToast('info', message, duration), [showToast]);
    const warning = useCallback((message: string, duration?: number) => showToast('warning', message, duration), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[320px] max-w-md">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
                ))}
            </div>

            {/* Animations */}
            <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
                .animate-slideOut {
                    animation: slideOut 0.3s ease-out forwards;
                }
            `}</style>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
