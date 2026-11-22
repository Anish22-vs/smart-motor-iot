// src/firebase.js  (put in your Expo app's src folder)
// Install first:  npx expo install firebase
// Note: getAnalytics is NOT used. It does not work in React Native.

import { initializeApp } from "firebase/app";
import {
  getDatabase, ref, onValue, set, update,
  query, limitToLast,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCT3EGqldee2x7zJ5id_VupWQiehKsOVh0",
  authDomain: "smartmotor-iot.firebaseapp.com",
  databaseURL: "https://smartmotor-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartmotor-iot",
  storageBucket: "smartmotor-iot.firebasestorage.app",
  messagingSenderId: "407121793604",
  appId: "1:407121793604:web:e2bafe22e2d83e2cf02211",
};

const db = getDatabase(initializeApp(firebaseConfig));

// Live readings written by the ESP32. Returns an unsubscribe function.
export function subscribeTelemetry(callback) {
  return onValue(ref(db, "motor/telemetry"), (snap) => callback(snap.val()));
}

// Last N readings for the History charts.
export function subscribeHistory(callback, n = 60) {
  const q = query(ref(db, "motor/history"), limitToLast(n));
  return onValue(q, (snap) => {
    const rows = [];
    snap.forEach((child) => rows.push(child.val()));
    callback(rows);
  });
}

// Send a command. The ESP32 applies it and reports the real state back in telemetry.
export function sendCommand(name, value) {
  return update(ref(db, "motor/commands"), { [name]: value });
}

// Make sure the commands node exists (call once at app start)
export function initCommands() {
  return set(ref(db, "motor/commands"), { motor: true, fan: false, buzzer: false });
}

// Fault thresholds from your report (vibration is 11, not 18)
export const THRESH = { current: 100, temp: 40, accel: 11, voltMin: 9 };
