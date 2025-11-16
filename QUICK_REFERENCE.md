# WhatsApp API Gateway - Quick Reference Guide

## 🚀 Quick Commands

### Application Management
```bash
# Check status
./manage.sh status

# Start application  
./manage.sh start

# Stop application
./manage.sh stop

# Restart application
./manage.sh restart

# View logs
./manage.sh logs

# Run full diagnostics
./diagnose.sh --full
```

### Device Management
```bash
# List all devices
curl -s http://localhost:3000/api/devices | jq .

# Create new device
curl -X POST http://localhost:3000/api/devices/DEVICE_ID/start

# Remove device
curl -X DELETE http://localhost:3000/api/devices/DEVICE_ID

# Check specific device status
curl -s http://localhost:3000/api/devices | jq '.DEVICE_ID'
```

### Quick Diagnostics
```bash
# Network connectivity test
./diagnose.sh --network

# Application health check
./diagnose.sh --app

# Log analysis
./diagnose.sh --logs

# Test WhatsApp connection
./diagnose.sh --full
```

## 🔧 Common Issues & Solutions

### Issue: Devices stuck in "reconnecting" status
**Solution:**
```bash
# Remove all stuck devices
curl -s http://localhost:3000/api/devices | jq -r 'keys[]' | while read device; do
    curl -X DELETE http://localhost:3000/api/devices/$device
done

# Restart application
./manage.sh restart
```

### Issue: No QR codes generated
**Possible Causes:**
1. Network restrictions by hosting provider
2. WhatsApp rate limiting
3. SSL/TLS connection issues
4. IP-based blocking

**Solutions:**
1. Contact hosting provider about WhatsApp traffic
2. Test from different server/IP
3. Implement proxy/VPN solution
4. Switch to WhatsApp Business API

### Issue: High memory usage
**Solution:**
```bash
# Check memory usage
./diagnose.sh --app

# Restart if memory > 1GB
./manage.sh restart
```

### Issue: Connection timeouts
**Solution:**
```bash
# Check network connectivity
ping web.whatsapp.com

# Test SSL connectivity
openssl s_client -connect web.whatsapp.com:443

# Check firewall/proxy settings
```

## 📊 Monitoring Commands

### Real-time Monitoring
```bash
# Watch device status
watch -n 5 'curl -s http://localhost:3000/api/devices | jq .'

# Monitor logs live
tail -f /var/log/pm2/whatsapp-api-gateway-combined-0.log

# System resource monitoring
htop -p $(pgrep -f whatsapp-api-gateway)
```

### Health Checks
```bash
# API endpoint health
curl -s http://localhost:3000/api/system | jq '.memory, .cpu'

# Application uptime
pm2 show whatsapp-api-gateway | grep uptime

# Error rate analysis
./diagnose.sh --logs
```

## 🆘 Emergency Procedures

### Complete Reset
```bash
# 1. Stop application
./manage.sh stop

# 2. Clear all sessions
rm -rf sessions/*

# 3. Clear logs (optional)
pm2 flush whatsapp-api-gateway

# 4. Restart application
./manage.sh start

# 5. Verify functionality
./diagnose.sh --full
```

### Backup Before Changes
```bash
# Create backup
./manage.sh backup

# Or manual backup
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz \
    --exclude="node_modules" \
    --exclude="sessions" \
    --exclude="logs" .
```

## 📞 When to Contact Support

Contact **Contabo Support** if:
- Consistent connection failures persist
- Network diagnostics show blocking
- SSL/TLS issues cannot be resolved

Contact **WhatsApp Business API Team** if:
- Need official API access
- Require enterprise-level support
- Automated detection issues

## 📋 Log Locations

- **Combined Logs:** `/var/log/pm2/whatsapp-api-gateway-combined-0.log`
- **Error Logs:** `/var/log/pm2/whatsapp-api-gateway-error-0.log`
- **Output Logs:** `/var/log/pm2/whatsapp-api-gateway-out-0.log`
- **PM2 Logs:** `~/.pm2/logs/`

## 🔍 Useful Log Filters

```bash
# Show only errors
grep -i error /var/log/pm2/whatsapp-api-gateway-combined-0.log

# Show WhatsApp connections
grep "connected to WA" /var/log/pm2/whatsapp-api-gateway-combined-0.log

# Show QR code generation
grep "QR Code generated" /var/log/pm2/whatsapp-api-gateway-combined-0.log

# Show connection failures
grep "Connection Failure" /var/log/pm2/whatsapp-api-gateway-combined-0.log
```

---

**Last Updated:** October 15, 2025  
**For detailed analysis, see:** `TROUBLESHOOTING_REPORT.md`