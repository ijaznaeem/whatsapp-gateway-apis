const axios = require('axios');

// Replace this with your actual webhook URL
const WEBHOOK_URL = process.env.WEBHOOK_URL || null;

async function sendWebhook(data) {
  if (!WEBHOOK_URL) {
    console.log('⚠️ No webhook URL defined. Skipping webhook.');
    return;
  }

  try {
    await axios.post(WEBHOOK_URL, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('📤 Webhook sent.');
  } catch (error) {
    console.error('❌ Failed to send webhook:', error.message);
  }
}

module.exports = {
  sendWebhook
};
