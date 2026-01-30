"""
Patched TDesktop for new tdata structure support

This module patches opentele's TDesktop class to support the new Telegram Desktop
tdata structure which uses 'key_datas' instead of 'key_data' for multi-account.
"""

import os
import sys
from pathlib import Path

# Ensure opentele is available
try:
    from opentele.td import TDesktop as OriginalTDesktop
    from opentele.td.configs import *
    from opentele.td import shared as td
    from opentele.exception import *
    OPENTELE_AVAILABLE = True
except ImportError:
    OPENTELE_AVAILABLE = False


def patch_keyfile_for_new_tdata(basePath: str, keyFile: str = "data") -> str:
    """
    Check if tdata uses new structure (key_datas) and return correct keyFile.
    
    Telegram Desktop after version 4.x uses 'key_datas' for multi-account
    instead of 'key_data' for single account.
    """
    # Check for new multi-account structure first
    key_datas_path = os.path.join(basePath, f"key_{keyFile}s")
    if os.path.exists(key_datas_path):
        # New structure - use 'datas' suffix
        return keyFile + "s"
    
    # Fallback to original keyFile
    key_data_path = os.path.join(basePath, f"key_{keyFile}")
    if os.path.exists(key_data_path):
        return keyFile
    
    # Neither exists, return original
    return keyFile


class PatchedTDesktop(OriginalTDesktop if OPENTELE_AVAILABLE else object):
    """
    Patched TDesktop that supports new Telegram Desktop tdata structure.
    
    Changes:
    - Automatically detects 'key_datas' vs 'key_data' 
    - Handles multi-account structure in newer Telegram Desktop versions
    """
    
    def __init__(
        self,
        basePath: str = None,
        api = None,
        passcode: str = None,
        keyFile: str = None,
    ):
        if not OPENTELE_AVAILABLE:
            raise ImportError("opentele is not available")
        
        # Auto-detect keyFile for new tdata structure
        if basePath and keyFile is None:
            abs_base_path = td.Storage.GetAbsolutePath(basePath)
            
            # Check for new structure
            detected_keyfile = patch_keyfile_for_new_tdata(abs_base_path)
            if detected_keyfile != "data":
                print(f"[PATCH] Detected new tdata structure, using keyFile='{detected_keyfile}'")
                keyFile = detected_keyfile
        
        # Import API default
        if api is None:
            from opentele.api import API
            api = API.TelegramDesktop
        
        # Call original __init__
        super().__init__(basePath=basePath, api=api, passcode=passcode, keyFile=keyFile)


def create_patched_tdesktop(basePath: str, passcode: str = None):
    """
    Factory function to create a patched TDesktop instance.
    
    This handles the new tdata structure automatically.
    """
    if not OPENTELE_AVAILABLE:
        raise ImportError("opentele is not available. Install with: pip install opentele")
    
    # Get absolute path
    abs_path = td.Storage.GetAbsolutePath(basePath)
    
    # Detect keyFile
    keyFile = patch_keyfile_for_new_tdata(abs_path)
    
    print(f"[PATCH] Loading tdata from: {abs_path}")
    print(f"[PATCH] Using keyFile: key_{keyFile}")
    
    # Create TDesktop with patched keyFile
    try:
        tdesk = OriginalTDesktop(
            basePath=abs_path,
            passcode=passcode,
            keyFile=keyFile
        )
        return tdesk
    except Exception as e:
        print(f"[PATCH] Error creating TDesktop: {e}")
        raise


# Test function
def test_patch():
    """Test the patch with current Telegram Desktop tdata"""
    import os
    
    if sys.platform == 'win32':
        appdata = os.getenv('APPDATA')
        if appdata:
            tdata_path = os.path.join(appdata, 'Telegram Desktop', 'tdata')
            
            if os.path.exists(tdata_path):
                print(f"Found tdata at: {tdata_path}")
                
                # Check structure
                keyFile = patch_keyfile_for_new_tdata(tdata_path)
                print(f"Detected keyFile: key_{keyFile}")
                
                # List relevant files
                for item in os.listdir(tdata_path):
                    if item.startswith('key_'):
                        print(f"  - {item}")
                
                return True
    
    print("Telegram Desktop tdata not found")
    return False


if __name__ == "__main__":
    test_patch()
