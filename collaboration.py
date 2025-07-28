#!/usr/bin/env python3
"""
Real-time Collaboration Module for TeleDrive
Provides real-time file collaboration, live updates, and team features
"""

import json
from datetime import datetime, timedelta
from flask import request
from flask_socketio import emit, join_room, leave_room, rooms
from flask_login import current_user
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from models import db, User, File

class CollaborationEventType(enum.Enum):
    """Types of collaboration events"""
    FILE_OPENED = "file_opened"
    FILE_CLOSED = "file_closed"
    FILE_EDITED = "file_edited"
    COMMENT_ADDED = "comment_added"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CURSOR_MOVED = "cursor_moved"
    SELECTION_CHANGED = "selection_changed"

class CollaborationSession(db.Model):
    """Active collaboration sessions"""
    __tablename__ = 'collaboration_sessions'
    
    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    session_id = Column(String(128), nullable=False)  # Socket session ID
    
    # Session state
    is_active = Column(Boolean, default=True)
    cursor_position = Column(Text)  # JSON cursor position data
    selection_range = Column(Text)  # JSON selection data
    
    # Timestamps
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    file = relationship('File', backref='collaboration_sessions')
    user = relationship('User', backref='collaboration_sessions')
    
    def __repr__(self):
        return f'<CollaborationSession {self.user_id}:{self.file_id}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'file_id': self.file_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'session_id': self.session_id,
            'is_active': self.is_active,
            'cursor_position': json.loads(self.cursor_position) if self.cursor_position else None,
            'selection_range': json.loads(self.selection_range) if self.selection_range else None,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None
        }

class CollaborationEvent(db.Model):
    """Collaboration event log"""
    __tablename__ = 'collaboration_events'
    
    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    event_type = Column(Enum(CollaborationEventType), nullable=False)
    
    # Event data
    event_data = Column(Text)  # JSON event data
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    file = relationship('File', backref='collaboration_events')
    user = relationship('User', backref='collaboration_events')
    
    def __repr__(self):
        return f'<CollaborationEvent {self.event_type.value}:{self.file_id}>'

class LiveCursor(db.Model):
    """Live cursor positions for real-time collaboration"""
    __tablename__ = 'live_cursors'
    
    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Cursor data
    position = Column(Text)  # JSON position data
    color = Column(String(7), default='#1a73e8')  # Hex color
    
    # Timestamps
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    file = relationship('File', backref='live_cursors')
    user = relationship('User', backref='live_cursors')
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'position': json.loads(self.position) if self.position else None,
            'color': self.color,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class CollaborationManager:
    """Main collaboration manager"""
    
    def __init__(self, socketio):
        self.socketio = socketio
        self.active_sessions = {}  # session_id -> user_data
        self.file_rooms = {}  # file_id -> set of session_ids
    
    def join_file_collaboration(self, file_id, user_id, session_id):
        """User joins file collaboration"""
        try:
            # Check if user has access to file
            file_obj = File.query.get(file_id)
            if not file_obj:
                return False
            
            # TODO: Check file permissions
            
            # Create or update collaboration session
            session = CollaborationSession.query.filter_by(
                file_id=file_id, user_id=user_id, session_id=session_id
            ).first()
            
            if not session:
                session = CollaborationSession(
                    file_id=file_id,
                    user_id=user_id,
                    session_id=session_id
                )
                db.session.add(session)
            else:
                session.is_active = True
                session.last_activity = datetime.utcnow()
            
            db.session.commit()
            
            # Join socket room
            room_name = f"file_{file_id}"
            join_room(room_name)
            
            # Track active sessions
            self.active_sessions[session_id] = {
                'user_id': user_id,
                'file_id': file_id,
                'joined_at': datetime.utcnow()
            }
            
            if file_id not in self.file_rooms:
                self.file_rooms[file_id] = set()
            self.file_rooms[file_id].add(session_id)
            
            # Log event
            self._log_event(file_id, user_id, CollaborationEventType.USER_JOINED)
            
            # Notify other users
            self._broadcast_to_file(file_id, 'user_joined', {
                'user_id': user_id,
                'username': User.query.get(user_id).username,
                'timestamp': datetime.utcnow().isoformat()
            }, exclude_session=session_id)
            
            # Send current collaborators to new user
            collaborators = self._get_file_collaborators(file_id)
            emit('collaborators_update', {
                'file_id': file_id,
                'collaborators': collaborators
            })
            
            return True
            
        except Exception as e:
            print(f"Error joining file collaboration: {e}")
            return False
    
    def leave_file_collaboration(self, session_id):
        """User leaves file collaboration"""
        try:
            if session_id not in self.active_sessions:
                return
            
            session_data = self.active_sessions[session_id]
            file_id = session_data['file_id']
            user_id = session_data['user_id']
            
            # Update database session
            session = CollaborationSession.query.filter_by(
                file_id=file_id, user_id=user_id, session_id=session_id
            ).first()
            
            if session:
                session.is_active = False
                db.session.commit()
            
            # Leave socket room
            room_name = f"file_{file_id}"
            leave_room(room_name)
            
            # Remove from tracking
            del self.active_sessions[session_id]
            if file_id in self.file_rooms:
                self.file_rooms[file_id].discard(session_id)
                if not self.file_rooms[file_id]:
                    del self.file_rooms[file_id]
            
            # Log event
            self._log_event(file_id, user_id, CollaborationEventType.USER_LEFT)
            
            # Notify other users
            self._broadcast_to_file(file_id, 'user_left', {
                'user_id': user_id,
                'username': User.query.get(user_id).username,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            print(f"Error leaving file collaboration: {e}")
    
    def update_cursor_position(self, session_id, position_data):
        """Update user's cursor position"""
        try:
            if session_id not in self.active_sessions:
                return
            
            session_data = self.active_sessions[session_id]
            file_id = session_data['file_id']
            user_id = session_data['user_id']
            
            # Update or create live cursor
            cursor = LiveCursor.query.filter_by(
                file_id=file_id, user_id=user_id
            ).first()
            
            if not cursor:
                cursor = LiveCursor(
                    file_id=file_id,
                    user_id=user_id,
                    position=json.dumps(position_data)
                )
                db.session.add(cursor)
            else:
                cursor.position = json.dumps(position_data)
                cursor.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            # Broadcast cursor update
            self._broadcast_to_file(file_id, 'cursor_update', {
                'user_id': user_id,
                'position': position_data,
                'timestamp': datetime.utcnow().isoformat()
            }, exclude_session=session_id)
            
        except Exception as e:
            print(f"Error updating cursor position: {e}")
    
    def broadcast_file_change(self, file_id, change_data, user_id):
        """Broadcast file changes to all collaborators"""
        try:
            # Log event
            self._log_event(file_id, user_id, CollaborationEventType.FILE_EDITED, change_data)
            
            # Broadcast to all collaborators
            self._broadcast_to_file(file_id, 'file_changed', {
                'file_id': file_id,
                'user_id': user_id,
                'changes': change_data,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            print(f"Error broadcasting file change: {e}")
    
    def _get_file_collaborators(self, file_id):
        """Get list of current collaborators for a file"""
        sessions = CollaborationSession.query.filter_by(
            file_id=file_id, is_active=True
        ).all()
        
        return [session.to_dict() for session in sessions]
    
    def _broadcast_to_file(self, file_id, event, data, exclude_session=None):
        """Broadcast event to all users in a file room"""
        room_name = f"file_{file_id}"
        
        if exclude_session:
            # Emit to room excluding specific session
            self.socketio.emit(event, data, room=room_name, skip_sid=exclude_session)
        else:
            self.socketio.emit(event, data, room=room_name)
    
    def _log_event(self, file_id, user_id, event_type, event_data=None):
        """Log collaboration event"""
        try:
            event = CollaborationEvent(
                file_id=file_id,
                user_id=user_id,
                event_type=event_type,
                event_data=json.dumps(event_data) if event_data else None
            )
            db.session.add(event)
            db.session.commit()
        except Exception as e:
            print(f"Error logging collaboration event: {e}")
    
    def cleanup_inactive_sessions(self):
        """Clean up inactive collaboration sessions"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            inactive_sessions = CollaborationSession.query.filter(
                CollaborationSession.last_activity < cutoff_time,
                CollaborationSession.is_active == True
            ).all()
            
            for session in inactive_sessions:
                session.is_active = False
            
            db.session.commit()
            
            print(f"Cleaned up {len(inactive_sessions)} inactive collaboration sessions")
            
        except Exception as e:
            print(f"Error cleaning up inactive sessions: {e}")

# Global collaboration manager (will be initialized with socketio)
collaboration_manager = None

def init_collaboration(socketio):
    """Initialize collaboration manager with socketio instance"""
    global collaboration_manager
    collaboration_manager = CollaborationManager(socketio)
    return collaboration_manager
