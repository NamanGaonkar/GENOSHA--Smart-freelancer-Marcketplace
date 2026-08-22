import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, Volume2, VolumeX } from 'lucide-react';

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const isAIDisabled = () => localStorage.getItem('genosha_ai_killswitch') === 'true';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'How does escrow work?',
  'How to dispute a milestone?',
  'Platform fee structure?',
  'How to set up my profile?',
];

// ── Strip markdown from AI responses ────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.+?)\*/g, '$1')         // *italic*
    .replace(/__(.+?)__/g, '$1')         // __bold__
    .replace(/_(.+?)_/g, '$1')           // _italic_
    .replace(/~~(.+?)~~/g, '$1')         // ~~strikethrough~~
    .replace(/`(.+?)`/g, '$1')           // `code`
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, '').replace(/```/g, '')) // code blocks
    .replace(/^#{1,6}\s+/gm, '')         // ### headings
    .replace(/^[-*+]\s+/gm, '• ')        // - list items → bullet
    .replace(/^\d+\.\s+/gm, (m) => m)    // numbered lists (keep)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → text
    .replace(/~~(.+?)~~/g, '$1')         // ~~strike~~
    .replace(/\n{3,}/g, '\n\n')          // collapse multiple newlines
    .trim();
}

// ── Voice Engine ──────────────────────────────────────────────
let cachedVoice: SpeechSynthesisVoice | null = null;

function getBestVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const priorities = [
    (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('Natural') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('Samantha') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('Zira') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('Karen') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('Moira') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('Female') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('Daniel') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('David') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
  ];

  for (const check of priorities) {
    const found = voices.find(check);
    if (found) { cachedVoice = found; return found; }
  }
  cachedVoice = voices[0];
  return cachedVoice;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => getBestVoice();
  getBestVoice();
}

// Split text into chunks that TTS can handle (max ~300 chars per utterance)
function chunkText(text: string, maxLen = 300): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const sentences = text.replace(/([.!?])\s+/g, '$1|').split('|');
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

let speakingQueue: string[] = [];
let isSpeaking = false;

function processQueue() {
  if (!window.speechSynthesis || speakingQueue.length === 0) {
    isSpeaking = false;
    return;
  }
  isSpeaking = true;
  const chunk = speakingQueue.shift()!;
  const utter = new SpeechSynthesisUtterance(chunk);
  const voice = getBestVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  }
  utter.rate = 1.0;
  utter.pitch = 1.05;
  utter.volume = 0.9;
  utter.onend = () => processQueue();
  utter.onerror = () => processQueue();
  window.speechSynthesis.speak(utter);
}

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  speakingQueue = [];
  isSpeaking = false;
  const clean = stripMarkdown(text);
  speakingQueue = chunkText(clean, 300);
  processQueue();
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  speakingQueue = [];
  isSpeaking = false;
}

// ── Chatbot Component ─────────────────────────────────────────
export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'assistant', content: "Hi! I'm GENOSHA's AI assistant. Ask me anything about the platform — escrow, disputes, fees, profiles, or how to get started." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [killed, setKilled] = useState(isAIDisabled());
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem('genosha_voice') !== 'off');
  const prevMsgCount = useRef(msgs.length);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Auto-read new assistant messages
  useEffect(() => {
    if (voiceOn && msgs.length > prevMsgCount.current) {
      const last = msgs[msgs.length - 1];
      if (last.role === 'assistant') speak(last.content);
    }
    prevMsgCount.current = msgs.length;
  }, [msgs, voiceOn]);

  useEffect(() => {
    const iv = setInterval(() => setKilled(isAIDisabled()), 5000);
    return () => clearInterval(iv);
  }, []);

  const toggleVoice = useCallback(() => {
    const next = !voiceOn;
    setVoiceOn(next);
    localStorage.setItem('genosha_voice', next ? 'on' : 'off');
    if (!next) stopSpeaking();
  }, [voiceOn]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    stopSpeaking();
    setMsgs((p) => [...p, { role: 'user', content: q }]);
    setLoading(true);

    if (killed) {
      setMsgs((p) => [...p, { role: 'assistant', content: 'AI features are currently disabled by the administrator. Please try again later.' }]);
      setLoading(false);
      return;
    }

    if (!GROQ_KEY) {
      setMsgs((p) => [...p, { role: 'assistant', content: 'AI service is not configured. Please contact support.' }]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'groq/compound-mini',
          messages: [
            { role: 'system', content: `You are GENOSHA's AI support assistant. GENOSHA is a freelancer marketplace connecting elite independent freelancers with clients. Answer questions about: escrow funding, milestone payments, dispute resolution, platform fees (10% commission), profile setup, job posting, proposals, contracts, and messaging. Be concise, friendly, and helpful. Keep responses under 150 words. Do NOT use markdown formatting — respond in plain text only.` },
            ...msgs.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: q },
          ],
          max_tokens: 500,
          temperature: 0.6,
        }),
      });

      if (res.status === 429) {
        setMsgs((p) => [...p, { role: 'assistant', content: "I'm at capacity right now. Please try again in a moment." }]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const answer = stripMarkdown(data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.');
      setMsgs((p) => [...p, { role: 'assistant', content: answer }]);
    } catch {
      setMsgs((p) => [...p, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  if (killed && !open) return null;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 52, height: 52, borderRadius: '50%',
          background: killed ? '#4a4a4a' : 'linear-gradient(135deg, #10b981, #059669)',
          border: 'none', cursor: 'pointer',
          boxShadow: killed ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 20px rgba(16,185,129,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', opacity: killed ? 0.5 : 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}>
          <MessageCircle size={22} color="#fff" />
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 360, maxWidth: 'calc(100vw - 32px)', height: 480, maxHeight: 'calc(100vh - 80px)',
          borderRadius: 16, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          animation: 'gen-zoomIn 0.25s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: killed ? '#555' : 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>GENOSHA AI</div>
                <div style={{ fontSize: 10, color: killed ? '#ef4444' : '#10b981' }}>{killed ? 'Disabled' : 'Always online'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={toggleVoice}
                title={voiceOn ? 'Voice responses ON' : 'Voice responses OFF'}
                style={{
                  background: voiceOn ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, transition: 'all 0.15s',
                  color: voiceOn ? '#10b981' : 'var(--text-muted)',
                }}>
                {voiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              <button onClick={() => { setOpen(false); stopSpeaking(); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {killed && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                AI features are currently disabled by the administrator.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: m.role === 'user' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.04)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: 'rgba(255,255,255,0.04)', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick Prompts */}
          {msgs.length <= 1 && !killed && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-sec)', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: 10, borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: 8 }}>
              <input
                value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={killed ? 'AI is disabled...' : 'Ask about GENOSHA...'}
                disabled={killed}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-input)', color: 'var(--text)', fontSize: 12, outline: 'none',
                  fontFamily: 'inherit', opacity: killed ? 0.5 : 1,
                }}
              />
              <button type="submit" disabled={!input.trim() || loading || killed}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: (!input.trim() || killed) ? 'var(--bg-input)' : 'linear-gradient(135deg, #10b981, #059669)',
                  cursor: (!input.trim() || killed) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', opacity: killed ? 0.5 : 1,
                }}>
                <Send size={14} color={input.trim() && !killed ? '#fff' : 'var(--text-muted)'} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
