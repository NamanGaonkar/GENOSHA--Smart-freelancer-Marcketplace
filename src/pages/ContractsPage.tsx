import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContractsByUser } from '../lib/api';
import { formatDual } from '../lib/utils';
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

export default function ContractsPage() {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const res = await getContractsByUser(profile.id);
      setContracts(res.data);
      setLoading(false);
    }
    load();
  }, [profile]);

  const filtered = contracts.filter((c) => filter === 'all' ? true : c.status === filter);

  const tabs = ['active', 'completed', 'cancelled', 'all'];

  return (
    <div>
      <h1 className="gen-heading" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 24 }}>Contracts</h1>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {tabs.map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: filter === f ? 'var(--accent-dim)' : 'var(--bg-card)',
            color: filter === f ? 'var(--accent)' : '#777',
            border: filter === f ? '1px solid var(--accent-border)' : '1px solid var(--border)',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="gen-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="gen-empty">
          <FileText size={36} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p>No contracts found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((contract) => (
            <Link key={contract.id} to={`/contracts/${contract.id}`} className="gen-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 22px', textDecoration: 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{contract.job?.title || 'Untitled Contract'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>
                  {profile?.role === 'client' ? `Freelancer: ${contract.freelancer?.full_name}` : `Client: ${contract.client?.full_name}`}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>{formatDual(contract.total_amount, (contract as any).budget_currency || 'usd')}</span>
                  <span>·</span>
                  <span>{new Date(contract.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {contract.status === 'active' && <Clock size={14} color="#f59e0b" />}
                {contract.status === 'completed' && <CheckCircle size={14} color="#27f3a9" />}
                {contract.status === 'cancelled' && <XCircle size={14} color="#ef4444" />}
                <span className={`gen-badge ${
                  contract.status === 'active' ? 'gen-badge-amber' :
                  contract.status === 'completed' ? 'gen-badge-green' : 'gen-badge-red'
                }`}>{contract.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
