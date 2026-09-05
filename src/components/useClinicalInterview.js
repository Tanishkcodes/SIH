import { useEffect, useRef, useState } from 'react';
import { ClinicalInterviewSession } from '../engine/ClinicalInterviewSession.js';
import voiceAIService from '../voicenav/VoiceAIService';
import audioPromptManager from '../voicenav/AudioPromptManager';

const INACTIVE_STATE = { started: false, busy: false, recovering: false, translating: false, finished: false, messages: [], summary: {}, step: null, starter: null };

export function useClinicalInterview({ active, doctor, patient, isAyurvedic, initialSymptoms, initialNotes, initialSession, language, onUpdateCaseDetails, setOnTranscript }) {
  const sessionRef = useRef(null), saveRef = useRef(onUpdateCaseDetails), languageRef = useRef(language);
  saveRef.current = onUpdateCaseDetails; languageRef.current = language;
  const [state, setState] = useState(INACTIVE_STATE);
  const key = JSON.stringify([doctor?.id, doctor?.name, doctor?.specialty || doctor?.speciality, patient?.id, patient?.age, patient?.gender, isAyurvedic]);
  useEffect(() => {
    if (!active) {
      sessionRef.current?.dispose();
      sessionRef.current = null;
      setState(INACTIVE_STATE);
      return undefined;
    }
    const session = new ClinicalInterviewSession({
      service: voiceAIService, language: languageRef.current,
      context: {
        doctorName: doctor?.name, doctorSpecialty: doctor?.specialty || doctor?.speciality, isAyurvedic,
        patient: {
          age: patient?.age, gender: patient?.gender, conditions: patient?.conditions, allergies: patient?.allergies,
          medications: patient?.medications, medicalHistory: patient?.medicalHistory
        }
      },
      onSave: details => saveRef.current?.({ ...details, intakeSession: { ...details.intakeSession, key } }),
    });
    sessionRef.current = session;
    const restored = initialSession?.key === key && initialSession?.state?.started;
    if (restored) {
      session.state = { ...initialSession.state, busy: false, translating: false };
      session.disease = initialSession.disease; session.counter = initialSession.counter || 0;
    }
    const unsubscribe = session.subscribe(setState);
    if (restored) {
      if (!session.state.step && !session.state.finished) session.request();
      if (initialSession.language !== languageRef.current) session.localize(languageRef.current);
    } else if (initialSymptoms?.length || initialNotes?.trim()) session.begin(initialSymptoms || [], initialNotes || '');
    else session.loadStarter();
    const online = () => session.reconnect();
    window.addEventListener('online', online);
    return () => { unsubscribe(); session.dispose(); audioPromptManager.stop(); window.removeEventListener('online', online); };
  }, [active, key]);

  useEffect(() => {
    const session = sessionRef.current;
    if (active && session && session.language !== language) { audioPromptManager.stop(); session.localize(language); }
  }, [active, language]);

  // Stable registration prevents translation/render changes from invalidating a
  // voice decision. The current controller owns the latest question.
  useEffect(() => active ? setOnTranscript?.(async text => {
    const session = sessionRef.current;
    if (!session) return false;
    return session.state.started ? session.answer(text) : session.begin([], text);
  }, { priority: 20, context: { kind: 'clinical_answer' } }) : undefined, [active, setOnTranscript]);

  const last = state.messages.at(-1);
  useEffect(() => {
    if (!active || state.translating || sessionRef.current?.state.translating || last?.sender !== 'ai' || !last.text) return;
    audioPromptManager.interruptWith(last.text, language);
  }, [active, last?.id, last?.text, state.translating, language]);

  return { state, begin: (...args) => sessionRef.current?.begin(...args), answer: text => sessionRef.current?.answer(text), reset: () => sessionRef.current?.reset() };
}
