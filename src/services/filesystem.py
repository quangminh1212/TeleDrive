#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Windows File System Manager
Handles local file system operations for TeleDrive file manager
"""

import os
import shutil
import mimetypes
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Union
import stat

# Optional imports with fallbacks
try:
    import win32api
    import win32con
    import win32security
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

class FileSystemManager:
    """Manages Windows file system operations with security and error handling"""

    def __init__(self, base_path: str = None):
        """Initialize with optional base path restriction"""
        self.base_path = Path(base_path) if base_path else None
        self._cache = {}
        self._cache_timeout = 30  # seconds
        self.allowed_extensions = {
            'image': {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'},
            'document': {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'},
            'video': {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'},
            'audio': {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'},
            'archive': {'.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'},
            'code': {'.py', '.js', '.html', '.css', '.json', '.xml', '.sql', '.php', '.java', '.cpp', '.c', '.h'}
        }
    
    def _validate_path(self, path: Union[str, Path]) -> Path:
        """Validate and normalize path to prevent directory traversal attacks"""
        try:
            path = Path(path).resolve()
            
            # Check if path is within base_path if set
            if self.base_path and not str(path).startswith(str(self.base_path.resolve())):
                raise PermissionError(f"Access denied: Path outside allowed directory")
            
            return path
        except Exception as e:
            raise ValueError(f"Invalid path: {str(e)}")
    
    def _get_file_type(self, file_path: Path) -> str:
        """Determine file type based on extension"""
        ext = file_path.suffix.lower()
        
        for file_type, extensions in self.allowed_extensions.items():
            if ext in extensions:
                return file_type
        
        return 'unknown'
    
    def _get_file_icon(self, file_type: str, is_directory: bool = False) -> str:
        """Get appropriate icon class for file type"""
        if is_directory:
            return 'fas fa-folder'
        
        icons = {
            'image': 'fas fa-image',
            'document': 'fas fa-file-alt',
            'video': 'fas fa-video',
            'audio': 'fas fa-music',
            'archive': 'fas fa-file-archive',
            'code': 'fas fa-code',
            'unknown': 'fas fa-file'
        }
        return icons.get(file_type, icons['unknown'])

    def _clear_cache(self, path: str = None):
        """Clear cache for specific path or all cache"""
        if path:
            # Clear cache for specific path and its parent
            path_obj = Path(path)
            keys_to_remove = []
            for key in self._cache.keys():
                if key.startswith(str(path_obj)) or key.startswith(str(path_obj.parent)):
                    keys_to_remove.append(key)
            for key in keys_to_remove:
                del self._cache[key]
        else:
            # Clear all cache
            self._cache.clear()
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"
    
    def _get_file_permissions(self, file_path: Path) -> Dict[str, bool]:
        """Get file permissions for current user"""
        try:
            permissions = {
                'read': os.access(file_path, os.R_OK),
                'write': os.access(file_path, os.W_OK),
                'execute': os.access(file_path, os.X_OK)
            }
            return permissions
        except Exception:
            return {'read': False, 'write': False, 'execute': False}
    
    def browse_directory(self, directory_path: str, page: int = 1, per_page: int = 50,
                        sort_by: str = 'name', sort_order: str = 'asc',
                        use_cache: bool = True) -> Dict:
        """Browse directory contents with pagination and sorting"""
        try:
            dir_path = self._validate_path(directory_path)

            # Check cache first
            cache_key = f"{str(dir_path)}_{sort_by}_{sort_order}"
            if use_cache and cache_key in self._cache:
                cached_data, timestamp = self._cache[cache_key]
                if (datetime.now() - timestamp).seconds < self._cache_timeout:
                    # Use cached data for pagination
                    items = cached_data
                    total_items = len(items)
                    start_idx = (page - 1) * per_page
                    end_idx = start_idx + per_page
                    paginated_items = items[start_idx:end_idx]

                    return {
                        'success': True,
                        'current_path': str(dir_path),
                        'parent_path': str(dir_path.parent) if dir_path.parent != dir_path else None,
                        'items': paginated_items,
                        'pagination': {
                            'page': page,
                            'per_page': per_page,
                            'total_items': total_items,
                            'total_pages': (total_items + per_page - 1) // per_page,
                            'has_next': end_idx < total_items,
                            'has_prev': page > 1
                        },
                        'stats': {
                            'total_items': total_items,
                            'directories': sum(1 for item in items if item['is_directory']),
                            'files': sum(1 for item in items if not item['is_directory']),
                            'total_size': sum(item['size'] for item in items if not item['is_directory'])
                        }
                    }
            
            if not dir_path.exists():
                raise FileNotFoundError(f"Directory not found: {directory_path}")
            
            if not dir_path.is_dir():
                raise NotADirectoryError(f"Path is not a directory: {directory_path}")
            
            # Get directory contents
            items = []
            try:
                for item in dir_path.iterdir():
                    try:
                        stat_info = item.stat()
                        is_dir = item.is_dir()
                        
                        file_info = {
                            'name': item.name,
                            'path': str(item),
                            'is_directory': is_dir,
                            'size': 0 if is_dir else stat_info.st_size,
                            'size_formatted': '—' if is_dir else self._format_file_size(stat_info.st_size),
                            'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                            'modified_formatted': datetime.fromtimestamp(stat_info.st_mtime).strftime('%d/%m/%Y %H:%M'),
                            'file_type': 'folder' if is_dir else self._get_file_type(item),
                            'icon': self._get_file_icon(self._get_file_type(item), is_dir),
                            'permissions': self._get_file_permissions(item),
                            'extension': '' if is_dir else item.suffix.lower()
                        }
                        
                        # Add MIME type for files
                        if not is_dir:
                            mime_type, _ = mimetypes.guess_type(str(item))
                            file_info['mime_type'] = mime_type or 'application/octet-stream'
                        
                        items.append(file_info)
                        
                    except (PermissionError, OSError) as e:
                        # Skip files we can't access
                        continue
                        
            except PermissionError:
                raise PermissionError(f"Access denied to directory: {directory_path}")
            
            # Sort items
            reverse = sort_order.lower() == 'desc'
            
            if sort_by == 'name':
                # Sort directories first, then by name
                items.sort(key=lambda x: (not x['is_directory'], x['name'].lower()), reverse=reverse)
            elif sort_by == 'size':
                items.sort(key=lambda x: (not x['is_directory'], x['size']), reverse=reverse)
            elif sort_by == 'modified':
                items.sort(key=lambda x: (not x['is_directory'], x['modified']), reverse=reverse)
            elif sort_by == 'type':
                items.sort(key=lambda x: (not x['is_directory'], x['file_type'], x['name'].lower()), reverse=reverse)
            
            # Cache the sorted items
            if use_cache:
                self._cache[cache_key] = (items, datetime.now())

            # Pagination
            total_items = len(items)
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            paginated_items = items[start_idx:end_idx]

            # Get parent directory info
            parent_path = None
            if dir_path.parent != dir_path:  # Not root
                parent_path = str(dir_path.parent)

            return {
                'success': True,
                'current_path': str(dir_path),
                'parent_path': parent_path,
                'items': paginated_items,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total_items': total_items,
                    'total_pages': (total_items + per_page - 1) // per_page,
                    'has_next': end_idx < total_items,
                    'has_prev': page > 1
                },
                'stats': {
                    'total_items': total_items,
                    'directories': sum(1 for item in items if item['is_directory']),
                    'files': sum(1 for item in items if not item['is_directory']),
                    'total_size': sum(item['size'] for item in items if not item['is_directory'])
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }
    
    def create_folder(self, parent_path: str, folder_name: str) -> Dict:
        """Create a new folder"""
        try:
            parent_dir = self._validate_path(parent_path)
            
            if not parent_dir.exists() or not parent_dir.is_dir():
                raise NotADirectoryError(f"Parent directory not found: {parent_path}")
            
            # Validate folder name
            if not folder_name or folder_name.strip() == '':
                raise ValueError("Folder name cannot be empty")
            
            # Check for invalid characters
            invalid_chars = '<>:"/\\|?*'
            if any(char in folder_name for char in invalid_chars):
                raise ValueError(f"Folder name contains invalid characters: {invalid_chars}")
            
            new_folder_path = parent_dir / folder_name.strip()
            
            if new_folder_path.exists():
                raise FileExistsError(f"Folder already exists: {folder_name}")
            
            new_folder_path.mkdir()

            # Clear cache for parent directory
            self._clear_cache(str(parent_dir))

            return {
                'success': True,
                'message': f"Folder '{folder_name}' created successfully",
                'path': str(new_folder_path)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }
    
    def create_file(self, parent_path: str, file_name: str, content: str = '') -> Dict:
        """Create a new file"""
        try:
            parent_dir = self._validate_path(parent_path)
            
            if not parent_dir.exists() or not parent_dir.is_dir():
                raise NotADirectoryError(f"Parent directory not found: {parent_path}")
            
            # Validate file name
            if not file_name or file_name.strip() == '':
                raise ValueError("File name cannot be empty")
            
            # Check for invalid characters
            invalid_chars = '<>:"/\\|?*'
            if any(char in file_name for char in invalid_chars):
                raise ValueError(f"File name contains invalid characters: {invalid_chars}")
            
            new_file_path = parent_dir / file_name.strip()
            
            if new_file_path.exists():
                raise FileExistsError(f"File already exists: {file_name}")
            
            # Create file with content
            with open(new_file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return {
                'success': True,
                'message': f"File '{file_name}' created successfully",
                'path': str(new_file_path)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }

    def rename_item(self, item_path: str, new_name: str) -> Dict:
        """Rename a file or folder"""
        try:
            item = self._validate_path(item_path)

            if not item.exists():
                raise FileNotFoundError(f"Item not found: {item_path}")

            # Validate new name
            if not new_name or new_name.strip() == '':
                raise ValueError("New name cannot be empty")

            # Check for invalid characters
            invalid_chars = '<>:"/\\|?*'
            if any(char in new_name for char in invalid_chars):
                raise ValueError(f"Name contains invalid characters: {invalid_chars}")

            new_path = item.parent / new_name.strip()

            if new_path.exists():
                raise FileExistsError(f"Item with name '{new_name}' already exists")

            item.rename(new_path)

            return {
                'success': True,
                'message': f"Item renamed to '{new_name}' successfully",
                'old_path': str(item),
                'new_path': str(new_path)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }

    def delete_item(self, item_path: str) -> Dict:
        """Delete a file or folder"""
        try:
            item = self._validate_path(item_path)

            if not item.exists():
                raise FileNotFoundError(f"Item not found: {item_path}")

            if item.is_dir():
                shutil.rmtree(item)
                message = f"Folder '{item.name}' deleted successfully"
            else:
                item.unlink()
                message = f"File '{item.name}' deleted successfully"

            return {
                'success': True,
                'message': message,
                'path': str(item)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }

    def copy_item(self, source_path: str, destination_path: str, new_name: str = None) -> Dict:
        """Copy a file or folder"""
        try:
            source = self._validate_path(source_path)
            dest_dir = self._validate_path(destination_path)

            if not source.exists():
                raise FileNotFoundError(f"Source not found: {source_path}")

            if not dest_dir.exists() or not dest_dir.is_dir():
                raise NotADirectoryError(f"Destination directory not found: {destination_path}")

            # Determine destination name
            dest_name = new_name.strip() if new_name else source.name
            dest_path = dest_dir / dest_name

            # Check if destination already exists
            if dest_path.exists():
                # Generate unique name
                counter = 1
                base_name = dest_path.stem
                extension = dest_path.suffix
                while dest_path.exists():
                    if extension:
                        dest_name = f"{base_name} ({counter}){extension}"
                    else:
                        dest_name = f"{base_name} ({counter})"
                    dest_path = dest_dir / dest_name
                    counter += 1

            if source.is_dir():
                shutil.copytree(source, dest_path)
                message = f"Folder '{source.name}' copied successfully"
            else:
                shutil.copy2(source, dest_path)
                message = f"File '{source.name}' copied successfully"

            return {
                'success': True,
                'message': message,
                'source_path': str(source),
                'destination_path': str(dest_path)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }

    def move_item(self, source_path: str, destination_path: str, new_name: str = None) -> Dict:
        """Move a file or folder"""
        try:
            source = self._validate_path(source_path)
            dest_dir = self._validate_path(destination_path)

            if not source.exists():
                raise FileNotFoundError(f"Source not found: {source_path}")

            if not dest_dir.exists() or not dest_dir.is_dir():
                raise NotADirectoryError(f"Destination directory not found: {destination_path}")

            # Determine destination name
            dest_name = new_name.strip() if new_name else source.name
            dest_path = dest_dir / dest_name

            if dest_path.exists():
                raise FileExistsError(f"Item with name '{dest_name}' already exists in destination")

            shutil.move(str(source), str(dest_path))

            return {
                'success': True,
                'message': f"Item '{source.name}' moved successfully",
                'source_path': str(source),
                'destination_path': str(dest_path)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }

    def search_files(self, directory_path: str, query: str, file_types: List[str] = None,
                    max_results: int = 100) -> Dict:
        """Search for files in directory and subdirectories"""
        try:
            dir_path = self._validate_path(directory_path)

            if not dir_path.exists() or not dir_path.is_dir():
                raise NotADirectoryError(f"Directory not found: {directory_path}")

            if not query or query.strip() == '':
                raise ValueError("Search query cannot be empty")

            query = query.strip().lower()
            results = []

            # Walk through directory tree
            for root, dirs, files in os.walk(dir_path):
                try:
                    root_path = Path(root)

                    # Search in directories
                    for dir_name in dirs:
                        if query in dir_name.lower():
                            dir_path_full = root_path / dir_name
                            try:
                                stat_info = dir_path_full.stat()
                                results.append({
                                    'name': dir_name,
                                    'path': str(dir_path_full),
                                    'is_directory': True,
                                    'size': 0,
                                    'size_formatted': '—',
                                    'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                                    'modified_formatted': datetime.fromtimestamp(stat_info.st_mtime).strftime('%d/%m/%Y %H:%M'),
                                    'file_type': 'folder',
                                    'icon': 'fas fa-folder',
                                    'parent_path': str(root_path)
                                })
                            except (PermissionError, OSError):
                                continue

                    # Search in files
                    for file_name in files:
                        if query in file_name.lower():
                            file_path_full = root_path / file_name
                            try:
                                stat_info = file_path_full.stat()
                                file_type = self._get_file_type(file_path_full)

                                # Filter by file type if specified
                                if file_types and file_type not in file_types:
                                    continue

                                results.append({
                                    'name': file_name,
                                    'path': str(file_path_full),
                                    'is_directory': False,
                                    'size': stat_info.st_size,
                                    'size_formatted': self._format_file_size(stat_info.st_size),
                                    'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                                    'modified_formatted': datetime.fromtimestamp(stat_info.st_mtime).strftime('%d/%m/%Y %H:%M'),
                                    'file_type': file_type,
                                    'icon': self._get_file_icon(file_type),
                                    'parent_path': str(root_path),
                                    'extension': file_path_full.suffix.lower()
                                })

                                if len(results) >= max_results:
                                    break

                            except (PermissionError, OSError):
                                continue

                    if len(results) >= max_results:
                        break

                except (PermissionError, OSError):
                    continue

            return {
                'success': True,
                'query': query,
                'results': results[:max_results],
                'total_found': len(results),
                'search_path': str(dir_path)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }

    def get_file_preview(self, file_path: str) -> Dict:
        """Get file preview information and thumbnail if applicable"""
        try:
            file = self._validate_path(file_path)

            if not file.exists() or file.is_dir():
                raise FileNotFoundError(f"File not found: {file_path}")

            file_type = self._get_file_type(file)
            stat_info = file.stat()

            preview_info = {
                'name': file.name,
                'path': str(file),
                'file_type': file_type,
                'size': stat_info.st_size,
                'size_formatted': self._format_file_size(stat_info.st_size),
                'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                'modified_formatted': datetime.fromtimestamp(stat_info.st_mtime).strftime('%d/%m/%Y %H:%M'),
                'extension': file.suffix.lower(),
                'mime_type': mimetypes.guess_type(str(file))[0] or 'application/octet-stream',
                'can_preview': False,
                'preview_data': None
            }

            # Handle different file types for preview
            if file_type == 'image' and HAS_PIL:
                try:
                    with Image.open(file) as img:
                        preview_info.update({
                            'can_preview': True,
                            'dimensions': {'width': img.width, 'height': img.height},
                            'format': img.format,
                            'mode': img.mode
                        })
                except Exception:
                    pass

            elif file_type == 'document' and file.suffix.lower() == '.txt':
                try:
                    # Read first 1000 characters for text preview
                    with open(file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read(1000)
                        preview_info.update({
                            'can_preview': True,
                            'preview_data': content,
                            'is_text': True
                        })
                except Exception:
                    pass

            return {
                'success': True,
                'preview': preview_info
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }

    def get_drives(self) -> Dict:
        """Get list of available drives on Windows"""
        try:
            drives = []

            # Get all drive letters
            for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                drive_path = f"{letter}:\\"
                if os.path.exists(drive_path):
                    try:
                        # Get drive info
                        total, used, free = shutil.disk_usage(drive_path)

                        # Try to get drive label
                        try:
                            if HAS_WIN32:
                                label = win32api.GetVolumeInformation(drive_path)[0]
                            else:
                                label = f"Local Disk ({letter}:)"
                        except:
                            label = f"Local Disk ({letter}:)"

                        drives.append({
                            'letter': letter,
                            'path': drive_path,
                            'label': label or f"Local Disk ({letter}:)",
                            'total_space': total,
                            'used_space': used,
                            'free_space': free,
                            'total_formatted': self._format_file_size(total),
                            'used_formatted': self._format_file_size(used),
                            'free_formatted': self._format_file_size(free),
                            'usage_percent': round((used / total) * 100, 1) if total > 0 else 0
                        })
                    except (PermissionError, OSError):
                        continue

            return {
                'success': True,
                'drives': drives
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }
