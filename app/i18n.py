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

    # Common
    'common.from': {'en': 'From', 'vi': 'Từ'},
    'common.to': {'en': 'to', 'vi': 'đến'},
    'common.min': {'en': 'Min', 'vi': 'Tối thiểu'},
    'common.max': {'en': 'Max', 'vi': 'Tối đa'},
    'common.reset': {'en': 'Reset', 'vi': 'Đặt lại'},
    'common.save': {'en': 'Save', 'vi': 'Lưu'},
    'common.export_results': {'en': 'Export Results', 'vi': 'Xuất kết quả'},

    # Search page
    'page.search.title': {'en': 'Advanced Search', 'vi': 'Tìm kiếm nâng cao'},
    'search.placeholder': {'en': 'Search files, folders, and content...', 'vi': 'Tìm tệp, thư mục và nội dung...'},
    'search.button': {'en': 'Search', 'vi': 'Tìm kiếm'},
    'filters.title': {'en': 'Filters', 'vi': 'Bộ lọc'},
    'filters.clear_all': {'en': 'Clear All', 'vi': 'Xoá tất cả'},
    'filter.file_type': {'en': 'File Type', 'vi': 'Loại tệp'},
    'filter.all_types': {'en': 'All Types', 'vi': 'Tất cả'},
    'filter.images': {'en': 'Images', 'vi': 'Hình ảnh'},
    'filter.videos': {'en': 'Videos', 'vi': 'Video'},
    'filter.audio': {'en': 'Audio', 'vi': 'Âm thanh'},
    'filter.documents': {'en': 'Documents', 'vi': 'Tài liệu'},
    'filter.archives': {'en': 'Archives', 'vi': 'Lưu trữ'},
    'filter.folder': {'en': 'Folder', 'vi': 'Thư mục'},
    'filter.all_folders': {'en': 'All Folders', 'vi': 'Tất cả thư mục'},
    'filter.root_folder': {'en': 'Root Folder', 'vi': 'Thư mục gốc'},
    'filter.date_range': {'en': 'Date Range', 'vi': 'Khoảng ngày'},
    'filter.file_size_mb': {'en': 'File Size (MB)', 'vi': 'Dung lượng (MB)'},
    'filter.channel': {'en': 'Telegram Channel', 'vi': 'Kênh Telegram'},
    'filter.channel_placeholder': {'en': 'Channel name', 'vi': 'Tên kênh'},
    'filter.tags': {'en': 'Tags', 'vi': 'Nhãn'},
    'filter.tags_placeholder': {'en': 'tag1, tag2, tag3', 'vi': 'tag1, tag2, tag3'},
    'sort.by': {'en': 'Sort by', 'vi': 'Sắp xếp theo'},
    'sort.order': {'en': 'Order', 'vi': 'Thứ tự'},
    'sort.relevance': {'en': 'Relevance', 'vi': 'Mức liên quan'},
    'sort.date': {'en': 'Date', 'vi': 'Ngày'},
    'sort.name': {'en': 'Name', 'vi': 'Tên'},
    'sort.size': {'en': 'Size', 'vi': 'Dung lượng'},
    'sort.type': {'en': 'Type', 'vi': 'Loại'},
    'order.desc': {'en': 'Descending', 'vi': 'Giảm dần'},
    'order.asc': {'en': 'Ascending', 'vi': 'Tăng dần'},
    'search.results_found': {'en': 'results found', 'vi': 'kết quả'},
    'search.start_title': {'en': 'Start searching to see results', 'vi': 'Bắt đầu tìm kiếm để xem kết quả'},
    'search.start_desc': {'en': 'Use the search box above or apply filters to find your files', 'vi': 'Dùng ô tìm kiếm hoặc bộ lọc để tìm tệp'},
    'search.loading': {'en': 'Searching...', 'vi': 'Đang tìm...'},
    'search.export_results': {'en': 'Export Results', 'vi': 'Xuất kết quả'},

    # Scan page
    'page.scan.title': {'en': 'Channel Scanner', 'vi': 'Trình quét kênh'},
    'scan.hero.title': {'en': 'Channel Scanner', 'vi': 'Trình quét kênh'},
    'scan.hero.subtitle': {'en': 'Discover and organize files from Telegram channels with ease', 'vi': 'Khám phá và tổ chức tệp từ các kênh Telegram dễ dàng'},
    'scan.stats.total_scans': {'en': 'Total Scans', 'vi': 'Tổng lượt quét'},
    'scan.stats.files_found': {'en': 'Files Found', 'vi': 'Tệp tìm thấy'},
    'scan.stats.channels': {'en': 'Channels', 'vi': 'Kênh'},
    'scan.quick_start.title': {'en': 'Quick Start', 'vi': 'Bắt đầu nhanh'},
    'scan.quick_start.desc': {'en': 'Start scanning a Telegram channel in seconds', 'vi': 'Bắt đầu quét kênh trong vài giây'},
    'scan.input.channel.label': {'en': 'Channel URL or Username', 'vi': 'URL kênh hoặc Username'},
    'scan.input.channel.placeholder': {'en': '@channelname or https://t.me/channelname', 'vi': '@channelname hoặc https://t.me/channelname'},
    'scan.advanced_options': {'en': 'Advanced Options', 'vi': 'Tùy chọn nâng cao'},
    'scan.message_limit.label': {'en': 'Message Limit', 'vi': 'Giới hạn tin nhắn'},
    'scan.message_limit.placeholder_all': {'en': 'All messages', 'vi': 'Tất cả tin nhắn'},
    'scan.message_limit.suffix_messages': {'en': 'messages', 'vi': 'tin nhắn'},
    'scan.message_limit.help': {'en': 'Leave empty to scan all messages', 'vi': 'Để trống để quét tất cả tin nhắn'},
    'scan.direction.label': {'en': 'Scan Direction', 'vi': 'Hướng quét'},
    'scan.direction.newest_first': {'en': 'Newest First', 'vi': 'Mới nhất trước'},
    'scan.direction.oldest_first': {'en': 'Oldest First', 'vi': 'Cũ nhất trước'},
    'scan.file_size_filter.label': {'en': 'File Size Filter', 'vi': 'Lọc dung lượng tệp'},
    'scan.file_size_filter.min': {'en': 'Min size', 'vi': 'Dung lượng nhỏ nhất'},
    'scan.file_size_filter.max': {'en': 'Max size', 'vi': 'Dung lượng lớn nhất'},
    'scan.file_size_filter.unit_mb': {'en': 'MB', 'vi': 'MB'},
    'scan.file_size_filter.help': {'en': 'Leave empty for no size restrictions', 'vi': 'Để trống nếu không giới hạn dung lượng'},
    'scan.date_range_filter.label': {'en': 'Date Range Filter', 'vi': 'Lọc theo khoảng ngày'},
    'scan.date_range_filter.from': {'en': 'From', 'vi': 'Từ'},
    'scan.date_range_filter.to': {'en': 'To', 'vi': 'Đến'},
    'scan.date_range_filter.help': {'en': 'Filter messages by date range', 'vi': 'Lọc tin nhắn theo khoảng ngày'},
    'scan.file_types.legend': {'en': 'File Types to Include', 'vi': 'Loại tệp cần quét'},
    'scan.file_types.documents': {'en': 'Documents', 'vi': 'Tài liệu'},
    'scan.file_types.photos': {'en': 'Photos', 'vi': 'Ảnh'},
    'scan.file_types.videos': {'en': 'Videos', 'vi': 'Video'},
    'scan.file_types.audio': {'en': 'Audio', 'vi': 'Âm thanh'},
    'scan.file_types.desc.docs': {'en': 'PDF, DOC, TXT, etc.', 'vi': 'PDF, DOC, TXT,...'},
    'scan.file_types.desc.photos': {'en': 'JPG, PNG, GIF, etc.', 'vi': 'JPG, PNG, GIF,...'},
    'scan.file_types.desc.videos': {'en': 'MP4, AVI, MKV, etc.', 'vi': 'MP4, AVI, MKV,...'},
    'scan.file_types.desc.audio': {'en': 'MP3, WAV, FLAC, etc.', 'vi': 'MP3, WAV, FLAC,...'},
    'scan.actions.start': {'en': 'Start Scanning', 'vi': 'Bắt đầu quét'},
    'scan.actions.reset': {'en': 'Reset', 'vi': 'Đặt lại'},
    'scan.actions.save_template': {'en': 'Save Template', 'vi': 'Lưu mẫu'},

    # Settings page
    'page.settings.title': {'en': 'Settings', 'vi': 'Cài đặt'},
    'settings.save_changes': {'en': 'Save Changes', 'vi': 'Lưu thay đổi'},
    'settings.section.telegram.title': {'en': 'Telegram API Configuration', 'vi': 'Cấu hình Telegram API'},
    'settings.section.telegram.desc': {'en': 'Configure your Telegram API credentials. Get them from', 'vi': 'Cấu hình thông tin Telegram API. Nhận thông tin từ'},
    'settings.telegram.api_id.label': {'en': 'API ID', 'vi': 'API ID'},
    'settings.telegram.api_id.placeholder': {'en': 'Enter your API ID', 'vi': 'Nhập API ID'},
    'settings.telegram.api_id.help': {'en': 'Your unique API ID from Telegram', 'vi': 'API ID duy nhất của bạn từ Telegram'},
    'settings.telegram.api_hash.label': {'en': 'API Hash', 'vi': 'API Hash'},
    'settings.telegram.api_hash.placeholder': {'en': 'Enter your API Hash', 'vi': 'Nhập API Hash'},
    'settings.telegram.api_hash.help': {'en': 'Your API Hash from Telegram', 'vi': 'API Hash từ Telegram'},
    'settings.telegram.phone.label': {'en': 'Phone Number', 'vi': 'Số điện thoại'},
    'settings.telegram.phone.placeholder': {'en': '+84xxxxxxxxx', 'vi': '+84xxxxxxxxx'},
    'settings.telegram.phone.help': {'en': 'Your phone number with country code (e.g., +84987654321)', 'vi': 'Số điện thoại có mã quốc gia (vd: +84987654321)'},
    'settings.section.scanning.title': {'en': 'Scanning Configuration', 'vi': 'Cấu hình quét'},
    'settings.section.scanning.desc': {'en': 'Configure how files are scanned and processed', 'vi': 'Cài đặt cách quét và xử lý tệp'},
    'settings.max_messages.label': {'en': 'Max Messages', 'vi': 'Số tin tối đa'},
    'settings.max_messages.placeholder': {'en': 'Leave empty for unlimited', 'vi': 'Để trống để không giới hạn'},
    'settings.max_messages.help': {'en': 'Maximum number of messages to scan (leave empty for all)', 'vi': 'Số tin nhắn tối đa để quét (để trống để quét tất cả)'},
    'settings.batch_size.label': {'en': 'Batch Size', 'vi': 'Kích thước lô'},
    'settings.batch_size.help': {'en': 'Number of messages to process at once', 'vi': 'Số tin nhắn xử lý mỗi lần'},
    'settings.section.file_types.title': {'en': 'File Types to Scan', 'vi': 'Loại tệp cần quét'},
    'settings.section.file_types.desc': {'en': 'Choose which types of files to include in scans', 'vi': 'Chọn các loại tệp cần quét'},
    'settings.file_types.documents': {'en': 'Documents', 'vi': 'Tài liệu'},
    'settings.file_types.photos': {'en': 'Photos', 'vi': 'Ảnh'},
    'settings.file_types.videos': {'en': 'Videos', 'vi': 'Video'},
    'settings.file_types.audio': {'en': 'Audio', 'vi': 'Âm thanh'},
    'settings.file_types.voice': {'en': 'Voice Messages', 'vi': 'Tin nhắn thoại'},
    'settings.file_types.stickers': {'en': 'Stickers', 'vi': 'Nhãn dán'},
    'settings.section.advanced.title': {'en': 'Advanced Options', 'vi': 'Tùy chọn nâng cao'},
    'settings.section.advanced.desc': {'en': 'Configure advanced scanning and processing options', 'vi': 'Cấu hình nâng cao cho quét và xử lý'},
    'settings.advanced.file_types.legend': {'en': 'File Types to Include', 'vi': 'Loại tệp cần quét'},
    'settings.advanced.file_types.desc.docs': {'en': 'PDF, DOC, TXT, etc.', 'vi': 'PDF, DOC, TXT,...'},
    'settings.advanced.file_types.desc.photos': {'en': 'JPG, PNG, GIF, etc.', 'vi': 'JPG, PNG, GIF,...'},
    'settings.advanced.file_types.desc.videos': {'en': 'MP4, AVI, MKV, etc.', 'vi': 'MP4, AVI, MKV,...'},
    'settings.advanced.file_types.desc.audio': {'en': 'MP3, WAV, FLAC, etc.', 'vi': 'MP3, WAV, FLAC,...'},
    'settings.section.output.title': {'en': 'Output Configuration', 'vi': 'Cấu hình xuất'},
    'settings.section.output.desc': {'en': 'Configure output formats and file settings', 'vi': 'Cài đặt định dạng và tệp xuất'},

    # Auth pages
    'auth.login.title': {'en': 'Sign in', 'vi': 'Đăng nhập'},
    'auth.login.subtitle': {'en': 'to continue to TeleDrive', 'vi': 'để tiếp tục vào TeleDrive'},
    'auth.login.via_telegram': {'en': 'Sign in with Telegram', 'vi': 'Đăng nhập với Telegram'},
    'auth.login.only_telegram': {'en': 'Only Telegram authentication is supported.', 'vi': 'Chỉ hỗ trợ đăng nhập bằng Telegram.'},
    'auth.login.use_telegram': {'en': 'Please use your Telegram account to sign in.', 'vi': 'Vui lòng dùng tài khoản Telegram để đăng nhập.'},

    'profile.title': {'en': 'User Profile', 'vi': 'Hồ sơ người dùng'},
    'profile.member_since': {'en': 'Member since:', 'vi': 'Thành viên từ:'},
    'profile.account_status': {'en': 'Account status:', 'vi': 'Trạng thái tài khoản:'},
    'profile.last_updated': {'en': 'Last updated:', 'vi': 'Cập nhật lần cuối:'},
    'profile.active': {'en': 'Active', 'vi': 'Hoạt động'},
    'profile.inactive': {'en': 'Inactive', 'vi': 'Không hoạt động'},
    'profile.change_password': {'en': 'Change Password', 'vi': 'Đổi mật khẩu'},
    'profile.sign_out': {'en': 'Sign Out', 'vi': 'Đăng xuất'},
    'profile.stats.title': {'en': 'Account Statistics', 'vi': 'Thống kê tài khoản'},
    'profile.stats.files': {'en': 'Files', 'vi': 'Tệp'},
    'profile.stats.folders': {'en': 'Folders', 'vi': 'Thư mục'},
    'profile.stats.scans': {'en': 'Scans', 'vi': 'Quét'},

    # Share pages (public)
    'share.not_found.title': {'en': 'Share Not Found', 'vi': 'Liên kết không tồn tại'},
    'share.not_found.message': {
        'en': "The shared file you're looking for doesn't exist or has been removed.",
        'vi': 'Tệp được chia sẻ không tồn tại hoặc đã bị xoá.'
    },
    'share.not_found.reasons.title': {'en': 'This could happen if:', 'vi': 'Có thể do:'},
    'share.not_found.reason.expired': {'en': 'The share link has expired', 'vi': 'Liên kết chia sẻ đã hết hạn'},
    'share.not_found.reason.deleted': {'en': 'The file has been deleted by the owner', 'vi': 'Tệp đã bị chủ sở hữu xoá'},
    'share.not_found.reason.disabled': {'en': 'The share link has been disabled', 'vi': 'Liên kết đã bị vô hiệu hoá'},
    'share.not_found.reason.incorrect': {'en': 'The link URL is incorrect or incomplete', 'vi': 'URL liên kết không đúng hoặc không đầy đủ'},
    'share.not_found.goto': {'en': 'Go to TeleDrive', 'vi': 'Về TeleDrive'},
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

