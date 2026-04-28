import express from "express";
import axios from "axios";

const router = express.Router();

// Load environment variables
const THINGSPEAK_CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID;
const THINGSPEAK_READ_KEY = process.env.THINGSPEAK_READ_KEY;

// Route to fetch ThingSpeak data
router.get("/device-status", async (req, res) => {
  try {
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_KEY}&results=1`;
    const response = await axios.get(url);

    if (response.data && response.data.feeds && response.data.feeds.length > 0) {
      const latestFeed = response.data.feeds[0];
      const spo2 = latestFeed.field1; // Assuming SpO2 is in field1
      const bpm = latestFeed.field2;  // Assuming HR is in field2

      res.json({
        status: "success",
        data: {
          spo2,
          bpm,
          timestamp: latestFeed.created_at,
        },
      });
    } else {
      res.status(404).json({ status: "error", message: "No data found" });
    }
  } catch (error) {
    console.error("Error fetching ThingSpeak data:", error.message);
    res.status(500).json({ status: "error", message: "Failed to fetch data" });
  }
});

export default router;