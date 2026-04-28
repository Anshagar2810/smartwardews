import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendTest = async () => {
  try {
    const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
      body: "✅ SMART WARD TEST MESSAGE"
    });

    console.log("WhatsApp sent. SID:", msg.sid);
  } catch (err) {
    console.error("Twilio Error:", err.message);
  }
};

sendTest();
