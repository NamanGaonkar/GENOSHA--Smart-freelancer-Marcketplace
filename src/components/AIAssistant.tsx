import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { trackAIUsage, getAIUsageToday } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const DAILY_LIMIT = 10;
const isAIDisabled = () => localStorage.getItem('genosha_ai_killswitch') === 'true';

function stripMd(t: string): string {
  return t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/_(.+?)_/g, '$1').replace(/`(.+?)`/g, '$1').replace(/```[\s\S]*?```/g, m => m.replace(/```\w*\n?/g, '').replace(/```/g, '')).replace(/^#{1,6}\s+/gm, '').replace(/^[-*+]\s+/gm, '• ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
}

interface Props {
  mode: 'optimize_job' | 'draft_proposal';
  input: string;
  jobTitle?: string;
  jobDescription?: string;
  skills?: string[];
  onApply: (output: string) => void;
}

export default function AIAssistant({ mode, input, jobTitle, jobDescription, skills, onApply }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [usedToday, setUsedToday] = useState(0);

  useEffect(() => {
    if (profile) {
      getAIUsageToday(profile.id).then(({ count }) => setUsedToday(count));
    }
  }, [profile]);

  const runAI = async () => {
    if (isAIDisabled()) {
      toast.error('AI features are currently disabled by the administrator.');
      return;
    }
    if (!profile || !GROQ_KEY) {
      toast.error('AI service not available');
      return;
    }
    if (usedToday >= DAILY_LIMIT) {
      toast.error(`Daily limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`);
      return;
    }

    setLoading(true);
    try {
      let systemPrompt = '';
      let userPrompt = '';

      if (mode === 'optimize_job') {
        systemPrompt = `You are a technical project manager for GENOSHA, a freelancer marketplace. Convert brief job notes into a comprehensive, well-structured job posting. Include: title, detailed description with deliverables, suggested tech stack, milestones, estimated budget range, and required skills. Format in clean Markdown.`;
        userPrompt = `Convert these brief notes into a professional job posting:\n\n${input}`;
      } else {
        systemPrompt = `You are a proposal writing expert for GENOSHA, a freelancer marketplace. Draft a high-conversion proposal pitch for a freelancer. Be professional, concise, and highlight relevant skills. Include: greeting, understanding of the project, proposed approach, relevant experience, timeline, and closing. Format in clean Markdown.`;
        userPrompt = `Job Title: ${jobTitle || 'N/A'}\nJob Description: ${jobDescription || 'N/A'}\nRequired Skills: ${(skills || []).join(', ')}\n\nFreelancer's brief input: ${input}\n\nDraft a winning proposal.`;
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'groq/compound-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (res.status === 429) {
        toast.error('AI service at capacity. Please try again in a moment.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      const text = stripMd(data.choices?.[0]?.message?.content || '');
      const tokens = data.usage?.total_tokens || 0;

      setOutput(text);
      setUsedToday((p) => p + 1);
      trackAIUsage(profile.id, mode, tokens);
    } catch (err) {
      toast.error('AI request failed. Try again.');
      console.error(err);
    }
    setLoading(false);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" onClick={runAI} disabled={loading || !input.trim() || isAIDisabled()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
            border: `1px solid ${isAIDisabled() ? 'rgba(120,120,120,0.3)' : 'rgba(167,139,250,0.3)'}`, background: isAIDisabled() ? 'rgba(80,80,80,0.08)' : 'rgba(167,139,250,0.08)',
            color: isAIDisabled() ? '#666' : '#a78bfa', fontSize: 12, fontWeight: 500, cursor: loading ? 'wait' : isAIDisabled() ? 'not-allowed' : 'pointer',
            opacity: isAIDisabled() ? 0.5 : 1,
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? 'Generating...' : mode === 'optimize_job' ? 'Polish with AI' : 'Draft Proposal with AI'}
        </button>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{DAILY_LIMIT - usedToday} AI uses left today</span>
      </div>

      {output && (
        <div style={{ marginTop: 10, padding: 16, borderRadius: 12, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>AI Generated</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={copyOutput} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-sec)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={() => { onApply(output); setOutput(''); }}
                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Apply
              </button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>{output}</div>
        </div>
      )}
    </div>
  );
}
