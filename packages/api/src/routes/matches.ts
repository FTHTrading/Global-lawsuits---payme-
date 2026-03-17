/**
 * Matches API Routes
 */

import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db, possibleMatches, cases } from "@class-action-os/db";
import { matchCasesForUser, matchAllUsers } from "@class-action-os/entity-matcher";

export const matchesRouter = new Hono();

// ─── Get matches for a user ──────────────────────────────────
matchesRouter.get("/user/:userId", async (c) => {
  const userId = c.req.param("userId");

  const matches = await db
    .select({
      match: possibleMatches,
      case: cases,
    })
    .from(possibleMatches)
    .leftJoin(cases, eq(possibleMatches.caseId, cases.id))
    .where(eq(possibleMatches.userId, userId))
    .orderBy(desc(possibleMatches.matchScore));

  return c.json({ data: matches });
});

// ─── Trigger matching for a user ─────────────────────────────
matchesRouter.post("/user/:userId/run", async (c) => {
  const userId = c.req.param("userId");
  try {
    const results = await matchCasesForUser(userId);
    return c.json({
      success: true,
      matchesFound: results.length,
      data: results,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ─── Trigger global matching ─────────────────────────────────
matchesRouter.post("/run-all", async (c) => {
  try {
    const total = await matchAllUsers();
    return c.json({ success: true, totalMatches: total });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ─── Dismiss a match ─────────────────────────────────────────
matchesRouter.post("/:id/dismiss", async (c) => {
  const id = c.req.param("id");
  await db
    .update(possibleMatches)
    .set({ dismissed: true })
    .where(eq(possibleMatches.id, id));
  return c.json({ success: true });
});
