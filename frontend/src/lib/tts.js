// Smart TTS that tries the browser first; if no voice for an Indic language
// is installed locally, falls back to the server-side OpenAI TTS via
// /api/tts which can speak Kannada/Tamil/Telugu/Bengali/Marathi natively.

import api from "./api";

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
  kn: ["kn-IN", "kn"],
  ta: ["ta-IN", "ta"],
  te: ["te-IN", "te"],
  bn: ["bn-IN", "bn-BD", "bn"],
  mr: ["mr-IN", "mr"],
  hi: ["hi-IN", "hi"],
  en: ["en-IN", "en-US", "en-GB", "en"],
};

// Languages where browser SpeechSynthesis voices are unreliable (often missing
// or wrong-language fallback). Always go to server-side TTS for these.
const ALWAYS_CLOUD = new Set(["kn", "ta", "te", "bn", "mr"]);

function pickVoice(language) {
  const voices = loadVoices();
  if (!voices.length) return null;
  const base = (language || "en").split("-")[0].toLowerCase();
  const tryCodes = FALLBACK_CHAIN[base] || [language, base];
  for (const code of tryCodes) {
    const v = voices.find((vv) => vv.lang.toLowerCase() === code.toLowerCase());
    if (v) return v;
  }
  // partial match (kn → any voice whose lang starts with kn)
  return voices.find((vv) => vv.lang.toLowerCase().startsWith(base)) || null;
}

/** Returns true if browser has a voice for this language base. */
export function hasVoiceFor(language) {
  const base = (language || "en").split("-")[0].toLowerCase();
  // For Indic languages we always use cloud TTS — pretend no local voice.
  if (ALWAYS_CLOUD.has(base)) return false;
  return !!pickVoice(language);
}

// audio cache keyed by (lang|text-hash) so we don't keep paying for repeats
const audioCache = new Map();
function cacheKey(lang, text) {
  return `${lang}::${text.slice(0, 200)}`;
}

let currentAudio = null;
function stopAll() {
  try { window.speechSynthesis?.cancel(); } catch (_) {/*ignore*/}
  if (currentAudio) {
    try { currentAudio.pause(); } catch (_) {/*ignore*/}
    currentAudio = null;
  }
}

/**
 * Speak `text` in `language`.
 *  1. Try local browser voice (free, instant)
 *  2. If no voice for the language base, call server /api/tts (real Indic voice)
 *
 * Returns a promise that resolves to:
 *   { ok, source: "browser" | "server" | "none", lang }
 */
export async function speakText(text, language = "en") {
  if (!text) return { ok: false, source: "none" };
  stopAll();

  const base = (language || "en").split("-")[0].toLowerCase();
  // For Indic languages, always use cloud TTS — browser voices are unreliable.
  const localVoice = ALWAYS_CLOUD.has(base) ? null : pickVoice(language);

  if (localVoice) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = localVoice;
      u.lang = localVoice.lang;
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
      return { ok: true, source: "browser", lang: localVoice.lang };
    } catch (_) { /* fall through */ }
  }

  // No local voice → server fallback (works for any language)
  const key = cacheKey(base, text);
  let url = audioCache.get(key);
  if (!url) {
    try {
      const res = await api.post(
        "/tts",
        { text, language: base, voice: "nova" },
        { responseType: "blob" },
      );
      url = URL.createObjectURL(res.data);
      audioCache.set(key, url);
    } catch (e) {
      return { ok: false, source: "none", reason: "server-tts-failed" };
    }
  }
  try {
    const audio = new Audio(url);
    currentAudio = audio;
    await audio.play();
    return { ok: true, source: "server", lang: base };
  } catch (_) {
    return { ok: false, source: "none", reason: "play-failed" };
  }
}
