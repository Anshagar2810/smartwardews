import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

console.log('🔍 Twilio Connection Test');
console.log('========================\n');

// Check if credentials exist
console.log('Checking .env variables:');
console.log('TWILIO_SID:', process.env.TWILIO_SID ? '✅ Present' : '❌ Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Present' : '❌ Missing');
console.log('TWILIO_WHATSAPP_FROM:', process.env.TWILIO_WHATSAPP_FROM || '❌ Missing');
console.log('TWILIO_WHATSAPP_TO:', process.env.TWILIO_WHATSAPP_TO || '❌ Missing');

console.log('\n🔗 Attempting to create Twilio client...');

try {
  const client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  console.log('✅ Twilio client created successfully');
  
  console.log('\n📱 Testing WhatsApp message...');
  
  const result = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: process.env.TWILIO_WHATSAPP_TO,
    body: '🧪 Test message from Smart Ward EWS - If you received this, Twilio is working!'
  });
  
  console.log('✅ WhatsApp message sent successfully!');
  console.log('Message SID:', result.sid);
  console.log('Status:', result.status);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nFull error:');
  console.error(error);
  
  console.log('\n🔧 Troubleshooting tips:');
  console.log('1. Verify your Twilio SID and Auth Token are valid');
  console.log('2. Check your Twilio account balance');
  console.log('3. Ensure WhatsApp is enabled in your Twilio account');
  console.log('4. Verify phone numbers are in E.164 format (e.g., +1234567890)');
  console.log('5. Check if your account is in trial mode with restrictions');
}
