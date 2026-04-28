export const calculateRiskScore = ({ heartRate, spo2, temperature }) => {
  let score = 0;

  if (heartRate > 110) score += 0.4;
  if (spo2 < 92) score += 0.4;

  // Fahrenheit check
  if (temperature > 100.4 || temperature < 95) score += 0.2;

  let riskLevel = "LOW";
  if (score >= 0.7) riskLevel = "HIGH";
  else if (score >= 0.4) riskLevel = "MEDIUM";

  return {
    score,
    riskLevel,
  };
};