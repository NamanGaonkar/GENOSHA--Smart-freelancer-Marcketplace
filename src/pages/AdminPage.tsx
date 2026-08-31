import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDual, formatDate, formatDateShort } from '../lib/utils';
import { getReviewsForUser } from '../lib/api';
import { notifyUsers } from '../components/Notifications';
import {
  Users, Briefcase, Shield, Search, Trash2, TrendingUp, DollarSign,
  ChevronDown, ChevronUp, Eye, Ban, CheckCircle, Edit3, X, ExternalLink,
  MapPin, Globe, Clock, Calendar, Star, Award,
} from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import DisputeCenter from '../components/DisputeCenter';
import AIGovernance from '../components/AIGovernance';

const GREEN = '#10b981';
const GREEN_LIGHT = '#34d399';
const CYAN = '#06b6d4';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const PURPLE = '#a78bfa';

const tooltipStyle = {
  contentStyle: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    fontSize: 12,
    color: 'var(--text)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    fontFamily: "'Inter', sans-serif",
  },
};

const chartAnim = { animationDuration: 1200, animationEasing: 'ease-out' };

/* ── Modal ────────────────────────────────────────────────── */
function Modal({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} className="gen-modal-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="gen-modal-card"
        style={{ width: '100%', maxWidth: 'min(520px, calc(100vw - 32px))', maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden', position: 'relative', borderRadius: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        {children}
      </div>
    </div>
  );
}

/* ── InfoCard ─────────────────────────────────────────────── */
function InfoCard({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-input)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon && <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{icon}</span>}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-word' }}>{value || 'Not set'}</div>
    </div>
  );
}

/* ── DetailRow ────────────────────────────────────────────── */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

/* ═══ MAIN ══════════════════════════════════════════════════ */
export default function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'overview' | 'users' | 'jobs' | 'disputes' | 'ai'>('overview');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedUserReviews, setSelectedUserReviews] = useState<any[]>([]);

  const loadData = async () => {
    const [u, j, c] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('jobs').select('*, client:profiles!jobs_client_id_fkey(full_name, role)').order('created_at', { ascending: false }),
      supabase.from('contracts').select('*, client:profiles!contracts_client_id_fkey(full_name, role), freelancer:profiles!contracts_freelancer_id_fkey(full_name, role), job:jobs(title)'),
    ]);
    setUsers(u.data || []);
    setJobs(j.data || []);
    setContracts(c.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (selectedUser) {
      getReviewsForUser(selectedUser.id).then(({ data }) => setSelectedUserReviews(data || []));
    } else {
      setSelectedUserReviews([]);
    }
  }, [selectedUser]);
  useEffect(() => {
    const ch = supabase.channel('admin-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => loadData())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) { toast.error('Failed'); return; }
    toast.success(`Deleted ${name}`);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setSelectedUser(null);
  };

  const handleToggleJob = async (jobId: string, newStatus: string) => {
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
    if (error) { toast.error('Failed'); return; }
    toast.success(`Job ${newStatus}`);
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j));
    // Notify the job's client about approval/rejection
    const job = jobs.find((j) => j.id === jobId);
    if (job && (newStatus === 'open' || newStatus === 'disabled')) {
      const msg = newStatus === 'open' ? `Your job "${job.title}" has been approved and is now live!` : `Your job "${job.title}" was not approved. Please review and resubmit.`;
      notifyUsers([job.client_id], newStatus === 'open' ? 'Job Approved' : 'Job Not Approved', msg, newStatus === 'open' ? 'job_approved' : 'job_rejected', `/jobs/${jobId}`).catch(() => {});
    }
  };

  const handleDeleteJob = async (jobId: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) { toast.error('Failed'); return; }
    toast.success('Deleted');
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setSelectedJob(null);
  };

  if (profile?.role !== 'admin') return <div className="gen-page gen-empty"><Shield size={36} style={{ margin: '0 auto 16px', opacity: 0.3 }} /><p>Access denied.</p></div>;
  if (loading) return <div className="gen-page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 200 }}><div className="gen-spinner" /></div>;

  const clientCount = users.filter((u) => u.role === 'client').length;
  const freelancerCount = users.filter((u) => u.role === 'freelancer').length;
  // Normalize all amounts to INR before summing (contracts store amount in budget_currency)
  const USD_TO_INR = 83.5;
  const totalVolume = contracts.reduce((s, c) => {
    const amt = c.total_amount || 0;
    const cur = (c as any).budget_currency || 'usd';
    return s + (cur === 'inr' ? amt : Math.round(amt * USD_TO_INR));
  }, 0);
  const activeContracts = contracts.filter((c) => c.status === 'active').length;
  const completedContracts = contracts.filter((c) => c.status === 'completed').length;

  const roleData = [
    { name: 'Clients', value: clientCount, color: CYAN },
    { name: 'Freelancers', value: freelancerCount, color: GREEN },
    { name: 'Admins', value: users.filter((u) => u.role === 'admin').length, color: PURPLE },
  ].filter((d) => d.value > 0);

  const jobStatusData = [
    { name: 'Pending Approval', value: jobs.filter((j) => j.status === 'pending_approval').length, color: '#f97316' },
    { name: 'Open', value: jobs.filter((j) => j.status === 'open').length, color: GREEN },
    { name: 'In Progress', value: jobs.filter((j) => j.status === 'in_progress').length, color: CYAN },
    { name: 'Completed', value: jobs.filter((j) => j.status === 'completed').length, color: PURPLE },
    { name: 'Disabled', value: jobs.filter((j) => j.status === 'disabled').length, color: RED },
    { name: 'Flagged', value: jobs.filter((j) => j.status === 'flagged').length, color: AMBER },
  ].filter((d) => d.value > 0);

  const contractStatusData = [
    { name: 'Active', value: activeContracts, color: GREEN },
    { name: 'Completed', value: completedContracts, color: PURPLE },
    { name: 'Cancelled', value: contracts.filter((c) => c.status === 'cancelled').length, color: RED },
  ].filter((d) => d.value > 0);

  const now = new Date();
  const filterFutureMonths = <T extends { date: Date },>(entries: [string, T][]) => {
    return entries.filter(([, v]) => v.date <= now);
  };

  const volumeOverTime = (() => {
    const m: Record<string, { amount: number; date: Date }> = {};
    contracts.forEach((c) => {
      const d = new Date(c.created_at);
      const mo = formatDateShort(d);
      const amt = c.total_amount || 0;
      const cur = (c as any).budget_currency || 'usd';
      const amtINR = cur === 'inr' ? amt : Math.round(amt * USD_TO_INR);
      if (!m[mo]) m[mo] = { amount: 0, date: d };
      m[mo].amount += amtINR;
    });
    let cumulative = 0;
    return filterFutureMonths(Object.entries(m).sort((a, b) => a[1].date.getTime() - b[1].date.getTime())).slice(-8).map(([month, data]) => { cumulative += data.amount; return { month, volume: Math.round(cumulative) }; });
  })();

  const userGrowth = (() => {
    const m: Record<string, { count: number; date: Date }> = {};
    users.forEach((u) => { const d = new Date(u.created_at); const mo = formatDateShort(d); if (!m[mo]) m[mo] = { count: 0, date: d }; m[mo].count += 1; });
    let cumulative = 0;
    return filterFutureMonths(Object.entries(m).sort((a, b) => a[1].date.getTime() - b[1].date.getTime())).slice(-8).map(([month, data]) => { cumulative += data.count; return { month, users: cumulative }; });
  })();

  const monthlyJobs = (() => {
    const m: Record<string, { count: number; date: Date }> = {};
    jobs.forEach((j) => { const d = new Date(j.created_at); const mo = formatDateShort(d); if (!m[mo]) m[mo] = { count: 0, date: d }; m[mo].count += 1; });
    let cumulative = 0;
    return filterFutureMonths(Object.entries(m).sort((a, b) => a[1].date.getTime() - b[1].date.getTime())).slice(-8).map(([month, data]) => { cumulative += data.count; return { month, total: cumulative }; });
  })();

  const filteredUsers = users.filter((u) => search ? u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.role?.includes(search.toLowerCase()) : true);
  const filteredJobs = jobs.filter((j) => search ? j.title?.toLowerCase().includes(search.toLowerCase()) : true);

  const statusBadge = (s: string) => {
    switch (s) {
      case 'pending_approval': return 'gen-badge-amber';
      case 'open': return 'gen-badge-green';
      case 'in_progress': return 'gen-badge-amber';
      case 'completed': return 'gen-badge-cyan';
      case 'disabled': return 'gen-badge-red';
      case 'flagged': return 'gen-badge-amber';
      default: return 'gen-badge-gray';
    }
  };

  return (
    <div className="gen-page">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 box-border">
      <div style={{ marginBottom: 24 }}>
        <h1 className="gen-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Admin Panel</h1>
        <p style={{ color: GREEN, fontSize: 14, marginTop: 4, fontWeight: 500 }}>Welcome Admin, you have full control</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {(['overview', 'users', 'jobs', 'disputes', 'ai'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setSearch(''); setExpandedJob(null); }} className={`gen-tab ${tab === t ? 'gen-tab-active' : ''}`}>
            {t === 'ai' ? 'AI Config' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <>
          {/* Row 0: 4 Stats — full width, even columns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 w-full">
            {[
              { icon: <Users size={16} />, label: 'Total Users', value: users.length },
              { icon: <Briefcase size={16} />, label: 'Total Jobs', value: jobs.length },
              { icon: <TrendingUp size={16} />, label: 'Active Contracts', value: activeContracts },
              { icon: <DollarSign size={16} />, label: 'Platform Volume', value: formatDual(totalVolume, 'inr'), accent: true },
            ].map((s) => (
              <div key={s.label} className="gen-card min-w-0" style={{ padding: '18px 16px', ...(s.accent ? { background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.15)' } : {}) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.accent ? GREEN : 'var(--text-muted)', marginBottom: 8, fontSize: 12 }}>{s.icon}<span>{s.label}</span></div>
                <div style={{ fontSize: 22, fontWeight: 600, color: s.accent ? GREEN : 'var(--text)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Row 1: User Roles + Contract Status — 2-col equal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 w-full">
            {roleData.length > 0 && (
              <div className="gen-card min-w-0" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>User Roles Distribution</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0} paddingAngle={3} animationDuration={1000}>
                      {roleData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 }}>
                  {roleData.map((d) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sec)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: d.color }} />{d.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contractStatusData.length > 0 && (
              <div className="gen-card min-w-0" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Contract Status Overview</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={contractStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0} paddingAngle={3} animationBegin={200} animationDuration={1000}>
                      {contractStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 }}>
                  {contractStatusData.map((d) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sec)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: d.color }} />{d.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Platform Volume Trend + User Growth — 2-col equal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 w-full">
            {volumeOverTime.length > 0 && (
              <div className="gen-card min-w-0" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DollarSign size={14} color={GREEN} /> Platform Volume Trend
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={volumeOverTime} {...chartAnim}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GREEN} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip {...tooltipStyle} formatter={(v: any) => formatDual(Number(v), 'inr')} />
                    <Area type="monotone" dataKey="volume" stroke={GREEN} fill="url(#volGrad)" strokeWidth={2.5} dot={{ r: 3, fill: GREEN, strokeWidth: 0 }} activeDot={{ r: 5, fill: GREEN_LIGHT }} animationDuration={1400} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {userGrowth.length > 0 && (
              <div className="gen-card min-w-0" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} color={CYAN} /> User Growth Over Time
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={userGrowth} {...chartAnim}>
                    <defs>
                      <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CYAN} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={CYAN} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip {...tooltipStyle} />
                    <Area type="monotone" dataKey="users" stroke={CYAN} fill="url(#userGrad)" strokeWidth={2.5} dot={{ r: 3, fill: CYAN, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#22d3ee' }} animationDuration={1400} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Row 3: Job Status + Jobs Over Time — 2-col equal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {jobStatusData.length > 0 && (
              <div className="gen-card min-w-0" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Job Status Distribution</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={jobStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0} paddingAngle={3} animationBegin={400} animationDuration={1000}>
                      {jobStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                  {jobStatusData.map((d) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-sec)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: d.color }} />{d.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {monthlyJobs.length > 0 && (
              <div className="gen-card min-w-0" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={14} color={PURPLE} /> Jobs Posted Over Time
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={monthlyJobs} {...chartAnim}>
                    <defs>
                      <linearGradient id="jobGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PURPLE} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={PURPLE} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Area type="monotone" dataKey="total" stroke={PURPLE} fill="url(#jobGrad)" strokeWidth={2.5} dot={{ r: 3, fill: PURPLE, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#c4b5fd' }} animationDuration={1400} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ USERS ═══ */}
      {tab === 'users' && (
        <>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={14} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="gen-input" style={{ paddingLeft: 40 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredUsers.map((u) => (
              <div key={u.id} className="gen-card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onClick={() => setSelectedUser(u)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(u.avatar_url || u.photo_url) ? <img src={u.avatar_url || u.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={{ color: GREEN, fontSize: 14, fontWeight: 600 }}>{u.full_name?.charAt(0) || 'U'}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gen-truncate gen-break-words" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{u.full_name}</div>
                  <div className="gen-truncate" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{u.role} {u.experience_level ? `| ${u.experience_level}` : ''} | {u.skills?.length || 0} skills</div>
                </div>
                <span className={`gen-badge ${u.role === 'admin' ? 'gen-badge-green' : u.role === 'client' ? 'gen-badge-cyan' : 'gen-badge-amber'}`} style={{ flexShrink: 0 }}>{u.role}</span>
                <Eye size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                {u.role !== 'admin' && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id, u.full_name); }} className="gen-btn-danger" style={{ flexShrink: 0 }}><Trash2 size={12} /> Delete</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ JOBS ═══ */}
      {tab === 'jobs' && (
        <>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={14} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="gen-input" style={{ paddingLeft: 40 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredJobs.map((job) => {
              const isExpanded = expandedJob === job.id;
              return (
                <div key={job.id} className="gen-card min-w-0" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }} onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="gen-truncate gen-break-words" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{job.title}</span>
                        {(job as any).is_edited && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0 }}>edited</span>}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{formatDual(job.budget_min, (job as any).budget_currency)} to {formatDual(job.budget_max, (job as any).budget_currency)} | {job.client?.full_name || 'Unknown'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className={`gen-badge ${statusBadge(job.status)}`}>{job.status}</span>
                      <Eye size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }} />
                      {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Description</div>
                          <p className="gen-line-clamp-3 gen-break-words" style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6 }}>{job.description || 'No description'}</p>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Details</div>
                          <div style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.8 }}>
                            <div>Client: {job.client?.full_name || 'Unknown'}</div>
                            <div>Budget: {formatDual(job.budget_min, (job as any).budget_currency)} to {formatDual(job.budget_max, (job as any).budget_currency)}</div>
                            <div>Type: {job.budget_type || 'fixed'}</div>
                            <div>Skills: {(job.skills_required || []).join(', ') || 'None'}</div>
                            {job.deadline && <div>Deadline: {formatDate(job.deadline)}</div>}
                            <div>Created: {formatDate(job.created_at)}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <button onClick={() => setSelectedJob(job)} style={{ padding: '6px 14px', borderRadius: 9999, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: GREEN, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={11} /> View Full</button>
                        {job.status === 'pending_approval' && (<>
                          <button onClick={() => handleToggleJob(job.id, 'open')} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: GREEN, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} /> Approve</button>
                          <button onClick={() => handleToggleJob(job.id, 'disabled')} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: RED, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ban size={11} /> Reject</button>
                        </>)}
                        {job.status === 'open' && (<>
                          <button onClick={() => handleToggleJob(job.id, 'disabled')} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: RED, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ban size={11} /> Disable</button>
                          <button onClick={() => handleToggleJob(job.id, 'flagged')} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: AMBER, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Edit3 size={11} /> Flag</button>
                        </>)}
                        {job.status === 'disabled' && <button onClick={() => handleToggleJob(job.id, 'open')} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: GREEN, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} /> Enable</button>}
                        {job.status === 'flagged' && <button onClick={() => handleToggleJob(job.id, 'open')} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: GREEN, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} /> Unflag</button>}
                        {job.status !== 'completed' && job.status !== 'disabled' && <button onClick={() => handleToggleJob(job.id, 'completed')} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: PURPLE, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} /> Mark Completed</button>}
                        {job.status !== 'in_progress' && job.status !== 'disabled' && <button onClick={() => handleToggleJob(job.id, 'in_progress')} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: CYAN, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> Mark In Progress</button>}
                        {!['in_progress', 'active'].includes(job.status) && <button onClick={() => handleDeleteJob(job.id, job.title)} style={{ padding: '6px 14px', borderRadius: 9999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: RED, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Trash2 size={11} /> Delete</button>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ DISPUTES ═══ */}
      {tab === 'disputes' && (
        <DisputeCenter />
      )}

      {/* ═══ AI GOVERNANCE ═══ */}
      {tab === 'ai' && (
        <AIGovernance />
      )}

      {/* ═══ USER MODAL ═══ */}
      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)}>
        {selectedUser && (
          <>
            <button onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', zIndex: 2 }}>
              <X size={14} />
            </button>
            <div style={{ padding: '28px 28px 0', display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: 'rgba(16,185,129,0.1)', border: '2.5px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {(selectedUser.avatar_url || selectedUser.photo_url) ? <img src={selectedUser.avatar_url || selectedUser.photo_url} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={{ color: GREEN, fontSize: 24, fontWeight: 700 }}>{selectedUser.full_name?.charAt(0) || 'U'}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{selectedUser.full_name}</h3>
                  <span className={`gen-badge ${selectedUser.role === 'admin' ? 'gen-badge-green' : selectedUser.role === 'client' ? 'gen-badge-cyan' : 'gen-badge-amber'}`} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{selectedUser.role === 'admin' && <Shield size={10} />}{selectedUser.role}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><Calendar size={11} color="var(--text-muted)" /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Joined {formatDate(selectedUser.created_at)}</span></div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '20px 28px' }} />
            {selectedUser.bio && (
              <div style={{ padding: '0 28px', marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-input)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><span style={{ color: 'var(--text-muted)', display: 'flex' }}><Award size={12} /></span><span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bio</span></div>
                  <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.7 }}>{selectedUser.bio}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ padding: '0 28px' }}>
              <InfoCard label="Role" value={<span style={{ textTransform: 'capitalize' }}>{selectedUser.role}</span>} icon={<Shield size={12} />} />
              {selectedUser.role === 'freelancer' && (<>
                <InfoCard label="Experience" value={selectedUser.experience_level} icon={<Star size={12} />} />
                <InfoCard label="Hourly Rate" value={selectedUser.hourly_rate ? formatDual(selectedUser.hourly_rate) : null} icon={<DollarSign size={12} />} />
                <InfoCard label="Availability" value={selectedUser.availability} icon={<Clock size={12} />} />
              </>)}
              <InfoCard label="Location" value={selectedUser.location} icon={<MapPin size={12} />} />
              <InfoCard label="Languages" value={Array.isArray(selectedUser.languages) ? selectedUser.languages.join(', ') : (selectedUser.languages || null)} icon={<Globe size={12} />} />
            </div>
            {selectedUser.skills?.length > 0 && (
              <div style={{ padding: '16px 28px 0' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedUser.skills.map((s: string) => (<span key={s} style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, background: 'rgba(16,185,129,0.08)', color: GREEN, border: '1px solid rgba(16,185,129,0.15)' }}>{s}</span>))}
                </div>
              </div>
            )}
            {/* Reviews */}
            <div style={{ padding: '16px 28px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Star size={13} color="#f59e0b" fill="#f59e0b" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reviews ({selectedUser.total_reviews || selectedUserReviews.length})</span>
                {selectedUser.average_rating > 0 && (
                  <span style={{ fontSize: 11, color: '#f59e0b' }}>{selectedUser.average_rating.toFixed(1)} ★</span>
                )}
              </div>
              {selectedUserReviews.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No reviews yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedUserReviews.slice(0, 5).map((r: any) => (
                    <div key={r.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: 'var(--accent)', fontSize: 9, fontWeight: 600 }}>{r.reviewer?.full_name?.charAt(0) || '?'}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)' }}>{r.reviewer?.full_name || 'Anonymous'}</span>
                        <span style={{ fontSize: 10, color: '#f59e0b' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>{r.role === 'client_to_freelancer' ? 'Client → Freelancer' : 'Freelancer → Client'}</span>
                      </div>
                      {r.comment && <p style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.5 }}>{r.comment}</p>}
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>{formatDate(r.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setSelectedUser(null)} style={{ padding: '10px 24px', borderRadius: 9999, fontSize: 13, fontWeight: 500, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>Close</button>
              {selectedUser.role !== 'admin' && (
                <button onClick={() => handleDeleteUser(selectedUser.id, selectedUser.full_name)} style={{ padding: '10px 24px', borderRadius: 9999, fontSize: 13, fontWeight: 500, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: RED, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}><Trash2 size={14} /> Delete User</button>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* ═══ JOB MODAL ═══ */}
      <Modal open={!!selectedJob} onClose={() => setSelectedJob(null)}>
        {selectedJob && (
          <>
            <button onClick={() => setSelectedJob(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', zIndex: 2 }}><X size={14} /></button>
            <div style={{ padding: '28px 28px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><Briefcase size={20} color={GREEN} /><h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{selectedJob.title}</h3><span className={`gen-badge ${statusBadge(selectedJob.status)}`}>{selectedJob.status}</span></div>
              <p className="gen-break-words" style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.7 }}>{selectedJob.description || 'No description'}</p>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '16px 28px' }} />
            <div style={{ padding: '0 28px' }}>
              <div style={{ background: 'var(--bg-input)', borderRadius: 14, padding: '4px 0' }}>
                <DetailRow label="Client" value={selectedJob.client?.full_name || 'Unknown'} />
                <DetailRow label="Budget" value={`${formatDual(selectedJob.budget_min, (selectedJob as any).budget_currency)} to ${formatDual(selectedJob.budget_max, (selectedJob as any).budget_currency)}`} />
                <DetailRow label="Budget Type" value={selectedJob.budget_type || 'fixed'} />
                <DetailRow label="Category" value={selectedJob.category || 'General'} />
                <DetailRow label="Skills" value={selectedJob.skills_required?.length ? selectedJob.skills_required.join(', ') : 'None'} />
                {selectedJob.deadline && <DetailRow label="Deadline" value={formatDate(selectedJob.deadline)} />}
                <DetailRow label="Created" value={formatDate(selectedJob.created_at)} />
                <DetailRow label="Job ID" value={<span style={{ fontFamily: 'monospace', fontSize: 11 }}>{selectedJob.id}</span>} />
              </div>
            </div>
            {selectedJob.attachments?.length > 0 && (
              <div style={{ padding: '16px 28px 0' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Attachments</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedJob.attachments.map((a: string, i: number) => (<a key={i} href={a} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 11, textDecoration: 'none' }}><ExternalLink size={10} /> {a.split('/').pop()?.slice(0, 30) || 'File'}</a>))}
                </div>
              </div>
            )}
            <div style={{ padding: '20px 28px 28px', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Link to={`/jobs/${selectedJob.id}`} style={{ padding: '8px 20px', borderRadius: 9999, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: GREEN, fontSize: 12, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}><ExternalLink size={12} /> Open Full Page</Link>
              {selectedJob.status === 'open' && (<>
                <button onClick={() => { handleToggleJob(selectedJob.id, 'disabled'); setSelectedJob(null); }} style={{ padding: '8px 20px', borderRadius: 9999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: RED, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ban size={12} /> Disable</button>
                <button onClick={() => { handleToggleJob(selectedJob.id, 'flagged'); setSelectedJob(null); }} style={{ padding: '8px 20px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: AMBER, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Edit3 size={12} /> Flag</button>
              </>)}
              {(selectedJob.status === 'disabled' || selectedJob.status === 'flagged') && <button onClick={() => { handleToggleJob(selectedJob.id, 'open'); setSelectedJob(null); }} style={{ padding: '8px 20px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: GREEN, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Re-enable</button>}
              {!['in_progress', 'active'].includes(selectedJob.status) && <button onClick={() => { handleDeleteJob(selectedJob.id, selectedJob.title); }} style={{ padding: '8px 20px', borderRadius: 9999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: RED, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Trash2 size={12} /> Delete</button>}
              <button onClick={() => setSelectedJob(null)} style={{ padding: '8px 20px', borderRadius: 9999, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
            </div>
          </>
        )}
      </Modal>
      </div>
    </div>
  );
}
