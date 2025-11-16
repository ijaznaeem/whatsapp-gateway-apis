# WhatsApp API with API Key Authentication

This document describes how to use the WhatsApp API endpoints with API key authentication.

## Overview

The WhatsApp API now supports API key authentication, allowing developers to send messages programmatically without needing to manage user sessions or authentication tokens.

## Setup

### 1. Create an API Key

1. Log in to your WhatsApp API dashboard at `http://127.0.0.1:8000`
2. Navigate to **API Keys** section
3. Click **Create New API Key**
4. Fill in the details:
   - **Name**: Descriptive name for your API key
   - **Expiration Date** (optional): When the key should expire
   - **Usage Limit** (optional): Maximum number of API calls
5. Save the API key securely (it will only be shown once)

### 2. API Endpoints

Base URL: `http://localhost:8080/api`

All API endpoints require authentication using your API key.

## Authentication

Include your API key in the `Authorization` header:

```
Authorization: Bearer wapi_your_api_key_here
```

Or simply:

```
Authorization: wapi_your_api_key_here
```

## Endpoints

### 1. Send Text Message

**Endpoint:** `POST /v1/send-message`

**Headers:**
```
Authorization: Bearer wapi_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "to": "923xxxxxxxxx",
  "message": "Hello from API!",
  "instance_id": "optional_instance_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "to": "923xxxxxxxxx@s.whatsapp.net",
    "message": "Hello from API!",
    "instance_id": "instance_123",
    "instance_name": "My Instance",
    "sent_at": "2025-08-25T07:30:00.000Z"
  }
}
```

### 2. Send Media Message (Image/Document)

**Endpoint:** `POST /v1/send-media`

**Headers:**
```
Authorization: Bearer wapi_your_api_key_here
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `to`: Phone number (required)
- `type`: "image" or "document" (required)
- `file`: File upload (required)
- `caption`: Optional caption text
- `instance_id`: Optional instance ID

**Response:**
```json
{
  "success": true,
  "message": "Media sent successfully",
  "data": {
    "to": "923xxxxxxxxx@s.whatsapp.net",
    "type": "image",
    "filename": "example.jpg",
    "caption": "Check this out!",
    "instance_id": "instance_123",
    "instance_name": "My Instance",
    "sent_at": "2025-08-25T07:30:00.000Z"
  }
}
```

### 3. Get Your WhatsApp Instances

**Endpoint:** `GET /v1/instances`

**Headers:**
```
Authorization: Bearer wapi_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "message": "Instances retrieved successfully",
  "data": [
    {
      "instance_id": "instance_123",
      "name": "My Instance",
      "status": "connected",
      "updated_at": "2025-08-25T07:00:00.000Z"
    }
  ]
}
```

## Example Code

### JavaScript (Node.js/Fetch API)

```javascript
const API_BASE_URL = 'http://localhost:8080/api';
const API_KEY = 'wapi_your_api_key_here';

// Send text message
async function sendTextMessage(to, message) {
  const response = await fetch(`${API_BASE_URL}/v1/send-message`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: to,
      message: message
    })
  });
  
  const result = await response.json();
  console.log('Message sent:', result);
  return result;
}

// Send image
async function sendImage(to, imageFile, caption = '') {
  const formData = new FormData();
  formData.append('to', to);
  formData.append('type', 'image');
  formData.append('file', imageFile);
  formData.append('caption', caption);

  const response = await fetch(`${API_BASE_URL}/v1/send-media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    },
    body: formData
  });
  
  const result = await response.json();
  console.log('Image sent:', result);
  return result;
}

// Get instances
async function getInstances() {
  const response = await fetch(`${API_BASE_URL}/v1/instances`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  const result = await response.json();
  console.log('Instances:', result);
  return result;
}

// Example usage
sendTextMessage('923001234567', 'Hello from API!');
```

### PHP (cURL)

```php
<?php

class WhatsAppAPI {
    private $baseUrl = 'http://localhost:8080/api';
    private $apiKey;
    
    public function __construct($apiKey) {
        $this->apiKey = $apiKey;
    }
    
    public function sendTextMessage($to, $message, $instanceId = null) {
        $data = [
            'to' => $to,
            'message' => $message
        ];
        
        if ($instanceId) {
            $data['instance_id'] = $instanceId;
        }
        
        return $this->makeRequest('/v1/send-message', $data);
    }
    
    public function sendMedia($to, $filePath, $type, $caption = '', $instanceId = null) {
        $data = [
            'to' => $to,
            'type' => $type,
            'caption' => $caption
        ];
        
        if ($instanceId) {
            $data['instance_id'] = $instanceId;
        }
        
        $file = new CURLFile($filePath);
        $data['file'] = $file;
        
        return $this->makeRequest('/v1/send-media', $data, true);
    }
    
    public function getInstances() {
        return $this->makeRequest('/v1/instances', null, false, 'GET');
    }
    
    private function makeRequest($endpoint, $data = null, $isFile = false, $method = 'POST') {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . $endpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->apiKey,
                ...$isFile ? [] : ['Content-Type: application/json']
            ]
        ]);
        
        if ($data && $method !== 'GET') {
            if ($isFile) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            } else {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return [
            'http_code' => $httpCode,
            'response' => json_decode($response, true)
        ];
    }
}

// Example usage
$api = new WhatsAppAPI('wapi_your_api_key_here');

// Send text message
$result = $api->sendTextMessage('923001234567', 'Hello from PHP API!');
echo "Text message result: " . print_r($result, true) . "\n";

// Send image
$result = $api->sendMedia('923001234567', '/path/to/image.jpg', 'image', 'Check this out!');
echo "Image result: " . print_r($result, true) . "\n";

// Get instances
$result = $api->getInstances();
echo "Instances: " . print_r($result, true) . "\n";
?>
```

### Python (requests)

```python
import requests
import json

class WhatsAppAPI:
    def __init__(self, api_key):
        self.base_url = 'http://localhost:8080/api'
        self.api_key = api_key
        self.headers = {
            'Authorization': f'Bearer {api_key}'
        }
    
    def send_text_message(self, to, message, instance_id=None):
        data = {
            'to': to,
            'message': message
        }
        
        if instance_id:
            data['instance_id'] = instance_id
        
        headers = {**self.headers, 'Content-Type': 'application/json'}
        
        response = requests.post(
            f'{self.base_url}/v1/send-message',
            headers=headers,
            data=json.dumps(data)
        )
        
        return response.json()
    
    def send_media(self, to, file_path, media_type, caption='', instance_id=None):
        data = {
            'to': to,
            'type': media_type,
            'caption': caption
        }
        
        if instance_id:
            data['instance_id'] = instance_id
        
        with open(file_path, 'rb') as file:
            files = {'file': file}
            
            response = requests.post(
                f'{self.base_url}/v1/send-media',
                headers=self.headers,
                data=data,
                files=files
            )
        
        return response.json()
    
    def get_instances(self):
        response = requests.get(
            f'{self.base_url}/v1/instances',
            headers=self.headers
        )
        
        return response.json()

# Example usage
api = WhatsAppAPI('wapi_your_api_key_here')

# Send text message
result = api.send_text_message('923001234567', 'Hello from Python API!')
print('Text message result:', result)

# Send image
result = api.send_media('923001234567', '/path/to/image.jpg', 'image', 'Check this out!')
print('Image result:', result)

# Get instances
result = api.get_instances()
print('Instances:', result)
```

## Error Handling

### Common Error Responses

**Invalid API Key:**
```json
{
  "success": false,
  "error": "Invalid API key",
  "message": "API key not found or inactive"
}
```

**Missing Required Fields:**
```json
{
  "success": false,
  "error": "Missing required fields",
  "message": "Both \"to\" and \"message\" fields are required"
}
```

**No Instances Available:**
```json
{
  "success": false,
  "error": "No instances available",
  "message": "No connected WhatsApp instances found for your account"
}
```

**Usage Limit Exceeded:**
```json
{
  "success": false,
  "error": "Usage limit exceeded",
  "message": "API key usage limit has been reached"
}
```

**API Key Expired:**
```json
{
  "success": false,
  "error": "API key expired",
  "message": "Your API key has expired"
}
```

## Rate Limiting & Best Practices

1. **Rate Limiting**: The API doesn't enforce strict rate limits, but avoid sending too many requests simultaneously
2. **File Size**: Media files are limited to 10MB
3. **Phone Number Format**: Use international format with country code (e.g., 923001234567)
4. **Security**: 
   - Store API keys securely
   - Use HTTPS in production
   - Rotate API keys periodically
   - Monitor API key usage

## API Key Management

- **Create**: Through the web dashboard
- **View Usage**: Monitor usage count and last used time
- **Activate/Deactivate**: Toggle API key status
- **Delete**: Permanently remove API keys
- **Set Limits**: Configure usage limits and expiration dates

## Support

If you need help with the API integration, please check:
1. API key is active and not expired
2. WhatsApp instance is connected
3. Phone number format is correct
4. Required fields are included in requests
5. File uploads don't exceed size limits
