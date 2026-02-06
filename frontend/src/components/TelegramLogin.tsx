import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { logger } from '../utils/logger';
import { useI18n, getAvailableLanguages, languageNames } from '../i18n';
import { useTheme } from '../contexts/ThemeContext';

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
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

    // i18n
    const { t, language, setLanguage } = useI18n();
    const availableLanguages = getAvailableLanguages();

    // Theme
    const { resolvedTheme, toggleTheme } = useTheme();

    // Country codes list - full list sorted A-Z by Vietnamese name
    const countryCodes = [
        { code: '+93', country: 'Afghanistan', flag: '🇦🇫', short: 'AF' },
        { code: '+355', country: 'Albania', flag: '🇦🇱', short: 'AL' },
        { code: '+213', country: 'Algeria', flag: '🇩🇿', short: 'DZ' },
        { code: '+376', country: 'Andorra', flag: '🇦🇩', short: 'AD' },
        { code: '+244', country: 'Angola', flag: '🇦🇴', short: 'AO' },
        { code: '+44', country: 'Anh', flag: '🇬🇧', short: 'GB' },
        { code: '+54', country: 'Argentina', flag: '🇦🇷', short: 'AR' },
        { code: '+374', country: 'Armenia', flag: '🇦🇲', short: 'AM' },
        { code: '+43', country: 'Áo', flag: '🇦🇹', short: 'AT' },
        { code: '+994', country: 'Azerbaijan', flag: '🇦🇿', short: 'AZ' },
        { code: '+91', country: 'Ấn Độ', flag: '🇮🇳', short: 'IN' },
        { code: '+966', country: 'Ả Rập Saudi', flag: '🇸🇦', short: 'SA' },
        { code: '+20', country: 'Ai Cập', flag: '🇪🇬', short: 'EG' },
        { code: '+880', country: 'Bangladesh', flag: '🇧🇩', short: 'BD' },
        { code: '+375', country: 'Belarus', flag: '🇧🇾', short: 'BY' },
        { code: '+32', country: 'Bỉ', flag: '🇧🇪', short: 'BE' },
        { code: '+501', country: 'Belize', flag: '🇧🇿', short: 'BZ' },
        { code: '+229', country: 'Benin', flag: '🇧🇯', short: 'BJ' },
        { code: '+975', country: 'Bhutan', flag: '🇧🇹', short: 'BT' },
        { code: '+591', country: 'Bolivia', flag: '🇧🇴', short: 'BO' },
        { code: '+387', country: 'Bosnia', flag: '🇧🇦', short: 'BA' },
        { code: '+267', country: 'Botswana', flag: '🇧🇼', short: 'BW' },
        { code: '+351', country: 'Bồ Đào Nha', flag: '🇵🇹', short: 'PT' },
        { code: '+55', country: 'Brazil', flag: '🇧🇷', short: 'BR' },
        { code: '+673', country: 'Brunei', flag: '🇧🇳', short: 'BN' },
        { code: '+359', country: 'Bulgaria', flag: '🇧🇬', short: 'BG' },
        { code: '+226', country: 'Burkina Faso', flag: '🇧🇫', short: 'BF' },
        { code: '+257', country: 'Burundi', flag: '🇧🇮', short: 'BI' },
        { code: '+1', country: 'Canada', flag: '🇨🇦', short: 'CA' },
        { code: '+238', country: 'Cabo Verde', flag: '🇨🇻', short: 'CV' },
        { code: '+855', country: 'Campuchia', flag: '🇰🇭', short: 'KH' },
        { code: '+237', country: 'Cameroon', flag: '🇨🇲', short: 'CM' },
        { code: '+236', country: 'Cộng hòa Trung Phi', flag: '🇨🇫', short: 'CF' },
        { code: '+235', country: 'Chad', flag: '🇹🇩', short: 'TD' },
        { code: '+56', country: 'Chile', flag: '🇨🇱', short: 'CL' },
        { code: '+57', country: 'Colombia', flag: '🇨🇴', short: 'CO' },
        { code: '+269', country: 'Comoros', flag: '🇰🇲', short: 'KM' },
        { code: '+242', country: 'Congo', flag: '🇨🇬', short: 'CG' },
        { code: '+506', country: 'Costa Rica', flag: '🇨🇷', short: 'CR' },
        { code: '+225', country: 'Côte d\'Ivoire', flag: '🇨🇮', short: 'CI' },
        { code: '+385', country: 'Croatia', flag: '🇭🇷', short: 'HR' },
        { code: '+53', country: 'Cuba', flag: '🇨🇺', short: 'CU' },
        { code: '+357', country: 'Cyprus', flag: '🇨🇾', short: 'CY' },
        { code: '+420', country: 'Cộng hòa Séc', flag: '🇨🇿', short: 'CZ' },
        { code: '+886', country: 'Đài Loan', flag: '🇹🇼', short: 'TW' },
        { code: '+45', country: 'Đan Mạch', flag: '🇩🇰', short: 'DK' },
        { code: '+253', country: 'Djibouti', flag: '🇩🇯', short: 'DJ' },
        { code: '+670', country: 'Đông Timor', flag: '🇹🇱', short: 'TL' },
        { code: '+49', country: 'Đức', flag: '🇩🇪', short: 'DE' },
        { code: '+593', country: 'Ecuador', flag: '🇪🇨', short: 'EC' },
        { code: '+503', country: 'El Salvador', flag: '🇸🇻', short: 'SV' },
        { code: '+240', country: 'Equatorial Guinea', flag: '🇬🇶', short: 'GQ' },
        { code: '+291', country: 'Eritrea', flag: '🇪🇷', short: 'ER' },
        { code: '+372', country: 'Estonia', flag: '🇪🇪', short: 'EE' },
        { code: '+251', country: 'Ethiopia', flag: '🇪🇹', short: 'ET' },
        { code: '+679', country: 'Fiji', flag: '🇫🇯', short: 'FJ' },
        { code: '+358', country: 'Phần Lan', flag: '🇫🇮', short: 'FI' },
        { code: '+241', country: 'Gabon', flag: '🇬🇦', short: 'GA' },
        { code: '+220', country: 'Gambia', flag: '🇬🇲', short: 'GM' },
        { code: '+995', country: 'Georgia', flag: '🇬🇪', short: 'GE' },
        { code: '+233', country: 'Ghana', flag: '🇬🇭', short: 'GH' },
        { code: '+30', country: 'Hy Lạp', flag: '🇬🇷', short: 'GR' },
        { code: '+502', country: 'Guatemala', flag: '🇬🇹', short: 'GT' },
        { code: '+224', country: 'Guinea', flag: '🇬🇳', short: 'GN' },
        { code: '+245', country: 'Guinea-Bissau', flag: '🇬🇼', short: 'GW' },
        { code: '+592', country: 'Guyana', flag: '🇬🇾', short: 'GY' },
        { code: '+509', country: 'Haiti', flag: '🇭🇹', short: 'HT' },
        { code: '+31', country: 'Hà Lan', flag: '🇳🇱', short: 'NL' },
        { code: '+82', country: 'Hàn Quốc', flag: '🇰🇷', short: 'KR' },
        { code: '+504', country: 'Honduras', flag: '🇭🇳', short: 'HN' },
        { code: '+852', country: 'Hồng Kông', flag: '🇭🇰', short: 'HK' },
        { code: '+36', country: 'Hungary', flag: '🇭🇺', short: 'HU' },
        { code: '+354', country: 'Iceland', flag: '🇮🇸', short: 'IS' },
        { code: '+62', country: 'Indonesia', flag: '🇮🇩', short: 'ID' },
        { code: '+98', country: 'Iran', flag: '🇮🇷', short: 'IR' },
        { code: '+964', country: 'Iraq', flag: '🇮🇶', short: 'IQ' },
        { code: '+353', country: 'Ireland', flag: '🇮🇪', short: 'IE' },
        { code: '+972', country: 'Israel', flag: '🇮🇱', short: 'IL' },
        { code: '+39', country: 'Ý', flag: '🇮🇹', short: 'IT' },
        { code: '+1876', country: 'Jamaica', flag: '🇯🇲', short: 'JM' },
        { code: '+962', country: 'Jordan', flag: '🇯🇴', short: 'JO' },
        { code: '+7', country: 'Kazakhstan', flag: '🇰🇿', short: 'KZ' },
        { code: '+254', country: 'Kenya', flag: '🇰🇪', short: 'KE' },
        { code: '+686', country: 'Kiribati', flag: '🇰🇮', short: 'KI' },
        { code: '+965', country: 'Kuwait', flag: '🇰🇼', short: 'KW' },
        { code: '+996', country: 'Kyrgyzstan', flag: '🇰🇬', short: 'KG' },
        { code: '+856', country: 'Lào', flag: '🇱🇦', short: 'LA' },
        { code: '+371', country: 'Latvia', flag: '🇱🇻', short: 'LV' },
        { code: '+961', country: 'Lebanon', flag: '🇱🇧', short: 'LB' },
        { code: '+266', country: 'Lesotho', flag: '🇱🇸', short: 'LS' },
        { code: '+231', country: 'Liberia', flag: '🇱🇷', short: 'LR' },
        { code: '+218', country: 'Libya', flag: '🇱🇾', short: 'LY' },
        { code: '+423', country: 'Liechtenstein', flag: '🇱🇮', short: 'LI' },
        { code: '+370', country: 'Lithuania', flag: '🇱🇹', short: 'LT' },
        { code: '+352', country: 'Luxembourg', flag: '🇱🇺', short: 'LU' },
        { code: '+853', country: 'Macau', flag: '🇲🇴', short: 'MO' },
        { code: '+389', country: 'Bắc Macedonia', flag: '🇲🇰', short: 'MK' },
        { code: '+261', country: 'Madagascar', flag: '🇲🇬', short: 'MG' },
        { code: '+265', country: 'Malawi', flag: '🇲🇼', short: 'MW' },
        { code: '+60', country: 'Malaysia', flag: '🇲🇾', short: 'MY' },
        { code: '+960', country: 'Maldives', flag: '🇲🇻', short: 'MV' },
        { code: '+223', country: 'Mali', flag: '🇲🇱', short: 'ML' },
        { code: '+356', country: 'Malta', flag: '🇲🇹', short: 'MT' },
        { code: '+222', country: 'Mauritania', flag: '🇲🇷', short: 'MR' },
        { code: '+230', country: 'Mauritius', flag: '🇲🇺', short: 'MU' },
        { code: '+52', country: 'Mexico', flag: '🇲🇽', short: 'MX' },
        { code: '+373', country: 'Moldova', flag: '🇲🇩', short: 'MD' },
        { code: '+377', country: 'Monaco', flag: '🇲🇨', short: 'MC' },
        { code: '+976', country: 'Mông Cổ', flag: '🇲🇳', short: 'MN' },
        { code: '+382', country: 'Montenegro', flag: '🇲🇪', short: 'ME' },
        { code: '+212', country: 'Morocco', flag: '🇲🇦', short: 'MA' },
        { code: '+258', country: 'Mozambique', flag: '🇲🇿', short: 'MZ' },
        { code: '+95', country: 'Myanmar', flag: '🇲🇲', short: 'MM' },
        { code: '+1', country: 'Mỹ', flag: '🇺🇸', short: 'US' },
        { code: '+264', country: 'Namibia', flag: '🇳🇦', short: 'NA' },
        { code: '+674', country: 'Nauru', flag: '🇳🇷', short: 'NR' },
        { code: '+977', country: 'Nepal', flag: '🇳🇵', short: 'NP' },
        { code: '+64', country: 'New Zealand', flag: '🇳🇿', short: 'NZ' },
        { code: '+7', country: 'Nga', flag: '🇷🇺', short: 'RU' },
        { code: '+81', country: 'Nhật Bản', flag: '🇯🇵', short: 'JP' },
        { code: '+505', country: 'Nicaragua', flag: '🇳🇮', short: 'NI' },
        { code: '+227', country: 'Niger', flag: '🇳🇪', short: 'NE' },
        { code: '+234', country: 'Nigeria', flag: '🇳🇬', short: 'NG' },
        { code: '+850', country: 'Triều Tiên', flag: '🇰🇵', short: 'KP' },
        { code: '+47', country: 'Na Uy', flag: '🇳🇴', short: 'NO' },
        { code: '+968', country: 'Oman', flag: '🇴🇲', short: 'OM' },
        { code: '+92', country: 'Pakistan', flag: '🇵🇰', short: 'PK' },
        { code: '+680', country: 'Palau', flag: '🇵🇼', short: 'PW' },
        { code: '+970', country: 'Palestine', flag: '🇵🇸', short: 'PS' },
        { code: '+507', country: 'Panama', flag: '🇵🇦', short: 'PA' },
        { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬', short: 'PG' },
        { code: '+595', country: 'Paraguay', flag: '🇵🇾', short: 'PY' },
        { code: '+51', country: 'Peru', flag: '🇵🇪', short: 'PE' },
        { code: '+33', country: 'Pháp', flag: '🇫🇷', short: 'FR' },
        { code: '+63', country: 'Philippines', flag: '🇵🇭', short: 'PH' },
        { code: '+48', country: 'Ba Lan', flag: '🇵🇱', short: 'PL' },
        { code: '+974', country: 'Qatar', flag: '🇶🇦', short: 'QA' },
        { code: '+40', country: 'Romania', flag: '🇷🇴', short: 'RO' },
        { code: '+250', country: 'Rwanda', flag: '🇷🇼', short: 'RW' },
        { code: '+685', country: 'Samoa', flag: '🇼🇸', short: 'WS' },
        { code: '+378', country: 'San Marino', flag: '🇸🇲', short: 'SM' },
        { code: '+221', country: 'Senegal', flag: '🇸🇳', short: 'SN' },
        { code: '+381', country: 'Serbia', flag: '🇷🇸', short: 'RS' },
        { code: '+248', country: 'Seychelles', flag: '🇸🇨', short: 'SC' },
        { code: '+232', country: 'Sierra Leone', flag: '🇸🇱', short: 'SL' },
        { code: '+65', country: 'Singapore', flag: '🇸🇬', short: 'SG' },
        { code: '+421', country: 'Slovakia', flag: '🇸🇰', short: 'SK' },
        { code: '+386', country: 'Slovenia', flag: '🇸🇮', short: 'SI' },
        { code: '+677', country: 'Solomon Islands', flag: '🇸🇧', short: 'SB' },
        { code: '+252', country: 'Somalia', flag: '🇸🇴', short: 'SO' },
        { code: '+27', country: 'Nam Phi', flag: '🇿🇦', short: 'ZA' },
        { code: '+211', country: 'Nam Sudan', flag: '🇸🇸', short: 'SS' },
        { code: '+34', country: 'Tây Ban Nha', flag: '🇪🇸', short: 'ES' },
        { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', short: 'LK' },
        { code: '+249', country: 'Sudan', flag: '🇸🇩', short: 'SD' },
        { code: '+597', country: 'Suriname', flag: '🇸🇷', short: 'SR' },
        { code: '+268', country: 'Eswatini', flag: '🇸🇿', short: 'SZ' },
        { code: '+46', country: 'Thụy Điển', flag: '🇸🇪', short: 'SE' },
        { code: '+41', country: 'Thụy Sĩ', flag: '🇨🇭', short: 'CH' },
        { code: '+963', country: 'Syria', flag: '🇸🇾', short: 'SY' },
        { code: '+992', country: 'Tajikistan', flag: '🇹🇯', short: 'TJ' },
        { code: '+255', country: 'Tanzania', flag: '🇹🇿', short: 'TZ' },
        { code: '+66', country: 'Thái Lan', flag: '🇹🇭', short: 'TH' },
        { code: '+228', country: 'Togo', flag: '🇹🇬', short: 'TG' },
        { code: '+676', country: 'Tonga', flag: '🇹🇴', short: 'TO' },
        { code: '+1868', country: 'Trinidad & Tobago', flag: '🇹🇹', short: 'TT' },
        { code: '+216', country: 'Tunisia', flag: '🇹🇳', short: 'TN' },
        { code: '+90', country: 'Thổ Nhĩ Kỳ', flag: '🇹🇷', short: 'TR' },
        { code: '+993', country: 'Turkmenistan', flag: '🇹🇲', short: 'TM' },
        { code: '+688', country: 'Tuvalu', flag: '🇹🇻', short: 'TV' },
        { code: '+86', country: 'Trung Quốc', flag: '🇨🇳', short: 'CN' },
        { code: '+256', country: 'Uganda', flag: '🇺🇬', short: 'UG' },
        { code: '+380', country: 'Ukraine', flag: '🇺🇦', short: 'UA' },
        { code: '+971', country: 'UAE', flag: '🇦🇪', short: 'AE' },
        { code: '+61', country: 'Úc', flag: '🇦🇺', short: 'AU' },
        { code: '+598', country: 'Uruguay', flag: '🇺🇾', short: 'UY' },
        { code: '+998', country: 'Uzbekistan', flag: '🇺🇿', short: 'UZ' },
        { code: '+678', country: 'Vanuatu', flag: '🇻🇺', short: 'VU' },
        { code: '+379', country: 'Vatican', flag: '🇻🇦', short: 'VA' },
        { code: '+58', country: 'Venezuela', flag: '🇻🇪', short: 'VE' },
        { code: '+84', country: 'Việt Nam', flag: '🇻🇳', short: 'VN' },
        { code: '+967', country: 'Yemen', flag: '🇾🇪', short: 'YE' },
        { code: '+260', country: 'Zambia', flag: '🇿🇲', short: 'ZM' },
        { code: '+263', country: 'Zimbabwe', flag: '🇿🇼', short: 'ZW' },
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
                    width: 160,
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
                { id: 'desktop' as LoginMethod, label: t('auth.desktop') },
                { id: 'qr' as LoginMethod, label: t('auth.qrCode') },
                { id: 'phone' as LoginMethod, label: t('auth.phone') }
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
                        <span>{t('auth.openingTelegram')}</span>
                    </>
                ) : (
                    <>
                        <TelegramIcon className="w-5 h-5" />
                        <span>{t('auth.desktopLoginBtn')}</span>
                    </>
                )}
            </button>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-gray-100 dark:border-dark-border text-sm text-gray-600 dark:text-dark-text-secondary">
                <p className="font-medium text-gray-700 dark:text-dark-text mb-2">💡 {t('auth.guide')}:</p>
                <ol className="space-y-1 list-decimal list-inside">
                    <li>{t('auth.desktopStep1')}</li>
                    <li>{t('auth.desktopStep2')}</li>
                    <li>{t('auth.desktopStep3')}</li>
                </ol>
            </div>
        </div>
    );

    const renderQRLogin = () => (
        <div className="text-center">
            <div className="relative inline-block p-3 bg-white dark:bg-dark-elevated rounded-xl shadow-inner border border-gray-100 dark:border-dark-border mb-3">
                {isLoading ? (
                    <div className="w-[160px] h-[160px] flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-[#0088cc] dark:border-dark-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : qrExpired ? (
                    <div className="w-[160px] h-[160px] flex flex-col items-center justify-center gap-2">
                        <p className="text-gray-500 dark:text-dark-text-secondary text-sm">{t('auth.qrExpired')}</p>
                        <button
                            onClick={startQRLogin}
                            className="px-3 py-1.5 bg-[#0088cc] dark:bg-dark-blue text-white dark:text-dark-bg rounded-lg text-sm hover:bg-[#006699] dark:hover:bg-dark-blue-hover transition-colors"
                        >
                            {t('auth.generateNewQR')}
                        </button>
                    </div>
                ) : qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-[160px] h-[160px]" />
                ) : null}
            </div>

            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
                {t('auth.scanQRDesc')}
            </p>

            <div className="p-3 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-gray-100 dark:border-dark-border text-sm text-gray-600 dark:text-dark-text-secondary text-left">
                <p className="font-medium text-gray-700 dark:text-dark-text mb-1.5">📱 {t('auth.guide')}:</p>
                <ol className="space-y-0.5 list-decimal list-inside text-xs">
                    <li>{t('auth.qrStep1')}</li>
                    <li>{t('auth.qrStep2')}</li>
                    <li>{t('auth.qrStep3')}</li>
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
                            {t('auth.phoneNumber')}
                        </label>
                        <div className="flex flex-col gap-2">
                            {/* Country Code Dropdown with Flag Images */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] dark:focus:ring-dark-blue transition-all bg-white dark:bg-dark-elevated text-gray-700 dark:text-dark-text font-medium text-sm flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <img
                                            src={`https://flagcdn.com/24x18/${countryCodes.find(c => c.code === countryCode)?.short.toLowerCase()}.png`}
                                            alt=""
                                            className="w-6 h-4 object-cover rounded-sm"
                                        />
                                        <span>{countryCodes.find(c => c.code === countryCode)?.country} ({countryCode})</span>
                                    </span>
                                    <svg className={`w-4 h-4 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {isCountryDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {countryCodes.map((c) => (
                                            <button
                                                type="button"
                                                key={c.code}
                                                onClick={() => {
                                                    setCountryCode(c.code);
                                                    setIsCountryDropdownOpen(false);
                                                }}
                                                className={`w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors ${countryCode === c.code ? 'bg-blue-50 dark:bg-dark-selected' : ''}`}
                                            >
                                                <img
                                                    src={`https://flagcdn.com/24x18/${c.short.toLowerCase()}.png`}
                                                    alt={c.country}
                                                    className="w-6 h-4 object-cover rounded-sm"
                                                />
                                                <span className="text-gray-700 dark:text-dark-text">{c.country}</span>
                                                <span className="text-gray-400 dark:text-dark-text-secondary">({c.code})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Phone Number Input */}
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder={t('auth.enterPhonePlaceholder')}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] dark:focus:ring-dark-blue focus:border-transparent transition-all bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary text-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-dark-text-disabled mt-1.5">
                            {t('auth.phoneExample').replace('{code}', countryCode)}
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !phoneNumber.trim()}
                        className={`w-full py-3 px-6 rounded-xl font-medium text-white transition-all duration-200 ${isLoading || !phoneNumber.trim()
                            ? 'bg-gray-300 dark:bg-dark-border cursor-not-allowed'
                            : 'bg-[#0088cc] dark:bg-dark-blue hover:bg-[#006699] dark:hover:bg-dark-blue-hover active:scale-[0.98]'
                            }`}
                    >
                        {isLoading ? t('auth.sending') : t('auth.sendCode')}
                    </button>
                </form>
            ) : (
                <form onSubmit={handlePhoneVerify}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                            {t('auth.verificationCode')}
                        </label>
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder={t('auth.enterCodePlaceholder')}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] dark:focus:ring-dark-blue focus:border-transparent transition-all text-center text-2xl tracking-widest bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary"
                            maxLength={5}
                        />
                    </div>

                    {needs2FA && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                {t('auth.password2FA')}
                            </label>
                            <input
                                type="password"
                                value={password2FA}
                                onChange={(e) => setPassword2FA(e.target.value)}
                                placeholder={t('auth.enter2FAPlaceholder')}
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
                        {isLoading ? t('auth.verifying') : t('auth.verify')}
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
                        {t('auth.goBack')}
                    </button>
                </form>
            )}
        </div>
    );

    return (
        <div className="h-full flex overflow-hidden">
            {/* Left Column - Branding */}
            <div className="w-1/2 bg-[#2AABEE] dark:bg-[#1e88c9] p-10 flex flex-col justify-between text-white">
                <div>
                    {/* Logo & Title */}
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10">
                            <img src="/logo.png" alt="TeleDrive" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">TeleDrive</h1>
                            <p className="text-white/70 text-sm">Cloud Storage 2026</p>
                        </div>
                    </div>

                    {/* Description */}
                    <h2 className="text-2xl font-semibold mb-4">
                        {t('auth.unlimitedStorage')}
                    </h2>
                    <p className="text-white/70 text-sm mb-8 leading-relaxed max-w-sm">
                        {t('auth.unlimitedStorageDesc')}
                    </p>

                    {/* Features */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-sm">{t('auth.featureUnlimited')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <span className="text-sm">{t('auth.featureEncryption')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                            </div>
                            <span className="text-sm">{t('auth.featureAccess')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-sm">{t('auth.featureSpeed')}</span>
                        </div>
                    </div>
                </div>

                {/* Footer info */}
                <div className="pt-6 border-t border-white/20">
                    <p className="text-white/50 text-xs">
                        {t('auth.copyright')}
                    </p>
                </div>
            </div>

            {/* Right Column - Login Form */}
            <div className="w-1/2 bg-white dark:bg-dark-surface p-10 flex flex-col justify-center">
                <div className="max-w-sm mx-auto w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-dark-text mb-2">
                            {t('auth.login')}
                        </h2>
                        <p className="text-gray-500 dark:text-dark-text-secondary text-sm">
                            {t('auth.selectMethod')}
                        </p>
                    </div>

                    {/* Login Method Selector */}
                    {renderLoginMethodSelector()}

                    {/* Status message */}
                    {status && (
                        <div className="mb-4 p-3 bg-cyan-50 dark:bg-dark-selected border border-cyan-100 dark:border-dark-blue/30 rounded-xl animate-fade-in">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-[#0088cc] dark:border-dark-blue border-t-transparent rounded-full animate-spin" />
                                <span className="text-[#0088cc] dark:text-dark-blue text-sm font-medium">{status}</span>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/30 rounded-xl animate-shake">
                            <div className="flex items-center gap-3">
                                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Render Login Form based on method */}
                    <div>
                        {loginMethod === 'desktop' && renderDesktopLogin()}
                        {loginMethod === 'qr' && renderQRLogin()}
                        {loginMethod === 'phone' && renderPhoneLogin()}
                    </div>

                    {/* Language & Theme Selector */}
                    <div className="mt-8 pt-4 border-t border-gray-100 dark:border-dark-border">
                        <div className="flex items-center justify-center gap-3">
                            {/* Language Dropdown */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                    <span>{languageNames[language]}</span>
                                    <svg className={`w-3 h-3 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {isLanguageDropdownOpen && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-xl shadow-lg max-h-64 overflow-y-auto z-50">
                                        {availableLanguages.map((lang) => (
                                            <button
                                                key={lang.code}
                                                type="button"
                                                onClick={() => {
                                                    setLanguage(lang.code);
                                                    setIsLanguageDropdownOpen(false);
                                                }}
                                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors ${language === lang.code ? 'bg-blue-50 dark:bg-dark-selected text-blue-600 dark:text-dark-blue' : 'text-gray-700 dark:text-dark-text'}`}
                                            >
                                                {lang.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Theme Toggle */}
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="p-2 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                                title={resolvedTheme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                            >
                                {resolvedTheme === 'dark' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TelegramLogin;
