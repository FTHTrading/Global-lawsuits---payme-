/**
 * Claims API Routes
 */

import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db, claims, cases } from "@class-action-os/db";
import {
  buildClaimPacket,
  generateFilingGuidance,
  updateClaimStatus,
} from "@class-action-os/claim-builder";

export const claimsRouter = new Hono();

// ─── Get all claims for a user ───────────────────────────────
claimsRouter.get("/user/:userId", async (c) => {
  const userId = c.req.param("userId");

  const userClaims = await db
    .select({
      claim: claims,
      case: cases,
    })
    .from(claims)
    .leftJoin(cases, eq(claims.caseId, cases.id))
    .where(eq(claims.userId, userId))
    .orderBy(desc(claims.updatedAt));

  return c.json({ data: userClaims });
});

// ─── Build claim packet ──────────────────────────────────────
claimsRouter.post("/build", async (c) => {
  const { userId, caseId } = await c.req.json();
  if (!userId || !caseId) {
    return c.json({ error: "userId and caseId are required" }, 400);
  }

  try {
    const packet = await buildClaimPacket(userId, caseId);
    return c.json({ data: packet });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ─── Get filing guidance ─────────────────────────────────────
claimsRouter.get("/:caseId/guidance", async (c) => {
  const caseId = c.req.param("caseId");
  try {
    const guidance = await generateFilingGuidance(caseId);
    return c.json({ data: { guidance } });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ─── Update claim status ─────────────────────────────────────
claimsRouter.patch("/:id/status", async (c) => {
  const id = c.req.param("id");
  const { status, notes } = await c.req.json();

  try {
    await updateClaimStatus(id, status, notes);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});
