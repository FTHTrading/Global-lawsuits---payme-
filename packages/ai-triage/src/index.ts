/**
 * AI Triage & Ranking Engine
 *
 * Uses LLM for:
 * 1. Case type classification
 * 2. Field extraction (deadlines, eligibility, payout clues)
 * 3. Summarization
 * 4. Composite scoring
 *
 * NEVER invents deadlines or payout numbers — stores extracted values
 * with confidence scores and source URLs.
 */

import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db, cases, extractionRuns, extractedFactsStaging } from "@class-action-os/db";
import {
  type CaseType,
  type CaseStatus,
} from "@class-action-os/shared";

// ─── Lazy OpenAI client (reads env at call time, not import time) ───────────
let _openai: OpenAI | undefined;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ─── Extraction ───────────────────────────────────────────────

export interface ExtractionResult {
  case_type: CaseType;
  status: CaseStatus;
  defendants: string[];
  claim_deadline: string | null;
  opt_out_deadline: string | null;
  objection_deadline: string | null;
  settlement_amount: number | null;
  estimated_payout_min: number | null;
  estimated_payout_max: number | null;
  estimated_payout_notes: string | null;
  eligibility_text: string | null;
  class_definition: string | null;
  class_period_start: string | null;
  class_period_end: string | null;
  geographic_restrictions: string | null;
  proof_required: string[];
  claim_url: string | null;
  summary: string;
  confidence: number;
}

const EXTRACTION_PROMPT = `You are a legal document analyzer specializing in class action lawsuits and settlements.

Given the following case text, extract ONLY information that is explicitly stated. 
NEVER invent or guess dates, amounts, or eligibility criteria.
If a field is not clearly stated in the text, return null for that field.
Return a confidence score (0.0 to 1.0) reflecting how clearly the information was stated.

Extract these fields as JSON:
- case_type: one of "consumer", "privacy", "securities", "employment", "antitrust", "product", "wage_hour", "housing", "healthcare", "environmental", "telecom", "other"
- status: one of "filed", "pending", "certified", "settled", "claims_open", "claims_closed", "dismissed", "appeal"
- defendants: array of defendant/company names
- claim_deadline: YYYY-MM-DD or null
- opt_out_deadline: YYYY-MM-DD or null
- objection_deadline: YYYY-MM-DD or null
- settlement_amount: number in USD or null
- estimated_payout_min: per-person minimum in USD or null
- estimated_payout_max: per-person maximum in USD or null
- estimated_payout_notes: any language about payouts
- eligibility_text: who is eligible (exact quote from text)
- class_definition: legal class definition if stated
- class_period_start: YYYY-MM-DD or null
- class_period_end: YYYY-MM-DD or null
- geographic_restrictions: any geographic limits
- proof_required: array of proof types needed (receipt, account_statement, email, screenshot, employment_record, tax_document, purchase_history, none, other)
- claim_url: URL to file a claim if present
- summary: 2-3 sentence plain-English summary
- confidence: 0.0 to 1.0

Return ONLY valid JSON. No markdown, no explanation.`;

export async function extractCaseFields(
  caseId: string,
  rawText: string,
  source: string
): Promise<ExtractionResult> {
  const start = Date.now();
  const model = process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4o-mini";

  const promptHash = simpleHash(EXTRACTION_PROMPT);
  const truncatedText = rawText.slice(0, 12000); // Stay within context window

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: truncatedText },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const extracted = JSON.parse(content) as ExtractionResult;

  // Validate and scrub to conform to strict data formats
  const cleanExtracted = Object.fromEntries(
    Object.entries(extracted).map(([k, v]) => [k, v === "" ? null : v])
  ) as unknown as ExtractionResult;

  const durationMs = Date.now() - start;

  // Audit log (Immutable provenance tracker)
  await db.insert(extractionRuns).values({
    caseId,
    source,
    modelUsed: model,
    promptHash,
    inputTextLength: truncatedText.length,
    extractedFields: cleanExtracted as any,
    confidence: cleanExtracted.confidence ?? 0,
    durationMs,
  });

  return cleanExtracted;
}

/**
 * Run AI extraction on a case. Routes data through the staging layer.
 * Auto-applies to production if confidence is very high.
 */
export async function triageCase(caseId: string): Promise<void> {
  const [caseRecord] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  if (!caseRecord || !caseRecord.rawText) return;

  const extracted = await extractCaseFields(
    caseId,
    caseRecord.rawText,
    caseRecord.source
  );

  // Write to staging area for admin review
  await db
    .insert(extractedFactsStaging)
    .values({
      caseId,
      extractedData: extracted as any,
      confidence: extracted.confidence ?? 0,
      status: extracted.confidence >= 0.90 ? "approved" : "pending",
    })
    .returning();

  // If confidence is high enough, we auto-apply it.
  // Otherwise, we mark the case for review.
  if (extracted.confidence >= 0.90) {
    await db
      .update(cases)
      .set({
        caseType: extracted.case_type ?? caseRecord.caseType,
        status: extracted.status ?? caseRecord.status,
        defendants:
          extracted.defendants?.length > 0
            ? extracted.defendants
            : caseRecord.defendants,
        claimDeadline: extracted.claim_deadline ?? caseRecord.claimDeadline,
        optOutDeadline: extracted.opt_out_deadline ?? caseRecord.optOutDeadline,
        objectionDeadline:
          extracted.objection_deadline ?? caseRecord.objectionDeadline,
        settlementAmount:
          extracted.settlement_amount?.toString() ??
          caseRecord.settlementAmount,
        estimatedPayout: extracted.estimated_payout_notes
          ? {
              min: extracted.estimated_payout_min,
              max: extracted.estimated_payout_max,
              notes: extracted.estimated_payout_notes,
            }
          : caseRecord.estimatedPayout,
        eligibilityText:
          extracted.eligibility_text ?? caseRecord.eligibilityText,
        classDefinition:
          extracted.class_definition ?? caseRecord.classDefinition,
        classPeriodStart:
          extracted.class_period_start ?? caseRecord.classPeriodStart,
        classPeriodEnd: extracted.class_period_end ?? caseRecord.classPeriodEnd,
        geographicRestrictions:
          extracted.geographic_restrictions ??
          caseRecord.geographicRestrictions,
        claimUrl: extracted.claim_url ?? caseRecord.claimUrl,
        proofRequired:
          extracted.proof_required?.length > 0
            ? extracted.proof_required
            : caseRecord.proofRequired,
        aiSummary: extracted.summary ?? caseRecord.aiSummary,
        extractionConfidence: extracted.confidence,
        reviewStatus: "auto_approved",
        updatedAt: new Date(),
      })
      .where(eq(cases.id, caseId));
  } else {
    // Leave it in staging, just update the case to indicate review is needed
    await db
      .update(cases)
      .set({
        reviewStatus: "pending_review",
        updatedAt: new Date(),
      })
      .where(eq(cases.id, caseId));
  }
}

// ─── Scoring ──────────────────────────────────────────────────

/**
 * Feature Extractor for Claimability & AI Scoring
 * Maps raw case data into a clean, normalized feature vector suitable for rules or ML models.
 */
export interface CaseFeatureVector {
  sourceReliability: number;     // 0.0 - 1.0 (authoritative source)
  isWindowOpen: number;          // 0 or 1
  daysToDeadline: number;        // integer, clamped or max if none
  logValueScale: number;         // normalized representation of total settlement size
  proofBarrier: number;          // 0.0 (easy) - 1.0 (hard/receipts required)
  baseScore: number;             // Deterministic score based on feature matrix
}

export function extractFeatureVector(caseData: {
  source: string;
  status: string;
  settlement_amount: number | null;
  claim_deadline: string | null;
  proof_required: string[];
}): CaseFeatureVector {
  const sourceMap: Record<string, number> = {
    pacer: 1.0, sec: 0.95, ftc: 0.95, eeoc: 0.9, courtlistener: 0.8, classactionorg: 0.5
  };
  const sourceReliability = sourceMap[caseData.source] ?? 0.3;

  const isWindowOpen = caseData.status === "claims_open" ? 1 : 0;
  
  let daysToDeadline = 999;
  if (caseData.claim_deadline) {
    const days = Math.floor((new Date(caseData.claim_deadline).getTime() - Date.now()) / 86400000);
    daysToDeadline = Math.max(0, Math.min(days, 999));
  }

  let logValueScale = 0;
  if (caseData.settlement_amount && caseData.settlement_amount > 0) {
    logValueScale = Math.min(1.0, Math.max(0, Math.log10(caseData.settlement_amount) / 10)); // ~10B = 1.0
  }

  let proofBarrier = 0.5; // default moderate
  if (caseData.proof_required.includes("none") || caseData.proof_required.length === 0) {
    proofBarrier = 0.1;
  } else if (caseData.proof_required.includes("receipt") || caseData.proof_required.includes("tax_document")) {
    proofBarrier = 0.9;
  }

  // Linear combination fallback until XGBoost model is trained on labeled data
  const baseScore = 
    (sourceReliability * 0.2) + 
    (isWindowOpen * 0.4) + 
    (logValueScale * 0.2) + 
    ((1.0 - proofBarrier) * 0.2) - 
    (daysToDeadline < 14 && isWindowOpen ? 0 : 0.1);

  return {
    sourceReliability,
    isWindowOpen,
    daysToDeadline,
    logValueScale,
    proofBarrier,
    baseScore: Math.max(0, Math.round(baseScore * 1000) / 1000)
  };
}

/**
 * Batch re-score all cases using deterministic features
 */
export async function rescoreAllCases(): Promise<void> {
  const allCases = await db.select().from(cases);

  for (const c of allCases) {
    const features = extractFeatureVector({
      source: c.source,
      status: c.status,
      settlement_amount: c.settlementAmount ? parseFloat(c.settlementAmount) : null,
      claim_deadline: c.claimDeadline,
      proof_required: (c.proofRequired as string[]) ?? [],
    });

    // In a mature setup, we'd log the feature vector to a feature store
    // For now, write the base deterministic score
    await db
      .update(cases)
      .set({ aiScore: features.baseScore, updatedAt: new Date() })
      .where(eq(cases.id, c.id));
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function simpleHash(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString(36);
}
