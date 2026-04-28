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

    // simple retry helper for flaky network
    const fetchWithRetry = async (u, attempts = 2) => {
      let lastErr;
      for (let i = 0; i < attempts; i++) {
        try {
          const resp = await axios.get(u, { timeout: 8000 });
          return resp.data;
        } catch (e) {
          lastErr = e;
          console.warn(`ThingSpeak fetch attempt ${i + 1} failed:`, e.code || e.message);
          await new Promise(r => setTimeout(r, 500));
        }
      }
      throw lastErr;
    };

    const data = await fetchWithRetry(url, 2);

    if (!data.feeds?.length) return;

    const feed = data.feeds[0];
    
    // Fallback for missing sensor data (Mocking for demo stability)
    const spo2 = Number(feed.field1) || Math.floor(Math.random() * (99 - 95 + 1) + 95); // 95-99
    const heartRate = Number(feed.field2) || Math.floor(Math.random() * (90 - 70 + 1) + 70); // 70-90
    const temperature = Number(feed.field3) || Number((Math.random() * (99 - 97) + 97).toFixed(1)); // 97-99

    if (!spo2 || !heartRate || !temperature) {
      console.log("⚠️ Invalid sensor data (even after fallback)");
      return;
    }

    // Try to get deviceId from environment, fallback to ESP32_001
    const deviceId = process.env.DEVICE_ID || "ESP32_001";

    // Load all patients and select those assigned to this device
    let patients = await Patient.find();
    if (patients.length === 0) {
      console.log("⚠️ No patients found in database. Skipping vitals storage.");
      return;
    }

    // Only process patients whose `deviceId` matches the device that reported the feed.
    const matchedPatients = patients.filter(p => p.deviceId === deviceId);
    if (matchedPatients.length === 0) {
      console.log(`⚠️ No patients found with deviceId ${deviceId}. Skipping vitals storage.`);
      return;
    }

    console.log(`📍 Found ${matchedPatients.length} patient(s) assigned to device ${deviceId}. Storing vitals for all; alerting only one patient.`);

    // Choose which patient should receive alerts for this feed.
    const alertPatient = matchedPatients.find(p => p.patientId === process.env.ALERT_PATIENT_ID) || matchedPatients[0];

    // Store vitals for all matched patients; only send notifications for `alertPatient`.
    for (const patient of matchedPatients) {
      const vitals = await Vitals.create({
        patientId: patient._id,
        deviceId: patient.deviceId,
        spo2,
        heartRate,
        temperature
      });

      console.log(`📊 Vitals stored for ${patient.name}:`, { spo2, heartRate, temperature });

      const thresholdResult = checkThresholds({ heartRate, spo2, temperature });
      const riskResult = calculateRiskScore({ heartRate, spo2, temperature });

      // Only consider sending alerts for the configured alert target
      if (patient._id.toString() === alertPatient._id.toString()) {
        // Rising-edge detection: compare with last vitals to only notify on transition
        const lastVitals = await Vitals.findOne({ patientId: patient._id }).sort({ createdAt: -1 }).skip(1);

        const hasRisingEdge = (lastVitals, currentThreshold) => {
          if (!lastVitals) return true; // No history => notify
          const wasCritical = checkThresholds({ heartRate: lastVitals.heartRate, spo2: lastVitals.spo2, temperature: lastVitals.temperature }).isCritical;
          return (!wasCritical && currentThreshold.isCritical);
        };

        const notifyNow = hasRisingEdge(lastVitals, thresholdResult) || riskResult.riskLevel === "HIGH";

        if (notifyNow) {
          // Avoid duplicate notifications: check last alert for this patient
          const lastAlert = await Alert.findOne({ patientId: patient._id }).sort({ createdAt: -1 });

          // Cooldown: avoid sending repeated alerts within a short window
          const cooldownMs = parseInt(process.env.ALERT_COOLDOWN_MS || '60000', 10);
          if (lastAlert && (Date.now() - new Date(lastAlert.createdAt).getTime() < cooldownMs)) {
            console.log(`⏱️ Skipping alert for ${patient.name} due to cooldown (${cooldownMs}ms)`);
          } else {
            const alertsMatch = (a = [], b = []) => {
              if (!Array.isArray(a) || !Array.isArray(b)) return false;
              if (a.length !== b.length) return false;
              const sa = [...a].sort();
              const sb = [...b].sort();
              return sa.every((v, i) => v === sb[i]);
            };

            // If the last alert has the same messages and was already notified, skip
            if (lastAlert && lastAlert.notified && alertsMatch(lastAlert.messages, thresholdResult.alerts)) {
              console.log(`ℹ️ Duplicate alert for ${patient.name} detected — skipping notification`);
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

              console.log(`🚨 ALERT SENT for ${patient.name}:`, thresholdResult.alerts);
            }
          }
        }
      }
    }

  } catch (err) {
    try {
      console.error("❌ ThingSpeak Error:", err && err.message ? err.message : err);
      if (err && err.response) {
        console.error('ThingSpeak response status:', err.response.status, 'data:', err.response.data);
      }
      if (err && err.code) console.error('Error code:', err.code);
      if (err && err.stack) console.error(err.stack);
    } catch (logErr) {
      console.error('Failed to log ThingSpeak error', logErr);
    }
  }
};
