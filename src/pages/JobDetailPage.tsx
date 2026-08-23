import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getJob, getProposalsByJob, createProposal, updateProposalStatus, createContract, updateJob } from '../lib/api';
import { formatDual } from '../lib/utils';
import type { JobWithClient, ProposalWithFreelancer } from '../types/database';
import toast from 'react-hot-toast';
import { ArrowLeft, DollarSign, Clock, Calendar, Send, Check, X, Edit3, Trash2, File, Image, ExternalLink } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import AIAssistant from '../components/AIAssistant';
import { supabase } from '../lib/supabase';
import { notifyUsers } from '../components/Notifications';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobWithClient | null>(null);
  const [proposals, setProposals] = useState<ProposalWithFreelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const jobRes = await getJob(id);
        setJob(jobRes.data);
        if (profile?.role === 'client' && profile.id === jobRes.data?.client_id) {
          const propRes = await getProposalsByJob(id);
          setProposals(propRes.data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [id, profile]);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !job) return;
    // Validate cover letter length (strip HTML tags)
    const plainText = coverLetter.replace(/<[^>]*>/g, '').trim();
    if (plainText.length < 50) {
      toast.error('Cover letter must be at least 50 characters');
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    const { error } = await createProposal({
      job_id: job.id, freelancer_id: profile.id, bid_amount: Number(bidAmount),
      delivery_days: Number(deliveryDays), cover_letter: coverLetter, status: 'pending',
    });
    if (error) {
      toast.error(error.message?.includes('duplicate') ? 'You already submitted a proposal' : error.message || 'Failed');
      setSubmitting(false); return;
    }
    toast.success('Proposal submitted!');
    // Notify the job's client
    try {
      if (job.client_id) {
        await notifyUsers([job.client_id], 'New Proposal', `${profile.full_name} submitted a proposal for "${job.title}"`, 'proposal_received', `/jobs/${job.id}`);
      }
    } catch (e) { console.error('Notification error:', e); }
    setBidAmount(''); setDeliveryDays(''); setCoverLetter('');
    setSubmitting(false);
  };

  const handleAcceptProposal = async (proposal: ProposalWithFreelancer) => {
    if (!job || !profile) return;
    await updateProposalStatus(proposal.id, 'accepted');
    for (const p of proposals) { if (p.id !== proposal.id && p.status === 'pending') await updateProposalStatus(p.id, 'rejected'); }
    const { data: contract } = await createContract({
      job_id: job.id, client_id: profile.id, freelancer_id: proposal.freelancer_id,
      proposal_id: proposal.id, status: 'active', total_amount: proposal.bid_amount,
      budget_currency: (job as any).budget_currency || 'usd',
    });
    await updateJob(job.id, { status: 'in_progress' });
    toast.success('Contract created!');
    // Notify the freelancer
    try {
      await notifyUsers([proposal.freelancer_id], 'Proposal Accepted!', `${profile.full_name} accepted your proposal for "${job.title}". Contract is now active.`, 'proposal_accepted', `/contracts/${contract?.id}`);
    } catch (e) { console.error('Notification error:', e); }
    navigate(`/contracts/${contract?.id}`);
  };

  const handleRejectProposal = async (proposalId: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    const { error } = await updateProposalStatus(proposalId, 'rejected');
    if (error) { toast.error('Failed'); return; }
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: 'rejected' } : p)));
    toast.success('Proposal rejected');
    // Notify the freelancer
    try {
      if (proposal?.freelancer_id && job) {
        await notifyUsers([proposal.freelancer_id], 'Proposal Declined', `${profile?.full_name} declined your proposal for "${job.title}"`, 'proposal_rejected', `/jobs/${job.id}`);
      }
    } catch (e) { console.error('Notification error:', e); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="gen-spinner" /></div>;
  if (!job) return <div className="gen-empty"><p>Job not found</p></div>;

  const isOwner = profile?.id === job.client_id;
  const isFreelancer = profile?.role === 'freelancer';
  const hasApplied = proposals.some((p) => p.freelancer_id === profile?.id);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontFamily: 'inherit' }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Job Header */}
      <div className="gen-card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 className="gen-heading" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}>{job.title} {job.is_edited && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>(edited)</span>}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={13} />{formatDual(job.budget_min, (job as any).budget_currency)} – {formatDual(job.budget_max, (job as any).budget_currency)} · {job.budget_type}</span>
              {job.deadline && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} />{new Date(job.deadline).toLocaleDateString()}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} />Posted {new Date(job.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span className={`gen-badge ${statusBadge(job.status)}`}>{job.status}</span>
            {(isOwner || profile?.role === 'admin') && (
              <>
                <button onClick={() => navigate(`/jobs/${job.id}/edit`)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Edit3 size={11} /> Edit</button>
                <button onClick={async () => {
                  if (!confirm('Delete this job?')) return;
                  const { error } = await supabase.from('jobs').delete().eq('id', job.id);
                  if (error) { toast.error('Failed'); return; }
                  toast.success('Job deleted');
                  // Notify freelancers
                  try {
                    const { data: fl } = await supabase.from('profiles').select('id').eq('role', 'freelancer');
                    if (fl?.length) await notifyUsers(fl.map((f) => f.id), 'Job Deleted', `${profile?.full_name} deleted: "${job.title}"`, 'job_deleted');
                  } catch (e) {}
                  navigate('/jobs');
                }} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Trash2 size={11} /> Delete</button>
              </>
            )}
          </div>
        </div>

        {/* Client */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--bg-card-hover)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{job.client?.full_name?.charAt(0) || 'C'}</span>
          </div>
          <div>
            <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 500 }}>{job.client?.full_name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Client</div>
          </div>
        </div>

        {/* Skills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
          {(job.skills_required || []).map((skill) => (
            <span key={skill} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, background: 'var(--bg-input)', color: 'var(--text-sec)', border: '1px solid var(--bg-input)' }}>{skill}</span>
          ))}
        </div>

        {/* Attachments */}
        {(job.attachments && job.attachments.length > 0) && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--bg-card-hover)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 500 }}>Attachments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {job.attachments.map((url: string, i: number) => {
                const fileName = url.split('/').pop()?.replace(/^[\d_]+/, '') || `File ${i + 1}`;
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {isImage ? <Image size={15} color="var(--accent)" /> : <File size={15} color="var(--text-muted)" />}
                    <span className="gen-truncate" style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{fileName}</span>
                    <ExternalLink size={12} color="var(--text-muted)" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="gen-card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontWeight: 500 }}>Description</div>
        <p style={{ color: 'var(--text-sec)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{job.description}</p>
      </div>

      {/* Freelancer: Submit Proposal */}
      {isFreelancer && job.status === 'open' && !hasApplied && (
        <div className="gen-card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 className="gen-heading" style={{ fontSize: 18, marginBottom: 20 }}>Submit a Proposal</h2>
          <form onSubmit={handleSubmitProposal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="gen-label">Bid Amount ({(job as any).budget_currency === 'inr' ? '₹ INR' : '$ USD'})</label>
                <input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={(job as any).budget_currency === 'inr' ? '25000' : '2500'} required min={1}
                  step="any" className="gen-input" />
                {bidAmount && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {(job as any).budget_currency === 'inr'
                      ? `≈ ${formatDual(Number(bidAmount), 'inr')}`
                      : `≈ ${formatDual(Number(bidAmount))}`}
                  </div>
                )}
              </div>
              <div>
                <label className="gen-label">Delivery (days)</label>
                <input type="number" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} placeholder="14" required min={1} className="gen-input" />
              </div>
            </div>
            <div>
              <label className="gen-label">Cover Letter</label>
              <RichTextEditor value={coverLetter} onChange={setCoverLetter}
                placeholder="Explain why you're the right fit for this project..." minHeight={140} />
              <AIAssistant
                mode="draft_proposal"
                input={coverLetter}
                jobTitle={job?.title}
                jobDescription={job?.description}
                skills={job?.skills_required}
                onApply={(text) => setCoverLetter(text)}
              />
            </div>
            <button type="submit" disabled={submitting} className="gen-btn-primary" style={{ alignSelf: 'flex-start' }}>
              <Send size={14} />
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </form>
        </div>
      )}

      {isFreelancer && hasApplied && (
        <div style={{ padding: '14px 20px', borderRadius: 12, background: 'var(--green-bg)', border: '1px solid var(--accent-dim)', color: 'var(--accent)', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
          You have already submitted a proposal for this job.
        </div>
      )}

      {/* Client: View Proposals */}
      {isOwner && (
        <div>
          <h2 className="gen-heading" style={{ fontSize: 18, marginBottom: 16 }}>Proposals ({proposals.length})</h2>
          {proposals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No proposals yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {proposals.map((proposal) => (
                <div key={proposal.id} className="gen-card" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{proposal.freelancer?.full_name?.charAt(0) || 'F'}</span>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 500 }}>{proposal.freelancer?.full_name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{proposal.freelancer?.experience_level || 'Freelancer'}{proposal.freelancer?.hourly_rate ? ` · $${proposal.freelancer.hourly_rate}/hr` : ''}</div>
                      </div>
                    </div>
                    <span className={`gen-badge ${proposalStatusBadge(proposal.status)}`}>{proposal.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-sec)', marginBottom: 10 }}>
                    <span>Bid: <strong style={{ color: 'var(--text)' }}>{formatDual(proposal.bid_amount, (job as any).budget_currency)}</strong></span>
                    <span>Delivery: <strong style={{ color: 'var(--text)' }}>{proposal.delivery_days} days</strong></span>
                  </div>
                  <div style={{ color: 'var(--text-sec)', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}
                    dangerouslySetInnerHTML={{ __html: proposal.cover_letter }} />
                  {proposal.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleAcceptProposal(proposal)} className="gen-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}><Check size={13} /> Accept</button>
                      <button onClick={() => handleRejectProposal(proposal.id)} className="gen-btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}><X size={13} /> Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case 'open': return 'gen-badge-green';
    case 'in_progress': return 'gen-badge-amber';
    case 'completed': return 'gen-badge-blue';
    case 'closed': return 'gen-badge-gray';
    default: return 'gen-badge-gray';
  }
}

function proposalStatusBadge(status: string) {
  switch (status) {
    case 'pending': return 'gen-badge-amber';
    case 'accepted': return 'gen-badge-green';
    case 'rejected': return 'gen-badge-red';
    case 'withdrawn': return 'gen-badge-gray';
    default: return 'gen-badge-gray';
  }
}
