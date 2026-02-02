import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

interface TelegramLoginProps {
    onLoginSuccess: () => void;
}

type LoginMethod = 'desktop' | 'qr' | 'phone';

// Telegram Icon SVG  
const TelegramIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

const TelegramLogin = ({ onLoginSuccess }: TelegramLoginProps) => {
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('desktop');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    // QR Login state
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [qrToken, setQrToken] = useState<string | null>(null);
    const [qrExpired, setQrExpired] = useState(false);

    // Phone Login state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneHash, setPhoneHash] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [needsCode, setNeedsCode] = useState(false);
    const [needs2FA, setNeeds2FA] = useState(false);
    const [password2FA, setPassword2FA] = useState('');

    // Check QR status periodically
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (loginMethod === 'qr' && qrToken && !qrExpired) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('http://127.0.0.1:5000/api/auth/qr/status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: qrToken })
                    });
                    const data = await res.json();

                    if (data.success && data.logged_in) {
                        if (interval) clearInterval(interval);
                        onLoginSuccess();
                    } else if (data.expired) {
                        setQrExpired(true);
                        if (interval) clearInterval(interval);
                    }
                } catch (err) {
                    console.error('QR status check failed:', err);
                }
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [loginMethod, qrToken, qrExpired, onLoginSuccess]);

    // Start QR Login
    const startQRLogin = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setQrExpired(false);
        setStatus('Đang tạo mã QR...');

        try {
            const res = await fetch('http://127.0.0.1:5000/api/auth/qr/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success && data.url) {
                setQrToken(data.token);
                // Generate QR code image
                const qrDataUrl = await QRCode.toDataURL(data.url, {
                    width: 200,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' }
                });
                setQrCode(qrDataUrl);
                setStatus('');
            } else {
                setError(data.error || 'Không thể tạo mã QR');
            }
        } catch (err) {
            setError('Không thể kết nối đến server');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Auto start QR when switching to QR method
    useEffect(() => {
        if (loginMethod === 'qr' && !qrCode && !isLoading) {
            startQRLogin();
        }
    }, [loginMethod, qrCode, isLoading, startQRLogin]);

    // Desktop Auto Login
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

    // Phone Login - Start
    const handlePhoneStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber.trim()) {
            setError('Vui lòng nhập số điện thoại');
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatus('Đang gửi mã xác nhận...');

        try {
            const res = await fetch('http://127.0.0.1:5000/api/auth/phone/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phoneNumber })
            });
            const data = await res.json();

            if (data.success) {
                setPhoneHash(data.phone_code_hash);
                setNeedsCode(true);
                setStatus('Mã xác nhận đã được gửi đến Telegram của bạn');
            } else {
                setError(data.error || 'Không thể gửi mã xác nhận');
            }
        } catch (err) {
            setError('Không thể kết nối đến server');
        } finally {
            setIsLoading(false);
        }
    };

    // Phone Login - Verify Code
    const handlePhoneVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verificationCode.trim()) {
            setError('Vui lòng nhập mã xác nhận');
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatus('Đang xác nhận...');

        try {
            const res = await fetch('http://127.0.0.1:5000/api/auth/phone/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phoneNumber,
                    code: verificationCode,
                    phone_code_hash: phoneHash,
                    password: needs2FA ? password2FA : undefined
                })
            });
            const data = await res.json();

            if (data.success) {
                setStatus('Đăng nhập thành công!');
                setTimeout(() => {
                    onLoginSuccess();
                }, 500);
            } else if (data.needs_2fa) {
                setNeeds2FA(true);
                setStatus('');
                setError('Tài khoản có bảo mật 2 lớp. Vui lòng nhập mật khẩu.');
            } else {
                setError(data.error || 'Mã xác nhận không đúng');
            }
        } catch (err) {
            setError('Không thể kết nối đến server');
        } finally {
            setIsLoading(false);
        }
    };

    const renderLoginMethodSelector = () => (
        <div className="flex gap-2 mb-6">
            {[
                { id: 'desktop' as LoginMethod, label: 'Desktop', icon: '💻' },
                { id: 'qr' as LoginMethod, label: 'QR Code', icon: '📱' },
                { id: 'phone' as LoginMethod, label: 'Số điện thoại', icon: '📞' }
            ].map(method => (
                <button
                    key={method.id}
                    onClick={() => {
                        setLoginMethod(method.id);
                        setError(null);
                        setStatus('');
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${loginMethod === method.id
                            ? 'bg-[#0088cc] text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <span className="mr-1">{method.icon}</span>
                    {method.label}
                </button>
            ))}
        </div>
    );

    const renderDesktopLogin = () => (
        <div>
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

            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-2">💡 Hướng dẫn:</p>
                <ol className="space-y-1 list-decimal list-inside">
                    <li>Mở Telegram Desktop trên máy tính</li>
                    <li>Đảm bảo đã đăng nhập vào tài khoản</li>
                    <li>Nhấn nút đăng nhập phía trên</li>
                </ol>
            </div>
        </div>
    );

    const renderQRLogin = () => (
        <div className="text-center">
            <div className="relative inline-block p-4 bg-white rounded-2xl shadow-inner border border-gray-100 mb-4">
                {isLoading ? (
                    <div className="w-[200px] h-[200px] flex items-center justify-center">
                        <div className="w-10 h-10 border-3 border-[#0088cc] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : qrExpired ? (
                    <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-3">
                        <p className="text-gray-500 text-sm">Mã QR đã hết hạn</p>
                        <button
                            onClick={startQRLogin}
                            className="px-4 py-2 bg-[#0088cc] text-white rounded-lg text-sm hover:bg-[#006699] transition-colors"
                        >
                            Tạo mã mới
                        </button>
                    </div>
                ) : qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-[200px] h-[200px]" />
                ) : null}
            </div>

            <p className="text-sm text-gray-600 mb-4">
                Quét mã QR bằng ứng dụng Telegram trên điện thoại
            </p>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600 text-left">
                <p className="font-medium text-gray-700 mb-2">📱 Hướng dẫn:</p>
                <ol className="space-y-1 list-decimal list-inside">
                    <li>Mở Telegram trên điện thoại</li>
                    <li>Vào Cài đặt → Thiết bị → Quét QR</li>
                    <li>Quét mã QR phía trên</li>
                </ol>
            </div>
        </div>
    );

    const renderPhoneLogin = () => (
        <div>
            {!needsCode ? (
                <form onSubmit={handlePhoneStart}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Số điện thoại
                        </label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+84 xxx xxx xxx"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 px-6 rounded-xl font-medium text-white transition-all duration-200 ${isLoading
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-[#0088cc] hover:bg-[#006699] active:scale-[0.98]'
                            }`}
                    >
                        {isLoading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handlePhoneVerify}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mã xác nhận
                        </label>
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="Nhập mã 5 số"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent transition-all text-center text-2xl tracking-widest"
                            maxLength={5}
                        />
                    </div>

                    {needs2FA && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mật khẩu 2FA
                            </label>
                            <input
                                type="password"
                                value={password2FA}
                                onChange={(e) => setPassword2FA(e.target.value)}
                                placeholder="Nhập mật khẩu 2 lớp"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent transition-all"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 px-6 rounded-xl font-medium text-white transition-all duration-200 ${isLoading
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-[#0088cc] hover:bg-[#006699] active:scale-[0.98]'
                            }`}
                    >
                        {isLoading ? 'Đang xác nhận...' : 'Xác nhận'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setNeedsCode(false);
                            setVerificationCode('');
                            setNeeds2FA(false);
                            setPassword2FA('');
                        }}
                        className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                        ← Quay lại
                    </button>
                </form>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fade-in-up">
                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="pt-10 pb-6 px-8 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 shadow-lg shadow-cyan-500/20 transform hover:scale-105 transition-transform duration-200 overflow-hidden">
                            <img src="/logo.png" alt="TeleDrive" className="w-full h-full object-cover" />
                        </div>

                        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
                            TeleDrive
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Quản lý file trên Telegram
                        </p>
                    </div>

                    <div className="mx-8 h-px bg-gray-100" />

                    {/* Body */}
                    <div className="p-8">
                        <h2 className="text-lg font-medium text-gray-700 text-center mb-4">
                            Đăng nhập để tiếp tục
                        </h2>

                        {/* Login Method Selector */}
                        {renderLoginMethodSelector()}

                        {/* Status message */}
                        {status && (
                            <div className="mb-5 p-4 bg-cyan-50 border border-cyan-100 rounded-xl animate-fade-in">
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

                        {/* Render Login Form based on method */}
                        {loginMethod === 'desktop' && renderDesktopLogin()}
                        {loginMethod === 'qr' && renderQRLogin()}
                        {loginMethod === 'phone' && renderPhoneLogin()}
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
