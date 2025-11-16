const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const path = require('path');
const { saveMediaFile } = require('./utils/file');
const { sendWebhook } = require('./webhook');
const pino = require('pino');

// Create logger
const logger = pino({ level: 'silent' }); // Set to 'info' for more verbose logging

let sock;

async function initBaileysClient(io) {
  console.log('🚀 Initializing Baileys WhatsApp client...');
  
  // Fetch latest version info
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📱 Using WhatsApp version ${version.join('.')}, isLatest: ${isLatest}`);
  
  const { state, saveCreds } = await useMultiFileAuthState(path.resolve(__dirname, '../sessions'));

  sock = makeWASocket({ 
    auth: state,
    logger,
    version,
    printQRInTerminal: false,
    defaultQueryTimeoutMs: 60 * 1000, // 60 seconds timeout
    keepAliveIntervalMs: 30 * 1000, // Keep connection alive
    retryRequestDelayMs: 2000,
    maxMsgRetryCount: 3,
    connectTimeoutMs: 60 * 1000,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr && io) {
      console.log('📱 QR Code generated for main session');
      io.emit('qr', qr);
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Connection closed. Reconnecting...', shouldReconnect);
      if (shouldReconnect) {
        console.log('🔄 Attempting to reconnect in 5 seconds...');
        setTimeout(() => initBaileysClient(io), 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected successfully!');
      io?.emit('ready', true);
    } else if (connection === 'connecting') {
      console.log('🔄 Connecting to WhatsApp...');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    const sender = msg.key.remoteJid;

    if (msg.message.imageMessage || msg.message.videoMessage || msg.message.documentMessage || msg.message.audioMessage) {
      const mediaType = Object.keys(msg.message)[0];
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: console });
      const filePath = saveMediaFile(buffer, mediaType);
      console.log(`📥 Media received from ${sender}: saved to ${filePath}`);

      await sendWebhook({
        type: 'media',
        from: sender,
        mediaType,
        filePath,
        timestamp: new Date().toISOString()
      });
    } else {
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      console.log(`📥 Received message from ${sender}: ${text}`);

      await sendWebhook({
        type: 'text',
        from: sender,
        message: text,
        timestamp: new Date().toISOString()
      });
    }
  });
}

function getClient() {
  return sock;
}

module.exports = {
  initBaileysClient,
  getClient
};
