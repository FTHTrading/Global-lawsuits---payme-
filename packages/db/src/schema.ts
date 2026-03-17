import {
  pgTable,
  text,
  varchar,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  uuid,
  index,
  real,
} from "drizzle-orm/pg-core";

// ─── Cases ────────────────────────────────────────────────────

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 32 }).notNull(),
    sourceId: text("source_id"),
    sourceUrl: text("source_url"),

    caseName: text("case_name").notNull(),
    court: text("court"),
    docketNumber: text("docket_number"),

    filedDate: varchar("filed_date", { length: 10 }),
    updatedDate: varchar("updated_date", { length: 10 }),

    defendants: jsonb("defendants").$type<string[]>().default([]),
    plaintiffs: jsonb("plaintiffs").$type<string[]>().default([]),

    industry: text("industry"),
    caseType: varchar("case_type", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),

    claimDeadline: varchar("claim_deadline", { length: 10 }),
    optOutDeadline: varchar("opt_out_deadline", { length: 10 }),
    objectionDeadline: varchar("objection_deadline", { length: 10 }),

    estimatedPayout: jsonb("estimated_payout"),
    settlementAmount: numeric("settlement_amount"),

    eligibilityText: text("eligibility_text"),
    classDefinition: text("class_definition"),
    classPeriodStart: varchar("class_period_start", { length: 10 }),
    classPeriodEnd: varchar("class_period_end", { length: 10 }),
    geographicRestrictions: text("geographic_restrictions"),

    claimUrl: text("claim_url"),
    proofRequired: jsonb("proof_required").$type<string[]>().default([]),

    aiScore: real("ai_score").default(0),
    matchScore: real("match_score").default(0),
    extractionConfidence: real("extraction_confidence").default(0),

    documents: jsonb("documents").$type<string[]>().default([]),
    rawText: text("raw_text"),
    aiSummary: text("ai_summary"),
    adminNotes: text("admin_notes"),
    reviewStatus: varchar("review_status", { length: 32 }).default("unreviewed"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    sourceIdx: index("cases_source_idx").on(table.source),
    statusIdx: index("cases_status_idx").on(table.status),
    caseTypeIdx: index("cases_case_type_idx").on(table.caseType),
    claimDeadlineIdx: index("cases_claim_deadline_idx").on(table.claimDeadline),
    aiScoreIdx: index("cases_ai_score_idx").on(table.aiScore),
    sourceIdIdx: index("cases_source_id_idx").on(table.source, table.sourceId),
  })
);

// ─── Case Documents ──────────────────────────────────────────

export const caseDocuments = pgTable("case_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title"),
  documentType: varchar("document_type", { length: 64 }),
  sourceUrl: text("source_url"),
  storagePath: text("storage_path"),
  extractedText: text("extracted_text"),
  mimeType: varchar("mime_type", { length: 128 }),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Deadlines ───────────────────────────────────────────────

export const deadlines = pgTable(
  "deadlines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .references(() => cases.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 32 }).notNull(), // claim, opt_out, objection, hearing, other
    date: varchar("date", { length: 10 }).notNull(),
    description: text("description"),
    notified: boolean("notified").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index("deadlines_date_idx").on(table.date),
  })
);

// ─── User Profiles ───────────────────────────────────────────

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalAuthId: text("external_auth_id").unique(),
  displayName: text("display_name"),
  emailAddresses: jsonb("email_addresses").$type<string[]>().default([]),
  phoneNumbers: jsonb("phone_numbers").$type<string[]>().default([]),
  mailingAddresses: jsonb("mailing_addresses").default([]),
  merchants: jsonb("merchants").$type<string[]>().default([]),
  products: jsonb("products").$type<string[]>().default([]),
  brokerages: jsonb("brokerages").$type<string[]>().default([]),
  employers: jsonb("employers").default([]),
  uploadedEvidence: jsonb("uploaded_evidence").$type<string[]>().default([]),
  mode: varchar("mode", { length: 32 }).default("personal"), // personal, business, institutional
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Entities (companies, products, merchants for matching) ──

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().default([]),
    type: varchar("type", { length: 32 }).notNull(), // company, product, merchant, employer
    industry: text("industry"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("entities_name_idx").on(table.name),
  })
);

// ─── Possible Matches ───────────────────────────────────────

export const possibleMatches = pgTable(
  "possible_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .references(() => cases.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => userProfiles.id, { onDelete: "cascade" })
      .notNull(),
    confidence: varchar("confidence", { length: 16 }).notNull(), // high, medium, low, manual
    matchReasons: jsonb("match_reasons").$type<string[]>().default([]),
    matchScore: real("match_score").default(0),
    matchedFields: jsonb("matched_fields").$type<string[]>().default([]),
    dismissed: boolean("dismissed").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("matches_user_idx").on(table.userId),
    caseIdx: index("matches_case_idx").on(table.caseId),
  })
);

// ─── Claims ─────────────────────────────────────────────────

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .references(() => cases.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  status: varchar("status", { length: 32 }).notNull(), // identified, preparing, ready_to_file, filed, etc
  claimUrl: text("claim_url"),
  prefilledData: jsonb("prefilled_data"),
  evidenceFiles: jsonb("evidence_files").$type<string[]>().default([]),
  notes: text("notes"),
  filedAt: timestamp("filed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Extraction Facts Staging (Admin Review Queue) ────────

export const extractedFactsStaging = pgTable("extracted_facts_staging", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }).notNull(),
  extractedData: jsonb("extracted_data").notNull(),
  confidence: real("confidence").notNull(),
  status: varchar("status", { length: 32 }).default("pending"), // pending, approved, rejected
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Extraction Runs (audit log) ─────────────────────────────

export const extractionRuns = pgTable("extraction_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  source: varchar("source", { length: 32 }).notNull(),
  modelUsed: text("model_used"),
  promptHash: text("prompt_hash"),
  inputTextLength: integer("input_text_length"),
  extractedFields: jsonb("extracted_fields"),
  confidence: real("confidence").default(0),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Source Sync Runs ────────────────────────────────────────

export const sourceSyncRuns = pgTable("source_sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: varchar("source", { length: 32 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  casesFound: integer("cases_found").default(0),
  casesNew: integer("cases_new").default(0),
  casesUpdated: integer("cases_updated").default(0),
  errors: integer("errors").default(0),
  errorDetails: jsonb("error_details").$type<string[]>().default([]),
  status: varchar("status", { length: 16 }).notNull(), // running, completed, failed
});

// ─── Notifications ──────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userProfiles.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    read: boolean("read").default(false),
    sentVia: jsonb("sent_via").$type<string[]>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
  })
);
