import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTheme } from '../contexts/ThemeContext';

const appWindow = getCurrentWindow();

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
        // Check initial maximized state
        const checkMaximized = async () => {
            try {
                const maximized = await appWindow.isMaximized();
                setIsMaximized(maximized);
            } catch (e) {
                console.error('Failed to check maximized state:', e);
            }
        };
        checkMaximized();

        // Listen for resize events
        const unlisten = appWindow.onResized(async () => {
            try {
                const maximized = await appWindow.isMaximized();
                setIsMaximized(maximized);
            } catch (e) {
                console.error('Failed to check maximized state:', e);
            }
        });

        return () => {
            unlisten.then(fn => fn());
        };
    }, []);

    const handleMinimize = async () => {
        try {
            await appWindow.minimize();
        } catch (e) {
            console.error('Failed to minimize:', e);
        }
    };

    const handleMaximize = async () => {
        try {
            await appWindow.toggleMaximize();
        } catch (e) {
            console.error('Failed to toggle maximize:', e);
        }
    };

    const handleClose = async () => {
        try {
            await appWindow.close();
        } catch (e) {
            console.error('Failed to close:', e);
        }
    };

    return (
        <div
            data-tauri-drag-region
            className={`h-8 flex items-center justify-between select-none ${isDark ? 'bg-dark-bg' : 'bg-white'
                } border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}
        >
            {/* Left side - App title with logo */}
            <div
                data-tauri-drag-region
                className="flex items-center gap-2 px-3 h-full"
            >
                <img src="/logo.png" alt="TeleDrive" className="w-4 h-4 rounded" />
                <span className={`text-xs font-medium ${isDark ? 'text-dark-text' : 'text-gray-700'}`}>
                    TeleDrive
                </span>
            </div>

            {/* Right side - Window controls */}
            <div className="flex h-full">
                {/* Minimize */}
                <button
                    onClick={handleMinimize}
                    className={`w-12 h-full flex items-center justify-center transition-colors ${isDark
                            ? 'hover:bg-dark-hover text-dark-text-secondary'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                    aria-label="Thu nhỏ"
                >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 10 1">
                        <rect width="10" height="1" />
                    </svg>
                </button>

                {/* Maximize/Restore */}
                <button
                    onClick={handleMaximize}
                    className={`w-12 h-full flex items-center justify-center transition-colors ${isDark
                            ? 'hover:bg-dark-hover text-dark-text-secondary'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                    aria-label={isMaximized ? "Thu nhỏ cửa sổ" : "Phóng to"}
                >
                    {isMaximized ? (
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 10 10">
                            <path d="M2 0h6v6M0 2h6v6" />
                        </svg>
                    ) : (
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 10 10">
                            <rect x="0.5" y="0.5" width="9" height="9" />
                        </svg>
                    )}
                </button>

                {/* Close */}
                <button
                    onClick={handleClose}
                    className={`w-12 h-full flex items-center justify-center transition-colors ${isDark
                            ? 'hover:bg-red-600 text-dark-text-secondary hover:text-white'
                            : 'hover:bg-red-500 text-gray-600 hover:text-white'
                        }`}
                    aria-label="Đóng"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 10 10">
                        <path d="M1 1l8 8M9 1l-8 8" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
