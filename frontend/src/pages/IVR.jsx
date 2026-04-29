import { useEffect, useState, useRef } from "react";
import api from "../lib/api";
import { Phone, PhoneCall, Mic, MicOff, ArrowLeft, Volume2, Delete } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { speakText, hasVoiceFor } from "../lib/tts";

export default function IVR() {
  const nav = useNavigate();
  const [stage, setStage] = useState("idle"); // idle | dialing | connected | recording
  const [number, setNumber] = useState("");
  const [language, setLanguage] = useState("en");
  const [session, setSession] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const NIDHII_NUMBER = "1800-NIDHII";
  const VIRTUAL_NUMBER = "1800643444";

  const dial = (d) => {
    if (number.length < 10) setNumber((n) => n + d);
  };

  const undo = () => setNumber((n) => n.slice(0, -1));
  const clearAll = () => setNumber("");

  // Keyboard support — listen on the page for digits/backspace/Enter while idle or connected
  useEffect(() => {
    const handler = (e) => {
      // ignore when user is typing into an input/select/textarea
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const k = e.key;
      if (stage === "idle") {
        if (/^[0-9]$/.test(k)) { e.preventDefault(); dial(k); }
        else if (k === "Backspace") { e.preventDefault(); undo(); }
        else if (k === "Delete") { e.preventDefault(); clearAll(); }
        else if (k === "Enter") { e.preventDefault(); call(); }
        else if (k === "*" || k === "#") { e.preventDefault(); dial(k); }
      } else if (stage === "connected") {
        if (/^[0-9*#]$/.test(k)) { e.preventDefault(); press(k); }
        else if (k === "Escape") { e.preventDefault(); hangup(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, number, session]);

  const call = async () => {
    if (number !== VIRTUAL_NUMBER) {
      toast.error(`Dial 1800-NIDHII (${VIRTUAL_NUMBER}) to reach Nidhii`);
      return;
    }
    setStage("dialing");
    setTimeout(async () => {
      try {
        const { data } = await api.post(`/ivr/start?language=${language}`);
        setSession(data);
        speak(data.prompt);
        setStage("connected");
      } catch (e) {
        toast.error("Could not connect");
        setStage("idle");
      }
    }, 900);
  };

  const speak = async (text) => {
    const langMap = { en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN", bn: "bn-IN", mr: "mr-IN", kn: "kn-IN" };
    await speakText(text, langMap[language] || "en-IN");
  };

  const press = async (digit) => {
    try {
      const { data } = await api.post("/ivr/step", { digit, session_id: session?.session_id });
      setSession(s => ({ ...s, prompt: data.prompt }));
      speak(data.prompt);
      if (data.expects_voice) setStage("recording");
    } catch(_){}
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
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (_) { toast.error("Microphone access denied"); }
  };

  const stopRec = () => { mediaRef.current?.stop(); setRecording(false); };

  const transcribe = async (blob) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "ivr.webm");
      fd.append("language", language);
      const { data } = await api.post("/voice/transcribe", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setTranscript(data.transcript);
      setParsed(data.parsed);
      toast.success("Got it! Review and submit.");
    } catch (e) {
      toast.error("Transcription failed");
    } finally { setTranscribing(false); }
  };

  const submit = async () => {
    try {
      await api.post("/reports", {
        type: parsed?.type || "other",
        description: transcript,
        location: parsed?.address || "Unknown",
        language,
        source: "ivr",
        audio_transcript: transcript,
      });
      toast.success("Report filed via IVR!");
      hangup();
      nav("/reports");
    } catch (_) { toast.error("Could not file report"); }
  };

  const hangup = () => {
    setStage("idle"); setNumber(""); setSession(null); setTranscript(""); setParsed(null);
    window.speechSynthesis?.cancel();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="ivr-page">
      <h1 className="heading text-4xl font-black tracking-tighter">Nidhii Phone Line</h1>
      <p className="text-slate-600 mb-6">Dial the 10-digit number. Works on any phone — even a basic Nokia.</p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Phone simulator */}
        <div className="civic-card p-6 bg-[#0F172A] text-white" data-testid="phone-simulator">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-70">Nidhii virtual number</div>
              <div className="heading text-2xl font-black">{NIDHII_NUMBER}</div>
              <div className="text-xs opacity-70 mt-1">{VIRTUAL_NUMBER}</div>
            </div>
            <select value={language} onChange={(e)=>setLanguage(e.target.value)} className="bg-slate-800 border-2 border-white rounded-lg px-3 py-2 text-sm font-bold" data-testid="ivr-language">
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="ta">தமிழ்</option>
              <option value="te">తెలుగు</option>
              <option value="bn">বাংলা</option>
              <option value="mr">मराठी</option>
              <option value="kn">ಕನ್ನಡ</option>
            </select>
          </div>
          {!hasVoiceFor(language) && language !== "en" && (
            <p className="text-[11px] uppercase tracking-widest text-white/60 font-bold mb-3" data-testid="ivr-voice-note">
              {language.toUpperCase()} voice via cloud TTS · slight delay first time
            </p>
          )}

          <div className="bg-slate-900 border-2 border-white rounded-xl p-4 mb-4 min-h-16 flex items-center justify-center">
            <span className="heading text-3xl font-black tracking-widest" data-testid="phone-display">
              {stage === "idle" ? (number || "Enter number") : stage === "dialing" ? "Dialing..." : "Connected"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {["1","2","3","4","5","6","7","8","9","*","0","#"].map(d => (
              <button key={d}
                data-testid={`dial-${d}`}
                onClick={() => stage === "connected" ? press(d) : dial(d)}
                className="dial-key text-slate-900">
                {d}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={undo}
              disabled={stage !== "idle" || number.length === 0}
              className="dial-key text-slate-900 !text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="dial-undo"
              title="Backspace"
            >
              <Delete className="w-5 h-5" strokeWidth={2.5}/> Undo
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={stage !== "idle" || number.length === 0}
              className="dial-key text-slate-900 !text-base disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="dial-clear"
              title="Delete"
            >
              Clear
            </button>
          </div>

          <p className="text-[11px] uppercase tracking-widest text-white/60 font-bold mb-3 text-center" data-testid="keyboard-hint">
            Tip: use your keyboard — digits, Backspace, Enter, Esc
          </p>

          <div className="grid grid-cols-2 gap-2">
            {stage === "idle" || stage === "dialing" ? (
              <button onClick={call} disabled={stage==="dialing"} className="civic-btn civic-btn-secondary col-span-2" data-testid="call-btn">
                <PhoneCall className="w-5 h-5" strokeWidth={3}/> {stage==="dialing" ? "Dialing..." : "Call"}
              </button>
            ) : (
              <button onClick={hangup} className="civic-btn col-span-2" data-testid="hangup-btn">
                <Phone className="w-5 h-5" strokeWidth={3}/> Hang up
              </button>
            )}
          </div>
        </div>

        {/* IVR Voice prompt panel */}
        <div className="civic-card p-6" data-testid="ivr-panel">
          {stage === "idle" && (
            <div className="text-center py-10">
              <Phone className="w-16 h-16 mx-auto mb-4 text-slate-300" strokeWidth={2}/>
              <p className="font-bold">Dial <span className="text-[#E05A3D]">{VIRTUAL_NUMBER}</span> to begin</p>
              <p className="text-sm text-slate-500 mt-2">Or use the dial pad on the left.</p>
            </div>
          )}
          {stage !== "idle" && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="w-5 h-5 text-[#246356]" strokeWidth={2.5}/>
                <span className="text-xs uppercase tracking-widest font-bold text-slate-500">IVR says</span>
              </div>
              <div className="bg-[#FDFBF7] border-2 border-slate-900 rounded-lg p-4 mb-4 min-h-32" data-testid="ivr-prompt">
                <p className="text-lg leading-relaxed">{session?.prompt || "Connecting..."}</p>
              </div>

              {stage === "recording" && (
                <div className="space-y-3">
                  {!recording && !transcript && (
                    <button onClick={startRec} className="civic-btn civic-btn-accent w-full" data-testid="ivr-start-rec">
                      <Mic className="w-5 h-5" strokeWidth={3}/> Start speaking
                    </button>
                  )}
                  {recording && (
                    <button onClick={stopRec} className="civic-btn w-full" data-testid="ivr-stop-rec">
                      <MicOff className="w-5 h-5" strokeWidth={3}/> Stop
                    </button>
                  )}
                  {transcribing && <p className="text-center font-bold" data-testid="ivr-transcribing">Listening...</p>}
                  {transcript && (
                    <div className="space-y-3">
                      <div className="border-2 border-slate-900 rounded-lg p-3 bg-slate-50">
                        <div className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-1">Transcript</div>
                        <p>{transcript}</p>
                        {parsed?.address && <p className="text-sm mt-2"><b>Address:</b> {parsed.address}</p>}
                        {parsed?.name && <p className="text-sm"><b>Name:</b> {parsed.name}</p>}
                        <p className="text-sm"><b>Detected:</b> <span className="capitalize">{parsed?.type}</span></p>
                      </div>
                      <button onClick={submit} className="civic-btn civic-btn-secondary w-full" data-testid="ivr-submit-report">
                        Submit report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
