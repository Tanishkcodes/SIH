import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from 'lucide-react';
import { transform } from 'esbuild';
import { isAyurvedicClinician } from '../src/engine/ClinicalInterviewSession.js';

const { code } = await transform(await fs.readFile('src/components/ClinicalAnamnesisChat.jsx','utf8'), { loader: 'jsx', format: 'cjs' });
function render(state, language = 'en') {
  const module = { exports: {} };
  const imports = {
    react: { default: React, ...React }, 'lucide-react': icons,
    '../voicenav/VoiceNavProvider': { useVoiceNav: () => ({ voiceSessionActive: false, toggleListening() {}, setOnTranscript() {} }) },
    './useClinicalInterview': { useClinicalInterview: () => ({ state, begin() {}, answer() {}, reset() {} }) },
    '../engine/ClinicalInterviewSession.js': { isAyurvedicClinician },
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (!imports[name]) throw Error(name);
    return { __esModule: true, ...imports[name] };
  } });
  return renderToStaticMarkup(React.createElement(module.exports.default, { active: true, language }));
}
test('clinical chat renders nothing unless booking Step 3 explicitly activates it', () => {
  const module = { exports: {} };
  const imports = { react: { default: React, ...React }, 'lucide-react': icons,
    '../voicenav/VoiceNavProvider': { useVoiceNav: () => ({}) },
    './useClinicalInterview': { useClinicalInterview: () => ({ state: { messages: [] } }) },
    '../engine/ClinicalInterviewSession.js': { isAyurvedicClinician } };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => ({ __esModule: true, ...imports[name] }) });
  assert.equal(renderToStaticMarkup(React.createElement(module.exports.default)), '');
});
test('existing option cards render the generated count, question and typed-answer input', () => {
  for (const count of [2, 3, 6, 8]) {
    const html = render({ started: true, busy: false, messages: [{ sender: 'ai', text: 'A disease-specific question' }], step: {
      question: 'A disease-specific question', responseType: 'single_choice', options: Array.from({ length: count }, (_, i) => ({ id: `o${i}`, text: `Generated answer ${i + 1}` })),
    } });
    assert.equal((html.match(/data-voice-option="true"/g) || []).length, count);
    assert.match(html, /A disease-specific question/);
    assert.match(html, /You can also speak or type your answer/);
    assert.match(html, /data-voice-option-index="2"/);
  }
});
test('provider failures show calm recovery and cannot expose a completed-intake button', () => {
  const html = render({ started: true, busy: false, recovering: true, messages: [], step: null, finished: false });
  assert.match(html, /Your answers are saved/);
  assert.doesNotMatch(html, /Retry AI|role="alert"|Proceed to upload reports/);
  assert.match(html, /data-voice-action="next" disabled/);
});
test('completed intake renders its continuation button', () => {
  const html = render({ started: true, messages: [], step: null, finished: true });
  assert.match(html, /Proceed to upload reports/);
  assert.doesNotMatch(html, /data-voice-action="next" disabled/);
});
