import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { logger } from '../utils/logger';

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
    const [countryCode, setCountryCode] = useState('+84');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [needsCode, setNeedsCode] = useState(false);
    const [needs2FA, setNeeds2FA] = useState(false);
    const [password2FA, setPassword2FA] = useState('');

    // Country codes list
    const countryCodes = [
        { code: '+84', country: '🇻🇳 Việt Nam', short: 'VN' },
        { code: '+1', country: '🇺🇸 Mỹ', short: 'US' },
        { code: '+44', country: '🇬🇧 Anh', short: 'UK' },
        { code: '+86', country: '🇨🇳 Trung Quốc', short: 'CN' },
        { code: '+81', country: '🇯🇵 Nhật Bản', short: 'JP' },
        { code: '+82', country: '🇰🇷 Hàn Quốc', short: 'KR' },
        { code: '+65', country: '🇸🇬 Singapore', short: 'SG' },
        { code: '+66', country: '🇹🇭 Thái Lan', short: 'TH' },
        { code: '+60', country: '🇲🇾 Malaysia', short: 'MY' },
        { code: '+62', country: '🇮🇩 Indonesia', short: 'ID' },
        { code: '+63', country: '🇵🇭 Philippines', short: 'PH' },
        { code: '+91', country: '🇮🇳 Ấn Độ', short: 'IN' },
        { code: '+49', country: '🇩🇪 Đức', short: 'DE' },
        { code: '+33', country: '🇫🇷 Pháp', short: 'FR' },
        { code: '+7', country: '🇷🇺 Nga', short: 'RU' },
        { code: '+61', country: '🇦🇺 Úc', short: 'AU' },
        { code: '+55', country: '🇧🇷 Brazil', short: 'BR' },
        { code: '+852', country: '🇭🇰 Hồng Kông', short: 'HK' },
        { code: '+886', country: '🇹🇼 Đài Loan', short: 'TW' },
        { code: '+971', country: '🇦🇪 UAE', short: 'AE' },
    ];

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

                    if (data.success && data.status === 'authenticated') {
                        if (interval) clearInterval(interval);
                        onLoginSuccess();
                    } else if (data.expired || data.status === 'expired') {
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
        logger.info('TelegramLogin', 'Starting QR login...');
        setIsLoading(true);
        setError(null);
        setQrExpired(false);
        setStatus('Đang tạo mã QR...');

        try {
            logger.info('TelegramLogin', 'Calling /api/auth/qr/start');
            const res = await fetch('http://127.0.0.1:5000/api/auth/qr/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            logger.info('TelegramLogin', 'QR start response status', { status: res.status });
            const data = await res.json();
            logger.info('TelegramLogin', 'QR start response data', { success: data.success, hasUrl: !!data.url });

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
                logger.info('TelegramLogin', 'QR code generated successfully');
            } else {
                logger.warn('TelegramLogin', 'QR start failed', { error: data.error });
                setError(data.error || 'Không thể tạo mã QR');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('TelegramLogin', 'QR login connection error', { error: errorMsg });
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
        logger.info('TelegramLogin', 'Starting Desktop auto-login...');
        setIsLoading(true);
        setError(null);
        setStatus('Đang kết nối với Telegram Desktop...');

        try {
            logger.info('TelegramLogin', 'Calling /api/v2/auth/auto-login');
            const response = await fetch('http://127.0.0.1:5000/api/v2/auth/auto-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            logger.info('TelegramLogin', 'Auto-login response status', { status: response.status });
            const result = await response.json();
            logger.info('TelegramLogin', 'Auto-login response', { success: result.success, hasMessage: !!result.message });

            if (result.success) {
                logger.info('TelegramLogin', 'Auto-login successful!');
                setStatus('Đăng nhập thành công!');
                setTimeout(() => {
                    onLoginSuccess();
                }, 500);
            } else {
                logger.warn('TelegramLogin', 'Auto-login failed', { message: result.message, hint: result.hint });
                setError(result.message || result.hint || 'Không thể đăng nhập');
                setStatus('');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('TelegramLogin', 'Auto-login connection error', { error: errorMsg });
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

        const fullPhone = countryCode + phoneNumber;
        logger.info('TelegramLogin', 'Starting phone login...', { phone: fullPhone.substring(0, 6) + '***' });
        setIsLoading(true);
        setError(null);
        setStatus('Đang gửi mã xác nhận...');

        try {
            logger.info('TelegramLogin', 'Calling /api/auth/phone/start');
            const res = await fetch('http://127.0.0.1:5000/api/auth/phone/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone })
            });
            logger.info('TelegramLogin', 'Phone start response status', { status: res.status });
            const data = await res.json();
            logger.info('TelegramLogin', 'Phone start response', { success: data.success, hasSessionId: !!data.session_id });

            if (data.success) {
                logger.info('TelegramLogin', 'OTP sent successfully');
                setSessionId(data.session_id);
                setNeedsCode(true);
                setStatus('Mã xác nhận đã được gửi đến Telegram của bạn');
            } else {
                logger.warn('TelegramLogin', 'Phone start failed', { error: data.error });
                setError(data.error || 'Không thể gửi mã xác nhận');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('TelegramLogin', 'Phone login connection error', { error: errorMsg });
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
                    session_id: sessionId,
                    code: verificationCode,
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
                { id: 'desktop' as LoginMethod, label: 'Desktop' },
                { id: 'qr' as LoginMethod, label: 'QR Code' },
                { id: 'phone' as LoginMethod, label: 'Số điện thoại' }
            ].map(method => (
                <button
                    key={method.id}
                    onClick={() => {
                        setLoginMethod(method.id);
                        setError(null);
                        setStatus('');
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${loginMethod === method.id
                        ? 'bg-[#0088cc] dark:bg-dark-blue text-white dark:text-dark-bg shadow-md'
                        : 'bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-hover'
                        }`}
                >
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
                    ? 'bg-gray-300 dark:bg-dark-border cursor-not-allowed'
                    : 'bg-[#0088cc] dark:bg-dark-blue hover:bg-[#006699] dark:hover:bg-dark-blue-hover hover:shadow-lg hover:shadow-cyan-500/25 dark:hover:shadow-dark-blue/25 active:scale-[0.98]'
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

            <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-gray-100 dark:border-dark-border text-sm text-gray-600 dark:text-dark-text-secondary">
                <p className="font-medium text-gray-700 dark:text-dark-text mb-2">💡 Hướng dẫn:</p>
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
            <div className="relative inline-block p-4 bg-white dark:bg-dark-elevated rounded-2xl shadow-inner border border-gray-100 dark:border-dark-border mb-4">
                {isLoading ? (
                    <div className="w-[200px] h-[200px] flex items-center justify-center">
                        <div className="w-10 h-10 border-3 border-[#0088cc] dark:border-dark-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : qrExpired ? (
                    <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-3">
                        <p className="text-gray-500 dark:text-dark-text-secondary text-sm">Mã QR đã hết hạn</p>
                        <button
                            onClick={startQRLogin}
                            className="px-4 py-2 bg-[#0088cc] dark:bg-dark-blue text-white dark:text-dark-bg rounded-lg text-sm hover:bg-[#006699] dark:hover:bg-dark-blue-hover transition-colors"
                        >
                            Tạo mã mới
                        </button>
                    </div>
                ) : qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-[200px] h-[200px]" />
                ) : null}
            </div>

            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                Quét mã QR bằng ứng dụng Telegram trên điện thoại
            </p>

            <div className="p-4 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-gray-100 dark:border-dark-border text-sm text-gray-600 dark:text-dark-text-secondary text-left">
                <p className="font-medium text-gray-700 dark:text-dark-text mb-2">📱 Hướng dẫn:</p>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Số điện thoại
                        </label>
                        <div className="flex gap-2">
                            {/* Country Code Dropdown */}
                            <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                className="px-3 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] dark:focus:ring-dark-blue focus:border-transparent transition-all bg-white dark:bg-dark-elevated text-gray-700 dark:text-dark-text font-medium min-w-[160px]"
                            >
                                {countryCodes.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.country} ({c.code})
                                    </option>
                                ))}
                            </select>
                            {/* Phone Number Input */}
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="Nhập số điện thoại"
                                className="flex-1 px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] dark:focus:ring-dark-blue focus:border-transparent transition-all bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary"
                            />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-dark-text-disabled mt-2">
                            Ví dụ: {countryCode} 912345678
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !phoneNumber.trim()}
                        className={`w-full py-3.5 px-6 rounded-xl font-medium text-white transition-all duration-200 ${isLoading || !phoneNumber.trim()
                            ? 'bg-gray-300 dark:bg-dark-border cursor-not-allowed'
                            : 'bg-[#0088cc] dark:bg-dark-blue hover:bg-[#006699] dark:hover:bg-dark-blue-hover active:scale-[0.98]'
                            }`}
                    >
                        {isLoading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handlePhoneVerify}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            Mã xác nhận
                        </label>
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="Nhập mã 5 số"
                            className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] dark:focus:ring-dark-blue focus:border-transparent transition-all text-center text-2xl tracking-widest bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary"
                            maxLength={5}
                        />
                    </div>

                    {needs2FA && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                Mật khẩu 2FA
                            </label>
                            <input
                                type="password"
                                value={password2FA}
                                onChange={(e) => setPassword2FA(e.target.value)}
                                placeholder="Nhập mật khẩu 2 lớp"
                                className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] dark:focus:ring-dark-blue focus:border-transparent transition-all bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 px-6 rounded-xl font-medium text-white transition-all duration-200 ${isLoading
                            ? 'bg-gray-300 dark:bg-dark-border cursor-not-allowed'
                            : 'bg-[#0088cc] dark:bg-dark-blue hover:bg-[#006699] dark:hover:bg-dark-blue-hover active:scale-[0.98]'
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
                        className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text"
                    >
                        ← Quay lại
                    </button>
                </form>
            )}
        </div>
    );

    return (
        <div className="h-full bg-[#f8fafd] dark:bg-dark-bg flex items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-md animate-fade-in-up">
                {/* Main Card */}
                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg border border-gray-100 dark:border-dark-border overflow-hidden">
                    {/* Header */}
                    <div className="pt-10 pb-6 px-8 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 shadow-lg shadow-cyan-500/20 dark:shadow-dark-blue/20 transform hover:scale-105 transition-transform duration-200 overflow-hidden">
                            <img src="/logo.png" alt="TeleDrive" className="w-full h-full object-cover" />
                        </div>

                        <h1 className="text-2xl font-semibold text-gray-800 dark:text-dark-text mb-1">
                            TeleDrive
                        </h1>
                        <p className="text-gray-500 dark:text-dark-text-secondary text-sm">
                            Quản lý file trên Telegram
                        </p>
                    </div>

                    <div className="mx-8 h-px bg-gray-100 dark:bg-dark-border" />

                    {/* Body */}
                    <div className="p-8">
                        <h2 className="text-lg font-medium text-gray-700 dark:text-dark-text text-center mb-4">
                            Đăng nhập để tiếp tục
                        </h2>

                        {/* Login Method Selector */}
                        {renderLoginMethodSelector()}

                        {/* Status message */}
                        {status && (
                            <div className="mb-5 p-4 bg-cyan-50 dark:bg-dark-selected border border-cyan-100 dark:border-dark-blue/30 rounded-xl animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-[#0088cc] dark:border-dark-blue border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[#0088cc] dark:text-dark-blue text-sm font-medium">{status}</span>
                                </div>
                            </div>
                        )}

                        {/* Error message */}
                        {error && (
                            <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/30 rounded-xl animate-shake">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
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
                    <p className="text-gray-400 dark:text-dark-text-secondary text-sm">
                        TeleDrive © 2024
                    </p>
                    <p className="text-gray-400 dark:text-dark-text-disabled text-xs">
                        Lưu trữ file không giới hạn trên Telegram
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TelegramLogin;
