import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClinicalInterviewSession, complaintContext, normalizeClinicalStep, isAyurvedicClinician } from '../src/engine/ClinicalInterviewSession.js';

const question = (text = 'When did this begin?', field = 'duration', options = ['Today', 'Earlier']) => ({
  question: text, capturedField: field, responseType: 'single_choice', options: options.map(text => ({ text, iconType: 'clock' })),
  isFinished: false, caseSummaryUpdate: {}, completionMessage: '',
});
const finished = { isFinished: true, completionMessage: 'Your history is ready for the doctor.', caseSummaryUpdate: {}, options: [] };
const tick = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function setup(service) {
  const timers = new Map(), saves = []; let id = 0;
  const session = new ClinicalInterviewSession({ service, context: { patient: { age: 72, allergies: ['penicillin'] }, doctorSpecialty: 'Cardiology' },
    onSave: data => saves.push(data), schedule: fn => { timers.set(++id,fn); return id; }, cancel: id => timers.delete(id) });
  return { session, saves, async retry() { const [id,fn] = timers.entries().next().value; timers.delete(id); await fn(); }, timers };
}

test('selected diseases and typed details all reach the model with patient context', async () => {
  let payload;
  const { session } = setup({ anamnesis: async request => { payload = request; return question(); } });
  await session.begin(['Chest discomfort', 'Breathlessness'], 'Since walking upstairs');
  assert.equal(payload.disease, 'Chest discomfort; Breathlessness; Since walking upstairs');
  assert.equal(payload.patient.age, 72); assert.deepEqual(payload.patient.allergies, ['penicillin']);
  assert.equal(complaintContext(['Fever', 'Fever'], 'Three days'), 'Fever; Three days');
});

test('ordinary question count is model-driven and all dynamic cards are preserved', async () => {
  let calls = 0;
  const { session } = setup({ anamnesis: async () => ++calls === 1 ? question('What concerns you?', 'notes', ['A','B','C','D','E','F']) : finished });
  await session.begin(['A new condition']); assert.equal(session.state.step.options.length, 6);
  await session.answer('An answer outside the cards');
  assert.equal(session.state.finished, true); assert.equal(session.state.messages.filter(m => m.sender === 'user').length, 2);
});

test('outage preserves an answer once, automatically recovers, and never reports false completion', async () => {
  let calls = 0; const payloads = [];
  const h = setup({ anamnesis: async request => {
    payloads.push(request); calls++;
    if (calls === 1) return question();
    if (calls === 2) throw Error('provider down');
    return question('How severe is it?', 'severity');
  } });
  await h.session.begin(['Headache']); await h.session.answer('Since yesterday');
  assert.equal(h.session.state.recovering, true); assert.equal(h.session.state.finished, false);
  assert.equal(h.session.state.step, null); assert.equal(h.timers.size, 1);
  await h.retry();
  assert.equal(h.session.state.recovering, false);
  assert.equal(h.session.state.messages.filter(m => m.originalText === 'Since yesterday').length, 1);
  assert.equal(payloads.at(-1).history.at(-2).field, 'duration');
  assert.match(h.saves.at(-1).notes, /Since yesterday/);
});

test('invalid repeated or no-option responses retry without appending a question', async () => {
  let calls = 0;
  const h = setup({ anamnesis: async () => ++calls <= 2 ? question() : question('Is it constant?', 'nature') });
  await h.session.begin(['Pain']); await h.session.answer('Today');
  assert.equal(h.session.state.recovering, true);
  await h.retry(); assert.equal(h.session.state.step.question, 'Is it constant?');
  assert.throws(() => normalizeClinicalStep(question('Q', 'notes', ['Same','Same'])), /choices/);
});

test('starting with typed symptoms cancels a still-loading complaint menu', async () => {
  let resolveStarter;
  const h = setup({ anamnesis: request => request.phase === 'chief_complaint' ? new Promise(resolve => { resolveStarter = resolve; }) : Promise.resolve(question()) });
  const pending = h.session.loadStarter();
  await h.session.begin([], 'New severe fatigue');
  resolveStarter(question('What brings you here?')); await pending;
  assert.equal(h.session.state.started, true); assert.equal(h.session.state.starter, null);
  assert.equal(h.session.state.step.question, 'When did this begin?');
});

test('reset discards late clinical results and keeps a new complaint independent', async () => {
  let resolveOld;
  const h = setup({ anamnesis: request => request.disease === 'Old' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve(question('New question')) });
  const pending = h.session.begin(['Old']);
  h.session.reset(); await tick(); await h.session.begin(['New']);
  resolveOld(question('Old question')); await pending;
  assert.equal(h.session.state.step.question, 'New question');
  assert.deepEqual(h.session.state.summary.chiefComplaints, ['New']);
});

test('language switch translates active question/cards before history and caches repeated switches', async () => {
  const calls = [];
  const h = setup({ anamnesis: async () => question(), translateClinical: async (texts, lang) => {
    calls.push({ texts, lang }); return { translations: texts.map(text => `${lang}:${text}`) };
  } });
  await h.session.begin(['Fever']);
  await h.session.localize('hi');
  assert.deepEqual(calls[0].texts, ['When did this begin?', 'Today', 'Earlier']);
  assert.equal(h.session.state.step.options[0].text, 'hi:Today');
  assert.equal(h.session.state.messages[0].text, 'hi:Fever');
  await h.session.localize('ta'); await h.session.localize('hi');
  assert.equal(calls.length, 4); assert.equal(h.session.state.step.options[0].text, 'hi:Today');
  assert.equal(h.session.state.messages[0].originalText, 'Fever');
});

test('rapid language switches discard the slower obsolete translation', async () => {
  let oldTranslation;
  const h = setup({ anamnesis: async () => question(), translateClinical: (texts, language) => language === 'hi'
    ? new Promise(resolve => { oldTranslation = resolve; }) : Promise.resolve({ translations: texts.map(text => `ta:${text}`) }) });
  await h.session.begin(['Fever']);
  const first = h.session.localize('hi'); await h.session.localize('ta');
  oldTranslation({ translations: ['OLD','OLD A','OLD B'] }); await first;
  assert.match(h.session.state.step.question, /^ta:/);
  assert.equal(h.session.state.translating, false);
});

test('changing language during clinical generation localizes the arriving response', async () => {
  let resolveQuestion;
  const h = setup({ anamnesis: () => new Promise(resolve => { resolveQuestion = resolve; }), translateClinical: async (texts, language) => ({ translations: texts.map(text => `${language}:${text}`) }) });
  const pending = h.session.begin(['Fever']); await h.session.localize('gu');
  resolveQuestion(question()); await pending;
  assert.equal(h.session.state.step.question, 'gu:When did this begin?');
});

test('disposal cancels retry timers and prevents stale result updates', async () => {
  const h = setup({ anamnesis: async () => { throw Error('offline'); } });
  await h.session.begin(['Fever']); assert.equal(h.timers.size, 1);
  h.session.dispose(); assert.equal(h.timers.size, 0);
});

test('care system uses clinician metadata rather than surnames or all AYUSH specialties', () => {
  assert.equal(isAyurvedicClinician({ degree: 'BAMS' }), true);
  assert.equal(isAyurvedicClinician({ system: 'Ayurveda' }), true);
  assert.equal(isAyurvedicClinician({ name: 'Dr. Krishnamurthy', specialty: 'Cardiology' }), false);
  assert.equal(isAyurvedicClinician({ specialty: 'Homeopathy', degree: 'BHMS' }, { type: 'AYUSH' }), false);
});
