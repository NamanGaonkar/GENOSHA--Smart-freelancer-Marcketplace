import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { updateJob, getCategories, getSkills } from '../lib/api';
import { notifyUsers } from '../components/Notifications';
import type { Category, Skill, Job } from '../types/database';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<Job | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly' | 'weekly'>('fixed');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [currency, setCurrency] = useState<'usd' | 'inr'>('usd');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: j } = await supabase.from('jobs').select('*').eq('id', id).single();
      if (j) {
        setJob(j);
        setTitle(j.title);
        setDescription(j.description);
        setCategoryId(j.category_id || '');
        setBudgetType(j.budget_type);
        setBudgetMin(String(j.budget_min));
        setBudgetMax(String(j.budget_max));
        setCurrency((j as any).budget_currency || 'usd');
        setDeadline(j.deadline ? j.deadline.split('T')[0] : '');
        setSelectedSkills(j.skills_required || []);
      }
      const catRes = await getCategories(); setCategories(catRes.data || []);
      const skillRes = await getSkills(); setAllSkills(skillRes.data || []);
    };
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;
    if (Number(budgetMin) > Number(budgetMax)) {
      toast.error('Minimum budget cannot exceed maximum');
      return;
    }
    setLoading(true);
    const { error } = await updateJob(id, {
      title, description,
      category_id: categoryId || null,
      skills_required: selectedSkills,
      budget_type: budgetType,
      budget_min: Number(budgetMin),
      budget_max: Number(budgetMax),
      deadline: deadline || null,
    });
    if (error) { toast.error(error.message || 'Failed to update job'); setLoading(false); return; }
    toast.success('Job updated!');
    // Notify freelancers about edit
    try {
      const { data: freelancers } = await supabase.from('profiles').select('id').eq('role', 'freelancer');
      if (freelancers?.length) {
        await notifyUsers(
          freelancers.map((f) => f.id),
          'Job Edited',
          `${profile.full_name} edited: "${title}"`,
          'job_edited',
          `/jobs/${id}`
        );
      }
    } catch (e) { console.error('Notification error:', e); }
    // Notify admin
    try {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins?.length) {
        await notifyUsers(
          admins.map((a) => a.id),
          'Job Edited',
          `${profile.full_name} edited: "${title}"`,
          'job_edited',
          `/jobs/${id}`
        );
      }
    } catch (e) { console.error(e); }
    navigate(`/jobs/${id}`);
  };

  const filteredSkills = allSkills.filter((s) =>
    skillSearch ? s.name.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.includes(s.name) : !selectedSkills.includes(s.name)
  ).slice(0, 10);

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
  };

  if (!job) return <div className="gen-page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 200 }}><div className="gen-spinner" /></div>;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontFamily: 'inherit' }}>
        <ArrowLeft size={14} /> Back
      </button>
      <h1 className="gen-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 24 }}>Edit Job</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Job Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="gen-input" style={{ width: '100%' }} placeholder="e.g. Build a React dashboard" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="gen-input" rows={5} style={{ width: '100%' }} placeholder="Describe the project in detail..." />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="gen-input" style={{ width: '100%' }}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Budget Type</label>
            <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as any)} className="gen-input" style={{ width: '100%' }}>
              <option value="fixed">Fixed Price</option>
              <option value="hourly">Hourly Rate</option>
              <option value="weekly">Weekly Retainer</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Min Budget ({currency === 'usd' ? '$' : '₹'})</label>
            <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} required min={0} className="gen-input" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Max Budget ({currency === 'usd' ? '$' : '₹'})</label>
            <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} required min={0} className="gen-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Deadline (optional)</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="gen-input" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Skills Required</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {selectedSkills.map((s) => (
              <span key={s} onClick={() => toggleSkill(s)} style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 12, border: '1px solid var(--accent-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {s} <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} className="gen-input" style={{ flex: 1 }} placeholder="Search skills..." onKeyDown={(e) => {
              if (e.key === 'Enter' && skillSearch.trim()) {
                e.preventDefault();
                if (!selectedSkills.includes(skillSearch.trim())) setSelectedSkills([...selectedSkills, skillSearch.trim()]);
                setSkillSearch('');
              }
            }} />
            <button type="button" onClick={() => {
              if (skillSearch.trim() && !selectedSkills.includes(skillSearch.trim())) {
                setSelectedSkills([...selectedSkills, skillSearch.trim()]);
                setSkillSearch('');
              }
            }} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Add</button>
          </div>
          {filteredSkills.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {filteredSkills.map((s) => (
                <span key={s.id} onClick={() => { toggleSkill(s.name); setSkillSearch(''); }} style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="gen-btn-primary" disabled={loading} style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600 }}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
