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

// Floating particles animation component
const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <div
                key={i}
                className="absolute rounded-full bg-white/10 animate-float"
                style={{
                    width: `${Math.random() * 100 + 50}px`,
                    height: `${Math.random() * 100 + 50}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${Math.random() * 10 + 15}s`
                }}
            />
        ))}
    </div>
);

const TelegramLogin = ({ onLoginSuccess }: TelegramLoginProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [isHovered, setIsHovered] = useState(false);

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
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 animate-gradient-shift" />

            {/* Floating particles */}
            <FloatingParticles />

            {/* Glow effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse-slow" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

            <div className="relative w-full max-w-md z-10 animate-fade-in-up">
                {/* Glassmorphism Card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    {/* Header with logo */}
                    <div className="relative pt-12 pb-8 px-8 text-center">
                        {/* Logo container with glow */}
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur-xl opacity-50 animate-pulse-slow" />
                            <div className="relative bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl p-4 shadow-lg transform hover:scale-105 transition-transform duration-300">
                                <TelegramIcon className="w-16 h-16 text-white" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                            TeleDrive
                        </h1>
                        <p className="text-blue-200/80 text-sm font-medium">
                            Quản lý file không giới hạn trên Telegram
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="mx-8 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    {/* Body */}
                    <div className="p-8">
                        {/* Status message */}
                        {status && (
                            <div className="mb-6 p-4 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-xl animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-blue-200 text-sm font-medium">{status}</span>
                                </div>
                            </div>
                        )}

                        {/* Error message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl animate-shake">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-red-200 text-sm font-medium">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            onClick={handleAutoLogin}
                            disabled={isLoading}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={`relative w-full py-4 px-6 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 transform ${isLoading
                                    ? 'bg-gray-500/50 cursor-not-allowed scale-100'
                                    : 'hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]'
                                }`}
                        >
                            {/* Button gradient background */}
                            {!isLoading && (
                                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 bg-[length:200%_100%] transition-all duration-500 ${isHovered ? 'animate-gradient-x' : ''}`} />
                            )}

                            {/* Button glow effect */}
                            {!isLoading && (
                                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/25 to-blue-400/0 transform -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
                                </div>
                            )}

                            <div className="relative flex items-center justify-center gap-3">
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Đang kết nối...</span>
                                    </>
                                ) : (
                                    <>
                                        <TelegramIcon className="w-6 h-6" />
                                        <span>Đăng nhập từ Telegram Desktop</span>
                                    </>
                                )}
                            </div>
                        </button>

                        {/* Instructions */}
                        <div className="mt-8 p-5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Hướng dẫn
                            </h3>
                            <ol className="text-sm text-white/70 space-y-2">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                                    <span className="pt-0.5">Mở Telegram Desktop trên máy tính</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                                    <span className="pt-0.5">Đảm bảo đã đăng nhập vào tài khoản</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                                    <span className="pt-0.5">Nhấn nút đăng nhập phía trên</span>
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/40 text-sm mt-8 font-medium">
                    TeleDrive © 2024 — Lưu trữ file miễn phí trên Telegram
                </p>
            </div>
        </div>
    );
};

export default TelegramLogin;
