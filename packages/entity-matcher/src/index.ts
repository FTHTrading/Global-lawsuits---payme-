/**
 * Entity Matcher
 *
 * Matches cases against user profiles to find potential claims.
 * Checks:
 * - Defendants against user's merchants, products, employers, brokerages
 * - Geographic eligibility
 * - Class period overlap with employment/account history
 * - Case type relevance
 */

import { eq } from "drizzle-orm";
import {
  db,
  cases,
  userProfiles,
  entities,
  possibleMatches,
} from "@class-action-os/db";
import type { MatchConfidence } from "@class-action-os/shared";

export interface MatchCandidate {
  caseId: string;
  userId: string;
  confidence: MatchConfidence;
  matchScore: number;
  matchReasons: string[];
  matchedFields: string[];
}

/**
 * Run matching for a specific user against all open/relevant cases.
 */
export async function matchCasesForUser(userId: string): Promise<MatchCandidate[]> {
  const [user] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  if (!user) return [];

  // Get all cases that might be relevant (not dismissed/closed)
  // Get all cases — we'll filter by status in code below
  const activeCases = await db
    .select()
    .from(cases);

  // Get all known entities for alias matching
  const allEntities = await db.select().from(entities);
  const entityAliasMap = buildAliasMap(allEntities);

  const matches: MatchCandidate[] = [];

  for (const c of activeCases) {
    if (c.status === "dismissed" || c.status === "claims_closed") continue;

    const match = evaluateMatch(user, c, entityAliasMap);
    if (match.matchScore > 0.1) {
      matches.push(match);
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  // Save matches to DB
  for (const m of matches) {
    // Check if match already exists
    const existing = await db
      .select()
      .from(possibleMatches)
      .where(
        eq(possibleMatches.caseId, m.caseId)
      )
      .limit(1);

    const alreadyMatched = existing.find(
      (e) => e.userId === m.userId && e.caseId === m.caseId
    );

    if (!alreadyMatched) {
      await db.insert(possibleMatches).values({
        caseId: m.caseId,
        userId: m.userId,
        confidence: m.confidence,
        matchReasons: m.matchReasons,
        matchScore: m.matchScore,
        matchedFields: m.matchedFields,
      });
    }
  }

  return matches;
}

/**
 * Run matching for all users.
 */
export async function matchAllUsers(): Promise<number> {
  const users = await db.select().from(userProfiles);
  let totalMatches = 0;

  for (const user of users) {
    const matches = await matchCasesForUser(user.id);
    totalMatches += matches.length;
  }

  return totalMatches;
}

// ─── Core matching logic ─────────────────────────────────────

function evaluateMatch(
  user: typeof userProfiles.$inferSelect,
  caseRecord: typeof cases.$inferSelect,
  entityAliasMap: Map<string, string[]>
): MatchCandidate {
  const matchReasons: string[] = [];
  const matchedFields: string[] = [];
  let score = 0;

  const defendants = (caseRecord.defendants as string[]) ?? [];
  const userMerchants = (user.merchants as string[]) ?? [];
  const userProducts = (user.products as string[]) ?? [];
  const userBrokerages = (user.brokerages as string[]) ?? [];
  const userEmployers = ((user.employers as any[]) ?? []).map(
    (e: any) => e.name
  );

  // 1. Direct defendant match against merchants
  for (const defendant of defendants) {
    const defLower = defendant.toLowerCase();
    for (const merchant of userMerchants) {
      if (
        defLower.includes(merchant.toLowerCase()) ||
        merchant.toLowerCase().includes(defLower)
      ) {
        score += 0.3;
        matchReasons.push(`Defendant "${defendant}" matches merchant "${merchant}"`);
        matchedFields.push("merchants");
        break;
      }
    }
  }

  // 2. Entity alias matching (resolves "Meta" → "Facebook", "Instagram", etc.)
  for (const defendant of defendants) {
    const defLower = defendant.toLowerCase();
    for (const [canonical, aliases] of entityAliasMap.entries()) {
      if (
        aliases.some(
          (a) =>
            defLower.includes(a.toLowerCase()) ||
            a.toLowerCase().includes(defLower)
        )
      ) {
        // Check if user has any of this entity's aliases
        const userAllNames = [
          ...userMerchants,
          ...userProducts,
          ...userBrokerages,
          ...userEmployers,
        ];
        for (const alias of aliases) {
          if (
            userAllNames.some(
              (u) =>
                u.toLowerCase().includes(alias.toLowerCase()) ||
                alias.toLowerCase().includes(u.toLowerCase())
            )
          ) {
            score += 0.25;
            matchReasons.push(
              `Defendant "${defendant}" (entity: ${canonical}) matches user profile`
            );
            matchedFields.push("entities");
            break;
          }
        }
        break;
      }
    }
  }

  // 3. Product match
  for (const defendant of defendants) {
    for (const product of userProducts) {
      if (
        defendant.toLowerCase().includes(product.toLowerCase()) ||
        product.toLowerCase().includes(defendant.toLowerCase())
      ) {
        score += 0.2;
        matchReasons.push(
          `Defendant "${defendant}" matches product "${product}"`
        );
        matchedFields.push("products");
        break;
      }
    }
  }

  // 4. Employer match (for employment cases)
  if (
    caseRecord.caseType === "employment" ||
    caseRecord.caseType === "wage_hour"
  ) {
    for (const defendant of defendants) {
      for (const employer of userEmployers) {
        if (
          defendant.toLowerCase().includes(employer.toLowerCase()) ||
          employer.toLowerCase().includes(defendant.toLowerCase())
        ) {
          score += 0.35;
          matchReasons.push(
            `Defendant "${defendant}" matches employer "${employer}"`
          );
          matchedFields.push("employers");
          break;
        }
      }
    }
  }

  // 5. Securities / brokerage match
  if (caseRecord.caseType === "securities") {
    for (const defendant of defendants) {
      for (const brokerage of userBrokerages) {
        if (
          defendant.toLowerCase().includes(brokerage.toLowerCase()) ||
          brokerage.toLowerCase().includes(defendant.toLowerCase())
        ) {
          score += 0.3;
          matchReasons.push(
            `Securities action against "${defendant}" — user has brokerage "${brokerage}"`
          );
          matchedFields.push("brokerages");
          break;
        }
      }
    }
  }

  // 6. Geographic match
  const addresses = (user.mailingAddresses as any[]) ?? [];
  if (caseRecord.geographicRestrictions && addresses.length > 0) {
    const geoLower = caseRecord.geographicRestrictions.toLowerCase();
    for (const addr of addresses) {
      if (
        geoLower.includes(addr.state?.toLowerCase()) ||
        geoLower.includes(addr.city?.toLowerCase()) ||
        geoLower.includes("nationwide") ||
        geoLower.includes("all states")
      ) {
        score += 0.1;
        matchReasons.push("User location matches geographic eligibility");
        matchedFields.push("mailing_addresses");
        break;
      }
    }
  }

  // Cap score at 1.0
  score = Math.min(1.0, score);

  // Determine confidence
  let confidence: MatchConfidence;
  if (score >= 0.6) confidence = "high";
  else if (score >= 0.3) confidence = "medium";
  else confidence = "low";

  return {
    caseId: caseRecord.id,
    userId: user.id,
    confidence,
    matchScore: Math.round(score * 1000) / 1000,
    matchReasons: [...new Set(matchReasons)],
    matchedFields: [...new Set(matchedFields)],
  };
}

function buildAliasMap(
  entityRecords: Array<typeof entities.$inferSelect>
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entity of entityRecords) {
    const aliases = [entity.name, ...((entity.aliases as string[]) ?? [])];
    map.set(entity.name, aliases);
  }
  return map;
}
