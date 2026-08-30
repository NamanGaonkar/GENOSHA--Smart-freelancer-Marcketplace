// ============================================================
// GENOSHA — TypeScript Database Types
// ============================================================

export type UserRole = 'client' | 'freelancer' | 'admin';
export type Availability = 'available' | 'busy' | 'unavailable';
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'expert';
export type BudgetType = 'fixed' | 'hourly' | 'weekly';
export type JobStatus = 'draft' | 'pending_approval' | 'open' | 'in_progress' | 'completed' | 'closed' | 'disabled' | 'flagged';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type ContractStatus = 'pending_deposit' | 'active' | 'under_review' | 'completed' | 'cancelled';
export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

// ── profiles ──────────────────────────────────────────────────
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  hourly_rate: number | null;
  availability: Availability;
  experience_level: ExperienceLevel | null;
  skills: string[];
  location: string | null;
  website: string | null;
  years_experience: number | null;
  languages: string | null;
  specialization: string | null;
  rate_type?: string;
  pricing_note?: string | null;
  weekly_schedule?: Record<string, { enabled: boolean; from: string; to: string }> | null;
  created_at: string;
  updated_at: string;
}

// ── categories ────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

// ── skills ────────────────────────────────────────────────────
export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  created_at: string;
}

// ── jobs ──────────────────────────────────────────────────────
export interface Job {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category_id: string | null;
  skills_required: string[];
  budget_type: BudgetType;
  budget_currency?: string;
  budget_min: number;
  budget_max: number;
  deadline: string | null;
  status: JobStatus;
  attachments: string[] | null;
  is_edited?: boolean;
  edited_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ── proposals ─────────────────────────────────────────────────
export interface Proposal {
  id: string;
  job_id: string;
  freelancer_id: string;
  bid_amount: number;
  delivery_days: number;
  cover_letter: string;
  status: ProposalStatus;
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

// ── contracts ─────────────────────────────────────────────────
export interface Contract {
  id: string;
  job_id: string;
  client_id: string;
  freelancer_id: string;
  proposal_id: string;
  status: ContractStatus;
  total_amount: number;
  budget_currency?: string;
  escrow_funded: boolean;
  submission_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── milestones ────────────────────────────────────────────────
export interface Milestone {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  amount: number;
  deadline: string | null;
  status: MilestoneStatus;
  deliverable_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── deliverables ──────────────────────────────────────────────
export interface Deliverable {
  id: string;
  milestone_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

// ── chat_rooms ───────────────────────────────────────────────
export interface ChatRoom {
  id: string;
  contract_id: string | null;
  name: string | null;
  is_archived: boolean;
  created_at: string;
}

// ── chat_room_members ────────────────────────────────────────
export interface ChatRoomMember {
  room_id: string;
  user_id: string;
  last_read_at: string;
}

// ── messages ─────────────────────────────────────────────────
export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  is_read: boolean;
  created_at: string;
}

// ── portfolio_items ──────────────────────────────────────────
export interface PortfolioItem {
  id: string;
  freelancer_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  external_link: string | null;
  created_at: string;
}

// ============================================================
// JOIN / EXTENDED TYPES (for views and joined queries)
// ============================================================

export interface JobWithClient extends Job {
  client: Profile;
  category: Category | null;
  proposal_count?: number;
}

export interface JobWithDetails extends Job {
  client: Profile;
  category: Category | null;
  proposals: Proposal[];
}

export interface ProposalWithFreelancer extends Proposal {
  freelancer: Profile;
}

export interface ContractWithDetails extends Contract {
  job: Job;
  client: Profile;
  freelancer: Profile;
  milestones: Milestone[];
}

export interface MessageWithSender extends Message {
  sender: Profile;
}

// ============================================================
// INSERT / UPDATE TYPES (for Supabase mutations)
// ============================================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & { location?: string | null; website?: string | null; years_experience?: number | null; languages?: string | null; specialization?: string | null };

export type CategoryInsert = Omit<Category, 'id' | 'created_at'>;
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'created_at'>>;

export type SkillInsert = Omit<Skill, 'id' | 'created_at'>;
export type SkillUpdate = Partial<Omit<Skill, 'id' | 'created_at'>>;

export type JobInsert = Omit<Job, 'id' | 'created_at' | 'updated_at' | 'attachments'> & { attachments?: string[] | null };
export type JobUpdate = Partial<Omit<Job, 'id' | 'client_id' | 'created_at' | 'updated_at'>>;

export type ProposalInsert = Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'attachments'> & { attachments?: string[] | null };
export type ProposalUpdate = Partial<Omit<Proposal, 'id' | 'freelancer_id' | 'job_id' | 'created_at' | 'updated_at'>>;

export type ContractInsert = Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'escrow_funded' | 'submission_notes'> & { escrow_funded?: boolean; submission_notes?: string | null };
export type ContractUpdate = Partial<Pick<Contract, 'status' | 'escrow_funded' | 'submission_notes'>>;

export type MilestoneInsert = Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'deliverable_url'> & { deliverable_url?: string | null };
export type MilestoneUpdate = Partial<Omit<Milestone, 'id' | 'contract_id' | 'created_at' | 'updated_at'>>;

export type DeliverableInsert = Omit<Deliverable, 'id' | 'created_at'>;

export type ChatRoomInsert = Omit<ChatRoom, 'id' | 'created_at'>;
export type ChatRoomMemberInsert = Omit<ChatRoomMember, 'last_read_at'>;

export type MessageInsert = Omit<Message, 'id' | 'created_at' | 'is_read' | 'attachment_url' | 'attachment_name'> & { attachment_url?: string | null; attachment_name?: string | null };
export type MessageUpdate = Partial<Pick<Message, 'is_read'>>;

export type PortfolioItemInsert = Omit<PortfolioItem, 'id' | 'created_at'>;
export type PortfolioItemUpdate = Partial<Omit<PortfolioItem, 'id' | 'freelancer_id' | 'created_at'>>;

// ── reviews ──────────────────────────────────────────────────
export interface Review {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  role: 'client_to_freelancer' | 'freelancer_to_client';
  created_at: string;
}
export type ReviewInsert = Omit<Review, 'id' | 'created_at'>;

// ── disputes ─────────────────────────────────────────────────
export interface Dispute {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  raised_by: string | null;
  reason: string;
  status: 'open' | 'under_review' | 'resolved_refund' | 'resolved_release';
  admin_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}
export type DisputeInsert = Omit<Dispute, 'id' | 'created_at' | 'updated_at'>;

// ── ai_usage ─────────────────────────────────────────────────
export interface AIUsage {
  id: string;
  user_id: string;
  action: string;
  tokens_used: number;
  created_at: string;
}
