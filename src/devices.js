
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

// Configure Node.js options
process.env["NODE_OPTIONS"] = "--max-old-space-size=4096";

const sessions = {};
const deviceStatus = {};
const reconnectAttempts = {}; // Track reconnection attempts per device

async function createDeviceSession(deviceId, isReconnect = false) {
    console.log(`🚀 [${deviceId}] Starting device session...${isReconnect ? ' (reconnecting)' : ''}`);
    
    const sessionPath = path.join(__dirname, '..', 'sessions', deviceId);
    
    // Check if this is a fresh session (no session data)
    let hasExistingCreds = false;
    try {
        await fs.access(path.join(sessionPath, 'session'));
        hasExistingCreds = true;
        console.log(`📁 [${deviceId}] Found existing credentials`);
    } catch (err) {
        console.log(`📁 [${deviceId}] No existing credentials, will generate new QR code`);
    }
    
    // Create WhatsApp Web client
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: deviceId,
            dataPath: path.join(__dirname, '..', 'sessions')
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    sessions[deviceId] = client;
    
    // Initialize device status
    deviceStatus[deviceId] = {
        status: 'starting',
        qrCode: null,
        lastUpdate: new Date()
    };

    // QR Code event
    client.on('qr', async (qr) => {
        console.log(`📱 [${deviceId}] QR Code generated successfully`);
        console.log(`🔗 [${deviceId}] Scan the QR code with your WhatsApp`);
        try {
            // Generate QR code as data URL for frontend
            const qrCodeDataURL = await QRCode.toDataURL(qr);
            deviceStatus[deviceId] = {
                status: 'waiting_for_scan',
                qrCode: qrCodeDataURL,
                lastUpdate: new Date()
            };
            console.log(`✅ [${deviceId}] QR code data URL generated for frontend`);
            
            // Reset reconnect attempts when QR is shown
            reconnectAttempts[deviceId] = 0;
        } catch (err) {
            console.error(`❌ [${deviceId}] Failed to generate QR code:`, err);
        }
    });

    // Ready event
    client.on('ready', () => {
        console.log(`✅ [${deviceId}] WhatsApp connected successfully!`);
        console.log(`🤖 [${deviceId}] Device is ready to receive messages`);
        deviceStatus[deviceId] = {
            status: 'connected',
            qrCode: null,
            lastUpdate: new Date()
        };
        // Reset reconnect counter on successful connection
        reconnectAttempts[deviceId] = 0;
    });

    // Authenticated event
    client.on('authenticated', () => {
        console.log(`🔐 [${deviceId}] Authentication successful`);
    });

    // Authentication failure event
    client.on('auth_failure', async (msg) => {
        console.error(`❌ [${deviceId}] Authentication failed:`, msg);
        
        // Clear session and regenerate QR
        try {
            await fs.rm(path.join(sessionPath, deviceId), { recursive: true, force: true });
            console.log(`🧹 [${deviceId}] Cleared session directory`);
        } catch (cleanupErr) {
            console.error(`❌ [${deviceId}] Error cleaning session:`, cleanupErr.message);
        }
        
        deviceStatus[deviceId] = {
            status: 'disconnected',
            qrCode: null,
            lastUpdate: new Date()
        };
        
        delete sessions[deviceId];
        delete reconnectAttempts[deviceId];
    });

    // Disconnected event
    client.on('disconnected', async (reason) => {
        console.log(`❌ [${deviceId}] Client disconnected:`, reason);
        
        // Don't reconnect if manually logged out
        if (reason === 'LOGOUT') {
            console.log(`🚪 [${deviceId}] Logged out. Device session ended.`);
            deviceStatus[deviceId] = {
                status: 'disconnected',
                qrCode: null,
                lastUpdate: new Date()
            };
            delete sessions[deviceId];
            delete reconnectAttempts[deviceId];
            return;
        }
        
        // Track reconnection attempts
        if (!reconnectAttempts[deviceId]) {
            reconnectAttempts[deviceId] = 0;
        }
        reconnectAttempts[deviceId]++;
        
        // Limit reconnection attempts for devices without credentials
        if (!hasExistingCreds && reconnectAttempts[deviceId] > 3) {
            console.log(`⛔ [${deviceId}] Too many reconnection attempts without valid credentials`);
            deviceStatus[deviceId] = {
                status: 'disconnected',
                qrCode: null,
                lastUpdate: new Date()
            };
            delete sessions[deviceId];
            delete reconnectAttempts[deviceId];
            return;
        }
        
        // For other errors with existing credentials, attempt reconnection
        if (hasExistingCreds) {
            console.log(`🔄 [${deviceId}] Attempting to reconnect in 5 seconds... (attempt ${reconnectAttempts[deviceId]})`);
            deviceStatus[deviceId] = {
                status: 'reconnecting',
                qrCode: null,
                lastUpdate: new Date()
            };
            
            setTimeout(() => {
                createDeviceSession(deviceId, true);
            }, 5000);
        } else {
            console.log(`⚠️ [${deviceId}] No valid credentials for reconnection`);
            deviceStatus[deviceId] = {
                status: 'disconnected',
                qrCode: null,
                lastUpdate: new Date()
            };
        }
    });

    // Loading screen event
    client.on('loading_screen', (percent, message) => {
        console.log(`⏳ [${deviceId}] Loading... ${percent}% - ${message}`);
        deviceStatus[deviceId] = {
            status: 'connecting',
            qrCode: deviceStatus[deviceId]?.qrCode || null,
            lastUpdate: new Date()
        };
    });

    // Initialize the client
    try {
        await client.initialize();
        console.log(`🎯 [${deviceId}] Client initialization started`);
    } catch (err) {
        console.error(`❌ [${deviceId}] Failed to initialize client:`, err);
        deviceStatus[deviceId] = {
            status: 'disconnected',
            qrCode: null,
            lastUpdate: new Date()
        };
        throw err;
    }

    return client;
}

function getSession(deviceId) {
    return sessions[deviceId] || null;
}

function getDeviceStatus(deviceId) {
    return deviceStatus[deviceId] || null;
}

function getAllDevicesStatus() {
    return deviceStatus;
}

async function removeDevice(deviceId) {
    console.log(`🗑️ [${deviceId}] Removing device and cleaning up session files...`);
    
    // Close the WhatsApp connection if it exists
    if (sessions[deviceId]) {
        try {
            await sessions[deviceId].destroy();
            console.log(`📱 [${deviceId}] WhatsApp connection closed`);
        } catch (err) {
            console.error(`❌ [${deviceId}] Error closing connection:`, err.message);
        }
        delete sessions[deviceId];
    }
    
    // Remove from device status and reconnect attempts
    delete deviceStatus[deviceId];
    delete reconnectAttempts[deviceId];
    
    // Remove session files from filesystem
    const sessionPath = path.join(__dirname, '..', 'sessions', deviceId);
    try {
        await fs.access(sessionPath);
        await fs.rm(sessionPath, { recursive: true, force: true });
        console.log(`🧹 [${deviceId}] Session directory removed: ${sessionPath}`);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`📁 [${deviceId}] Session directory does not exist: ${sessionPath}`);
        } else {
            console.error(`❌ [${deviceId}] Error removing session directory:`, err.message);
            throw err;
        }
    }
    
    console.log(`✅ [${deviceId}] Device removed successfully`);
}

module.exports = {
    createDeviceSession,
    getSession,
    getDeviceStatus,
    getAllDevicesStatus,
    removeDevice
};
