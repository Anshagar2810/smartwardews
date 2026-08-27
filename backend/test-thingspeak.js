import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });

async function run() {
  const channelId = process.env.THINGSPEAK_CHANNEL_ID;
  const readKey = process.env.THINGSPEAK_READ_KEY;
  const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readKey}&results=2`;
  const { data } = await axios.get(url);
  console.log(JSON.stringify(data, null, 2));
}
run();
