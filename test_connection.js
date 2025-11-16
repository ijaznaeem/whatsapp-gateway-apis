require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const path = require('path');

async function testConnection() {
    console.log('🔄 Testing WhatsApp connection...');
    
    try {
        const sessionPath = path.join(__dirname, 'sessions', 'test_simple');
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        console.log('📱 Creating WhatsApp socket...');
        const sock = makeWASocket({ 
            auth: state,
            printQRInTerminal: true,  // Print QR in terminal for testing
            browser: ['Test', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60_000,
            qrTimeout: 120_000
        });
        
        sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            console.log('📡 Connection update:', connection);
            
            if (qr) {
                console.log('🎯 QR CODE GENERATED!');
                console.log('QR Length:', qr.length);
            }
            
            if (connection === 'open') {
                console.log('✅ Successfully connected to WhatsApp!');
                process.exit(0);
            }
            
            if (connection === 'close') {
                console.log('❌ Connection closed');
                console.log('Last disconnect:', lastDisconnect);
                process.exit(1);
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        // Timeout after 2 minutes
        setTimeout(() => {
            console.log('⏰ Test timeout - no QR code generated in 2 minutes');
            process.exit(1);
        }, 120000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testConnection();