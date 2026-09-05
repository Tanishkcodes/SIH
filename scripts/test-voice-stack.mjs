import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';
import { resolveVoiceSelection } from '../src/voicenav/resolveVoiceSelection.js';
import { createPatientSelectionActions } from '../src/voicenav/PatientVoiceActions.js';
import { TranscriptRegistry } from '../src/voicenav/TranscriptRegistry.js';
import { registrationFields } from '../src/voicenav/registrationFields.js';

const source = (await fs.readFile('supabase/functions/voice-ai/NavigationModel.ts', 'utf8')).replace(/export /g, '') + '\n' + (await fs.readFile('supabase/functions/voice-ai/index.ts', 'utf8')).replace(/^import .*;\s*/gm, '');
const { code } = await transform(source, { loader: 'ts', format: 'cjs' });
function server(mockFetch, env = { ELEVENLABS_API_KEY: 'test', NVIDIA_API_KEY: 'test', GEMINI_API_KEY: 'test' }) {
  let handler;
  vm.runInNewContext(code, { Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } }, fetch: mockFetch, Response, Request, AbortSignal, console, Uint8Array, DataView });
  return body => handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify(body) }));
}
const response = body => new Response(JSON.stringify(body));
const llama = body => response({ choices: [{ message: { content: JSON.stringify(body) } }] });
const languages = ['en','hi','ta','te','bn','mr','gu','kn','ml'];

test('doctor matching never defaults to the first doctor', () => {
  const doctors = [{ name: 'Dr. Meera', specialty: 'Cardiology' }, { name: 'Dr. Ravi', specialty: 'Cardiology' }];
  const labels = d => [d.name, d.specialty];
  assert.equal(resolveVoiceSelection(doctors, '2', labels), doctors[1]);
  assert.equal(resolveVoiceSelection(doctors, 1, labels), doctors[0]);
  assert.equal(resolveVoiceSelection(doctors, 'Dr. Ravi', labels), doctors[1]);
  for (const query of ['', 'unknown', 'Cardiology', '0', '3']) assert.equal(resolveVoiceSelection(doctors, query, labels), null);
});

test('all nine speech languages use ElevenLabs v3 exclusively', async () => {
  const calls = [];
  const call = server(async (url, options) => { calls.push([url, JSON.parse(options.body)]); return new Response('audio', { headers: { 'Content-Type': 'audio/mpeg' } }); });
  for (const language of languages) assert.equal((await call({ action: 'tts', text: 'Test', language })).status, 200);
  assert.equal(calls.length, 9);
  calls.forEach(([url, body], index) => { assert.match(url, /api.elevenlabs.io/); assert.equal(body.model_id, 'eleven_v3'); assert.equal(body.language_code, languages[index]); });
});

test('speech token is single-use and never cached; missing key fails closed', async () => {
  const call = server(async url => { assert.match(url, /single-use-token\/realtime_scribe$/); return response({ token: 'one-use' }); });
  const result = await call({ action: 'stt_token' });
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal((await result.json()).token, 'one-use');
  assert.equal((await server(() => { throw Error('must not fetch'); }, {})({ action: 'stt_token' })).status, 503);
});

test('Gemini receives contextual doctor navigation in all nine languages', async () => {
  const call = server(async (url, options) => {
    assert.match(url, /generativelanguage.googleapis.com/);
    const body = JSON.parse(options.body);
    assert.match(body.contents[0].parts[0].text, /Dr. Ravi/);
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'low');
    return response({ candidates: [{ content: { parts: [{ text: JSON.stringify({ intent: 'select_doctor', confidence: .99, value: 'Dr. Ravi', target: '', message: '' }) }] } }] });
  });
  for (const language of languages) {
    const result = await call({ action: 'intent', language, transcript: 'Please select Ravi', actions: [{ intent: 'select_doctor', description: 'Dr. Ravi' }] });
    assert.equal((await result.json()).value, 'Dr. Ravi');
  }
});

test('nonmedical image never enters medical extraction', async () => {
  let calls = 0;
  const call = server(async () => { calls++; return llama({ readableMedicalDocument: false, description: 'A landscape', evidenceText: [] }); });
  const data = await (await call({ action: 'analyze_report', image: 'data:image/png;base64,YWJj', fileName: 'blood-report.png' })).json();
  assert.equal(calls, 1);
  assert.equal(data.isMedicalDocument, false);
  assert.deepEqual(data.detectedParameters, []);
  assert.equal(data.summary, 'A landscape');
});

test('medical extraction strips invented values, medicines and diagnoses', async () => {
  let calls = 0;
  const call = server(async () => ++calls === 1 ? llama({ readableMedicalDocument: true, evidenceText: ['Hemoglobin 12 g/dL'], description: 'Lab report' }) : llama({ isMedicalDocument: true, confidence: .99, detectedParameters: [{ name: 'Hemoglobin', result: '12', unit: 'g/dL', flag: 'Normal' }, { name: 'Glucose', result: '100' }], medications: [{ name: 'Aspirin' }], summary: 'Diabetes', findings: 'Cancer', impression: 'Healthy', evidenceText: ['Invented text'] }));
  const data = await (await call({ action: 'analyze_report', image: 'data:image/png;base64,YWJj' })).json();
  assert.equal(data.detectedParameters.length, 1);
  assert.equal(data.detectedParameters[0].flag, '');
  assert.deepEqual(data.medications, []);
  assert.equal(data.findings, '');
  assert.equal(data.impression, '');
  assert.equal(data.summary, 'Hemoglobin 12 g/dL');
});

test('Ayurveda cannot finish with missing Dashavidha coverage', async () => {
  const call = server(async () => llama({ isFinished: true, completionMessage: 'Complete', question: '', options: [] }), { NVIDIA_API_KEY: 'test' });
  const result = await call({ action: 'anamnesis', isAyurvedic: true, questionCount: 15 });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).retryable, true);
});

test('completed Dashavidha and emergency referral are accepted', async () => {
  const coverage = Object.fromEntries(['prakriti','vikriti','sara','samhanana','pramana','satmya','satva','aharaShakti','vyayamaShakti','vaya'].map(key => [key, 'answered']));
  for (const result of [{ dashavidhaCoverage: coverage }, { urgentReferral: true }]) {
    const call = server(async () => llama({ isFinished: true, completionMessage: 'Please see your clinician.', question: '', options: [], ...result }), { NVIDIA_API_KEY: 'test' });
    const history = result.urgentReferral ? [] : Object.keys(coverage).flatMap(field => [{ sender: 'ai', text: `Question ${field}`, field }, { sender: 'user', text: 'My answer' }]);
    assert.equal((await call({ action: 'anamnesis', isAyurvedic: true, history })).status, 200);
  }
});

test('stopping during synthesis prevents late playback; successful playback resolves true', async () => {
  const input = (await fs.readFile('src/voicenav/AudioFeedback.js', 'utf8')).replace(/^import .*;\s*/m, '').replace('export default audioFeedback;', 'globalThis.engine = audioFeedback;');
  let finishSynthesis;
  let plays = 0;
  class AudioMock { play() { plays++; return Promise.resolve(); } pause() {} }
  const sandbox = { setTimeout, clearTimeout, Audio: AudioMock, voiceAIService: { synthesize: () => new Promise(resolve => { finishSynthesis = resolve; }) }, window: { location: { pathname: '/', search: '' }, dispatchEvent() {} }, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, console };
  vm.runInNewContext(input.replace(/export \{[^}]+\};/g, '').replace('export function', 'function'), sandbox);
  const engine = sandbox.engine;
  const pending = engine.speak('Hello');
  engine.stop();
  finishSynthesis(new Blob(['audio']));
  assert.equal(await pending, false);
  assert.equal(plays, 0);
  const next = engine.speak('New message');
  finishSynthesis(new Blob(['audio']));
  await new Promise(resolve => setImmediate(resolve));
  engine.elevenLabsAudio.onended();
  assert.equal(await next, true);
  assert.equal(plays, 1);
  assert.equal(engine.isSpeaking, false);
});

test('stopping microphone startup releases delayed permission stream', async () => {
  const input = (await fs.readFile('src/voicenav/ElevenLabsRecognition.js', 'utf8')).replace(/^import .*;\s*/m, '').replace('export default class ElevenLabsRecognition', 'globalThis.Recognition = class ElevenLabsRecognition');
  let grant;
  let stopped = 0;
  let tokenCalls = 0;
  const sandbox = { AudioContext: class { resume() { return Promise.resolve(); } close() { return Promise.resolve(); } }, navigator: { mediaDevices: { getUserMedia: () => new Promise(resolve => { grant = resolve; }) } }, WebSocket: class {}, voiceAIService: { createSpeechToken: () => { tokenCalls++; } }, clearTimeout, setTimeout };
  vm.runInNewContext(input, sandbox);
  const recognition = new sandbox.Recognition();
  recognition.start();
  recognition.stop();
  grant({ getTracks: () => [{ stop: () => stopped++ }] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stopped, 1);
  assert.equal(tokenCalls, 0);
  assert.equal(recognition.active, false);
});

test('realtime session captures PCM and delivers final speech only after connection', async () => {
  const input = (await fs.readFile('src/voicenav/ElevenLabsRecognition.js', 'utf8')).replace(/^import .*;\s*/m, '').replace('export default class ElevenLabsRecognition', 'globalThis.Recognition = class ElevenLabsRecognition');
  let socket;
  let processor;
  let started = 0;
  let stopped = 0;
  const events = [];
  class Socket {
    static OPEN = 1;
    readyState = 1;
    sent = [];
    constructor(url) { this.url = url; socket = this; }
    send(data) { this.sent.push(JSON.parse(data)); }
    close() { this.readyState = 3; }
  }
  class Context {
    sampleRate = 16000;
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createScriptProcessor() { processor = { connect() {}, disconnect() {} }; return processor; }
  }
  const sandbox = { navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => stopped++ }] }) } }, WebSocket: Socket, AudioContext: Context, voiceAIService: { createSpeechToken: async () => ({ token: 'test' }) }, clearTimeout, setTimeout, URLSearchParams, btoa };
  vm.runInNewContext(input, sandbox);
  const recognition = new sandbox.Recognition();
  recognition.lang = 'hi-IN';
  recognition.onstart = () => started++;
  recognition.onresult = event => events.push(event.results[0]);
  recognition.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(started, 0);
  assert.equal(new URL(socket.url).searchParams.has('language_code'), false);
  socket.onmessage({ data: JSON.stringify({ message_type: 'session_started' }) });
  assert.equal(started, 1);
  processor.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array([0, .5, -.5]) } });
  assert.equal(socket.sent[0].message_type, 'input_audio_chunk');
  assert.equal(socket.sent[0].sample_rate, 16000);
  assert.equal(Buffer.from(socket.sent[0].audio_base_64, 'base64').length, 6);
  for (const message_type of ['partial_transcript', 'committed_transcript']) socket.onmessage({ data: JSON.stringify({ message_type, text: 'डॉक्टर से मिलना है' }) });
  assert.equal(events[0].isFinal, false);
  assert.equal(events[1].isFinal, true);
  assert.equal(events[1][0].transcript, 'डॉक्टर से मिलना है');
  recognition.stop();
  assert.equal(stopped, 1);
  assert.equal(socket.readyState, 3);
});

test('authentication navigation reaches Gemini even while form input is registered', async () => {
  const input = (await fs.readFile('src/voicenav/CommandParser.js', 'utf8')).replace(/^import .*;\s*/gm, '').replace(/export default commandParser;/, 'globalThis.parser = commandParser;').replace(/export \{[^}]+\};/g, '');
  let calls = 0;
  const sandbox = { VOICE_COMMANDS: { global: {} }, console, aiCommandEngine: {
    parseIntent: async (text, actions, globals, ctx) => { calls++; assert.equal(ctx.expectsFreeText, true); return { intent: text.includes('login') ? 'login_aadhaar' : 'free_text', confidence: 1 }; },
  } };
  vm.runInNewContext(input, sandbox);
  sandbox.parser.registerPageCommands('auth', { login_aadhaar: ['Use Aadhaar to log in'] });
  assert.equal((await sandbox.parser.parse('Please take me to Aadhaar login', 'auth', { expectsFreeText: true })).intent, 'login_aadhaar');
  assert.equal((await sandbox.parser.parse('My name is Test Patient and my age is 30', 'auth', { expectsFreeText: true })).intent, 'free_text');
  assert.equal(calls, 2);
});

test('visible tab labels work locally in all nine languages on form pages', async () => {
  const input = (await fs.readFile('src/voicenav/CommandParser.js', 'utf8')).replace(/^import .*;\s*/gm, '').replace(/export default commandParser;/, 'globalThis.parser = commandParser;').replace(/export \{[^}]+\};/g, '');
  const sandbox = { VOICE_COMMANDS: { global: {} }, aiCommandEngine: { parseIntent: () => { throw Error('Local label must not call AI'); } }, console };
  vm.runInNewContext(input, sandbox);
  for (const label of ['Aadhaar', 'आधार', 'ஆதார்', 'ఆధార్', 'আধার', 'आधार लॉगिन', 'આધાર', 'ಆಧಾರ್', 'ആധാർ']) {
    const result = await sandbox.parser.parse(label, 'auth', { expectsFreeText: true, actions: [{ intent: 'activate_0', description: label }] });
    assert.equal(result.intent, 'activate_0');
  }
});

test('Gemini quota failure uses Llama instead of breaking navigation', async () => {
  let fallback = false;
  const call = server(async (url, options) => {
    if (url.includes('googleapis')) return new Response('quota', { status: 429 });
    fallback = true;
    assert.equal(JSON.parse(options.body).model, 'meta/llama-3.2-11b-vision-instruct');
    return llama({ intent: 'login_abha', confidence: 1, value: '', target: '', message: 'Opening ABHA.' });
  });
  const data = await (await call({ action: 'intent', transcript: 'Open ABHA', expectsFreeText: true, actions: [{ intent: 'login_abha', description: 'Open ABHA login' }] })).json();
  assert.equal(data.intent, 'login_abha');
  assert.equal(fallback, true);
});

test('parsed hospital and doctor results actually advance the booking flow', () => {
  const hospital = { id: 'hospital-42', name: 'City Care Hospital', doctors: [{ id: 'doctor-9', name: 'Dr. Meera Rao', specialty: 'Cardiology' }] };
  const state = { tab: 'reports', hospital: null, doctor: null, step: 'main', modal: true };
  const create = () => createPatientSelectionActions({
    hospitals: [hospital], doctors: hospital.doctors, selectedHospital: state.hospital,
    hospitalAliases: item => [item.name, 'सिटी केयर अस्पताल'],
    openTab: tab => { state.tab = tab; state.modal = false; },
    onHospital: item => { state.hospital = item; state.step = 'doctor_select'; },
    onDoctor: item => { state.doctor = item; state.step = 'booking_steps'; },
    onCrossHospitalDoctor: () => { throw Error('Doctor must stay in selected hospital'); },
  });
  assert.equal(create().selectHospital({ target: 'hospital-42', value: 'सिटी केयर अस्पताल' }), true);
  assert.equal(state.hospital, hospital);
  assert.equal(state.tab, 'appointments');
  assert.equal(state.modal, false);
  assert.equal(state.step, 'doctor_select');
  assert.equal(create().selectDoctor({ value: 'I want to consult Dr. Meera Rao' }), true);
  assert.equal(state.doctor, hospital.doctors[0]);
  assert.equal(state.step, 'booking_steps');
});

test('ambiguous and unknown hospital names do not advance the flow', () => {
  let mutations = 0;
  const actions = createPatientSelectionActions({ hospitals: [{ id: 'a', name: 'City Hospital' }, { id: 'b', name: 'City Clinic' }], doctors: [], hospitalAliases: h => [h.name], openTab: () => mutations++, onHospital: () => mutations++ });
  assert.equal(actions.selectHospital({ value: 'City' }), false);
  assert.equal(actions.selectHospital({ value: 'Unknown Hospital' }), false);
  assert.equal(mutations, 0);
});

test('field dictation releases only its own listener and restores the latest form listener', () => {
  const registry = new TranscriptRegistry();
  const oldPage = () => 'old page';
  const newPage = () => 'new page';
  const field = () => 'field';
  const releaseOld = registry.add(oldPage);
  const releaseField = registry.add(field, 10);
  const releaseNew = registry.add(newPage);
  releaseOld();
  assert.equal(registry.current, field);
  releaseField();
  assert.equal(registry.current, newPage);
  releaseNew();
  assert.equal(registry.current, null);
});

test('registration intent and extracted numeric details produce a form patch together', () => {
  const patch = registrationFields({ requestedAction: 'new_patient', name: 'Test Patient', age: 38, phone: 9999999999, gender: 'Female' });
  assert.deepEqual(patch, { name: 'Test Patient', age: '38', phone: '9999999999', gender: 'Female' });
  assert.deepEqual({ name: 'Existing', age: '38', ...registrationFields({ phone: '9999999999' }) }, { name: 'Existing', age: '38', phone: '9999999999' });
});

test('server rejects a model action absent from the live catalog', async () => {
  const call = server(async () => response({ candidates: [{ content: { parts: [{ text: JSON.stringify({ intent: 'inventedFeature', confidence: 1 }) }] } }] }), { GEMINI_API_KEY: 'test' });
  const result = await (await call({ action: 'intent', transcript: 'Open that', actions: [{ intent: 'newFeature', description: 'A newly available feature' }] })).json();
  assert.equal(result.code, 'VOICE_PROVIDER_UNAVAILABLE');
});

const clinicalQuestion = (capturedField = 'duration', question = 'When did this start?') => ({ question, capturedField, isFinished: false, urgentReferral: false, responseType: 'single_choice', completionMessage: '', caseSummaryUpdate: {}, dashavidhaCoverage: {}, options: [{ text: 'Today', iconType: 'clock' }, { text: 'Earlier', iconType: 'clock' }] });
const gemini = value => response({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] });

test('Gemini clinical responses work with no NVIDIA key and preserve all patient complaints', async () => {
  const call = server(async (url, options) => {
    assert.match(url, /googleapis/);
    const prompt = JSON.parse(options.body).contents[0].parts[0].text;
    assert.match(prompt, /Chest discomfort; Breathlessness/); assert.match(prompt, /penicillin/);
    return gemini(clinicalQuestion());
  }, { GEMINI_API_KEY: 'test' });
  const result = await call({ action: 'anamnesis', disease: 'Chest discomfort; Breathlessness', patient: { age: 72, allergies: ['penicillin'] } });
  assert.equal(result.status, 200); assert.equal((await result.json()).options.length, 2);
});

test('a no-option clinical draft is repaired by the fallback provider', async () => {
  let calls = 0;
  const call = server(async url => {
    calls++;
    if (url.includes('googleapis')) return gemini({ ...clinicalQuestion(), options: [] });
    return llama(clinicalQuestion());
  });
  const result = await call({ action: 'anamnesis', disease: 'Headache' });
  assert.equal(result.status, 200); assert.equal(calls, 2);
});

test('all ten Ayurveda questions are generated, answered and grounded before completion', async () => {
  const fields = ['prakriti','vikriti','sara','samhanana','pramana','satmya','satva','aharaShakti','vyayamaShakti','vaya'];
  const history = []; let index = 0;
  const call = server(async () => gemini(index < fields.length ? clinicalQuestion(fields[index], `Patient-friendly question ${index + 1}`) : { isFinished: true, completionMessage: 'Your history is ready.', options: [], question: '' }), { GEMINI_API_KEY: 'test' });
  for (; index < fields.length; index++) {
    const result = await (await call({ action: 'anamnesis', isAyurvedic: true, history })).json();
    assert.equal(result.isFinished, false);
    assert.equal(result.dashavidhaCoverage[fields[index]], 'pending');
    history.push({ sender: 'ai', field: result.capturedField, text: result.question }, { sender: 'user', text: 'Not sure' });
  }
  const final = await (await call({ action: 'anamnesis', isAyurvedic: true, history })).json();
  assert.equal(final.isFinished, true); assert.equal(Object.values(final.dashavidhaCoverage).filter(status => status !== 'pending').length, 10);
});

test('invented complete coverage cannot bypass ten actual patient answers', async () => {
  const call = server(async () => gemini({ isFinished: true, completionMessage: 'Complete', dashavidhaCoverage: { prakriti: 'answered' } }), { GEMINI_API_KEY: 'test' });
  assert.equal((await call({ action: 'anamnesis', isAyurvedic: true, questionCount: 10 })).status, 503);
});

test('clinical translation failures do not return unchanged text as success', async () => {
  const call = server(async () => new Response('unavailable', { status: 503 }));
  assert.equal((await call({ action: 'batch_translate', texts: ['When did it start?','Today','Earlier'], targetLanguage: 'hi', strict: true })).status, 503);
});

test('retired Gemini model is discovered and the working model is reused', async () => {
  const calls = [];
  const call = server(async (url, options) => {
    calls.push(url);
    if (url.includes('retired-model')) return new Response('not found', { status: 404 });
    if (url.includes('pageSize=')) return response({ models: [
      { name: 'models/gemini-new-flash-image', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-new-flash-lite', supportedGenerationMethods: ['generateContent'] },
    ] });
    assert.match(url, /gemini-new-flash-lite:generateContent$/);
    assert.equal(url.includes('key='), false);
    return gemini({ intent: 'newFeature', confidence: 1, message: 'Opening it.' });
  }, { GEMINI_API_KEY: 'test', GEMINI_NAVIGATION_MODEL: 'retired-model' });
  for (let i = 0; i < 2; i++) {
    const result = await call({ action: 'intent', transcript: 'Open the new feature', actions: [{ intent: 'newFeature', description: 'New feature' }] });
    assert.equal(result.status, 200); assert.equal((await result.json()).provider, 'gemini');
  }
  assert.equal(calls.length, 4);
  assert.equal(calls.filter(url => url.includes('retired-model')).length, 1);
});

test('provider outage is a retryable service error, never unrecognized speech', async () => {
  let calls = 0;
  const call = server(async () => { calls++; return new Response('denied', { status: 401 }); }, { GEMINI_API_KEY: 'test' });
  const result = await call({ action: 'intent', transcript: 'Open appointments', actions: [{ intent: 'appointments', description: 'Appointments' }], debug: true });
  assert.equal(result.status, 503);
  const data = await result.json();
  assert.equal(data.code, 'VOICE_PROVIDER_UNAVAILABLE'); assert.equal(data.retryable, true);
  assert.equal(data.intent, undefined); assert.equal(data._debug, undefined); assert.equal(calls, 1);
});

test('registration is understood and extracted in one Gemini request', async () => {
  let calls = 0;
  const call = server(async (url, options) => {
    calls++;
    const body = JSON.parse(options.body), prompt = body.contents[0].parts[0].text;
    assert.match(prompt, /Current screen headings/); assert.match(prompt, /registration/);
    assert.ok(body.generationConfig.responseJsonSchema.properties.registration);
    return gemini({ intent: 'free_text', confidence: 1, registration: { name: 'Test Person', age: '35', gender: '', phone: '', aadhaar: '', abhaId: '', symptoms: '', confirmationMessage: 'Details filled.' } });
  }, { GEMINI_API_KEY: 'test' });
  const result = await (await call({ action: 'intent', transcript: 'My name is Test Person and I am thirty five', expectsFreeText: true, inputContext: { kind: 'registration' }, screen: { fields: [{ name: 'name' }, { name: 'age' }] } })).json();
  assert.equal(result.intent, 'free_text'); assert.equal(result.registration.age, '35'); assert.equal(calls, 1);
});

test('Gemini text is read after optional thought parts', async () => {
  const call = server(async () => response({ candidates: [{ content: { parts: [{ thought: true, text: 'Internal reasoning' }, { text: JSON.stringify({ intent: 'newAction', confidence: .99 }) }] } }] }), { GEMINI_API_KEY: 'test' });
  const result = await (await call({ action: 'intent', transcript: 'Use that new action', actions: [{ intent: 'newAction', description: 'New action' }] })).json();
  assert.equal(result.intent, 'newAction');
});

test('transient Gemini errors retry the same model without rediscovery', async () => {
  const calls = [];
  const call = server(async url => {
    calls.push(url);
    return calls.length === 1 ? new Response('temporarily busy', { status: 503 }) : gemini({ intent: 'reports', confidence: 1 });
  }, { GEMINI_API_KEY: 'test' });
  const result = await (await call({ action: 'intent', transcript: 'Show reports', actions: [{ intent: 'reports', description: 'Reports' }] })).json();
  assert.equal(result.intent, 'reports'); assert.equal(calls.length, 2); assert.equal(calls[0], calls[1]);
});
