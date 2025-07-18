#!/bin/bash
# TeleDrive Backup Script
# Automated backup script for Docker environment

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-teledrive}"
DB_USER="${DB_USER:-teledrive}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
backup_database() {
    log "Starting database backup..."
    
    local backup_file="$BACKUP_DIR/teledrive_db_$TIMESTAMP.sql"
    local compressed_file="$backup_file.gz"
    
    # Check if PostgreSQL is available
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        error "PostgreSQL is not available at $DB_HOST:$DB_PORT"
        return 1
    fi
    
    # Create database dump
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password --verbose --clean --if-exists --create \
        -f "$backup_file"; then
        
        # Compress the backup
        gzip "$backup_file"
        
        log "Database backup created: $(basename "$compressed_file")"
        log "Backup size: $(du -h "$compressed_file" | cut -f1)"
        
        return 0
    else
        error "Database backup failed"
        return 1
    fi
}

# Files backup (if running in application container)
backup_files() {
    log "Starting files backup..."
    
    local backup_file="$BACKUP_DIR/teledrive_files_$TIMESTAMP.tar.gz"
    local files_to_backup=""
    
    # Check which directories exist and add them to backup
    for dir in "instance" "logs" "downloads" "static/uploads" "config"; do
        if [ -d "/$dir" ] || [ -d "/app/$dir" ]; then
            if [ -d "/$dir" ]; then
                files_to_backup="$files_to_backup /$dir"
            else
                files_to_backup="$files_to_backup /app/$dir"
            fi
        fi
    done
    
    if [ -n "$files_to_backup" ]; then
        if tar -czf "$backup_file" $files_to_backup 2>/dev/null; then
            log "Files backup created: $(basename "$backup_file")"
            log "Backup size: $(du -h "$backup_file" | cut -f1)"
            return 0
        else
            warn "Files backup failed or no files to backup"
            return 1
        fi
    else
        warn "No files found to backup"
        return 1
    fi
}

# Upload to S3 (if configured)
upload_to_s3() {
    local file_path="$1"
    
    if [ "$BACKUP_S3_ENABLED" = "true" ] && [ -n "$BACKUP_S3_BUCKET" ]; then
        log "Uploading $(basename "$file_path") to S3..."
        
        local s3_key="teledrive-backups/$(basename "$file_path")"
        
        if aws s3 cp "$file_path" "s3://$BACKUP_S3_BUCKET/$s3_key" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256; then
            log "Successfully uploaded to S3: s3://$BACKUP_S3_BUCKET/$s3_key"
            return 0
        else
            error "S3 upload failed"
            return 1
        fi
    else
        log "S3 upload disabled or not configured"
        return 0
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    find "$BACKUP_DIR" -name "teledrive_*" -type f -mtime +$RETENTION_DAYS -print0 | \
    while IFS= read -r -d '' file; do
        log "Removing old backup: $(basename "$file")"
        rm -f "$file"
        ((deleted_count++))
    done
    
    if [ $deleted_count -gt 0 ]; then
        log "Removed $deleted_count old backup files"
    else
        log "No old backups to remove"
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if file is not empty
    if [ ! -s "$backup_file" ]; then
        error "Backup file is empty: $backup_file"
        return 1
    fi
    
    # For SQL files, check if it's a valid gzip file
    if [[ "$backup_file" == *.sql.gz ]]; then
        if ! gzip -t "$backup_file" 2>/dev/null; then
            error "Backup file is corrupted: $backup_file"
            return 1
        fi
    fi
    
    # For tar.gz files, check if it's a valid tar file
    if [[ "$backup_file" == *.tar.gz ]]; then
        if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
            error "Backup file is corrupted: $backup_file"
            return 1
        fi
    fi
    
    log "Backup verification passed: $(basename "$backup_file")"
    return 0
}

# Send notification (if configured)
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "$WEBHOOK_URL" ]; then
        local payload="{\"text\":\"TeleDrive Backup $status: $message\"}"
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" "$WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
    
    if [ -n "$ADMIN_EMAIL" ] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "TeleDrive Backup $status" "$ADMIN_EMAIL" || true
    fi
}

# Main backup function
main() {
    log "Starting TeleDrive backup process..."
    log "Timestamp: $TIMESTAMP"
    
    local success=true
    local backup_files=()
    
    # Create database backup
    if backup_database; then
        local db_backup="$BACKUP_DIR/teledrive_db_$TIMESTAMP.sql.gz"
        if verify_backup "$db_backup"; then
            backup_files+=("$db_backup")
            upload_to_s3 "$db_backup" || success=false
        else
            success=false
        fi
    else
        success=false
    fi
    
    # Create files backup (optional)
    if backup_files; then
        local files_backup="$BACKUP_DIR/teledrive_files_$TIMESTAMP.tar.gz"
        if verify_backup "$files_backup"; then
            backup_files+=("$files_backup")
            upload_to_s3 "$files_backup" || success=false
        fi
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Report results
    if [ "$success" = true ]; then
        log "Backup completed successfully"
        log "Created backups: ${#backup_files[@]} files"
        send_notification "SUCCESS" "Backup completed successfully with ${#backup_files[@]} files"
        exit 0
    else
        error "Backup completed with errors"
        send_notification "FAILED" "Backup completed with errors"
        exit 1
    fi
}

# Handle script arguments
case "${1:-backup}" in
    "backup")
        main
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "verify")
        if [ -n "$2" ]; then
            verify_backup "$2"
        else
            error "Please specify backup file to verify"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [backup|cleanup|verify <file>]"
        exit 1
        ;;
esac
