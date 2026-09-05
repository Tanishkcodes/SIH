import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const recognitionSource = (await fs.readFile('src/voicenav/ElevenLabsRecognition.js', 'utf8'))
  .replace(/^import .*;\s*/m, '').replace('export default class ElevenLabsRecognition', 'globalThis.Recognition = class ElevenLabsRecognition');
const flush = () => new Promise(resolve => setImmediate(resolve));

test('voice request timeout covers a stalled response body, not only headers', async () => {
  const source = (await fs.readFile('src/voicenav/VoiceAIService.js', 'utf8'))
    .replaceAll('import.meta?.env?', 'globalThis.env?')
    .replace('export default new VoiceAIService();', 'globalThis.service = new VoiceAIService();');
  let expire, cleared = false;
  const context = { AbortController, Response, console: { warn() {} },
    setTimeout: fn => { expire = fn; return 1; }, clearTimeout: () => { cleared = true; },
    fetch: async (url, { signal }) => ({
      arrayBuffer: () => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
    }),
  };
  vm.runInNewContext(source, context);
  const request = context.service._request({ action: 'tts' });
  await flush(); assert.equal(cleared, false);
  expire(); await assert.rejects(request, /aborted/); assert.equal(cleared, true);
});

test('microphone resumes audio in the tap and releases resources if permission never finishes', async () => {
  const calls = [], timers = new Map(); let grant, error, closed = 0, stopped = 0;
  const context = {
    AudioContext: class {
      constructor(options) { assert.equal(options, undefined); }
      resume() { calls.push('resume'); return new Promise(() => {}); }
      close() { closed++; return Promise.resolve(); }
    },
    navigator: { mediaDevices: { getUserMedia() { calls.push('permission'); return new Promise(resolve => { grant = resolve; }); } } },
    setTimeout: (fn, delay) => { timers.set(delay, fn); return delay; }, clearTimeout: id => timers.delete(id),
    voiceAIService: { createSpeechToken() { throw Error('Cancelled startup must not request a token'); } },
  };
  vm.runInNewContext(recognitionSource, context);
  const recognition = new context.Recognition(); recognition.onerror = value => { error = value; };
  recognition.start();
  assert.deepEqual(calls, ['resume', 'permission']);
  timers.get(20000)();
  assert.equal(recognition.active, false); assert.equal(closed, 1);
  assert.match(error.message, /timed out/);
  grant({ getTracks: () => [{ stop() { stopped++; } }] });
  await flush(); assert.equal(stopped, 1);
});

test('missing or busy microphone reports a hardware error', async () => {
  for (const name of ['NotFoundError', 'NotReadableError', 'NotAllowedError']) {
    let reported;
    const context = {
      AudioContext: class { resume() { return Promise.resolve(); } close() { return Promise.resolve(); } },
      navigator: { mediaDevices: { getUserMedia: async () => { throw Object.assign(new Error('device'), { name }); } } },
      setTimeout, clearTimeout,
    };
    vm.runInNewContext(recognitionSource, context);
    const recognition = new context.Recognition(); recognition.onerror = error => { reported = error.error; };
    recognition.start(); await flush();
    assert.equal(reported, name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture');
    assert.equal(recognition.active, false);
  }
});

test('stalled playback resolves and unblocks listening; old timeout cannot cancel new speech', async () => {
  const input = (await fs.readFile('src/voicenav/AudioFeedback.js', 'utf8')).replace(/^import .*;\s*/m, '')
    .replace('export default audioFeedback;', 'globalThis.engine = audioFeedback;').replace(/export \{[^}]+\};/g, '').replace('export function', 'function');
  const timers = new Map(); let next = 0;
  const sandbox = {
    Audio: class { play() { return new Promise(() => {}); } pause() {} },
    voiceAIService: { synthesize: async () => new Blob(['audio']) },
    window: { location: { pathname: '/', search: '' } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, console,
    setTimeout: fn => { timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(input, sandbox);
  const first = sandbox.engine.speak('First'); await flush();
  const timeout = [...timers.values()][0]; timeout();
  assert.equal(await first, false); assert.equal(sandbox.engine.isSpeaking, false);
  const second = sandbox.engine.speak('Second'); await flush(); timeout();
  assert.equal(sandbox.engine.isSpeaking, true);
  sandbox.engine.elevenLabsAudio.onended(); assert.equal(await second, true);
});

test('explicit stop removes pending landing greeting gesture retries', async () => {
  const input = (await fs.readFile('src/voicenav/AudioPromptManager.js', 'utf8')).replace(/^import .*;\s*/gm, '')
    .replace('export default audioPromptManager;', 'globalThis.manager = audioPromptManager;').replace(/export \{[^}]+\};/g, '').replace('export function', 'function');
  const listeners = new Map();
  const sandbox = { setTimeout, clearTimeout, audioFeedback: { playWelcomeAudio: async () => false, stop() {} },
    window: { location: { pathname: '/', search: '' }, addEventListener: (event, fn) => listeners.set(event, fn), removeEventListener: event => listeners.delete(event) } };
  vm.runInNewContext(input, sandbox);
  await sandbox.manager.speakInitialLandingWelcome(); assert.equal(listeners.size, 4);
  sandbox.manager.stop(); assert.equal(listeners.size, 0);
});
