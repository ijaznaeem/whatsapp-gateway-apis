const express = require('express');
const router = express.Router();
const { createDeviceSession, getSession, getDeviceStatus, getAllDevicesStatus, removeDevice } = require('../devices');
const { validateApiKey } = require('../middleware/apiKeyAuth');
const si = require('systeminformation');
const os = require('os');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// System resource monitoring endpoint
router.get('/system', async (req, res) => {
    try {
        const [cpu, memory, currentLoad, networkStats, processes] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.currentLoad(),
            si.networkStats(),
            si.processes()
        ]);

        const systemInfo = {
            timestamp: new Date().toISOString(),
            uptime: os.uptime(),
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            cpu: {
                manufacturer: cpu.manufacturer,
                brand: cpu.brand,
                cores: cpu.cores,
                physicalCores: cpu.physicalCores,
                speed: cpu.speed,
                currentLoad: currentLoad.currentLoad,
                avgLoad: currentLoad.avgLoad,
                cpus: currentLoad.cpus.map(c => ({
                    load: c.load,
                    loadUser: c.loadUser,
                    loadSystem: c.loadSystem
                }))
            },
            memory: {
                total: memory.total,
                free: memory.free,
                used: memory.used,
                active: memory.active,
                available: memory.available,
                usagePercent: ((memory.used / memory.total) * 100).toFixed(2)
            },
            network: networkStats.map(net => ({
                iface: net.iface,
                operstate: net.operstate,
                rx_bytes: net.rx_bytes,
                tx_bytes: net.tx_bytes,
                rx_sec: net.rx_sec,
                tx_sec: net.tx_sec
            })),
            processes: {
                all: processes.all,
                running: processes.running,
                blocked: processes.blocked,
                sleeping: processes.sleeping,
                list: processes.list.slice(0, 10).map(p => ({
                    pid: p.pid,
                    name: p.name,
                    cpu: p.cpu,
                    mem: p.mem
                }))
            },
            loadAverage: os.loadavg(),
            freemem: os.freemem(),
            totalmem: os.totalmem()
        };

        res.json(systemInfo);
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to fetch system information', 
            details: error.message 
        });
    }
});

// Get all devices status
router.get('/devices', (req, res) => {
    const devicesStatus = getAllDevicesStatus();
    res.json(devicesStatus);
});

// Get specific device status
router.get('/devices/:id/status', (req, res) => {
    const { id } = req.params;
    const status = getDeviceStatus(id);
    if (!status) {
        return res.status(404).json({ error: 'Device not found' });
    }
    res.json(status);
});

// Start device
router.post('/devices/:id/start', async (req, res) => {
    const { id } = req.params;
    try {
        await createDeviceSession(id);
        res.json({ status: 'starting', device: id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to start device', details: err.message });
    }
});

// Remove device
router.delete('/devices/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await removeDevice(id);
        res.json({ 
            status: 'removed', 
            device: id,
            message: `Device ${id} and all associated session files have been removed. User must rescan WhatsApp QR code to reconnect.`
        });
    } catch (err) {
        console.error(`Failed to remove device ${id}:`, err);
        res.status(500).json({ 
            error: 'Failed to remove device', 
            details: err.message,
            device: id
        });
    }
});

// Send text message
router.post('/devices/:id/send', async (req, res) => {
    const { id } = req.params;
    const { to, message } = req.body;

    const client = getSession(id);
    if (!client) return res.status(404).json({ error: 'Device not found or not started' });

    try {
        // Format phone number for whatsapp-web.js (remove @s.whatsapp.net if present)
        const phoneNumber = to.replace('@s.whatsapp.net', '') + '@c.us';
        await client.sendMessage(phoneNumber, message);
        res.json({ status: 'sent', to, type: 'text' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message', details: err.message });
    }
});

// Send media message (image/document)
router.post('/devices/:id/send-media', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { to, caption } = req.body;

    const client = getSession(id);
    if (!client) return res.status(404).json({ error: 'Device not found or not started' });

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const filePath = req.file.path;
        const mimetype = req.file.mimetype;
        
        // Format phone number for whatsapp-web.js
        const phoneNumber = to.replace('@s.whatsapp.net', '') + '@c.us';
        
        // Import MessageMedia from whatsapp-web.js
        const { MessageMedia } = require('whatsapp-web.js');
        const media = MessageMedia.fromFilePath(filePath);
        
        if (mimetype.startsWith('image/')) {
            await client.sendMessage(phoneNumber, media, { caption: caption || '' });
        } else {
            await client.sendMessage(phoneNumber, media, { 
                caption: caption || '',
                sendMediaAsDocument: true
            });
        }
        
        // Clean up uploaded file after sending
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }, 1000);

        res.json({ 
            status: 'sent', 
            to, 
            type: mimetype.startsWith('image/') ? 'image' : 'document',
            filename: req.file.originalname 
        });
    } catch (err) {
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to send media message', details: err.message });
    }
});

// Database connection configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '123',
    database: 'db_waapi'
};

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming default country)
    if (!cleaned.startsWith('92') && cleaned.length === 10) {
        cleaned = '92' + cleaned;
    }
    
    return cleaned + '@s.whatsapp.net';
};

// Helper function to get user's WhatsApp instances
const getUserInstances = async (userId) => {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM whats_app_instances WHERE user_id = ? AND status = "connected" ORDER BY updated_at DESC',
            [userId]
        );
        return rows;
    } finally {
        await connection.end();
    }
};

// NEW API ENDPOINTS WITH API KEY AUTHENTICATION

// Send text message via API key
router.post('/v1/send-message', validateApiKey, async (req, res) => {
    try {
        const { to, message, instance_id } = req.body;
        
        // Validate required fields
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Both "to" and "message" fields are required'
            });
        }

        // Get user's instances
        const userInstances = await getUserInstances(req.user.id);
        
        if (userInstances.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No instances available',
                message: 'No connected WhatsApp instances found for your account'
            });
        }

        // Select instance (use specified instance_id or first available)
        let selectedInstance = userInstances[0];
        if (instance_id) {
            const requestedInstance = userInstances.find(inst => inst.instance_id === instance_id);
            if (requestedInstance) {
                selectedInstance = requestedInstance;
            }
        }

        const sessionId = selectedInstance.instance_id;
        const session = getSession(sessionId);
        
        if (!session) {
            return res.status(503).json({ 
                success: false,
                error: 'Service unavailable',
                message: 'WhatsApp session not found for the selected instance' 
            });
        }
        
        const formattedNumber = formatPhoneNumber(to);
        // Format for whatsapp-web.js
        const phoneNumber = formattedNumber.replace('@s.whatsapp.net', '') + '@c.us';
        await session.sendMessage(phoneNumber, message);
        
        res.json({ 
            success: true,
            message: 'Message sent successfully',
            data: {
                to: formattedNumber,
                message: message,
                instance_id: selectedInstance.instance_id,
                instance_name: selectedInstance.name,
                sent_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error sending message via API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: 'Failed to send message',
            technical_error: error.message 
        });
    }
});

// Send media message via API key
router.post('/v1/send-media', validateApiKey, upload.single('file'), async (req, res) => {
    try {
        const { to, caption, type, instance_id } = req.body;
        const file = req.file;
        
        // Validate required fields
        if (!to || !file || !type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Fields "to", "file", and "type" are required'
            });
        }

        if (!['image', 'document'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid type',
                message: 'Type must be either "image" or "document"'
            });
        }

        // Get user's instances
        const userInstances = await getUserInstances(req.user.id);
        
        if (userInstances.length === 0) {
            // Clean up uploaded file
            if (file && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            return res.status(400).json({
                success: false,
                error: 'No instances available',
                message: 'No connected WhatsApp instances found for your account'
            });
        }

        // Select instance
        let selectedInstance = userInstances[0];
        if (instance_id) {
            const requestedInstance = userInstances.find(inst => inst.instance_id === instance_id);
            if (requestedInstance) {
                selectedInstance = requestedInstance;
            }
        }

        const sessionId = selectedInstance.instance_id;
        const session = getSession(sessionId);
        
        if (!session) {
            // Clean up uploaded file
            if (file && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            return res.status(503).json({ 
                success: false,
                error: 'Service unavailable',
                message: 'WhatsApp session not found for the selected instance' 
            });
        }
        
        const formattedNumber = formatPhoneNumber(to);
        // Format for whatsapp-web.js
        const phoneNumber = formattedNumber.replace('@s.whatsapp.net', '') + '@c.us';
        
        // Use MessageMedia from whatsapp-web.js
        const { MessageMedia } = require('whatsapp-web.js');
        const media = MessageMedia.fromFilePath(file.path);
        
        if (type === 'image') {
            await session.sendMessage(phoneNumber, media, { caption: caption || '' });
        } else if (type === 'document') {
            await session.sendMessage(phoneNumber, media, { 
                caption: caption || '',
                sendMediaAsDocument: true
            });
        }
        
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        
        res.json({ 
            success: true,
            message: 'Media sent successfully',
            data: {
                to: formattedNumber,
                type: type,
                filename: file.originalname,
                caption: caption || '',
                instance_id: selectedInstance.instance_id,
                instance_name: selectedInstance.name,
                sent_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error sending media via API:', error);
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: 'Failed to send media',
            technical_error: error.message 
        });
    }
});

// Get user's WhatsApp instances via API key
router.get('/v1/instances', validateApiKey, async (req, res) => {
    try {
        const userInstances = await getUserInstances(req.user.id);
        
        res.json({
            success: true,
            message: 'Instances retrieved successfully',
            data: userInstances.map(instance => ({
                instance_id: instance.instance_id,
                name: instance.name,
                status: instance.status,
                updated_at: instance.updated_at
            }))
        });
    } catch (error) {
        console.error('Error getting instances via API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to retrieve instances',
            technical_error: error.message
        });
    }
});

// Delete WhatsApp instance via API key (with session cleanup)
router.delete('/v1/instances/:instanceId', validateApiKey, async (req, res) => {
    try {
        const { instanceId } = req.params;
        
        if (!instanceId) {
            return res.status(400).json({
                success: false,
                error: 'Missing instance ID',
                message: 'Instance ID is required'
            });
        }

        // Verify the instance belongs to the authenticated user
        const userInstances = await getUserInstances(req.user.id);
        const targetInstance = userInstances.find(inst => inst.instance_id === instanceId);
        
        if (!targetInstance) {
            return res.status(404).json({
                success: false,
                error: 'Instance not found',
                message: 'The specified instance was not found or does not belong to your account'
            });
        }

        // Remove the device session and files
        await removeDevice(instanceId);

        // Update database status
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.execute(
                'UPDATE whats_app_instances SET status = "disconnected", updated_at = NOW() WHERE instance_id = ? AND user_id = ?',
                [instanceId, req.user.id]
            );
        } finally {
            await connection.end();
        }

        res.json({
            success: true,
            message: 'Instance deleted successfully',
            data: {
                instance_id: instanceId,
                instance_name: targetInstance.name,
                deleted_at: new Date().toISOString(),
                note: 'All session files have been removed. You will need to scan the QR code again to reconnect this instance.'
            }
        });
    } catch (error) {
        console.error('Error deleting instance via API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to delete instance',
            technical_error: error.message
        });
    }
});

// Legacy API routes (without v1 prefix) for backward compatibility
// Get instances (legacy)
router.get('/instances', validateApiKey, async (req, res) => {
    try {
        const userInstances = await getUserInstances(req.user.id);
        
        res.json({
            success: true,
            message: 'Instances retrieved successfully',
            instances: userInstances.map(instance => ({
                id: instance.instance_id,
                name: instance.name,
                status: instance.status,
                updated_at: instance.updated_at
            }))
        });
    } catch (error) {
        console.error('Error getting instances via legacy API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to retrieve instances',
            technical_error: error.message
        });
    }
});

// Send message (legacy)
router.post('/send-message', validateApiKey, async (req, res) => {
    try {
        const { instanceId, to, message } = req.body;
        
        // Validate required fields
        if (!instanceId || !to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Fields "instanceId", "to", and "message" are required'
            });
        }

        // Get user's instances to verify ownership
        const userInstances = await getUserInstances(req.user.id);
        const selectedInstance = userInstances.find(inst => inst.instance_id === instanceId);
        
        if (!selectedInstance) {
            return res.status(404).json({
                success: false,
                error: 'Instance not found',
                message: 'The specified instance was not found or does not belong to your account'
            });
        }

        if (selectedInstance.status !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Instance not connected',
                message: 'The selected WhatsApp instance is not connected'
            });
        }

        // Get WhatsApp session
        const session = getSession(instanceId);
        if (!session) {
            return res.status(503).json({ 
                success: false,
                error: 'Service unavailable',
                message: 'WhatsApp session not found for the selected instance' 
            });
        }
        
        const formattedNumber = formatPhoneNumber(to);
        // Format for whatsapp-web.js
        const phoneNumber = formattedNumber.replace('@s.whatsapp.net', '') + '@c.us';
        await session.sendMessage(phoneNumber, message);
        
        res.json({ 
            success: true,
            message: 'Message sent successfully',
            data: {
                to: formattedNumber,
                message: message,
                instance_id: selectedInstance.instance_id,
                instance_name: selectedInstance.name,
                sent_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error sending message via legacy API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: 'Failed to send message',
            technical_error: error.message 
        });
    }
});

module.exports = router;
