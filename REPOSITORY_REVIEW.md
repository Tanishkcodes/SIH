# Repository review — 2026-09-05

## Scope and verification

- Parsed all 67 application JavaScript/JSX modules under `src`, checked unresolved identifiers, and checked relative static imports. After fixes: zero unresolved identifiers and zero missing static imports. This is a static check, not proof that every UI flow works.
- Reviewed routing, voice capture/playback/dispatch, clinical session handling, authentication/session storage, translation provider calls, database access, schema/migrations and test configuration.
- Production build passed. Vite still reports oversized bundles and mixed static/dynamic imports; the main application JavaScript bundle is about 1.73 MB before gzip.
- Added `npm test` for the local automated suites, including the required experimental VM flag for OCR mocks. Latest run: **49 passed, 5 failed, 54 total**. See `audit-test-results.txt` and `audit-build-results.txt`.
- The rescheduling integration test requires configured Supabase environment values and an existing past appointment. It did not run successfully; it was not added to the offline suite. Browser automation scripts and production database migrations were not executed in this review.
- Existing and concurrent edits were present, including changes to voice navigation and server model settings. Results describe the checked working-tree snapshot. Generated assets, third-party dependencies and historical patch scripts were not exhaustively manually reviewed.

## Fixed in this review

1. `src/pages/AdminDashboard.jsx`: imported the missing `Trash2` icon, preventing a ReferenceError when its UI branch renders.
2. `src/pages/AuthPage.jsx`: obtained `logout` from the session context so the switch-portal logout button works.
3. `src/pages/HistoryInterviewPage.jsx`: replaced the missing `BodyMap` reference with localized body-region buttons. This is a legacy page; `/interview` currently redirects to the patient dashboard.
4. `src/engine/ClinicalInterviewSession.js`: moved clinical-response validation inside the recovery block. Malformed/repeated questions now use the retry path instead of throwing while the session stays busy. Also clear the request timeout after settlement. The regression test now passes.
5. `src/components/ClinicalAnamnesisChat.jsx`: require explicit activation by default. The booking flow already passes `active`; accidental mounts no longer show the interview. The activation test now passes.

## Unresolved findings, highest priority first

### High: database policies do not isolate patient records

`supabase_schema.sql:326–365` defines unrestricted patient, appointment, clinical intake and report policies using `true`. Those policies do not establish that the caller owns a record or is authorized clinical staff. The migrations need to be reconciled with authenticated database identities and ownership checks before treating the application as access-controlled. Deployed policy state was not inspected; this finding concerns the checked-in schema.

### High: staff account creation lacks a caller authorization check

`supabase/migrations/20260830060000_staff_auth_system.sql:35` defines `create_staff_account` as `SECURITY DEFINER`, accepts a role, and inserts accounts without validating the caller as an administrator. No corresponding execute-permission restriction was found in the checked-in migrations. Review actual deployed grants and introduce server-side authorization. Merely hiding the admin UI does not restrict the RPC.

The same migration also includes fixed seed credentials (`:226`). Do not assume seeded accounts have been rotated in deployment; that was not verified. No credentials were used during this review.

### High: optional Gemini secrets are used in browser code

`src/engine/AICommandEngine.js:149`, `src/engine/AiTranslationService.js:227` and `src/engine/DOMTranslator.js:483` reference `VITE_GEMINI_API_KEY` for direct provider requests. If configured, Vite exposes that value in the client bundle. Route these calls exclusively through the existing server service and remove the client secret configuration. This review did not inspect or disclose any actual secret value.

### Voice correctness: stale action results and ambiguous field input

- `src/voicenav/VoiceNavProvider.jsx:250–255`: the action signature is collected but not checked after the model returns. Same-page doctor/action changes can execute a result against a changed catalog. Reproduced by the failing catalog-change test.
- `src/voicenav/VoiceNavProvider.jsx:340–359`: an unhandled `out_of_context` result can reach a form transcript callback. Clarification or ambiguous navigation can therefore be treated as field data. Reproduced by the failing field-dictation test.

These lines were already being edited by other work. This review did not overwrite that behavior.

### Remaining test mismatches

Three additional voice-stack tests fail:

- The Gemini navigation mock assumes `thinkingConfig.thinkingLevel` always exists; the current server model configuration does not always send it.
- The fallback test hard-codes a different Llama model from the server default, causing the mock itself to reject the request. This failure alone is not evidence that the real fallback endpoint is down.
- The clinical no-option test expects immediate fallback-provider repair, but the server accepts the first draft. Align the server's output contract with the client, which requires at least two distinct answer options for an unfinished question.

## Next verification

Resolve the server/client response contract and concurrent voice changes, then rerun `npm test`. Separately verify actual database grants/policies and authenticated ownership before deploying access-control changes. An end-to-end microphone/device check and authenticated portal checks remain necessary; a successful build does not cover them.
