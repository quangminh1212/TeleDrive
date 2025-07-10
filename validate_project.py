#!/usr/bin/env python3
"""
TeleDrive Project Validation Script
Comprehensive validation of the TeleDrive project implementation
"""

import os
import sys
from pathlib import Path

def validate_file_structure():
    """Validate project file structure"""
    print("📁 Validating file structure...")
    
    required_files = [
        'core.py',
        'desktop.py', 
        'cli.py',
        'requirements.txt',
        '.env',
        'README.md'
    ]
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
        else:
            print(f"   ✅ {file}")
    
    if missing_files:
        print(f"   ❌ Missing files: {missing_files}")
        return False
    
    return True

def validate_configuration():
    """Validate configuration"""
    print("⚙️  Validating configuration...")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        required_config = ['API_ID', 'API_HASH', 'PHONE_NUMBER', 'SESSION_NAME']
        missing_config = []
        
        for config in required_config:
            value = os.getenv(config)
            if value:
                if config in ['API_HASH']:
                    print(f"   ✅ {config}: {value[:10]}...")
                else:
                    print(f"   ✅ {config}: {value}")
            else:
                missing_config.append(config)
        
        if missing_config:
            print(f"   ❌ Missing configuration: {missing_config}")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ Configuration validation failed: {e}")
        return False

def validate_dependencies():
    """Validate dependencies"""
    print("📦 Validating dependencies...")
    
    try:
        # Read requirements
        with open('requirements.txt', 'r') as f:
            requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        
        print(f"   📋 Found {len(requirements)} requirements:")
        for req in requirements:
            print(f"      • {req}")
        
        # Try to import key modules
        try:
            import telethon
            print("   ✅ Telethon available")
        except ImportError:
            print("   ❌ Telethon not available")
            return False
        
        try:
            import customtkinter
            print("   ✅ CustomTkinter available")
        except ImportError:
            print("   ❌ CustomTkinter not available")
            return False
        
        try:
            from dotenv import load_dotenv
            print("   ✅ Python-dotenv available")
        except ImportError:
            print("   ❌ Python-dotenv not available")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Dependency validation failed: {e}")
        return False

def validate_modules():
    """Validate Python modules"""
    print("🐍 Validating Python modules...")
    
    modules = ['core', 'desktop', 'cli']
    
    for module_name in modules:
        try:
            __import__(module_name)
            print(f"   ✅ {module_name}.py imports successfully")
        except Exception as e:
            print(f"   ❌ {module_name}.py import failed: {e}")
            return False
    
    return True

def validate_core_functionality():
    """Validate core functionality structure"""
    print("🔧 Validating core functionality...")
    
    try:
        from core import get_teledrive_instance, TeleDriveCore
        
        # Check TeleDriveCore class
        required_methods = [
            'connect', 'disconnect', 'send_code', 'verify_code', 'verify_password',
            'list_files', 'search_files', 'download_file', 'upload_file', 'get_file_info'
        ]
        
        for method in required_methods:
            if hasattr(TeleDriveCore, method):
                print(f"   ✅ TeleDriveCore.{method}")
            else:
                print(f"   ❌ TeleDriveCore.{method} missing")
                return False
        
        # Test instance creation
        instance = get_teledrive_instance()
        print("   ✅ Core instance creation successful")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Core functionality validation failed: {e}")
        return False

def validate_desktop_app():
    """Validate desktop application structure"""
    print("🖥️  Validating desktop application...")
    
    try:
        import desktop
        
        # Check main classes
        required_classes = ['TeleDriveApp', 'LoginDialog']
        for cls_name in required_classes:
            if hasattr(desktop, cls_name):
                print(f"   ✅ {cls_name} class")
            else:
                print(f"   ❌ {cls_name} class missing")
                return False
        
        # Check main function
        if hasattr(desktop, 'main'):
            print("   ✅ main function")
        else:
            print("   ❌ main function missing")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Desktop app validation failed: {e}")
        return False

def validate_cli_app():
    """Validate CLI application structure"""
    print("💻 Validating CLI application...")
    
    try:
        import cli
        
        # Check TeleDrive class
        if hasattr(cli, 'TeleDrive'):
            print("   ✅ TeleDrive class")
        else:
            print("   ❌ TeleDrive class missing")
            return False
        
        # Check main function
        if hasattr(cli, 'main'):
            print("   ✅ main function")
        else:
            print("   ❌ main function missing")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ CLI app validation failed: {e}")
        return False

def main():
    """Run comprehensive project validation"""
    print("🚀 TeleDrive Project Validation")
    print("=" * 50)
    
    validations = [
        ("File Structure", validate_file_structure),
        ("Configuration", validate_configuration),
        ("Dependencies", validate_dependencies),
        ("Python Modules", validate_modules),
        ("Core Functionality", validate_core_functionality),
        ("Desktop Application", validate_desktop_app),
        ("CLI Application", validate_cli_app),
    ]
    
    passed = 0
    total = len(validations)
    
    for name, validator in validations:
        print(f"\n{name}:")
        try:
            if validator():
                passed += 1
                print(f"✅ {name} validation passed")
            else:
                print(f"❌ {name} validation failed")
        except Exception as e:
            print(f"❌ {name} validation error: {e}")
    
    print(f"\n{'='*50}")
    print(f"📊 Validation Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All validations passed! TeleDrive is ready to use.")
        print("\n📋 Next Steps:")
        print("   1. Run 'python desktop.py' for the desktop application")
        print("   2. Run 'python cli.py' for command-line usage")
        print("   3. The application will prompt for authentication on first use")
        return True
    else:
        print("❌ Some validations failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
