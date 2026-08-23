import { supabase } from './supabase';
import type {
  Job,
  JobInsert,
  Proposal,
  ProposalInsert,
  Contract,
  ContractInsert,
  Milestone,
  MilestoneInsert,
  MilestoneUpdate,
  Message,
  MessageInsert,
  Profile,
  ProfileUpdate,
  PortfolioItem,
  PortfolioItemInsert,
  JobWithClient,
  ProposalWithFreelancer,
  ContractWithDetails,
  MessageWithSender,
  Category,
  Skill,
  Deliverable,
  DeliverableInsert,
  Review,
  ReviewInsert,
  Dispute,
  DisputeInsert,
} from '../types/database';

// ============================================================
// PROFILE OPERATIONS
// ============================================================

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data: data as Profile | null, error };
}

export async function updateProfile(userId: string, updates: ProfileUpdate) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  return { data: data as Profile | null, error };
}

export async function getFreelancers(filters?: {
  skills?: string[];
  availability?: string;
  experience_level?: string;
}) {
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'freelancer');

  if (filters?.availability) {
    query = query.eq('availability', filters.availability);
  }
  if (filters?.experience_level) {
    query = query.eq('experience_level', filters.experience_level);
  }
  if (filters?.skills && filters.skills.length > 0) {
    query = query.overlaps('skills', filters.skills);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  return { data: (data as Profile[]) ?? [], error };
}

// ============================================================
// CATEGORY & SKILL OPERATIONS
// ============================================================

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  return { data: (data as Category[]) ?? [], error };
}

export async function getSkills() {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('name');

  return { data: (data as Skill[]) ?? [], error };
}

// ============================================================
// JOB OPERATIONS
// ============================================================

export async function createJob(job: JobInsert) {
  const { data, error } = await supabase
    .from('jobs')
    .insert(job)
    .select()
    .single();

  return { data: data as Job | null, error };
}

export async function updateJob(jobId: string, updates: Partial<JobInsert>) {
  const { data, error } = await supabase
    .from('jobs')
    .update({ ...updates, is_edited: true, edited_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single();

  return { data: data as Job | null, error };
}

export async function getJob(jobId: string) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:profiles!jobs_client_id_fkey(*), category:categories(*)')
    .eq('id', jobId)
    .single();

  return { data: data as JobWithClient | null, error };
}

export async function getOpenJobs(filters?: {
  category_id?: string;
  budget_min?: number;
  budget_max?: number;
  skills?: string[];
}) {
  let query = supabase
    .from('jobs')
    .select('*, client:profiles!jobs_client_id_fkey(full_name, avatar_url, role, availability, experience_level, skills), category:categories(*)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.budget_min) {
    query = query.gte('budget_max', filters.budget_min);
  }
  if (filters?.budget_max) {
    query = query.lte('budget_min', filters.budget_max);
  }
  if (filters?.skills && filters.skills.length > 0) {
    query = query.overlaps('skills_required', filters.skills);
  }

  const { data, error } = await query;
  return { data: (data as JobWithClient[]) ?? [], error };
}

export async function getJobsByClient(clientId: string) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, category:categories(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  return { data: (data as (Job & { category: Category | null })[]) ?? [], error };
}

export async function deleteJob(jobId: string) {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  return { error };
}

// ============================================================
// PROPOSAL OPERATIONS
// ============================================================

export async function createProposal(proposal: ProposalInsert) {
  const { data, error } = await supabase
    .from('proposals')
    .insert(proposal)
    .select()
    .single();

  return { data: data as Proposal | null, error };
}

export async function getProposalsByJob(jobId: string) {
  const { data, error } = await supabase
    .from('proposals')
    .select('*, freelancer:profiles!proposals_freelancer_id_fkey(*)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  return { data: (data as ProposalWithFreelancer[]) ?? [], error };
}

export async function getProposalsByFreelancer(freelancerId: string) {
  const { data, error } = await supabase
    .from('proposals')
    .select('*, job:jobs(*, client:profiles!jobs_client_id_fkey(*))')
    .eq('freelancer_id', freelancerId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function updateProposalStatus(proposalId: string, status: 'accepted' | 'rejected' | 'withdrawn') {
  const { data, error } = await supabase
    .from('proposals')
    .update({ status })
    .eq('id', proposalId)
    .select()
    .single();

  return { data: data as Proposal | null, error };
}

// ============================================================
// CONTRACT OPERATIONS — FULL LIFECYCLE
// ============================================================

export async function createContract(contract: ContractInsert) {
  const { data, error } = await supabase
    .from('contracts')
    .insert({ ...contract, status: 'pending_deposit', escrow_funded: false })
    .select()
    .single();

  return { data: data as Contract | null, error };
}

export async function getContract(contractId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      job:jobs(*),
      client:profiles!contracts_client_id_fkey(*),
      freelancer:profiles!contracts_freelancer_id_fkey(*),
      milestones:milestones(*)
    `)
    .eq('id', contractId)
    .single();

  return { data: data as ContractWithDetails | null, error };
}

export async function getContractsByUser(userId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      job:jobs(*),
      client:profiles!contracts_client_id_fkey(*),
      freelancer:profiles!contracts_freelancer_id_fkey(*)
    `)
    .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function updateContractStatus(contractId: string, status: Contract['status'], extra?: { escrow_funded?: boolean; submission_notes?: string; submission_files?: { name: string; url: string }[] }) {
  const update: Record<string, any> = { status };
  if (extra?.escrow_funded !== undefined) update.escrow_funded = extra.escrow_funded;
  if (extra?.submission_notes !== undefined) update.submission_notes = extra.submission_notes;
  if (extra?.submission_files !== undefined) update.submission_files = extra.submission_files;

  const { data, error } = await supabase
    .from('contracts')
    .update(update)
    .eq('id', contractId)
    .select()
    .single();

  return { data: data as Contract | null, error };
}

// ── Contract lifecycle actions ─────────────────────────────

/** Client funds escrow: pending_deposit → active */
export async function fundEscrow(contractId: string) {
  return updateContractStatus(contractId, 'active', { escrow_funded: true });
}

/** Freelancer submits work: active → under_review */
export async function submitWork(contractId: string, submissionNotes: string, files?: { name: string; url: string }[]) {
  return updateContractStatus(contractId, 'under_review', { submission_notes: submissionNotes, submission_files: files || [] });
}

/** Client approves: under_review → completed */
export async function approveCompletion(contractId: string) {
  // 1. Update contract status
  const { data: contract, error } = await updateContractStatus(contractId, 'completed');
  if (error) return { data: null, error };

  // 2. Update associated job status to completed
  if (contract?.job_id) {
    const { error: jobErr } = await supabase.from('jobs').update({ status: 'completed' }).eq('id', contract.job_id);
    if (jobErr) console.error('Failed to update job status:', jobErr);
  }

  // 3. Notify the freelancer
  if (contract?.freelancer_id) {
    await supabase.from('notifications').insert({
      user_id: contract.freelancer_id,
      type: 'contract_completed',
      title: 'Contract Completed',
      body: `Your contract has been completed and payment has been released.`,
      link: `/contracts/${contractId}`,
    });
  }

  return { data: contract, error: null };
}

/** Cancel contract at any valid stage */
export async function cancelContract(contractId: string) {
  // 1. Update contract status
  const { data: contract, error } = await updateContractStatus(contractId, 'cancelled');
  if (error) return { data: null, error };

  // 2. Notify the other party
  const otherUserId = contract?.freelancer_id; // notify freelancer on cancel
  if (otherUserId) {
    await supabase.from('notifications').insert({
      user_id: otherUserId,
      type: 'contract_completed',
      title: 'Contract Cancelled',
      message: `A contract has been cancelled.`,
      link: `/contracts/${contractId}`,
    });
  }

  return { data: contract, error: null };
}

// ============================================================
// MILESTONE OPERATIONS
// ============================================================

export async function createMilestone(milestone: MilestoneInsert) {
  const { data, error } = await supabase
    .from('milestones')
    .insert(milestone)
    .select()
    .single();

  return { data: data as Milestone | null, error };
}

export async function getMilestonesByContract(contractId: string) {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: true });

  return { data: (data as Milestone[]) ?? [], error };
}

export async function updateMilestone(milestoneId: string, updates: MilestoneUpdate) {
  const { data, error } = await supabase
    .from('milestones')
    .update(updates)
    .eq('id', milestoneId)
    .select()
    .single();

  return { data: data as Milestone | null, error };
}

// ============================================================
// DELIVERABLE OPERATIONS
// ============================================================

export async function createDeliverable(deliverable: DeliverableInsert) {
  const { data, error } = await supabase
    .from('deliverables')
    .insert(deliverable)
    .select()
    .single();

  return { data: data as Deliverable | null, error };
}

export async function getDeliverablesByMilestone(milestoneId: string) {
  const { data, error } = await supabase
    .from('deliverables')
    .select('*')
    .eq('milestone_id', milestoneId)
    .order('created_at', { ascending: false });

  return { data: (data as Deliverable[]) ?? [], error };
}

// ============================================================
// FILE UPLOAD OPERATIONS
// ============================================================

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: urlData?.publicUrl ?? null, error: null };
}

// ============================================================
// MESSAGE / CHAT OPERATIONS
// ============================================================

export async function getChatRooms(userId: string) {
  // First get all rooms for this user
  const { data: memberships, error } = await supabase
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (error || !memberships?.length) return { data: [], error };

  const roomIds = memberships.map(m => m.room_id);

  // Get room details with contracts
  const { data: rooms } = await supabase
    .from('chat_rooms')
    .select('*, contract:contracts(*, job:jobs(*))')
    .in('id', roomIds);

  if (!rooms?.length) return { data: [], error: null };

  // For each room, get the other member's profile
  const result = await Promise.all(rooms.map(async (room) => {
    const { data: members } = await supabase
      .from('chat_room_members')
      .select('user_id')
      .eq('room_id', room.id);

    const otherUserId = members?.find(m => m.user_id !== userId)?.user_id;
    let otherUser = null;
    if (otherUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('id', otherUserId)
        .single();
      otherUser = profile;
    }

    return { room, other_user: otherUser };
  }));

  return { data: result, error: null };
}

export async function getMessages(roomId: string, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(*)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: ((data as MessageWithSender[]) ?? []).reverse(), error };
}

export async function sendMessage(message: MessageInsert) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  return { data: data as Message | null, error };
}

export async function markMessagesAsRead(roomId: string, userId: string) {
  const { error } = await supabase
    .from('chat_room_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId);

  return { error };
}

// ============================================================
// PORTFOLIO OPERATIONS
// ============================================================

export async function getPortfolioItems(freelancerId: string) {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('freelancer_id', freelancerId)
    .order('created_at', { ascending: false });

  return { data: (data as PortfolioItem[]) ?? [], error };
}

export async function createPortfolioItem(item: PortfolioItemInsert) {
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert(item)
    .select()
    .single();

  return { data: data as PortfolioItem | null, error };
}

export async function deletePortfolioItem(itemId: string) {
  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', itemId);

  return { error };
}

// ============================================================
// ADMIN OPERATIONS
// ============================================================

export async function toggleJobStatus(jobId: string, status: 'open' | 'disabled' | 'flagged') {
  const { data, error } = await supabase
    .from('jobs')
    .update({ status })
    .eq('id', jobId)
    .select()
    .single();

  return { data: data as Job | null, error };
}

export async function deleteUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  return { error };
}

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

export function subscribeToMessages(roomId: string, callback: (message: Message) => void) {
  return supabase
    .channel(`messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();
}

export function subscribeToProposals(jobId: string, callback: (proposal: Proposal) => void) {
  return supabase
    .channel(`proposals:${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'proposals',
        filter: `job_id=eq.${jobId}`,
      },
      (payload) => {
        callback(payload.new as Proposal);
      }
    )
    .subscribe();
}

// ============================================================
// REVIEW OPERATIONS
// ============================================================

export async function createReview(review: ReviewInsert) {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (!error && data) {
    // Update aggregate rating
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', review.reviewee_id);

    if (allReviews) {
      const avg = allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length;
      await supabase
        .from('profiles')
        .update({ average_rating: Math.round(avg * 100) / 100, total_reviews: allReviews.length })
        .eq('id', review.reviewee_id);
    }
  }

  return { data: data as Review | null, error };
}

export async function getReviewsForUser(userId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });
  return { data: data ?? [], error };
}

export async function getReviewByContractAndReviewer(contractId: string, reviewerId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('contract_id', contractId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  return { data, error };
}

// ============================================================
// DISPUTE OPERATIONS
// ============================================================

export async function createDispute(dispute: DisputeInsert) {
  const { data, error } = await supabase
    .from('disputes')
    .insert(dispute)
    .select()
    .single();
  return { data: data as Dispute | null, error };
}

export async function getDisputes() {
  const { data, error } = await supabase
    .from('disputes')
    .select('*, contract:contracts(*, job:jobs(*), client:profiles!contracts_client_id_fkey(full_name), freelancer:profiles!contracts_freelancer_id_fkey(full_name)), raised:profiles!disputes_raised_by_fkey(full_name)')
    .order('created_at', { ascending: false });
  return { data: data ?? [], error };
}

export async function resolveDispute(disputeId: string, status: 'resolved_refund' | 'resolved_release', adminNotes: string, resolvedBy: string) {
  const { data, error } = await supabase
    .from('disputes')
    .update({ status, admin_notes: adminNotes, resolved_by: resolvedBy, updated_at: new Date().toISOString() })
    .eq('id', disputeId)
    .select()
    .single();

  if (!error && data) {
    // Update contract milestone if resolved
    if (status === 'resolved_refund') {
      if (data.milestone_id) {
        await supabase.from('milestones').update({ status: 'cancelled' }).eq('id', data.milestone_id);
      }
    } else if (status === 'resolved_release') {
      if (data.milestone_id) {
        await supabase.from('milestones').update({ status: 'approved' }).eq('id', data.milestone_id);
      }
    }
  }

  return { data: data as Dispute | null, error };
}

// ============================================================
// AI USAGE TRACKING
// ============================================================

export async function trackAIUsage(userId: string, action: string, tokens: number) {
  const { error } = await supabase
    .from('ai_usage')
    .insert({ user_id: userId, action, tokens_used: tokens });
  return { error };
}

export async function getAIUsageToday(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());
  return { count: count ?? 0, error };
}

export async function getAIUsageStats() {
  const { data, error } = await supabase
    .from('ai_usage')
    .select('user_id, action, tokens_used, created_at, user:profiles!ai_usage_user_id_fkey(full_name)');
  return { data: data ?? [], error };
}
