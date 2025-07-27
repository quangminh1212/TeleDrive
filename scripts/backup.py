#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Backup System
Automated backup system cho database và files
"""

import os
import sys
import gzip
import shutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional
import boto3
from botocore.exceptions import ClientError
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BackupManager:
    """Backup manager for TeleDrive"""

    def __init__(self):
        self.backup_dir = Path(os.getenv('BACKUP_DIR', 'backups'))
        self.backup_dir.mkdir(exist_ok=True)

        # Database settings
        self.db_url = os.getenv('DATABASE_URL', '')
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = os.getenv('DB_PORT', '5432')
        self.db_name = os.getenv('DB_NAME', 'teledrive')
        self.db_user = os.getenv('DB_USER', 'teledrive')
        self.db_password = os.getenv('DB_PASSWORD', '')

        # Retention settings
        self.retention_days = int(os.getenv('BACKUP_RETENTION_DAYS', '30'))

        # S3 settings (optional)
        self.s3_enabled = os.getenv('BACKUP_S3_ENABLED', 'false').lower() == 'true'
        self.s3_bucket = os.getenv('BACKUP_S3_BUCKET', '')
        self.s3_region = os.getenv('BACKUP_S3_REGION', 'us-east-1')

        if self.s3_enabled:
            self.s3_client = boto3.client('s3', region_name=self.s3_region)

    def create_database_backup(self) -> Optional[Path]:
        """Create database backup using pg_dump"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"teledrive_db_{timestamp}.sql"
            backup_path = self.backup_dir / backup_filename

            # Set environment for pg_dump
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password

            # Run pg_dump
            cmd = [
                'pg_dump',
                '-h', self.db_host,
                '-p', self.db_port,
                '-U', self.db_user,
                '-d', self.db_name,
                '--no-password',
                '--verbose',
                '--clean',
                '--if-exists',
                '--create',
                '-f', str(backup_path)
            ]

            logger.info(f"Creating database backup: {backup_filename}")
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)

            if result.returncode != 0:
                logger.error(f"pg_dump failed: {result.stderr}")
                return None

            # Compress the backup
            compressed_path = backup_path.with_suffix('.sql.gz')
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)

            # Remove uncompressed file
            backup_path.unlink()

            logger.info(f"Database backup created: {compressed_path}")
            return compressed_path

        except Exception as e:
            logger.error(f"Database backup failed: {e}")
            return None

    def create_files_backup(self) -> Optional[Path]:
        """Create backup of important files"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"teledrive_files_{timestamp}.tar.gz"
            backup_path = self.backup_dir / backup_filename

            # Directories to backup
            dirs_to_backup = [
                'instance',
                'logs',
                'downloads',
                'static/uploads',
                'config'
            ]

            # Create tar.gz archive
            cmd = ['tar', '-czf', str(backup_path)]

            for dir_name in dirs_to_backup:
                if Path(dir_name).exists():
                    cmd.append(dir_name)

            logger.info(f"Creating files backup: {backup_filename}")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                logger.error(f"Files backup failed: {result.stderr}")
                return None

            logger.info(f"Files backup created: {backup_path}")
            return backup_path

        except Exception as e:
            logger.error(f"Files backup failed: {e}")
            return None

    def upload_to_s3(self, file_path: Path) -> bool:
        """Upload backup to S3"""
        if not self.s3_enabled:
            return True

        try:
            s3_key = f"teledrive-backups/{file_path.name}"

            logger.info(f"Uploading {file_path.name} to S3...")
            self.s3_client.upload_file(
                str(file_path),
                self.s3_bucket,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'StorageClass': 'STANDARD_IA'
                }
            )

            logger.info(f"Successfully uploaded to S3: s3://{self.s3_bucket}/{s3_key}")
            return True

        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            return False

    def cleanup_old_backups(self):
        """Remove old backup files"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)

            for backup_file in self.backup_dir.glob('teledrive_*'):
                if backup_file.is_file():
                    file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)

                    if file_time < cutoff_date:
                        logger.info(f"Removing old backup: {backup_file.name}")
                        backup_file.unlink()

            logger.info("Cleanup completed")

        except Exception as e:
            logger.error(f"Cleanup failed: {e}")

    def run_full_backup(self) -> bool:
        """Run complete backup process"""
        logger.info("Starting full backup process...")

        success = True

        # Create database backup
        db_backup = self.create_database_backup()
        if db_backup:
            if not self.upload_to_s3(db_backup):
                success = False
        else:
            success = False

        # Create files backup
        files_backup = self.create_files_backup()
        if files_backup:
            if not self.upload_to_s3(files_backup):
                success = False
        else:
            success = False

        # Cleanup old backups
        self.cleanup_old_backups()

        if success:
            logger.info("Full backup completed successfully")
        else:
            logger.error("Backup completed with errors")

        return success

def restore_database(backup_file: str) -> bool:
    """Restore database from backup"""
    try:
        backup_path = Path(backup_file)

        if not backup_path.exists():
            logger.error(f"Backup file not found: {backup_file}")
            return False

        # Set environment for psql
        env = os.environ.copy()
        env['PGPASSWORD'] = os.getenv('DB_PASSWORD', '')

        # Decompress if needed
        if backup_path.suffix == '.gz':
            logger.info("Decompressing backup file...")
            with gzip.open(backup_path, 'rb') as f_in:
                sql_content = f_in.read()
        else:
            with open(backup_path, 'rb') as f_in:
                sql_content = f_in.read()

        # Run psql to restore
        cmd = [
            'psql',
            '-h', os.getenv('DB_HOST', 'localhost'),
            '-p', os.getenv('DB_PORT', '5432'),
            '-U', os.getenv('DB_USER', 'teledrive'),
            '-d', os.getenv('DB_NAME', 'teledrive'),
            '--no-password'
        ]

        logger.info("Restoring database...")
        result = subprocess.run(
            cmd,
            input=sql_content,
            env=env,
            capture_output=True
        )

        if result.returncode != 0:
            logger.error(f"Database restore failed: {result.stderr.decode()}")
            return False

        logger.info("Database restored successfully")
        return True

    except Exception as e:
        logger.error(f"Database restore failed: {e}")
        return False

def main():
    """Main backup script"""
    if len(sys.argv) < 2:
        print("Usage: python backup.py [backup|restore] [backup_file]")
        sys.exit(1)

    command = sys.argv[1]

    if command == 'backup':
        backup_manager = BackupManager()
        success = backup_manager.run_full_backup()
        sys.exit(0 if success else 1)

    elif command == 'restore':
        if len(sys.argv) < 3:
            print("Usage: python backup.py restore <backup_file>")
            sys.exit(1)

        backup_file = sys.argv[2]
        success = restore_database(backup_file)
        sys.exit(0 if success else 1)

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == '__main__':
    main()
