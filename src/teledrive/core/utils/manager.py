#!/usr/bin/env python3
"""
File and directory management utilities for TeleDrive.

Provides utilities for file operations, path management, and metadata handling.
"""

import os
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

# Import logging
from src.teledrive.core.utils.logger import get_logger

# Create logger
logger = get_logger("file_manager")


class FileManager:
    """File and directory management utility class."""
    
    def __init__(self, base_dir: str = "."):
        """
        Initialize file manager.
        
        Args:
            base_dir: Base directory for file operations
        """
        self.base_dir = Path(base_dir)
        
        # Create base directory if it doesn't exist
        os.makedirs(self.base_dir, exist_ok=True)
    
    def list_directory(
        self,
        directory: str = ".",
        pattern: str = "*",
        recursive: bool = False,
        include_hidden: bool = False
    ) -> List[Dict]:
        """
        List files and directories in a directory.
        
        Args:
            directory: Directory to list
            pattern: File pattern to match
            recursive: Whether to include subdirectories recursively
            include_hidden: Whether to include hidden files
            
        Returns:
            List of file information dictionaries
        """
        directory_path = self.base_dir / directory
        if not directory_path.exists():
            logger.error(f"Directory not found: {directory_path}")
            return []
        
        # Normalize path
        directory_path = directory_path.resolve()
        
        # Ensure path is within base directory
        if not str(directory_path).startswith(str(self.base_dir.resolve())):
            logger.error(f"Path outside base directory: {directory_path}")
            return []
        
        # Collect file information
        file_list = []
        
        # Function to process a single file or directory
        def process_item(item_path):
            # Skip hidden files if not included
            if not include_hidden and item_path.name.startswith("."):
                return
            
            # Get file information
            try:
                stat = item_path.stat()
                is_dir = item_path.is_dir()
                
                # Calculate relative path
                rel_path = str(item_path.relative_to(self.base_dir))
                
                # Format file information
                file_info = {
                    "name": item_path.name,
                    "path": rel_path,
                    "is_directory": is_dir,
                    "size": stat.st_size if not is_dir else 0,
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "extension": item_path.suffix.lower() if not is_dir else "",
                }
                
                file_list.append(file_info)
            except Exception as e:
                logger.error(f"Error getting file info for {item_path}: {e}")
        
        # Process directory
        if recursive:
            # Recursive directory traversal
            for root, dirs, files in os.walk(directory_path):
                root_path = Path(root)
                
                # Process directories
                for dir_name in dirs:
                    process_item(root_path / dir_name)
                
                # Process files
                for file_name in files:
                    if Path(file_name).match(pattern):
                        process_item(root_path / file_name)
        else:
            # Non-recursive directory listing
            for item in directory_path.glob(pattern):
                process_item(item)
        
        return file_list
    
    def create_directory(self, directory: str) -> bool:
        """
        Create a directory.
        
        Args:
            directory: Directory to create
            
        Returns:
            True if directory was created or already exists
        """
        try:
            directory_path = self.base_dir / directory
            os.makedirs(directory_path, exist_ok=True)
            logger.info(f"Created directory: {directory}")
            return True
        except Exception as e:
            logger.error(f"Error creating directory {directory}: {e}")
            return False
    
    def delete_item(self, path: str, recursive: bool = False) -> bool:
        """
        Delete a file or directory.
        
        Args:
            path: Path to delete
            recursive: Whether to delete directory contents recursively
            
        Returns:
            True if deletion was successful
        """
        try:
            item_path = self.base_dir / path
            
            # Normalize path
            item_path = item_path.resolve()
            
            # Ensure path is within base directory
            if not str(item_path).startswith(str(self.base_dir.resolve())):
                logger.error(f"Path outside base directory: {item_path}")
                return False
            
            # Delete file or directory
            if item_path.is_file():
                os.remove(item_path)
                logger.info(f"Deleted file: {path}")
            elif item_path.is_dir():
                if recursive:
                    shutil.rmtree(item_path)
                    logger.info(f"Deleted directory recursively: {path}")
                else:
                    os.rmdir(item_path)
                    logger.info(f"Deleted directory: {path}")
            else:
                logger.error(f"Path not found: {path}")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error deleting {path}: {e}")
            return False
    
    def rename_item(self, old_path: str, new_path: str) -> bool:
        """
        Rename a file or directory.
        
        Args:
            old_path: Current path
            new_path: New path
            
        Returns:
            True if rename was successful
        """
        try:
            old_item_path = self.base_dir / old_path
            new_item_path = self.base_dir / new_path
            
            # Normalize paths
            old_item_path = old_item_path.resolve()
            new_item_path = new_item_path.resolve()
            
            # Ensure paths are within base directory
            base_resolved = str(self.base_dir.resolve())
            if not str(old_item_path).startswith(base_resolved) or not str(new_item_path).startswith(base_resolved):
                logger.error(f"Path outside base directory: {old_item_path} or {new_item_path}")
                return False
            
            # Check if old path exists
            if not old_item_path.exists():
                logger.error(f"Path not found: {old_path}")
                return False
            
            # Check if new path exists
            if new_item_path.exists():
                logger.error(f"Path already exists: {new_path}")
                return False
            
            # Rename file or directory
            os.rename(old_item_path, new_item_path)
            logger.info(f"Renamed {old_path} to {new_path}")
            
            return True
        except Exception as e:
            logger.error(f"Error renaming {old_path} to {new_path}: {e}")
            return False
    
    def copy_item(self, source_path: str, destination_path: str) -> bool:
        """
        Copy a file or directory.
        
        Args:
            source_path: Source path
            destination_path: Destination path
            
        Returns:
            True if copy was successful
        """
        try:
            source_item_path = self.base_dir / source_path
            destination_item_path = self.base_dir / destination_path
            
            # Normalize paths
            source_item_path = source_item_path.resolve()
            destination_item_path = destination_item_path.resolve()
            
            # Ensure paths are within base directory
            base_resolved = str(self.base_dir.resolve())
            if not str(source_item_path).startswith(base_resolved) or not str(destination_item_path).startswith(base_resolved):
                logger.error(f"Path outside base directory: {source_item_path} or {destination_item_path}")
                return False
            
            # Check if source path exists
            if not source_item_path.exists():
                logger.error(f"Path not found: {source_path}")
                return False
            
            # Check if destination path exists
            if destination_item_path.exists():
                logger.error(f"Path already exists: {destination_path}")
                return False
            
            # Copy file or directory
            if source_item_path.is_file():
                shutil.copy2(source_item_path, destination_item_path)
                logger.info(f"Copied file: {source_path} to {destination_path}")
            elif source_item_path.is_dir():
                shutil.copytree(source_item_path, destination_item_path)
                logger.info(f"Copied directory: {source_path} to {destination_path}")
            
            return True
        except Exception as e:
            logger.error(f"Error copying {source_path} to {destination_path}: {e}")
            return False
    
    def move_item(self, source_path: str, destination_path: str) -> bool:
        """
        Move a file or directory.
        
        Args:
            source_path: Source path
            destination_path: Destination path
            
        Returns:
            True if move was successful
        """
        try:
            source_item_path = self.base_dir / source_path
            destination_item_path = self.base_dir / destination_path
            
            # Normalize paths
            source_item_path = source_item_path.resolve()
            destination_item_path = destination_item_path.resolve()
            
            # Ensure paths are within base directory
            base_resolved = str(self.base_dir.resolve())
            if not str(source_item_path).startswith(base_resolved) or not str(destination_item_path).startswith(base_resolved):
                logger.error(f"Path outside base directory: {source_item_path} or {destination_item_path}")
                return False
            
            # Check if source path exists
            if not source_item_path.exists():
                logger.error(f"Path not found: {source_path}")
                return False
            
            # Check if destination path exists
            if destination_item_path.exists():
                logger.error(f"Path already exists: {destination_path}")
                return False
            
            # Move file or directory
            shutil.move(source_item_path, destination_item_path)
            logger.info(f"Moved {source_path} to {destination_path}")
            
            return True
        except Exception as e:
            logger.error(f"Error moving {source_path} to {destination_path}: {e}")
            return False
    
    def get_file_info(self, path: str) -> Optional[Dict]:
        """
        Get file or directory information.
        
        Args:
            path: Path to file or directory
            
        Returns:
            File information dictionary
        """
        try:
            item_path = self.base_dir / path
            
            # Normalize path
            item_path = item_path.resolve()
            
            # Ensure path is within base directory
            if not str(item_path).startswith(str(self.base_dir.resolve())):
                logger.error(f"Path outside base directory: {item_path}")
                return None
            
            # Check if path exists
            if not item_path.exists():
                logger.error(f"Path not found: {path}")
                return None
            
            # Get file information
            stat = item_path.stat()
            is_dir = item_path.is_dir()
            
            # Calculate relative path
            rel_path = str(item_path.relative_to(self.base_dir))
            
            # Format file information
            file_info = {
                "name": item_path.name,
                "path": rel_path,
                "is_directory": is_dir,
                "size": stat.st_size if not is_dir else 0,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "extension": item_path.suffix.lower() if not is_dir else "",
            }
            
            return file_info
        except Exception as e:
            logger.error(f"Error getting file info for {path}: {e}")
            return None
    
    def save_file(self, directory: str, filename: str, content: bytes) -> bool:
        """
        Save binary data to a file.
        
        Args:
            directory: Directory to save to
            filename: Filename to save as
            content: Binary content to save
            
        Returns:
            True if file was saved successfully
        """
        try:
            # Create directory if it doesn't exist
            self.create_directory(directory)
            
            # Save file
            file_path = self.base_dir / directory / filename
            with open(file_path, "wb") as f:
                f.write(content)
            
            logger.info(f"Saved file: {directory}/{filename}")
            return True
        except Exception as e:
            logger.error(f"Error saving file {directory}/{filename}: {e}")
            return False
    
    def read_file(self, path: str) -> Optional[bytes]:
        """
        Read binary data from a file.
        
        Args:
            path: Path to file
            
        Returns:
            File contents as bytes
        """
        try:
            file_path = self.base_dir / path
            
            # Normalize path
            file_path = file_path.resolve()
            
            # Ensure path is within base directory
            if not str(file_path).startswith(str(self.base_dir.resolve())):
                logger.error(f"Path outside base directory: {file_path}")
                return None
            
            # Check if path exists and is a file
            if not file_path.is_file():
                logger.error(f"File not found: {path}")
                return None
            
            # Read file
            with open(file_path, "rb") as f:
                content = f.read()
            
            logger.info(f"Read file: {path}")
            return content
        except Exception as e:
            logger.error(f"Error reading file {path}: {e}")
            return None
    
    def search_files(
        self,
        directory: str = ".",
        pattern: str = "*",
        recursive: bool = True,
        include_hidden: bool = False,
        max_results: int = 100
    ) -> List[Dict]:
        """
        Search for files matching a pattern.
        
        Args:
            directory: Directory to search in
            pattern: File pattern to match
            recursive: Whether to search subdirectories recursively
            include_hidden: Whether to include hidden files
            max_results: Maximum number of results to return
            
        Returns:
            List of file information dictionaries
        """
        return self.list_directory(
            directory=directory,
            pattern=pattern,
            recursive=recursive,
            include_hidden=include_hidden
        )[:max_results]
    
    def get_directory_size(self, directory: str = ".") -> int:
        """
        Get total size of a directory in bytes.
        
        Args:
            directory: Directory to calculate size for
            
        Returns:
            Directory size in bytes
        """
        try:
            directory_path = self.base_dir / directory
            
            # Normalize path
            directory_path = directory_path.resolve()
            
            # Ensure path is within base directory
            if not str(directory_path).startswith(str(self.base_dir.resolve())):
                logger.error(f"Path outside base directory: {directory_path}")
                return 0
            
            # Check if path exists and is a directory
            if not directory_path.is_dir():
                logger.error(f"Directory not found: {directory}")
                return 0
            
            # Calculate directory size
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(directory_path):
                for filename in filenames:
                    file_path = os.path.join(dirpath, filename)
                    try:
                        total_size += os.path.getsize(file_path)
                    except Exception:
                        pass
            
            return total_size
        except Exception as e:
            logger.error(f"Error calculating directory size for {directory}: {e}")
            return 0


# Default file manager instance
file_manager = FileManager()


def get_file_manager(base_dir: str = ".") -> FileManager:
    """Get a file manager instance with the specified base directory."""
    return FileManager(base_dir) 