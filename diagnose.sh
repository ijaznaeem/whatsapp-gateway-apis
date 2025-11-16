#!/bin/bash

# WhatsApp API Gateway - Comprehensive Diagnostic Script
# Usage: ./diagnose.sh [--full] [--network] [--app] [--logs]

echo "=========================================="
echo "  WhatsApp API Gateway Diagnostics"
echo "=========================================="
echo "Generated: $(date)"
echo "Server: $(hostname)"
echo "IP: $(curl -s ifconfig.me)"
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

# Function to check application status
check_application() {
    echo -e "\n${BLUE}=== APPLICATION STATUS ===${NC}"
    
    # PM2 Status
    if pm2 list | grep -q "whatsapp-api-gateway.*online"; then
        print_status "PM2 process is running"
        pm2 show whatsapp-api-gateway | grep -E "(status|memory|uptime|restarts)"
    else
        print_error "PM2 process is not running"
    fi
    
    # API Endpoints
    echo -e "\n${BLUE}Testing API endpoints:${NC}"
    API_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3000 -o /dev/null)
    if [ "$API_RESPONSE" = "200" ]; then
        print_status "Frontend accessible (HTTP $API_RESPONSE)"
    else
        print_error "Frontend not accessible (HTTP $API_RESPONSE)"
    fi
    
    DEVICES_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3000/api/devices -o /dev/null)
    if [ "$DEVICES_RESPONSE" = "200" ]; then
        print_status "Devices API accessible (HTTP $DEVICES_RESPONSE)"
        
        # Check current devices
        DEVICE_COUNT=$(curl -s http://localhost:3000/api/devices | jq 'keys | length')
        if [ "$DEVICE_COUNT" -gt 0 ]; then
            print_info "$DEVICE_COUNT WhatsApp device(s) currently registered"
            curl -s http://localhost:3000/api/devices | jq -r 'to_entries[] | "\(.key): \(.value.status)"'
        else
            print_info "No WhatsApp devices currently registered"
        fi
    else
        print_error "Devices API not accessible (HTTP $DEVICES_RESPONSE)"
    fi
}

# Function to check network connectivity
check_network() {
    echo -e "\n${BLUE}=== NETWORK CONNECTIVITY ===${NC}"
    
    # Basic connectivity
    echo -e "\n${BLUE}Testing basic connectivity:${NC}"
    if ping -c 3 web.whatsapp.com > /dev/null 2>&1; then
        PACKET_LOSS=$(ping -c 10 web.whatsapp.com | grep "packet loss" | awk '{print $6}')
        if [[ "$PACKET_LOSS" == "0%" ]]; then
            print_status "WhatsApp servers reachable (0% packet loss)"
        else
            print_warning "WhatsApp servers reachable but with $PACKET_LOSS packet loss"
        fi
    else
        print_error "Cannot reach WhatsApp servers"
    fi
    
    # SSL/TLS connectivity
    echo -e "\n${BLUE}Testing SSL/TLS connectivity:${NC}"
    SSL_TEST=$(echo | openssl s_client -connect web.whatsapp.com:443 -servername web.whatsapp.com 2>/dev/null)
    if echo "$SSL_TEST" | grep -q "CONNECTED"; then
        TLS_VERSION=$(echo "$SSL_TEST" | grep "Protocol" | awk '{print $3}')
        print_status "SSL/TLS connection successful ($TLS_VERSION)"
    else
        print_error "SSL/TLS connection failed"
    fi
    
    # DNS resolution
    echo -e "\n${BLUE}Testing DNS resolution:${NC}"
    for domain in web.whatsapp.com w1.web.whatsapp.com w2.web.whatsapp.com; do
        if nslookup $domain > /dev/null 2>&1; then
            print_status "$domain resolves correctly"
        else
            print_warning "$domain does not resolve"
        fi
    done
    
    # Port connectivity
    echo -e "\n${BLUE}Testing port connectivity:${NC}"
    if timeout 5 bash -c "</dev/tcp/web.whatsapp.com/443" 2>/dev/null; then
        print_status "Port 443 (HTTPS) is accessible"
    else
        print_error "Port 443 (HTTPS) is not accessible"
    fi
    
    if timeout 5 bash -c "</dev/tcp/web.whatsapp.com/80" 2>/dev/null; then
        print_status "Port 80 (HTTP) is accessible"
    else
        print_warning "Port 80 (HTTP) is not accessible"
    fi
}

# Function to check system resources
check_system() {
    echo -e "\n${BLUE}=== SYSTEM RESOURCES ===${NC}"
    
    # Memory usage
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
        print_warning "Memory usage high: ${MEM_USAGE}%"
    else
        print_status "Memory usage normal: ${MEM_USAGE}%"
    fi
    
    # Disk usage
    DISK_USAGE=$(df /opt/whatsapp-api-gateway | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 80 ]; then
        print_warning "Disk usage high: ${DISK_USAGE}%"
    else
        print_status "Disk usage normal: ${DISK_USAGE}%"
    fi
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    print_info "Load average: $LOAD_AVG"
    
    # Node.js and NPM versions
    print_info "Node.js version: $(node --version)"
    print_info "NPM version: $(npm --version)"
    
    # Check critical packages
    echo -e "\n${BLUE}Package versions:${NC}"
    cd /opt/whatsapp-api-gateway
    BAILEYS_VERSION=$(npm list @whiskeysockets/baileys --depth=0 2>/dev/null | grep baileys | awk '{print $2}')
    print_info "Baileys version: $BAILEYS_VERSION"
}

# Function to analyze logs
check_logs() {
    echo -e "\n${BLUE}=== LOG ANALYSIS ===${NC}"
    
    LOG_FILE="/var/log/pm2/whatsapp-api-gateway-combined-0.log"
    ERROR_LOG="/var/log/pm2/whatsapp-api-gateway-error-0.log"
    
    if [ -f "$LOG_FILE" ]; then
        print_status "Log file exists: $LOG_FILE"
        
        # Recent errors
        ERROR_COUNT=$(tail -100 "$LOG_FILE" | grep -c "Error\|ERROR\|error" || echo "0")
        if [ "$ERROR_COUNT" -gt 0 ]; then
            print_warning "Found $ERROR_COUNT errors in last 100 log lines"
            echo -e "\n${BLUE}Recent errors:${NC}"
            tail -100 "$LOG_FILE" | grep -i "error" | tail -3
        else
            print_status "No errors in recent logs"
        fi
        
        # Connection attempts
        CONN_ATTEMPTS=$(tail -100 "$LOG_FILE" | grep -c "connected to WA" || echo "0")
        CONN_FAILURES=$(tail -100 "$LOG_FILE" | grep -c "Connection Failure" || echo "0")
        
        print_info "Recent WhatsApp connection attempts: $CONN_ATTEMPTS"
        print_info "Recent connection failures: $CONN_FAILURES"
        
        if [ "$CONN_FAILURES" -gt 0 ] && [ "$CONN_ATTEMPTS" -gt 0 ]; then
            FAILURE_RATE=$(echo "scale=1; $CONN_FAILURES * 100 / $CONN_ATTEMPTS" | bc)
            print_warning "Connection failure rate: ${FAILURE_RATE}%"
        fi
        
        # QR code generation
        QR_COUNT=$(tail -500 "$LOG_FILE" | grep -c "QR Code generated" || echo "0")
        if [ "$QR_COUNT" -gt 0 ]; then
            print_status "QR codes generated in recent logs: $QR_COUNT"
        else
            print_warning "No QR codes generated in recent logs"
        fi
        
    else
        print_error "Log file not found: $LOG_FILE"
    fi
}

# Function to test WhatsApp connection
test_whatsapp_connection() {
    echo -e "\n${BLUE}=== WHATSAPP CONNECTION TEST ===${NC}"
    
    # Create a test device
    TEST_DEVICE="diagnostic_test_$(date +%s)"
    print_info "Creating test device: $TEST_DEVICE"
    
    CREATE_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/devices/$TEST_DEVICE/start")
    if echo "$CREATE_RESPONSE" | grep -q "starting"; then
        print_status "Test device created successfully"
        
        # Monitor for 30 seconds
        print_info "Monitoring device status for 30 seconds..."
        for i in {1..6}; do
            sleep 5
            STATUS=$(curl -s "http://localhost:3000/api/devices" | jq -r ".[\"$TEST_DEVICE\"].status" 2>/dev/null || echo "unknown")
            QR_CODE=$(curl -s "http://localhost:3000/api/devices" | jq -r ".[\"$TEST_DEVICE\"].qrCode" 2>/dev/null || echo "null")
            
            echo -e "  ${i}0s: Status = $STATUS, QR = $([ "$QR_CODE" = "null" ] && echo "No" || echo "Yes")"
            
            if [ "$QR_CODE" != "null" ]; then
                print_status "QR Code generated successfully!"
                break
            fi
            
            if [ "$STATUS" = "connected" ]; then
                print_status "Device connected successfully!"
                break
            fi
        done
        
        # Cleanup test device
        print_info "Cleaning up test device..."
        curl -s -X DELETE "http://localhost:3000/api/devices/$TEST_DEVICE" > /dev/null
        
    else
        print_error "Failed to create test device"
        echo "Response: $CREATE_RESPONSE"
    fi
}

# Function to generate recommendations
generate_recommendations() {
    echo -e "\n${BLUE}=== RECOMMENDATIONS ===${NC}"
    
    # Check if devices are stuck in reconnecting
    RECONNECTING_COUNT=$(curl -s http://localhost:3000/api/devices | jq -r 'to_entries[] | select(.value.status == "reconnecting") | .key' | wc -l)
    if [ "$RECONNECTING_COUNT" -gt 0 ]; then
        print_warning "Found $RECONNECTING_COUNT device(s) stuck in reconnecting state"
        echo "  → Recommendation: Clear stuck devices and restart application"
        echo "  → Command: curl -X DELETE http://localhost:3000/api/devices/{device_id}"
    fi
    
    # Check log file size
    if [ -f "/var/log/pm2/whatsapp-api-gateway-combined-0.log" ]; then
        LOG_SIZE=$(stat -c%s "/var/log/pm2/whatsapp-api-gateway-combined-0.log" 2>/dev/null || echo "0")
        if [ "$LOG_SIZE" -gt 104857600 ]; then # 100MB
            print_warning "Log file is large ($(($LOG_SIZE / 1024 / 1024))MB)"
            echo "  → Recommendation: Rotate logs to prevent disk space issues"
            echo "  → Command: pm2 flush whatsapp-api-gateway"
        fi
    fi
    
    # Check for high memory usage
    PM2_MEMORY=$(pm2 jlist | jq -r '.[] | select(.name=="whatsapp-api-gateway") | .monit.memory' 2>/dev/null || echo "0")
    if [ "$PM2_MEMORY" -gt 1073741824 ]; then # 1GB
        MEMORY_MB=$(($PM2_MEMORY / 1024 / 1024))
        print_warning "High memory usage detected (${MEMORY_MB}MB)"
        echo "  → Recommendation: Restart application to clear memory"
        echo "  → Command: ./manage.sh restart"
    fi
}

# Main execution
FULL_CHECK=false
NETWORK_ONLY=false
APP_ONLY=false
LOGS_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_CHECK=true
            shift
            ;;
        --network)
            NETWORK_ONLY=true
            shift
            ;;
        --app)
            APP_ONLY=true
            shift
            ;;
        --logs)
            LOGS_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--full] [--network] [--app] [--logs]"
            exit 1
            ;;
    esac
done

# Execute checks based on arguments
if [ "$NETWORK_ONLY" = true ]; then
    check_network
elif [ "$APP_ONLY" = true ]; then
    check_application
    check_system
elif [ "$LOGS_ONLY" = true ]; then
    check_logs
elif [ "$FULL_CHECK" = true ]; then
    check_application
    check_network
    check_system
    check_logs
    test_whatsapp_connection
    generate_recommendations
else
    # Default: run basic checks
    check_application
    check_network
    generate_recommendations
fi

echo -e "\n${BLUE}=========================================="
echo "  Diagnostics Complete"
echo "==========================================${NC}"
echo "For detailed analysis, see: TROUBLESHOOTING_REPORT.md"
echo "For full diagnostics, run: ./diagnose.sh --full"