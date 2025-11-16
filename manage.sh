#!/bin/bash

# WhatsApp API Gateway Management Script
# Author: System Administrator
# Description: Easy management script for WhatsApp API Gateway application

APP_NAME="whatsapp-api-gateway"
APP_DIR="/opt/whatsapp-api-gateway"
PM2_CONFIG="$APP_DIR/ecosystem.config.js"
LOG_DIR="$APP_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  WhatsApp API Gateway Manager  ${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to check if PM2 is running
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed!"
        exit 1
    fi
}

# Function to start the application
start_app() {
    print_status "Starting WhatsApp API Gateway..."
    cd "$APP_DIR"
    pm2 start "$PM2_CONFIG"
    pm2 save
    print_status "Application started successfully!"
}

# Function to stop the application
stop_app() {
    print_status "Stopping WhatsApp API Gateway..."
    pm2 stop "$APP_NAME"
    print_status "Application stopped!"
}

# Function to restart the application
restart_app() {
    print_status "Restarting WhatsApp API Gateway..."
    pm2 restart "$APP_NAME"
    print_status "Application restarted!"
}

# Function to reload the application (zero downtime)
reload_app() {
    print_status "Reloading WhatsApp API Gateway (zero downtime)..."
    pm2 reload "$APP_NAME"
    print_status "Application reloaded!"
}

# Function to show application status
show_status() {
    print_status "Application Status:"
    pm2 status
    echo ""
    print_status "Application Info:"
    pm2 info "$APP_NAME"
}

# Function to show logs
show_logs() {
    if [ "$1" = "error" ]; then
        print_status "Showing error logs..."
        pm2 logs "$APP_NAME" --err
    elif [ "$1" = "out" ]; then
        print_status "Showing output logs..."
        pm2 logs "$APP_NAME" --out
    else
        print_status "Showing all logs..."
        pm2 logs "$APP_NAME"
    fi
}

# Function to monitor the application
monitor_app() {
    print_status "Starting PM2 monitoring..."
    pm2 monit
}

# Function to update application
update_app() {
    print_status "Updating WhatsApp API Gateway..."
    cd "$APP_DIR"
    
    # Backup current version
    print_status "Creating backup..."
    tar -czf "backup-$(date +%Y%m%d-%H%M%S).tar.gz" --exclude="node_modules" --exclude="sessions" --exclude="uploads" --exclude="logs" .
    
    # Update dependencies
    print_status "Updating dependencies..."
    npm install
    
    # Restart application
    restart_app
    print_status "Update completed!"
}

# Function to backup application data
backup_app() {
    print_status "Creating backup of WhatsApp API Gateway..."
    BACKUP_DIR="/opt/backups/whatsapp-api-gateway"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/whatsapp-api-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    cd "$APP_DIR"
    tar -czf "$BACKUP_FILE" --exclude="node_modules" .
    
    print_status "Backup created: $BACKUP_FILE"
}

# Function to setup auto-startup
setup_startup() {
    print_status "Setting up auto-startup..."
    pm2 startup
    pm2 save
    print_status "Auto-startup configured!"
}

# Function to show help
show_help() {
    print_header
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start          Start the application"
    echo "  stop           Stop the application"
    echo "  restart        Restart the application"
    echo "  reload         Reload the application (zero downtime)"
    echo "  status         Show application status"
    echo "  logs           Show all logs"
    echo "  logs error     Show error logs only"
    echo "  logs out       Show output logs only"
    echo "  monitor        Start PM2 monitoring interface"
    echo "  update         Update application and dependencies"
    echo "  backup         Create backup of application data"
    echo "  startup        Setup auto-startup on boot"
    echo "  health         Check application health"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start       # Start the application"
    echo "  $0 logs        # View all logs"
    echo "  $0 status      # Check status"
}

# Function to check application health
check_health() {
    print_status "Checking application health..."
    
    # Check if PM2 process is running
    if pm2 list | grep -q "$APP_NAME.*online"; then
        print_status "✓ PM2 process is running"
    else
        print_error "✗ PM2 process is not running"
        return 1
    fi
    
    # Check if port is listening
    if netstat -tuln | grep -q ":3000"; then
        print_status "✓ Application is listening on port 3000"
    else
        print_warning "✗ Port 3000 is not listening"
    fi
    
    # Check disk space
    DISK_USAGE=$(df "$APP_DIR" | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        print_status "✓ Disk space usage: ${DISK_USAGE}%"
    else
        print_warning "⚠ High disk usage: ${DISK_USAGE}%"
    fi
    
    # Check memory usage
    MEMORY_USAGE=$(pm2 show "$APP_NAME" | grep "memory usage" | awk '{print $4}' | sed 's/M//')
    if [ -n "$MEMORY_USAGE" ]; then
        print_status "✓ Memory usage: ${MEMORY_USAGE}MB"
    fi
    
    print_status "Health check completed!"
}

# Main script logic
check_pm2

case "$1" in
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    reload)
        reload_app
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    monitor)
        monitor_app
        ;;
    update)
        update_app
        ;;
    backup)
        backup_app
        ;;
    startup)
        setup_startup
        ;;
    health)
        check_health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
