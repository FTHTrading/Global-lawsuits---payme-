/**
 * Claimability Engine
 *
 * Detects where each case sits in its lifecycle and whether
 * a claim action is currently possible.
 *
 * Status progression:
 *   filed → pending → certified → settled → claims_open → claims_closed
 *   (or: filed → dismissed / appeal at any point)
 */

import { eq, and, gte, lte } from "drizzle-orm";
import { db, cases } from "@class-action-os/db";
import type { CaseStatus } from "@class-action-os/shared";

export interface ClaimabilityAssessment {
  caseId: string;
  status: CaseStatus;
  claimable: boolean;
  claimWindowOpen: boolean;
  daysUntilDeadline: number | null;
  urgency: "critical" | "high" | "medium" | "low" | "none";
  reason: string;
}

/**
 * Assess whether a case is currently claimable.
 */
export function assessClaimability(caseRecord: {
  id: string;
  status: string;
  claimDeadline: string | null;
  optOutDeadline: string | null;
  claimUrl: string | null;
}): ClaimabilityAssessment {
  const now = new Date();
  const status = caseRecord.status as CaseStatus;

  // Calculate days until claim deadline
  let daysUntilDeadline: number | null = null;
  if (caseRecord.claimDeadline) {
    const deadline = new Date(caseRecord.claimDeadline);
    daysUntilDeadline = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Determine if claim window is open
  const claimWindowOpen =
    status === "claims_open" &&
    (daysUntilDeadline === null || daysUntilDeadline > 0);

  // Determine urgency
  let urgency: ClaimabilityAssessment["urgency"] = "none";
  if (claimWindowOpen) {
    if (daysUntilDeadline !== null && daysUntilDeadline <= 3) urgency = "critical";
    else if (daysUntilDeadline !== null && daysUntilDeadline <= 7) urgency = "high";
    else if (daysUntilDeadline !== null && daysUntilDeadline <= 30) urgency = "medium";
    else urgency = "low";
  }

  // Determine if claimable
  const claimable =
    claimWindowOpen ||
    (status === "settled" && caseRecord.claimUrl !== null);

  // Build reason
  let reason: string;
  if (status === "claims_closed") {
    reason = "Claims window has closed";
  } else if (status === "dismissed") {
    reason = "Case was dismissed";
  } else if (status === "claims_open" && daysUntilDeadline !== null && daysUntilDeadline <= 0) {
    reason = "Claim deadline has passed";
  } else if (claimWindowOpen) {
    reason =
      daysUntilDeadline !== null
        ? `Claims open — ${daysUntilDeadline} days remaining`
        : "Claims window is open (no deadline found)";
  } else if (status === "settled") {
    reason = "Settlement reached — monitoring for claims opening";
  } else if (status === "certified") {
    reason = "Class certified — awaiting settlement or trial";
  } else {
    reason = `Case is ${status} — not yet claimable`;
  }

  return {
    caseId: caseRecord.id,
    status,
    claimable,
    claimWindowOpen,
    daysUntilDeadline,
    urgency,
    reason,
  };
}

/**
 * Get all currently claimable cases.
 */
export async function getClaimableCases(): Promise<ClaimabilityAssessment[]> {
  const openCases = await db
    .select()
    .from(cases)
    .where(eq(cases.status, "claims_open"));

  return openCases
    .map((c) => assessClaimability(c))
    .filter((a) => a.claimable)
    .sort((a, b) => {
      // Sort by urgency
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
}

/**
 * Get cases approaching their deadlines within N days.
 */
export async function getApproachingDeadlines(
  withinDays = 30
): Promise<ClaimabilityAssessment[]> {
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(
    Date.now() + withinDays * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  const approaching = await db
    .select()
    .from(cases)
    .where(
      and(
        gte(cases.claimDeadline, today),
        lte(cases.claimDeadline, futureDate)
      )
    );

  return approaching.map((c) => assessClaimability(c));
}
