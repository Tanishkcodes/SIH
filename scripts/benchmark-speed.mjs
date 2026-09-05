import { readFile } from 'node:fs/promises';

async function test() {
  const url = 'https://pzaqzwmpynlqxsclbesj.supabase.co';
  const key = 'sb_publishable_aQTTcFxLfGPTzEphAE6DWQ_BqHlnDVU';
  
  console.log('--- Test 1: Acute Chest Pain (Cardiology) ---');
  const t0 = Date.now();
  const res1 = await fetch(`${url}/functions/v1/voice-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      action: 'anamnesis',
      disease: 'Severe chest tightness radiating to left arm',
      doctorSpecialty: 'Cardiology',
      doctorName: 'Dr. Mehta',
      isAyurvedic: false,
      history: [],
      latestInput: '',
      phase: 'interview',
      language: 'en'
    })
  });
  const t1 = Date.now();
  const d1 = await res1.json();
  console.log(`Time: ${t1 - t0}ms, Status: ${res1.status}`);
  console.log('Question:', d1.question);
  console.log('Options:', d1.options?.map(o => o.text || o));

  console.log('\n--- Test 2: Uncontrolled High Blood Sugar (Diabetology) ---');
  const t2 = Date.now();
  const res2 = await fetch(`${url}/functions/v1/voice-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      action: 'anamnesis',
      disease: 'Uncontrolled high blood sugar with blurry vision and fatigue',
      doctorSpecialty: 'Diabetology',
      doctorName: 'Dr. Sharma',
      isAyurvedic: false,
      history: [
        { sender: 'ai', text: 'How long have you noticed these symptoms?', field: 'duration' },
        { sender: 'user', text: 'Past 3 weeks', field: 'duration' }
      ],
      latestInput: 'Past 3 weeks',
      phase: 'interview',
      language: 'en'
    })
  });
  const t3 = Date.now();
  const d2 = await res2.json();
  console.log(`Time: ${t3 - t2}ms, Status: ${res2.status}`);
  console.log('Question:', d2.question);
  console.log('Options:', d2.options?.map(o => o.text || o));

  console.log('\n--- Test 3: Severe Migraine Headache (Hindi language) ---');
  const t4 = Date.now();
  const res3 = await fetch(`${url}/functions/v1/voice-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      action: 'anamnesis',
      disease: 'सिर में बहुत तेज दर्द और उल्टी जैसा लग रहा है',
      doctorSpecialty: 'Neurology',
      doctorName: 'Dr. Verma',
      isAyurvedic: false,
      history: [],
      latestInput: '',
      phase: 'interview',
      language: 'hi'
    })
  });
  const t5 = Date.now();
  const d3 = await res3.json();
  console.log(`Time: ${t5 - t4}ms, Status: ${res3.status}`);
  console.log('Question:', d3.question);
  console.log('Options:', d3.options?.map(o => o.text || o));
}

test().catch(console.error);
