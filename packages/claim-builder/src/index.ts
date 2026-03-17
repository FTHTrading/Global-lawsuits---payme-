/**
 * Claim Builder
 *
 * Prepares claim packets for users — prefills available data,
 * identifies required evidence, and generates filing checklists.
 *
 * This is a "claim-prep copilot" — it DOES NOT auto-file claims.
 * Many claims require sworn information, manual attestations,
 * uploaded proof, and identity confirmation.
 */

import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import { db, cases, claims, userProfiles } from "@class-action-os/db";
import type { ClaimStatus } from "@class-action-os/shared";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ClaimPacketData {
  caseId: string;
  caseName: string;
  claimUrl: string | null;
  status: ClaimStatus;
  prefilledFields: Record<string, string>;
  requiredEvidence: string[];
  checklist: string[];
  warnings: string[];
  estimatedTimeMinutes: number;
}

/**
 * Generate a claim preparation packet for a user + case combination.
 */
export async function buildClaimPacket(
  userId: string,
  caseId: string
): Promise<ClaimPacketData> {
  const [caseRecord] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  const [user] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  if (!caseRecord || !user) {
    throw new Error("Case or user not found");
  }

  // Prefill from user profile
  const emails = (user.emailAddresses as string[]) ?? [];
  const phones = (user.phoneNumbers as string[]) ?? [];
  const addresses = (user.mailingAddresses as any[]) ?? [];
  const primaryAddress = addresses[0];

  const prefilledFields: Record<string, string> = {
    ...(emails[0] ? { email: emails[0] } : {}),
    ...(phones[0] ? { phone: phones[0] } : {}),
    ...(user.displayName ? { full_name: user.displayName } : {}),
    ...(primaryAddress
      ? {
          street_address: primaryAddress.street,
          city: primaryAddress.city,
          state: primaryAddress.state,
          zip_code: primaryAddress.zip,
          country: primaryAddress.country,
        }
      : {}),
  };

  // Determine required evidence
  const proofRequired = (caseRecord.proofRequired as string[]) ?? [];
  const requiredEvidence = proofRequired
    .filter((p) => p !== "none")
    .map((p) => {
      const labels: Record<string, string> = {
        receipt: "Purchase receipt or order confirmation",
        account_statement: "Bank or account statement showing relevant transactions",
        email: "Email correspondence related to the product/service",
        screenshot: "Screenshot of the product, account, or issue",
        employment_record: "Employment records (pay stubs, offer letter, W-2)",
        tax_document: "Tax documents (W-2, 1099, tax return)",
        purchase_history: "Purchase history export (Amazon, etc.)",
        other: "Additional supporting documentation",
      };
      return labels[p] ?? p;
    });

  // Build checklist
  const checklist = generateChecklist(caseRecord, proofRequired);

  // Warnings
  const warnings: string[] = [];
  if (caseRecord.claimDeadline) {
    const daysLeft = Math.ceil(
      (new Date(caseRecord.claimDeadline).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 7) {
      warnings.push(
        `⚠️ URGENT: Claim deadline is ${caseRecord.claimDeadline} — only ${daysLeft} days remaining!`
      );
    } else if (daysLeft <= 30) {
      warnings.push(
        `Claim deadline: ${caseRecord.claimDeadline} (${daysLeft} days remaining)`
      );
    }
  }
  if (!caseRecord.claimUrl) {
    warnings.push(
      "No claim URL found — you may need to search for the official claim form"
    );
  }
  warnings.push(
    "This is automated assistance — verify all information before submitting"
  );
  warnings.push(
    "Most claim forms require a sworn attestation — review carefully"
  );

  // Estimate time
  const estimatedTimeMinutes = estimateFilingTime(proofRequired, caseRecord);

  // Save/update claim record
  const existingClaim = await db
    .select()
    .from(claims)
    .where(
      and(eq(claims.caseId, caseId), eq(claims.userId, userId))
    )
    .limit(1);

  if (existingClaim.length === 0) {
    await db.insert(claims).values({
      caseId,
      userId,
      status: "preparing",
      claimUrl: caseRecord.claimUrl,
      prefilledData: prefilledFields,
      evidenceFiles: [],
      notes: null,
    });
  }

  return {
    caseId,
    caseName: caseRecord.caseName,
    claimUrl: caseRecord.claimUrl,
    status: "preparing",
    prefilledFields,
    requiredEvidence,
    checklist,
    warnings,
    estimatedTimeMinutes,
  };
}

/**
 * Use AI to generate a customized filing guidance based on case details.
 */
export async function generateFilingGuidance(
  caseId: string
): Promise<string> {
  const [caseRecord] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  if (!caseRecord) throw new Error("Case not found");

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a legal research assistant helping someone prepare to file a class action claim. 
  Provide clear, actionable guidance. Be factual — never invent deadlines or requirements. 
  If information is uncertain, say so explicitly.`,
      },
      {
        role: "user",
        content: `Help me prepare to file a claim for this case:

Case: ${caseRecord.caseName}
Status: ${caseRecord.status}
Defendants: ${(caseRecord.defendants as string[])?.join(", ") ?? "Unknown"}
Eligibility: ${caseRecord.eligibilityText ?? "Not specified"}
Proof Required: ${(caseRecord.proofRequired as string[])?.join(", ") ?? "Unknown"}
Claim Deadline: ${caseRecord.claimDeadline ?? "Not specified"}
Claim URL: ${caseRecord.claimUrl ?? "Not available"}
Settlement Amount: ${caseRecord.settlementAmount ?? "Not specified"}

Provide:
1. Step-by-step filing instructions
2. What evidence to gather
3. Common mistakes to avoid
4. Timeline recommendation`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content ?? "Unable to generate guidance.";
}

/**
 * Update claim status.
 */
export async function updateClaimStatus(
  claimId: string,
  status: ClaimStatus,
  notes?: string
): Promise<void> {
  await db
    .update(claims)
    .set({
      status,
      ...(notes ? { notes } : {}),
      ...(status === "filed" ? { filedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(claims.id, claimId));
}

// ─── Helpers ──────────────────────────────────────────────────

function generateChecklist(
  caseRecord: typeof cases.$inferSelect,
  proofRequired: string[]
): string[] {
  const checklist: string[] = [];

  checklist.push("☐ Read the full settlement notice");
  checklist.push("☐ Verify you meet the eligibility requirements");

  if (proofRequired.length > 0 && !proofRequired.includes("none")) {
    checklist.push("☐ Gather required evidence/documentation");
    for (const proof of proofRequired) {
      if (proof !== "none" && proof !== "other") {
        checklist.push(`  ☐ Locate: ${proof.replace(/_/g, " ")}`);
      }
    }
  }

  if (caseRecord.claimUrl) {
    checklist.push("☐ Visit the official claim form website");
  }

  checklist.push("☐ Complete all required fields on the claim form");
  checklist.push("☐ Review all information for accuracy");
  checklist.push("☐ Submit before the deadline");
  checklist.push("☐ Save confirmation/receipt of submission");

  if (caseRecord.optOutDeadline) {
    checklist.push(
      `☐ Review opt-out option (deadline: ${caseRecord.optOutDeadline})`
    );
  }

  return checklist;
}

function estimateFilingTime(
  proofRequired: string[],
  caseRecord: typeof cases.$inferSelect
): number {
  let minutes = 10; // Base time for simple claim
  const hasProof = proofRequired.length > 0 && !proofRequired.includes("none");
  if (hasProof) minutes += proofRequired.length * 10;
  if (caseRecord.caseType === "securities") minutes += 15;
  if (caseRecord.caseType === "employment") minutes += 20;
  return minutes;
}
