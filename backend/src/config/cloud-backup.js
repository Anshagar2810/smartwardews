import axios from "axios";
import Vitals from "../models/vitals.model.js";
import Patient from "../models/patient.model.js";
import Device from "../models/device.model.js";
import Alert from "../models/alert.model.js";

import { checkThresholds } from "../services/threshold.service.js";
import { calculateRiskScore } from "../services/riskScore.service.js";
import { sendAlert } from "../services/alert.service.js";

export const fetchFromThingSpeak = async () => {
  try {
    console.log("📡 Fetching data from ThingSpeak...");

    const channelId = process.env.THINGSPEAK_CHANNEL_ID;
    const readKey = process.env.THINGSPEAK_READ_KEY;

    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readKey}&results=1`;
    const { data } = await axios.get(url);

    if (!data.feeds?.length) return;

    const feed = data.feeds[0];

    const spo2 = Number(feed.field1);
    const heartRate = Number(feed.field2);
    const temperature = Number(feed.field3);

    if (!spo2 || !heartRate || !temperature) {
      console.log("⚠️ Invalid sensor data");
      return;
    }

    const deviceId = "ESP32_001";

    const patient = await Patient.findOne({ deviceId });
    if (!patient) return;

    const vitals = await Vitals.create({
      patientId: patient._id,
      deviceId,
      spo2,
      heartRate,
      temperature
    });

    console.log("📡 Vitals stored:", { spo2, heartRate, temperature });

    const thresholdResult = checkThresholds({ heartRate, spo2, temperature });
    const riskResult = calculateRiskScore({ heartRate, spo2, temperature });

    // Rising-edge detection: compare with last vitals to only notify on transition
    const lastVitals = await Vitals.findOne({ patientId: patient._id }).sort({ createdAt: -1 });

    const hasRisingEdge = (lastVitals, currentThreshold) => {
      if (!lastVitals) return true; // No history => notify
      // Check each metric: if it was non-critical before and is critical now => rising edge
      const wasCritical = checkThresholds({ heartRate: lastVitals.heartRate, spo2: lastVitals.spo2, temperature: lastVitals.temperature }).isCritical;
      // If previously non-critical and now critical, it's a rising edge
      return (!wasCritical && currentThreshold.isCritical);
    };

    const notifyNow = hasRisingEdge(lastVitals, thresholdResult) || riskResult.riskLevel === "HIGH";

    if (notifyNow) {
      // Avoid duplicate notifications: check last alert for this patient
      const lastAlert = await Alert.findOne({ patientId: patient._id }).sort({ createdAt: -1 });

      const alertsMatch = (a = [], b = []) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        // simple order-insensitive compare
        const sa = [...a].sort();
        const sb = [...b].sort();
        return sa.every((v, i) => v === sb[i]);
      };

      // If the last alert has the same messages and was already notified, skip
      if (lastAlert && lastAlert.notified && alertsMatch(lastAlert.messages, thresholdResult.alerts)) {
        console.log("ℹ️ Duplicate alert detected — skipping notification");
      } else {
        const alert = await Alert.create({
          patientId: patient._id,
          riskLevel: riskResult.riskLevel,
          messages: thresholdResult.alerts,
          notified: false
        });

        await sendAlert({
          patient,
          vitals,
          alerts: thresholdResult.alerts,
          risk: riskResult
        });

        alert.notified = true;
        await alert.save();

        console.log("🚨 ALERT SENT:", thresholdResult.alerts);
      }
    }

  } catch (err) {
    console.error("❌ ThingSpeak Error:", err.message);
  }
};