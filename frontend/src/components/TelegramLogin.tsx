import { useState } from 'react';

interface TelegramLoginProps {
    onLoginSuccess: () => void;
}

// TeleDrive Logo component using the new logo image
const TeleDriveLogo = ({ className = "w-16 h-16" }: { className?: string }) => (
    <img src="/logo.png" alt="TeleDrive" className={className} />
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-white rounded-full p-2 shadow-lg">
                                <TeleDriveLogo className="w-20 h-20" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">TeleDrive</h1>
                        <p className="text-blue-100 text-sm">Quản lý file trên Telegram</p>
                    </div>

                    {/* Body */}
                    <div className="p-8">
                        <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">
                            Đăng nhập Telegram
                        </h2>

                        {/* Status */}
                        {status && (
                            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-blue-700 text-sm">{status}</span>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Auto Login Button */}
                        <button
                            onClick={handleAutoLogin}
                            disabled={isLoading}
                            className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Đang đăng nhập...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <TeleDriveLogo className="w-6 h-6" />
                                    <span>Đăng nhập từ Telegram Desktop</span>
                                </div>
                            )}
                        </button>

                        {/* Instructions */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium text-gray-700 mb-2">Hướng dẫn:</h3>
                            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                                <li>Mở Telegram Desktop trên máy tính</li>
                                <li>Đảm bảo đã đăng nhập vào Telegram</li>
                                <li>Nhấn nút "Đăng nhập từ Telegram Desktop"</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    TeleDrive © 2024 - Lưu trữ file không giới hạn trên Telegram
                </p>
            </div>
        </div>
    );
};

export default TelegramLogin;
