import { useState } from 'react';

interface TelegramLoginProps {
    onLoginSuccess: () => void;
}

// Telegram Icon SVG  
const TelegramIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

const TelegramLogin = ({ onLoginSuccess }: TelegramLoginProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    const handleAutoLogin = async () => {
        setIsLoading(true);
        setError(null);
        setStatus('Đang kết nối với Telegram Desktop...');

        try {
            const response = await fetch('http://127.0.0.1:5000/api/v2/auth/auto-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (result.success) {
                setStatus('Đăng nhập thành công!');
                setTimeout(() => {
                    onLoginSuccess();
                }, 500);
            } else {
                setError(result.message || result.hint || 'Không thể đăng nhập');
                setStatus('');
            }
        } catch (err) {
            setError('Không thể kết nối đến server');
            setStatus('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fade-in-up">
                {/* Main Card - Google Drive style */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="pt-10 pb-6 px-8 text-center">
                        {/* Logo */}
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 shadow-lg shadow-blue-500/20 transform hover:scale-105 transition-transform duration-200 overflow-hidden">
                            <img src="/logo.png" alt="TeleDrive" className="w-full h-full object-cover" />
                        </div>

                        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
                            TeleDrive
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Quản lý file trên Telegram
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="mx-8 h-px bg-gray-100" />

                    {/* Body */}
                    <div className="p-8">
                        <h2 className="text-lg font-medium text-gray-700 text-center mb-6">
                            Đăng nhập để tiếp tục
                        </h2>

                        {/* Status message */}
                        {status && (
                            <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-xl animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[#0088cc] text-sm font-medium">{status}</span>
                                </div>
                            </div>
                        )}

                        {/* Error message */}
                        {error && (
                            <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-xl animate-shake">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-red-600 text-sm font-medium">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Login Button - Google style */}
                        <button
                            onClick={handleAutoLogin}
                            disabled={isLoading}
                            className={`w-full py-3.5 px-6 rounded-xl font-medium text-white transition-all duration-200 flex items-center justify-center gap-3 ${isLoading
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-[#0088cc] hover:bg-[#006699] hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang kết nối...</span>
                                </>
                            ) : (
                                <>
                                    <TelegramIcon className="w-5 h-5" />
                                    <span>Đăng nhập từ Telegram Desktop</span>
                                </>
                            )}
                        </button>

                        {/* Instructions - Google style */}
                        <div className="mt-8 p-5 bg-gray-50 rounded-xl border border-gray-100">
                            <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#0088cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Hướng dẫn
                            </h3>
                            <ol className="text-sm text-gray-600 space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-[#0088cc] rounded-full flex items-center justify-center text-xs font-semibold text-white">
                                        1
                                    </span>
                                    <span className="pt-0.5">Mở <strong>Telegram Desktop</strong> trên máy tính</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-[#0088cc] rounded-full flex items-center justify-center text-xs font-semibold text-white">
                                        2
                                    </span>
                                    <span className="pt-0.5">Đảm bảo đã đăng nhập vào tài khoản Telegram</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-[#0088cc] rounded-full flex items-center justify-center text-xs font-semibold text-white">
                                        3
                                    </span>
                                    <span className="pt-0.5">Nhấn nút <strong>"Đăng nhập từ Telegram Desktop"</strong></span>
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 space-y-2">
                    <p className="text-gray-400 text-sm">
                        TeleDrive © 2024
                    </p>
                    <p className="text-gray-400 text-xs">
                        Lưu trữ file không giới hạn trên Telegram
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TelegramLogin;
