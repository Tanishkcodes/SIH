// Test script to verify the new Gemini-Powered Voice Architecture
import { resolveVoiceEntity, resolveVoiceSelection } from '../src/voicenav/resolveVoiceSelection.js';

console.log('=====================================================');
console.log('🧪 VERIFYING DYNAMIC VOICE ARCHITECTURE');
console.log('=====================================================\n');

let pass = 0;
let fail = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    pass++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    fail++;
  }
}

// ── TEST 1: resolveVoiceEntity with Gemini-extracted target ──
console.log('--- TEST 1: Entity Resolution for Dynamic Doctors & Communities ---');
const dynamicDoctors = [
  { id: 'doc_1', name: 'Dr. Rajesh Sharma', specialty: 'Cardiologist' },
  { id: 'doc_2', name: 'Dr. Anita Rao', specialty: 'General Physician' },
  { id: 'doc_3', name: 'Dr. Vikram Patel', specialty: 'Orthopedic Surgeon' } // newly added by admin
];

// User speaks a sentence in Hindi: "mujhe doctor vikram patel se milna hai"
// Gemini extracts target: "Dr. Vikram Patel"
const geminiCmd1 = {
  intent: 'select_doctor',
  target: 'Dr. Vikram Patel',
  value: null,
  raw: 'mujhe doctor vikram patel se milna hai'
};
const matchedDoc1 = resolveVoiceEntity(dynamicDoctors, geminiCmd1, d => [d.name, d.specialty]);
assert(matchedDoc1 && matchedDoc1.id === 'doc_3', `Matches dynamically added doctor by target: "${matchedDoc1?.name}"`);

// User speaks partial doctor name in Tamil: "Dr Anita"
const geminiCmd2 = {
  intent: 'select_doctor',
  target: 'Anita',
  value: 'Anita',
  raw: 'maruthuvar anita'
};
const matchedDoc2 = resolveVoiceEntity(dynamicDoctors, geminiCmd2, d => [d.name, d.specialty]);
assert(matchedDoc2 && matchedDoc2.id === 'doc_2', `Matches doctor by partial target/value: "${matchedDoc2?.name}"`);

// ── TEST 2: Dynamic Communities Resolution ──
console.log('\n--- TEST 2: Dynamic Communities Resolution ---');
const dynamicCommunities = [
  { id: 'comm_cardiac', title: 'Heart Health & Cardiac Recovery' },
  { id: 'comm_diabetes', title: 'Diabetes Management Circle' },
  { id: 'comm_mental', title: 'Mental Wellness & Support' } // newly added
];

const geminiCommCmd = {
  intent: 'select_community',
  target: 'Mental Wellness',
  value: 'Mental Wellness',
  raw: 'mental wellness community kholo'
};
const matchedComm = resolveVoiceEntity(dynamicCommunities, geminiCommCmd, c => [c.title, c.id]);
assert(matchedComm && matchedComm.id === 'comm_mental', `Matches dynamically added community: "${matchedComm?.title}"`);

// ── TEST 3: Dynamic DOM Button Search Simulation ──
console.log('\n--- TEST 3: Dynamic On-Screen Button Discovery & Activation Simulation ---');
// Simulated on-screen buttons discovered by VoiceNavProvider querySelectorAll
const simulatedDomElements = [
  { text: 'Book Appointment', ariaLabel: 'Book Doctor Appointment', disabled: false },
  { text: '+ Add Doctor', ariaLabel: 'Add New Doctor Profile', disabled: false },
  { text: 'Cardiology', ariaLabel: 'Filter by Cardiology', disabled: false },
  { text: 'Confirm Booking', ariaLabel: 'Submit and Confirm', disabled: false }
];

function simulateDomMatch(result, text) {
  const searchCandidates = [
    result.target,
    result.value,
    result.intent && !result.intent.startsWith('activate_') ? result.intent.replace(/_/g, ' ') : null,
    text
  ].filter(Boolean).map(s => String(s).toLowerCase().trim());

  for (const query of searchCandidates) {
    if (!query || query.length < 2) continue;
    const matched = simulatedDomElements.find(el => {
      const elText = (el.text || el.ariaLabel || '').toLowerCase().replace(/\s+/g, ' ').trim();
      return elText === query || elText.includes(query) || query.includes(elText);
    });
    if (matched) return matched;
  }
  return null;
}

// User says "naya doctor jodo" (Hindi for add new doctor)
// Gemini resolves to: intent = "activate_1", target = "Add Doctor", value = "+ Add Doctor"
const testButtonResult = {
  intent: 'activate_1',
  target: 'Add Doctor',
  value: '+ Add Doctor'
};
const matchedBtn = simulateDomMatch(testButtonResult, 'naya doctor jodo');
assert(matchedBtn && matchedBtn.text === '+ Add Doctor', `Dynamically matches on-screen "+ Add Doctor" button: "${matchedBtn?.text}"`);

// User says "confirm booking"
const testConfirmResult = {
  intent: 'confirm',
  target: 'Confirm Booking',
  value: 'Confirm'
};
const matchedConfirm = simulateDomMatch(testConfirmResult, 'confirm booking');
assert(matchedConfirm && matchedConfirm.text === 'Confirm Booking', `Dynamically matches "Confirm Booking" button: "${matchedConfirm?.text}"`);

console.log(`\n=====================================================`);
console.log(`RESULTS: ${pass} PASSED, ${fail} FAILED`);
console.log(`=====================================================\n`);

if (fail > 0) process.exit(1);
