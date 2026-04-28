#include <ESP8266WiFi.h>
#include <ThingSpeak.h>
#include <Wire.h>

#include "MAX30105.h"
#include "spo2_algorithm.h"

#include <OneWire.h>
#include <DallasTemperature.h>

// ================= WiFi + ThingSpeak =================
const char* WIFI_SSID = "AnshS25";
const char* WIFI_PASS = "Atinshefali2810";

unsigned long CHANNEL_ID = 1234567;          // <<< PUT YOUR REAL CHANNEL ID
const char* WRITE_API_KEY = "XTJF9GM95UJWXKHY";

WiFiClient client;

// ================= MAX30102 =================
MAX30105 particleSensor;

// Last 100 samples for SpO2 algorithm
#define SPO2_BUF 100
uint32_t irBuffer[SPO2_BUF];
uint32_t redBuffer[SPO2_BUF];

int32_t spo2;
int8_t validSPO2;

// HR (custom peak detector)
float bpmAvg = NAN;
int beatCount = 0;

// ================= DS18B20 =================
#define ONE_WIRE_BUS D4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// ================= Timing =================
unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL_MS = 20000;

// ================= Helpers =================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Connecting WiFi");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - t0 > 20000) {
      Serial.println("\nWiFi timeout. Restarting...");
      ESP.restart();
    }
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void ensureWiFi() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
}

float readTempF(bool &ok) {
  ok = false;
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);
  if (tempC == DEVICE_DISCONNECTED_F) return NAN; // matches your DallasTemperature version
  ok = true;
  return (tempC * 9.0 / 5.0) + 32.0;
}

uint32_t irAC(uint32_t *buf, int n) {
  uint32_t mn = buf[0], mx = buf[0];
  for (int i = 1; i < n; i++) {
    if (buf[i] < mn) mn = buf[i];
    if (buf[i] > mx) mx = buf[i];
  }
  return mx - mn;
}

bool readOneSample(uint32_t &ir, uint32_t &red) {
  unsigned long t0 = millis();
  while (!particleSensor.available()) {
    particleSensor.check();
    delay(1);
    if (millis() - t0 > 2000) return false;
  }
  ir = particleSensor.getIR();
  red = particleSensor.getRed();
  particleSensor.nextSample();
  return true;
}

bool fingerPresent(uint32_t ir) {
  return ir > 5000;
}

// ---- simple HR peak detector (works well when IR_AC is strong) ----
struct HRDetector {
  float dc = 0;          // running DC estimate
  float amp = 0;         // running amplitude estimate
  bool armed = false;    // waiting for a peak
  unsigned long lastPeakMs = 0;
  float bpmEma = NAN;    // smoothed bpm

  void reset() {
    dc = 0; amp = 0; armed = false; lastPeakMs = 0; bpmEma = NAN;
  }

  // returns true if a beat was detected
  bool process(uint32_t ir, float &bpmOut) {
    // DC tracking
    if (dc == 0) dc = (float)ir;
    dc = 0.95f * dc + 0.05f * (float)ir;

    float sig = (float)ir - dc;     // AC component
    float absSig = fabs(sig);

    // amplitude tracking
    amp = 0.97f * amp + 0.03f * absSig;

    // adaptive threshold (tune factor if needed)
    float thr = amp * 0.60f;
    if (thr < 50.0f) thr = 50.0f;

    // refractory period to avoid double-counting
    const unsigned long REFRACT_MS = 250;

    // Arm when we rise above threshold
    if (!armed && sig > thr && (millis() - lastPeakMs) > REFRACT_MS) {
      armed = true;
    }

    // Confirm peak when signal falls back below 0 (passed the peak)
    if (armed && sig < 0) {
      unsigned long now = millis();

      if (lastPeakMs != 0) {
        unsigned long dt = now - lastPeakMs;

        // valid HR window: 30..200 BPM => 2000ms..300ms
        if (dt >= 300 && dt <= 2000) {
          float bpm = 60000.0f / (float)dt;

          // EMA smoothing
          if (isnan(bpmEma)) bpmEma = bpm;
          bpmEma = 0.30f * bpm + 0.70f * bpmEma;

          bpmOut = bpmEma;
          lastPeakMs = now;
          armed = false;
          return true;
        }
      }

      lastPeakMs = now;
      armed = false;
    }

    return false;
  }
};

HRDetector hrDet;

// Collect 10 seconds, fill last-100 buffer for SpO2, and compute BPM avg
bool collect10s(uint32_t &irLast, uint32_t &acOut) {
  // reset HR
  hrDet.reset();
  bpmAvg = NAN;
  beatCount = 0;

  // circular buffer index for SpO2
  int idx = 0;

  const unsigned long windowMs = 10000;
  unsigned long start = millis();

  bool gotAny = false;
  while (millis() - start < windowMs) {
    uint32_t ir, red;
    if (!readOneSample(ir, red)) return false;

    gotAny = true;
    irLast = ir;

    // keep last 100 samples
    irBuffer[idx]  = ir;
    redBuffer[idx] = red;
    idx = (idx + 1) % SPO2_BUF;

    float bpmNow;
    if (hrDet.process(ir, bpmNow)) {
      beatCount++;
      bpmAvg = bpmNow;
    }
  }

  if (!gotAny) return false;

  // rotate circular buffer into chronological order for Maxim SpO2 function
  static uint32_t irTmp[SPO2_BUF];
  static uint32_t redTmp[SPO2_BUF];
  for (int i = 0; i < SPO2_BUF; i++) {
    int j = (idx + i) % SPO2_BUF;
    irTmp[i] = irBuffer[j];
    redTmp[i] = redBuffer[j];
  }
  for (int i = 0; i < SPO2_BUF; i++) {
    irBuffer[i] = irTmp[i];
    redBuffer[i] = redTmp[i];
  }

  acOut = irAC(irBuffer, SPO2_BUF);
  return true;
}

void setup() {
  Serial.begin(9600);
  delay(200);

  Wire.begin(D2, D1);

  connectWiFi();
  ThingSpeak.begin(client);

  Serial.println("Initializing MAX30102...");
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found. Check wiring + 3.3V.");
    while (1) delay(10);
  }

  // Your signal looks good with these; keep them.
  particleSensor.setup(
    0x2A,   // LED brightness
    8,      // sample average
    2,      // Red + IR
    200,    // sample rate
    411,    // pulse width
    16384   // ADC range
  );

  tempSensor.begin();
  tempSensor.setResolution(12);
  Serial.println("DS18B20 started.");

  Serial.println("Ready. Place finger on MAX30102 and block ambient light.");
}

void loop() {
  if (millis() - lastSend < SEND_INTERVAL_MS) {
    delay(50);
    return;
  }

  ensureWiFi();

  // ---- Temp ----
  bool tempOK = false;
  float tempF = readTempF(tempOK);

  // ---- MAX 10s ----
  uint32_t irLast = 0, ac = 0;
  bool ok = collect10s(irLast, ac);
  if (!ok) {
    Serial.println("MAX30102 read failed.");
    lastSend = millis();
    return;
  }

  bool fingerOK = fingerPresent(irLast);
  bool waveformOK = (ac > 200);

  // ---- SpO2 ----
  bool spo2OK = false;
  if (fingerOK && waveformOK) {
    int32_t dummyHR;
    int8_t dummyHRvalid;
    maxim_heart_rate_and_oxygen_saturation(
      irBuffer, SPO2_BUF,
      redBuffer,
      &spo2, &validSPO2,
      &dummyHR, &dummyHRvalid
    );
    spo2OK = (validSPO2 == 1) && (spo2 >= 70 && spo2 <= 100);
  }

  // ---- HR ----
  bool hrOK = fingerOK && waveformOK && (beatCount >= 2) && !isnan(bpmAvg) && (bpmAvg >= 35 && bpmAvg <= 220);

  // ---- Print diagnostics ----
  Serial.print("IR=");
  Serial.print(irLast);
  Serial.print(" | IR_AC=");
  Serial.print(ac);
  Serial.print(" | Beats=");
  Serial.print(beatCount);
  Serial.print(" | TempF=");
  Serial.print(tempOK ? String(tempF, 2) : "DISCONNECTED");
  Serial.print(" | SpO2=");
  Serial.print(spo2OK ? String(spo2) : "NA");
  Serial.print(" | HR(avg)=");
  Serial.println(hrOK ? String(bpmAvg, 1) : "NA");

  // ---- ThingSpeak ----
  if (tempOK) ThingSpeak.setField(3, tempF);
  if (spo2OK) ThingSpeak.setField(1, (float)spo2);
  if (hrOK)   ThingSpeak.setField(2, bpmAvg);

  int code = ThingSpeak.writeFields(CHANNEL_ID, WRITE_API_KEY);
  Serial.print("ThingSpeak HTTP: ");
  Serial.println(code);

  lastSend = millis();
}