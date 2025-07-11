"""
Simple logging for TeleDrive
"""

import logging
import os
import sys
from datetime import datetime


class Logger:
    """Simple logging for TeleDrive"""
    
    def __init__(self, log_level=logging.DEBUG):
        self.log_level = log_level
        self.log_dir = 'logs'
        self.log_filename = f'app_{datetime.now().strftime("%Y%m%d")}.log'
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
        logger.info("="*60)
        logger.info("🚀 TeleDrive Started")
        logger.info(f"📁 Log: {self.log_filepath}")
        logger.info("="*60)
        
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
            
            logger.info("💻 System Info:")
            logger.info(f"   OS: {platform.system()} {platform.release()}")
            logger.info(f"   Python: {platform.python_version()}")
            
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
        
        dependencies = ['telethon', 'PIL']
        
        logger.info("📦 Dependencies:")
        
        for dep in dependencies:
            try:
                if dep == 'PIL':
                    import PIL
                    version = PIL.__version__
                elif dep == 'telethon':
                    import telethon
                    version = telethon.__version__
                else:
                    __import__(dep)
                    version = "OK"
                
                logger.info(f"   ✅ {dep}: {version}")
                
            except ImportError as e:
                logger.error(f"   ❌ {dep}: Missing - {str(e)}")
            except Exception as e:
                logger.warning(f"   ⚠️ {dep}: Error - {str(e)}")


# Global logger instance
app_logger = Logger()

def get_logger(name='TeleDrive'):
    """Get a logger instance"""
    return app_logger.get_logger(name)

def log_startup_info():
    """Log startup information"""
    app_logger.log_system_info()
    app_logger.log_dependencies()
