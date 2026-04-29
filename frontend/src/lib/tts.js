// Small helper to pick the best available SpeechSynthesis voice for a language.
// Browsers (esp. Chrome/Edge) don't always ship Kannada/Telugu/Tamil voices.
// We fallback gracefully so the user still hears something.

let cachedVoices = [];

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const v = window.speechSynthesis.getVoices();
  if (v && v.length) cachedVoices = v;
  return cachedVoices;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

const FALLBACK_CHAIN = {
  // ISO base => prioritised list to try
  kn: ["kn-IN", "kn", "hi-IN", "hi", "en-IN", "en-US", "en"],
  ta: ["ta-IN", "ta", "hi-IN", "hi", "en-IN", "en-US", "en"],
  te: ["te-IN", "te", "hi-IN", "hi", "en-IN", "en-US", "en"],
  bn: ["bn-IN", "bn-BD", "bn", "hi-IN", "hi", "en-IN", "en"],
  mr: ["mr-IN", "mr", "hi-IN", "hi", "en-IN", "en"],
  hi: ["hi-IN", "hi", "en-IN", "en-US", "en"],
  en: ["en-IN", "en-US", "en-GB", "en"],
};

function pickVoice(language) {
  const voices = loadVoices();
  if (!voices.length) return null;
  const base = (language || "en").split("-")[0].toLowerCase();
  const tryCodes = FALLBACK_CHAIN[base] || [language, base, "en-US", "en"];
  for (const code of tryCodes) {
    // exact match (case-insensitive)
    const v = voices.find((vv) => vv.lang.toLowerCase() === code.toLowerCase());
    if (v) return v;
  }
  // last resort — first voice that starts with base
  return voices.find((vv) => vv.lang.toLowerCase().startsWith(base)) || voices[0] || null;
}

/**
 * Speak `text` using the best available voice for `language`.
 * Returns { ok, voiceLang, fallback } so caller can notify user when fallback was used.
 */
export function speakText(text, language = "en") {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { ok: false, reason: "tts-unavailable" };
  }
  if (!text) return { ok: false, reason: "empty" };

  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(language);
  const requestedBase = (language || "en").split("-")[0].toLowerCase();

  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    // best-effort — set the lang and hope the engine picks something
    u.lang = language;
  }
  u.rate = 0.9;

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (_) {
    return { ok: false, reason: "speak-failed" };
  }

  const fallback = !!voice && voice.lang && voice.lang.toLowerCase().split("-")[0] !== requestedBase;
  return { ok: true, voiceLang: voice?.lang || language, fallback };
}

/** Returns true if a voice for this language base is available locally. */
export function hasVoiceFor(language) {
  const base = (language || "en").split("-")[0].toLowerCase();
  return loadVoices().some((v) => v.lang.toLowerCase().startsWith(base));
}
