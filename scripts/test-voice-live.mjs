// Synthetic data only. Does not execute navigation or change database records.
import assert from 'node:assert/strict';
const endpoint = process.env.VOICE_TEST_URL || 'https://pzaqzwmpynlqxsclbesj.supabase.co/functions/v1/voice-ai';
const publishableKey = process.env.VOICE_TEST_KEY || 'sb_publishable_aQTTcFxLfGPTzEphAE6DWQ_BqHlnDVU';
const actions = [
  { intent: 'openAppointments', description: 'View appointments and start booking a consultation' },
  { intent: 'viewReports', description: 'Open patient medical reports' },
  { intent: 'selectDoctor', description: 'Choose doctor. Current doctors: id=test-doctor-1, Dr. Kavya Sen, cardiology, hospital Test Sunrise; id=test-doctor-2, Dr. Neel Shah, dermatology, hospital Test River.' },
  { intent: 'selectHospital', description: 'Choose hospital. Current hospitals: id=test-hospital-1, Test Sunrise; id=test-hospital-2, Test River.' },
  { intent: 'activate_0', label: 'Transport assistance', description: 'Transport assistance: a newly added service for arranging a ride to hospital' },
];
const cases = [
  ['en', 'I would like to look at my medical reports please', 'viewReports'],
  ['hi', 'मुझे अपनी रिपोर्ट दिखा दो', 'viewReports'],
  ['ta', 'எனது மருத்துவ அறிக்கைகளைக் காட்டுங்கள்', 'viewReports'],
  ['te', 'నా వైద్య నివేదికలను చూపించండి', 'viewReports'],
  ['bn', 'আমার মেডিকেল রিপোর্ট দেখান', 'viewReports'],
  ['mr', 'माझे वैद्यकीय अहवाल दाखवा', 'viewReports'],
  ['gu', 'મારા તબીબી રિપોર્ટ બતાવો', 'viewReports'],
  ['kn', 'ನನ್ನ ವೈದ್ಯಕೀಯ ವರದಿಗಳನ್ನು ತೋರಿಸಿ', 'viewReports'],
  ['ml', 'എന്റെ മെഡിക്കൽ റിപ്പോർട്ടുകൾ കാണിക്കൂ', 'viewReports'],
  ['en', 'I need a ride to the hospital, can you help?', 'activate_0'],
  ['hi', 'Mujhe skin doctor Neel Shah se milna hai', 'selectDoctor', 'test-doctor-2'],
  ['en', 'Choose Test River hospital please', 'selectHospital', 'test-hospital-2'],
];
let failures = 0;
async function request(body) {
  const start = performance.now();
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: publishableKey, Authorization: `Bearer ${publishableKey}` }, body: JSON.stringify({ action: 'intent', pageId: 'test-dashboard', actions, ...body }), signal: AbortSignal.timeout(23000) });
  const data = await response.json();
  return { status: response.status, ms: Math.round(performance.now() - start), ...data };
}
for (const [language, transcript, expected, target] of cases) {
  try {
    const result = await request({ language, transcript });
    console.log(JSON.stringify({ language, expected, actual: result.intent, target: result.target, provider: result.provider, model: result.model, ms: result.ms, status: result.status, error: result.error }));
    assert.equal(result.status, 200); assert.equal(result.intent, expected);
    if (target) assert.equal(result.target, target);
  } catch (error) { failures++; console.error(language, error.message); }
}
try {
  const result = await request({ language: 'en', pageId: 'test-form', transcript: 'My name is Test Person and I am thirty five years old', expectsFreeText: true, inputContext: { kind: 'registration' }, screen: { fields: [{ name: 'name' }, { name: 'age' }] } });
  assert.equal(result.intent, 'free_text'); assert.equal(result.registration.age, '35'); assert.match(result.registration.name, /Test Person/i);
  console.log(JSON.stringify({ registration: 'passed', ms: result.ms, provider: result.provider, model: result.model }));
} catch (error) { failures++; console.error('registration', error.message); }
console.log(JSON.stringify({ passed: 13 - failures, failed: failures, total: 13 }));
process.exitCode = failures ? 1 : 0;
