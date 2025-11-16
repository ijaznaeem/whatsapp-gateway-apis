# WhatsApp Multi-Device API with Resource Monitoring

A comprehensive WhatsApp Multi-Device API built with Node.js and Angular, featuring real-time system resource monitoring and a modern web interface for device management.

## Features

### 🚀 Core Features
- **Multi-Device Support**: Manage multiple WhatsApp device sessions simultaneously
- **QR Code Authentication**: Visual QR code display for device pairing
- **Message Sending**: Send text messages through connected devices
- **Real-time Status**: Live device status updates and monitoring
- **Web Interface**: Modern Angular frontend with Material Design

### 📊 System Monitoring
- **CPU Usage**: Real-time CPU load per core and average usage
- **Memory Usage**: Live memory consumption with detailed breakdown
- **Network Stats**: Network interface monitoring with transfer rates
- **Process Information**: Top processes with CPU and memory usage
- **System Overview**: Hostname, platform, uptime, and hardware info

### 🔧 API Endpoints
- `GET /api/devices` - Enumerate all registered devices
- `GET /api/devices/:id/status` - Get specific device status
- `POST /api/devices/:id/start` - Start new device session
- `DELETE /api/devices/:id` - Remove device session
- `POST /api/devices/:id/send` - Send messages
- `GET /api/system` - System resource monitoring

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Baileys** - WhatsApp Web multi-device library
- **systeminformation** - System monitoring
- **QRCode** - QR code generation
- **CORS** - Cross-origin support

### Frontend
- **Angular 18** - Frontend framework
- **Angular Material** - UI component library
- **TypeScript** - Type-safe development
- **RxJS** - Reactive programming
- **SCSS** - Styling

## Installation

1. **Clone or extract the project**
   ```bash
   cd whatsapp_api_gateway
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This will automatically install both backend and frontend dependencies.

3. **Build the frontend**
   ```bash
   npm run build
   ```

## Usage

### Starting the Application

1. **Start the server**
   ```bash
   npm start
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - API endpoints: http://localhost:3000/api

### Using the Frontend

1. **Add a Device**
   - Go to the "Device Management" tab
   - Enter a unique device ID (e.g., "device1", "phone-01")
   - Click "Start Device"
   - The device will appear in the list with "Starting" status

2. **Connect WhatsApp**
   - Check your terminal/console for QR codes
   - Scan the QR code with WhatsApp mobile app
   - Device status will change to "Connected" once linked

3. **Send Messages**
   - Go to the "Send Messages" tab
   - Select a connected device
   - Enter phone number (with country code, e.g., +1234567890)
   - Type your message
   - Click "Send Message"

### API Endpoints

#### Start Device Session
```http
POST /api/devices/:id/start
```
Starts a new WhatsApp device session.

#### Send Message
```http
POST /api/devices/:id/send
Content-Type: application/json

{
  "to": "1234567890@s.whatsapp.net",
  "message": "Hello, World!"
}
```

## Project Structure

```
whatsapp_api_gateway/
├── src/                          # Backend source code
│   ├── index.js                  # Main server file
│   ├── devices.js                # WhatsApp device management
│   └── routes/
│       └── api.js                # API routes
├── frontend/                     # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.ts           # Main app component
│   │   │   ├── app.html         # App template
│   │   │   ├── app.scss         # App styles
│   │   │   └── services/
│   │   │       └── whatsapp-api.service.ts
│   │   ├── styles.scss          # Global styles
│   │   └── index.html           # HTML entry point
│   └── dist/                     # Built frontend files
├── sessions/                     # WhatsApp session data
├── media/                        # Media files storage
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## Development

### Frontend Development
```bash
# Start Angular development server
npm run frontend:dev
```
The frontend will be available at http://localhost:4200

### Backend Development
```bash
# Start backend only
npm run dev
```
The API will be available at http://localhost:3000

## Features Overview

### Device Management
- Add new WhatsApp devices
- View device connection status
- Remove devices from the list
- Real-time status updates

### Message Sending
- Select from connected devices
- Phone number validation
- Message validation
- Success/error notifications

### User Interface
- Clean, modern Material Design
- Responsive layout for all screen sizes
- Dark/light theme support
- Loading indicators
- Error handling with user-friendly messages

## Notes

- Device sessions are persistent and stored in the `sessions/` folder
- QR codes appear in the terminal when starting a new device
- Each device needs to be scanned once with WhatsApp mobile app
- Media files are stored in the `media/` folder

## Troubleshooting

1. **Device won't connect**
   - Check terminal for QR code
   - Ensure QR code is scanned within time limit
   - Try removing and re-adding the device

2. **Messages not sending**
   - Verify device is in "Connected" status
   - Check phone number format (include country code)
   - Ensure recipient has WhatsApp installed

3. **Frontend not loading**
   - Run `npm run build` to rebuild frontend
   - Check if server is running on correct port
   - Clear browser cache

## License

MIT License - feel free to use this project for personal or commercial purposes.
