export const generatePatientId = () => {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PAT${random}`;
};
