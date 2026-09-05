/* ============================================
   SWASTHYA SETU — Voice Command Parser v3.0
   Universal multi-language intent recognition
   Fast-path < 2ms + AI semantic fallback
   ============================================ */

import { VOICE_COMMANDS } from './LanguagePack';
import aiCommandEngine from '../engine/AICommandEngine';

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return matrix[a.length][b.length];
}

// Normalize text for comparison
function normalize(text) {
  return text.toLowerCase().trim().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ');
}

// Calculate similarity score (0-1)
function similarity(input, target) {
  const a = normalize(input);
  const b = normalize(target);
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

class CommandParser {
  constructor() {
    this.pageCommands = {};
    this.confidenceThreshold = 0.6;
    this.currentLanguage = 'en';
    this.routes = [];
    this.currentPage = null;
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
  }

  setCurrentPage(page) {
    this.currentPage = page;
  }

  setRoutes(routes) {
    this.routes = Array.isArray(routes) ? routes : [];
  }

  // Register page-specific commands
  registerPageCommands(pageId, commands) {
    this.pageCommands[pageId] = commands;
  }

  unregisterPageCommands(pageId) {
    delete this.pageCommands[pageId];
  }

  async parse(transcript, currentPage = null, context = {}) {
    const input = normalize(transcript);
    if (!input) return { intent: 'out_of_context', confidence: 0, raw: transcript };
    const registered = { ...this.pageCommands.__global__, ...this.pageCommands[currentPage] };
    const actions = context.actions || Object.entries(registered).map(([intent, description]) => ({ intent, description: String(description) }));
    // Only exact, unique labels bypass the model. Natural phrasing always gets context.
    const matches = actions.filter(action => normalize(action.label || action.description) === input);
    if (matches.length === 1) return { intent: matches[0].intent, confidence: 1, raw: transcript };
    const commands = Object.fromEntries(actions.map(action => [action.intent, action.description]));
    const result = await aiCommandEngine.parseIntent(transcript, commands, {}, {
      page: currentPage || this.currentPage, language: this.currentLanguage,
      routes: this.routes, expectsFreeText: Boolean(context.expectsFreeText),
      recognitionAlternatives: context.recognitionAlternatives || [],
    });
    return { ...result, raw: transcript };
  }

  // Check if transcript matches a specific language name (for language selection)
  matchLanguage(transcript) {
    const input = normalize(transcript);
    let bestMatch = { lang: null, confidence: 0 };

    Object.entries(VOICE_COMMANDS.languageSelect).forEach(([langCode, triggers]) => {
      triggers.forEach(trigger => {
        const score = similarity(input, trigger);
        if (score > bestMatch.confidence) {
          bestMatch = { lang: langCode, confidence: score };
        }
      });
    });

    return bestMatch.confidence >= this.confidenceThreshold ? bestMatch : { lang: null, confidence: 0 };
  }
}

// Singleton instance
const commandParser = new CommandParser();

export default commandParser;
export { CommandParser };
