import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';
import * as snapshot from '../src/voicenav/ActionSnapshot.js';
import { TranscriptRegistry } from '../src/voicenav/TranscriptRegistry.js';
import { createPatientSelectionActions } from '../src/voicenav/PatientVoiceActions.js';

const parserSource = (await fs.readFile('src/voicenav/CommandParser.js','utf8')).replace(/^import .*;\s*/gm,'').replace('export default commandParser;', 'globalThis.parser = commandParser;').replace(/export \{[^}]+\};/g,'');
const { code } = await transform(await fs.readFile('src/voicenav/VoiceNavProvider.jsx','utf8'), { loader: 'jsx', format: 'cjs' });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function harness() {
  const slots = [], effects = [], cleanups = [], timers = new Map(), intervals = new Map();
  let cursor = 0, timerId = 0, first = true, recognition, resolveIntent, request, value;
  const React = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (type, props) => ({ type, props }),
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn) { cursor++; if (first) effects.push(fn); },
  };
  class Recognition {
    static supported = true;
    starts = 0;
    constructor() { recognition = this; }
    start() { this.starts++; this.onstart?.(); }
    stop() {}
    abort() {}
  }
  const audio = { isSpeaking: false, playListeningStart() {}, playSuccess() {}, playError() {}, speak() { this.isSpeaking = true; this.onSpeakingChange?.(true); }, stop() { this.isSpeaking = false; this.onSpeakingChange?.(false); } };
  const parserContext = { console, VOICE_COMMANDS: {}, aiCommandEngine: { parseIntent: (text, actions) => { request = { text, actions }; return new Promise(resolve => { resolveIntent = resolve; }); } } };
  vm.runInNewContext(parserSource, parserContext);
  const document = { hidden: false, querySelectorAll: () => [] };
  const imports = {
    react: { default: React, ...React },
    './ElevenLabsRecognition': { default: Recognition },
    './TranscriptRegistry': { TranscriptRegistry },
    './ActionSnapshot.js': { ...snapshot, captureControls: () => snapshot.captureControls(document) },
    './CommandParser': { default: parserContext.parser },
    './AudioFeedback': { default: audio, isMutedPortal: () => false },
    './AudioPromptManager': { default: { stop: () => audio.stop(), setLanguage() {}, resetIdleTimer() {} } },
    './LanguagePack': { getLanguageInfo: () => ({ speechCode: 'en-IN' }) },
    '../lib/db': { db: { voice: { log: async () => {} } } },
    '../context/LanguageContext': { useLanguage: () => ({ currentLang: 'en' }) },
  };
  const module = { exports: {} };
  const context = { module, exports: module.exports, require: name => {
    if (!imports[name]) throw Error(name);
    return { __esModule: true, ...imports[name] };
  }, console, document,
  setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; }, clearTimeout: id => timers.delete(id),
  setInterval: fn => { intervals.set(++timerId, fn); return timerId; }, clearInterval: id => intervals.delete(id) };
  vm.runInNewContext(code, context);
  function render() { cursor = 0; value = module.exports.VoiceNavProvider({}).props.value; if (first) { first = false; effects.forEach(fn => cleanups.push(fn())); } return value; }
  render();
  return {
    render, audio, document, get request() { return request; }, get recognition() { return recognition; },
    async utter(text) {
      const result = [{ transcript: text }]; result.isFinal = true;
      recognition.onresult({ resultIndex: 0, results: [result] });
      for (const [id, timer] of timers) if (timer.delay === 300) { timers.delete(id); timer.fn(); }
      await flush();
    },
    async answer(result) { resolveIntent(result); await flush(); render(); },
    tick() { render(); intervals.forEach(fn => fn()); render(); },
    close() { cleanups.forEach(fn => fn?.()); },
  };
}

test('live doctor catalog survives provider → parser, and new features execute without phrase additions', async () => {
  const h = harness(); let executed = 0;
  h.render().registerPage('dashboard', { newFeature: () => { executed++; return true; } }, { newFeature: ['Consult newly added Dr. New, id=doctor-new'] });
  h.render().startListening();
  await h.utter('I would like to see the doctor who just joined');
  assert.match(h.request.actions.newFeature, /doctor-new/);
  await h.answer({ intent: 'newFeature', confidence: .98, message: '' });
  assert.equal(executed, 1);
  h.tick(); assert.equal(h.recognition.starts, 2);
  h.render().stopListening(); h.tick(); assert.equal(h.recognition.starts, 2);
  h.close();
});

test('stopping a pending model decision prevents late navigation', async () => {
  const h = harness(); let executed = 0;
  h.render().registerPage('page', { reports: () => executed++ });
  h.render().startListening(); await h.utter('Please show my results');
  h.render().stopListening();
  await h.answer({ intent: 'reports', confidence: 1 });
  h.tick(); assert.equal(executed, 0); assert.equal(h.recognition.starts, 1); h.close();
});

test('same-page catalog changes invalidate a pending entity selection', async () => {
  const h = harness(); let executed = 0;
  h.render().registerPage('page', { select: () => executed++ }, { select: ['Doctor A'] });
  h.render().startListening(); await h.utter('Please select that doctor');
  h.render().registerPage('page', { select: () => executed++ }, { select: ['Doctor B'] });
  await h.answer({ intent: 'select', confidence: 1 });
  assert.equal(executed, 0); h.close();
});

test('field dictation still allows explicit navigation; ambiguous commands never enter the field', async () => {
  const h = harness(); let navigated = 0, dictation = 0;
  h.render().registerPage('form', { reports: () => navigated++ });
  h.render().setOnTranscript(() => dictation++); h.render().setDictationMode(true);
  h.render().startListening(); await h.utter('Leave this form and show my results');
  await h.answer({ intent: 'reports', confidence: 1 });
  assert.equal(navigated, 1); assert.equal(dictation, 0);
  h.tick(); await h.utter('Which doctor was that');
  await h.answer({ intent: 'out_of_context', confidence: 0, message: 'Which doctor do you mean?' });
  assert.equal(dictation, 0); assert.match(h.render().recognitionFeedback.text, /Which doctor/); h.close();
});

test('speech playback pauses a session, then resumes; background tabs stop it', () => {
  const h = harness(); h.render().startListening();
  h.audio.speak(); h.tick(); assert.equal(h.recognition.starts, 1);
  h.audio.stop(); h.tick(); assert.equal(h.recognition.starts, 2);
  h.document.hidden = true; h.tick();
  h.document.hidden = false; h.tick(); assert.equal(h.recognition.starts, 2); h.close();
});

test('unavailable and low-confidence actions fail validation; routes require a known destination', () => {
  const actions = [{ intent: 'new_feature' }, { intent: 'navigate' }];
  assert.equal(snapshot.validateIntent({ intent: 'invented', confidence: 1 }, actions), false);
  assert.equal(snapshot.validateIntent({ intent: 'new_feature', confidence: .4 }, actions), false);
  assert.equal(snapshot.validateIntent({ intent: 'navigate', target: 'missing', confidence: 1 }, actions, []), false);
  assert.equal(snapshot.validateIntent({ intent: 'navigate', target: 'new-route', confidence: 1 }, actions, [{ id: 'new-route' }]), true);
});

test('unresolved named doctor profiles never fall back to first or selected doctor', () => {
  let opened = 0;
  const doctor = { id: 'a', name: 'Dr. A' };
  const actions = createPatientSelectionActions({ doctors: [doctor], selectedDoctor: doctor, onCrossHospitalDoctorProfile: () => opened++ });
  assert.equal(actions.openDoctorProfile({ value: 'Dr. Missing' }), false);
  assert.equal(opened, 0);
});

test('new controls beyond the old 40-control limit and repeated labels remain addressable', () => {
  const elements = Array.from({ length: 55 }, (_, i) => ({
    isConnected: true, disabled: i === 3, innerText: 'Book',
    getClientRects: () => [1], getAttribute: () => null,
    closest: selector => selector.startsWith('[data-voice-context]') ? { getAttribute: () => `Hospital ${i}` } : null,
  }));
  const controls = snapshot.captureControls({ querySelectorAll: selector => selector.startsWith('[role="dialog"]') ? [] : elements });
  assert.equal(controls.length, 54);
  assert.match(controls.at(-1).description, /Hospital 54/);
  assert.notEqual(controls[0].intent, controls[1].intent);
  assert.equal(new Set(controls.map(c => c.intent)).size, 54);
});

test('the active dialog excludes background controls from discovery', () => {
  const button = { isConnected: true, innerText: 'Close', getAttribute: () => null, getClientRects: () => [1], closest: () => null };
  const dialog = { isConnected: true, getClientRects: () => [1], closest: () => null, querySelectorAll: () => [button] };
  const controls = snapshot.captureControls({ querySelectorAll: () => [dialog] });
  assert.equal(controls.length, 1);
  assert.equal(controls[0].element, button);
});
