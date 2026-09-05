/* =========================================================================
   SWASTHYA SETU — Clinical Anamnesis & Adaptive AI Consultation Chat
   - 100% Visual Chat Matching User's Design
   - AI-selected, variable touch options plus speech and free text
   - Clinically adaptive reasoning for any complaint, specialty and care system
   - Real-time Sync with Doctor Appointment Case File
   ========================================================================= */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Mic, MicOff, Bot, User, CheckCircle2,
  RotateCcw, ArrowRight, ArrowLeft, Stethoscope, Leaf
} from 'lucide-react';
import { useVoiceNav } from '../voicenav/VoiceNavProvider';
import { useClinicalInterview } from './useClinicalInterview';
import { isAyurvedicClinician } from '../engine/ClinicalInterviewSession.js';


// ── Custom SVG Icons for Initial Problem Selection ──
function ThermometerIcon({ size = 46, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-20deg)' }}>
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
      <path d="M11.5 6h2" />
      <path d="M11.5 9h2" />
      <path d="M11.5 12h2" />
    </svg>
  );
}

function HeadacheIcon({ size = 46, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 19a7 7 0 0 1-7-7c0-2 .8-3.9 2.2-5.3A7 7 0 0 1 18 5v1" />
      <path d="M9 12a4 4 0 0 0 4 4h1" />
      <path d="M5 4l2 2" />
      <path d="M2 9h3" />
      <path d="M5 14l2-2" />
      <path d="M8 3v3" />
      <path d="M13 18v3" />
      <path d="M16 21h4" />
    </svg>
  );
}

function StomachIcon({ size = 46, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3v4c0 1.5-1 2.5-2.5 3S7 11.5 7 14.5c0 3.5 3 6.5 7 6.5 3.5 0 6-2.5 6-6 0-3.5-2-5.5-3.5-7l.5-5" />
    </svg>
  );
}

function CoughIcon({ size = 46, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19a6 6 0 0 0-6-6H8a4 4 0 0 1-4-4 6 6 0 0 1 12 0v2" />
      <path d="M17 11h4" />
      <path d="M18 14h4" />
      <path d="M17 17h3" />
    </svg>
  );
}

function BodyPainIcon({ size = 46, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3l-3 4-2-1-3 4 2 2-3 4 4 2 2-3 4 2 3-4-2-2z" />
      <path d="M11 9l-2 3 3 1-2 3" />
    </svg>
  );
}

// ── Specialized Question Option Card Icons ──
function TargetIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ChestRadiateIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 21v-8a5 5 0 0 1 10 0v8" />
      <path d="M12 3v4" />
      <path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      <path d="M9 9l-2-2" />
      <path d="M15 9l2-2" />
    </svg>
  );
}

function BackSpineIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 21v-7a5 5 0 0 1 10 0v7" />
      <path d="M12 5v14" />
      <circle cx="12" cy="15" r="2" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function ShoulderJointIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21v-6a6 6 0 0 1 12 0v6" />
      <circle cx="15" cy="12" r="3" />
      <path d="M15 9l2-2" />
      <path d="M18 12h2" />
    </svg>
  );
}

function QuestionPersonIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M19 8c.5-.7 1.5-.7 2 0 .5.7 0 1.5-.5 2l-.5.5v.5" />
      <circle cx="20" cy="13" r="0.5" fill={color} />
    </svg>
  );
}

function ClockIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function FlameIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
    </svg>
  );
}

function PillIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}

function MoonIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function WindIcon({ size = 42, color = '#059669' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

// ── Initial 5 Problem Tiles ──
const CHAT_COPY = {
  en: { title: 'What problem are you having?', subtitle: 'Select all that apply, or speak/type in your own words.', fever: 'Fever', headache: 'Headache', stomach: 'Stomach pain', cough: 'Cough / cold', bodypain: 'Body pain', symptomPlaceholder: 'Type your symptoms or details (optional)', answerPlaceholder: 'You can also speak or type your answer…', speakSymptoms: 'Speak your symptoms', speakAnswer: 'Speak your answer', change: 'Change problem', firstQuestion: 'What problem are you having today?', patientHas: 'I have {disease}.', complete: 'Thank you. I have prepared your clinical briefing for {doctor}. You can now upload previous reports or continue the appointment.', proceed: 'Proceed to upload reports', previous: 'Previous: select time', next: 'Next: upload reports' },
  hi: { title: 'आपको क्या समस्या हो रही है?', subtitle: 'लागू सभी विकल्प चुनें, या अपनी भाषा में बोलें/लिखें।', fever: 'बुखार', headache: 'सिरदर्द', stomach: 'पेट दर्द', cough: 'खांसी / जुकाम', bodypain: 'शरीर में दर्द', symptomPlaceholder: 'अपने लक्षण या विवरण लिखें (वैकल्पिक)', answerPlaceholder: 'आप अपना उत्तर बोल या लिख भी सकते हैं…', speakSymptoms: 'अपने लक्षण बोलें', speakAnswer: 'अपना उत्तर बोलें', change: 'समस्या बदलें', firstQuestion: 'आज आपको क्या समस्या हो रही है?', patientHas: 'मुझे {disease} है।', complete: 'धन्यवाद। मैंने {doctor} के लिए आपकी क्लिनिकल जानकारी तैयार कर दी है। अब आप पिछली रिपोर्ट अपलोड कर सकते हैं या अपॉइंटमेंट जारी रख सकते हैं।', proceed: 'रिपोर्ट अपलोड करने के लिए आगे बढ़ें', previous: 'पिछला: समय चुनें', next: 'अगला: रिपोर्ट अपलोड करें' },
  ta: { title: 'உங்களுக்கு என்ன பிரச்சினை?', subtitle: 'பொருந்தும் அனைத்தையும் தேர்ந்தெடுக்கவும் அல்லது உங்கள் சொற்களில் பேசவும்/தட்டச்சு செய்யவும்.', fever: 'காய்ச்சல்', headache: 'தலைவலி', stomach: 'வயிற்று வலி', cough: 'இருமல் / சளி', bodypain: 'உடல் வலி', symptomPlaceholder: 'அறிகுறிகள் அல்லது விவரங்களை உள்ளிடவும் (விருப்பம்)', answerPlaceholder: 'பதிலை பேசலாம் அல்லது தட்டச்சு செய்யலாம்…', speakSymptoms: 'அறிகுறிகளை பேசுங்கள்', speakAnswer: 'பதிலை பேசுங்கள்', change: 'பிரச்சினையை மாற்று', firstQuestion: 'இன்று உங்களுக்கு என்ன பிரச்சினை?', patientHas: 'எனக்கு {disease} உள்ளது.', complete: 'நன்றி. {doctor} க்கான மருத்துவ குறிப்பைத் தயாரித்துள்ளேன். இப்போது பழைய அறிக்கைகளைப் பதிவேற்றலாம் அல்லது முன்பதிவைத் தொடரலாம்.', proceed: 'அறிக்கைகளைப் பதிவேற்ற தொடரவும்', previous: 'முந்தையது: நேரத்தைத் தேர்ந்தெடு', next: 'அடுத்து: அறிக்கைகளைப் பதிவேற்று' },
  te: { title: 'మీకు ఏ సమస్య ఉంది?', subtitle: 'వర్తించే అన్నింటినీ ఎంచుకోండి లేదా మీ మాటల్లో చెప్పండి/టైప్ చేయండి.', fever: 'జ్వరం', headache: 'తలనొప్పి', stomach: 'కడుపు నొప్పి', cough: 'దగ్గు / జలుబు', bodypain: 'శరీర నొప్పి', symptomPlaceholder: 'లక్షణాలు లేదా వివరాలు టైప్ చేయండి (ఐచ్ఛికం)', answerPlaceholder: 'మీ సమాధానాన్ని చెప్పవచ్చు లేదా టైప్ చేయవచ్చు…', speakSymptoms: 'లక్షణాలను చెప్పండి', speakAnswer: 'సమాధానం చెప్పండి', change: 'సమస్యను మార్చండి', firstQuestion: 'ఈరోజు మీకు ఏ సమస్య ఉంది?', patientHas: 'నాకు {disease} ఉంది.', complete: 'ధన్యవాదాలు. {doctor} కోసం మీ క్లినికల్ వివరాలను సిద్ధం చేశాను. ఇప్పుడు పాత నివేదికలను అప్‌లోడ్ చేయండి లేదా అపాయింట్‌మెంట్ కొనసాగించండి.', proceed: 'నివేదికలు అప్‌లోడ్ చేయడానికి కొనసాగండి', previous: 'మునుపటి: సమయం ఎంచుకోండి', next: 'తర్వాత: నివేదికలు అప్‌లోడ్ చేయండి' },
  bn: { title: 'আপনার কী সমস্যা হচ্ছে?', subtitle: 'প্রযোজ্য সব নির্বাচন করুন, অথবা নিজের ভাষায় বলুন/লিখুন।', fever: 'জ্বর', headache: 'মাথাব্যথা', stomach: 'পেট ব্যথা', cough: 'কাশি / সর্দি', bodypain: 'শরীর ব্যথা', symptomPlaceholder: 'লক্ষণ বা বিস্তারিত লিখুন (ঐচ্ছিক)', answerPlaceholder: 'উত্তর বলতেও বা লিখতেও পারেন…', speakSymptoms: 'লক্ষণ বলুন', speakAnswer: 'উত্তর বলুন', change: 'সমস্যা পরিবর্তন করুন', firstQuestion: 'আজ আপনার কী সমস্যা হচ্ছে?', patientHas: 'আমার {disease} হয়েছে।', complete: 'ধন্যবাদ। {doctor}-এর জন্য আপনার ক্লিনিক্যাল তথ্য প্রস্তুত করেছি। এখন আগের রিপোর্ট আপলোড করুন বা অ্যাপয়েন্টমেন্ট চালিয়ে যান।', proceed: 'রিপোর্ট আপলোড করতে এগিয়ে যান', previous: 'আগের: সময় নির্বাচন', next: 'পরবর্তী: রিপোর্ট আপলোড' },
  mr: { title: 'तुम्हाला काय त्रास होत आहे?', subtitle: 'लागू असलेले सर्व पर्याय निवडा किंवा तुमच्या शब्दांत बोला/लिहा.', fever: 'ताप', headache: 'डोकेदुखी', stomach: 'पोटदुखी', cough: 'खोकला / सर्दी', bodypain: 'अंगदुखी', symptomPlaceholder: 'लक्षणे किंवा तपशील लिहा (ऐच्छिक)', answerPlaceholder: 'उत्तर बोलू किंवा लिहू शकता…', speakSymptoms: 'लक्षणे सांगा', speakAnswer: 'उत्तर सांगा', change: 'समस्या बदला', firstQuestion: 'आज तुम्हाला काय त्रास होत आहे?', patientHas: 'मला {disease} आहे.', complete: 'धन्यवाद. {doctor} साठी तुमची क्लिनिकल माहिती तयार केली आहे. आता जुने अहवाल अपलोड करा किंवा अपॉइंटमेंट पुढे सुरू ठेवा.', proceed: 'अहवाल अपलोड करण्यासाठी पुढे जा', previous: 'मागील: वेळ निवडा', next: 'पुढील: अहवाल अपलोड करा' },
  gu: { title: 'તમને શું તકલીફ છે?', subtitle: 'લાગુ પડતા બધા વિકલ્પ પસંદ કરો અથવા તમારા શબ્દોમાં બોલો/લખો.', fever: 'તાવ', headache: 'માથાનો દુખાવો', stomach: 'પેટનો દુખાવો', cough: 'ઉધરસ / શરદી', bodypain: 'શરીરનો દુખાવો', symptomPlaceholder: 'લક્ષણો અથવા વિગતો લખો (વૈકલ્પિક)', answerPlaceholder: 'જવાબ બોલી અથવા લખી પણ શકો છો…', speakSymptoms: 'લક્ષણો બોલો', speakAnswer: 'જવાબ બોલો', change: 'સમस्या બદલો', firstQuestion: 'આજે તમને શું તકલીફ છે?', patientHas: 'મને {disease} છે.', complete: 'આભાર. {doctor} માટે તમારી ક્લિનિકલ માહિતી તૈયાર કરી છે. હવે જૂના રિપોર્ટ અપલોડ કરો અથવા અપોઇન્ટમેન્ટ ચાલુ રાખો.', proceed: 'રિપોર્ટ અપલોડ કરવા આગળ વધો', previous: 'પાછળ: સમય પસંદ કરો', next: 'આગળ: રિપોર્ટ અપલોડ કરો' },
  kn: { title: 'ನಿಮಗೆ ಯಾವ ಸಮಸ್ಯೆ ಇದೆ?', subtitle: 'ಅನ್ವಯಿಸುವ ಎಲ್ಲವನ್ನೂ ಆಯ್ಕೆ ಮಾಡಿ ಅಥವಾ ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಹೇಳಿ/ಟೈಪ್ ಮಾಡಿ.', fever: 'ಜ್ವರ', headache: 'ತಲೆನೋವು', stomach: 'ಹೊಟ್ಟೆ ನೋವು', cough: 'ಕೆಮ್ಮು / ಶೀತ', bodypain: 'ದೇಹ ನೋವು', symptomPlaceholder: 'ಲಕ್ಷಣಗಳು ಅಥವಾ ವಿವರಗಳನ್ನು ಟೈಪ್ ಮಾಡಿ (ಐಚ್ಛಿಕ)', answerPlaceholder: 'ಉತ್ತರವನ್ನು ಹೇಳಬಹುದು ಅಥವಾ ಟೈಪ್ ಮಾಡಬಹುದು…', speakSymptoms: 'ಲಕ್ಷಣಗಳನ್ನು ಹೇಳಿ', speakAnswer: 'ಉತ್ತರ ಹೇಳಿ', change: 'ಸಮಸ್ಯೆ ಬದಲಿಸಿ', firstQuestion: 'ಇಂದು ನಿಮಗೆ ಯಾವ ಸಮಸ್ಯೆ ಇದೆ?', patientHas: 'ನನಗೆ {disease} ಇದೆ.', complete: 'ಧನ್ಯವಾದಗಳು. {doctor} ಗಾಗಿ ನಿಮ್ಮ ಕ್ಲಿನಿಕಲ್ ವಿವರಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಈಗ ಹಳೆಯ ವರದಿಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಅಥವಾ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಮುಂದುವರಿಸಿ.', proceed: 'ವರದಿಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಮುಂದುವರಿಸಿ', previous: 'ಹಿಂದೆ: ಸಮಯ ಆಯ್ಕೆ', next: 'ಮುಂದೆ: ವರದಿ ಅಪ್‌ಲೋಡ್' },
  ml: { title: 'നിങ്ങൾക്ക് എന്ത് പ്രശ്നമാണ്?', subtitle: 'ബാധകമായ എല്ലാം തിരഞ്ഞെടുക്കുക, അല്ലെങ്കിൽ സ്വന്തം വാക്കുകളിൽ പറയുക/ടൈപ്പ് ചെയ്യുക.', fever: 'പനി', headache: 'തലവേദന', stomach: 'വയറുവേദന', cough: 'ചുമ / ജലദോഷം', bodypain: 'ശരീരവേദന', symptomPlaceholder: 'ലക്ഷണങ്ങളോ വിവരങ്ങളോ ടൈപ്പ് ചെയ്യുക (ഐച്ഛികം)', answerPlaceholder: 'ഉത്തരം പറയുകയോ ടൈപ്പ് ചെയ്യുകയോ ചെയ്യാം…', speakSymptoms: 'ലക്ഷണങ്ങൾ പറയുക', speakAnswer: 'ഉത്തരം പറയുക', change: 'പ്രശ്നം മാറ്റുക', firstQuestion: 'ഇന്ന് നിങ്ങൾക്ക് എന്ത് പ്രശ്നമാണ്?', patientHas: 'എനിക്ക് {disease} ഉണ്ട്.', complete: 'നന്ദി. {doctor} നുള്ള ക്ലിനിക്കൽ വിവരങ്ങൾ തയ്യാറാക്കി. ഇനി പഴയ റിപ്പോർട്ടുകൾ അപ്‌ലോഡ് ചെയ്യുകയോ അപ്പോയിന്റ്മെന്റ് തുടരുകയോ ചെയ്യാം.', proceed: 'റിപ്പോർട്ടുകൾ അപ്‌ലോഡ് ചെയ്യാൻ തുടരുക', previous: 'മുമ്പ്: സമയം തിരഞ്ഞെടുക്കുക', next: 'അടുത്തത്: റിപ്പോർട്ട് അപ്‌ലോഡ്' }
};

const SESSION_COPY = {
  en: 'Your answers are saved. Preparing the next question…',
  hi: 'आपके उत्तर सुरक्षित हैं। अगला प्रश्न तैयार हो रहा है…',
  ta: 'உங்கள் பதில்கள் சேமிக்கப்பட்டுள்ளன. அடுத்த கேள்வி தயாராகிறது…',
  te: 'మీ సమాధానాలు సేవ్ అయ్యాయి. తదుపరి ప్రశ్న సిద్ధమవుతోంది…',
  bn: 'আপনার উত্তর সংরক্ষিত আছে। পরের প্রশ্ন তৈরি হচ্ছে…',
  mr: 'तुमची उत्तरे जतन केली आहेत. पुढचा प्रश्न तयार होत आहे…',
  gu: 'તમારા જવાબો સાચવ્યા છે. આગળનો પ્રશ્ન તૈયાર થઈ રહ્યો છે…',
  kn: 'ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ಉಳಿಸಲಾಗಿದೆ. ಮುಂದಿನ ಪ್ರಶ್ನೆ ಸಿದ್ಧವಾಗುತ್ತಿದೆ…',
  ml: 'നിങ്ങളുടെ ഉത്തരങ്ങൾ സൂക്ഷിച്ചിട്ടുണ്ട്. അടുത്ത ചോദ്യം തയ്യാറാകുന്നു…',
};

const DEFAULT_STARTER_OPTIONS = [
  { id: 'fever', iconType: 'thermometer' },
  { id: 'headache', iconType: 'headache' },
  { id: 'stomach', iconType: 'stomach' },
  { id: 'cough', iconType: 'cough' },
  { id: 'bodypain', iconType: 'bodypain' }
];

export default function ClinicalAnamnesisChat({
  active = true,
  doctor = {},
  hospital = {},
  patient = {},
  initialSymptoms = [],
  initialNotes = '',
  initialSession = null,
  onUpdateCaseDetails = () => { },
  onPrevious = () => { },
  onNext = () => { },
  language = 'en'
}) {
  const { voiceSessionActive: isListening, toggleListening, setOnTranscript } = useVoiceNav();
  const languageCode = CHAT_COPY[language] ? language : 'en';
  const c = CHAT_COPY[languageCode];

  const isAyurvedic = isAyurvedicClinician(doctor, hospital);

  const [selectedCards, setSelectedCards] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [multiSelections, setMultiSelections] = useState([]);
  const chatBottomRef = useRef(null);
  const { state, begin, answer, reset } = useClinicalInterview({
    active, doctor, patient, isAyurvedic, initialSymptoms, initialNotes, initialSession,
    language: languageCode, onUpdateCaseDetails, setOnTranscript
  });
  const chatStarted = state.started;
  const isTyping = state.busy || state.recovering || state.translating;
  const messages = state.messages;
  const startConsultationChat = (symptoms, notes = '') => { setInputVal(''); return begin(symptoms, notes); };
  const handleUserChoice = async text => {
    if (state.busy || state.translating || !state.step) return false;
    setInputVal(''); setMultiSelections([]);
    return answer(text);
  };
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isTyping]);
  useEffect(() => { setMultiSelections([]); }, [state.step?.id]);

  const getIconFromType = (iconType) => {
    switch (iconType) {
      case 'target': return TargetIcon;
      case 'chest': return ChestRadiateIcon;
      case 'back': return BackSpineIcon;
      case 'shoulder': return ShoulderJointIcon;
      case 'clock': return ClockIcon;
      case 'flame': return FlameIcon;
      case 'pill': return PillIcon;
      case 'moon': return MoonIcon;
      case 'wind': return WindIcon;
      case 'thermometer': return ThermometerIcon;
      case 'stomach': return StomachIcon;
      case 'headache': return HeadacheIcon;
      case 'cough': return CoughIcon;
      case 'bodypain': return BodyPainIcon;
      case 'leaf': return Leaf;
      default: return QuestionPersonIcon;
    }
  };

  const baseStarterOptions = (state.starter?.options && state.starter.options.length > 0)
    ? state.starter.options
    : DEFAULT_STARTER_OPTIONS.map(item => ({
        id: item.id,
        text: c[item.id] || item.id,
        iconType: item.iconType
      }));

  const starterOptions = baseStarterOptions.map(option => ({
    ...option,
    icon: getIconFromType(option.iconType)
  }));
  const starterQuestion = state.starter?.question || c.title;
  const currentStepData = state.step ? { step: { ...state.step, options: (state.step.options || []).map(option => ({ ...option, icon: getIconFromType(option.iconType) })) } } : null;
  const complete = state.finished && !state.urgentReferral;

  if (!active) return null;

  return (
    <div data-clinical-chat data-voice-context={state.step?.question || starterQuestion} data-no-translate translate="no" style={{ width: '100%' }}>
      {state.recovering && (
        <div role="status" style={{ padding: '12px 16px', marginBottom: '1rem', background: '#f0fdf4', borderRadius: '12px', color: '#166534' }}>{SESSION_COPY[languageCode]}</div>
      )}
      {/* ─────────────────────────────────────────────────────────────────
          INITIAL SCREEN: 5 CARDS IN A ROW + FULL-WIDTH INPUT BAR
          ───────────────────────────────────────────────────────────────── */}
      {!chatStarted ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main Card Container */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #eef2f6',
            padding: '2.5rem 2.25rem 2.25rem 2.25rem',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.3px'
            }}>
              {starterQuestion}
            </h2>
            <p style={{ margin: '0 0 2.25rem 0', fontSize: '0.925rem', color: '#64748b', fontWeight: '500' }}>
              {c.subtitle}
            </p>

            {/* AI-tailored complaint suggestions; typing is always available. */}
            {state.busy && !starterOptions.length && <div role="status" aria-busy="true" style={{ padding: '1rem', color: '#059669' }}>•••</div>}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: '1.25rem'
            }}>
              {starterOptions.map((prob, index) => {
                const IconComponent = prob.icon || QuestionPersonIcon;
                const problemLabel = prob.text || c[prob.id];
                const isSelected = selectedCards.includes(problemLabel);

                return (
                  <button
                    key={prob.id || `${problemLabel}-${index}`}
                    type="button"
                    data-voice-option
                    data-voice-option-index={index + 1}
                    disabled={state.translating}
                    aria-label={problemLabel}
                    onClick={() => {
                      const updated = [problemLabel];
                      setSelectedCards(updated);
                      startConsultationChat(updated);
                    }}
                    style={{
                      backgroundColor: isSelected ? '#f0fdf9' : '#ffffff',
                      border: isSelected ? '1.5px solid #059669' : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '2.25rem 1rem 1.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected
                        ? '0 6px 18px rgba(5, 150, 105, 0.12)'
                        : '0 1px 4px rgba(0,0,0,0.01)',
                      transform: isSelected ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#059669';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(5, 150, 105, 0.08)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.01)';
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconComponent size={52} color="#059669" />
                    </div>

                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      color: isSelected ? '#065f46' : '#0f172a',
                      letterSpacing: '-0.2px'
                    }}>
                      {problemLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full-width Custom Input bar at bottom matching screenshot */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputVal.trim() || selectedCards.length) {
                startConsultationChat(selectedCards, inputVal.trim());
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              padding: '14px 20px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease'
            }}
          >
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder={c.symptomPlaceholder}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '0.95rem',
                color: '#0f172a',
                padding: '0',
                backgroundColor: 'transparent'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Voice Mic Button */}
              <button
                type="button"
                onClick={() => toggleListening()}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isListening ? '#ef4444' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title={c.speakSymptoms}
                aria-label={c.speakSymptoms}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!inputVal.trim() && selectedCards.length === 0) || state.translating}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: (inputVal.trim() || selectedCards.length > 0) ? 'pointer' : 'default',
                  color: (inputVal.trim() || selectedCards.length > 0) ? '#059669' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  transition: 'color 0.2s ease'
                }}
              >
                <Send size={22} color={inputVal.trim() ? '#059669' : '#10b981'} />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────
           INTERACTIVE AI CHAT VIEW (MATCHING USER SCREENSHOT 2)
           ───────────────────────────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Chat Container Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #eef2f6',
            padding: '2.5rem 2.25rem 2rem 2.25rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            minHeight: '480px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header reset button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedCards([]); setMultiSelections([]); setInputVal(''); reset();
                }}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={13} />
                <span>{c.change}</span>
              </button>
            </div>

            {/* Chat Messages Feed */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              flex: 1
            }}>
              {messages.map((m, idx) => {
                const isAi = m.sender === 'ai';

                if (isAi) {
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      {/* Cute Green AI Robot Avatar */}
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#e6f7ee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #bbf7d0'
                      }}>
                        <Bot size={22} color="#059669" />
                      </div>

                      {/* AI Chat Bubble */}
                      <div style={{
                        backgroundColor: '#eaf7ee',
                        color: '#1e293b',
                        padding: '16px 22px',
                        borderRadius: '18px',
                        fontSize: '1.025rem',
                        lineHeight: '1.5',
                        maxWidth: '82%',
                        whiteSpace: 'pre-line',
                        fontWeight: '500'
                      }}>
                        {m.text}
                      </div>
                    </div>
                  );
                }

                // User Bubble (Light Soft Blue on the right)
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '14px' }}>
                    {/* User Chat Bubble */}
                    <div style={{
                      backgroundColor: '#e0edff',
                      color: '#1e293b',
                      padding: '16px 22px',
                      borderRadius: '18px',
                      fontSize: '1.025rem',
                      lineHeight: '1.5',
                      maxWidth: '82%',
                      fontWeight: '500'
                    }}>
                      {m.text}
                    </div>

                    {/* Blue User Avatar */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#ffffff'
                    }}>
                      <User size={20} />
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e6f7ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #bbf7d0'
                  }}>
                    <Bot size={22} color="#059669" />
                  </div>
                  <div style={{
                    backgroundColor: '#eaf7ee',
                    padding: '14px 20px',
                    borderRadius: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669', animation: 'pulse 1s infinite' }} />
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669', animation: 'pulse 1s infinite 0.2s' }} />
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669', animation: 'pulse 1s infinite 0.4s' }} />
                  </div>
                </div>
              )}

              {/* The AI selects both the response control and a clinically useful option count. */}
              {!isTyping && currentStepData && currentStepData.step && currentStepData.step.options?.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${currentStepData.step.options.length <= 3 ? '210px' : '160px'}), 1fr))`,
                  gap: '1.15rem',
                  marginTop: '0.75rem'
                }}>
                  {currentStepData.step.options.map((opt, oIdx) => {
                    const IconComp = opt.icon || TargetIcon;
                    const isMultiple = currentStepData.step.responseType === 'multiple_choice';
                    const isSelected = multiSelections.includes(opt.id);

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        data-voice-option
                        data-voice-option-index={oIdx + 1}
                        aria-label={opt.text}
                        aria-pressed={isMultiple ? isSelected : undefined}
                        onClick={() => {
                          if (!isMultiple) {
                            handleUserChoice(opt.text);
                            return;
                          }
                          setMultiSelections(current => current.includes(opt.id)
                            ? current.filter(value => value !== opt.id)
                            : [...current, opt.id]);
                        }}
                        style={{
                          backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                          border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '1.75rem 0.85rem 1.4rem 0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#059669';
                          e.currentTarget.style.backgroundColor = '#f0fdf9';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(5, 150, 105, 0.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <IconComp size={44} color="#059669" />
                        </div>

                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          color: '#1e293b',
                          textAlign: 'center',
                          lineHeight: '1.3'
                        }}>
                          {opt.text}
                        </div>
                      </button>
                    );
                  })}
                  {currentStepData.step.responseType === 'multiple_choice' && (
                    <button
                      type="button"
                      disabled={!multiSelections.length}
                      onClick={() => handleUserChoice(currentStepData.step.options.filter(option => multiSelections.includes(option.id)).map(option => option.text).join(', '))}
                      style={{
                        gridColumn: '1 / -1', justifySelf: 'center', border: 'none', borderRadius: '12px',
                        padding: '12px 28px', fontWeight: '800', color: '#fff',
                        background: multiSelections.length ? '#059669' : '#94a3b8',
                        cursor: multiSelections.length ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {(c.next || 'Continue').split(':')[0]} ({multiSelections.length})
                    </button>
                  )}
                </div>
              )}

              {/* Proceed Action Pill when completed */}
              {!isTyping && complete && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => onNext?.()}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '14px 32px',
                      fontSize: '1rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 6px 20px rgba(12, 78, 71, 0.25)'
                    }}
                  >
                    <span>{c.proceed}</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          </div>

          {/* Full-width Sleek Input bar at bottom matching screenshot */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputVal.trim()) {
                handleUserChoice(inputVal.trim());
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              padding: '14px 20px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder={c.answerPlaceholder}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '0.95rem',
                color: '#0f172a',
                padding: '0',
                backgroundColor: 'transparent'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => toggleListening()}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isListening ? '#ef4444' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title={c.speakAnswer}
                aria-label={c.speakAnswer}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                type="submit"
                disabled={!inputVal.trim() || isTyping || !currentStepData}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: inputVal.trim() ? 'pointer' : 'default',
                  color: inputVal.trim() ? '#059669' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <Send size={22} color={inputVal.trim() ? '#059669' : '#cbd5e1'} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── BOTTOM NAVIGATION ROW ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid #f1f5f9',
        paddingTop: '1.5rem',
        marginTop: '1.75rem'
      }}>
        <button
          type="button"
          onClick={() => onPrevious?.()}
          data-voice-action="back"
          style={{
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '10px 20px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
        >
          <ArrowLeft size={16} />
          <span>{c.previous}</span>
        </button>

        <button
          type="button"
          onClick={() => onNext?.()}
          data-voice-action="next"
          disabled={!complete}
          style={{
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 28px',
            fontSize: '0.95rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 14px rgba(12, 78, 71, 0.25)',
            transition: 'all 0.25s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(12, 78, 71, 0.35)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(12, 78, 71, 0.25)';
          }}
        >
          <span>{c.next}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
