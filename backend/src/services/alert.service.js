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

export const sendAlert = async ({ patient, vitals, alerts, risk }) => {
  try {
    // Determine recipient: prefer patient's `phone` when it looks valid (starts with '+'),
    // otherwise fall back to globally-configured TWILIO_WHATSAPP_TO.
    let toNumber = process.env.TWILIO_WHATSAPP_TO;
    if (patient && patient.phone && (patient.phone.startsWith('+') || patient.phone.startsWith('whatsapp:'))) {
      toNumber = patient.phone.startsWith('whatsapp:') ? patient.phone : `whatsapp:${patient.phone}`;
    }

    if (!toNumber) {
      console.log("❌ WhatsApp TO number missing");
      return;
    }

    const message = `
🚨 *SMART WARD ALERT*

🧑 Patient: ${patient.name}
🆔 Patient ID: ${patient.patientId}

❤️ Heart Rate: ${vitals.heartRate}
🫁 SpO₂: ${vitals.spo2} %
🌡 Temperature: ${vitals.temperature} °F

⚠️ Risk Level: ${risk.riskLevel}
📢 Alerts: ${alerts.join(", ")}
`;

    console.log("📲 Sending WhatsApp via Twilio...");
    console.log("FROM:", process.env.TWILIO_WHATSAPP_FROM);
    console.log("TO:", toNumber);

    const twilioClient = getClient();
    if (!twilioClient) {
      console.error("❌ Twilio client not initialized");
      return;
    }

    const result = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      body: message,
    });

    console.log("✅ WhatsApp sent successfully. SID:", result.sid);
  } catch (err) {
    console.error("❌ WhatsApp Send Error:", err.message);
  }
};