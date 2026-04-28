// src/services/threshold.service.js
export const checkThresholds = ({ heartRate, spo2, temperature }) => {
  const alerts = [];
  let isCritical = false;

  if (heartRate < 50 || heartRate > 120) {
    alerts.push("Abnormal Heart Rate");
    isCritical = true;
  }

  if (spo2 < 90) {
    alerts.push("Low SpO2");
    isCritical = true;
  }

  if (temperature < 95 || temperature > 100.4) {
    alerts.push("Abnormal Body Temperature");
    isCritical = true;
  }

  return { isCritical, alerts };
};