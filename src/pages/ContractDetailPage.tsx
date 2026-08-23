import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContract, getMilestonesByContract, createMilestone, updateMilestone, fundEscrow, submitWork, approveCompletion, cancelContract, createDispute } from '../lib/api';
import { formatDual } from '../lib/utils';
import type { Milestone, ContractWithDetails } from '../types/database';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock, Send, MessageSquare, X, CreditCard, Upload, File, Image, ExternalLink, Star } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import ReviewModal from '../components/ReviewModal';
import InvoiceButton from '../components/InvoicePDF';

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState<ContractWithDetails | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDescription, setMsDescription] = useState('');
  const [msAmount, setMsAmount] = useState('');
  const [msDeadline, setMsDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitFiles, setSubmitFiles] = useState<{ name: string; url: string }[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRole, setReviewRole] = useState<'client_to_freelancer' | 'freelancer_to_client'>('client_to_freelancer');
  const [revieweeId, setRevieweeId] = useState('');
  const [revieweeName, setRevieweeName] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const c = await getContract(id); setContract(c.data);
        const m = await getMilestonesByContract(id); setMilestones(m.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return; setCreating(true);
    const { error } = await createMilestone({
      contract_id: contract.id, title: msTitle, description: msDescription || null,
      amount: Number(msAmount), deadline: msDeadline || null, status: 'pending',
    });
    if (error) { toast.error(error.message || 'Failed'); setCreating(false); return; }
    toast.success('Milestone created!');
    const res = await getMilestonesByContract(contract.id); setMilestones(res.data);
    setShowForm(false); setMsTitle(''); setMsDescription(''); setMsAmount(''); setMsDeadline('');
    setCreating(false);
  };

  const handleFundEscrow = async () => {
    if (!contract) return; setActionLoading(true);
    const { error } = await fundEscrow(contract.id);
    if (error) { toast.error('Failed to fund escrow'); setActionLoading(false); return; }
    setContract((prev) => prev ? { ...prev, status: 'active', escrow_funded: true } : prev);
    toast.success('Escrow funded! Freelancer can now start working.');
    setActionLoading(false);
  };

  const handleSubmitWork = async () => {
    if (!contract || !submissionNotes.trim()) return;
    setActionLoading(true);

    const { error } = await submitWork(contract.id, submissionNotes, submitFiles);
    if (error) { toast.error('Failed to submit'); setActionLoading(false); return; }
    setContract((prev) => prev ? { ...prev, status: 'under_review', submission_notes: submissionNotes, submission_files: submitFiles } : prev);
    toast.success('Work submitted for client review!');
    setShowSubmitForm(false);
    setActionLoading(false);
  };

  const handleApproveCompletion = async () => {
    if (!contract) return; setActionLoading(true);
    const { error } = await approveCompletion(contract.id);
    if (error) { toast.error('Failed to approve'); setActionLoading(false); return; }
    setContract((prev) => prev ? { ...prev, status: 'completed' } : prev);
    toast.success('Contract completed! Payment released.');
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!contract) return;
    if (!confirm('Cancel this contract? This cannot be undone.')) return;
    await cancelContract(contract.id);
    for (const m of milestones) {
      if (m.status !== 'completed' && m.status !== 'approved') {
        await updateMilestone(m.id, { status: 'cancelled' });
      }
    }
    setContract((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    toast.success('Contract cancelled');
  };

  const handleMilestoneAction = async (msId: string, action: 'in_progress' | 'submitted' | 'approved' | 'rejected') => {
    const { error } = await updateMilestone(msId, { status: action });
    if (error) { toast.error('Failed'); return; }
    setMilestones((prev) => prev.map((m) => m.id === msId ? { ...m, status: action } : m));
    toast.success(`Milestone ${action.replace('_', ' ')}`);
  };

  const handleOpenReview = (role: 'client_to_freelancer' | 'freelancer_to_client', id: string, name: string) => {
    setReviewRole(role);
    setRevieweeId(id);
    setRevieweeName(name);
    setShowReviewModal(true);
  };

  const handleDispute = async () => {
    if (!contract || !profile || !disputeReason.trim()) return;
    const { error } = await createDispute({
      contract_id: contract.id,
      milestone_id: null,
      raised_by: profile.id,
      reason: disputeReason.trim(),
      status: 'open',
      admin_notes: null,
      resolved_by: null,
    });
    if (error) { toast.error('Failed to raise dispute'); return; }
    toast.success('Dispute raised. Admin will review.');
    setShowDisputeForm(false);
    setDisputeReason('');
  };

  if (loading) return <div className="gen-page" style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="gen-spinner" /></div>;
  if (!contract) return <div className="gen-page gen-empty"><p>Contract not found</p></div>;

  const isClient = profile?.id === contract.client_id;
  const statusColor = contract.status === 'active' ? 'gen-badge-green'
    : contract.status === 'pending_deposit' ? 'gen-badge-amber'
    : contract.status === 'under_review' ? 'gen-badge-cyan'
    : contract.status === 'completed' ? 'gen-badge-green'
    : 'gen-badge-red';

  return (
    <div className="gen-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontFamily: 'inherit' }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header Card */}
      <div className="gen-card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="gen-heading gen-break-words" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}>{contract.job?.title || 'Contract'}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, color: 'var(--text-sec)', fontSize: 14 }}>
              <span style={{ color: GREEN, fontWeight: 600, fontSize: 18 }}>{formatDual(contract.total_amount, contract.budget_currency || 'usd')}</span>
              <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>·</span>
              <span style={{ alignSelf: 'center' }}>{isClient ? `Freelancer: ${contract.freelancer?.full_name}` : `Client: ${contract.client?.full_name}`}</span>
            </div>
          </div>
          <span className={`gen-badge ${statusColor}`} style={{ flexShrink: 0, fontSize: 12, textTransform: 'capitalize' }}>{contract.status.replace('_', ' ')}</span>
        </div>

        {/* Lifecycle Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to={`/messages?room=${contract.id}`} className="gen-btn-ghost" style={{ padding: '8px 16px', fontSize: 12, textDecoration: 'none', opacity: ['completed', 'cancelled'].includes(contract.status) ? 0.6 : 1 }}>
            <MessageSquare size={13} /> {['completed', 'cancelled'].includes(contract.status) ? 'Chat (Read Only)' : 'Chat'}
          </Link>

          {/* Client: Fund Escrow */}
          {isClient && contract.status === 'pending_deposit' && (
            <button onClick={handleFundEscrow} disabled={actionLoading} className="gen-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              <CreditCard size={13} /> Fund Escrow & Start
            </button>
          )}

          {/* Freelancer: Submit Work */}
          {!isClient && contract.status === 'active' && (
            <button onClick={() => setShowSubmitForm(true)} className="gen-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              <Upload size={13} /> Submit Work for Review
            </button>
          )}

          {/* Client: Approve Completion */}
          {isClient && contract.status === 'under_review' && (
            <button onClick={handleApproveCompletion} disabled={actionLoading} className="gen-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              <CheckCircle size={13} /> Approve & Release Payment
            </button>
          )}

          {/* Cancel (before completed/cancelled) */}
          {isClient && !['completed', 'cancelled'].includes(contract.status) && (
            <button onClick={handleCancel} style={{ padding: '8px 16px', borderRadius: 9999, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={13} /> Cancel
            </button>
          )}

          {/* Freelancer: Dispute (before completed/cancelled) */}
          {!isClient && !['completed', 'cancelled'].includes(contract.status) && (
            <button onClick={() => setShowDisputeForm(!showDisputeForm)} style={{ padding: '8px 16px', borderRadius: 9999, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={13} /> Raise Dispute
            </button>
          )}

          {/* Review buttons (after completed) */}
          {contract.status === 'completed' && (
            <>
              {isClient ? (
                <button onClick={() => handleOpenReview('client_to_freelancer', contract.freelancer_id, contract.freelancer?.full_name || 'Freelancer')} style={{ padding: '8px 16px', borderRadius: 9999, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Star size={13} /> Rate Freelancer
                </button>
              ) : (
                <button onClick={() => handleOpenReview('freelancer_to_client', contract.client_id, contract.client?.full_name || 'Client')} style={{ padding: '8px 16px', borderRadius: 9999, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Star size={13} /> Rate Client
                </button>
              )}
              <InvoiceButton data={{
                contractId: contract.id,
                jobTitle: contract.job?.title || 'Contract',
                clientName: contract.client?.full_name || 'Client',
                freelancerName: contract.freelancer?.full_name || 'Freelancer',
                milestones: milestones.map((m) => ({ title: m.title, amount: m.amount, status: m.status })),
                totalAmount: contract.total_amount || 0,
                currency: contract.budget_currency || 'usd',
                completedAt: contract.updated_at || contract.created_at,
              }} />
            </>
          )}
        </div>

        {/* Dispute Form */}
        {showDisputeForm && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Raise a Dispute</div>
            <textarea
              value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the issue with this contract..."
              className="gen-input"
              style={{ width: '100%', minHeight: 80, resize: 'vertical', marginBottom: 10, fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDispute} disabled={!disputeReason.trim()} className="gen-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                Submit Dispute
              </button>
              <button onClick={() => setShowDisputeForm(false)} className="gen-btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Submission Notes Display */}
        {contract.submission_notes && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <div style={{ fontSize: 11, color: CYAN, fontWeight: 500, marginBottom: 6 }}>Submission Notes</div>
            <p className="gen-break-words" style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6 }}>{contract.submission_notes}</p>
            {/* Submission Files */}
            {(contract as any).submission_files && (contract as any).submission_files.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, color: CYAN, fontWeight: 500 }}>Deliverables</div>
                {(contract as any).submission_files.map((f: any, i: number) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.12)')}
                  >
                    {/\.(jpg|jpeg|png|gif|webp)$/i.test(f.name) ? <Image size={14} color={CYAN} /> : <File size={14} color="var(--text-muted)" />}
                    <span className="gen-truncate" style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{f.name}</span>
                    <ExternalLink size={11} color="var(--text-muted)" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit Work Modal */}
      {showSubmitForm && (
        <div className="gen-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Submit Work</span>
            <button onClick={() => setShowSubmitForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="gen-label">Submission Notes *</label>
              <textarea value={submissionNotes} onChange={(e) => setSubmissionNotes(e.target.value)} placeholder="Describe what you've delivered..." rows={3} className="gen-input" style={{ borderRadius: 16, padding: '16px 20px' }} />
            </div>
            <div>
              <label className="gen-label">Deliverable Files</label>
              <FileDropzone bucket="deliverables" path={`deliverables/${contract.id}`} multiple maxSizeMB={25} onUpload={(url, name) => setSubmitFiles(prev => [...prev, { name, url }])} />
            </div>
            <button onClick={handleSubmitWork} disabled={actionLoading || !submissionNotes.trim()} className="gen-btn-primary" style={{ alignSelf: 'flex-start' }}>
              {actionLoading ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="gen-heading" style={{ fontSize: 18 }}>Milestones ({milestones.length})</h2>
          {isClient && ['active', 'pending_deposit'].includes(contract.status) && (
            <button onClick={() => setShowForm(true)} className="gen-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              <Plus size={14} /> Add Milestone
            </button>
          )}
        </div>

        {showForm && (
          <div className="gen-card" style={{ padding: 22, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>New Milestone</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <form onSubmit={handleCreateMilestone} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} placeholder="Milestone title" required className="gen-input" />
              <textarea value={msDescription} onChange={(e) => setMsDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="gen-input" style={{ borderRadius: 16, padding: '14px 18px' }} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="number" value={msAmount} onChange={(e) => setMsAmount(e.target.value)} placeholder="Amount ($)" required min={1} className="gen-input" />
                <input type="date" value={msDeadline} onChange={(e) => setMsDeadline(e.target.value)} className="gen-input" />
              </div>
              <button type="submit" disabled={creating} className="gen-btn-primary" style={{ alignSelf: 'flex-start' }}>
                {creating ? 'Creating...' : 'Create Milestone'}
              </button>
            </form>
          </div>
        )}

        {milestones.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No milestones defined yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {milestones.map((ms, idx) => (
              <div key={ms.id} className="gen-card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>#{idx + 1}</span>
                      <span className="gen-break-words" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{ms.title}</span>
                    </div>
                    {ms.description && <p className="gen-line-clamp-2 gen-break-words" style={{ color: 'var(--text-sec)', fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{ms.description}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>{formatDual(ms.amount, contract?.budget_currency || 'usd')}</span>
                      {ms.deadline && <span>Due: {new Date(ms.deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span className={`gen-badge ${milestoneBadge(ms.status)}`} style={{ flexShrink: 0 }}>{ms.status.replace('_', ' ')}</span>
                </div>

                {contract.status === 'active' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {!isClient && ms.status === 'in_progress' && (
                      <button onClick={() => handleMilestoneAction(ms.id, 'submitted')} className="gen-btn-primary" style={{ padding: '6px 14px', fontSize: 11 }}>
                        <Send size={12} /> Submit for Review
                      </button>
                    )}
                    {isClient && ms.status === 'pending' && (
                      <button onClick={() => handleMilestoneAction(ms.id, 'in_progress')} className="gen-btn-primary" style={{ padding: '6px 14px', fontSize: 11 }}>
                        <Clock size={12} /> Start
                      </button>
                    )}
                    {isClient && ms.status === 'submitted' && (
                      <>
                        <button onClick={() => handleMilestoneAction(ms.id, 'approved')} className="gen-btn-primary" style={{ padding: '6px 14px', fontSize: 11 }}>
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button onClick={() => handleMilestoneAction(ms.id, 'rejected')} className="gen-btn-danger" style={{ padding: '6px 14px', fontSize: 11 }}>
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && contract && (
        <ReviewModal
          contractId={contract.id}
          revieweeId={revieweeId}
          revieweeName={revieweeName}
          role={reviewRole}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}

const GREEN = '#10b981';
const CYAN = '#06b6d4';

function milestoneBadge(status: string) {
  switch (status) {
    case 'pending': return 'gen-badge-gray';
    case 'in_progress': return 'gen-badge-amber';
    case 'submitted': return 'gen-badge-cyan';
    case 'approved': case 'completed': return 'gen-badge-green';
    case 'rejected': return 'gen-badge-red';
    case 'cancelled': return 'gen-badge-gray';
    default: return 'gen-badge-gray';
  }
}
