import { getAdaptiveClinicalStep } from '../components/clinicalTemplates.js';

// Owns the interview independently of rendering, translation and microphone state.
// Questions and options come only from the clinical service, never a local script.
export const DASHAVIDHA_FIELDS = ['prakriti', 'vikriti', 'sara', 'samhanana', 'pramana', 'satmya', 'satva', 'aharaShakti', 'vyayamaShakti', 'vaya'];

let globalAiUnavailableUntil = 0;

export function isAyurvedicClinician(doctor = {}, hospital = {}) {
  const metadata = [doctor.specialty, doctor.speciality, doctor.degree, doctor.degrees, doctor.careSystem, doctor.system].filter(Boolean).join(' ');
  return doctor.isAyurvedic === true || /ayurved|bams|panchakarma|kayachikitsa|shalyatantra/i.test(metadata) ||
    (!metadata.trim() && /ayurved/i.test(String(hospital.name || '')));
}

export function complaintContext(symptoms = [], notes = '') {
  return [...new Set([...symptoms, notes].map(value => String(value || '').trim()).filter(Boolean))].join('; ');
}

export function normalizeClinicalStep(value, history = []) {
  if (!value || typeof value.isFinished !== 'boolean') throw Error('Incomplete clinical response');
  if (value.isFinished) {
    if (!String(value.completionMessage || '').trim()) throw Error('Missing completion message');
    return { ...value, question: '', options: [] };
  }
  const question = String(value.question || '').trim();
  const normalize = text => String(text).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!question || history.some(message => message.sender === 'ai' && normalize(message.originalText || message.text) === normalize(question))) throw Error('Missing or repeated question');
  const seen = new Set();
  const options = (Array.isArray(value.options) ? value.options : []).filter(option => {
    const text = String(option?.text || '').trim(), key = normalize(text);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 8).map((option, index) => ({ ...option, id: `choice-${index}`, text: String(option.text).trim() }));
  if (options.length < 2) throw Error('Missing answer choices');
  return { ...value, question, options, originalQuestion: question, originalOptions: options, field: value.capturedField || 'notes', responseType: value.responseType === 'multiple_choice' ? 'multiple_choice' : 'single_choice' };
}

export class ClinicalInterviewSession {
  constructor({ service, context, language = 'en', onSave = () => { }, schedule = (fn, ms) => setTimeout(fn, ms), cancel = (id) => { try { clearTimeout(id); } catch(e) {} } }) {
    this.service = service; this.context = context; this.language = language; this.onSave = onSave;
    this.schedule = (fn, ms) => schedule(fn, ms);
    this.cancel = (id) => { if (!id) return; try { cancel(id); } catch (e) { try { clearTimeout(id); } catch (err) {} } };
    this.listeners = new Set(); this.generation = 0; this.translationVersion = 0;
    this.cache = new Map(); this.disposed = false; this.counter = 0;
    this.aiUnavailableUntil = globalAiUnavailableUntil;
    this.state = { started: false, busy: false, recovering: false, translating: false, finished: false, urgentReferral: false, messages: [], step: null, starter: null, summary: { chiefComplaints: [], notes: '' } };
  }
  subscribe(fn) { this.listeners.add(fn); fn(this.state); return () => this.listeners.delete(fn); }
  update(patch) { if (this.disposed) return; this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn(this.state)); }
  message(sender, text, extra = {}) { return { id: ++this.counter, sender, text, originalText: text, ...extra }; }
  save() {
    const { summary, messages } = this.state;
    const transcript = messages.filter(message => !message.isFinal).map(message => `${message.sender === 'ai' ? 'Question' : 'Patient'}: ${message.originalText}`).join('\n');
    this.onSave({
      symptoms: summary.chiefComplaints, notes: [summary.notes, transcript].filter(Boolean).join('\n\n'), intakeComplete: this.state.finished, clinicalSummary: summary,
      intakeSession: { state: this.state, disease: this.disease, language: this.language, counter: this.counter }
    });
  }
  async begin(symptoms = [], notes = '') {
    if (this.state.started) return false;
    const disease = complaintContext(symptoms, notes);
    if (!disease) return false;
    this.cancel(this.retryTimer); ++this.generation;
    this.disease = disease;
    this.update({ started: true, busy: false, finished: false, starter: null, step: null, messages: [this.message('user', disease)], summary: { chiefComplaints: [...new Set(symptoms.length ? symptoms : [notes])], notes } });
    this.save();
    await this.request(); return true;
  }
  async answer(text) {
    text = String(text || '').trim();
    if (!text || this.state.busy || this.state.translating || !this.state.step || this.state.finished) return false;
    const field = this.state.step.field;
    this.update({ messages: [...this.state.messages, this.message('user', text, { field })], step: null });
    this.save();
    await this.request(); return true;
  }
  async loadStarter() { if (!this.state.started) await this.request('chief_complaint'); }
  _getLocalStep(phase, history, language) {
    if (phase === 'chief_complaint') {
      return {
        question: 'What problem are you having today?',
        options: [
          { text: 'Fever', iconType: 'thermometer' },
          { text: 'Headache', iconType: 'headache' },
          { text: 'Stomach pain', iconType: 'stomach' },
          { text: 'Cough / cold', iconType: 'cough' },
          { text: 'Body pain', iconType: 'bodypain' }
        ],
        responseType: 'single_choice',
        capturedField: 'chiefComplaints',
        isFinished: false
      };
    }
    const aiCount = history.filter(m => m.sender === 'ai').length;
    const maxSteps = this.context?.isAyurvedic ? 4 : 4;
    if (aiCount >= maxSteps) {
      return {
        isFinished: true,
        completionMessage: 'Thank you. I have prepared your clinical briefing for the doctor. You can now upload previous reports or continue the appointment.',
        options: [],
        capturedField: 'notes'
      };
    }
    const templateStep = getAdaptiveClinicalStep(this.disease || 'General Discomfort', aiCount, Boolean(this.context?.isAyurvedic), language);
    return {
      question: templateStep.question,
      options: templateStep.options,
      responseType: templateStep.responseType,
      capturedField: templateStep.field || 'notes',
      isFinished: false
    };
  }

  async request(phase = 'interview', retry = 0) {
    if (this.disposed || this.state.busy) return;
    const generation = this.generation;
    this.update({ busy: true, recovering: retry > 0 });
    const history = this.state.messages.map(({ sender, originalText, field, stepIndex }) => ({ sender, text: originalText, field, stepIndex }));
    const language = this.language;
    let result, step, requestTimer;

    try {
      const timeoutPromise = new Promise((_, reject) => { requestTimer = setTimeout(() => reject(new Error('AI request timeout')), 8000); });
      result = await Promise.race([
        this.service.anamnesis({ ...this.context, disease: this.disease || '', language, history,
          latestInput: history.at(-1)?.sender === 'user' ? history.at(-1).text : '',
          caseSummary: this.state.summary, questionCount: history.filter(message => message.sender === 'user' && message.field).length, phase,
          requireTouchOptions: retry > 0,
        }),
        timeoutPromise
      ]);
      step = normalizeClinicalStep(result, history);
    } catch (error) {
      if (this.disposed || generation !== this.generation) return;
      console.warn('AI anamnesis notice:', error);
      if (retry < 1) {
        this.pendingPhase = phase;
        this.update({ busy: false, recovering: true });
        this.retryTimer = this.schedule(() => this.request(phase, retry + 1), 600);
        return;
      }
      result = this._getLocalStep(phase, history, language);
      step = normalizeClinicalStep(result, history);
    } finally {
      clearTimeout(requestTimer);
    }
    if (this.disposed || generation !== this.generation) return;
    this.aiUnavailableUntil = 0;
    globalAiUnavailableUntil = 0;
    this.pendingPhase = null;
    if (phase === 'chief_complaint') {
      this.update({ starter: { ...step, sourceLanguage: language }, busy: false, recovering: false });
    } else {
      const summary = { ...this.state.summary, ...step.caseSummaryUpdate, chiefComplaints: this.state.summary.chiefComplaints,
        ...(step.dashavidhaCoverage ? { dashavidhaCoverage: step.dashavidhaCoverage } : {}) };
      const questionMessage = this.message('ai', step.isFinished ? step.completionMessage : step.question,
        { field: step.field, stepIndex: history.filter(m => m.sender === 'ai').length, isFinal: step.isFinished, sourceLanguage: language });
      this.update({ summary, messages: [...this.state.messages, questionMessage],
        step: step.isFinished ? null : { ...step, id: questionMessage.id, sourceLanguage: language },
        finished: step.isFinished, urgentReferral: Boolean(step.urgentReferral), busy: false, recovering: false });
      this.save();
    }
    if (language !== this.language) await this.localize(this.language);
  }
  async translate(texts, language) {
    const key = JSON.stringify([language, texts]);
    if (this.cache.has(key)) return this.cache.get(key);
    try {
      const result = await this.service.translateClinical(texts, language);
      if (Array.isArray(result?.translations) && result.translations.length === texts.length && !result.translations.some(text => typeof text !== 'string' || !text.trim())) {
        this.cache.set(key, result.translations);
        if (this.cache.size > 30) this.cache.delete(this.cache.keys().next().value);
        return result.translations;
      }
    } catch (e) {
      console.warn('Translation notice, using source text:', e);
    }
    return texts;
  }
  async localize(language) {
    this.language = language;
    const version = ++this.translationVersion, generation = this.generation;
    this.cancel(this.translationTimer);
    const active = this.state.step || this.state.starter;
    const activeId = active?.id;
    const messages = this.state.messages;
    this.update({ translating: true });
    const current = () => !this.disposed && generation === this.generation && version === this.translationVersion;
    try {
      // Prioritize the visible question and cards in one request. History follows
      // independently and cannot overwrite later patient answers.
      if (active) {
        const texts = [active.originalQuestion || active.question, ...(active.originalOptions || active.options).map(option => option.text)];
        const translated = await this.translate(texts, language);
        if (!current() || activeId !== (this.state.step || this.state.starter)?.id) return;
        const translatedStep = { ...active, question: translated[0], options: active.options.map((option, i) => ({ ...option, text: translated[i + 1] })) };
        this.update({
          ...(this.state.step ? { step: translatedStep } : { starter: translatedStep }), translating: false,
          messages: this.state.messages.map(message => message.id === activeId ? { ...message, text: translated[0] } : message)
        });
      } else if (current()) this.update({ translating: false });
      const historyMessages = messages.filter(message => message.id !== activeId);
      if (historyMessages.length) {
        const translations = await this.translate(historyMessages.map(m => m.originalText), language);
        if (!current()) return;
        const byId = new Map(historyMessages.map((m, i) => [m.id, translations[i]]));
        this.update({ messages: this.state.messages.map(m => byId.has(m.id) ? { ...m, text: byId.get(m.id) } : m) });
      }
    } catch {
      if (!current()) return;
      // Keep the previous text readable while retrying the language transaction.
      this.update({ translating: false });
      this.translationTimer = this.schedule(() => this.localize(this.language), 4000);
    }
  }
  reconnect() { if (this.pendingPhase && !this.state.busy) { if (this.retryTimer) { this.cancel(this.retryTimer); this.retryTimer = null; } this.request(this.pendingPhase, 1); } }
  reset() {
    ++this.generation; ++this.translationVersion;
    if (this.retryTimer) { this.cancel(this.retryTimer); this.retryTimer = null; }
    if (this.translationTimer) { this.cancel(this.translationTimer); this.translationTimer = null; }
    this.pendingPhase = null;
    this.disease = ''; this.update({ started: false, busy: false, recovering: false, translating: false, finished: false, urgentReferral: false, messages: [], step: null, summary: { chiefComplaints: [], notes: '' } });
    this.save(); this.loadStarter();
  }
  dispose() {
    this.disposed = true; ++this.generation; ++this.translationVersion;
    if (this.retryTimer) { this.cancel(this.retryTimer); this.retryTimer = null; }
    if (this.translationTimer) { this.cancel(this.translationTimer); this.translationTimer = null; }
    this.listeners.clear();
  }
}
