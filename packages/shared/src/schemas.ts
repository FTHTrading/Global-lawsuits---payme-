import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────

export const CaseSource = z.enum([
  "courtlistener",
  "pacer",
  "sec",
  "ftc",
  "eeoc",
  "classactionorg",
  "manual",
]);
export type CaseSource = z.infer<typeof CaseSource>;

export const CaseType = z.enum([
  "consumer",
  "privacy",
  "securities",
  "employment",
  "antitrust",
  "product",
  "wage_hour",
  "housing",
  "healthcare",
  "environmental",
  "telecom",
  "other",
]);
export type CaseType = z.infer<typeof CaseType>;

export const CaseStatus = z.enum([
  "filed",
  "pending",
  "certified",
  "settled",
  "claims_open",
  "claims_closed",
  "dismissed",
  "appeal",
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

export const ProofType = z.enum([
  "receipt",
  "account_statement",
  "email",
  "screenshot",
  "employment_record",
  "tax_document",
  "purchase_history",
  "none",
  "other",
]);
export type ProofType = z.infer<typeof ProofType>;

export const ClaimStatus = z.enum([
  "identified",
  "preparing",
  "ready_to_file",
  "filed",
  "acknowledged",
  "approved",
  "denied",
  "paid",
]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const MatchConfidence = z.enum(["high", "medium", "low", "manual"]);
export type MatchConfidence = z.infer<typeof MatchConfidence>;

// ─── Estimated Payout ─────────────────────────────────────────

export const EstimatedPayoutSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  notes: z.string().nullable(),
});
export type EstimatedPayout = z.infer<typeof EstimatedPayoutSchema>;

// ─── Unified Case Schema ─────────────────────────────────────

export const UnifiedCaseSchema = z.object({
  case_id: z.string(),
  source: CaseSource,
  source_id: z.string().nullable().optional(),
  source_url: z.string().url().nullable().optional(),

  case_name: z.string(),
  court: z.string().nullable().optional(),
  docket_number: z.string().nullable().optional(),

  filed_date: z.string().nullable().optional(), // YYYY-MM-DD
  updated_date: z.string().nullable().optional(),

  defendants: z.array(z.string()),
  plaintiffs: z.array(z.string()).optional(),

  industry: z.string().nullable().optional(),
  case_type: CaseType,
  status: CaseStatus,

  claim_deadline: z.string().nullable().optional(),
  opt_out_deadline: z.string().nullable().optional(),
  objection_deadline: z.string().nullable().optional(),

  estimated_payout: EstimatedPayoutSchema.nullable().optional(),
  settlement_amount: z.number().nullable().optional(),

  eligibility_text: z.string().nullable().optional(),
  class_definition: z.string().nullable().optional(),
  class_period_start: z.string().nullable().optional(),
  class_period_end: z.string().nullable().optional(),
  geographic_restrictions: z.string().nullable().optional(),

  claim_url: z.string().nullable().optional(),
  proof_required: z.array(ProofType).optional(),

  ai_score: z.number().min(0).max(1).default(0),
  match_score: z.number().min(0).max(1).default(0),
  extraction_confidence: z.number().min(0).max(1).default(0),

  documents: z.array(z.string()).optional(),
  raw_text: z.string().nullable().optional(),

  ai_summary: z.string().nullable().optional(),
  admin_notes: z.string().nullable().optional(),
});
export type UnifiedCase = z.infer<typeof UnifiedCaseSchema>;

// ─── User Profile ─────────────────────────────────────────────

export const UserProfileSchema = z.object({
  id: z.string(),
  email_addresses: z.array(z.string()),
  phone_numbers: z.array(z.string()),
  mailing_addresses: z.array(
    z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default("US"),
    })
  ),
  merchants: z.array(z.string()), // e.g. ["Amazon", "Google", "Meta"]
  products: z.array(z.string()), // product names or categories
  brokerages: z.array(z.string()),
  employers: z.array(
    z.object({
      name: z.string(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    })
  ),
  uploaded_evidence: z.array(z.string()), // file references
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ─── Match Result ─────────────────────────────────────────────

export const MatchResultSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  user_id: z.string(),
  confidence: MatchConfidence,
  match_reasons: z.array(z.string()),
  match_score: z.number().min(0).max(1),
  matched_fields: z.array(z.string()), // which user fields matched
  created_at: z.string(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

// ─── Claim Packet ─────────────────────────────────────────────

export const ClaimPacketSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  user_id: z.string(),
  status: ClaimStatus,
  claim_url: z.string().nullable(),
  prefilled_data: z.record(z.string(), z.unknown()).nullable(),
  evidence_files: z.array(z.string()),
  notes: z.string().nullable(),
  filed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ClaimPacket = z.infer<typeof ClaimPacketSchema>;

// ─── Deadline ─────────────────────────────────────────────────

export const DeadlineSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  type: z.enum(["claim", "opt_out", "objection", "hearing", "other"]),
  date: z.string(),
  description: z.string().nullable(),
  notified: z.boolean().default(false),
});
export type Deadline = z.infer<typeof DeadlineSchema>;

// ─── Extraction Run (audit) ──────────────────────────────────

export const ExtractionRunSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  source: CaseSource,
  model_used: z.string().nullable(),
  prompt_hash: z.string().nullable(),
  input_text_length: z.number(),
  extracted_fields: z.record(z.string(), z.unknown()),
  confidence: z.number().min(0).max(1),
  duration_ms: z.number(),
  created_at: z.string(),
});
export type ExtractionRun = z.infer<typeof ExtractionRunSchema>;

// ─── Source Sync Run ──────────────────────────────────────────

export const SourceSyncRunSchema = z.object({
  id: z.string(),
  source: CaseSource,
  started_at: z.string(),
  completed_at: z.string().nullable(),
  cases_found: z.number(),
  cases_new: z.number(),
  cases_updated: z.number(),
  errors: z.number(),
  error_details: z.array(z.string()).optional(),
  status: z.enum(["running", "completed", "failed"]),
});
export type SourceSyncRun = z.infer<typeof SourceSyncRunSchema>;

// ─── Notification ─────────────────────────────────────────────

export const NotificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.enum(["deadline_reminder", "new_match", "claim_update", "system"]),
  title: z.string(),
  body: z.string(),
  case_id: z.string().nullable(),
  read: z.boolean().default(false),
  sent_via: z.array(z.enum(["email", "sms", "push", "in_app"])),
  created_at: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ─── Scoring ──────────────────────────────────────────────────

export interface ScoringWeights {
  sourceConfidence: number;
  claimOpenWeight: number;
  estimatedPayoutWeight: number;
  userMatchWeight: number;
  deadlineUrgency: number;
  proofEase: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  sourceConfidence: 0.15,
  claimOpenWeight: 0.25,
  estimatedPayoutWeight: 0.2,
  userMatchWeight: 0.25,
  deadlineUrgency: 0.1,
  proofEase: 0.05,
};
