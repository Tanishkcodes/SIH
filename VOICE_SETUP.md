# Voice and clinical AI

The `voice-ai` Supabase function now uses:

- ElevenLabs Scribe v2 Realtime for microphone transcription, with a server-issued single-use token.
- ElevenLabs v3 for spoken output in English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada and Malayalam. No browser or Google speech fallback.
- Gemini for contextual navigation, with a bounded NVIDIA fallback. Each utterance receives fresh registered actions, full live hospital/doctor/slot catalogs, and visible labeled controls. Navigation has no browser API-key or keyword-guessing fallback.
- NVIDIA-hosted Llama for adaptive intake and report image extraction. Ayurveda requires ten Dashavidha coverage statuses before ordinary completion; emergencies bypass the checklist.

Set server secrets from `supabase/functions/.env.example`: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `GEMINI_API_KEY`, and `NVIDIA_API_KEY`. Provider keys must never use a `VITE_` prefix. The ElevenLabs key needs speech synthesis and realtime speech token permissions. The selected voice must be accessible to that account.

Deploy the updated `supabase/functions/voice-ai` function along with the frontend. Both sides now restrict navigation to the supplied action catalog. Use the project's existing Supabase deployment and authentication configuration.

Verification: `node --test scripts/test-voice-stack.mjs scripts/test-voice-navigation.mjs` and `npm run build`.

## Navigation contract

New labeled buttons, links and tabs are discovered on the next utterance, including repeated labels. Add `data-voice-context` to cards to distinguish repeated controls, e.g. a hospital's name. Use native buttons or appropriate semantic roles and accessible labels. Hidden, disabled, inert and background controls behind semantic dialogs are excluded. Custom canvas controls require an explicitly registered action.

For entity selection and workflows, register an action with a description containing current entity IDs/names and current valid values. Refresh registration when data changes. Descriptions are capabilities and data, not a list of sentences users must say. Handlers should return `true` when applied and `false` when unavailable or invalid; asynchronous handlers may return a promise. Legacy void handlers are still supported. A failed handler never falls through to a guessed button. Unknown doctor profiles never select the first doctor.

Gemini receives natural text in any supported language and returns one action, target/value, confidence and a short message. Only unique exact labels bypass the model. The client rejects unknown actions, confidence below 0.7, unknown routes and decisions made against an outdated screen/catalog. Ambiguity produces a clarification; there is no automatic multi-step transaction execution. Form dictation also passes through this classifier, so explicit navigation can exit a field.

The microphone uses automatic language detection; the selected UI language controls responses. After the user starts a session, capture pauses during processing/playback and reconnects afterward. Stop cancels pending decisions and prevents resumption. Background tabs and staff portals stop the session. Speech service failures stop it and display an error. The server allows 4.5 seconds for each navigation provider request; these are timeout budgets, not measured response-time guarantees.

No provider credentials are required in the browser for navigation. The older registration extraction path remains separate and should also use the server-backed service.

The automated suite mocks provider responses; it does not measure live accuracy or latency. After deployment, test microphone permission, partial/final transcripts, stopping during connection/playback, and changing language. For each language, try a named doctor, list number, ambiguous specialty, unrestricted symptom narrative, and spoken clinical follow-up. Confirm a landscape or unrelated screenshot produces no medical findings, while a readable report extracts only visible text. Verify a complete Ayurveda intake and an emergency interruption.

Image extraction uses an independent neutral classification/transcription pass, then filters extracted fields against that pass's evidence. This reduces unsupported output but cannot guarantee an AI model's reading of the pixels. Unreadable images and provider failures must remain unverified; review extracted values against the original image.

Provider references: [Scribe realtime](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime), [ElevenLabs language support](https://elevenlabs.io/docs/help-center/other/what-languages-do-you-support), [NVIDIA vision image format](https://docs.nvidia.com/nim/vision-language-models/1.1.0/getting-started.html).
