/**
 * Cases API Routes
 */

import { Hono } from "hono";
import { eq, desc, sql, and, gte, lte, like } from "drizzle-orm";
import { db, cases, deadlines, caseDocuments } from "@class-action-os/db";
import { assessClaimability, getClaimableCases } from "@class-action-os/claimability-engine";
import { triageCase } from "@class-action-os/ai-triage";

export const casesRouter = new Hono();

// ─── List all cases with filtering/sorting ───────────────────
casesRouter.get("/", async (c) => {
  const { source, status, case_type, sort, limit, offset, q } = c.req.query();

  let query = db.select().from(cases).$dynamic();

  // Filters
  const conditions = [];
  if (source) conditions.push(eq(cases.source, source));
  if (status) conditions.push(eq(cases.status, status));
  if (case_type) conditions.push(eq(cases.caseType, case_type));
  if (q) conditions.push(like(cases.caseName, `%${q}%`));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Sorting
  const sortField = sort === "deadline" ? cases.claimDeadline
    : sort === "score" ? cases.aiScore
    : sort === "updated" ? cases.updatedAt
    : sort === "settlement" ? cases.settlementAmount
    : cases.aiScore;
  query = query.orderBy(desc(sortField)) as any;

  // Total count (before pagination)
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(cases).$dynamic();
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  // Pagination
  const l = Math.min(Number(limit) || 50, 200);
  const o = Number(offset) || 0;
  query = query.limit(l).offset(o) as any;

  const [results, [{ count: total }]] = await Promise.all([query, countQuery]);

  return c.json({
    data: results,
    pagination: { limit: l, offset: o, total },
  });
});

// ─── Get single case ─────────────────────────────────────────
casesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [caseRecord] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, id))
    .limit(1);

  if (!caseRecord) return c.json({ error: "Case not found" }, 404);

  // Get claimability assessment
  const claimability = assessClaimability(caseRecord);

  // Get related deadlines
  const caseDeadlines = await db
    .select()
    .from(deadlines)
    .where(eq(deadlines.caseId, id));

  // Get documents
  const docs = await db
    .select()
    .from(caseDocuments)
    .where(eq(caseDocuments.caseId, id));

  return c.json({
    data: {
      ...caseRecord,
      claimability,
      deadlines: caseDeadlines,
      documents: docs,
    },
  });
});

// ─── Get claimable cases ─────────────────────────────────────
casesRouter.get("/status/claimable", async (c) => {
  const result = await getClaimableCases();
  return c.json({ data: result });
});

// ─── Trigger AI triage for a case ────────────────────────────
casesRouter.post("/:id/triage", async (c) => {
  const id = c.req.param("id");
  try {
    await triageCase(id);
    return c.json({ success: true, message: "Triage complete" });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ─── Dashboard stats ─────────────────────────────────────────
casesRouter.get("/stats/overview", async (c) => {
  const [totalCases] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases);

  const [openClaims] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(eq(cases.status, "claims_open"));

  const today = new Date().toISOString().split("T")[0];
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [approachingDeadlines] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(and(gte(cases.claimDeadline, today), lte(cases.claimDeadline, thirtyDays)));

  const topCases = await db
    .select()
    .from(cases)
    .orderBy(desc(cases.aiScore))
    .limit(10);

  return c.json({
    data: {
      totalCases: totalCases.count,
      openClaims: openClaims.count,
      approachingDeadlines: approachingDeadlines.count,
      topCases,
    },
  });
});

// ─── Update case (admin) ─────────────────────────────────────
casesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  await db
    .update(cases)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(cases.id, id));

  return c.json({ success: true });
});
