#!/usr/bin/env python3
"""
TeleDrive Launcher
Simple Python launcher for TeleDrive
"""

import os
import sys
import subprocess
from config_manager import ConfigManager

def print_header():
    print()
    print("=" * 50)
    print("        TELEDRIVE v2.0 - FILE SCANNER")
    print("=" * 50)
    print()

def check_dependencies():
    """Check if all dependencies are available"""
    try:
        import telethon
        import pandas
        import tqdm
        import aiofiles
        print("[OK] All dependencies available")
        return True
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("[INFO] Please run: pip install -r requirements.txt")
        return False

def ensure_directories():
    """Create necessary directories"""
    dirs = ['output', 'logs', 'downloads', 'data']
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    print("[OK] Directories created")

def check_config():
    """Check configuration"""
    try:
        cm = ConfigManager()
        if not os.path.exists('config.json'):
            print("[INFO] Creating default config.json...")
            cm.save_config()
        
        # Basic validation
        tg = cm.get_config('telegram')
        if not tg.get('api_id') or not tg.get('api_hash') or not tg.get('phone_number'):
            print("[WARNING] Telegram API not configured")
            return False
        
        channels = cm.get_enabled_channels()
        if not channels:
            print("[WARNING] No channels enabled")
            return False
        
        print(f"[OK] Configuration valid - {len(channels)} channels enabled")
        return True
    except Exception as e:
        print(f"[ERROR] Configuration error: {e}")
        return False

def show_menu():
    """Show main menu"""
    print()
    print("=" * 50)
    print("             SELECT ACTION")
    print("=" * 50)
    print("1. Scan channels/groups")
    print("2. Configure settings")
    print("3. View statistics")
    print("4. Test configuration")
    print("0. Exit")
    print()

def run_scanner():
    """Run the main scanner"""
    print()
    print("[INFO] Starting scanner...")
    try:
        subprocess.run([sys.executable, 'main.py'], check=True)
        print("[OK] Scanner completed successfully")
    except subprocess.CalledProcessError:
        print("[ERROR] Scanner failed")
    except KeyboardInterrupt:
        print("[INFO] Scanner interrupted by user")

def run_config():
    """Run configuration setup"""
    print()
    print("[INFO] Opening configuration...")
    try:
        subprocess.run([sys.executable, 'config_setup.py'], check=True)
    except subprocess.CalledProcessError:
        print("[ERROR] Configuration setup failed")
    except KeyboardInterrupt:
        print("[INFO] Configuration interrupted by user")

def show_stats():
    """Show system statistics"""
    print()
    print("[INFO] System statistics...")
    try:
        cm = ConfigManager()
        
        # Directory status
        print("Directories:")
        dirs = ['output', 'logs', 'downloads', 'data']
        for d in dirs:
            status = "OK" if os.path.exists(d) else "MISSING"
            print(f"  {d}: {status}")
        
        # Channel status
        channels = cm.get_config('channels').get('list', [])
        enabled = [c for c in channels if c.get('enabled')]
        print(f"Channels: {len(channels)} total, {len(enabled)} enabled")
        
        # Telegram config
        tg = cm.get_config('telegram')
        print(f"Telegram: {tg.get('phone_number', 'Not configured')}")
        
        # Output config
        output = cm.get_config('output')
        print(f"Output directory: {output.get('directory', 'output')}")
        
    except Exception as e:
        print(f"[ERROR] Cannot get statistics: {e}")

def test_config():
    """Test configuration"""
    print()
    print("[INFO] Testing configuration...")
    try:
        cm = ConfigManager()
        result = cm.validate_configuration()
        if result:
            print("[OK] Configuration is valid")
        else:
            print("[ERROR] Configuration has issues")
    except Exception as e:
        print(f"[ERROR] Configuration test failed: {e}")

def main():
    """Main launcher function"""
    print_header()
    
    # Check dependencies
    if not check_dependencies():
        input("Press Enter to exit...")
        return
    
    # Ensure directories
    ensure_directories()
    
    # Check basic config
    config_ok = check_config()
    if not config_ok:
        print("[INFO] Please configure the application first")
    
    # Main loop
    while True:
        show_menu()
        try:
            choice = input("Choose (0-4): ").strip()
            
            if choice == '0':
                print("Goodbye!")
                break
            elif choice == '1':
                if config_ok:
                    run_scanner()
                else:
                    print("[ERROR] Please configure the application first (option 2)")
            elif choice == '2':
                run_config()
                config_ok = check_config()  # Re-check after config
            elif choice == '3':
                show_stats()
            elif choice == '4':
                test_config()
            else:
                print("[ERROR] Invalid choice!")
            
            input("\nPress Enter to continue...")
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"[ERROR] Unexpected error: {e}")
            input("Press Enter to continue...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nGoodbye!")
    except Exception as e:
        print(f"[FATAL ERROR] {e}")
        input("Press Enter to exit...")
