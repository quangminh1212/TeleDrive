#!/bin/bash
# TeleDrive Production Deployment Script
# Automated deployment script for production environment

set -e

# Configuration
PROJECT_NAME="teledrive"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        error ".env file not found. Please create it from .env.production template"
        exit 1
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "docker-compose.yml not found"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Validate environment variables
validate_environment() {
    log "Validating environment variables..."
    
    # Source environment file
    source "$ENV_FILE"
    
    # Required variables
    required_vars=(
        "SECRET_KEY"
        "DATABASE_URL"
        "TELEGRAM_API_ID"
        "TELEGRAM_API_HASH"
        "TELEGRAM_PHONE"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            error "  - $var"
        done
        exit 1
    fi
    
    # Validate SECRET_KEY strength
    if [ ${#SECRET_KEY} -lt 32 ]; then
        error "SECRET_KEY must be at least 32 characters long"
        exit 1
    fi
    
    log "Environment validation passed"
}

# Create backup before deployment
create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        log "Creating backup before deployment..."
        
        # Check if backup script exists
        if [ -f "scripts/backup.sh" ]; then
            bash scripts/backup.sh backup
        else
            warn "Backup script not found, skipping backup"
        fi
    else
        info "Backup before deployment is disabled"
    fi
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Set build arguments
    export BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    export VERSION=${VERSION:-$(git describe --tags --always 2>/dev/null || echo "latest")}
    export VCS_REF=${VCS_REF:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}
    
    # Build images
    docker-compose build --no-cache
    
    log "Docker images built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Start database service first
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout=60
    while ! docker-compose exec -T postgres pg_isready -U teledrive -d teledrive; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            error "Database failed to start within 60 seconds"
            exit 1
        fi
    done
    
    # Run migrations (if migration script exists)
    if [ -f "scripts/migrate.py" ]; then
        docker-compose run --rm teledrive python scripts/migrate.py
    else
        info "No migration script found, skipping migrations"
    fi
    
    log "Database migrations completed"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Stop existing services
    docker-compose down
    
    # Start all services
    docker-compose up -d
    
    # Wait for application to be ready
    log "Waiting for application to be ready..."
    timeout=120
    while ! curl -f http://localhost:${PORT:-5000}/health >/dev/null 2>&1; do
        sleep 5
        timeout=$((timeout - 5))
        if [ $timeout -le 0 ]; then
            error "Application failed to start within 120 seconds"
            docker-compose logs teledrive
            exit 1
        fi
    done
    
    log "Application deployed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if all services are running
    if ! docker-compose ps | grep -q "Up"; then
        error "Some services are not running"
        docker-compose ps
        exit 1
    fi
    
    # Check application health
    if ! curl -f http://localhost:${PORT:-5000}/health/detailed >/dev/null 2>&1; then
        error "Application health check failed"
        exit 1
    fi
    
    # Check database connectivity
    if ! docker-compose exec -T postgres pg_isready -U teledrive -d teledrive >/dev/null 2>&1; then
        error "Database connectivity check failed"
        exit 1
    fi
    
    # Check Redis connectivity
    if ! docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        error "Redis connectivity check failed"
        exit 1
    fi
    
    log "Deployment verification passed"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo
    
    # Show running services
    info "Running Services:"
    docker-compose ps
    echo
    
    # Show application info
    info "Application URLs:"
    echo "  - Main Application: http://localhost:${PORT:-5000}"
    echo "  - Health Check: http://localhost:${PORT:-5000}/health"
    echo "  - Detailed Health: http://localhost:${PORT:-5000}/health/detailed"
    echo "  - Metrics: http://localhost:${PORT:-5000}/metrics"
    echo
    
    # Show logs command
    info "View logs with:"
    echo "  docker-compose logs -f teledrive"
    echo
    
    # Show useful commands
    info "Useful commands:"
    echo "  - Stop services: docker-compose down"
    echo "  - View status: docker-compose ps"
    echo "  - Restart app: docker-compose restart teledrive"
    echo "  - Create backup: bash scripts/backup.sh"
}

# Rollback deployment
rollback() {
    warn "Rolling back deployment..."
    
    # Stop current services
    docker-compose down
    
    # If there's a previous backup, offer to restore
    latest_backup=$(find backups -name "teledrive_db_*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2- 2>/dev/null || echo "")
    
    if [ -n "$latest_backup" ]; then
        read -p "Restore from latest backup ($latest_backup)? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            python scripts/backup.py restore "$latest_backup"
        fi
    fi
    
    warn "Rollback completed. Please check your application state."
}

# Main deployment function
main() {
    log "Starting TeleDrive production deployment..."
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            validate_environment
            create_backup
            build_images
            run_migrations
            deploy_application
            verify_deployment
            show_status
            log "Deployment completed successfully!"
            ;;
        "rollback")
            rollback
            ;;
        "status")
            show_status
            ;;
        "backup")
            create_backup
            ;;
        "build")
            check_prerequisites
            build_images
            ;;
        "migrate")
            run_migrations
            ;;
        *)
            echo "Usage: $0 [deploy|rollback|status|backup|build|migrate]"
            echo
            echo "Commands:"
            echo "  deploy   - Full deployment (default)"
            echo "  rollback - Rollback deployment"
            echo "  status   - Show deployment status"
            echo "  backup   - Create backup only"
            echo "  build    - Build images only"
            echo "  migrate  - Run migrations only"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
