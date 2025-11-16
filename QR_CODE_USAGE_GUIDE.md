# QR Code Usage Guide - WhatsApp API Gateway

## ✅ Issue Fixed - November 16, 2025

**Problem:** QR codes were displayed but connections failed immediately  
**Solution:** Implemented smart session management with auto-cleanup and refresh

---

## 🚀 How to Connect a New Device

### Step 1: Create a Device Session
```bash
curl -X POST http://localhost:3000/api/devices/{DEVICE_ID}/start
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/devices/myphone/start
```

**Response:**
```json
{"status":"starting","device":"myphone"}
```

### Step 2: Get the QR Code
```bash
curl http://localhost:3000/api/devices/{DEVICE_ID}/status
```

**Example:**
```bash
curl http://localhost:3000/api/devices/myphone/status
```

**Response:**
```json
{
  "status": "waiting_for_scan",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "lastUpdate": "2025-11-16T02:18:05.123Z"
}
```

### Step 3: Display QR Code
The `qrCode` field contains a Data URL that can be directly used in HTML:

```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." alt="WhatsApp QR Code">
```

### Step 4: Scan with WhatsApp
1. Open **WhatsApp** on your phone
2. Go to **Settings** → **Linked Devices**
3. Tap **"Link a Device"**
4. Scan the displayed QR code
5. Wait for connection confirmation

### Step 5: Verify Connection
```bash
curl http://localhost:3000/api/devices/myphone/status
```

**When connected:**
```json
{
  "status": "connected",
  "qrCode": null,
  "lastUpdate": "2025-11-16T02:19:30.456Z"
}
```

---

## 🔄 QR Code Auto-Refresh

### Automatic Behavior
- QR codes **automatically refresh** every ~40 seconds
- This is **normal WhatsApp security behavior**
- System **automatically generates new QR codes**
- No user action required

### What You'll See in Logs
```
📱 [myphone] QR Code generated successfully
✅ [myphone] QR code data URL generated for frontend

[After ~40 seconds]

❌ [myphone] Connection closed due to: Stream Errored (restart required)
⚠️ [myphone] Session error during initial pairing - clearing corrupted session files
🧹 [myphone] Cleared session directory

[System auto-generates fresh QR]

📱 [myphone] QR Code generated successfully
✅ [myphone] QR code data URL generated for frontend
```

**This is EXPECTED and NORMAL behavior!**

---

## 📊 Device Status Values

| Status | Meaning | Has QR Code | Action Required |
|--------|---------|-------------|-----------------|
| `starting` | Device session initializing | No | Wait 1-2 seconds |
| `connecting` | Connecting to WhatsApp | No | Wait for QR or connection |
| `waiting_for_scan` | QR code ready | **Yes** | **Scan the QR code** |
| `connected` | Successfully linked | No | Ready to send messages |
| `reconnecting` | Temporary disconnect | No | Wait for auto-reconnect |
| `disconnected` | Logged out or failed | No | Remove and recreate |

---

## 🔧 Frontend Implementation

### Polling for Status Updates
```javascript
async function pollDeviceStatus(deviceId) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/devices/${deviceId}/status`);
    const status = await response.json();
    
    if (status.status === 'waiting_for_scan' && status.qrCode) {
      // Display QR code
      document.getElementById('qrImage').src = status.qrCode;
      document.getElementById('qrSection').style.display = 'block';
    } else if (status.status === 'connected') {
      // Clear QR, show success
      document.getElementById('qrSection').style.display = 'none';
      document.getElementById('successMessage').style.display = 'block';
      clearInterval(interval);
    }
  }, 3000); // Poll every 3 seconds
}
```

### React/Angular Example
```typescript
// Poll every 3 seconds
useEffect(() => {
  const interval = setInterval(() => {
    loadDeviceStatus(deviceId);
  }, 3000);
  
  return () => clearInterval(interval);
}, [deviceId]);

// Display QR code when available
{device.status === 'waiting_for_scan' && device.qrCode && (
  <img src={device.qrCode} alt="Scan this QR code with WhatsApp" />
)}
```

---

## 🛠️ Troubleshooting

### QR Code Not Appearing
1. **Wait 2-3 seconds** after creating device
2. **Check status:** `curl http://localhost:3000/api/devices/{DEVICE_ID}/status`
3. **Look for errors:** `pm2 logs whatsapp-api-gateway --lines 50`

### QR Code Keeps Refreshing
- **This is normal!** WhatsApp refreshes QR codes every ~40 seconds for security
- System automatically generates fresh codes
- Just scan when you see it - you have about 30-40 seconds

### Device Shows "Connected" But Not Paired
- **Old bug - NOW FIXED**
- If you still see this: Remove and recreate device
- Command: `curl -X DELETE http://localhost:3000/api/devices/{DEVICE_ID}`

### "Bad MAC Error" in Logs
- Indicates old corrupted session files
- **For NEW devices:** Auto-fixed by system
- **For OLD devices:** Remove and re-pair

**Remove device:**
```bash
curl -X DELETE http://localhost:3000/api/devices/{DEVICE_ID}
```

**Create fresh:**
```bash
curl -X POST http://localhost:3000/api/devices/{DEVICE_ID}/start
```

---

## 📱 Complete Example Flow

```bash
# 1. Create device
curl -X POST http://localhost:3000/api/devices/customer1/start
# Response: {"status":"starting","device":"customer1"}

# 2. Wait 2 seconds, then get QR code
sleep 2
curl http://localhost:3000/api/devices/customer1/status
# Response: {"status":"waiting_for_scan","qrCode":"data:image/png;base64,..."}

# 3. Extract and save QR code (optional)
curl -s http://localhost:3000/api/devices/customer1/status | \
  jq -r '.qrCode' | \
  sed 's/data:image\/png;base64,//' | \
  base64 -d > qrcode.png

# 4. Display qrcode.png to user or embed in HTML

# 5. User scans with WhatsApp

# 6. Verify connection
curl http://localhost:3000/api/devices/customer1/status
# Response: {"status":"connected","qrCode":null}

# 7. Send test message
curl -X POST http://localhost:3000/api/devices/customer1/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from WhatsApp API!"
  }'
```

---

## 🎯 Best Practices

### 1. Poll Status Regularly
- Poll every **3 seconds** when waiting for QR scan
- Poll every **5 seconds** for general monitoring
- Stop polling once `status === 'connected'`

### 2. Handle QR Refresh
- Don't show error when QR updates
- Simply display the new QR code
- Inform user: "QR code refreshed for security"

### 3. Timeout Handling
- If no scan after **5 minutes**, prompt user
- Option to generate new device/QR code
- Clear explanation of the process

### 4. Error Messages
- `starting` → "Initializing device..."
- `waiting_for_scan` → "Scan this QR code with WhatsApp"
- `connecting` → "Connecting to WhatsApp..."
- `reconnecting` → "Reconnecting to WhatsApp..."
- `disconnected` → "Connection failed. Please try again."
- `connected` → "Successfully connected to WhatsApp!"

---

## 📋 API Reference

### Create Device
**Endpoint:** `POST /api/devices/{deviceId}/start`  
**Response:** `{"status":"starting","device":"deviceId"}`

### Get Device Status
**Endpoint:** `GET /api/devices/{deviceId}/status`  
**Response:**
```json
{
  "status": "waiting_for_scan",
  "qrCode": "data:image/png;base64,...",
  "lastUpdate": "2025-11-16T02:18:05.123Z"
}
```

### Get All Devices
**Endpoint:** `GET /api/devices`  
**Response:**
```json
{
  "device1": {
    "status": "connected",
    "qrCode": null,
    "lastUpdate": "2025-11-16T02:20:00.000Z"
  },
  "device2": {
    "status": "waiting_for_scan",
    "qrCode": "data:image/png;base64,...",
    "lastUpdate": "2025-11-16T02:18:05.123Z"
  }
}
```

### Remove Device
**Endpoint:** `DELETE /api/devices/{deviceId}`  
**Response:**
```json
{
  "status": "removed",
  "device": "deviceId",
  "message": "Device deviceId and all associated session files have been removed."
}
```

---

## ✅ Summary

- **QR codes now work correctly** ✅
- **Auto-refresh every ~40 seconds** (normal behavior) ✅
- **System auto-cleans corrupted sessions** ✅
- **No false "connected" status** ✅
- **Ready for production use** ✅

For detailed technical information, see: `QR_CODE_FIX_SUMMARY.md`
