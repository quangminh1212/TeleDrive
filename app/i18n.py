# Lightweight i18n utility without external dependencies
# Usage: from i18n import t; t('request_new_code', 'vi')

from typing import Dict

TRANSLATIONS: Dict[str, Dict[str, str]] = {
    # Auth common
    'request_new_code': {
        'en': 'Request new code',
        'vi': 'Yêu cầu mã mới',
    },
    'wait_seconds': {
        'en': 'Wait {s}s',
        'vi': 'Chờ {s} giây',
    },
    'resend_quota_hint': {
        'en': 'You can resend {remaining} of {max} times within 10 minutes.',
        'vi': 'Bạn có thể gửi lại {remaining}/{max} lần trong 10 phút.',
    },
    'code_valid_hint': {
        'en': 'Code is valid for about {mm}m {ss}s. If it fails, use Request new code.',
        'vi': 'Mã còn hiệu lực khoảng {mm} phút {ss} giây. Nếu lỗi, hãy bấm Yêu cầu mã mới.',
    },
    'code_expired_hint': {
        'en': 'The code may have expired. Please click Request new code.',
        'vi': 'Mã có thể đã hết hạn. Vui lòng bấm Yêu cầu mã mới.',
    },
    'resend_success': {
        'en': '✅ New code sent. Please check Telegram and enter the new code.',
        'vi': '✅ Đã gửi mã mới. Vui lòng kiểm tra Telegram và nhập mã.',
    },
    'resend_failed': {
        'en': 'Failed to resend code.',
        'vi': 'Gửi lại mã thất bại.',
    },
    'resend_network_error': {
        'en': 'Network error while resending code.',
        'vi': 'Lỗi mạng khi gửi lại mã.',
    },
    'sending': {
        'en': 'Sending...',
        'vi': 'Đang gửi...',
    },
    'verification_code_label': {
        'en': 'Verification Code',
        'vi': 'Mã xác thực',
    },
    'verify_code': {
        'en': 'Verify Code',
        'vi': 'Xác thực mã',
    },
    'verifying': {
        'en': 'Verifying...',
        'vi': 'Đang xác thực...',
    },
    'success_redirecting': {
        'en': 'Success! Redirecting...',
        'vi': 'Thành công! Đang chuyển hướng...',
    },
    'verify_failed_try_again': {
        'en': 'Verification failed. Please try again.',
        'vi': 'Xác thực thất bại. Vui lòng thử lại.',
    },
    'try_different_number': {
        'en': '← Try different number',
        'vi': '← Thử số khác',
    },
    # 2FA
    'two_factor_enabled_info': {
        'en': 'Two-factor authentication is enabled on your account. Please enter your password.',
        'vi': 'Tài khoản của bạn bật xác thực hai lớp. Vui lòng nhập mật khẩu.',
    },
    'two_factor_password_label': {
        'en': 'Two-Factor Password',
        'vi': 'Mật khẩu 2FA',
    },
}

DEFAULT_LANG = 'vi'


def t(key: str, lang: str = DEFAULT_LANG, **kwargs) -> str:
    lang = (lang or DEFAULT_LANG).lower()
    entry = TRANSLATIONS.get(key, {})
    # Fallback chain: lang -> English -> key
    template = entry.get(lang) or entry.get('en') or key
    try:
        return template.format(**kwargs)
    except Exception:
        # If formatting fails due to missing kwargs, return template as-is
        return template

