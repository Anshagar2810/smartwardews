import Vitals from "../models/vitals.model.js";
import Patient from "../models/patient.model.js";
import { checkThresholds } from "../services/threshold.service.js";
import { calculateRiskScore } from "../services/riskScore.service.js";
import { sendAlert } from "../services/alert.service.js";
import axios from "axios";

// POST /api/vitals
export const ingestVitals = async (req, res) => {
  try {
    const { patientId, deviceId, heartRate, spo2, temperature } = req.body;

    if (!patientId || !deviceId) {
      return res.status(400).json({ error: "patientId and deviceId required" });
    }

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const vitals = await Vitals.create({
      patientId: patient._id,
      deviceId,
      heartRate,
      spo2,
      temperature,
    });

    const threshold = checkThresholds({ heartRate, spo2, temperature });
    const risk = calculateRiskScore({ heartRate, spo2, temperature });

    if (threshold.isCritical || risk.riskLevel === "HIGH") {
      await sendAlert({ patient, vitals, risk });
    }

    res.status(201).json({
      message: "Vitals stored",
      vitals,
      risk,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/vitals/:patientId
export const getVitalsByPatient = async (req, res) => {
  try {
    const patId = req.params.patientId;
    console.log('🔍 Fetching vitals for patientId:', patId);
    
    const patient = await Patient.findOne({ patientId: patId });
    if (!patient) {
      console.warn('⚠️ Patient not found for patientId:', patId);
      return res.status(404).json({ error: "Patient not found" });
    }

    console.log('✅ Found patient:', patient.name, 'MongoDB _id:', patient._id);

    const vitals = await Vitals.find({ patientId: patient._id })
      .sort({ createdAt: -1 })
      .limit(20);

    console.log('📊 Found', vitals.length, 'vitals records for patient', patient.name);
    res.json(vitals);
  } catch (err) {
    console.error('❌ Error fetching vitals:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/vitals/thingspeak?field=1&results=20
export const getThingSpeakField = async (req, res) => {
  try {
    const field = req.query.field || '1';
    const results = parseInt(req.query.results || '20', 10);

    const channelId = process.env.THINGSPEAK_CHANNEL_ID;
    const readKey = process.env.THINGSPEAK_READ_KEY;
    if (!channelId) return res.status(400).json({ error: 'Channel ID not configured' });

    const url = `https://api.thingspeak.com/channels/${channelId}/fields/${field}.json?api_key=${readKey}&results=${results}`;
    const { data } = await axios.get(url);

    // thingspeak returns { channel: {...}, feeds: [...] }
    const feeds = data.feeds || [];
    // Map to simple timeseries: { value, created_at }
    const series = feeds.map(f => ({ value: Number(f[`field${field}`]), createdAt: f.created_at }));
    return res.json({ channel: data.channel || {}, series });
  } catch (err) {
    console.error('ThingSpeak fetch error:', err && err.message ? err.message : err);
    if (err && err.response) {
      console.error('ThingSpeak response status:', err.response.status, 'data:', err.response.data);
    }
    if (err && err.stack) console.error(err.stack);
    return res.status(500).json({ error: (err && (err.message || err.code)) || 'Unknown error' });
  }
};

// GET /api/vitals/thingspeak/status
export const getThingSpeakStatus = async (req, res) => {
  try {
    const channelId = process.env.THINGSPEAK_CHANNEL_ID;
    const readKey = process.env.THINGSPEAK_READ_KEY;
    if (!channelId) return res.status(400).json({ error: 'Channel ID not configured' });

    const url = `https://api.thingspeak.com/channels/${channelId}/status.json?api_key=${readKey}`;
    const { data } = await axios.get(url);

    // ThingSpeak status returns feeds array with recent feed info; use feeds[0].created_at if present
    const feeds = data.feeds || [];
    const latest = feeds.length ? feeds[0] : null;
    const lastUpdated = latest ? latest.created_at : null;
    const isActive = lastUpdated ? (new Date().getTime() - new Date(lastUpdated).getTime() < 30000) : false; // 30s threshold

    return res.json({ isActive, lastUpdated });
  } catch (err) {
    console.error('ThingSpeak status fetch error:', err && err.message ? err.message : err);
    if (err && err.response) console.error('Status response:', err.response.status, err.response.data);
    if (err && err.stack) console.error(err.stack);
    return res.status(500).json({ error: (err && (err.message || err.code)) || 'Unknown error' });
  }
};