"""
Configuration models using Pydantic for validation and type safety
"""

from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from pydantic import BaseModel, Field, validator, root_validator
import os


class TelegramConfig(BaseModel):
    """Telegram API configuration"""
    api_id: str = Field(..., description="Telegram API ID from https://my.telegram.org/apps")
    api_hash: str = Field(..., description="Telegram API Hash from https://my.telegram.org/apps")
    phone_number: str = Field(..., description="Phone number with country code (e.g., +84987654321)")
    session_name: str = Field(default="telegram_scanner_session", description="Session file name")
    connection_timeout: int = Field(default=30, ge=5, le=300, description="Connection timeout in seconds")
    request_timeout: int = Field(default=60, ge=10, le=600, description="Request timeout in seconds")
    retry_attempts: int = Field(default=3, ge=1, le=10, description="Number of retry attempts")
    retry_delay: int = Field(default=5, ge=1, le=60, description="Delay between retries in seconds")
    flood_sleep_threshold: int = Field(default=60, ge=30, le=300, description="Flood sleep threshold")
    device_model: str = Field(default="Telegram File Scanner", description="Device model identifier")
    system_version: str = Field(default="1.0", description="System version")
    app_version: str = Field(default="1.0", description="App version")
    lang_code: str = Field(default="vi", description="Language code")
    system_lang_code: str = Field(default="vi-VN", description="System language code")

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must start with country code (+)')
        if len(v) < 10:
            raise ValueError('Phone number too short')
        return v

    @validator('api_id')
    def validate_api_id(cls, v):
        if not v or v == "YOUR_API_ID":
            raise ValueError('API ID must be configured')
        return v

    @validator('api_hash')
    def validate_api_hash(cls, v):
        if not v or v == "YOUR_API_HASH":
            raise ValueError('API Hash must be configured')
        return v


class OutputFormatConfig(BaseModel):
    """Configuration for a specific output format"""
    enabled: bool = Field(default=True, description="Enable this output format")
    filename: str = Field(..., description="Output filename")
    encoding: str = Field(default="utf-8", description="File encoding")


class CSVConfig(OutputFormatConfig):
    """CSV output configuration"""
    delimiter: str = Field(default=",", description="CSV delimiter")
    include_headers: bool = Field(default=True, description="Include column headers")


class JSONConfig(OutputFormatConfig):
    """JSON output configuration"""
    indent: int = Field(default=2, ge=0, le=8, description="JSON indentation")
    ensure_ascii: bool = Field(default=False, description="Ensure ASCII encoding")


class ExcelConfig(OutputFormatConfig):
    """Excel output configuration"""
    sheet_name: str = Field(default="Telegram Files", description="Excel sheet name")
    auto_filter: bool = Field(default=True, description="Enable auto filter")
    freeze_panes: bool = Field(default=True, description="Freeze header panes")


class SimpleJSONConfig(OutputFormatConfig):
    """Simple JSON output configuration"""
    fields: List[str] = Field(default=["name", "download_link"], description="Fields to include")


class OutputConfig(BaseModel):
    """Output configuration"""
    directory: str = Field(default="output", description="Output directory")
    create_subdirs: bool = Field(default=True, description="Create subdirectories")
    timestamp_folders: bool = Field(default=False, description="Create timestamp-based folders")
    backup_existing: bool = Field(default=True, description="Backup existing files")
    
    csv: CSVConfig = Field(default_factory=lambda: CSVConfig(filename="telegram_files.csv"))
    json: JSONConfig = Field(default_factory=lambda: JSONConfig(filename="telegram_files.json"))
    excel: ExcelConfig = Field(default_factory=lambda: ExcelConfig(filename="telegram_files.xlsx"))
    simple_json: SimpleJSONConfig = Field(default_factory=lambda: SimpleJSONConfig(
        enabled=False, filename="simple_files.json"
    ))


class FileTypesConfig(BaseModel):
    """File types configuration"""
    documents: bool = Field(default=True, description="Include documents")
    photos: bool = Field(default=True, description="Include photos")
    videos: bool = Field(default=True, description="Include videos")
    audio: bool = Field(default=True, description="Include audio files")
    voice: bool = Field(default=True, description="Include voice messages")
    stickers: bool = Field(default=True, description="Include stickers")
    animations: bool = Field(default=True, description="Include animations/GIFs")
    video_notes: bool = Field(default=True, description="Include video notes")
    contacts: bool = Field(default=False, description="Include contacts")
    locations: bool = Field(default=False, description="Include locations")


class PerformanceConfig(BaseModel):
    """Performance configuration"""
    concurrent_downloads: int = Field(default=3, ge=1, le=10, description="Concurrent downloads")
    sleep_between_batches: float = Field(default=1.0, ge=0.1, le=10.0, description="Sleep between batches")
    memory_limit_mb: int = Field(default=512, ge=128, le=2048, description="Memory limit in MB")
    cache_size: int = Field(default=1000, ge=100, le=10000, description="Cache size")


class ScanningConfig(BaseModel):
    """Scanning configuration"""
    max_messages: Optional[int] = Field(default=None, ge=1, description="Maximum messages to scan")
    batch_size: int = Field(default=100, ge=10, le=1000, description="Batch size for processing")
    scan_direction: str = Field(default="newest_first", description="Scanning direction")
    include_deleted: bool = Field(default=False, description="Include deleted messages")
    skip_duplicates: bool = Field(default=True, description="Skip duplicate files")
    scan_replies: bool = Field(default=True, description="Scan reply messages")
    scan_forwards: bool = Field(default=True, description="Scan forwarded messages")
    min_message_id: Optional[int] = Field(default=None, description="Minimum message ID")
    max_message_id: Optional[int] = Field(default=None, description="Maximum message ID")
    
    file_types: FileTypesConfig = Field(default_factory=FileTypesConfig)
    performance: PerformanceConfig = Field(default_factory=PerformanceConfig)

    @validator('scan_direction')
    def validate_scan_direction(cls, v):
        allowed = ['newest_first', 'oldest_first']
        if v not in allowed:
            raise ValueError(f'scan_direction must be one of {allowed}')
        return v


class DownloadConfig(BaseModel):
    """Download configuration"""
    generate_links: bool = Field(default=True, description="Generate download links")
    include_preview: bool = Field(default=False, description="Include preview images")
    auto_download: bool = Field(default=False, description="Auto download files")
    download_directory: str = Field(default="downloads", description="Download directory")
    create_date_folders: bool = Field(default=True, description="Create date-based folders")
    preserve_filename: bool = Field(default=True, description="Preserve original filenames")
    max_file_size_mb: int = Field(default=100, ge=1, le=2000, description="Max file size in MB")
    allowed_extensions: List[str] = Field(default_factory=list, description="Allowed file extensions")
    blocked_extensions: List[str] = Field(
        default_factory=lambda: [".exe", ".bat", ".cmd", ".scr"],
        description="Blocked file extensions"
    )
    download_timeout: int = Field(default=300, ge=30, le=3600, description="Download timeout in seconds")
    verify_downloads: bool = Field(default=True, description="Verify downloaded files")
    resume_downloads: bool = Field(default=True, description="Resume interrupted downloads")


class DisplayConfig(BaseModel):
    """Display configuration"""
    show_progress: bool = Field(default=True, description="Show progress bars")
    show_file_details: bool = Field(default=True, description="Show file details")
    show_statistics: bool = Field(default=True, description="Show statistics")
    language: str = Field(default="vi", description="Display language")
    date_format: str = Field(default="DD/MM/YYYY HH:mm:ss", description="Date format")
    file_size_format: str = Field(default="auto", description="File size format")
    progress_bar_style: str = Field(default="bar", description="Progress bar style")
    console_width: int = Field(default=80, ge=40, le=200, description="Console width")
    log_level: str = Field(default="INFO", description="Log level")
    colors: Dict[str, str] = Field(
        default_factory=lambda: {
            "success": "green",
            "error": "red", 
            "warning": "yellow",
            "info": "blue"
        },
        description="Color scheme"
    )


class FiltersConfig(BaseModel):
    """Filtering configuration"""
    min_file_size: int = Field(default=0, ge=0, description="Minimum file size in bytes")
    max_file_size: Optional[int] = Field(default=None, ge=1, description="Maximum file size in bytes")
    file_extensions: List[str] = Field(default_factory=list, description="Include file extensions")
    exclude_extensions: List[str] = Field(default_factory=list, description="Exclude file extensions")
    date_from: Optional[str] = Field(default=None, description="Filter from date")
    date_to: Optional[str] = Field(default=None, description="Filter to date")
    filename_patterns: List[str] = Field(default_factory=list, description="Filename patterns to include")
    exclude_patterns: List[str] = Field(default_factory=list, description="Filename patterns to exclude")
    sender_filter: List[str] = Field(default_factory=list, description="Filter by sender")
    exclude_senders: List[str] = Field(default_factory=list, description="Exclude senders")
    message_text_filter: str = Field(default="", description="Filter by message text")
    case_sensitive: bool = Field(default=False, description="Case sensitive filtering")


class SecurityConfig(BaseModel):
    """Security configuration"""
    mask_phone_numbers: bool = Field(default=True, description="Mask phone numbers in output")
    mask_user_ids: bool = Field(default=False, description="Mask user IDs")
    exclude_personal_info: bool = Field(default=True, description="Exclude personal information")
    secure_session: bool = Field(default=True, description="Use secure session storage")
    auto_logout: bool = Field(default=False, description="Auto logout after scanning")
    session_timeout: int = Field(default=3600, ge=300, le=86400, description="Session timeout in seconds")


class LoggingConfig(BaseModel):
    """Logging configuration"""
    enabled: bool = Field(default=True, description="Enable logging")
    level: str = Field(default="DEBUG", description="Log level")
    file: str = Field(default="logs/scanner.log", description="Main log file")
    max_size_mb: int = Field(default=10, ge=1, le=100, description="Max log file size in MB")
    backup_count: int = Field(default=5, ge=1, le=20, description="Number of backup files")
    format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
        description="Log format"
    )
    console_output: bool = Field(default=True, description="Output to console")
    detailed_steps: bool = Field(default=True, description="Log detailed steps")
    show_progress_details: bool = Field(default=True, description="Show progress details")
    log_api_calls: bool = Field(default=True, description="Log API calls")
    log_file_operations: bool = Field(default=True, description="Log file operations")
    log_config_changes: bool = Field(default=True, description="Log configuration changes")
    
    separate_files: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": True,
            "config_log": "logs/config.log",
            "api_log": "logs/api.log", 
            "files_log": "logs/files.log",
            "errors_log": "logs/errors.log"
        },
        description="Separate log files configuration"
    )

    @validator('level')
    def validate_log_level(cls, v):
        allowed = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in allowed:
            raise ValueError(f'log level must be one of {allowed}')
        return v.upper()


class ProxyConfig(BaseModel):
    """Proxy configuration"""
    enabled: bool = Field(default=False, description="Enable proxy")
    type: str = Field(default="socks5", description="Proxy type")
    host: str = Field(default="", description="Proxy host")
    port: int = Field(default=1080, ge=1, le=65535, description="Proxy port")
    username: str = Field(default="", description="Proxy username")
    password: str = Field(default="", description="Proxy password")

    @validator('type')
    def validate_proxy_type(cls, v):
        allowed = ['http', 'https', 'socks4', 'socks5']
        if v.lower() not in allowed:
            raise ValueError(f'proxy type must be one of {allowed}')
        return v.lower()


class RateLimitingConfig(BaseModel):
    """Rate limiting configuration"""
    enabled: bool = Field(default=True, description="Enable rate limiting")
    requests_per_second: int = Field(default=10, ge=1, le=100, description="Requests per second")
    burst_limit: int = Field(default=20, ge=1, le=200, description="Burst limit")


class ExperimentalConfig(BaseModel):
    """Experimental features configuration"""
    parallel_scanning: bool = Field(default=False, description="Enable parallel scanning")
    smart_retry: bool = Field(default=True, description="Enable smart retry logic")
    adaptive_batch_size: bool = Field(default=False, description="Enable adaptive batch sizing")


class AdvancedConfig(BaseModel):
    """Advanced configuration"""
    use_ipv6: bool = Field(default=False, description="Use IPv6 connections")
    proxy: ProxyConfig = Field(default_factory=ProxyConfig)
    rate_limiting: RateLimitingConfig = Field(default_factory=RateLimitingConfig)
    experimental: ExperimentalConfig = Field(default_factory=ExperimentalConfig)


class TeleDriveConfig(BaseModel):
    """Main TeleDrive configuration model"""
    _schema_version: str = Field(default="1.0", description="Configuration schema version")
    _description: str = Field(default="Telegram File Scanner Configuration", description="Configuration description")
    _last_updated: str = Field(default="", description="Last update timestamp")

    telegram: TelegramConfig
    output: OutputConfig = Field(default_factory=OutputConfig)
    scanning: ScanningConfig = Field(default_factory=ScanningConfig)
    download: DownloadConfig = Field(default_factory=DownloadConfig)
    display: DisplayConfig = Field(default_factory=DisplayConfig)
    filters: FiltersConfig = Field(default_factory=FiltersConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    advanced: AdvancedConfig = Field(default_factory=AdvancedConfig)

    class Config:
        extra = "forbid"  # Don't allow extra fields
        validate_assignment = True  # Validate on assignment
        use_enum_values = True

    @root_validator
    def validate_config(cls, values):
        """Validate the entire configuration"""
        # Ensure required directories exist
        output_config = values.get('output')
        if output_config and hasattr(output_config, 'directory'):
            output_dir = output_config.directory
            if output_dir:
                Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Validate logging directory
        logging_config = values.get('logging')
        if logging_config and hasattr(logging_config, 'enabled') and logging_config.enabled:
            if hasattr(logging_config, 'file'):
                log_file = logging_config.file
                if log_file:
                    Path(log_file).parent.mkdir(parents=True, exist_ok=True)

        return values
