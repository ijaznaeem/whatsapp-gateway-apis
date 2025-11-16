require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['http://185.197.251.107:8080', 'https://185.197.251.107:8080']  // VPS URL
    : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:8080'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(bodyParser.json());

// API routes
app.use('/api', apiRoutes);

// Serve Angular static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve Angular app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Multi-Device WhatsApp API running on http://localhost:${PORT}`);
    console.log(`📱 Frontend available at http://localhost:${PORT}`);
    console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
});
