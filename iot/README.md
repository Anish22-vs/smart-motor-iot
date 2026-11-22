# ⚡ Smart Motor Predictive Maintenance & Fault Detection

Condition Monitoring and Predictive Maintenance System for DC Motors using ESP32, INA219, MPU6050, DHT11, and a Web Dashboard.

---

## 📁 Project Structure

```text
untitled folder 2/
├── SmartMotor_Firmware/
│   └── SmartMotor_Firmware.ino   # Complete ESP32 Arduino Sketch with Wi-Fi & REST API
├── index.html                    # Clean RFID-Style HTML5 Dashboard
├── style.css                     # Simple & Clean Light Dashboard Stylesheet
├── script.js                     # Real-time Telemetry Client & Connection Controller
└── README.md                     # Setup & Demo Guide

Desktop/
└── smart_motor.html              # Standalone single-file dashboard (double-click to open!)
```

---

## 🔌 Hardware Pinout (ESP32)

| Component | ESP32 GPIO Pin | Protocol / Type | Function |
| :--- | :--- | :--- | :--- |
| **INA219** | **SDA: 21, SCL: 22** | I2C | Bus Voltage (V), Current (mA), Power (mW) |
| **MPU6050** | **SDA: 21, SCL: 22** | I2C | Total Acceleration & Vibration Dynamics ($m/s^2$) |
| **DHT11** | **GPIO 33** | Single-Wire Digital | Motor Enclosure Temperature (°C) & Humidity (%) |
| **16x2 LCD** | **RS: 15, EN: 2, D4: 4, D5: 16, D6: 17, D7: 5** | 4-bit Parallel | Local Telemetry Display |
| **DC Motor Relay**| **GPIO 32** | Digital Output (Active LOW) | Main Motor Power Cutoff |
| **Cooling Fan** | **GPIO 23** | Digital Output (Active HIGH)| Automated Enclosure Cooling |
| **Alarm Buzzer** | **GPIO 18** | Digital Output (Active HIGH)| Abnormal Condition Audible Alarm |

---

## 🌐 Wi-Fi Configuration

Configured in `SmartMotor_Firmware.ino`:
```cpp
#define USE_ENTERPRISE_WIFI false
const char* STANDARD_SSID = "ACTFIBERNET";     // Your Wi-Fi router SSID
const char* STANDARD_PASS = "act12345";        // Wi-Fi password (small letters)
```

### Soft-AP Fallback:
If the ESP32 cannot connect to `ACTFIBERNET` within 15 seconds, it automatically creates its own Access Point:
- **SSID**: `SmartMotor-AP`
- **Password**: `12345678`
- **Dashboard URL**: `http://192.168.4.1/`

---

## 🚀 How to Run the Project

### Step 1: Install Arduino Libraries
In Arduino IDE, open **Tools > Manage Libraries...** and install:
1. `Adafruit INA219`
2. `Adafruit MPU6050`
3. `Adafruit Unified Sensor`
4. `DHT sensor library` by Adafruit
5. `LiquidCrystal` (built-in)

### Step 2: Upload Firmware
1. Open `SmartMotor_Firmware.ino` in Arduino IDE.
2. Select your board: **ESP32 Dev Module**.
3. Select your COM Port and click **Upload**.
4. Open the Serial Monitor (115200 baud). The ESP32 will connect to `ACTFIBERNET` and print its IP address (e.g., `192.168.1.50`). The LCD also shows the IP.

### Step 3: Open the Dashboard
- **Standalone Double-Click**: Double-click `smart_motor.html` on your Desktop (or `index.html` in this folder).
- **Enter IP**: Enter the ESP32's IP address (shown on LCD) and click **Connect**.
- **Live Stream**: The dashboard connects, displays real motor values (health, vibration, current, voltage, temperature), and streams readings into the live table.
- **Direct from ESP32**: You can also open `http://<ESP32_IP>/` in any browser on your phone or laptop.

---

## 🎯 Predictive Maintenance Rules & Thresholds

| Fault Condition | Primary Metric | Critical Trigger | Automated Action |
| :--- | :--- | :--- | :--- |
| **Bearing Wear / Rotor Misalignment** | MPU6050 Vibration ($a_{total}$) | $\ge 11.0\,m/s^2$ | Buzzer ON, Health degraded by 40% |
| **Motor Stall / Rotor Lock** | INA219 Current ($I_{mA}$) | $> 100.0\,mA$ | Buzzer ON, Health degraded by 45% |
| **Thermal Overload** | DHT11 Temperature ($T$) | $> 40.0\,^\circ C$ | Buzzer ON, Cooling Fan ON, Health -35% |
| **Supply Voltage Sag** | INA219 Voltage ($V_{bus}$) | $< 9.0\,V$ | Health degraded by 15% |
