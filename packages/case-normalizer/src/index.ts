/**
 * Case Normalizer
 *
 * Takes UnifiedCase records from any source adapter and upserts them
 * into the database, de-duplicating and merging data from multiple sources.
 */

import { eq, and } from "drizzle-orm";
import { db, cases, deadlines } from "@class-action-os/db";
import type { UnifiedCase } from "@class-action-os/shared";

export interface NormalizationResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Upsert a batch of UnifiedCase records into the database.
 * De-duplicates on (source, source_id).
 */
export async function normalizeCases(
  incoming: UnifiedCase[]
): Promise<NormalizationResult> {
  const result: NormalizationResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const c of incoming) {
    try {
      // Check for existing record by source + source_id
      const existing = c.source_id
        ? await db
            .select()
            .from(cases)
            .where(
              and(
                eq(cases.source, c.source),
                eq(cases.sourceId, c.source_id)
              )
            )
            .limit(1)
        : [];

      if (existing.length > 0) {
        // Update existing record with newer data
        await db
          .update(cases)
          .set({
            caseName: c.case_name,
            status: c.status,
            claimDeadline: c.claim_deadline,
            optOutDeadline: c.opt_out_deadline,
            objectionDeadline: c.objection_deadline,
            estimatedPayout: c.estimated_payout,
            settlementAmount: c.settlement_amount?.toString() ?? null,
            eligibilityText: c.eligibility_text,
            claimUrl: c.claim_url,
            proofRequired: c.proof_required,
            aiScore: c.ai_score,
            extractionConfidence: c.extraction_confidence,
            aiSummary: c.ai_summary,
            rawText: c.raw_text,
            updatedAt: new Date(),
          })
          .where(eq(cases.id, existing[0].id));
        result.updated++;
      } else {
        // Insert new record
        const [inserted] = await db
          .insert(cases)
          .values({
            source: c.source,
            sourceId: c.source_id ?? null,
            sourceUrl: c.source_url ?? null,
            caseName: c.case_name,
            court: c.court ?? null,
            docketNumber: c.docket_number ?? null,
            filedDate: c.filed_date ?? null,
            updatedDate: c.updated_date ?? null,
            defendants: c.defendants,
            plaintiffs: c.plaintiffs ?? [],
            industry: c.industry ?? null,
            caseType: c.case_type,
            status: c.status,
            claimDeadline: c.claim_deadline ?? null,
            optOutDeadline: c.opt_out_deadline ?? null,
            objectionDeadline: c.objection_deadline ?? null,
            estimatedPayout: c.estimated_payout ?? null,
            settlementAmount: c.settlement_amount?.toString() ?? null,
            eligibilityText: c.eligibility_text ?? null,
            classDefinition: c.class_definition ?? null,
            classPeriodStart: c.class_period_start ?? null,
            classPeriodEnd: c.class_period_end ?? null,
            geographicRestrictions: c.geographic_restrictions ?? null,
            claimUrl: c.claim_url ?? null,
            proofRequired: c.proof_required ?? [],
            aiScore: c.ai_score,
            matchScore: c.match_score,
            extractionConfidence: c.extraction_confidence,
            documents: c.documents ?? [],
            rawText: c.raw_text ?? null,
            aiSummary: c.ai_summary ?? null,
          })
          .returning();

        // Also insert deadline records if we have them
        if (inserted) {
          await upsertDeadlines(inserted.id, c);
        }

        result.inserted++;
      }
    } catch (err) {
      result.errors.push(`${c.case_name}: ${(err as Error).message}`);
    }
  }

  return result;
}

async function upsertDeadlines(caseId: string, c: UnifiedCase): Promise<void> {
  const deadlineData: Array<{
    caseId: string;
    type: string;
    date: string;
    description: string | null;
  }> = [];

  if (c.claim_deadline) {
    deadlineData.push({
      caseId,
      type: "claim",
      date: c.claim_deadline,
      description: "Claim filing deadline",
    });
  }
  if (c.opt_out_deadline) {
    deadlineData.push({
      caseId,
      type: "opt_out",
      date: c.opt_out_deadline,
      description: "Opt-out deadline",
    });
  }
  if (c.objection_deadline) {
    deadlineData.push({
      caseId,
      type: "objection",
      date: c.objection_deadline,
      description: "Objection deadline",
    });
  }

  for (const dl of deadlineData) {
    // Avoid duplicate deadlines
    const existing = await db
      .select()
      .from(deadlines)
      .where(
        and(
          eq(deadlines.caseId, dl.caseId),
          eq(deadlines.type, dl.type),
          eq(deadlines.date, dl.date)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(deadlines).values(dl);
    }
  }
}

/**
 * Merge data from a secondary source into an existing case.
 */
export function mergeCaseData(
  primary: UnifiedCase,
  secondary: UnifiedCase
): UnifiedCase {
  return {
    ...primary,
    // Fill nulls from secondary
    claim_deadline: primary.claim_deadline ?? secondary.claim_deadline,
    opt_out_deadline: primary.opt_out_deadline ?? secondary.opt_out_deadline,
    settlement_amount: primary.settlement_amount ?? secondary.settlement_amount,
    eligibility_text: primary.eligibility_text ?? secondary.eligibility_text,
    claim_url: primary.claim_url ?? secondary.claim_url,
    ai_summary: primary.ai_summary ?? secondary.ai_summary,
    // Take higher confidence
    extraction_confidence: Math.max(
      primary.extraction_confidence,
      secondary.extraction_confidence
    ),
    // Merge documents
    documents: [
      ...new Set([...(primary.documents ?? []), ...(secondary.documents ?? [])]),
    ],
  };
}
