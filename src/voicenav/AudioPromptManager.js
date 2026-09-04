/* ============================================
   SWASTHYA SETU — Audio Prompt Manager
   Auto-play page instructions, idle prompts,
   encouragements, and contextual audio cues
   ============================================ */

import audioFeedback from './AudioFeedback';
import { getAudioPrompt } from './LanguagePack';

export function isMutedPortal() {
  if (typeof window === 'undefined') return false;
  const path = (window.location.pathname || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  return path.includes('/physician') ||
         path.includes('/doctor') ||
         path.includes('/admin') ||
         search.includes('role=doctor') ||
         search.includes('role=admin');
}

class AudioPromptManager {
  constructor() {
    this.idleTimer = null;
    this.idleTimeout = 30000; // 30 seconds of no interaction
    this.currentLang = 'en';
    this.isEnabled = true;
    this.hasSpokenWelcome = {};
    this.currentPageId = null;
    this._langChangeTimer = null;
    this._landingGestureRetry = null;
  }

  // The initial greeting uses bundled recordings only, independent of API availability.
  async speakInitialLandingWelcome(force = false) {
    if (isMutedPortal()) return;
    this.currentPageId = 'landing';
    if (!this.isEnabled) return;
    if (!force && this.hasSpokenWelcome.landing_initial_hi) return;

    // Use the bundled studio recording welcome-hi.mp3 (with fallback to welcome_hi.mp3)
    const spoken = await audioFeedback.playWelcomeAudio('/welcome-hi.mp3', '/welcome_hi.mp3');
    if (spoken) {
      this.hasSpokenWelcome.landing_initial_hi = true;
      this._cleanupLandingGestureRetry();
      return;
    }

    // Browsers block autoplay until the first user gesture.
    // Listen for any user interaction (pointerdown, click, touchstart, keydown) to immediately play!
    if (typeof window !== 'undefined' && !this._landingGestureRetry) {
      const events = ['pointerdown', 'click', 'touchstart', 'keydown'];
      this._landingGestureRetry = () => {
        this._cleanupLandingGestureRetry();
        if (this.currentPageId === 'landing' || window.location.pathname === '/') {
          this.speakInitialLandingWelcome(true);
        }
      };
      events.forEach(evt => {
        window.addEventListener(evt, this._landingGestureRetry, { once: true, passive: true });
      });
    }
  }

  _cleanupLandingGestureRetry() {
    if (this._landingGestureRetry && typeof window !== 'undefined') {
      const events = ['pointerdown', 'click', 'touchstart', 'keydown'];
      events.forEach(evt => {
        window.removeEventListener(evt, this._landingGestureRetry);
      });
      this._landingGestureRetry = null;
    }
  }

  setLanguage(lang, autoReplay = true) {
    const prevLang = this.currentLang;
    this.currentLang = lang;

    if (isMutedPortal()) return;

    // When language changes, immediately speak the page guidance in the new language!
    if (autoReplay && prevLang !== lang && this.isEnabled) {
      if (this._langChangeTimer) clearTimeout(this._langChangeTimer);
      audioFeedback.stop();
      this._langChangeTimer = setTimeout(() => {
        const pageId = this.currentPageId;
        if (!pageId) return;
        const promptKey = `welcome${pageId.charAt(0).toUpperCase() + pageId.slice(1)}`;
        const text = getAudioPrompt(this.currentLang, promptKey);
        if (text) {
          audioFeedback.speak(text, this.currentLang);
        }
      }, 150);
    }
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clearIdleTimer();
      audioFeedback.stop();
    }
  }

  // Set current page for audio context
  setCurrentPage(pageId) {
    this.currentPageId = pageId;
  }

  // Speak a page welcome message
  async speakPageWelcome(pageId, force = false) {
    if (isMutedPortal()) return;
    this.currentPageId = pageId;
    if (!this.isEnabled) return;
    const cacheKey = `${pageId}_${this.currentLang}`;
    if (!force && this.hasSpokenWelcome[cacheKey]) return;

    const promptKey = `welcome${pageId.charAt(0).toUpperCase() + pageId.slice(1)}`;
    let text = getAudioPrompt(this.currentLang, promptKey);
    if (!text && typeof document !== 'undefined') {
      const heading = document.querySelector('main h1, main h2, h1')?.textContent?.trim();
      const description = document.querySelector('main p, [role="main"] p')?.textContent?.trim();
      text = [heading, description].filter(Boolean).join('. ').slice(0, 600);
    }

    if (text) {
      const spoken = await audioFeedback.interrupt(text, this.currentLang);
      if (spoken) this.hasSpokenWelcome[cacheKey] = true;
    }
  }

  // Force speak a page welcome (even if already spoken)
  async forceSpeak(promptKey) {
    if (isMutedPortal() || !this.isEnabled) return;
    const text = getAudioPrompt(this.currentLang, promptKey);
    if (text) {
      await audioFeedback.interrupt(text, this.currentLang);
    }
  }

  // Speak custom text
  async speakText(text) {
    if (isMutedPortal() || !this.isEnabled) return;
    await audioFeedback.speak(text, this.currentLang);
  }

  // Speak and interrupt any current speech
  async interruptWith(text, lang = null) {
    if (isMutedPortal() || !this.isEnabled) return;
    const targetLang = lang || this.currentLang || 'en';
    await audioFeedback.interrupt(text, targetLang);
  }

  // Start idle detection — speaks prompt if user is inactive
  startIdleDetection(customPrompt = null) {
    this.clearIdleTimer();
    if (isMutedPortal()) return;
    this.idleTimer = setTimeout(() => {
      if (this.isEnabled && !isMutedPortal()) {
        const text = customPrompt || getAudioPrompt(this.currentLang, 'idlePrompt');
        if (text) {
          audioFeedback.speak(text, this.currentLang);
        }
      }
    }, this.idleTimeout);
  }

  // Reset idle timer (call on any user interaction)
  resetIdleTimer() {
    if (isMutedPortal()) {
      this.clearIdleTimer();
      return;
    }
    if (this.idleTimer) {
      this.clearIdleTimer();
      this.startIdleDetection();
    }
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // Speak encouragement after a response
  async speakEncouragement() {
    if (isMutedPortal() || !this.isEnabled) return;
    const text = getAudioPrompt(this.currentLang, 'encouragement');
    if (text && Math.random() > 0.5) { // Only sometimes to avoid being annoying
      await audioFeedback.speak(text, this.currentLang);
    }
  }

  // Speak section completion
  async speakSectionDone() {
    if (isMutedPortal() || !this.isEnabled) return;
    audioFeedback.playSuccess();
    const text = getAudioPrompt(this.currentLang, 'sectionDone');
    if (text) {
      await audioFeedback.speak(text, this.currentLang);
    }
  }

  // Speak error/not understood
  async speakError() {
    if (isMutedPortal() || !this.isEnabled) return;
    audioFeedback.playError();
    const text = getAudioPrompt(this.currentLang, 'errorPrompt');
    if (text) {
      await audioFeedback.speak(text, this.currentLang);
    }
  }

  // Reset welcome tracking (e.g., on session reset)
  resetWelcomes() {
    this.hasSpokenWelcome = {};
  }

  // Stop everything
  stop() {
    this.clearIdleTimer();
    if (this._langChangeTimer) {
      clearTimeout(this._langChangeTimer);
      this._langChangeTimer = null;
    }
    if (this.currentPageId !== 'landing') {
      this._cleanupLandingGestureRetry();
    }
    audioFeedback.stop();
  }
}

// Singleton
const audioPromptManager = new AudioPromptManager();

export default audioPromptManager;
export { AudioPromptManager };
