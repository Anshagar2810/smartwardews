import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,

  JWT_SECRET: process.env.JWT_SECRET || "smartward_secret",

  THINGSPEAK_READ_KEY: process.env.THINGSPEAK_READ_KEY,
  THINGSPEAK_CHANNEL_ID: process.env.THINGSPEAK_CHANNEL_ID,

  ALERT_EMAIL: process.env.ALERT_EMAIL,
};
