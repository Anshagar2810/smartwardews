import twilio from "twilio";

// Lazy load client to ensure env is ready
let client = null;

const getClient = () => {
  if (!client) {
    if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error("❌ Missing TWILIO_SID or TWILIO_AUTH_TOKEN in .env");
      return null;
    }
    client = twilio(
      process.env.TWILIO_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return client;
};

export const sendWhatsAppAlert = async (message) => {
  try {
    if (!process.env.TWILIO_WHATSAPP_FROM || !process.env.TWILIO_WHATSAPP_TO) {
      console.error("❌ Missing TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_TO in .env");
      return;
    }

    console.log("📲 Attempting WhatsApp send from:", process.env.TWILIO_WHATSAPP_FROM, "to:", process.env.TWILIO_WHATSAPP_TO);

    const twilioClient = getClient();
    if (!twilioClient) {
      console.error("❌ Twilio client not initialized");
      return;
    }

    const response = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
      body: message,
    });

    console.log("✅ WhatsApp alert sent:", response.sid);
  } catch (error) {
    console.error("❌ WhatsApp alert failed:", error.message);
  }
};
