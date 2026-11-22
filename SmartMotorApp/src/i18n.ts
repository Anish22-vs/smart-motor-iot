// src/i18n.ts - translations (English / Telugu / Hindi) and fault-type helper
export const LANGS = [['en', 'English'], ['te', 'తెలుగు'], ['hi', 'हिन्दी']];

export const T: any = {
  en: {
    title: 'Smart Motor Monitor', dashboard: 'Dashboard', controls: 'Controls', history: 'History', settings: 'Settings',
    waiting: 'Waiting for data...', offline: 'ESP32 offline', offlineMsg: 'No recent readings. Check that the ESP32 is powered and on WiFi.',
    normal: 'System Normal', ok: 'All readings are within safe limits.', alarm: 'ALARM',
    motorStatus: 'Motor Status', running: 'RUNNING', stopped: 'STOPPED', relay: 'Power relay', on: 'ENGAGED', off: 'CUTOFF',
    health: 'Motor Health Index', condition: 'Predictive condition', optimal: 'OPTIMAL', degraded: 'DEGRADED', critical: 'CRITICAL',
    vibration: 'Vibration (MPU6050)', currentVolt: 'Current & Voltage (INA219)', tempHum: 'Temperature & Humidity (DHT11)',
    cutMotor: '🛑 Cut Motor Power', startMotor: '▶ Start Motor',
    fanOn: '💨 Fan is ON (tap to turn off)', fanOff: '💨 Fan is OFF (tap to turn on)',
    buzzOn: '🔕 Buzzer is ON (tap to mute)', buzzOff: '🔔 Test Buzzer',
    confirmTitle: 'Cut motor power?', confirmMsg: 'The motor will stop running.', cancel: 'Cancel', yes: 'Yes',
    tip: 'Maintenance tip', trend: 'Health trend', trendMsg: 'Motor health has dropped. Plan an inspection soon.',
    language: 'Language', log: 'Recent Telemetry Log', ctrlHint: 'Button colours show the real state reported by the ESP32.',
    tips: {
      stall: 'Rotor may be stuck or overloaded. Cut motor power and check for blockage.',
      heat: 'Motor is overheating. Let it cool, check ventilation and the cooling fan.',
      vib: 'High vibration. Check bearings, shaft alignment and mounting bolts.',
      sag: 'Supply voltage is low. Check the power supply and wiring.',
      generic: 'Inspect the motor immediately.',
    },
  },
  te: {
    title: 'స్మార్ట్ మోటార్ మానిటర్', dashboard: 'డాష్‌బోర్డ్', controls: 'నియంత్రణలు', history: 'చరిత్ర', settings: 'సెట్టింగ్‌లు',
    waiting: 'డేటా కోసం వేచి ఉంది...', offline: 'ESP32 ఆఫ్‌లైన్', offlineMsg: 'ఇటీవలి రీడింగ్‌లు లేవు. ESP32 ఆన్‌లో ఉందో, WiFi కనెక్ట్ అయ్యిందో చూడండి.',
    normal: 'సిస్టమ్ సాధారణం', ok: 'అన్ని రీడింగ్‌లు సురక్షిత పరిధిలో ఉన్నాయి.', alarm: 'అలారం',
    motorStatus: 'మోటార్ స్థితి', running: 'నడుస్తోంది', stopped: 'ఆగింది', relay: 'పవర్ రిలే', on: 'ఆన్', off: 'ఆఫ్',
    health: 'మోటార్ ఆరోగ్యం', condition: 'అంచనా స్థితి', optimal: 'ఉత్తమం', degraded: 'తగ్గింది', critical: 'ప్రమాదకరం',
    vibration: 'కంపనం (MPU6050)', currentVolt: 'కరెంట్ & వోల్టేజ్ (INA219)', tempHum: 'ఉష్ణోగ్రత & తేమ (DHT11)',
    cutMotor: '🛑 మోటార్ ఆపండి', startMotor: '▶ మోటార్ ప్రారంభించండి',
    fanOn: '💨 ఫ్యాన్ ఆన్‌లో ఉంది (ఆపడానికి నొక్కండి)', fanOff: '💨 ఫ్యాన్ ఆఫ్‌లో ఉంది (ఆన్ చేయడానికి నొక్కండి)',
    buzzOn: '🔕 బజర్ ఆన్‌లో ఉంది (మ్యూట్ చేయడానికి నొక్కండి)', buzzOff: '🔔 బజర్ పరీక్షించండి',
    confirmTitle: 'మోటార్ ఆపాలా?', confirmMsg: 'మోటార్ ఆగిపోతుంది.', cancel: 'రద్దు', yes: 'అవును',
    tip: 'నిర్వహణ సూచన', trend: 'ఆరోగ్య ధోరణి', trendMsg: 'మోటార్ ఆరోగ్యం తగ్గింది. త్వరలో తనిఖీ చేయండి.',
    language: 'భాష', log: 'ఇటీవలి లాగ్', ctrlHint: 'బటన్ రంగులు ESP32 నివేదించిన అసలు స్థితిని చూపుతాయి.',
    tips: {
      stall: 'రోటర్ ఇరుక్కుపోయి లేదా ఓవర్‌లోడ్ అయి ఉండవచ్చు. మోటార్ ఆపి అడ్డంకిని తనిఖీ చేయండి.',
      heat: 'మోటార్ వేడెక్కుతోంది. చల్లబడనివ్వండి, గాలి మార్గం మరియు ఫ్యాన్ తనిఖీ చేయండి.',
      vib: 'కంపనం ఎక్కువగా ఉంది. బేరింగ్‌లు, షాఫ్ట్ అలైన్‌మెంట్ మరియు బోల్టులు తనిఖీ చేయండి.',
      sag: 'సరఫరా వోల్టేజ్ తక్కువగా ఉంది. పవర్ సప్లై మరియు వైరింగ్ తనిఖీ చేయండి.',
      generic: 'మోటార్‌ను వెంటనే తనిఖీ చేయండి.',
    },
  },
  hi: {
    title: 'स्मार्ट मोटर मॉनिटर', dashboard: 'डैशबोर्ड', controls: 'नियंत्रण', history: 'इतिहास', settings: 'सेटिंग्स',
    waiting: 'डेटा की प्रतीक्षा...', offline: 'ESP32 ऑफ़लाइन', offlineMsg: 'हाल की कोई रीडिंग नहीं। जाँचें कि ESP32 चालू और WiFi से जुड़ा है।',
    normal: 'सिस्टम सामान्य', ok: 'सभी रीडिंग सुरक्षित सीमा में हैं।', alarm: 'अलार्म',
    motorStatus: 'मोटर स्थिति', running: 'चालू', stopped: 'बंद', relay: 'पावर रिले', on: 'चालू', off: 'बंद',
    health: 'मोटर स्वास्थ्य', condition: 'अनुमानित स्थिति', optimal: 'उत्तम', degraded: 'कमज़ोर', critical: 'गंभीर',
    vibration: 'कंपन (MPU6050)', currentVolt: 'करंट और वोल्टेज (INA219)', tempHum: 'तापमान और नमी (DHT11)',
    cutMotor: '🛑 मोटर बंद करें', startMotor: '▶ मोटर चालू करें',
    fanOn: '💨 पंखा चालू है (बंद करने के लिए दबाएँ)', fanOff: '💨 पंखा बंद है (चालू करने के लिए दबाएँ)',
    buzzOn: '🔕 बज़र चालू है (बंद करने के लिए दबाएँ)', buzzOff: '🔔 बज़र जाँचें',
    confirmTitle: 'मोटर बंद करें?', confirmMsg: 'मोटर रुक जाएगी।', cancel: 'रद्द करें', yes: 'हाँ',
    tip: 'रखरखाव सुझाव', trend: 'स्वास्थ्य रुझान', trendMsg: 'मोटर का स्वास्थ्य गिर गया है। जल्द निरीक्षण करें।',
    language: 'भाषा', log: 'हाल का लॉग', ctrlHint: 'बटन के रंग ESP32 की असली स्थिति दिखाते हैं।',
    tips: {
      stall: 'रोटर फँसा या ओवरलोड हो सकता है। मोटर बंद करें और रुकावट जाँचें।',
      heat: 'मोटर गर्म हो रही है। ठंडा होने दें, हवा के रास्ते और पंखे की जाँच करें।',
      vib: 'कंपन अधिक है। बेयरिंग, शाफ्ट अलाइनमेंट और बोल्ट जाँचें।',
      sag: 'सप्लाई वोल्टेज कम है। पावर सप्लाई और वायरिंग जाँचें।',
      generic: 'मोटर का तुरंत निरीक्षण करें।',
    },
  },
};

export function faultKind(f: string) {
  const u = (f || '').toUpperCase();
  if (u.includes('STALL') || u.includes('OVERCURRENT')) return 'stall';
  if (u.includes('THERMAL') || u.includes('OVERHEAT')) return 'heat';
  if (u.includes('VIBRATION')) return 'vib';
  if (u.includes('SAG') || u.includes('VOLTAGE')) return 'sag';
  return 'generic';
}

Object.assign(T.en, { current: 'Current', voltage: 'Voltage', temperature: 'Temperature', humidity: 'Humidity', power: 'Power', vib: 'Vibration', motor: 'Motor', fan: 'Cooling Fan', buzzer: 'Alarm Buzzer', live: 'LIVE' });
Object.assign(T.te, { current: 'కరెంట్', voltage: 'వోల్టేజ్', temperature: 'ఉష్ణోగ్రత', humidity: 'తేమ', power: 'శక్తి', vib: 'కంపనం', motor: 'మోటార్', fan: 'కూలింగ్ ఫ్యాన్', buzzer: 'అలారం బజర్', live: 'లైవ్' });
Object.assign(T.hi, { current: 'करंट', voltage: 'वोल्टेज', temperature: 'तापमान', humidity: 'नमी', power: 'पावर', vib: 'कंपन', motor: 'मोटर', fan: 'कूलिंग पंखा', buzzer: 'अलार्म बज़र', live: 'लाइव' });
