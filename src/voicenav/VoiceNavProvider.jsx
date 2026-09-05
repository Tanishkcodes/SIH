import { buildActions, captureControls, controlLabel, isAvailableControl, validateIntent } from './ActionSnapshot.js';
import ElevenLabsRecognition from './ElevenLabsRecognition';
import { TranscriptRegistry } from './TranscriptRegistry';
/* ============================================
   SWASTHYA SETU — VoiceNav Provider
   Global voice navigation context wrapping entire app
   Handles: speech recognition, command dispatch, 
   audio feedback, and page-level command registration
   ============================================ */

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import commandParser from './CommandParser';
import audioFeedback, { isMutedPortal } from './AudioFeedback';
import audioPromptManager from './AudioPromptManager';
import { getLanguageInfo } from './LanguagePack';
import { db } from '../lib/db';
import { useLanguage } from '../context/LanguageContext';

const VoiceNavContext = createContext(null);

// ElevenLabs streams microphone audio; no browser speech-recognition dependency.
const SpeechRecognition = ElevenLabsRecognition;
export const NOT_RECOGNIZED_MESSAGES = {
  en: 'Command not recognized',
  hi: 'पहचाना नहीं गया',
  ta: 'அடையாளம் காணப்படவில்லை',
  te: 'గుర్తించబడలేదు',
  bn: 'সনাক্ত করা যায়নি',
  mr: 'आदेश ओळखला नाही',
  gu: 'ઓળખાયું નથી',
  kn: 'ಗುರುತಿಸಲಾಗಿಲ್ಲ',
  ml: 'തിരിച്ചറിഞ്ഞില്ല',
};

export function getNotRecognizedMessage(lang) {
  return NOT_RECOGNIZED_MESSAGES[lang] || NOT_RECOGNIZED_MESSAGES.en;
}

const isSpeechSupported = ElevenLabsRecognition.supported;

export function VoiceNavProvider({ children }) {
  const transcriptRegistryRef = useRef(new TranscriptRegistry());
  const languageContext = useLanguage();
  const currentLang = languageContext?.currentLang || 'en';
  const setCurrentLang = languageContext?.setCurrentLang;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micState, setMicState] = useState('idle'); // idle | listening | speaking | processing
  const [voiceError, setVoiceError] = useState('');
  const [recognitionFeedback, setRecognitionFeedback] = useState(null); // { type: 'success'|'error', text: string }
  const [language, setLanguageState] = useState(currentLang);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [lastCommand, setLastCommand] = useState(null);

  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const sessionWantedRef = useRef(false);
  const processingRef = useRef(false);
  const requestEpochRef = useRef(0);
  const resumeRef = useRef(() => {});
  const feedbackTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const commandHandlersRef = useRef({});
  const currentPageRef = useRef(null);
  const isListeningRef = useRef(false);
  const onTranscriptCallbackRef = useRef(null);
  const languageRef = useRef(currentLang);
  const isDictationModeRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');
  const recognitionAlternativesRef = useRef(['', '', '']);

  // Synchronize language and speech recognition engine whenever currentLang changes
  useEffect(() => {
    setLanguageState(currentLang);
    languageRef.current = currentLang;
    commandParser.setLanguage(currentLang);
    audioPromptManager.setLanguage(currentLang);
    if (recognitionRef.current) {
      try {
        const langInfo = getLanguageInfo(currentLang);
        recognitionRef.current.lang = langInfo.speechCode;
      } catch (e) {}
    }
  }, [currentLang]);

  // Initialize speech recognition with continuous listening & adaptive silence debounce
  useEffect(() => {
    if (!isSpeechSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => {
      if (!isListeningRef.current) return;
      setMicState('listening');
      audioFeedback.playListeningStart();
    };

    recognition.onresult = (event) => {
      if (!isListeningRef.current || processingRef.current) return;
      let interim = '';
      const interimAlternatives = ['', '', ''];
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          newFinal += ` ${text}`;
          for (let alternativeIndex = 0; alternativeIndex < 3; alternativeIndex++) {
            const alternativeText = result[alternativeIndex]?.transcript || text;
            recognitionAlternativesRef.current[alternativeIndex] =
              `${recognitionAlternativesRef.current[alternativeIndex]} ${alternativeText}`.trim();
          }
        } else {
          interim += ` ${text}`;
          for (let alternativeIndex = 0; alternativeIndex < 3; alternativeIndex++) {
            interimAlternatives[alternativeIndex] += ` ${result[alternativeIndex]?.transcript || text}`;
          }
        }
      }

      if (newFinal) {
        accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + newFinal).trim();
      }

      // Update live visual transcript indicator
      const display = (accumulatedTranscriptRef.current + (interim ? ' ' + interim : '')).trim();
      if (display) {
        setInterimTranscript(display);
      }

      // Partials are display-only and must not cancel a pending committed utterance.
      if (!newFinal) {
        if (interim && silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        return;
      }

      // Reset adaptive silence timer: generous pause for natural human breathing/thinking pauses
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Short settling window after provider VAD; new partial speech postpones dispatch.
      const finalPauseMs = 300;
      silenceTimerRef.current = setTimeout(() => {
        const full = accumulatedTranscriptRef.current.trim();
        if (newFinal && full && isListeningRef.current) {
          const recognitionAlternatives = recognitionAlternativesRef.current
            .map((finalText, index) => `${finalText} ${interimAlternatives[index] || ''}`.trim())
            .filter((candidate, index, all) => candidate && candidate !== full && all.indexOf(candidate) === index);
          // Transition directly to processing without locking in raw unverified transcript
          setInterimTranscript('');
          setMicState('processing');
          accumulatedTranscriptRef.current = '';
          recognitionAlternativesRef.current = ['', '', ''];
          pauseListening();
          handleVoiceInput(full, recognitionAlternatives);
        }
      }, finalPauseMs);
    };

    recognition.onerror = (event) => {
      sessionWantedRef.current = false;
      setVoiceSessionActive(false);
      if (event.error === 'no-speech') {
        // Keep listening smoothly without abrupt cancellation
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceError('Microphone access is blocked. Allow microphone access for localhost in Chrome, then tap the microphone again.');
        setIsListening(false);
        isListeningRef.current = false;
        setMicState('idle');
        return;
      }
      if (event.error === 'audio-capture') {
        setVoiceError('No working microphone was found. Check the microphone connection and Windows input settings.');
        setIsListening(false);
        isListeningRef.current = false;
        setMicState('idle');
        return;
      }
      // Preserve actionable provider errors instead of silently returning to idle.
      console.warn('Voice input unavailable:', event.message || event.error);
      setVoiceError(event.message || 'Voice connection failed. Tap the microphone to retry.');
      setIsListening(false);
      isListeningRef.current = false;
      setMicState('idle');
    };

    recognitionRef.current = recognition;

    // Listen for speaking state changes from audio feedback
    audioFeedback.onSpeakingChange = (speaking) => {
      setIsSpeaking(speaking);
      if (speaking) {
        isListeningRef.current = false;
        recognitionRef.current?.stop();
        setIsListening(false);
        setMicState('speaking');
      } else if (!isListeningRef.current) {
        setMicState('idle');
      }
    };

    return () => {
      sessionWantedRef.current = false;
      requestEpochRef.current++;
      audioFeedback.onSpeakingChange = null;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  // Display temporary visual feedback badge (success or unrecognized error)
  const showFeedback = useCallback((feedback, durationMs = 2400) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setRecognitionFeedback(feedback);
    if (durationMs > 0) {
      feedbackTimerRef.current = setTimeout(() => {
        setRecognitionFeedback(null);
      }, durationMs);
    }
  }, []);

  // Handle voice input — parse and dispatch
  const handleVoiceInput = useCallback(async (text, recognitionAlternatives = []) => {
    if (isMutedPortal()) return;
    if (processingRef.current) return;
    processingRef.current = true;
    const epoch = requestEpochRef.current;
    setMicState('processing');
    try {
    const invoke = async (handler, result) => {
      try { return (await handler(result)) !== false; }
      catch (error) { console.warn('Voice action could not be applied:', error); return false; }
    };

    const controls = captureControls();
    const requestPage = currentPageRef.current;
    let pageHandlers = commandHandlersRef.current[requestPage] || {};
    const currentActions = () => buildActions(commandParser.pageCommands[requestPage], commandParser.pageCommands.__global__, captureControls());
    const actions = buildActions(commandParser.pageCommands[requestPage], commandParser.pageCommands.__global__, controls);
    const signature = JSON.stringify(actions);
    const transcriptCallback = onTranscriptCallbackRef.current;
    const result = await commandParser.parse(text, requestPage, {
      actions, expectsFreeText: Boolean(transcriptCallback), recognitionAlternatives,
    });
    if (epoch !== requestEpochRef.current || requestPage !== currentPageRef.current) return;
    if (signature !== JSON.stringify(currentActions()) || transcriptCallback !== onTranscriptCallbackRef.current) {
      showFeedback({ type: 'error', text: getNotRecognizedMessage(languageRef.current) + ' — ' + text }, 4000);
      return;
    }
    pageHandlers = commandHandlersRef.current[requestPage] || {};
    setLastCommand(result);

    // If it's a recognized command, dispatch it
    let handled = false;
    if (validateIntent(result, actions, commandParser.routes, Boolean(transcriptCallback)) && result.intent !== 'free_text' && result.intent !== 'out_of_context') {
      // Normalized intent aliases — covers both snake_case and camelCase variants
      const aliases = {
        book_appointment:  'bookAppointment',
        login_doctor:      'loginDoctor',
        login_admin:       'loginAdmin',
        login_patient:     'loginPatient',
        scan_document:     'scanDocument',
        select_language:   'selectLanguage',
        read_summary:      'readSummary',
        view_appointments: 'viewAppointments',
        view_history:      'viewHistory',
        view_reports:      'viewReports',
        view_donations:    'viewDonations',
        view_communities:  'viewCommunities',
        view_help:         'viewHelp',
        view_profile:      'viewProfile',
        show_abha_card:    'showAbhaCard',
        toggle_ayush:      'toggleAyush',
        search_hospital:   'searchHospital',
        start_consultation:'startConsultation',
        select_doctor:     'select_doctor',
        select_hospital:   'select_hospital',
        doctor_profile:        'view_doctor_profile',
        open_doctor_profile:   'view_doctor_profile',
        select_doctor_profile: 'view_doctor_profile',
        open_community:        'select_community',
        view_community:        'select_community',
        choose_date:           'select_date',
        appointment_date:      'select_date',
        choose_time:           'select_time',
        appointment_time:      'select_time',
        confirm_booking:   'confirm',
        confirmBooking:    'confirm',
        book_now:          'confirm',
        go_next:           'next',
        go_back:           'back',
        previous:          'back',
      };
      const resolvedIntent = aliases[result.intent] || result.intent;

      // 1. Page-level handlers (highest priority)
      if (pageHandlers && (pageHandlers[result.intent] || pageHandlers[resolvedIntent])) {
        handled = await invoke(pageHandlers[result.intent] || pageHandlers[resolvedIntent], result);
      }
      // 2. Global handlers
      else if (commandHandlersRef.current['__global__'] && (commandHandlersRef.current['__global__'][result.intent] || commandHandlersRef.current['__global__'][resolvedIntent])) {
        handled = await invoke(commandHandlersRef.current['__global__'][result.intent] || commandHandlersRef.current['__global__'][resolvedIntent], result);
      }

      // Execute only the exact control selected from this still-current snapshot.
      if (!handled && /^activate_\d+$/.test(result.intent)) {
        const control = controls.find(item => item.intent === result.intent);
        if (control && isAvailableControl(control.element) && controlLabel(control.element) === control.label) {
          control.element.click();
          handled = true;
        }
      }

      if (handled) {
        setTranscript(text);
        audioFeedback.playSuccess();
        const successMsg = result.message || '✓ Done';
        showFeedback({ type: 'success', text: successMsg }, 2200);
        if (result.message) {
          // Speak AI-generated localized confirmation in user's spoken language
          audioFeedback.speak(result.message, languageRef.current);
        }
      } else {
        // Not handled, and page is NOT expecting free text (e.g., Landing Page, Dashboard)
        // Keep the heard text available when an action cannot be applied.
        setTranscript(text);
        setInterimTranscript('');
        audioFeedback.playError();
        const notRecognizedMsg = getNotRecognizedMessage(languageRef.current);
        showFeedback({ type: 'error', text: `✕ ${notRecognizedMsg}` }, 2500);
        // A rejected/ambiguous selection must not speak the model's success confirmation.
        audioFeedback.speak(notRecognizedMsg, languageRef.current);
      }
    } else if (result.intent === 'out_of_context') {
      // Clarification also applies on form pages; it must not become field data.
      setTranscript(text);
      setInterimTranscript('');
      audioFeedback.playError();
      const notRecognizedMsg = getNotRecognizedMessage(languageRef.current);
      showFeedback({ type: 'error', text: result.message || `✕ ${notRecognizedMsg}` }, 5000);
      if (result.message) {
        audioFeedback.speak(result.message, languageRef.current);
      } else {
        const fallbackText = getLanguageInfo(languageRef.current).strings?.voiceNotUnderstood || "I didn't understand that. Please try again.";
        audioFeedback.speak(fallbackText, languageRef.current);
      }
    }

    // If there's a transcript callback (e.g., for free-form interview input), call it
    // IMPORTANT: Only call it if the voice input was NOT handled as a system/navigation command
    if (onTranscriptCallbackRef.current && !handled && result.intent === 'free_text') {
      setTranscript(text);
      const callback = onTranscriptCallbackRef.current;
      handled = await invoke(command => callback(text, command), result);
    } else if (!handled && !onTranscriptCallbackRef.current) {
      // Preserve the transcript for diagnosis without treating it as field input.
      setTranscript(text);
      setInterimTranscript('');
    }

    // Reset idle timer
    audioPromptManager.resetIdleTimer();
    db.voice.log({
      page_id: currentPageRef.current,
      language: languageRef.current,
      intent: result.intent || 'unknown',
      confidence: Number(result.confidence || 0),
      handled,
    }).catch(() => {});

    } catch (error) {
      if (epoch === requestEpochRef.current) {
        setTranscript(text);
        setVoiceError(error?.message || 'Voice understanding is unavailable. Please try again.');
      }
    } finally {
      processingRef.current = false;
      if (!audioFeedback.isSpeaking) setMicState('idle');
    }
  }, [showFeedback]);

  // Start listening
  const startListening = useCallback((continuous = true, resume = false) => {
    if (!isSpeechSupported || !recognitionRef.current || !isVoiceEnabled || isMutedPortal()) return;

    sessionWantedRef.current = true;
    setVoiceSessionActive(true);
    // Stop any current speech
    audioPromptManager.stop();
    if (!resume) {
      setVoiceError('');
      setTranscript('');
      setRecognitionFeedback(null);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    }
    setInterimTranscript('');

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    accumulatedTranscriptRef.current = '';
    recognitionAlternativesRef.current = ['', '', ''];

    try {
      const langInfo = getLanguageInfo(languageRef.current);
      recognitionRef.current.lang = langInfo.speechCode;
      recognitionRef.current.continuous = true;
      setIsListening(true);
      isListeningRef.current = true;
      setMicState('connecting');
      setInterimTranscript('');
      recognitionRef.current.start();
    } catch (e) {
      // Already started or other error
      console.warn('Could not start recognition:', e);
      sessionWantedRef.current = false;
      setVoiceSessionActive(false);
      setVoiceError('Could not start the microphone. Please try again.');
      setIsListening(false);
      isListeningRef.current = false;
      setMicState('idle');
    }
  }, [isVoiceEnabled]);

  // Pause capture while processing or speaking, preserving the user's session.
  const pauseListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    // Clear the intent flag before stopping. Some browsers dispatch `onend`
    // synchronously enough to otherwise see the old value and auto-restart.
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    setIsListening(false);
    setMicState('idle');
  }, []);

  const stopListening = useCallback(() => {
    sessionWantedRef.current = false;
    setVoiceSessionActive(false);
    requestEpochRef.current++;
    pauseListening();
  }, [pauseListening]);

  // Resume only after both processing and playback end. Never reopen a mic the
  // user stopped, or one on a staff portal/background tab.
  resumeRef.current = () => {
    if (isMutedPortal() || document.hidden || !isVoiceEnabled) {
      if (sessionWantedRef.current) stopListening();
      return;
    }
    if (sessionWantedRef.current && !processingRef.current && !audioFeedback.isSpeaking && !isListeningRef.current) {
      startListening(true, true);
    }
  };
  useEffect(() => {
    const timer = setInterval(() => resumeRef.current(), 350);
    return () => clearInterval(timer);
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isMutedPortal()) return;
    if (sessionWantedRef.current) {
      stopListening();
      audioPromptManager.stop();
    } else {
      startListening(true);
    }
  }, [startListening, stopListening]);

  // Speak text
  const speak = useCallback(async (text, lang = null) => {
    if (isMutedPortal()) return;
    // Stop listening while speaking
    if (isListeningRef.current) {
      pauseListening();
    }
    await audioFeedback.speak(text, lang || languageRef.current);
  }, [pauseListening]);

  // Set language
  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    languageRef.current = lang;
    commandParser.setLanguage(lang);
    audioPromptManager.setLanguage(lang);
    if (setCurrentLang) setCurrentLang(lang);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = getLanguageInfo(lang).speechCode;
      } catch (e) {}
    }
  }, [setCurrentLang]);

  // Register page with its voice commands and handlers
  const registerPage = useCallback((pageId, handlers, commands = {}) => {
    currentPageRef.current = pageId;
    commandParser.setCurrentPage(pageId);
    commandHandlersRef.current[pageId] = handlers;
    commandParser.registerPageCommands(pageId, Object.fromEntries(
      Object.keys(handlers || {}).map(intent => [intent, commands[intent] || [intent.replace(/_/g, ' ')]] )
    ));
  }, []);

  // Unregister page
  const unregisterPage = useCallback((pageId) => {
    delete commandHandlersRef.current[pageId];
    commandParser.unregisterPageCommands(pageId);
    if (currentPageRef.current === pageId) {
      currentPageRef.current = null;
    }
  }, []);

  // Register global handlers
  const registerGlobalHandlers = useCallback((handlers, descriptions = {}) => {
    commandHandlersRef.current['__global__'] = handlers;
    commandParser.registerPageCommands('__global__', Object.fromEntries(
      Object.keys(handlers || {}).map(intent => [intent, descriptions[intent] || [intent.replace(/_/g, ' ')]])
    ));
  }, []);

  // Set callback for free-text transcript (used by interview page)
  const setOnTranscript = useCallback((callback, options = {}) => {
    const release = transcriptRegistryRef.current.add(callback, options.priority || 0);
    onTranscriptCallbackRef.current = transcriptRegistryRef.current.current;
    return () => {
      release();
      onTranscriptCallbackRef.current = transcriptRegistryRef.current.current;
    };
  }, []);

  // Clear transcript callback
  const clearOnTranscript = useCallback(() => {
    transcriptRegistryRef.current.clear();
    onTranscriptCallbackRef.current = null;
  }, []);

  // Field ownership remains compatible with existing forms. Navigation is still classified.
  const setDictationMode = useCallback((enabled) => {
    isDictationModeRef.current = enabled;
  }, []);

  const value = {
    // State
    voiceSessionActive,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    micState,
    voiceError,
    recognitionFeedback,
    language,
    isVoiceEnabled,
    isSpeechSupported,
    lastCommand,

    // Actions
    startListening,
    stopListening,
    toggleListening,
    speak,
    setLanguage,
    setIsVoiceEnabled,
    showFeedback,

    // Page registration
    registerPage,
    unregisterPage,
    registerGlobalHandlers,

    // Transcript callback
    setOnTranscript,
    clearOnTranscript,
    setDictationMode,

    // Direct access to engines
    audioFeedback,
    audioPromptManager,
    commandParser,
  };

  return (
    <VoiceNavContext.Provider value={value}>
      {children}
    </VoiceNavContext.Provider>
  );
}

export function useVoiceNav() {
  const context = useContext(VoiceNavContext);
  if (!context) {
    return {
      isListening: false,
      isSpeaking: false,
      transcript: '',
      interimTranscript: '',
      micState: 'idle',
      voiceError: '',
      language: 'en',
      isVoiceEnabled: true,
      startListening: () => {},
      stopListening: () => {},
      toggleListening: () => {},
      speak: async () => {},
      registerPage: () => {},
      unregisterPage: () => {},
      registerGlobalHandlers: () => {},
      setLanguage: () => {},
      setOnTranscript: () => {},
      clearOnTranscript: () => {},
      setDictationMode: () => {},
      audioFeedback,
      audioPromptManager,
      commandParser
    };
  }
  return context;
}

export default VoiceNavContext;
