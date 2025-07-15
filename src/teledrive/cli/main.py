#!/usr/bin/env python3
"""
TeleDrive CLI - Command Line Interface
Private Channel Scanner with detailed logging
Specialized for scanning files in private Telegram channels/groups
"""

import asyncio
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from teledrive.core.scanner import TelegramFileScanner

# Import detailed logging
try:
    from teledrive.utils.logger import log_step, log_error, get_logger
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('main')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)

class PrivateChannelScanner(TelegramFileScanner):
    """Scanner specialized for private channels"""
    
    async def scan_private_channel_interactive(self):
        """Scan private channel with interactive interface"""
        print("\n🔧 Initializing Telegram connection...")
        await self.initialize()
        print("✅ Telegram connection ready")

        print("\n📋 Choose access method for private channel:")
        print("   1. I'm already a member (enter username or link)")
        print("   2. Join from invite link")

        choice = input("\n👉 Choice (1/2): ").strip()
        print(f"📝 You chose: {choice}")
        
        if choice == "2":
            print("\n🔗 Mode: Join from invite link")
            invite_link = input("👉 Enter invite link (https://t.me/joinchat/xxx or https://t.me/+xxx): ").strip()
            if not invite_link:
                print("❌ Invalid link!")
                return

            print(f"🔗 Processing link: {invite_link}")
            success = await self.join_private_channel(invite_link)
            if not success:
                print("❌ Cannot join channel")
                return

            print("🔍 Getting channel info after joining...")
            # After joining, get entity
            entity = await self.get_channel_entity(invite_link)

        else:
            print("\n👤 Mode: Already a member")
            channel_input = input("👉 Enter username or channel link: ").strip()
            if not channel_input:
                print("❌ Please enter channel information!")
                return

            print(f"🔍 Looking for channel: {channel_input}")
            entity = await self.get_channel_entity(channel_input)
        
        if not entity:
            print("❌ Cannot get channel information")
            return

        print("✅ Successfully got channel information")

        # Check detailed access permissions
        print("\n🔐 Checking access permissions...")
        await self.check_channel_permissions(entity)

        # Scan channel
        print("\n🔍 Starting channel scan...")
        await self.scan_channel_by_entity(entity)

        if self.files_data:
            print(f"\n💾 Saving results ({len(self.files_data)} files)...")
            await self.save_results()
            print(f"🎉 Complete! Found and saved {len(self.files_data)} files")
            print("📁 Results saved in 'output/' directory")
        else:
            print("\n⚠️ No files found in this channel")

async def main():
    """Main function for private channel scanner"""
    print("🔐 TELEDRIVE - PRIVATE CHANNEL SCANNER")
    print("=" * 50)

    if DETAILED_LOGGING_AVAILABLE:
        log_step("APP_START", "Starting Private Channel Scanner")

    print("🔧 Initializing scanner...")
    scanner = PrivateChannelScanner()

    try:
        print("✅ Scanner ready")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("START_SCAN", "Starting interactive scan process")

        await scanner.scan_private_channel_interactive()

        print("\n🎉 Scan process complete!")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("COMPLETE", "Scan process completed successfully")

    except KeyboardInterrupt:
        print("\n⏹️ Stopped by user")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("USER_STOP", "Application stopped by Ctrl+C", "WARNING")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        if DETAILED_LOGGING_AVAILABLE:
            log_error(e, "Main application error")

        if "PHONE_NUMBER not configured" in str(e):
            print("\n📋 PHONE NUMBER CONFIGURATION GUIDE:")
            print("   1. Open config/config.json file")
            print("   2. Replace '+84xxxxxxxxx' with your real phone number")
            print("   3. Example: +84987654321")
            print("   4. Must include country code (+84 for Vietnam)")
        else:
            print("\n📊 Error details:")
            import traceback
            traceback.print_exc()
    finally:
        print("\n🔧 Closing connection...")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("CLOSE_APP", "Closing connection and cleanup")
        await scanner.close()
        print("✅ Connection closed successfully")

def setup_logging():
    """Setup detailed logging system"""
    if DETAILED_LOGGING_AVAILABLE:
        try:
            from teledrive.config.settings import CONFIG
            from teledrive.utils.logger import setup_logging as setup_detailed_logging
            
            logging_config = CONFIG.get('logging', {})
            if logging_config.get('enabled', True):
                setup_detailed_logging(logging_config)
                log_step("INIT_SYSTEM", "Detailed logging system setup")
                print("✅ Detailed logging system ready")
            else:
                print("⚠️ Logging disabled in configuration")
        except Exception as e:
            print(f"⚠️ Cannot setup detailed logging: {e}")
            print("   (Application will run with basic logging)")
    else:
        print("⚠️ Detailed logging module not available")

def setup_event_loop():
    """Setup Windows event loop"""
    print("🔧 Configuring event loop...")
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("✅ Configured Windows ProactorEventLoopPolicy")

def load_configuration():
    """Load and validate configuration"""
    print("📋 Loading configuration...")
    try:
        from teledrive.config.settings import validate_config
        if validate_config():
            print("✅ Configuration loaded successfully")
            return True
        else:
            print("❌ Configuration validation failed")
            return False
    except Exception as e:
        print(f"❌ Configuration loading error: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Initializing system...")

    # Load configuration
    if not load_configuration():
        sys.exit(1)

    # Setup detailed logging if available
    print("📊 Setting up logging system...")
    setup_logging()

    # Setup Windows event loop
    setup_event_loop()

    print("🚀 Starting main application...")
    print("=" * 60)

    asyncio.run(main())
