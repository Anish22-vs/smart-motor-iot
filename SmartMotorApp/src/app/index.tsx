// src/app/index.tsx  (VERSION 3 - redesigned UI)
// Needs:  npx expo install react-native-svg   and the file  src/i18n.ts
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { sendCommand, subscribeHistory, subscribeTelemetry, THRESH } from '../firebase';
import { faultKind, LANGS, T } from '../i18n';

const C = { bg: '#0b1220', card: '#111a2e', border: '#1f2a44', text: '#e5e7eb', mute: '#8b97b1',
  ok: '#22c55e', warn: '#f59e0b', bad: '#ef4444', blue: '#3b82f6', purple: '#a78bfa', orange: '#fb923c' };
const TABS = [['dashboard', '📊'], ['controls', '🎛️'], ['history', '📈'], ['settings', '⚙️']];

function Ring({ pct, color, label, sub }: any) {
  const r = 56, c = 2 * Math.PI * r;
  return (
    <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={132} height={132}>
        <Circle cx={66} cy={66} r={r} stroke={C.border} strokeWidth={12} fill="none" />
        <Circle cx={66} cy={66} r={r} stroke={color} strokeWidth={12} fill="none" strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`} rotation={-90} origin="66, 66" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color, fontSize: 30, fontWeight: '800' }}>{label}</Text>
        <Text style={{ color: C.mute, fontSize: 11 }}>{sub}</Text>
      </View>
    </View>
  );
}

function Tile({ icon, label, value, unit, color, pct }: any) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{icon} {label}</Text>
      <Text style={[s.tileVal, { color }]}>{value}<Text style={s.tileUnit}> {unit}</Text></Text>
      <View style={s.barBg}><View style={[s.barFill, { width: `${Math.min(100, Math.max(4, pct))}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

function LineChart({ title, values, color, limit, unit }: any) {
  const [w, setW] = useState(300);
  const h = 110;
  const maxV = Math.max(...values, limit || 0, 1) * 1.1;
  const pts = values.map((v: number, i: number) => `${(i / Math.max(values.length - 1, 1)) * w},${h - (v / maxV) * h}`).join(' ');
  const ly = limit ? h - (limit / maxV) * h : null;
  const last = values.length ? values[values.length - 1] : 0;
  return (
    <View style={s.panel}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.panelTitle}>{title}</Text>
        <Text style={{ color, fontWeight: '800' }}>{last} {unit}</Text>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ marginTop: 8 }}>
        <Svg width={w} height={h}>
          {ly !== null && <Line x1={0} y1={ly} x2={w} y2={ly} stroke={C.bad} strokeDasharray="5,4" strokeWidth={1} />}
          {values.length > 1 && <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} />}
        </Svg>
      </View>
      {limit ? <Text style={{ color: C.bad, fontSize: 10, marginTop: 2 }}>- - limit {limit} {unit}</Text> : null}
    </View>
  );
}

export default function App() {
  const [lang, setLang] = useState('en');
  const [tab, setTab] = useState('dashboard');
  const [d, setD] = useState<any>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const t = T[lang];

  useEffect(() => {
    const u1 = subscribeTelemetry((v: any) => setD(v));
    const u2 = subscribeHistory((rows: any[]) => setHist(rows), 60);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { u1(); u2(); clearInterval(timer); };
  }, []);

  const online = !!d && (d.timestamp < 1e12 || now - d.timestamp < 6000);
  const hasFault = !!d && d.fault && d.fault !== 'NORMAL';
  const hc = !d ? C.mute : d.health >= 80 ? C.ok : d.health >= 50 ? C.warn : C.bad;
  const ht = !d ? '--' : d.health >= 80 ? t.optimal : d.health >= 50 ? t.degraded : t.critical;
  const trendDrop = hist.length > 10 ? hist[0].health - hist[hist.length - 1].health : 0;
  const lvl = (v: number, lim: number) => (v > lim ? C.bad : v > lim * 0.85 ? C.warn : C.ok);

  function toggle(name: 'motor' | 'fan' | 'buzzer') {
    if (!d) return;
    if (name === 'motor' && d.motor) {
      const go = () => sendCommand('motor', false);
      if (Platform.OS === 'web') { if (window.confirm(t.confirmTitle + '\n' + t.confirmMsg)) go(); }
      else Alert.alert(t.confirmTitle, t.confirmMsg, [{ text: t.cancel, style: 'cancel' }, { text: t.yes, style: 'destructive', onPress: go }]);
    } else sendCommand(name, !d[name]);
  }

  const bannerColor = !online ? C.mute : hasFault ? C.bad : C.ok;

  const dashboard = (
    <View>
      <View style={[s.banner, { borderColor: bannerColor, backgroundColor: bannerColor + '22' }]}>
        <Text style={[s.bannerTitle, { color: bannerColor }]}>
          {!d ? t.waiting : !online ? t.offline : hasFault ? '⚠ ' + t.alarm + ': ' + d.fault : '✔ ' + t.normal}
        </Text>
        <Text style={s.bannerText}>{!d ? '' : !online ? t.offlineMsg : hasFault ? t.tips[faultKind(d.fault)] : t.ok}</Text>
      </View>

      {d && (
        <>
          <View style={s.hero}>
            <Ring pct={d.health} color={hc} label={d.health + '%'} sub={t.health} />
            <View style={{ flex: 1, marginLeft: 18 }}>
              <Text style={s.mute}>{t.condition}</Text>
              <Text style={[s.heroState, { color: hc }]}>{ht}</Text>
              <View style={[s.pill, { backgroundColor: (d.motor ? C.ok : C.bad) + '33' }]}>
                <Text style={{ color: d.motor ? C.ok : C.bad, fontWeight: '800', fontSize: 12 }}>● {d.motor ? t.running : t.stopped}</Text>
              </View>
              <Text style={[s.mute, { marginTop: 6 }]}>{t.relay}: {d.motor ? t.on : t.off}</Text>
            </View>
          </View>

          {trendDrop >= 10 && (
            <View style={[s.banner, { borderColor: C.warn, backgroundColor: C.warn + '22' }]}>
              <Text style={[s.bannerTitle, { color: C.warn }]}>📉 {t.trend} (−{trendDrop}%)</Text>
              <Text style={s.bannerText}>{t.trendMsg}</Text>
            </View>
          )}

          <View style={s.grid}>
            <Tile icon="⚡" label={t.current} value={d.current} unit="mA" color={lvl(d.current, THRESH.current)} pct={(d.current / THRESH.current) * 100} />
            <Tile icon="📳" label={t.vib} value={d.accel.toFixed(2)} unit="m/s²" color={d.accel >= THRESH.accel ? C.bad : C.ok} pct={(d.accel / THRESH.accel) * 100} />
            <Tile icon="🌡️" label={t.temperature} value={d.temperature} unit="°C" color={lvl(d.temperature, THRESH.temp)} pct={(d.temperature / THRESH.temp) * 100} />
            <Tile icon="🔋" label={t.voltage} value={d.voltage} unit="V" color={d.voltage < THRESH.voltMin ? C.bad : C.ok} pct={(d.voltage / 15) * 100} />
            <Tile icon="💡" label={t.power} value={d.power} unit="mW" color={C.blue} pct={(d.power / 1500) * 100} />
            <Tile icon="💧" label={t.humidity} value={d.humidity} unit="%" color={C.blue} pct={d.humidity} />
          </View>
        </>
      )}
    </View>
  );

  const items: any[] = d ? [
    ['motor', '⚙️', t.motor, d.motor], ['fan', '💨', t.fan, d.fan], ['buzzer', '🔔', t.buzzer, d.buzzer],
  ] : [];
  const controls = (
    <View>
      <Text style={s.h2}>{t.controls}</Text>
      <Text style={s.mute}>{t.ctrlHint}</Text>
      {!d && <Text style={s.mute}>{t.waiting}</Text>}
      {items.map(([key, icon, name, on]) => (
        <View key={key} style={s.ctrlCard}>
          <Text style={{ fontSize: 30 }}>{icon}</Text>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.ctrlName}>{name}</Text>
            <Text style={{ color: on ? C.ok : C.mute, fontWeight: '800', fontSize: 12 }}>{on ? 'ON' : 'OFF'}</Text>
          </View>
          <Switch value={!!on} onValueChange={() => toggle(key)} trackColor={{ false: '#374151', true: C.ok }} thumbColor="#fff" />
        </View>
      ))}
    </View>
  );

  const history = (
    <View>
      <LineChart title={t.current} values={hist.map((h) => h.current)} color={C.blue} limit={THRESH.current} unit="mA" />
      <LineChart title={t.temperature} values={hist.map((h) => h.temperature)} color={C.orange} limit={THRESH.temp} unit="°C" />
      <LineChart title={t.vib} values={hist.map((h) => h.accel)} color={C.purple} limit={THRESH.accel} unit="m/s²" />
      <Text style={s.h2}>{t.log}</Text>
      {hist.slice(-15).reverse().map((h, i) => (
        <View key={i} style={s.logRow}>
          <Text style={s.logTime}>{new Date(h.timestamp).toLocaleTimeString()}</Text>
          <Text style={s.logText}>{h.current}mA · {h.temperature}°C · {h.accel}</Text>
          <Text style={{ color: h.fault === 'NORMAL' ? C.ok : C.bad, fontWeight: '800' }}>{h.fault === 'NORMAL' ? '●' : '▲'}</Text>
        </View>
      ))}
    </View>
  );

  const settings = (
    <View>
      <Text style={s.h2}>{t.language}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {LANGS.map(([code, name]: any) => (
          <Pressable key={code} style={[s.langBtn, lang === code && { backgroundColor: C.blue }]} onPress={() => setLang(code)}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[s.panel, { marginTop: 16 }]}>
        <Text style={[s.panelTitle, { color: online ? C.ok : C.bad }]}>● {online ? 'ESP32 online' : t.offline}</Text>
        <Text style={s.mute}>ESP32 → Firebase → App</Text>
      </View>
      <View style={s.panel}>
        <Text style={s.mute}>{t.current} &gt; {THRESH.current} mA</Text>
        <Text style={s.mute}>{t.temperature} &gt; {THRESH.temp} °C</Text>
        <Text style={s.mute}>{t.vib} ≥ {THRESH.accel} m/s²</Text>
        <Text style={s.mute}>{t.voltage} &lt; {THRESH.voltMin} V</Text>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>⚡ {t.title}</Text>
          <Text style={s.mute}>IoT Predictive Maintenance</Text>
        </View>
        <View style={[s.pill, { backgroundColor: (online ? C.ok : C.bad) + '33' }]}>
          <Text style={{ color: online ? C.ok : C.bad, fontWeight: '800', fontSize: 11 }}>● {online ? t.live : t.offline}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        {tab === 'dashboard' && dashboard}
        {tab === 'controls' && controls}
        {tab === 'history' && history}
        {tab === 'settings' && settings}
      </ScrollView>
      <View style={s.tabBar}>
        {TABS.map(([k, icon]) => (
          <Pressable key={k} style={s.tabItem} onPress={() => setTab(k)}>
            <Text style={{ fontSize: 20, opacity: tab === k ? 1 : 0.5 }}>{icon}</Text>
            <Text style={[s.tabText, tab === k && { color: C.blue, fontWeight: '800' }]}>{t[k]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 14 : 54, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.text, fontSize: 18, fontWeight: '800' },
  mute: { color: C.mute, fontSize: 12, marginVertical: 2 },
  h2: { color: C.text, fontSize: 18, fontWeight: '800', marginVertical: 10 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  bannerTitle: { fontSize: 15, fontWeight: '800' },
  bannerText: { color: C.text, fontSize: 13, marginTop: 4 },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  heroState: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48.5%', backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  tileLabel: { color: C.mute, fontSize: 12, fontWeight: '600' },
  tileVal: { fontSize: 26, fontWeight: '800', marginVertical: 6 },
  tileUnit: { fontSize: 12, color: C.mute, fontWeight: '600' },
  barBg: { height: 5, backgroundColor: C.border, borderRadius: 3 },
  barFill: { height: 5, borderRadius: 3 },
  panel: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  panelTitle: { color: C.text, fontWeight: '700', fontSize: 14 },
  ctrlCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: C.border },
  ctrlName: { color: C.text, fontSize: 17, fontWeight: '700' },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.card, padding: 10, borderRadius: 8, marginBottom: 6 },
  logTime: { color: C.text, fontSize: 12, fontWeight: '700' },
  logText: { color: C.mute, fontSize: 12 },
  langBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  tabBar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'web' ? 0 : 22 },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 11, color: C.mute, marginTop: 2 },
});
