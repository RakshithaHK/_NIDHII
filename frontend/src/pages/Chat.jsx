import { useState, useRef, useEffect } from "react";
import api from "../lib/api";
import { Send, Mic, MicOff, Volume2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { speakText, hasVoiceFor } from "../lib/tts";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "bn", label: "বাংলা" },
  { code: "mr", label: "मराठी" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

const SUGGESTIONS = {
  en: ["How do I report a leak?", "How do I earn ₹10?", "Where is my reward?"],
  hi: ["Leak ki shikayat kaise karein?", "₹10 kaise milenge?", "Mera reward kahan hai?"],
  ta: ["தண்ணீர் கசிவை எப்படி தெரிவிப்பது?", "₹10 எப்படி பெறுவது?", "என் வெகுமதி எங்கே?"],
  te: ["నీటి లీక్ ఎలా రిపోర్ట్ చేయాలి?", "₹10 ఎలా సంపాదించాలి?", "నా రివార్డ్ ఎక్కడ?"],
  bn: ["জল লিকেজ কীভাবে রিপোর্ট করব?", "₹10 কীভাবে পাব?", "আমার পুরস্কার কোথায়?"],
  mr: ["गळतीची तक्रार कशी करायची?", "₹10 कसे मिळतील?", "माझे बक्षीस कुठे आहे?"],
  kn: ["ನೀರಿನ ಸೋರಿಕೆಯನ್ನು ಹೇಗೆ ವರದಿ ಮಾಡುವುದು?", "₹10 ಹೇಗೆ ಸಂಪಾದಿಸುವುದು?", "ನನ್ನ ಬಹುಮಾನ ಎಲ್ಲಿ?"],
};

export default function Chat() {
  const [language, setLanguage] = useState("en");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const sessionRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (msg) => {
    const m = (msg ?? text).trim();
    if (!m) return;
    setMessages(p => [...p, { role: "user", text: m }]);
    setText(""); setBusy(true);
    try {
      const { data } = await api.post("/chat", { message: m, language, session_id: sessionRef.current });
      sessionRef.current = data.session_id;
      setMessages(p => [...p, { role: "assistant", text: data.reply }]);
      speak(data.reply);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Sahayak couldn't reply");
    } finally { setBusy(false); }
  };

  const speak = async (txt) => {
    const langMap = { en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN", bn: "bn-IN", mr: "mr-IN", kn: "kn-IN" };
    const result = await speakText(txt, langMap[language] || "en-IN");
    if (!result.ok) toast.error("Speech not available");
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribe(blob);
      };
      mediaRef.current = mr; mr.start(); setRecording(true);
    } catch (_) { toast.error("Mic denied"); }
  };
  const stopRec = () => { mediaRef.current?.stop(); setRecording(false); };

  const transcribe = async (blob) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "chat.webm"); fd.append("language", language);
      const { data } = await api.post("/voice/transcribe", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await send(data.transcript);
    } catch (_) { toast.error("Could not hear that"); setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="chat-page">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="heading text-4xl font-black tracking-tighter flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-[#F5A623]" strokeWidth={2.5}/> Sahayak
          </h1>
          <p className="text-slate-600">Your multilingual community helper</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <select value={language} onChange={(e)=>{ setLanguage(e.target.value); setMessages([]); sessionRef.current=null; }} className="border-2 border-slate-900 rounded-lg px-3 py-2 font-bold" data-testid="chat-language">
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {!hasVoiceFor(language) && language !== "en" && (
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500" data-testid="voice-unavailable-note">
              Voice in {language.toUpperCase()} via cloud TTS
            </span>
          )}
        </div>
      </div>

      <div className="civic-card flex flex-col h-[60vh]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Sparkles className="w-12 h-12 text-[#F5A623] mb-3" strokeWidth={2}/>
              <p className="font-bold text-lg mb-4">How can I help today?</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {(SUGGESTIONS[language] || SUGGESTIONS.en).map(s => (
                  <button key={s} onClick={()=>send(s)} className="civic-btn civic-btn-ghost !py-2 !px-3 text-sm" data-testid={`suggestion-${s.slice(0,10)}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[80%] p-3 rounded-xl border-2 border-slate-900 ${m.role==="user"?"bg-[#E05A3D] text-white":"bg-white"}`} data-testid={`msg-${m.role}-${i}`}>
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                {m.role==="assistant" && (
                  <button onClick={()=>speak(m.text)} className="mt-2 text-xs font-bold flex items-center gap-1 opacity-70 hover:opacity-100" data-testid={`play-${i}`}>
                    <Volume2 className="w-3 h-3"/> Speak
                  </button>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="text-sm text-slate-500" data-testid="chat-busy">Sahayak is typing...</div>}
        </div>

        <form onSubmit={(e)=>{ e.preventDefault(); send(); }} className="border-t-2 border-slate-900 p-3 flex gap-2 items-center">
          {!recording ? (
            <button type="button" onClick={startRec} className="civic-btn civic-btn-ghost !py-3 !px-3" disabled={busy} data-testid="chat-mic">
              <Mic className="w-5 h-5" strokeWidth={2.5}/>
            </button>
          ) : (
            <button type="button" onClick={stopRec} className="civic-btn !py-3 !px-3" data-testid="chat-mic-stop">
              <MicOff className="w-5 h-5" strokeWidth={2.5}/>
            </button>
          )}
          <input
            value={text} onChange={(e)=>setText(e.target.value)}
            placeholder="Type your message..."
            className="civic-input flex-1 !h-12"
            data-testid="chat-input"
            disabled={busy}
          />
          <button className="civic-btn !py-3 !px-4" disabled={busy || !text.trim()} data-testid="chat-send">
            <Send className="w-5 h-5" strokeWidth={2.5}/>
          </button>
        </form>
      </div>
    </div>
  );
}
