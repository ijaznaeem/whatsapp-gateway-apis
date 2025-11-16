// SSL and Connection Test
const https = require('https');
const tls = require('tls');

console.log('🔍 Testing SSL/TLS connectivity to WhatsApp servers...');

// Test 1: Basic HTTPS connectivity
console.log('\n1. Testing HTTPS connection to web.whatsapp.com...');
const options = {
    hostname: 'web.whatsapp.com',
    port: 443,
    path: '/',
    method: 'GET',
    rejectUnauthorized: true,
    timeout: 10000
};

const req = https.request(options, (res) => {
    console.log('✅ HTTPS Status:', res.statusCode);
    console.log('✅ TLS Version:', res.socket.getProtocol());
    console.log('✅ Cipher:', res.socket.getCipher());
});

req.on('error', (e) => {
    console.log('❌ HTTPS Error:', e.message);
    
    // Test 2: Try with disabled SSL verification
    console.log('\n2. Testing with disabled SSL verification...');
    const optionsInsecure = { ...options, rejectUnauthorized: false };
    
    const req2 = https.request(optionsInsecure, (res) => {
        console.log('✅ HTTPS (insecure) Status:', res.statusCode);
        console.log('✅ TLS Version:', res.socket.getProtocol());
    });
    
    req2.on('error', (e2) => {
        console.log('❌ HTTPS (insecure) Error:', e2.message);
    });
    
    req2.end();
});

req.setTimeout(10000, () => {
    console.log('❌ HTTPS request timeout');
    req.destroy();
});

req.end();

// Test 3: WebSocket-related domains
console.log('\n3. Testing WhatsApp WebSocket endpoints...');
const wsEndpoints = [
    'web.whatsapp.com',
    'w1.web.whatsapp.com',
    'w2.web.whatsapp.com',
    'w3.web.whatsapp.com'
];

wsEndpoints.forEach((endpoint, index) => {
    setTimeout(() => {
        const socket = tls.connect(443, endpoint, { 
            rejectUnauthorized: false,
            timeout: 5000 
        }, () => {
            console.log(`✅ TLS connection to ${endpoint} successful`);
            socket.end();
        });
        
        socket.on('error', (err) => {
            console.log(`❌ TLS connection to ${endpoint} failed:`, err.message);
        });
        
        socket.setTimeout(5000, () => {
            console.log(`⏰ TLS connection to ${endpoint} timeout`);
            socket.destroy();
        });
    }, index * 1000);
});

// Test 4: Check system SSL configuration
console.log('\n4. System SSL Configuration:');
console.log('Node.js version:', process.version);
console.log('OpenSSL version:', process.versions.openssl);
console.log('TLS settings:', tls.DEFAULT_CIPHERS ? 'Available' : 'Not available');

setTimeout(() => {
    process.exit(0);
}, 10000);