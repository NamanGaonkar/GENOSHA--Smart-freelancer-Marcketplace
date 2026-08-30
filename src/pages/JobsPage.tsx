import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getOpenJobs, getJobsByClient, getCategories } from '../lib/api';
import { formatDual } from '../lib/utils';
import type { Category } from '../types/database';
import { Search, Plus, DollarSign, Clock, MapPin, RefreshCw } from 'lucide-react';

const USD_TO_INR = 83.5;

export default function JobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  const loadJobs = async () => {
    if (!profile) return;
    try {
      if (profile.role === 'admin') {
        const { data } = await supabase.from('jobs').select('*, client:profiles!jobs_client_id_fkey(full_name, role)').order('created_at', { ascending: false });
        setJobs(data || []);
      } else if (profile.role === 'client') {
        const res = await getJobsByClient(profile.id); setJobs(res.data);
      } else {
        // Convert budget filters if INR mode
        let minUsd = budgetMin ? Number(budgetMin) : undefined;
        let maxUsd = budgetMax ? Number(budgetMax) : undefined;
        if (currency === 'INR' && minUsd) minUsd = Math.round(minUsd / USD_TO_INR);
        if (currency === 'INR' && maxUsd) maxUsd = Math.round(maxUsd / USD_TO_INR);

        const res = await getOpenJobs({
          category_id: selectedCategory || undefined,
          budget_min: minUsd,
          budget_max: maxUsd,
        }); setJobs(res.data);
      }
      const catRes = await getCategories(); setCategories(catRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadJobs(); }, [profile, selectedCategory, budgetMin, budgetMax, currency]);

  useEffect(() => {
    const ch = supabase.channel('jobs-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => loadJobs())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [profile]);

  const filtered = jobs.filter((j) => search ? j.title?.toLowerCase().includes(search.toLowerCase()) || j.description?.toLowerCase().includes(search.toLowerCase()) : true);

  const currSymbol = currency === 'INR' ? '₹' : '$';
  const minStep = currency === 'INR' ? 500 : 10;
  const maxStep = currency === 'INR' ? 1000 : 50;

  return (
    <div className="gen-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="gen-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
          {profile?.role === 'admin' ? 'All Jobs' : profile?.role === 'client' ? 'Your Jobs' : 'Find Work'}
        </h1>
        {profile?.role === 'client' && (
          <Link to="/jobs/new" className="gen-btn-primary" style={{ textDecoration: 'none', padding: '9px 18px', fontSize: 13 }}>
            <Plus size={14} /> Post a Job
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="gen-input" style={{ paddingLeft: 36 }} />
        </div>
        {profile?.role === 'freelancer' && (
          <>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="gen-input" style={{ width: 180 }}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Currency Toggle */}
            <button
              onClick={() => setCurrency(currency === 'USD' ? 'INR' : 'USD')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 9999,
                border: '1px solid var(--accent-border)', background: 'var(--accent-dim)',
                color: 'var(--accent)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <RefreshCw size={12} /> {currency === 'USD' ? '$ USD' : '₹ INR'}
            </button>

            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder={`Min ${currSymbol}`}
              step={minStep}
              className="gen-input"
              style={{ width: 110 }}
            />
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder={`Max ${currSymbol}`}
              step={maxStep}
              className="gen-input"
              style={{ width: 110 }}
            />
          </>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="gen-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="gen-empty"><Search size={36} style={{ margin: '0 auto 16px', opacity: 0.3 }} /><p>No jobs found</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="gen-card" style={{ display: 'block', padding: '18px 20px', textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gen-truncate gen-break-words" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 500, marginBottom: 5 }}>{job.title} {job.is_edited && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>(edited)</span>}</div>
                  <div className="gen-line-clamp-2 gen-break-words" style={{ color: 'var(--text-sec)', fontSize: 13, lineHeight: 1.5 }}>{job.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, color: 'var(--text-muted)', fontSize: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} />{formatDual(job.budget_min, (job as any).budget_currency)} to {formatDual(job.budget_max, (job as any).budget_currency)}</span>
                    {job.deadline && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{new Date(job.deadline).toLocaleDateString()}</span>}
                    {job.client?.full_name && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{job.client.full_name}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {(job.skills_required || []).map((s: string) => (
                      <span key={s} style={{ padding: '2px 10px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 11, border: '1px solid var(--accent-border)' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <span className={`gen-badge ${statusBadge(job.status)}`}>{job.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function statusBadge(s: string) {
  switch (s) { case 'pending_approval': return 'gen-badge-amber'; case 'open': return 'gen-badge-green'; case 'in_progress': return 'gen-badge-amber'; case 'completed': return 'gen-badge-blue'; default: return 'gen-badge-gray'; }
}
