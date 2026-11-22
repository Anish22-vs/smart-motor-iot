/**
 * ============================================================================
 * SMART MOTOR PREDICTIVE MAINTENANCE & FAULT DETECTION DASHBOARD
 * Simple, Clean Client Logic matching RFID Dashboard
 * ============================================================================
 */

// Application State
const appState = {
  espIp: '',
  isConnected: false,
  isSimulating: false,
  pollTimer: null,
  simTimer: null,
  telemetryLogs: []
};

// DOM Elements
const ipInput = document.getElementById('espIpInput');
const btnConnect = document.getElementById('btnConnect');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const alertBox = document.getElementById('alertBox');
const alertTitle = document.getElementById('alertTitle');
const alertMsg = document.getElementById('alertMsg');

const cardMotorStatus = document.getElementById('cardMotorStatus');
const cardMotorRelay = document.getElementById('cardMotorRelay');
const cardHealth = document.getElementById('cardHealth');
const cardHealthDesc = document.getElementById('cardHealthDesc');
const cardVibration = document.getElementById('cardVibration');
const cardVibAxes = document.getElementById('cardVibAxes');
const cardCurrent = document.getElementById('cardCurrent');
const cardVoltage = document.getElementById('cardVoltage');
const cardTemp = document.getElementById('cardTemp');
const cardHumidity = document.getElementById('cardHumidity');

const btnMotor = document.getElementById('btnMotor');
const btnFan = document.getElementById('btnFan');
const btnBuzzer = document.getElementById('btnBuzzer');
const tableBody = document.getElementById('telemetryTableBody');

// On Page Load: STRICTLY DISCONNECTED - NO AUTO-RUNNING FAKE VALUES!
document.addEventListener('DOMContentLoaded', () => {
  // If served directly from the ESP32 (e.g. http://192.168.1.45/), default IP to that host
  if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol.startsWith('http')) {
    ipInput.value = window.location.hostname;
  } else {
    // Look up saved IP if any, otherwise leave blank or suggested
    const savedIp = localStorage.getItem('smart_motor_ip');
    ipInput.value = savedIp || '192.168.1.50';
  }

  // Ensure initial display shows clean disconnected state
  resetDisplayToDisconnected();
});

// Reset all cards and statuses to blank "--"
function resetDisplayToDisconnected() {
  cardMotorStatus.innerText = '--';
  cardMotorStatus.className = 'val-muted';
  cardMotorRelay.innerText = 'Power Relay: --';

  cardHealth.innerText = '--';
  cardHealth.className = 'val-muted';
  cardHealthDesc.innerText = 'Predictive Condition: --';

  cardVibration.innerText = '--';
  cardVibration.className = 'val-muted';
  cardVibAxes.innerText = 'Limit: 18.0 m/s²';

  cardCurrent.innerText = '--';
  cardCurrent.className = 'val-muted';
  cardVoltage.innerText = 'Voltage: -- V | Power: -- mW';

  cardTemp.innerText = '--';
  cardTemp.className = 'val-muted';
  cardHumidity.innerText = 'Humidity: -- % | Limit: 40.0°C';

  btnMotor.className = 'btn-ctrl';
  btnFan.className = 'btn-ctrl';
  btnBuzzer.className = 'btn-ctrl';

  statusBadge.className = 'status-badge status-disconnected';
  statusText.innerText = 'Disconnected';

  btnConnect.innerText = 'Connect';
  btnConnect.className = 'btn btn-connect';

  alertBox.className = 'alert-box info';
  alertTitle.innerText = 'ℹ System Disconnected';
  alertMsg.innerHTML = 'ESP32 is not connected. Connect your ESP32 to Wi-Fi (<b>ACTFIBERNET</b>), check the IP address displayed on the LCD, enter it above, and click <b>Connect</b>.';
}

// Connect / Disconnect Toggle
async function handleConnectToggle() {
  if (appState.isConnected) {
    disconnectESP('User disconnected.');
  } else {
    const ip = ipInput.value.trim();
    if (!ip) {
      alert('Please enter your ESP32 IP address (e.g. 192.168.1.50).');
      ipInput.focus();
      return;
    }
    localStorage.setItem('smart_motor_ip', ip);
    appState.espIp = ip;
    await connectESP(ip);
  }
}

// Connect to ESP32
async function connectESP(ip) {
  statusBadge.className = 'status-badge status-connecting';
  statusText.innerText = 'Connecting...';
  btnConnect.innerText = 'Connecting...';
  btnConnect.disabled = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`http://${ip}/api/data`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Success!
    appState.isConnected = true;
    btnConnect.disabled = false;
    btnConnect.innerText = 'Disconnect';
    btnConnect.className = 'btn btn-disconnect';

    statusBadge.className = 'status-badge status-connected';
    statusText.innerText = `Connected (${ip})`;

    updateDashboard(data);

    // Start background polling every 1 second
    if (appState.pollTimer) clearInterval(appState.pollTimer);
    appState.pollTimer = setInterval(pollTelemetry, 1000);

  } catch (err) {
    btnConnect.disabled = false;
    disconnectESP(`Could not connect to ESP32 at http://${ip}/api/data. Ensure the ESP32 is powered on and both your computer and ESP32 are connected to Wi-Fi: ACTFIBERNET.`);
  }
}

// Periodic Telemetry Fetch
async function pollTelemetry() {
  if (!appState.isConnected) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://${appState.espIp}/api/data`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    updateDashboard(data);
  } catch (err) {
    // If multiple failed polls, disconnect
    disconnectESP(`Lost connection to ESP32 at ${appState.espIp}. Telemetry halted.`);
  }
}

// Disconnect helper
function disconnectESP(message) {
  if (appState.pollTimer) {
    clearInterval(appState.pollTimer);
    appState.pollTimer = null;
  }
  appState.isConnected = false;
  resetDisplayToDisconnected();

  if (message) {
    alertBox.className = 'alert-box danger';
    alertTitle.innerText = '⚠ Connection Notice';
    alertMsg.innerText = message;
  }
}

// Update UI with real telemetry data
function updateDashboard(d) {
  // 1. Motor Status
  cardMotorStatus.innerText = d.motor ? 'RUNNING' : 'STOPPED';
  cardMotorStatus.className = d.motor ? 'highlight-ok' : 'highlight-bad';
  cardMotorRelay.innerText = `Power Relay: ${d.motor ? 'ENGAGED' : 'CUTOFF'}`;

  // 2. Motor Health Index
  cardHealth.innerText = `${d.health}%`;
  if (d.health >= 80) {
    cardHealth.className = 'highlight-ok';
    cardHealthDesc.innerText = 'Predictive Condition: OPTIMAL';
  } else if (d.health >= 50) {
    cardHealth.className = 'highlight-warn';
    cardHealthDesc.innerText = 'Predictive Condition: DEGRADED';
  } else {
    cardHealth.className = 'highlight-bad';
    cardHealthDesc.innerText = 'Predictive Condition: CRITICAL';
  }

  // 3. Vibration (MPU6050)
  cardVibration.innerText = `${d.accel.toFixed(2)} m/s²`;
  if (d.accel >= 18.0) {
    cardVibration.className = 'highlight-bad';
    cardVibAxes.innerText = `⚠️ CRITICAL VIBRATION! (X:${d.accel_x.toFixed(1)} Y:${d.accel_y.toFixed(1)} Z:${d.accel_z.toFixed(1)})`;
  } else {
    cardVibration.className = 'highlight-ok';
    cardVibAxes.innerText = `Axes: X:${d.accel_x.toFixed(1)} | Y:${d.accel_y.toFixed(1)} | Z:${d.accel_z.toFixed(1)}`;
  }

  // 4. Current & Voltage (INA219)
  cardCurrent.innerText = `${Math.round(d.current)} mA`;
  cardCurrent.className = d.current > 100.0 ? 'highlight-bad' : 'highlight-ok';
  cardVoltage.innerText = `Voltage: ${d.voltage.toFixed(1)} V | Power: ${Math.round(d.power)} mW`;

  // 5. Temperature & Humidity (DHT11)
  cardTemp.innerText = `${d.temperature.toFixed(1)} °C`;
  cardTemp.className = d.temperature > 40.0 ? 'highlight-bad' : 'highlight-ok';
  cardHumidity.innerText = `Humidity: ${Math.round(d.humidity)}% RH | Limit: 40.0°C`;

  // Actuator Buttons styling
  btnMotor.className = d.motor ? 'btn-ctrl active-red' : 'btn-ctrl';
  btnMotor.innerText = d.motor ? '🛑 Cut Motor Power' : '▶ Start Motor';

  btnFan.className = d.fan ? 'btn-ctrl active-blue' : 'btn-ctrl';
  btnFan.innerText = d.fan ? '💨 Fan Running (Toggle)' : '💨 Fan Off (Toggle)';

  btnBuzzer.className = d.buzzer ? 'btn-ctrl active-red' : 'btn-ctrl';
  btnBuzzer.innerText = d.buzzer ? '🔕 Buzzer Sounding (Mute)' : '🔔 Test Buzzer';

  // Alert Box update
  const smsBox = document.getElementById('smsAlertBox');
  const smsMsg = document.getElementById('smsAlertMsg');
  if (d.fault && d.fault !== 'NORMAL') {
    alertBox.className = 'alert-box danger';
    alertTitle.innerText = `⚠️ ALARM: ${d.fault}`;
    if (smsBox) {
      smsBox.style.display = 'block';
      smsMsg.innerHTML = `SMS Alert dispatched to admin phone at <b>${new Date().toLocaleTimeString()}</b> for event: <b>${d.fault}</b>`;
    }
    let actionTip = 'Inspect motor immediately.';
    if (d.fault.includes('VIBRATION')) actionTip = 'High mechanical vibration detected. Inspect bearings, rotor alignment, and lubrication.';
    if (d.fault.includes('OVERCURRENT') || d.fault.includes('STALL')) actionTip = 'Rotor stall or overcurrent detected! Cut motor power to avoid winding damage.';
    if (d.fault.includes('THERMAL') || d.fault.includes('OVERHEAT')) actionTip = 'Critical temperature threshold exceeded! Enclosure cooling fan engaged.';
    alertMsg.innerText = actionTip;
  } else {
    alertBox.className = 'alert-box success';
    alertTitle.innerText = '✔ System Normal';
    alertMsg.innerText = 'ESP32 is connected. All telemetry parameters (voltage, current, vibration, temperature) are within safe operating limits.';
    if (smsBox) smsBox.style.display = 'none';
  }

  // Add entry to Recent Telemetry Table
  addTelemetryRow(d);
}

// Add a row to the table
function addTelemetryRow(d) {
  const now = new Date().toLocaleTimeString();

  // Remove placeholder row if present
  if (appState.telemetryLogs.length === 0) {
    tableBody.innerHTML = '';
  }

  const isFault = d.fault && d.fault !== 'NORMAL';
  const rowHtml = `
    <tr>
      <td><b>${now}</b></td>
      <td>${d.voltage.toFixed(1)}</td>
      <td>${Math.round(d.current)}</td>
      <td>${Math.round(d.power)}</td>
      <td style="color:${d.accel >= 18.0 ? '#dc2626' : '#16a34a'}; font-weight:600;">${d.accel.toFixed(2)}</td>
      <td style="color:${d.temperature >= 40.0 ? '#dc2626' : '#16a34a'}; font-weight:600;">${d.temperature.toFixed(1)}</td>
      <td>${Math.round(d.humidity)}</td>
      <td><b style="color:${d.motor ? '#16a34a' : '#dc2626'}">${d.motor ? 'ON' : 'OFF'}</b></td>
      <td class="${isFault ? 'status-fault' : 'status-ok'}">${isFault ? d.fault : 'NORMAL'}</td>
    </tr>
  `;

  tableBody.insertAdjacentHTML('afterbegin', rowHtml);
  appState.telemetryLogs.unshift(d);

  // Keep max 20 entries
  while (tableBody.children.length > 20) {
    tableBody.removeChild(tableBody.lastChild);
  }
}

// Clear table log
window.clearLogTable = function() {
  appState.telemetryLogs = [];
  tableBody.innerHTML = `
    <tr>
      <td colspan="9" style="color: #9ca3af; padding: 25px;">Log cleared. Waiting for new telemetry readings...</td>
    </tr>
  `;
};

// Actuator Controls
window.toggleMotorRelay = async function() {
  if (!appState.isConnected && !appState.isSimulating) {
    alert('Please connect to the ESP32 first.');
    return;
  }
  if (appState.isConnected) {
    try {
      await fetch(`http://${appState.espIp}/api/motor/toggle`);
      pollTelemetry();
    } catch (e) {
      alert('Failed to send motor command to ESP32.');
    }
  } else if (appState.isSimulating) {
    simData.motor = !simData.motor;
    updateDashboard(simData);
  }
};

window.toggleCoolingFan = async function() {
  if (!appState.isConnected && !appState.isSimulating) {
    alert('Please connect to the ESP32 first.');
    return;
  }
  if (appState.isConnected) {
    try {
      await fetch(`http://${appState.espIp}/api/fan/toggle`);
      pollTelemetry();
    } catch (e) {
      alert('Failed to send fan command to ESP32.');
    }
  } else if (appState.isSimulating) {
    simData.fan = !simData.fan;
    updateDashboard(simData);
  }
};

window.toggleAlarmBuzzer = async function() {
  if (!appState.isConnected && !appState.isSimulating) {
    alert('Please connect to the ESP32 first.');
    return;
  }
  if (appState.isConnected) {
    try {
      await fetch(`http://${appState.espIp}/api/buzzer/toggle`);
      pollTelemetry();
    } catch (e) {
      alert('Failed to send buzzer command to ESP32.');
    }
  } else if (appState.isSimulating) {
    simData.buzzer = !simData.buzzer;
    updateDashboard(simData);
  }
};

// Optional Demo / Simulator (Strictly manual toggle - never runs by default!)
const simData = {
  voltage: 12.0,
  current: 42.0,
  power: 504.0,
  temperature: 28.5,
  humidity: 52.0,
  accel: 9.81,
  accel_x: 0.1,
  accel_y: -0.2,
  accel_z: 9.81,
  motor: true,
  fan: false,
  buzzer: false,
  fault: 'NORMAL',
  health: 100
};

window.toggleSimMode = function(enabled) {
  appState.isSimulating = enabled;

  if (enabled) {
    if (appState.isConnected) {
      disconnectESP('Switched to Demo Simulation Mode.');
    }
    statusBadge.className = 'status-badge status-connected';
    statusText.innerText = 'Demo Mode (Simulated)';
    alertBox.className = 'alert-box info';
    alertTitle.innerText = '🧪 Demo Simulation Active';
    alertMsg.innerText = 'Displaying mock physical motor telemetry for demonstration/viva testing.';

    if (appState.simTimer) clearInterval(appState.simTimer);
    appState.simTimer = setInterval(() => {
      if (simData.motor) {
        simData.voltage = 12.0 + (Math.random() - 0.5) * 0.2;
        simData.current = 42.0 + (Math.random() - 0.5) * 4.0;
        simData.accel = 9.81 + (Math.random() - 0.5) * 0.3;
        simData.accel_x = (Math.random() - 0.5) * 0.4;
        simData.accel_y = (Math.random() - 0.5) * 0.4;
        simData.accel_z = 9.8 + (Math.random() - 0.5) * 0.2;
        simData.temperature = 28.5 + (Math.random() - 0.5) * 0.5;
        simData.power = simData.voltage * simData.current;
        simData.health = 98;
        simData.fault = 'NORMAL';
      } else {
        simData.current = 0;
        simData.power = 0;
        simData.accel = 9.81;
      }
      updateDashboard(simData);
    }, 1000);
    updateDashboard(simData);
  } else {
    if (appState.simTimer) {
      clearInterval(appState.simTimer);
      appState.simTimer = null;
    }
    resetDisplayToDisconnected();
  }
};
