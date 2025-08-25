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

    # Base/header/sidebar
    'header.search_placeholder': {
        'en': 'Search files...',
        'vi': 'Tìm kiếm tệp...'
    },
    'header.profile': {
        'en': 'Profile',
        'vi': 'Hồ sơ'
    },
    'header.change_password': {
        'en': 'Change Password',
        'vi': 'Đổi mật khẩu'
    },
    'header.sign_out': {
        'en': 'Sign Out',
        'vi': 'Đăng xuất'
    },
    'header.sign_in': {
        'en': 'Sign In',
        'vi': 'Đăng nhập'
    },
    'header.sign_up': {
        'en': 'Sign Up',
        'vi': 'Đăng ký'
    },
    'sidebar.dashboard': {
        'en': 'Dashboard',
        'vi': 'Bảng điều khiển'
    },
    'sidebar.advanced_search': {
        'en': 'Advanced Search',
        'vi': 'Tìm kiếm nâng cao'
    },
    'sidebar.channel_scanner': {
        'en': 'Channel Scanner',
        'vi': 'Quét kênh'
    },
    'sidebar.settings': {
        'en': 'Settings',
        'vi': 'Cài đặt'
    },
    'sidebar.recent_files': {
        'en': 'Recent Files',
        'vi': 'Tệp gần đây'
    },
    'sidebar.storage': {
        'en': 'Storage',
        'vi': 'Dung lượng'
    },
    'loading.processing': {
        'en': 'Processing...',
        'vi': 'Đang xử lý...'
    },

    # Dashboard page
    'page.dashboard.title': {
        'en': 'Dashboard',
        'vi': 'Bảng điều khiển'
    },
    'actions.upload_files': {
        'en': 'Upload Files',
        'vi': 'Tải tệp lên'
    },
    'actions.new_folder': {
        'en': 'New Folder',
        'vi': 'Thư mục mới'
    },
    'actions.new_scan': {
        'en': 'New Scan',
        'vi': 'Quét mới'
    },
    'stats.total_files': {
        'en': 'Total Files',
        'vi': 'Tổng số tệp'
    },
    'stats.scans_completed': {
        'en': 'Scans Completed',
        'vi': 'Lượt quét hoàn tất'
    },
    'stats.total_size': {
        'en': 'Total Size',
        'vi': 'Tổng dung lượng'
    },
    'stats.last_scan': {
        'en': 'Last Scan',
        'vi': 'Lần quét gần nhất'
    },
    'breadcrumb.home': {
        'en': 'Home',
        'vi': 'Trang chủ'
    },
    'section.files_and_folders': {
        'en': 'Files & Folders',
        'vi': 'Tệp và Thư mục'
    },
    'buttons.select': {
        'en': 'Select',
        'vi': 'Chọn'
    },
    'buttons.list_view': {
        'en': 'List View',
        'vi': 'Chế độ danh sách'
    },
    'buttons.refresh': {
        'en': 'Refresh',
        'vi': 'Làm mới'
    },
    'empty.no_files': {
        'en': 'No files yet',
        'vi': 'Chưa có tệp'
    },
    'empty.start_scan_desc': {
        'en': 'Start by scanning a Telegram channel to see files here',
        'vi': 'Bắt đầu bằng cách quét một kênh Telegram để thấy tệp ở đây'
    },
    'empty.start_scanning': {
        'en': 'Start Scanning',
        'vi': 'Bắt đầu quét'
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

