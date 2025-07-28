#!/usr/bin/env python3
"""
Analytics Module for TeleDrive
Provides analytics data collection and reporting functionality
"""

import os
from datetime import datetime, timedelta
from collections import defaultdict
from sqlalchemy import func, desc
from models import db, File, User, Folder, ScanSession
from models_sharing import FileShare, ShareAccessLog, FilePermission

class TeleDriveAnalytics:
    """Analytics engine for TeleDrive"""
    
    def __init__(self):
        self.cache_timeout = 300  # 5 minutes cache
        self._cache = {}
    
    def get_dashboard_stats(self, user_id=None):
        """Get main dashboard statistics"""
        cache_key = f"dashboard_stats_{user_id}"
        
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if datetime.utcnow() - timestamp < timedelta(seconds=self.cache_timeout):
                return cached_data
        
        # Base query filters
        file_filter = {'is_deleted': False}
        if user_id:
            file_filter['user_id'] = user_id
        
        # Basic file statistics
        total_files = File.query.filter_by(**file_filter).count()
        total_size = db.session.query(func.sum(File.file_size)).filter_by(**file_filter).scalar() or 0
        
        # File type distribution
        file_types = db.session.query(
            File.mime_type,
            func.count(File.id).label('count'),
            func.sum(File.file_size).label('size')
        ).filter_by(**file_filter).group_by(File.mime_type).all()
        
        type_stats = {}
        for mime_type, count, size in file_types:
            category = self._get_file_category(mime_type)
            if category not in type_stats:
                type_stats[category] = {'count': 0, 'size': 0}
            type_stats[category]['count'] += count
            type_stats[category]['size'] += size or 0
        
        # Recent activity
        recent_files = File.query.filter_by(**file_filter).order_by(
            desc(File.created_at)
        ).limit(10).all()
        
        # Folder statistics
        folder_filter = {'is_deleted': False}
        if user_id:
            folder_filter['user_id'] = user_id
        
        total_folders = Folder.query.filter_by(**folder_filter).count()
        
        # Scan statistics
        scan_filter = {}
        if user_id:
            scan_filter['user_id'] = user_id
        
        total_scans = ScanSession.query.filter_by(**scan_filter).count()
        successful_scans = ScanSession.query.filter_by(status='completed', **scan_filter).count()
        
        stats = {
            'total_files': total_files,
            'total_size': total_size,
            'total_folders': total_folders,
            'total_scans': total_scans,
            'successful_scans': successful_scans,
            'file_types': type_stats,
            'recent_files': [f.to_dict() for f in recent_files],
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Cache the results
        self._cache[cache_key] = (stats, datetime.utcnow())
        return stats
    
    def get_usage_analytics(self, user_id=None, days=30):
        """Get usage analytics for the specified period"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # File creation over time
        file_filter = {'is_deleted': False}
        if user_id:
            file_filter['user_id'] = user_id
        
        daily_files = db.session.query(
            func.date(File.created_at).label('date'),
            func.count(File.id).label('count'),
            func.sum(File.file_size).label('size')
        ).filter(
            File.created_at >= start_date,
            File.created_at <= end_date
        ).filter_by(**file_filter).group_by(
            func.date(File.created_at)
        ).order_by('date').all()
        
        # Scan activity
        scan_filter = {}
        if user_id:
            scan_filter['user_id'] = user_id
        
        daily_scans = db.session.query(
            func.date(ScanSession.started_at).label('date'),
            func.count(ScanSession.id).label('count'),
            func.sum(ScanSession.files_found).label('files_found')
        ).filter(
            ScanSession.started_at >= start_date,
            ScanSession.started_at <= end_date
        ).filter_by(**scan_filter).group_by(
            func.date(ScanSession.started_at)
        ).order_by('date').all()
        
        # Top channels by file count
        top_channels = db.session.query(
            File.telegram_channel,
            func.count(File.id).label('file_count'),
            func.sum(File.file_size).label('total_size')
        ).filter_by(**file_filter).group_by(
            File.telegram_channel
        ).order_by(desc('file_count')).limit(10).all()
        
        return {
            'period_days': days,
            'daily_files': [
                {
                    'date': str(date),
                    'count': count,
                    'size': size or 0
                }
                for date, count, size in daily_files
            ],
            'daily_scans': [
                {
                    'date': str(date),
                    'count': count,
                    'files_found': files_found or 0
                }
                for date, count, files_found in daily_scans
            ],
            'top_channels': [
                {
                    'channel': channel or 'Unknown',
                    'file_count': file_count,
                    'total_size': total_size or 0
                }
                for channel, file_count, total_size in top_channels
            ]
        }
    
    def get_sharing_analytics(self, user_id=None):
        """Get file sharing analytics"""
        share_filter = {}
        if user_id:
            share_filter['user_id'] = user_id
        
        # Share statistics
        total_shares = FileShare.query.filter_by(**share_filter).count()
        active_shares = FileShare.query.filter_by(is_active=True, **share_filter).count()
        
        # Share types distribution
        share_types = db.session.query(
            FileShare.share_type,
            func.count(FileShare.id).label('count')
        ).filter_by(**share_filter).group_by(FileShare.share_type).all()
        
        # Most accessed shares
        top_shares = db.session.query(
            FileShare.id,
            FileShare.share_token,
            File.filename,
            FileShare.access_count,
            FileShare.download_count
        ).join(File).filter_by(**share_filter).order_by(
            desc(FileShare.access_count)
        ).limit(10).all()
        
        # Recent share access
        recent_access = db.session.query(
            ShareAccessLog.accessed_at,
            ShareAccessLog.action,
            ShareAccessLog.ip_address,
            File.filename
        ).join(FileShare).join(File).filter_by(**share_filter).order_by(
            desc(ShareAccessLog.accessed_at)
        ).limit(20).all()
        
        return {
            'total_shares': total_shares,
            'active_shares': active_shares,
            'share_types': [
                {'type': share_type.value, 'count': count}
                for share_type, count in share_types
            ],
            'top_shares': [
                {
                    'share_id': share_id,
                    'share_token': share_token,
                    'filename': filename,
                    'access_count': access_count,
                    'download_count': download_count
                }
                for share_id, share_token, filename, access_count, download_count in top_shares
            ],
            'recent_access': [
                {
                    'accessed_at': accessed_at.isoformat() if accessed_at else None,
                    'action': action,
                    'ip_address': ip_address,
                    'filename': filename
                }
                for accessed_at, action, ip_address, filename in recent_access
            ]
        }
    
    def get_storage_analytics(self, user_id=None):
        """Get storage usage analytics"""
        file_filter = {'is_deleted': False}
        if user_id:
            file_filter['user_id'] = user_id
        
        # Storage by file type
        storage_by_type = db.session.query(
            File.mime_type,
            func.count(File.id).label('count'),
            func.sum(File.file_size).label('size'),
            func.avg(File.file_size).label('avg_size')
        ).filter_by(**file_filter).group_by(File.mime_type).all()
        
        type_storage = {}
        for mime_type, count, size, avg_size in storage_by_type:
            category = self._get_file_category(mime_type)
            if category not in type_storage:
                type_storage[category] = {
                    'count': 0,
                    'size': 0,
                    'avg_size': 0,
                    'mime_types': []
                }
            type_storage[category]['count'] += count
            type_storage[category]['size'] += size or 0
            type_storage[category]['mime_types'].append({
                'mime_type': mime_type,
                'count': count,
                'size': size or 0
            })
        
        # Calculate average sizes
        for category in type_storage:
            if type_storage[category]['count'] > 0:
                type_storage[category]['avg_size'] = type_storage[category]['size'] / type_storage[category]['count']
        
        # Storage by folder
        folder_storage = db.session.query(
            Folder.name,
            Folder.path,
            func.count(File.id).label('file_count'),
            func.sum(File.file_size).label('total_size')
        ).outerjoin(File).filter(
            Folder.is_deleted == False
        )
        
        if user_id:
            folder_storage = folder_storage.filter(Folder.user_id == user_id)
        
        folder_storage = folder_storage.group_by(
            Folder.id, Folder.name, Folder.path
        ).order_by(desc('total_size')).limit(20).all()
        
        # Largest files
        largest_files = File.query.filter_by(**file_filter).order_by(
            desc(File.file_size)
        ).limit(20).all()
        
        return {
            'storage_by_type': type_storage,
            'storage_by_folder': [
                {
                    'folder_name': name,
                    'folder_path': path,
                    'file_count': file_count,
                    'total_size': total_size or 0
                }
                for name, path, file_count, total_size in folder_storage
            ],
            'largest_files': [f.to_dict() for f in largest_files]
        }
    
    def get_system_health(self):
        """Get system health metrics"""
        # Database statistics
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        
        # Recent activity
        recent_activity = {
            'files_last_24h': File.query.filter(
                File.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).count(),
            'scans_last_24h': ScanSession.query.filter(
                ScanSession.started_at >= datetime.utcnow() - timedelta(hours=24)
            ).count(),
            'shares_last_24h': FileShare.query.filter(
                FileShare.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).count()
        }
        
        # Error rates
        failed_scans = ScanSession.query.filter_by(status='failed').count()
        total_scans = ScanSession.query.count()
        error_rate = (failed_scans / total_scans * 100) if total_scans > 0 else 0
        
        return {
            'total_users': total_users,
            'active_users': active_users,
            'recent_activity': recent_activity,
            'error_rate': round(error_rate, 2),
            'failed_scans': failed_scans,
            'total_scans': total_scans
        }
    
    def _get_file_category(self, mime_type):
        """Categorize file by MIME type"""
        if not mime_type:
            return 'unknown'
        
        if mime_type.startswith('image/'):
            return 'images'
        elif mime_type.startswith('video/'):
            return 'videos'
        elif mime_type.startswith('audio/'):
            return 'audio'
        elif mime_type in ['application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            return 'documents'
        elif mime_type.startswith('text/'):
            return 'text'
        elif mime_type.startswith('application/'):
            return 'applications'
        else:
            return 'other'

# Global analytics instance
analytics = TeleDriveAnalytics()
