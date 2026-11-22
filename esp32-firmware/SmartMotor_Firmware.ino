#include <Wire.h>
#include <Adafruit_INA219.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <LiquidCrystal.h>
#include "DHT.h"
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// ============================================================================
// BLYNK IOT CONFIGURATION
// ============================================================================
#define BLYNK_TEMPLATE_ID "TMPL3Sa15d8Sd"
#define BLYNK_TEMPLATE_NAME "Smart Motor Monitoring"

// IMPORTANT: Replace this placeholder with your 32-character Device Auth Token from Blynk Console!
// If this is left as "PASTE_YOUR_DEVICE_AUTH_TOKEN_HERE", Blynk will immediately disconnect with "Invalid auth token"!
#define BLYNK_AUTH_TOKEN "9SKK7O-qh5QAagXD5vBNFcr7Jfg1DWVn"

#include <BlynkSimpleEsp32.h>

#if __has_include("esp_eap_client.h")
  #include "esp_eap_client.h"
#else
  #include "esp_wpa2.h"
#endif

#define USE_ENTERPRISE_WIFI false

const char* EAP_SSID     = "srmap-byod";
const char* EAP_IDENTITY = "AP24110020114";      
const char* EAP_USERNAME = "AP24110020114";       
const char* EAP_PASSWORD = "YOUR_PASSWORD";      

// Wi-Fi Credentials for Internet Access
const char* STANDARD_SSID = "project";        // Your Wi-Fi router or mobile hotspot SSID
const char* STANDARD_PASS = "12345678";       // Password

// Local Hotspot (Fallback)
const char* AP_SSID = "SmartMotor-AP";
const char* AP_PASS = "act12345";

WebServer server(80);

// LCD 16x2 Pins (Parallel)
const int rs = 15;
const int en = 2;
const int d4 = 4;
const int d5 = 16;
const int d6 = 17;
const int d7 = 5;
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);

Adafruit_INA219 ina219;
Adafruit_MPU6050 mpu;

#define DHTPIN 33
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Outputs
const int fanPin   = 23;
const int relayPin = 32;
const int buzPin   = 18;

// Safety Thresholds
const float TEMP_CRITICAL_THRESH   = 40.0;   // °C -> Buzzer & Fan trigger
const float TEMP_WARNING_THRESH    = 35.0;   // °C
const float CURRENT_CRITICAL_THRESH= 100.0;  // mA -> Overcurrent / Motor Stall
const float CURRENT_WARNING_THRESH = 80.0;   // mA -> High load warning
const float ACCEL_CRITICAL_THRESH  = 18.0;   // m/s² -> Raised to 18.0 so normal vibration doesn't ring buzzer
const float ACCEL_BASELINE         = 9.806;  // Earth 1G gravity baseline

// SMS & Blynk Alert Cooldowns
const bool ENABLE_SMS_ALERTS        = true;
const char* SMS_PHONE_NUMBER        = "7816053113";
const char* FAST2SMS_API_KEY        = "YOUR_FAST2SMS_API_KEY";
unsigned long lastSmsSentTime       = 0;
const unsigned long SMS_COOLDOWN    = 60000UL;

const unsigned long BLYNK_ALERT_COOLDOWN = 60000UL;
unsigned long lastBlynkVibrationAlert    = 0;
unsigned long lastBlynkCurrentAlert      = 0;
unsigned long lastBlynkTempAlert         = 0;

// Global Sensor & Actuator State
float busvoltage = 0.0;
float current_mA = 0.0;
float power_mW   = 0.0;
float temp       = 0.0;
float hum        = 0.0;
float totalAccel = 0.0;
float accelX     = 0.0;
float accelY     = 0.0;
float accelZ     = 0.0;

bool motorState  = true;   // true = Relay ON (LOW), false = Relay OFF (HIGH)
bool fanState    = false;  // true = Fan ON (HIGH)
bool buzzerState = false;  // true = Buzzer ON (HIGH)
bool autoControl = true;

String faultStatus = "NORMAL";
int healthScore    = 100;

unsigned long lastSensorRead   = 0;
const unsigned long SENSOR_INTERVAL = 1000; // 1s for LCD & Sensor sample rate

unsigned long lastBlynkUpdate  = 0;
const unsigned long BLYNK_TELEMETRY_INTERVAL = 3000; // 3s to prevent Blynk Cloud "Flood Error"

unsigned long lastBlynkReconnectAttempt = 0;

// ============================================================================
// EMBEDDED DASHBOARD HTML
// ============================================================================
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Motor Condition Monitoring</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f4f6f9; color: #1f2937; padding: 20px; line-height: 1.5; max-width: 1200px; margin: 0 auto; }
    .header { text-align: center; background: #1f2937; color: white; padding: 18px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 1.4rem; margin: 0; }
    .header p { font-size: 0.85rem; color: #9ca3af; margin-top: 4px; }
    .bar { background: white; border-radius: 10px; padding: 12px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.06); flex-wrap: wrap; gap: 10px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
    .badge-ok { background: #dcfce7; color: #16a34a; }
    .badge-bad { background: #fee2e2; color: #dc2626; }
    .alert-box { padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
    .alert-ok { background: #ecfdf5; border-left: 5px solid #10b981; color: #065f46; }
    .alert-bad { background: #fef2f2; border-left: 5px solid #ef4444; color: #991b1b; }
    .cards { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
    .card { flex: 1; min-width: 170px; background: white; padding: 18px 14px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center; }
    .card h3 { font-size: 0.75rem; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
    .card h1 { font-size: 1.8rem; font-weight: bold; color: #111827; margin-bottom: 4px; }
    .card p { font-size: 0.78rem; color: #6b7280; }
    .ctrl-card { background: white; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
    .btn { background: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db; padding: 8px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .btn:hover { background: #e5e7eb; }
    .btn-red { background: #dc2626; color: white; border-color: #dc2626; }
    .table-card { background: white; border-radius: 10px; padding: 18px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 10px; }
    th { background: #1f2937; color: white; padding: 10px 8px; text-align: center; }
    td { padding: 9px 8px; text-align: center; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) { background-color: #fafafa; }
    @media (max-width: 768px) { .cards { flex-direction: column; } .bar, .ctrl-card { flex-direction: column; align-items: flex-start; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ Smart Motor Condition Monitoring & Fault Detection</h1>
    <p>SRM AP Engineering • Real-Time Sensor Telemetry</p>
  </div>

  <div class="bar">
    <div><b>Device IP:</b> <span id="ipVal">--</span></div>
    <div id="connBadge" class="badge badge-ok">Connected to ESP32</div>
  </div>

  <div id="alertBox" class="alert-box alert-ok">
    <h3 id="alertTitle">✔ System Normal</h3>
    <p id="alertMsg">All motor parameters within nominal operating limits.</p>
  </div>

  <div class="cards">
    <div class="card">
      <h3>Motor Status</h3>
      <h1 id="motorStatus" style="color:#16a34a">RUNNING</h1>
      <p id="motorRelay">Relay: Active</p>
    </div>
    <div class="card">
      <h3>Health Index</h3>
      <h1 id="healthVal" style="color:#16a34a">100%</h1>
      <p id="healthDesc">Optimal Condition</p>
    </div>
    <div class="card">
      <h3>Vibration (MPU6050)</h3>
      <h1 id="accelVal">--</h1>
      <p>Limit: 18.0 m/s²</p>
    </div>
    <div class="card">
      <h3>Current & Voltage</h3>
      <h1 id="currVal">--</h1>
      <p id="voltVal">Voltage: -- V</p>
    </div>
    <div class="card">
      <h3>Temperature</h3>
      <h1 id="tempVal">--</h1>
      <p id="humVal">Humidity: -- %</p>
    </div>
  </div>

  <div class="ctrl-card">
    <div><b>Actuator Controls:</b></div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn btn-red" onclick="toggleRelay()">🛑 Cut Motor Power</button>
      <button class="btn" onclick="toggleFan()">💨 Toggle Fan</button>
      <button class="btn" onclick="toggleBuzzer()">🔕 Silence Buzzer</button>
    </div>
  </div>

  <div class="table-card">
    <h3 style="color:#111827;">Recent Telemetry Log</h3>
    <table id="logTable">
      <thead>
        <tr><th>Time</th><th>Voltage</th><th>Current</th><th>Vibration</th><th>Temp</th><th>Motor</th><th>Status</th></tr>
      </thead>
      <tbody id="logBody">
        <tr><td colspan="7" style="color:#9ca3af; padding:15px;">Waiting for readings...</td></tr>
      </tbody>
    </table>
  </div>

  <script>
    let first = true;
    async function fetchData() {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) throw new Error();
        const d = await res.json();

        document.getElementById("connBadge").className = "badge badge-ok";
        document.getElementById("connBadge").innerText = "Connected";
        document.getElementById("ipVal").innerText = d.ip || window.location.hostname;

        document.getElementById("motorStatus").innerText = d.motor ? "RUNNING" : "STOPPED";
        document.getElementById("motorStatus").style.color = d.motor ? "#16a34a" : "#dc2626";
        document.getElementById("motorRelay").innerText = d.motor ? "Relay: Active" : "Relay: Cutoff";

        document.getElementById("healthVal").innerText = d.health + "%";
        document.getElementById("healthVal").style.color = d.health >= 80 ? "#16a34a" : (d.health >= 50 ? "#d97706" : "#dc2626");
        document.getElementById("healthDesc").innerText = d.health >= 80 ? "Optimal Condition" : (d.health >= 50 ? "Degraded" : "Critical Fault");

        document.getElementById("accelVal").innerText = d.accel.toFixed(2) + " m/s²";
        document.getElementById("accelVal").style.color = d.accel >= 18.0 ? "#dc2626" : "#111827";

        document.getElementById("currVal").innerText = Math.round(d.current) + " mA";
        document.getElementById("voltVal").innerText = "Voltage: " + d.voltage.toFixed(1) + " V | " + Math.round(d.power) + " mW";

        document.getElementById("tempVal").innerText = d.temperature.toFixed(1) + " °C";
        document.getElementById("humVal").innerText = "Humidity: " + Math.round(d.humidity) + "% | Limit: 40°C";

        const ab = document.getElementById("alertBox");
        if (d.fault && d.fault !== "NORMAL") {
          ab.className = "alert-box alert-bad";
          document.getElementById("alertTitle").innerText = "⚠️ Fault Alert: " + d.fault;
          document.getElementById("alertMsg").innerText = "Abnormal motor parameter detected! Automated protection triggered.";
        } else {
          ab.className = "alert-box alert-ok";
          document.getElementById("alertTitle").innerText = "✔ System Normal";
          document.getElementById("alertMsg").innerText = "All motor parameters within nominal operating limits.";
        }

        const tbody = document.getElementById("logBody");
        if (first) { tbody.innerHTML = ""; first = false; }
        const timeStr = new Date().toLocaleTimeString();
        const aColor = (d.accel >= 18.0) ? "#dc2626" : "#16a34a";
        const fColor = (d.fault !== "NORMAL") ? "#dc2626" : "#16a34a";
        const mStr = d.motor ? "ON" : "OFF";
        const mColor = d.motor ? "#16a34a" : "#dc2626";
        const row = `<tr><td>${timeStr}</td><td>${d.voltage.toFixed(1)}V</td><td>${Math.round(d.current)}mA</td><td style="color:${aColor}">${d.accel.toFixed(2)}</td><td>${d.temperature.toFixed(1)}°C</td><td><b style="color:${mColor}">${mStr}</b></td><td style="color:${fColor};font-weight:bold">${d.fault}</td></tr>`;
        tbody.insertAdjacentHTML("afterbegin", row);
        while (tbody.children.length > 15) tbody.removeChild(tbody.lastChild);
      } catch (e) {
        document.getElementById("connBadge").className = "badge badge-bad";
        document.getElementById("connBadge").innerText = "Offline";
      }
    }

    async function toggleRelay() { await fetch("/api/motor/toggle"); fetchData(); }
    async function toggleFan() { await fetch("/api/fan/toggle"); fetchData(); }
    async function toggleBuzzer() { await fetch("/api/buzzer/toggle"); fetchData(); }

    setInterval(fetchData, 1000);
    fetchData();
  </script>
</body>
</html>
)rawliteral";

// ============================================================================
// SMS & BLYNK DISPATCH FUNCTIONS
// ============================================================================
void sendSMSAlert(String reason, float val, String unit) {
  if (!ENABLE_SMS_ALERTS) return;
  unsigned long now = millis();
  if (now - lastSmsSentTime < SMS_COOLDOWN) return;
  lastSmsSentTime = now;

  String msg = "ALERT: Smart Motor " + reason + " (" + String(val, 1) + " " + unit + ")! Protective actions engaged.";

  Serial.println("========================================");
  Serial.println(">>> 📱 SMS ALERT SENT TO ADMIN PHONE: " + String(SMS_PHONE_NUMBER));
  Serial.println(">>> MESSAGE: " + msg);
  Serial.println("========================================");

  if (WiFi.status() == WL_CONNECTED && String(FAST2SMS_API_KEY) != "YOUR_FAST2SMS_API_KEY") {
    HTTPClient http;
    String url = "https://www.fast2sms.com/dev/bulkV2?authorization=" + String(FAST2SMS_API_KEY) +
                 "&route=v3&sender_id=TXTIND&message=" + msg +
                 "&language=english&flash=0&numbers=" + String(SMS_PHONE_NUMBER);
    http.begin(url);
    int httpCode = http.GET();
    if (httpCode > 0) {
      Serial.printf("[SMS] Response: %d\n", httpCode);
    }
    http.end();
  }
}

void sendBlynkFaultAlerts() {
  if (WiFi.status() != WL_CONNECTED || !Blynk.connected()) return;

  const unsigned long now = millis();

  // 1. High Vibration
  if (totalAccel >= ACCEL_CRITICAL_THRESH &&
      (lastBlynkVibrationAlert == 0 || now - lastBlynkVibrationAlert >= BLYNK_ALERT_COOLDOWN)) {
    Serial.println("[Blynk] Logging Event: high_vibration_alert");
    Blynk.logEvent("high_vibration_alert",
      String("High vibration: ") + String(totalAccel, 2) + " m/s2. Bearing fault risk.");
    lastBlynkVibrationAlert = now;
  }

  // 2. Overcurrent
  if (current_mA > CURRENT_CRITICAL_THRESH &&
      (lastBlynkCurrentAlert == 0 || now - lastBlynkCurrentAlert >= BLYNK_ALERT_COOLDOWN)) {
    Serial.println("[Blynk] Logging Event: overcurrent_alert");
    Blynk.logEvent("overcurrent_alert",
      String("Motor overcurrent: ") + String(current_mA, 1) + " mA. Possible stall.");
    lastBlynkCurrentAlert = now;
  }

  // 3. Thermal Overload
  if (temp > TEMP_CRITICAL_THRESH &&
      (lastBlynkTempAlert == 0 || now - lastBlynkTempAlert >= BLYNK_ALERT_COOLDOWN)) {
    Serial.println("[Blynk] Logging Event: high_temp");
    Blynk.logEvent("high_temp",
      String("High motor temperature: ") + String(temp, 1) + " C. Thermal overload risk.");
    lastBlynkTempAlert = now;
  }
}

// Push live telemetry to Blynk Dashboard (Called every 3s to prevent flood error)
void updateBlynkTelemetry() {
  if (Blynk.connected()) {
    Blynk.virtualWrite(V0, busvoltage);
    Blynk.virtualWrite(V1, current_mA);
    Blynk.virtualWrite(V2, temp);
    Blynk.virtualWrite(V3, totalAccel);
    Blynk.virtualWrite(V4, healthScore);
    Blynk.virtualWrite(V5, faultStatus);
    Blynk.virtualWrite(V6, motorState ? 1 : 0);
  }
}

// Blynk Remote Control Switches
BLYNK_WRITE(V10) {
  int value = param.asInt();
  motorState = (value == 1);
  digitalWrite(relayPin, motorState ? LOW : HIGH); // Active LOW relay
  Serial.printf("[Blynk] Motor Relay set to: %s\n", motorState ? "ON" : "OFF");
}

BLYNK_WRITE(V11) {
  int value = param.asInt();
  fanState = (value == 1);
  digitalWrite(fanPin, fanState ? HIGH : LOW);
  Serial.printf("[Blynk] Cooling Fan set to: %s\n", fanState ? "ON" : "OFF");
}

// ============================================================================
// HEALTH EVALUATION & ACTUATOR CONTROL
// ============================================================================
void evaluateMotorHealth() {
  int penalty = 0;
  faultStatus = "NORMAL";

  if (totalAccel >= ACCEL_CRITICAL_THRESH) {
    penalty += 40;
    faultStatus = "HIGH VIBRATION / BEARING FAULT";
    sendSMSAlert("High Vibration", totalAccel, "m/s2");
  } else if (abs(totalAccel - ACCEL_BASELINE) > 3.0) {
    penalty += 15;
  }

  if (current_mA > CURRENT_CRITICAL_THRESH) {
    penalty += 45;
    faultStatus = "OVERCURRENT / MOTOR STALL";
    sendSMSAlert("Overcurrent Stall", current_mA, "mA");
  } else if (current_mA > CURRENT_WARNING_THRESH) {
    penalty += 15;
  }

  if (temp > TEMP_CRITICAL_THRESH) {
    penalty += 35;
    if (faultStatus == "NORMAL") faultStatus = "THERMAL OVERLOAD";
    sendSMSAlert("Thermal Overload", temp, "C");
  } else if (temp > TEMP_WARNING_THRESH) {
    penalty += 10;
  }

  healthScore = max(0, 100 - penalty);

  if (temp > TEMP_CRITICAL_THRESH || current_mA > CURRENT_CRITICAL_THRESH || totalAccel >= ACCEL_CRITICAL_THRESH) {
    buzzerState = true;
    digitalWrite(buzPin, HIGH);

    if (temp > TEMP_WARNING_THRESH) {
      fanState = true;
      digitalWrite(fanPin, HIGH);
    }
  } else {
    buzzerState = false;
    digitalWrite(buzPin, LOW);
    fanState = false;
    digitalWrite(fanPin, LOW);
  }
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================
void handleRoot() {
  server.send_P(200, "text/html", INDEX_HTML);
}

void handleDataApi() {
  String json = "{";
  json += "\"voltage\":" + String(busvoltage, 2) + ",";
  json += "\"current\":" + String(current_mA, 1) + ",";
  json += "\"power\":" + String(power_mW, 1) + ",";
  json += "\"temperature\":" + String(temp, 1) + ",";
  json += "\"humidity\":" + String(hum, 1) + ",";
  json += "\"accel\":" + String(totalAccel, 2) + ",";
  json += "\"accel_x\":" + String(accelX, 2) + ",";
  json += "\"accel_y\":" + String(accelY, 2) + ",";
  json += "\"accel_z\":" + String(accelZ, 2) + ",";
  json += "\"motor\":" + String(motorState ? "true" : "false") + ",";
  json += "\"fan\":" + String(fanState ? "true" : "false") + ",";
  json += "\"buzzer\":" + String(buzzerState ? "true" : "false") + ",";
  json += "\"fault\":\"" + faultStatus + "\",";
  json += "\"health\":" + String(healthScore) + ",";
  json += "\"uptime\":" + String(millis() / 1000) + ",";
  json += "\"ip\":\"" + (WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString()) + "\"";
  json += "}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleMotorToggle() {
  motorState = !motorState;
  digitalWrite(relayPin, motorState ? LOW : HIGH);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", String("{\"status\":\"ok\",\"motor\":") + (motorState ? "true" : "false") + "}");
}

void handleFanToggle() {
  fanState = !fanState;
  digitalWrite(fanPin, fanState ? HIGH : LOW);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", String("{\"status\":\"ok\",\"fan\":") + (fanState ? "true" : "false") + "}");
}

void handleBuzzerToggle() {
  buzzerState = !buzzerState;
  digitalWrite(buzPin, buzzerState ? HIGH : LOW);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", String("{\"status\":\"ok\",\"buzzer\":") + (buzzerState ? "true" : "false") + "}");
}

// ============================================================================
// WI-FI INITIALIZATION
// ============================================================================
void initWiFi() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("STARTING WIFI...");

  WiFi.mode(WIFI_AP_STA);

  // 1. First connect to standard Wi-Fi router / mobile hotspot for Internet
  Serial.println("========================================");
  Serial.println(">>> Connecting Station Wi-Fi to: " + String(STANDARD_SSID));
  WiFi.begin(STANDARD_SSID, STANDARD_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  // 2. Start Soft-AP (always broadcasting as fallback)
  IPAddress apIP(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(apIP, gateway, subnet);
  // SoftAP channel: if station is connected, use same channel to avoid radio conflict
  int channel = (WiFi.status() == WL_CONNECTED) ? WiFi.channel() : 1;
  WiFi.softAP(AP_SSID, AP_PASS, channel);

  Serial.println(">>> HOTSPOT CREATED: " + String(AP_SSID) + " (Channel " + String(channel) + ")");
  Serial.println(">>> HOTSPOT URL: http://192.168.4.1/");

  lcd.clear();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(">>> Connected to " + String(STANDARD_SSID) + "! IP: " + WiFi.localIP().toString());
    lcd.setCursor(0, 0);
    lcd.print("IP:" + WiFi.localIP().toString());
    lcd.setCursor(0, 1);
    lcd.print("AP:SmartMotor-AP");
  } else {
    Serial.println(">>> WARNING: Station Wi-Fi not connected! Blynk will not work without Internet!");
    lcd.setCursor(0, 0);
    lcd.print("NO INTERNET WIFI");
    lcd.setCursor(0, 1);
    lcd.print("AP: 192.168.4.1");
  }
  Serial.println("========================================");
  delay(1500);
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(fanPin, OUTPUT);
  pinMode(relayPin, OUTPUT);
  pinMode(buzPin, OUTPUT);

  digitalWrite(fanPin, LOW);
  digitalWrite(relayPin, LOW); // Relay ON (active LOW)
  digitalWrite(buzPin, LOW);

  lcd.begin(16, 2);
  lcd.print("SMART MOTOR");
  lcd.setCursor(0, 1);
  lcd.print("MONITORING");
  delay(1200);
  lcd.clear();

  initWiFi();

  // Explicitly point Blynk to modern Blynk IoT cloud server on port 80
  Blynk.config(BLYNK_AUTH_TOKEN, "blynk.cloud", 80);

  if (String(BLYNK_AUTH_TOKEN) == "PASTE_YOUR_DEVICE_AUTH_TOKEN_HERE") {
    Serial.println("\n**************************************************************");
    Serial.println(">>> ERROR: BLYNK_AUTH_TOKEN IS STILL THE PLACEHOLDER!");
    Serial.println(">>> Replace 'PASTE_YOUR_DEVICE_AUTH_TOKEN_HERE' with your real token!");
    Serial.println("**************************************************************\n");
  } else if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[Blynk] Connecting to blynk.cloud:80...");
    if (Blynk.connect(4000)) {
      Serial.println(">>> [Blynk] Connected successfully!");
    } else {
      Serial.println(">>> [Blynk] Connect timed out; will retry in loop().");
    }
  }

  Wire.begin(21, 22);
  dht.begin();

  if (!ina219.begin()) {
    Serial.println("INA219 WARNING: Check wiring (SDA=21, SCL=22)");
  }

  if (!mpu.begin()) {
    Serial.println("MPU6050 WARNING: Check wiring (SDA=21, SCL=22)");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  // REST Routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/data", HTTP_GET, handleDataApi);
  server.on("/api/motor/toggle", HTTP_GET, handleMotorToggle);
  server.on("/api/fan/toggle", HTTP_GET, handleFanToggle);
  server.on("/api/buzzer/toggle", HTTP_GET, handleBuzzerToggle);
  server.begin();
  Serial.println("HTTP Web Server Started!");

  lcd.clear();
  lcd.print("SYSTEM READY");
  delay(800);
  lcd.clear();
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
  // Always handle local web server requests
  server.handleClient();

  // Blynk cloud maintenance
  if (WiFi.status() == WL_CONNECTED) {
    if (Blynk.connected()) {
      Blynk.run();
    } else {
      // Periodic non-blocking reconnect if disconnected
      unsigned long currentM = millis();
      if (currentM - lastBlynkReconnectAttempt >= 10000UL) {
        lastBlynkReconnectAttempt = currentM;
        if (String(BLYNK_AUTH_TOKEN) != "PASTE_YOUR_DEVICE_AUTH_TOKEN_HERE") {
          Serial.println("[Blynk] Attempting to reconnect to blynk.cloud...");
          Blynk.connect(3000);
        }
      }
    }
  }

  unsigned long currentMillis = millis();

  // ---------------- 1. Sensor Sampling & LCD (Every 1000ms) ----------------
  if (currentMillis - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = currentMillis;

    // INA219 Readings
    busvoltage = ina219.getBusVoltage_V();
    current_mA = ina219.getCurrent_mA();
    power_mW   = ina219.getPower_mW();

    if (busvoltage < 1.1) busvoltage = 0;
    if (current_mA < 1.5) current_mA = 0;
    if (power_mW < 1.5)   power_mW   = 0;

    // DHT11 Readings
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) temp = t;
    if (!isnan(h)) hum  = h;

    // MPU6050 Readings
    sensors_event_t a, g, mpu_temp;
    mpu.getEvent(&a, &g, &mpu_temp);
    accelX = a.acceleration.x;
    accelY = a.acceleration.y;
    accelZ = a.acceleration.z;
    totalAccel = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

    // Evaluate Motor Condition & Trigger Safety Actuators
    evaluateMotorHealth();
    sendBlynkFaultAlerts();

    // Flicker-Free LCD Update
    char line1[17];
    char line2[17];
    snprintf(line1, sizeof(line1), "V:%-4.1f I:%-4d", busvoltage, (int)current_mA);
    snprintf(line2, sizeof(line2), "T:%-2dC A:%-5.1f", (int)temp, totalAccel);
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);

    // Serial Debug
    Serial.println("----------------------------------------");
    Serial.printf("V: %.2f V | I: %.1f mA | P: %.1f mW\n", busvoltage, current_mA, power_mW);
    Serial.printf("Temp: %.1f C | Hum: %.1f %%\n", temp, hum);
    Serial.printf("Accel: %.2f m/s2 | Health: %d %%\n", totalAccel, healthScore);
    Serial.printf("Fault: %s | Blynk: %s | Wi-Fi: %s\n", 
                  faultStatus.c_str(), 
                  Blynk.connected() ? "CONNECTED" : "DISCONNECTED",
                  WiFi.status() == WL_CONNECTED ? "ONLINE" : "NO INTERNET");
  }

  // ---------------- 2. Blynk Telemetry Stream (Every 3000ms) ----------------
  // Separated from 1s sensor loop to avoid Blynk Cloud Flood Protection disconnects
  if (currentMillis - lastBlynkUpdate >= BLYNK_TELEMETRY_INTERVAL) {
    lastBlynkUpdate = currentMillis;
    if (Blynk.connected()) {
      updateBlynkTelemetry();
    }
  }
}
