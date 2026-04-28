export const checkAlerts = async (vitals) => {
  const alerts = [];

  if (vitals.spo2 < 80) alerts.push("Low SpO2");
  if (vitals.heartRate > 120 || vitals.heartRate < 50)
    alerts.push("Abnormal Heart Rate");
  if (vitals.temperature > 100.1 || vitals.temperature < 90)
    alerts.push("Abnormal Temperature");

  if (alerts.length > 0) {
    console.log("🚨 ALERT:", alerts.join(", "));
    // WhatsApp / Email hook goes here
  }
};
