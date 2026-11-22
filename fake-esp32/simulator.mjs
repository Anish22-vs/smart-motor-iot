// Fake ESP32: behaves like the real hardware will.
// Writes /motor/telemetry every second, reads /motor/commands.
// Run:  npm install firebase   then   node simulator.mjs
// Type in the terminal while it runs:  stall | heat | vib | sag | normal

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push } from "firebase/database";
import readline from "node:readline";

const firebaseConfig = {
  apiKey: "AIzaSyCT3EGqldee2x7zJ5id_VupWQiehKsOVh0",
  authDomain: "smartmotor-iot.firebaseapp.com",
  databaseURL: "https://smartmotor-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartmotor-iot",
  appId: "1:407121793604:web:e2bafe22e2d83e2cf02211",
};

const db = getDatabase(initializeApp(firebaseConfig));
const jitter = (v, a) => v + (Math.random() - 0.5) * a;

// Real device state (the ESP32 is the source of truth)
const state = { motor: true, fan: false, buzzer: false };
set(ref(db, "motor/commands"), { ...state });
let injected = "normal";

// Listen for commands from the app
onValue(ref(db, "motor/commands"), (snap) => {
  const c = snap.val();
  if (!c) return;
  for (const k of ["motor", "fan", "buzzer"]) {
    if (typeof c[k] === "boolean" && c[k] !== state[k]) {
      state[k] = c[k];
      console.log(`Command received: ${k} -> ${c[k] ? "ON" : "OFF"}`);
    }
  }
});

// Type a fault name in the terminal to test alerts
readline.createInterface({ input: process.stdin }).on("line", (l) => {
  injected = l.trim().toLowerCase();
  console.log("Scenario:", injected);
});

function makeReading() {
  let voltage = jitter(12, 0.2);
  let current = state.motor ? jitter(42, 4) : 0;
  let accel = state.motor ? jitter(9.85, 0.3) : 9.81;
  let temperature = jitter(28.5, 0.5);
  const humidity = Math.round(jitter(52, 2));
  let fault = "NORMAL";
  let health = 98;

  if (state.motor) {
    if (injected === "stall") { current = jitter(130, 6); fault = "MOTOR STALL / OVERCURRENT"; health = 55; }
    if (injected === "heat")  { temperature = jitter(45, 1); fault = "THERMAL OVERLOAD"; health = 63; state.fan = true; }
    if (injected === "vib")   { accel = jitter(12.5, 0.4); fault = "HIGH VIBRATION (BEARING WEAR)"; health = 58; }
    if (injected === "sag")   { voltage = jitter(8.4, 0.2); fault = "SUPPLY VOLTAGE SAG"; health = 83; }
  }
  state.buzzer = state.buzzer || fault !== "NORMAL";

  return {
    voltage: +voltage.toFixed(1), current: Math.round(current),
    power: Math.round(voltage * current),
    accel: +accel.toFixed(2),
    accel_x: +jitter(0.1, 0.4).toFixed(2), accel_y: +jitter(-0.1, 0.4).toFixed(2),
    accel_z: +jitter(9.8, 0.2).toFixed(2),
    temperature: +temperature.toFixed(1), humidity,
    motor: state.motor, fan: state.fan, buzzer: state.buzzer,
    fault, health, timestamp: Date.now(),
  };
}

setInterval(async () => {
  const r = makeReading();
  await set(ref(db, "motor/telemetry"), r);
  await push(ref(db, "motor/history"), r);
  console.log(new Date().toLocaleTimeString(), r.current + "mA", r.temperature + "C", r.accel + "m/s2", r.fault);
}, 1000);
