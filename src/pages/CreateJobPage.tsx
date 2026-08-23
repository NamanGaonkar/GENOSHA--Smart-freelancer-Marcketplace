import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createJob, getCategories, getSkills } from '../lib/api';
import { supabase } from '../lib/supabase';
import { notifyUsers } from '../components/Notifications';
import type { Category, Skill } from '../types/database';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import AIAssistant from '../components/AIAssistant';

export default function CreateJobPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly' | 'weekly'>('fixed');
  const [currency, setCurrency] = useState<'usd' | 'inr'>('usd');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    async function load() {
      const [catRes, skillRes] = await Promise.all([getCategories(), getSkills()]);
      setCategories(catRes.data);
      setAllSkills(skillRes.data);
    }
    load();
  }, []);

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
  };

  const addCustomSkill = (name: string) => {
    if (name.trim() && !selectedSkills.includes(name.trim())) {
      setSelectedSkills([...selectedSkills, name.trim()]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (Number(budgetMin) > Number(budgetMax)) {
      toast.error('Minimum budget cannot exceed maximum');
      return;
    }
    setLoading(true);
    const { data, error } = await createJob({
      client_id: profile.id, title, description,
      category_id: categoryId || null, skills_required: selectedSkills,
      budget_type: budgetType, budget_currency: currency,
      budget_min: Number(budgetMin), budget_max: Number(budgetMax),
      deadline: deadline || null, status: 'open',
      attachments: attachments.map(a => a.url),
    });
    if (error) { toast.error(error.message || 'Failed to create job'); setLoading(false); return; }
    toast.success('Job posted!');
    // Notify all freelancers about new job
    try {
      const { data: freelancers } = await supabase.from('profiles').select('id').eq('role', 'freelancer');
      if (freelancers?.length) {
        await notifyUsers(
          freelancers.map((f) => f.id),
          'New Job Posted',
          `${profile.full_name} posted: "${title}"`,
          'job_posted',
          `/jobs/${data?.id}`
        );
      }
    } catch (e) { console.error('Notification error:', e); }
    navigate(`/jobs/${data?.id}`);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontFamily: 'inherit' }}>
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="gen-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 32 }}>Post a New Job</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <label className="gen-label">Job Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build a real-time dashboard with React" required minLength={5} maxLength={200} className="gen-input" />
        </div>

        <div>
          <label className="gen-label">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the project requirements, deliverables, and any specific skills needed..." required minLength={50} maxLength={5000} rows={6} className="gen-input" style={{ resize: 'none', lineHeight: 1.6 }} />
          <AIAssistant mode="optimize_job" input={description} onApply={(text) => setDescription(text)} />
        </div>

        <div>
          <label className="gen-label">Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="gen-input">
            <option value="">Select a category</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div>
          <label className="gen-label">Skills Required</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {allSkills.map((skill) => (
              <button key={skill.id} type="button" onClick={() => toggleSkill(skill.name)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: selectedSkills.includes(skill.name) ? 'var(--accent-dim)' : 'var(--bg-input)',
                  color: selectedSkills.includes(skill.name) ? 'var(--accent)' : '#888',
                  border: selectedSkills.includes(skill.name) ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                }}>
                {skill.name}
              </button>
            ))}
          </div>
          {/* Custom skills input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={customSkill} onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Add a custom skill..."
              className="gen-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customSkill.trim()) {
                  e.preventDefault();
                  addCustomSkill(customSkill);
                  setCustomSkill('');
                }
              }}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => { if (customSkill.trim()) { addCustomSkill(customSkill); setCustomSkill(''); } }}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Add
            </button>
          </div>
          {selectedSkills.filter(s => !allSkills.find(a => a.name === s)).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {selectedSkills.filter(s => !allSkills.find(a => a.name === s)).map((skill) => (
                <span key={skill} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
                }}>
                  {skill}
                  <button type="button" onClick={() => toggleSkill(skill)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Currency Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label className="gen-label" style={{ margin: 0 }}>Currency</label>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setCurrency('usd')} style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              background: currency === 'usd' ? 'var(--accent)' : 'var(--bg-input)',
              color: currency === 'usd' ? '#fff' : 'var(--text-sec)',
              transition: 'all 0.15s',
            }}>$ USD</button>
            <button type="button" onClick={() => setCurrency('inr')} style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              background: currency === 'inr' ? 'var(--accent)' : 'var(--bg-input)',
              color: currency === 'inr' ? '#fff' : 'var(--text-sec)',
              transition: 'all 0.15s',
            }}>₹ INR</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="gen-label">Budget Type</label>
            <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as 'fixed' | 'hourly' | 'weekly')} className="gen-input">
              <option value="fixed">Fixed Price</option>
              <option value="hourly">Hourly Rate</option>
              <option value="weekly">Weekly Retainer</option>
            </select>
          </div>
          <div>
            <label className="gen-label">Min Budget ({currency === 'usd' ? '$' : '₹'})</label>
            <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
              placeholder={currency === 'usd' ? '500' : '5000'} required min={1} className="gen-input"
              step="any" />
          </div>
          <div>
            <label className="gen-label">Max Budget ({currency === 'usd' ? '$' : '₹'})</label>
            <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
              placeholder={currency === 'usd' ? '5000' : '50000'} required min={1} className="gen-input"
              step="any" />
          </div>
        </div>

        <div>
          <label className="gen-label">Deadline (optional)</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="gen-input" />
        </div>

        <div>
          <label className="gen-label">Attachments (PRDs, wireframes, references)</label>
          <FileDropzone bucket="portfolio" path="job-attachments" multiple accept=".pdf,.doc,.docx,.zip,.fig,.png,.jpg,.jpeg" maxSizeMB={25}
            onUpload={(url, name) => setAttachments(prev => [...prev, { name, url }])} />
        </div>

        <button type="submit" disabled={loading} className="gen-btn-primary" style={{ width: '100%', padding: '14px', marginTop: 8 }}>
          {loading ? <div className="gen-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Post Job'}
        </button>
      </form>
    </div>
  );
}
