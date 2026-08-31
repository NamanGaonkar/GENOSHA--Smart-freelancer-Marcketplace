import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';
import { getDisputes, resolveDispute } from '../lib/api';

import { formatDual, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';


export default function DisputeCenter() {
  const { profile } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    const { data } = await getDisputes();
    setDisputes(data || []);
    setLoading(false);
  };

  const handleResolve = async (status: 'resolved_refund' | 'resolved_release') => {
    if (!selected || !profile) return;
    setResolving(true);
    const { error } = await resolveDispute(selected.id, status, adminNotes, profile.id);
    if (error) {
      toast.error('Failed to resolve dispute');
    } else {
      toast.success(status === 'resolved_refund' ? 'Refund issued to client' : 'Payment released to freelancer');
      setSelected(null);
      setAdminNotes('');
      loadDisputes();
    }
    setResolving(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': return '#ef4444';
      case 'under_review': return '#f59e0b';
      case 'resolved_refund': return '#3b82f6';
      case 'resolved_release': return '#10b981';
      default: return 'var(--text-muted)';
    }
  };

  if (loading) return <div className="gen-spinner" style={{ margin: 40 }} />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Shield size={18} color="#ef4444" />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Dispute Mediation Center</h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{disputes.filter((d: any) => d.status === 'open').length} open</span>
      </div>

      {disputes.length === 0 ? (
        <div className="gen-card" style={{ padding: 40, textAlign: 'center' }}>
          <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>No disputes</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>All contracts are running smoothly.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {disputes.map((d: any) => (
            <div key={d.id} className="gen-card" style={{ padding: 16, cursor: 'pointer', borderColor: selected?.id === d.id ? 'rgba(16,185,129,0.3)' : undefined }}
              onClick={() => { setSelected(d); setAdminNotes(''); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <AlertTriangle size={14} color={statusColor(d.status)} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.contract?.job?.title || 'Unknown Job'}</span>
                  </div>
                  <p className="gen-break-words" style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 4 }}>{d.reason}</p>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Raised by: {d.raised?.full_name || 'Unknown'}</span>
                    <span>Client: {d.contract?.client?.full_name}</span>
                    <span>Freelancer: {d.contract?.freelancer?.full_name}</span>
                    <span>{formatDate(d.created_at)}</span>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: statusColor(d.status), background: `${statusColor(d.status)}15`, border: `1px solid ${statusColor(d.status)}25`, flexShrink: 0, textTransform: 'capitalize' }}>
                  {d.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="gen-card" style={{ padding: 20, marginTop: 16, borderLeft: '3px solid rgba(16,185,129,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Dispute Details</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>Close</button>
          </div>

          {/* Contract terms */}
          <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 12, color: 'var(--text-sec)' }}>
            <div><strong>Job:</strong> {selected.contract?.job?.title}</div>
            <div><strong>Amount:</strong> {formatDual(selected.contract?.total_amount || 0, selected.contract?.budget_currency || 'usd')}</div>
            <div><strong>Contract Status:</strong> {selected.contract?.status?.replace(/_/g, ' ')}</div>
            <div><strong>Dispute Reason:</strong></div>
            <p className="gen-break-words" style={{ marginTop: 4 }}>{selected.reason}</p>
          </div>

          {selected.status === 'open' || selected.status === 'under_review' ? (
            <>
              <textarea
                value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add admin notes for resolution..."
                className="gen-input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical', marginBottom: 12, fontSize: 12 }}
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => handleResolve('resolved_refund')} disabled={resolving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <XCircle size={13} /> Refund Client
                </button>
                <button onClick={() => handleResolve('resolved_release')} disabled={resolving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <CheckCircle size={13} /> Release to Freelancer
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#10b981', marginBottom: 4 }}>Resolved</div>
              <p style={{ fontSize: 12, color: 'var(--text-sec)' }}>{selected.admin_notes || 'No notes provided.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
