import { useState, useEffect } from 'react';
import { Brain, Activity, Users, Zap, Power, PowerOff } from 'lucide-react';
import { getAIUsageStats } from '../lib/api';


export default function AIGovernance() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [killSwitch, setKillSwitch] = useState(() => localStorage.getItem('genosha_ai_killswitch') === 'true');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data } = await getAIUsageStats();
    setStats(data || []);
    setLoading(false);
  };

  // Aggregate stats
  const totalCalls = stats.length;
  const totalTokens = stats.reduce((s: number, u: any) => s + (u.tokens_used || 0), 0);
  const uniqueUsers = new Set(stats.map((u: any) => u.user_id)).size;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayCalls = stats.filter((u: any) => new Date(u.created_at) >= todayStart).length;
  const todayTokens = stats.filter((u: any) => new Date(u.created_at) >= todayStart).reduce((s: number, u: any) => s + (u.tokens_used || 0), 0);

  // Per-user breakdown
  const userBreakdown: Record<string, { name: string; calls: number; tokens: number }> = {};
  stats.forEach((u: any) => {
    const uid = u.user_id;
    if (!userBreakdown[uid]) userBreakdown[uid] = { name: u.user?.full_name || 'Unknown', calls: 0, tokens: 0 };
    userBreakdown[uid].calls++;
    userBreakdown[uid].tokens += u.tokens_used || 0;
  });

  if (loading) return <div className="gen-spinner" style={{ margin: 40 }} />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Brain size={18} color="#a78bfa" />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>AI Configuration & Quotas</h2>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: <Activity size={16} />, label: 'Total API Calls', value: totalCalls, color: '#a78bfa' },
          { icon: <Zap size={16} />, label: 'Total Tokens', value: totalTokens.toLocaleString(), color: '#f59e0b' },
          { icon: <Users size={16} />, label: 'Unique Users', value: uniqueUsers, color: '#10b981' },
          { icon: <Activity size={16} />, label: "Today's Calls", value: todayCalls, color: '#3b82f6' },
        ].map((s) => (
          <div key={s.label} className="gen-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 6, fontSize: 11 }}>{s.icon}<span>{s.label}</span></div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Kill Switch */}
      <div className="gen-card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {killSwitch ? <PowerOff size={16} color="#ef4444" /> : <Power size={16} color="#10b981" />}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Global AI Kill Switch</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Disable all public AI features when approaching rate limits.</p>
        </div>
        <button onClick={() => { const next = !killSwitch; setKillSwitch(next); localStorage.setItem('genosha_ai_killswitch', String(next)); }}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
            background: killSwitch ? '#ef4444' : '#10b981', transition: 'background 0.2s',
          }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
            left: killSwitch ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      {/* Today's Usage Detail */}
      <div className="gen-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Today's Token Usage</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-sec)', marginBottom: 8 }}>
          <span>Tokens used: {todayTokens.toLocaleString()}</span>
          <span>Free tier: 14,400 tokens/day</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-input)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${Math.min((todayTokens / 14400) * 100, 100)}%`,
            background: todayTokens > 10000 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #059669)',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Per-User Table */}
      <div className="gen-card" style={{ padding: 16, overflow: 'hidden' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Per-User Usage</h3>
        {Object.keys(userBreakdown).length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No AI usage recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11 }}>User</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11 }}>API Calls</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11 }}>Tokens</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(userBreakdown).map(([uid, info]) => (
                  <tr key={uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{info.name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-sec)' }}>{info.calls}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-sec)' }}>{info.tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
