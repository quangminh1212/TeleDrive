#!/usr/bin/env python3
"""
Web Scanner Integration - Bridge between Flask web interface and Telegram scanner
"""

import asyncio
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from main import PrivateChannelScanner
import config

class WebTelegramScanner:
    """Web-integrated Telegram scanner with progress tracking"""
    
    def __init__(self):
        self.scanner = None
        self.scan_status = {}
        self.active_scans = {}
        
    async def initialize_scanner(self):
        """Initialize the Telegram scanner"""
        try:
            self.scanner = PrivateChannelScanner()
            await self.scanner.initialize()
            return True
        except Exception as e:
            print(f"Failed to initialize scanner: {e}")
            return False
    
    def start_scan(self, scan_id: str, channel: str, options: Dict) -> bool:
        """Start a new scan in background"""
        try:
            # Create scan status entry
            self.scan_status[scan_id] = {
                'status': 'starting',
                'channel': channel,
                'progress': 0,
                'messages_scanned': 0,
                'files_found': 0,
                'start_time': datetime.now().isoformat(),
                'error': None
            }
            
            # Start scan in background thread
            thread = threading.Thread(
                target=self._run_scan_async,
                args=(scan_id, channel, options)
            )
            thread.daemon = True
            thread.start()
            
            self.active_scans[scan_id] = thread
            return True
            
        except Exception as e:
            self.scan_status[scan_id] = {
                'status': 'error',
                'error': str(e),
                'progress': 0
            }
            return False
    
    def _run_scan_async(self, scan_id: str, channel: str, options: Dict):
        """Run scan in async context"""
        try:
            # Create new event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Run the actual scan
            loop.run_until_complete(self._perform_scan(scan_id, channel, options))
            
        except Exception as e:
            self.scan_status[scan_id]['status'] = 'error'
            self.scan_status[scan_id]['error'] = str(e)
        finally:
            loop.close()
    
    async def _perform_scan(self, scan_id: str, channel: str, options: Dict):
        """Perform the actual scan with progress tracking"""
        try:
            # Update status
            self.scan_status[scan_id]['status'] = 'connecting'
            
            # Initialize scanner if not already done
            if not self.scanner:
                if not await self.initialize_scanner():
                    raise Exception("Failed to initialize Telegram client")
            
            # Update status
            self.scan_status[scan_id]['status'] = 'scanning'
            
            # Get channel entity
            entity = await self.scanner.get_channel_entity(channel)
            if not entity:
                raise Exception("Could not access channel")
            
            # Count total messages
            total_messages = 0
            max_messages = options.get('max_messages')
            limit = int(max_messages) if max_messages else config.MAX_MESSAGES
            
            async for _ in self.scanner.client.iter_messages(entity, limit=limit):
                total_messages += 1
            
            # Scan messages with progress tracking
            files_found = 0
            messages_scanned = 0
            
            async for message in self.scanner.client.iter_messages(entity, limit=limit):
                # Extract file info
                file_info = self.scanner.extract_file_info(message)
                
                if file_info and self.scanner.should_include_file_type(file_info['file_type']):
                    # Check if this file type should be scanned based on options
                    file_type = file_info['file_type']
                    should_include = True
                    
                    if file_type == 'document' and not options.get('scan_documents', True):
                        should_include = False
                    elif file_type == 'photo' and not options.get('scan_photos', True):
                        should_include = False
                    elif file_type == 'video' and not options.get('scan_videos', True):
                        should_include = False
                    elif file_type == 'audio' and not options.get('scan_audio', True):
                        should_include = False
                    elif file_type == 'voice' and not options.get('scan_voice', False):
                        should_include = False
                    elif file_type == 'sticker' and not options.get('scan_stickers', False):
                        should_include = False
                    
                    if should_include:
                        self.scanner.files_data.append(file_info)
                        files_found += 1
                
                messages_scanned += 1
                
                # Update progress
                progress = min(100, (messages_scanned / total_messages) * 100) if total_messages > 0 else 0
                self.scan_status[scan_id].update({
                    'progress': progress,
                    'messages_scanned': messages_scanned,
                    'files_found': files_found
                })
                
                # Small delay to prevent overwhelming
                if messages_scanned % 50 == 0:
                    await asyncio.sleep(0.1)
            
            # Save results
            if self.scanner.files_data:
                await self.scanner.save_results()
            
            # Update final status
            self.scan_status[scan_id].update({
                'status': 'completed',
                'progress': 100,
                'messages_scanned': messages_scanned,
                'files_found': files_found,
                'end_time': datetime.now().isoformat()
            })
            
        except Exception as e:
            self.scan_status[scan_id].update({
                'status': 'error',
                'error': str(e),
                'end_time': datetime.now().isoformat()
            })
    
    def get_scan_status(self, scan_id: str) -> Optional[Dict]:
        """Get status of a specific scan"""
        return self.scan_status.get(scan_id)
    
    def cancel_scan(self, scan_id: str) -> bool:
        """Cancel an active scan"""
        try:
            if scan_id in self.active_scans:
                # Note: This is a simplified cancellation
                # In a production system, you'd need proper cancellation handling
                self.scan_status[scan_id]['status'] = 'cancelled'
                return True
            return False
        except Exception:
            return False
    
    def get_all_scans(self) -> Dict:
        """Get status of all scans"""
        return self.scan_status.copy()
    
    async def test_connection(self) -> bool:
        """Test Telegram connection"""
        try:
            if not self.scanner:
                if not await self.initialize_scanner():
                    return False
            
            # Try to get user info
            me = await self.scanner.client.get_me()
            return me is not None
            
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False
    
    async def close(self):
        """Close the scanner"""
        if self.scanner:
            await self.scanner.close()

# Global scanner instance
web_scanner = WebTelegramScanner()

def get_web_scanner():
    """Get the global web scanner instance"""
    return web_scanner

async def test_telegram_connection():
    """Test Telegram connection for web interface"""
    scanner = get_web_scanner()
    return await scanner.test_connection()

def start_channel_scan(channel: str, options: Dict) -> str:
    """Start a channel scan and return scan ID"""
    import uuid
    
    scan_id = str(uuid.uuid4())
    scanner = get_web_scanner()
    
    if scanner.start_scan(scan_id, channel, options):
        return scan_id
    else:
        return None

def get_scan_progress(scan_id: str) -> Optional[Dict]:
    """Get scan progress"""
    scanner = get_web_scanner()
    return scanner.get_scan_status(scan_id)

def cancel_scan(scan_id: str) -> bool:
    """Cancel a scan"""
    scanner = get_web_scanner()
    return scanner.cancel_scan(scan_id)

# Example usage
if __name__ == "__main__":
    async def main():
        scanner = WebTelegramScanner()
        
        # Test connection
        print("Testing connection...")
        connected = await scanner.test_connection()
        print(f"Connection: {'✅ Success' if connected else '❌ Failed'}")
        
        if connected:
            # Start a test scan
            scan_id = "test_scan"
            options = {
                'scan_documents': True,
                'scan_photos': True,
                'scan_videos': True,
                'scan_audio': True,
                'max_messages': 100
            }
            
            print("Starting test scan...")
            scanner.start_scan(scan_id, "@test_channel", options)
            
            # Monitor progress
            import time
            while True:
                status = scanner.get_scan_status(scan_id)
                if status:
                    print(f"Status: {status['status']}, Progress: {status['progress']:.1f}%")
                    if status['status'] in ['completed', 'error', 'cancelled']:
                        break
                time.sleep(2)
        
        await scanner.close()
    
    asyncio.run(main())
