import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getJobsByClient, getContractsByUser, getOpenJobs, getProposalsByFreelancer } from '../lib/api';
import { formatDual, formatDateShort } from '../lib/utils';
import type { Job } from '../types/database';
import { Plus, DollarSign, CheckCircle, Briefcase, FileText, TrendingUp, BarChart3, Send } from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, BarChart, Bar, CartesianGrid,
} from 'recharts';


const GREEN = '#10b981';
const GREEN_LIGHT = '#34d399';
const CYAN = '#06b6d4';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#a78bfa';

const tooltipStyle = {
  contentStyle: {
    background: '#0d121c', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, fontSize: 12, color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    fontFamily: "'Inter', sans-serif",
  },
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!profile) return;
    try {
      if (profile.role === 'client') {
        const [j, c] = await Promise.all([getJobsByClient(profile.id), getContractsByUser(profile.id)]);
        setJobs(j.data || []); setContracts(c.data || []);
      } else if (profile.role === 'freelancer') {
        const [j, c, p] = await Promise.all([getOpenJobs(), getContractsByUser(profile.id), getProposalsByFreelancer(profile.id)]);
        setRecentJobs((j.data || []).slice(0, 6)); setContracts(c.data || []); setProposals(p.data || []);
      } else {
        const c = await getContractsByUser(profile.id);
        setContracts(c.data || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [profile]);
  useEffect(() => {
    if (!profile) return;
    const ch = supabase.channel('dash-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => loadData())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [profile]);

  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  if (loading) return <div className="gen-page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 200 }}><div className="gen-spinner" /></div>;

  const activeJobs = jobs.filter((j) => j.status === 'open' || j.status === 'in_progress');
  const activeContracts = contracts.filter((c: any) => c.status === 'active');
  const completedContracts = contracts.filter((c: any) => c.status === 'completed');
  const underReview = contracts.filter((c: any) => c.status === 'under_review');
  const USD_TO_INR = 83.5;
  const toINR = (amt: number, cur?: string) => (cur === 'inr' ? amt : Math.round(amt * USD_TO_INR));
  const totalEarned = completedContracts.reduce((s: number, c: any) => s + toINR(c.total_amount || 0, c.budget_currency), 0);

  const now = new Date();
  const filterFuture = <T extends { date: Date },>(entries: [string, T][]) => {
    return entries.filter(([, v]) => v.date <= now);
  };

  // ════════════════════════════════════════════════════════════
  // FREELANCER DASHBOARD
  // ════════════════════════════════════════════════════════════
  if (profile?.role === 'freelancer') {
    const skillsNeeded = (() => {
      const map: Record<string, number> = {};
      recentJobs.forEach((j) => (j.skills_required || []).forEach((s) => { map[s] = (map[s] || 0) + 1; }));
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([skill, count]) => ({ skill, count }));
    })();

    const contractStatusData = [
      { name: 'Active', value: activeContracts.length, color: GREEN },
      { name: 'Under Review', value: underReview.length, color: CYAN },
      { name: 'Completed', value: completedContracts.length, color: PURPLE },
      { name: 'Cancelled', value: contracts.filter((c: any) => c.status === 'cancelled').length, color: RED },
    ].filter((d) => d.value > 0);

    const earningsTrend = (() => {
      const m: Record<string, { amount: number; date: Date }> = {};
      completedContracts.forEach((c: any) => {
        const d = new Date(c.created_at);
        const mo = formatDateShort(d);
        if (!m[mo]) m[mo] = { amount: 0, date: d };
        m[mo].amount += toINR(c.total_amount || 0, c.budget_currency);
      });
      let cumulative = 0;
      return filterFuture(Object.entries(m).sort((a, b) => a[1].date.getTime() - b[1].date.getTime())).slice(-8).map(([month, data]) => {
        cumulative += data.amount;
        return { month, earnings: cumulative };
      });
    })();

    const pendingProposals = proposals.filter((p: any) => p.status === 'pending').slice(0, 5);
    const allContracts = [...activeContracts, ...underReview];

    return (
      <div className="gen-page gen-dash-glow">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 box-border">
        <div style={{ marginBottom: 24 }}>
          <h1 className="gen-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Freelancer Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Welcome back, {profile?.full_name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 w-full">
          {[
            { icon: <Briefcase size={16} />, label: 'Available Jobs', value: recentJobs.length },
            { icon: <FileText size={16} />, label: 'Active Contracts', value: activeContracts.length },
            { icon: <CheckCircle size={16} />, label: 'Completed', value: completedContracts.length },
            { icon: <DollarSign size={16} />, label: 'Total Earned', value: formatDual(totalEarned, 'inr'), accent: true },
          ].map((s) => (
            <div key={s.label} className="gen-card min-w-0" style={{ position: 'relative', padding: '16px 14px', overflow: 'hidden', ...(s.accent ? { background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.15)' } : {}) }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.accent ? GREEN : 'var(--text-muted)', marginBottom: 6, fontSize: 11 }}>{s.icon}<span>{s.label}</span></div>
              <div className="gen-break-words" style={{ fontSize: 20, fontWeight: 600, color: s.accent ? GREEN : 'var(--text)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 w-full">
          <div className="gen-card min-w-0" style={{ overflow: 'hidden' }}>
            <div className="gen-card-header">
              <div className="gen-card-header-left">
                <div className="gen-card-icon" style={{ background: 'rgba(16,185,129,0.1)', color: GREEN }}><CheckCircle size={16} /></div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Project Status</span>
              </div>
              <span className="gen-card-count">{contractStatusData.length} types</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {contractStatusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={contractStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0} paddingAngle={3}>
                        {contractStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                    {contractStatusData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-sec)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: 2, background: d.color, flexShrink: 0 }} />{d.name}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="gen-empty-state">
                  <div className="gen-empty-icon"><CheckCircle size={20} /></div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No projects yet</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 200 }}>Accept proposals and start contracts to see your progress here.</p>
                </div>
              )}
            </div>
          </div>

          <div className="gen-card min-w-0" style={{ overflow: 'hidden' }}>
            <div className="gen-card-header">
              <div className="gen-card-header-left">
                <div className="gen-card-icon" style={{ background: 'rgba(16,185,129,0.1)', color: GREEN }}><TrendingUp size={16} /></div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Earnings Trend</span>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {earningsTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={earningsTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs><linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.4} /><stop offset="100%" stopColor={GREEN} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip {...tooltipStyle} formatter={(v: any) => formatDual(Number(v), 'inr')} />
                    <Area type="monotone" dataKey="earnings" stroke={GREEN} fill="url(#earnGrad)" strokeWidth={2.5} dot={{ r: 3, fill: GREEN, strokeWidth: 0 }} activeDot={{ r: 5, fill: GREEN_LIGHT }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="gen-empty-state">
                  <div className="gen-empty-icon"><TrendingUp size={20} /></div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No earnings data</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 200 }}>Complete contracts to see your earnings grow over time.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skills in Demand */}
          {skillsNeeded.length > 0 && (
            <div className="gen-card min-w-0 w-full mb-6" style={{ overflow: 'hidden' }}>
              <div className="gen-card-header">
                <div className="gen-card-header-left">
                  <div className="gen-card-icon" style={{ background: 'rgba(6,182,212,0.1)', color: CYAN }}><BarChart3 size={16} /></div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Skills in Demand</span>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={skillsNeeded} margin={{ top: 5, right: 10, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={true} vertical={false} />
                    <XAxis dataKey="skill" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} width={30} domain={[0, 'dataMax + 2']} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#10b981" maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="gen-card min-w-0" style={{ overflow: 'hidden', marginTop: 16 }}>
            <div className="gen-card-header">
              <div className="gen-card-header-left">
                <div className="gen-card-icon" style={{ background: 'rgba(245,158,11,0.1)', color: AMBER }}><Send size={16} /></div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Pending Proposals</span>
              </div>
              <span className="gen-card-count">{pendingProposals.length} Active</span>
            </div>
            {pendingProposals.length > 0 ? (
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {pendingProposals.map((p: any) => (
                  <div key={p.id} className="gen-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="gen-truncate gen-break-words" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.job?.title || 'Untitled'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Bid: {formatDual(p.bid_amount, p.job?.budget_currency || 'usd')} | {p.delivery_days}d delivery</div>
                    </div>
                    <span className="gen-badge gen-badge-amber" style={{ flexShrink: 0 }}>Pending</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gen-empty-state">
                <div className="gen-empty-icon"><FileText size={20} /></div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No proposals submitted yet</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 220 }}>Browse open opportunities and submit your bids to get started.</p>
                <Link to="/jobs" className="gen-btn-primary" style={{ marginTop: 12, padding: '8px 18px', fontSize: 12, textDecoration: 'none' }}>Browse Available Jobs</Link>
              </div>
            )}
          </div>

        {/* Available Jobs */}
        <div className="gen-card min-w-0" style={{ overflow: 'hidden', marginTop: 16, marginBottom: 14 }}>
          <div className="gen-card-header">
            <div className="gen-card-header-left">
              <div className="gen-card-icon" style={{ background: 'rgba(16,185,129,0.1)', color: GREEN }}><Briefcase size={16} /></div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Available Jobs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="gen-card-count">{recentJobs.length} Jobs</span>
              <Link to="/jobs" style={{ color: GREEN, fontSize: 12, textDecoration: 'none' }}>View all</Link>
            </div>
          </div>
          {recentJobs.length > 0 ? (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {recentJobs.map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="gen-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="gen-truncate gen-break-words" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{job.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{formatDual(job.budget_min, (job as any).budget_currency)} to {formatDual(job.budget_max, (job as any).budget_currency)}</div>
                  </div>
                  <span className="gen-badge gen-badge-green" style={{ flexShrink: 0 }}>open</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="gen-empty-state">
              <div className="gen-empty-icon"><Briefcase size={20} /></div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No jobs available</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 200 }}>Check back later for new opportunities matching your skills.</p>
            </div>
          )}
        </div>

        {/* Active Contracts */}
        <div className="gen-card min-w-0" style={{ overflow: 'hidden' }}>
          <div className="gen-card-header">
            <div className="gen-card-header-left">
              <div className="gen-card-icon" style={{ background: 'rgba(167,139,250,0.1)', color: PURPLE }}><FileText size={16} /></div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Active Contracts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="gen-card-count">{allContracts.length} Active</span>
              <Link to="/contracts" style={{ color: GREEN, fontSize: 12, textDecoration: 'none' }}>View all</Link>
            </div>
          </div>
          {allContracts.length > 0 ? (
            <div>
              {allContracts.map((c: any) => (
                <div key={c.id} className="gen-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <Link to={`/contracts/${c.id}`} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                    <div className="gen-truncate gen-break-words" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{c.job?.title || 'Contract'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{formatDual(c.total_amount, c.budget_currency || 'usd')} by {c.client?.full_name}</div>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span className={`gen-badge ${c.status === 'active' ? 'gen-badge-green' : 'gen-badge-amber'}`}>{c.status.replace(/_/g, ' ')}</span>
                    {c.status === 'active' && <Link to={`/contracts/${c.id}`} style={{ padding: '5px 12px', borderRadius: 9999, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Submit</Link>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gen-empty-state">
              <div className="gen-empty-icon"><FileText size={20} /></div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No active contracts</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 200 }}>Submit proposals to jobs and get hired to start working.</p>
              <Link to="/jobs" className="gen-btn-primary" style={{ marginTop: 12, padding: '8px 18px', fontSize: 12, textDecoration: 'none' }}>Find Work</Link>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // CLIENT DASHBOARD
  // ════════════════════════════════════════════════════════════
  if (profile?.role === 'client') {
    const contractStatusData = [
      { name: 'Active', value: activeContracts.length, color: GREEN },
      { name: 'Under Review', value: underReview.length, color: CYAN },
      { name: 'Completed', value: completedContracts.length, color: PURPLE },
      { name: 'Cancelled', value: contracts.filter((c: any) => c.status === 'cancelled').length, color: RED },
    ].filter((d) => d.value > 0);

    const totalSpent = completedContracts.reduce((s: number, c: any) => s + toINR(c.total_amount || 0, c.budget_currency), 0);

    const spendingTrend = (() => {
      const m: Record<string, { amount: number; date: Date }> = {};
      completedContracts.forEach((c: any) => {
        const d = new Date(c.created_at);
        const mo = formatDateShort(d);
        if (!m[mo]) m[mo] = { amount: 0, date: d };
        m[mo].amount += toINR(c.total_amount || 0, c.budget_currency);
      });
      let cumulative = 0;
      return filterFuture(Object.entries(m).sort((a, b) => a[1].date.getTime() - b[1].date.getTime())).slice(-8).map(([month, data]) => {
        cumulative += data.amount;
        return { month, spending: cumulative };
      });
    })();

    const allContracts = [...activeContracts, ...underReview];

    return (
      <div className="gen-page gen-dash-glow">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 box-border">
        <div style={{ marginBottom: 24 }}>
          <h1 className="gen-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Client Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Welcome back, {profile?.full_name}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 w-full">
          {[
            { icon: <Briefcase size={16} />, label: 'Total Jobs', value: jobs.length },
            { icon: <Briefcase size={16} />, label: 'Active Jobs', value: activeJobs.length },
            { icon: <FileText size={16} />, label: 'Contracts', value: activeContracts.length },
            { icon: <DollarSign size={16} />, label: 'Total Spent', value: formatDual(totalSpent, 'inr'), accent: true },
          ].map((s) => (
            <div key={s.label} className="gen-card min-w-0" style={{ position: 'relative', padding: '16px 14px', overflow: 'hidden', ...(s.accent ? { background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.15)' } : {}) }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.accent ? GREEN : 'var(--text-muted)', marginBottom: 6, fontSize: 11 }}>{s.icon}<span>{s.label}</span></div>
              <div className="gen-break-words" style={{ fontSize: 20, fontWeight: 600, color: s.accent ? GREEN : 'var(--text)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 w-full">
          <div className="gen-card min-w-0" style={{ overflow: 'hidden' }}>
            <div className="gen-card-header">
              <div className="gen-card-header-left">
                <div className="gen-card-icon" style={{ background: 'rgba(16,185,129,0.1)', color: GREEN }}><TrendingUp size={16} /></div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Spending Trend</span>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {spendingTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={spendingTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs><linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.4} /><stop offset="100%" stopColor={GREEN} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip {...tooltipStyle} formatter={(v: any) => formatDual(Number(v), 'inr')} />
                    <Area type="monotone" dataKey="spending" stroke={GREEN} fill="url(#spendGrad)" strokeWidth={2.5} dot={{ r: 3, fill: GREEN, strokeWidth: 0 }} activeDot={{ r: 5, fill: GREEN_LIGHT }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="gen-empty-state">
                  <div className="gen-empty-icon"><TrendingUp size={20} /></div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No spending data</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Complete contracts to track your spending over time.</p>
                </div>
              )}
            </div>
          </div>

          <div className="gen-card min-w-0" style={{ overflow: 'hidden' }}>
            <div className="gen-card-header">
              <div className="gen-card-header-left">
                <div className="gen-card-icon" style={{ background: 'rgba(16,185,129,0.1)', color: GREEN }}><CheckCircle size={16} /></div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Contract Status</span>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {contractStatusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={contractStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0} paddingAngle={3}>
                        {contractStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                    {contractStatusData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-sec)' }}>
                        <span style={{ width: 5, height: 5, borderRadius: 2, background: d.color, flexShrink: 0 }} />{d.name}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="gen-empty-state">
                  <div className="gen-empty-icon"><CheckCircle size={20} /></div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No contracts</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Hire freelancers to start building contracts.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <Link to="/jobs/new" className="gen-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', marginBottom: 14, textDecoration: 'none', borderStyle: 'dashed', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.03)' }}>
          <Plus size={18} color={GREEN} />
          <span style={{ color: GREEN, fontSize: 14, fontWeight: 500 }}>Post a New Job</span>
        </Link>

        {/* Your Jobs */}
        <div className="gen-card min-w-0" style={{ overflow: 'hidden', marginBottom: 14 }}>
          <div className="gen-card-header">
            <div className="gen-card-header-left">
              <div className="gen-card-icon" style={{ background: 'rgba(16,185,129,0.1)', color: GREEN }}><Briefcase size={16} /></div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Your Jobs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="gen-card-count">{jobs.length} Jobs</span>
              <Link to="/jobs" style={{ color: GREEN, fontSize: 12, textDecoration: 'none' }}>View all</Link>
            </div>
          </div>
          {jobs.length > 0 ? (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {jobs.slice(0, 5).map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="gen-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="gen-truncate gen-break-words" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{job.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{formatDual(job.budget_min, (job as any).budget_currency)} to {formatDual(job.budget_max, (job as any).budget_currency)}</div>
                  </div>
                  <span className={`gen-badge ${job.status === 'open' ? 'gen-badge-green' : job.status === 'in_progress' ? 'gen-badge-amber' : 'gen-badge-gray'}`} style={{ flexShrink: 0 }}>{job.status}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="gen-empty-state">
              <div className="gen-empty-icon"><Briefcase size={20} /></div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No jobs posted yet</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Post your first job to start finding talent.</p>
              <Link to="/jobs/new" className="gen-btn-primary" style={{ marginTop: 12, padding: '8px 18px', fontSize: 12, textDecoration: 'none' }}>Post a Job</Link>
            </div>
          )}
        </div>

        {/* Active Contracts */}
        <div className="gen-card min-w-0" style={{ overflow: 'hidden' }}>
          <div className="gen-card-header">
            <div className="gen-card-header-left">
              <div className="gen-card-icon" style={{ background: 'rgba(167,139,250,0.1)', color: PURPLE }}><FileText size={16} /></div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Active Contracts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="gen-card-count">{allContracts.length} Active</span>
              <Link to="/contracts" style={{ color: GREEN, fontSize: 12, textDecoration: 'none' }}>View all</Link>
            </div>
          </div>
          {allContracts.length > 0 ? (
            <div>
              {allContracts.map((c: any) => (
                <div key={c.id} className="gen-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <Link to={`/contracts/${c.id}`} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                    <div className="gen-truncate gen-break-words" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{c.job?.title || 'Contract'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{formatDual(c.total_amount, c.budget_currency || 'usd')} by {c.freelancer?.full_name}</div>
                  </Link>
                  <span className={`gen-badge ${c.status === 'active' ? 'gen-badge-green' : 'gen-badge-amber'}`} style={{ flexShrink: 0 }}>{c.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="gen-empty-state">
              <div className="gen-empty-icon"><FileText size={20} /></div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No active contracts</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Accept proposals to start working with freelancers.</p>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  return null;
}
