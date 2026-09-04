import { UI_STRINGS } from '../voicenav/LanguagePack.jsx';
import voiceAIService from '../voicenav/VoiceAIService.js';
import { MULTI_DICT } from './AiTranslationService.js';
import { DASHBOARD_I18N } from '../constants/dashboardI18n.js';

const OFFLINE_UI_TRANSLATIONS = {
  hi: {
    'Patient': 'मरीज़', 'patient': 'मरीज़', 'Patients': 'मरीज़', 'Avg Time Saved per patient': 'प्रति मरीज़ औसत समय की बचत', 'Regional Languages Supported': 'समर्थित क्षेत्रीय भाषाएँ', 'Patients Triaged Successfully': 'मरीज़ों की सफल जाँच', 'Intelligent Triage': 'बुद्धिमान प्राथमिक जाँच', 'Enter Portal': 'पोर्टल खोलें',
    'Self-service kiosk for patients to provide their history in their native language before seeing the doctor.': 'डॉक्टर से मिलने से पहले मरीज अपनी भाषा में स्वास्थ्य इतिहास दर्ज कर सकते हैं।', 'Secure dashboard to review AI-generated clinical summaries and manage patient records efficiently.': 'एआई क्लिनिकल सारांश देखने और मरीज रिकॉर्ड संभालने के लिए सुरक्षित डैशबोर्ड।', 'Centralized hub for managing patient registrations, system settings, and hospital staff accounts.': 'मरीज पंजीकरण, सिस्टम सेटिंग और अस्पताल कर्मचारियों के खातों के लिए केंद्रीकृत केंद्र।', 'Terms of Service': 'सेवा की शर्तें', 'Privacy Policy': 'गोपनीयता नीति', 'All rights reserved.': 'सर्वाधिकार सुरक्षित।'
  },
  ta: {
    'Patient': 'நோயாளி', 'patient': 'நோயாளி', 'Patients': 'நோயாளிகள்', 'Avg Time Saved per patient': 'ஒரு நோயாளிக்கு சேமிக்கப்படும் சராசரி நேரம்', 'Regional Languages Supported': 'ஆதரிக்கப்படும் பிராந்திய மொழிகள்', 'Patients Triaged Successfully': 'வெற்றிகரமாக பரிசோதிக்கப்பட்ட நோயாளிகள்', 'Intelligent Triage': 'நுண்ணறிவு முதல்நிலை பரிசோதனை', 'Enter Portal': 'தளத்தைத் திறக்கவும்', 'Self-service kiosk for patients to provide their history in their native language before seeing the doctor.': 'மருத்துவரைச் சந்திக்கும் முன் நோயாளிகள் தங்கள் மொழியில் மருத்துவ வரலாற்றைப் பதிவு செய்யலாம்.', 'Secure dashboard to review AI-generated clinical summaries and manage patient records efficiently.': 'AI மருத்துவச் சுருக்கங்களையும் நோயாளர் பதிவுகளையும் நிர்வகிக்கும் பாதுகாப்பான தளம்.', 'Centralized hub for managing patient registrations, system settings, and hospital staff accounts.': 'நோயாளர் பதிவு, அமைப்புகள் மற்றும் மருத்துவமனை பணியாளர் கணக்குகளுக்கான மையம்.', 'Terms of Service': 'சேவை விதிமுறைகள்', 'Privacy Policy': 'தனியுரிமைக் கொள்கை', 'All rights reserved.': 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.'
  },
  te: {
    'Patient': 'రోగి', 'patient': 'రోగి', 'Patients': 'రోగులు', 'Avg Time Saved per patient': 'ఒక్కో రోగికి ఆదా అయ్యే సగటు సమయం', 'Regional Languages Supported': 'మద్దతు ఉన్న ప్రాంతీయ భాషలు', 'Patients Triaged Successfully': 'విజయవంతంగా పరీక్షించిన రోగులు', 'Intelligent Triage': 'తెలివైన ప్రాథమిక పరీక్ష', 'Enter Portal': 'పోర్టల్ తెరవండి', 'Self-service kiosk for patients to provide their history in their native language before seeing the doctor.': 'డాక్టర్‌ను కలిసే ముందు రోగులు తమ భాషలో ఆరోగ్య చరిత్రను నమోదు చేయవచ్చు.', 'Secure dashboard to review AI-generated clinical summaries and manage patient records efficiently.': 'AI క్లినికల్ సారాంశాలు మరియు రోగి రికార్డుల కోసం సురక్షిత డాష్‌బోర్డ్.', 'Centralized hub for managing patient registrations, system settings, and hospital staff accounts.': 'రోగి నమోదులు, సిస్టమ్ సెట్టింగులు మరియు సిబ్బంది ఖాతాల కేంద్రం.', 'Terms of Service': 'సేవా నిబంధనలు', 'Privacy Policy': 'గోప్యతా విధానం', 'All rights reserved.': 'అన్ని హక్కులు పరిరక్షించబడ్డాయి.'
  },
  bn: {
    'Patient': 'রোগী', 'patient': 'রোগী', 'Patients': 'রোগীরা', 'Avg Time Saved per patient': 'প্রতি রোগীর গড় সময় সাশ্রয়', 'Regional Languages Supported': 'সমর্থিত আঞ্চলিক ভাষা', 'Patients Triaged Successfully': 'সফলভাবে যাচাই করা রোগী', 'Intelligent Triage': 'বুদ্ধিমান প্রাথমিক যাচাই', 'Enter Portal': 'পোর্টাল খুলুন', 'Self-service kiosk for patients to provide their history in their native language before seeing the doctor.': 'ডাক্তারের সঙ্গে দেখা করার আগে রোগীরা নিজের ভাষায় স্বাস্থ্য ইতিহাস লিখতে পারেন।', 'Secure dashboard to review AI-generated clinical summaries and manage patient records efficiently.': 'AI ক্লিনিক্যাল সারাংশ ও রোগীর রেকর্ড পরিচালনার নিরাপদ ড্যাশবোর্ড।', 'Centralized hub for managing patient registrations, system settings, and hospital staff accounts.': 'রোগী নিবন্ধন, সিস্টেম সেটিংস ও হাসপাতাল কর্মীদের অ্যাকাউন্টের কেন্দ্রীয় কেন্দ্র।', 'Terms of Service': 'পরিষেবার শর্তাবলি', 'Privacy Policy': 'গোপনীয়তা নীতি', 'All rights reserved.': 'সর্বস্বত্ব সংরক্ষিত।'
  },
  mr: {
    'Patient': 'रुग्ण', 'patient': 'रुग्ण', 'Patients': 'रुग्ण', 'Avg Time Saved per patient': 'प्रति रुग्ण सरासरी वेळेची बचत', 'Regional Languages Supported': 'समर्थित प्रादेशिक भाषा', 'Patients Triaged Successfully': 'यशस्वी तपासणी झालेले रुग्ण', 'Intelligent Triage': 'बुद्धिमान प्राथमिक तपासणी', 'Enter Portal': 'पोर्टल उघडा', 'Self-service kiosk for patients to provide their history in their native language before seeing the doctor.': 'डॉक्टरांना भेटण्यापूर्वी रुग्ण त्यांच्या भाषेत आरोग्य इतिहास नोंदवू शकतात.', 'Secure dashboard to review AI-generated clinical summaries and manage patient records efficiently.': 'AI क्लिनिकल सारांश आणि रुग्ण नोंदींसाठी सुरक्षित डॅशबोर्ड.', 'Centralized hub for managing patient registrations, system settings, and hospital staff accounts.': 'रुग्ण नोंदणी, सिस्टम सेटिंग्ज आणि कर्मचारी खात्यांचे केंद्रीय केंद्र.', 'Terms of Service': 'सेवा अटी', 'Privacy Policy': 'गोपनीयता धोरण', 'All rights reserved.': 'सर्व हक्क राखीव.'
  },
  gu: {
    'Patient': 'દર્દી', 'patient': 'દર્દી', 'Patients': 'દર્દીઓ', 'Avg Time Saved per patient': 'દર દર્દી દીઠ બચેલો સરેરાશ સમય', 'Regional Languages Supported': 'સમર્થિત પ્રાદેશિક ભાષાઓ', 'Patients Triaged Successfully': 'સફળતાપૂર્વક તપાસાયેલા દર્દીઓ', 'Intelligent Triage': 'બુદ્ધિશાળી પ્રાથમિક તપાસ', 'Enter Portal': 'પોર્ટલ ખોલો', 'Self-service kiosk for patients to provide their history in their native language before seeing the doctor.': 'ડૉક્ટરને મળતા પહેલાં દર્દીઓ પોતાની ભાષામાં આરોગ્ય ઇતિહાસ નોંધાવી શકે છે.', 'Secure dashboard to review AI-generated clinical summaries and manage patient records efficiently.': 'AI ક્લિનિકલ સારાંશ અને દર્દીના રેકોર્ડ માટે સુરક્ષિત ડેશબોર્ડ.', 'Centralized hub for managing patient registrations, system settings, and hospital staff accounts.': 'દર્દી નોંધણી, સિસ્ટમ સેટિંગ અને સ્ટાફ ખાતાઓનું કેન્દ્ર.', 'Terms of Service': 'સેવાની શરતો', 'Privacy Policy': 'ગોપનીયતા નીતિ', 'All rights reserved.': 'બધા હકો સુરક્ષિત.'
  },
  kn: {
    'Patient': 'ರೋಗಿ', 'patient': 'ರೋಗಿ', 'Patients': 'ರೋಗಿಗಳು', 'Avg Time Saved per patient': 'ಪ್ರತಿ ರೋಗಿಗೆ ಉಳಿಯುವ ಸರಾಸರಿ ಸಮಯ', 'Regional Languages Supported': 'ಬೆಂಬಲಿತ ಪ್ರಾದೇಶಿಕ ಭಾಷೆಗಳು', 'Patients Triaged Successfully': 'ಯಶಸ್ವಿಯಾಗಿ ತಪಾಸಣೆಗೊಂಡ ರೋಗಿಗಳು', 'Intelligent Triage': 'ಬುದ್ಧಿವಂತ ಪ್ರಾಥಮಿಕ ತಪಾಸಣೆ', 'Enter Portal': 'ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ', 'Self-service kiosk for patients to provide their history in their native language before seeing the doctor.': 'ವೈದ್ಯರನ್ನು ಭೇಟಿಯಾಗುವ ಮೊದಲು ರೋಗಿಗಳು ತಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಆರೋಗ್ಯ ಇತಿಹಾಸ ದಾಖಲಿಸಬಹುದು.', 'Secure dashboard to review AI-generated clinical summaries and manage patient records efficiently.': 'AI ಕ್ಲಿನಿಕಲ್ ಸಾರಾಂಶ ಮತ್ತು ರೋಗಿ ದಾಖಲೆಗಳ ಸುರಕ್ಷಿತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್.', 'Centralized hub for managing patient registrations, system settings, and hospital staff accounts.': 'ರೋಗಿ ನೋಂದಣಿ, ಸಿಸ್ಟಂ ಸೆಟ್ಟಿಂಗ್ ಮತ್ತು ಸಿಬ್ಬಂದಿ ಖಾತೆಗಳ ಕೇಂದ್ರ.', 'Terms of Service': 'ಸೇವಾ ನಿಯಮಗಳು', 'Privacy Policy': 'ಗೌಪ್ಯತಾ ನೀತಿ', 'All rights reserved.': 'ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.'
  },
  ml: {
    'Patient': 'രോഗി', 'patient': 'രോഗി', 'Patients': 'രോഗികൾ', 'Avg Time Saved per patient': 'ഓരോ രോഗിക്കും ലാഭിക്കുന്ന ശരാശരി സമയം', 'Regional Languages Supported': 'പിന്തുണയ്ക്കുന്ന പ്രാദേശിക ഭാഷകൾ', 'Patients Triaged Successfully': 'വിജയകരമായി പരിശോധിച്ച രോഗികൾ', 'Intelligent Triage': 'ബുദ്ധിപരമായ പ്രാഥമിക പരിശോധന', 'Enter Portal': 'പോർട്ടൽ തുറക്കുക', 'Self-service kiosk for patients to provide their history in their native language before seeing the doctor.': 'ഡോക്ടറെ കാണുന്നതിന് മുമ്പ് രോഗികൾക്ക് സ്വന്തം ഭാഷയിൽ ആരോഗ്യ ചരിത്രം രേഖപ്പെടുത്താം.', 'Secure dashboard to review AI-generated clinical summaries and manage patient records efficiently.': 'AI ക്ലിനിക്കൽ സംഗ്രഹങ്ങളും രോഗി രേഖകളും കൈകാര്യം ചെയ്യാനുള്ള സുരക്ഷിത ഡാഷ്ബോർഡ്.', 'Centralized hub for managing patient registrations, system settings, and hospital staff accounts.': 'രോഗി രജിസ്ട്രേഷൻ, സിസ്റ്റം ക്രമീകരണം, ജീവനക്കാരുടെ അക്കൗണ്ടുകൾ എന്നിവയുടെ കേന്ദ്രം.', 'Terms of Service': 'സേവന നിബന്ധനകൾ', 'Privacy Policy': 'സ്വകാര്യതാ നയം', 'All rights reserved.': 'എല്ലാ അവകാശങ്ങളും സംരക്ഷിതം.'
  }
};

// Common UI and appointment slot terms across all 9 languages
const COMMON_ADDITIONAL_TRANSLATIONS = {
  'avg time saved per patient': {
    hi: 'प्रति मरीज़ औसत समय की बचत', ta: 'ஒரு நோயாளிக்கு சேமிக்கப்படும் சராசரி நேரம்', te: 'ఒక్కో రోగికి ఆదా అయ్యే సగటు సమయం', bn: 'প্রতি রোগীর গড় সময় সাশ্রয়', mr: 'प्रति रुग्ण सरासरी वेळेची बचत', gu: 'દર દર્દી દીઠ બચેલો સરેરાશ સમય', kn: 'ಪ್ರತಿ ರೋಗಿಗೆ ಉಳಿಯುವ ಸರಾಸರಿ ಸಮಯ', ml: 'ഓരോ രോഗിക്കും ലാഭിക്കുന്ന ശരാശരി സമയം'
  },
  'regional languages supported': {
    hi: 'समर्थित क्षेत्रीय भाषाएँ', ta: 'ஆதரிக்கப்படும் பிராந்திய மொழிகள்', te: 'మద్దతు ఉన్న ప్రాంతీయ భాషలు', bn: 'সমর্থিত আঞ্চলিক ভাষা', mr: 'समर्थित प्रादेशिक भाषा', gu: 'સમર્થિત પ્રાદેશિક ભાષાઓ', kn: 'ಬೆಂಬಲಿತ ಪ್ರಾದೇಶಿಕ ಭಾಷೆಗಳು', ml: 'പിന്തുണയ്ക്കുന്ന പ്രാദേശിക ഭാഷകൾ'
  },
  'patients triaged successfully': {
    hi: 'मरीज़ों की सफल प्राथमिक जाँच', ta: 'வெற்றிகரமாக பரிசோதிக்கப்பட்ட நோயாளிகள்', te: 'విజయవంతంగా పరీక్షించిన రోగులు', bn: 'সফলভাবে যাচাই করা রোগী', mr: 'यशस्वी तपासणी झालेले रुग्ण', gu: 'સફળતાપૂર્વક તપાસાયેલા દર્દીઓ', kn: 'ಯಶಸ್ವಿಯಾಗಿ ತಪಾಸಣೆಗೊಂಡ ರೋಗಿಗಳು', ml: 'വിജയകരമായി പരിശോധിച്ച രോഗികൾ'
  },
  'intelligent triage': {
    hi: 'बुद्धिमान प्राथमिक जाँच', ta: 'நுண்ணறிவு முதல்நிலை பரிசோதனை', te: 'తెలివైన ప్రాథమిక పరీక్ష', bn: 'বুদ্ধিমান প্রাথমিক যাচাই', mr: 'बुद्धिमान प्राथमिक तपासणी', gu: 'બુદ્ધિશાળી પ્રાથમિક તપાસ', kn: 'ಬುದ್ಧಿವಂತ ಪ್ರಾಥಮಿಕ ತಪಾಸಣೆ', ml: 'ബുദ്ധിപരമായ പ്രാഥമിക പരിശോധന'
  },
  'enter portal': {
    hi: 'पोर्टल खोलें', ta: 'தளத்தைத் திறக்கவும்', te: 'పోర్టల్ తెరవండి', bn: 'পোর্টাল খুলুন', mr: 'पोर्टल उघडा', gu: 'પોર્ટલ ખોલો', kn: 'ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ', ml: 'പോർട്ടൽ തുറക്കുക'
  },
  'morning slots': {
    hi: 'सुबह के स्लॉट', ta: 'காலை நேரங்கள்', te: 'ఉదయం స్లాట్‌లు', bn: 'সকালের স্লট', mr: 'सकाळचे स्लॉट', gu: 'સવારના સ્લોટ', kn: 'ಬೆಳಗಿನ ಸ್ಲಾಟ್‌ಗಳು', ml: 'രാവിലെ സ്ലോട്ടുകൾ'
  },
  'afternoon slots': {
    hi: 'दोपहर के स्लॉट', ta: 'மதிய நேரங்கள்', te: 'మధ్యాహ్నం స్లాట్‌లు', bn: 'দুপুরের স্লট', mr: 'दुपारचे स्लॉट', gu: 'બપોરના સ્લોટ', kn: 'ಮಧ್ಯಾಹ್ನದ ಸ್ಲಾಟ್‌ಗಳು', ml: 'ഉച്ചതിരിഞ്ഞ് സ്ലോട്ടുകൾ'
  },
  'evening slots': {
    hi: 'शाम के स्लॉट', ta: 'மாலை நேரங்கள்', te: 'సాయంత్రం స్లాట్‌లు', bn: 'সন্ধ্যার স্লট', mr: 'संध्याकाळचे स्लॉट', gu: 'સાંજના સ્લોટ', kn: 'ಸಂಜೆಯ ಸ್ಲಾಟ್‌ಗಳು', ml: 'വൈകുന്നേരം സ്ലോട്ടുകൾ'
  },
  'slots available': {
    hi: 'स्लॉट उपलब्ध', ta: 'இடங்கள் உள்ளன', te: 'స్లాట్‌లు అందుబాటులో ఉన్నాయి', bn: 'স্লট উপলব্ধ', mr: 'स्लॉट उपलब्ध', gu: 'સ્લોટ ઉપલબ્ધ', kn: 'ಸ್ಲಾಟ್‌ಗಳು ಲಭ್ಯವಿದೆ', ml: 'സ്ലോട്ടുകൾ ലഭ്യമാണ്'
  },
  'slot left': {
    hi: 'स्लॉट बाकी', ta: 'இடம் உள்ளது', te: 'స్లాట్ మిగిలి ఉంది', bn: 'স্লট বাকি', mr: 'स्लॉट बाकी', gu: 'સ્લોટ બાકી', kn: 'ಸ್ಲಾಟ್ ಉಳಿದಿದೆ', ml: 'സ്ലോട്ട് ബാക്കി'
  },
  'slots left': {
    hi: 'स्लॉट बाकी', ta: 'இடங்கள் உள்ளன', te: 'స్లాట్లు మిగిలి ఉన్నాయి', bn: 'স্লট বাকি', mr: 'स्लॉट बाकी', gu: 'સ્લોટ બાકી', kn: 'ಸ್ಲಾಟ್‌ಗಳು ಉಳಿದಿವೆ', ml: 'സ്ലോട്ടുകൾ ബാക്കി'
  },
  'filling fast': {
    hi: 'तेजी से भर रहा', ta: 'விரைவாக நிரம்புகிறது', te: 'వేగంగా నిండుతోంది', bn: 'দ্রুত পূর্ণ হচ্ছে', mr: 'लवकर भरत आहे', gu: 'ઝડપથી ભરાઈ રહ્યું છે', kn: 'ವೇಗವಾಗಿ ಭರ್ತಿಯಾಗುತ್ತಿದೆ', ml: 'വേഗത്തിൽ നിറയുന്നു'
  },
  'fully booked': {
    hi: 'पूरी तरह बुक', ta: 'முழுமையாக முன்பதிவானது', te: 'పూర్తిగా బుక్ చేయబడింది', bn: 'সম্পূর্ণ বুকড', mr: 'पूर्ण भरलेले', gu: 'સંપૂર્ણ બુક', kn: 'ಸಂಪೂರ್ಣ ಭರ್ತಿಯಾಗಿದೆ', ml: 'പൂർണ്ണമായി ബുക്ക് ചെയ്‌തു'
  },
  'selected': {
    hi: 'चयनित', ta: 'தேர்ந்தெடுக்கப்பட்டது', te: 'ఎంపికైంది', bn: 'নির্বাচিত', mr: 'निवडलेले', gu: 'પસંદ કરેલ', kn: 'ಆಯ್ಕೆಯಾಗಿದೆ', ml: 'തിരഞ്ഞെടുത്തു'
  },
  'closed': {
    hi: 'बंद', ta: 'மூடப்பட்டது', te: 'మూసివేయబడింది', bn: 'বন্ধ', mr: 'बंद', gu: 'બંધ', kn: 'ಮುಚ್ಚಲಾಗಿದೆ', ml: 'അടച്ചു'
  },
  'available': {
    hi: 'उपलब्ध', ta: 'கிடைக்கிறது', te: 'అందుబాటులో ఉంది', bn: 'উপলব্ধ', mr: 'उपलब्ध', gu: 'ઉપલબ્ધ', kn: 'ಲಭ್ಯವಿದೆ', ml: 'ലഭ്യമാണ്'
  },
  'doctor attending current patient': {
    hi: 'डॉक्टर वर्तमान मरीज देख रहे हैं', ta: 'மருத்துவர் தற்போதைய நோயாளியை கவனிக்கிறார்', te: 'వైద్యులు ప్రస్తుత రోగిని పరిశీలిస్తున్నారు', bn: 'ডাক্তার বর্তমান রোগী দেখছেন', mr: 'डॉक्टर सध्याचे रुग्ण पाहत आहेत', gu: 'ડૉક્ટર હાલના દર્દીને તપાસી રહ્યા છે', kn: 'ವೈದ್ಯರು ಪ್ರಸ್ತುತ ರೋಗಿಯನ್ನು ಪರೀಕ್ಷಿಸುತ್ತಿದ್ದಾರೆ', ml: 'ഡോക്ടർ നിലവിലെ രോഗിയെ പരിശോധിക്കുന്നു'
  },
  'paused (high opd load)': {
    hi: 'रोका गया (उच्च ओपीडी भार)', ta: 'நிறுத்தப்பட்டது (அதிக OPD சுமை)', te: 'నిలిపివేయబడింది (అధిక OPD భారం)', bn: 'স্থগিত (উচ্চ ওপিডি চাপ)', mr: 'थांबवले (जास्त ओपीडी भार)', gu: 'સ્થગિત (ઉચ્ચ ઓપીડી લોડ)', kn: 'ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ (ಹೆಚ್ಚಿನ OPD ಹೊರೆ)', ml: 'താൽക്കാലികമായി നിർത്തി (ഉയർന്ന ഒപിഡി ഭാരം)'
  }
};

// Pre-compiled fast O(1) Map: normalized English string -> { [langCode]: translatedString }
const MASTER_MAP = new Map();
// Reverse map: normalized Indic string -> normalized English string
const REVERSE_INDIC_MAP = new Map();

function normalizeKey(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function addTranslation(enStr, langMap) {
  if (!enStr || typeof enStr !== 'string') return;
  const key = normalizeKey(enStr);
  if (!key) return;

  let entry = MASTER_MAP.get(key);
  if (!entry) {
    entry = { en: enStr.trim() };
    MASTER_MAP.set(key, entry);
  }

  for (const [lang, val] of Object.entries(langMap)) {
    if (val && typeof val === 'string' && val.trim()) {
      const cleanVal = val.trim();
      entry[lang] = cleanVal;
      if (lang !== 'en' && /[\u0900-\u0D7F]/.test(cleanVal)) {
        REVERSE_INDIC_MAP.set(normalizeKey(cleanVal), key);
      }
    }
  }
}

// 1. Populate from UI_STRINGS (all 9 languages)
if (UI_STRINGS && UI_STRINGS.en) {
  for (const [k, enVal] of Object.entries(UI_STRINGS.en)) {
    if (!enVal || typeof enVal !== 'string') continue;
    const trans = {};
    for (const lang of ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa', 'or']) {
      if (UI_STRINGS[lang]?.[k]) {
        trans[lang] = UI_STRINGS[lang][k];
      }
    }
    addTranslation(enVal, trans);
  }
}

// 2. Populate from DASHBOARD_I18N (all 9 languages)
if (DASHBOARD_I18N && DASHBOARD_I18N.en) {
  for (const [k, enVal] of Object.entries(DASHBOARD_I18N.en)) {
    if (!enVal || typeof enVal !== 'string') continue;
    const trans = {};
    for (const lang of ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa', 'or']) {
      if (DASHBOARD_I18N[lang]?.[k]) {
        trans[lang] = DASHBOARD_I18N[lang][k];
      }
    }
    addTranslation(enVal, trans);
  }
}

// 3. Populate from MULTI_DICT
if (MULTI_DICT) {
  for (const [rawKey, dict] of Object.entries(MULTI_DICT)) {
    if (!dict || typeof dict !== 'object') continue;
    const enVal = dict.en || rawKey;
    addTranslation(enVal, dict);
    addTranslation(rawKey, dict);
  }
}

// 4. Populate from OFFLINE_UI_TRANSLATIONS
for (const [lang, map] of Object.entries(OFFLINE_UI_TRANSLATIONS)) {
  for (const [enStr, transStr] of Object.entries(map)) {
    addTranslation(enStr, { [lang]: transStr });
  }
}

// 5. Populate from COMMON_ADDITIONAL_TRANSLATIONS
for (const [phrase, map] of Object.entries(COMMON_ADDITIONAL_TRANSLATIONS)) {
  addTranslation(phrase, map);
}

class DOMTranslator {
  constructor() {
    this.isActive = false;
    this.targetLang = 'en';
    this.observer = null;
    this.batch = new Map();
    this.batchTimeout = null;
    this.originalTexts = new WeakMap(); // Maps Node/Element -> original English string
    this.translationCache = new Map();  // Maps "lang:english_text" -> "translated_text"
    this.isTranslating = false;
  }

  start(langCode) {
    if (!langCode) return;
    const languageChanged = this.targetLang !== langCode;
    this.targetLang = langCode;

    if (languageChanged) {
      if (this.batchTimeout) clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
      this.batch.clear();
    }

    if (langCode === 'en') {
      this.stop();
      return;
    }

    if (!this.isActive) {
      this.isActive = true;
      this._initObserver();
    }

    // Immediately translate full DOM synchronously
    this._queueFullDOM();
  }

  triggerFullScan() {
    if (this.targetLang && this.targetLang !== 'en') {
      if (!this.isActive) {
        this.isActive = true;
        this._initObserver();
      }
      this._queueFullDOM();
    }
  }

  stop() {
    this.isActive = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    // Revert all known text nodes to original English
    this._revertDOM();
  }

  _initObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mut of mutations) {
        if (mut.type === 'childList') {
          mut.addedNodes.forEach(node => {
            if (this._isValidTextNode(node)) {
              const handled = this._queueNode(node);
              if (!handled) shouldProcess = true;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const walker = document.createTreeWalker(node, NodeFilter.SHOW_ALL, null, false);
              let childNode;
              while ((childNode = walker.nextNode())) {
                if (this._isValidTextNode(childNode)) {
                  const handled = this._queueNode(childNode);
                  if (!handled) shouldProcess = true;
                } else if (childNode.nodeType === Node.ELEMENT_NODE) {
                  ['placeholder', 'title', 'alt'].forEach(attr => {
                    if (childNode.hasAttribute(attr)) {
                      const handled = this._queueAttribute(childNode, attr);
                      if (!handled) shouldProcess = true;
                    }
                  });
                }
              }
            }
          });
        } else if (mut.type === 'characterData') {
          if (!mut.target._isTranslating) {
            // If React changed content, update original text if English
            if (!/[\u0900-\u0D7F]/.test(mut.target.nodeValue)) {
              this.originalTexts.set(mut.target, mut.target.nodeValue);
            }
            if (this._isValidTextNode(mut.target)) {
              const handled = this._queueNode(mut.target);
              if (!handled) shouldProcess = true;
            }
          }
        } else if (mut.type === 'attributes') {
          if (['placeholder', 'title', 'alt'].includes(mut.attributeName) && !mut.target._isTranslatingAttr) {
            const handled = this._queueAttribute(mut.target, mut.attributeName);
            if (!handled) shouldProcess = true;
          }
        }
      }
      if (shouldProcess) this._scheduleBatch(40);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'alt']
    });
  }

  _isValidTextNode(node) {
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const parent = node.parentElement;
    if (!parent) return false;
    
    const tag = parent.tagName.toLowerCase();
    // Ignore script, style, noscript, code, pre
    if (['script', 'style', 'noscript', 'code', 'pre'].includes(tag)) return false;
    // Ignore elements marked as notranslate
    if (parent.closest('.notranslate, [translate="no"]')) return false;
    // Ignore empty or just whitespace
    const text = node.nodeValue;
    if (!text || !text.trim()) return false;

    // Strict check for digital time formats:
    // e.g., "09:00 AM", "10:30 PM", "9:00", "09:00 - 10:00", "11:15 AM - 12:00 PM", "02:30 pm"
    if (/^\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?(?:\s*[-–—]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)?\s*$/i.test(text)) {
      return false;
    }

    // Ignore numbers/symbols only (e.g., "123", "#45", "99.9%")
    if (/^[\d\s\W_]+$/.test(text)) return false;

    // Ignore pure numeric metrics with units (e.g. "15 min", "100K+", "20 yrs", "₹500")
    if (/^\s*₹?\s*[\d,.]+\s*(?:min|mins|k\+?|m\+?|%|\+)\s*$/i.test(text)) {
      return false;
    }

    // If we already know and track this node's original text, it's ALWAYS valid!
    if (this.originalTexts.has(node)) {
      return true;
    }

    // If text already contains Indic script:
    if (/[\u0900-\u0D7F]/.test(text)) {
      // Check if we can reverse-map it to English
      const norm = normalizeKey(text);
      if (REVERSE_INDIC_MAP.has(norm)) {
        const enOriginal = REVERSE_INDIC_MAP.get(norm);
        this.originalTexts.set(node, enOriginal);
        return true;
      }
      // Otherwise, assume it was natively rendered by React for the current language
      return false;
    }

    return true;
  }

  _queueFullDOM() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL, null, false);
    let node;
    let foundUnknown = false;
    while ((node = walker.nextNode())) {
      if (this._isValidTextNode(node)) {
        const handled = this._queueNode(node);
        if (!handled) foundUnknown = true;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        ['placeholder', 'title', 'alt'].forEach(attr => {
          if (node.hasAttribute(attr)) {
            const handled = this._queueAttribute(node, attr);
            if (!handled) foundUnknown = true;
          }
        });
      }
    }
    if (foundUnknown) this._scheduleBatch(40);
  }

  _queueNode(node) {
    let original = this.originalTexts.get(node);
    if (!original) {
      original = node.nodeValue;
      this.originalTexts.set(node, original);
    }

    const cleanText = original.trim();
    if (!cleanText) return true;

    // If target language is English, restore original immediately
    if (this.targetLang === 'en') {
      this._applyTranslation(node, original);
      return true;
    }

    // Instant synchronous translation via MASTER_MAP (0ms delay)
    const knownTranslation = this._knownTranslation(cleanText);
    if (knownTranslation) {
      this._applyTranslation(node, knownTranslation);
      return true;
    }

    // Instant synchronous translation via memory cache
    const cacheKey = `${this.targetLang}:${cleanText}`;
    if (this.translationCache.has(cacheKey)) {
      this._applyTranslation(node, this.translationCache.get(cacheKey));
      return true;
    }

    // Only queue if truly unknown and requires background AI batch
    if (!this.batch.has(cleanText)) {
      this.batch.set(cleanText, []);
    }
    this.batch.get(cleanText).push(node);
    return false;
  }

  _queueAttribute(element, attrName) {
    const value = element.getAttribute(attrName);
    if (!value || !value.trim() || /^[\d\s\W_]+$/.test(value)) return true;

    const originalKey = `attr_${attrName}`;
    let map = this.originalTexts.get(element);
    if (!map) {
      map = {};
      this.originalTexts.set(element, map);
    }
    let original = map[originalKey];
    if (!original) {
      original = value;
      map[originalKey] = original;
    }

    const cleanText = original.trim();
    if (!cleanText) return true;

    if (this.targetLang === 'en') {
      this._applyAttrTranslation(element, attrName, original);
      return true;
    }

    const knownTranslation = this._knownTranslation(cleanText);
    if (knownTranslation) {
      this._applyAttrTranslation(element, attrName, knownTranslation);
      return true;
    }

    const cacheKey = `${this.targetLang}:${cleanText}`;
    if (this.translationCache.has(cacheKey)) {
      this._applyAttrTranslation(element, attrName, this.translationCache.get(cacheKey));
      return true;
    }

    if (!this.batch.has(cleanText)) {
      this.batch.set(cleanText, []);
    }
    this.batch.get(cleanText).push({ type: 'attr', element, attrName });
    return false;
  }

  _scheduleBatch(delay = 40) {
    if (this.batchTimeout) clearTimeout(this.batchTimeout);
    this.batchTimeout = setTimeout(() => this._processBatch(), delay);
  }

  async _processBatch() {
    if (this.batch.size === 0) return;

    const batchLanguage = this.targetLang;
    const currentBatch = new Map(this.batch);
    this.batch.clear();

    let stringsToTranslate = Array.from(currentBatch.keys());
    if (stringsToTranslate.length === 0) return;

    // Mark nodes as translating to prevent observer loops
    currentBatch.forEach((items) => {
      items.forEach(item => {
        if (item.type === 'attr') item.element._isTranslatingAttr = true;
        else item._isTranslating = true;
      });
    });

    try {
      const langNames = {
        hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', mr: 'Marathi',
        gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', or: 'Odia', en: 'English'
      };
      const langName = langNames[batchLanguage] || batchLanguage;

      if (voiceAIService.available) {
        const results = await Promise.allSettled(stringsToTranslate.map(async originalStr => {
          const result = await voiceAIService.translate(originalStr, langName, 'general');
          return { originalStr, translatedStr: result?.text };
        }));
        const translated = new Set();
        results.forEach(result => {
          if (result.status !== 'fulfilled' || !result.value.translatedStr) return;
          translated.add(result.value.originalStr);
          this._applyBatchTranslation(currentBatch, batchLanguage, result.value.originalStr, result.value.translatedStr);
        });
        stringsToTranslate = stringsToTranslate.filter(text => !translated.has(text));
        if (stringsToTranslate.length === 0) return;
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return;
      }

      const prompt = `Translate this JSON array of UI strings into ${langName}. Keep formatting, variables, and punctuation intact. Only return the JSON array of translated strings.
Input: ${JSON.stringify(stringsToTranslate)}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        let rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        const translatedArray = JSON.parse(rawJson);

        if (Array.isArray(translatedArray) && translatedArray.length === stringsToTranslate.length) {
          stringsToTranslate.forEach((originalStr, index) => {
            this._applyBatchTranslation(currentBatch, batchLanguage, originalStr, translatedArray[index]);
          });
        }
      } else if (response.status === 429) {
        // Rate limited. Put items back in batch and retry later
        currentBatch.forEach((items, originalStr) => {
          if (!this.batch.has(originalStr)) this.batch.set(originalStr, []);
          this.batch.get(originalStr).push(...items);
        });
        this._scheduleBatch(3000);
      }
    } catch (e) {
      console.warn("DOMTranslator AI batch failed", e);
    } finally {
      currentBatch.forEach((items) => {
        items.forEach(item => {
          if (item.type === 'attr') item.element._isTranslatingAttr = false;
          else item._isTranslating = false;
        });
      });
    }
  }

  _applyBatchTranslation(currentBatch, language, originalStr, translatedStr) {
    if (!translatedStr) return;
    this.translationCache.set(`${language}:${originalStr}`, translatedStr);
    if (this.targetLang !== language) return;
    const items = currentBatch.get(originalStr) || [];
    items.forEach(item => {
      if (item.type === 'attr') this._applyAttrTranslation(item.element, item.attrName, translatedStr);
      else this._applyTranslation(item, translatedStr);
    });
  }

  _knownTranslation(text) {
    if (!this.targetLang || this.targetLang === 'en') return text;
    const key = normalizeKey(text);
    if (!key) return null;

    // 1. Direct O(1) exact normalized match from MASTER_MAP
    const match = MASTER_MAP.get(key);
    if (match && match[this.targetLang]) {
      return match[this.targetLang];
    }

    // 2. Strip surrounding punctuation or symbols
    const cleanKey = key.replace(/^[^\w\u0900-\u0D7F]+|[^\w\u0900-\u0D7F]+$/g, '').trim();
    if (cleanKey && cleanKey !== key) {
      const strippedMatch = MASTER_MAP.get(cleanKey);
      if (strippedMatch && strippedMatch[this.targetLang]) {
        return strippedMatch[this.targetLang];
      }
    }

    // 3. Fallback to OFFLINE_UI_TRANSLATIONS for legacy safety
    if (OFFLINE_UI_TRANSLATIONS[this.targetLang]?.[text]) {
      return OFFLINE_UI_TRANSLATIONS[this.targetLang][text];
    }

    return null;
  }

  _applyAttrTranslation(element, attrName, translatedStr) {
    if (!element.isConnected) return;
    const map = this.originalTexts.get(element) || {};
    const original = map[`attr_${attrName}`] || '';
    const leadingSpace = original.match(/^\s*/)?.[0] || '';
    const trailingSpace = original.match(/\s*$/)?.[0] || '';
    
    element._isTranslatingAttr = true;
    element.setAttribute(attrName, leadingSpace + translatedStr + trailingSpace);
    setTimeout(() => { element._isTranslatingAttr = false; }, 30);
  }

  _applyTranslation(node, translatedStr) {
    if (!node.isConnected) return;
    const original = this.originalTexts.get(node) || '';
    const leadingSpace = original.match(/^\s*/)?.[0] || '';
    const trailingSpace = original.match(/\s*$/)?.[0] || '';
    
    node._isTranslating = true;
    node.nodeValue = leadingSpace + translatedStr + trailingSpace;
    setTimeout(() => { node._isTranslating = false; }, 30);
  }

  _revertDOM() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE && this.originalTexts.has(node)) {
        node._isTranslating = true;
        node.nodeValue = this.originalTexts.get(node);
        setTimeout(() => { node._isTranslating = false; }, 30);
      } else if (node.nodeType === Node.ELEMENT_NODE && this.originalTexts.has(node)) {
        const map = this.originalTexts.get(node);
        ['placeholder', 'title', 'alt'].forEach(attr => {
          if (map[`attr_${attr}`]) {
            node._isTranslatingAttr = true;
            node.setAttribute(attr, map[`attr_${attr}`]);
            setTimeout(() => { node._isTranslatingAttr = false; }, 30);
          }
        });
      }
    }
  }
}

const domTranslator = new DOMTranslator();
export default domTranslator;
