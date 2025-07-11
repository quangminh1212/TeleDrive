"""
TeleDrive Logging Configuration
Provides centralized logging setup for the TeleDrive application
"""

import logging
import os
import sys
from datetime import datetime


class TeleDriveLogger:
    """Centralized logging configuration for TeleDrive"""
    
    def __init__(self, log_level=logging.DEBUG):
        self.log_level = log_level
        self.log_dir = 'logs'
        self.log_filename = f'teledrive_{datetime.now().strftime("%Y%m%d")}.log'
        self.log_filepath = os.path.join(self.log_dir, self.log_filename)
        
        # Create logs directory if it doesn't exist
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)
            
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging configuration"""
        # Define log format
        log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        
        # Configure root logger
        logging.basicConfig(
            level=self.log_level,
            format=log_format,
            handlers=[
                logging.FileHandler(self.log_filepath, encoding='utf-8'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        # Create main logger
        logger = logging.getLogger('TeleDrive')
        
        # Log session start
        logger.info("="*80)
        logger.info("🚀 TeleDrive Application Session Started")
        logger.info(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"📁 Log file: {self.log_filepath}")
        logger.info(f"📊 Log level: {logging.getLevelName(self.log_level)}")
        logger.info("="*80)
        
        return logger
    
    def get_logger(self, name):
        """Get a logger with the specified name"""
        return logging.getLogger(name)
    
    def log_system_info(self):
        """Log system information"""
        logger = logging.getLogger('TeleDrive.System')
        
        try:
            import platform
            import tkinter as tk
            
            logger.info("💻 System Information:")
            logger.info(f"   OS: {platform.system()} {platform.release()}")
            logger.info(f"   Python: {platform.python_version()}")
            logger.info(f"   Architecture: {platform.architecture()[0]}")
            
            # Test tkinter
            try:
                root = tk.Tk()
                tk_version = root.tk.eval('info patchlevel')
                root.destroy()
                logger.info(f"   Tkinter: {tk_version}")
            except Exception as e:
                logger.warning(f"   Tkinter: Error - {str(e)}")
                
        except Exception as e:
            logger.error(f"❌ Failed to log system info: {str(e)}")
    
    def log_dependencies(self):
        """Log installed dependencies"""
        logger = logging.getLogger('TeleDrive.Dependencies')
        
        dependencies = [
            'telethon',
            'PIL',
            'asyncio',
            'threading'
        ]
        
        logger.info("📦 Checking dependencies:")
        
        for dep in dependencies:
            try:
                if dep == 'PIL':
                    import PIL
                    version = PIL.__version__
                elif dep == 'telethon':
                    import telethon
                    version = telethon.__version__
                elif dep == 'asyncio':
                    import asyncio
                    version = "Built-in"
                elif dep == 'threading':
                    import threading
                    version = "Built-in"
                else:
                    __import__(dep)
                    version = "Unknown"
                
                logger.info(f"   ✅ {dep}: {version}")
                
            except ImportError as e:
                logger.error(f"   ❌ {dep}: Not installed - {str(e)}")
            except Exception as e:
                logger.warning(f"   ⚠️ {dep}: Error checking - {str(e)}")


# Global logger instance
teledrive_logger = TeleDriveLogger()

def get_logger(name='TeleDrive'):
    """Get a logger instance"""
    return teledrive_logger.get_logger(name)

def log_startup_info():
    """Log startup information"""
    teledrive_logger.log_system_info()
    teledrive_logger.log_dependencies()
