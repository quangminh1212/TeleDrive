#!/usr/bin/env python3
"""
File Sharing Routes for TeleDrive
API endpoints for file sharing, permissions, and collaboration features
"""

import os
import bcrypt
from datetime import datetime, timedelta
from flask import request, jsonify, render_template, redirect, url_for, send_from_directory, abort
from flask_login import login_required, current_user

from models import db, File, User, get_or_create_user
from models_sharing import (
    FileShare, FilePermission, ShareAccessLog, FileComment, FileVersion,
    ShareType, PermissionLevel
)

def register_sharing_routes(app):
    """Register all file sharing routes with the Flask app"""
    
    @app.route('/api/files/<int:file_id>/share', methods=['POST'])
    @login_required
    def create_file_share(file_id):
        """Create a new file share link"""
        try:
            data = request.get_json()
            
            # Get the file
            file_record = File.query.filter_by(id=file_id, user_id=current_user.id).first()
            if not file_record:
                return jsonify({'success': False, 'error': 'File not found'})
            
            # Parse share configuration
            share_type = ShareType(data.get('share_type', 'private'))
            permission_level = PermissionLevel(data.get('permission_level', 'view'))
            password = data.get('password')
            expires_in_days = data.get('expires_in_days')
            max_downloads = data.get('max_downloads')
            
            # Create share
            share = FileShare(
                file_id=file_id,
                user_id=current_user.id,
                share_type=share_type,
                permission_level=permission_level,
                max_downloads=max_downloads
            )
            
            # Set password if required
            if share_type == ShareType.PASSWORD and password:
                share.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Set expiration
            if expires_in_days:
                share.expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            db.session.add(share)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Share link created successfully',
                'share': share.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)})
    
    @app.route('/api/files/<int:file_id>/shares', methods=['GET'])
    @login_required
    def get_file_shares(file_id):
        """Get all shares for a file"""
        try:
            file_record = File.query.filter_by(id=file_id, user_id=current_user.id).first()
            if not file_record:
                return jsonify({'success': False, 'error': 'File not found'})
            
            shares = FileShare.query.filter_by(file_id=file_id).all()
            
            return jsonify({
                'success': True,
                'shares': [share.to_dict() for share in shares]
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    
    @app.route('/api/shares/<share_token>', methods=['DELETE'])
    @login_required
    def delete_share(share_token):
        """Delete a share link"""
        try:
            share = FileShare.query.filter_by(share_token=share_token, user_id=current_user.id).first()
            if not share:
                return jsonify({'success': False, 'error': 'Share not found'})
            
            db.session.delete(share)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Share link deleted successfully'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)})
    
    @app.route('/share/<share_token>')
    def access_shared_file(share_token):
        """Access a shared file via share token"""
        try:
            share = FileShare.query.filter_by(share_token=share_token).first()
            if not share:
                abort(404)
            
            # Check if share is accessible
            if not share.can_access():
                if share.is_expired():
                    return render_template('share_error.html', error='This share link has expired')
                elif share.is_download_limit_reached():
                    return render_template('share_error.html', error='Download limit reached')
                else:
                    return render_template('share_error.html', error='This share link is no longer active')
            
            # Log access
            log_share_access(share, 'view')
            
            # Update access tracking
            share.access_count += 1
            share.last_accessed = datetime.utcnow()
            db.session.commit()
            
            return render_template('shared_file.html', share=share, file=share.file)
            
        except Exception as e:
            return render_template('share_error.html', error=str(e))
    
    @app.route('/share/<share_token>/download')
    def download_shared_file(share_token):
        """Download a shared file"""
        try:
            password = request.args.get('password')
            
            share = FileShare.query.filter_by(share_token=share_token).first()
            if not share:
                abort(404)
            
            # Check access with password if required
            if not share.can_access(password):
                abort(403)
            
            # Check download permission
            if share.permission_level not in [PermissionLevel.DOWNLOAD, PermissionLevel.EDIT, PermissionLevel.ADMIN]:
                abort(403)
            
            # Log download
            log_share_access(share, 'download')
            
            # Update download count
            share.download_count += 1
            db.session.commit()
            
            # Serve file
            if share.file.file_path and os.path.exists(share.file.file_path):
                directory = os.path.dirname(share.file.file_path)
                filename = os.path.basename(share.file.file_path)
                return send_from_directory(directory, filename, as_attachment=True)
            else:
                abort(404)
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/files/<int:file_id>/permissions', methods=['POST'])
    @login_required
    def grant_file_permission(file_id):
        """Grant permission to a user for a file"""
        try:
            data = request.get_json()
            username = data.get('username')
            permission_level = PermissionLevel(data.get('permission_level', 'view'))
            expires_in_days = data.get('expires_in_days')
            
            # Get the file
            file_record = File.query.filter_by(id=file_id, user_id=current_user.id).first()
            if not file_record:
                return jsonify({'success': False, 'error': 'File not found'})
            
            # Get the user
            user = User.query.filter_by(username=username).first()
            if not user:
                return jsonify({'success': False, 'error': 'User not found'})
            
            # Check if permission already exists
            existing_permission = FilePermission.query.filter_by(
                file_id=file_id, user_id=user.id
            ).first()
            
            if existing_permission:
                # Update existing permission
                existing_permission.permission_level = permission_level
                existing_permission.is_active = True
                if expires_in_days:
                    existing_permission.expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
                permission = existing_permission
            else:
                # Create new permission
                permission = FilePermission(
                    file_id=file_id,
                    user_id=user.id,
                    granted_by=current_user.id,
                    permission_level=permission_level
                )
                if expires_in_days:
                    permission.expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
                db.session.add(permission)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Permission granted to {username}',
                'permission': permission.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)})
    
    @app.route('/api/files/<int:file_id>/permissions', methods=['GET'])
    @login_required
    def get_file_permissions(file_id):
        """Get all permissions for a file"""
        try:
            file_record = File.query.filter_by(id=file_id, user_id=current_user.id).first()
            if not file_record:
                return jsonify({'success': False, 'error': 'File not found'})
            
            permissions = FilePermission.query.filter_by(file_id=file_id, is_active=True).all()
            
            return jsonify({
                'success': True,
                'permissions': [perm.to_dict() for perm in permissions]
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    
    @app.route('/api/files/<int:file_id>/comments', methods=['POST'])
    @login_required
    def add_file_comment(file_id):
        """Add a comment to a file"""
        try:
            data = request.get_json()
            content = data.get('content', '').strip()
            parent_id = data.get('parent_id')
            
            if not content:
                return jsonify({'success': False, 'error': 'Comment content is required'})
            
            # Check if user has access to the file
            file_record = File.query.get(file_id)
            if not file_record:
                return jsonify({'success': False, 'error': 'File not found'})
            
            # Check permissions (owner or has permission)
            if file_record.user_id != current_user.id:
                permission = FilePermission.query.filter_by(
                    file_id=file_id, user_id=current_user.id, is_active=True
                ).first()
                if not permission or permission.is_expired():
                    return jsonify({'success': False, 'error': 'Access denied'})
            
            comment = FileComment(
                file_id=file_id,
                user_id=current_user.id,
                parent_id=parent_id,
                content=content
            )
            
            db.session.add(comment)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Comment added successfully',
                'comment': comment.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)})
    
    @app.route('/api/files/<int:file_id>/comments', methods=['GET'])
    @login_required
    def get_file_comments(file_id):
        """Get all comments for a file"""
        try:
            # Check if user has access to the file
            file_record = File.query.get(file_id)
            if not file_record:
                return jsonify({'success': False, 'error': 'File not found'})
            
            # Check permissions
            if file_record.user_id != current_user.id:
                permission = FilePermission.query.filter_by(
                    file_id=file_id, user_id=current_user.id, is_active=True
                ).first()
                if not permission or permission.is_expired():
                    return jsonify({'success': False, 'error': 'Access denied'})
            
            # Get top-level comments (no parent)
            comments = FileComment.query.filter_by(
                file_id=file_id, parent_id=None, is_deleted=False
            ).order_by(FileComment.created_at.desc()).all()
            
            return jsonify({
                'success': True,
                'comments': [comment.to_dict(include_replies=True) for comment in comments]
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

def log_share_access(share, action, success=True, error_message=None):
    """Log access to a shared file"""
    try:
        log = ShareAccessLog(
            share_id=share.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            referer=request.headers.get('Referer'),
            action=action,
            success=success,
            error_message=error_message
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        # Don't fail the main operation if logging fails
        pass
