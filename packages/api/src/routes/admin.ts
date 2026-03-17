import { Hono } from "hono";
import { db, extractedFactsStaging, cases } from "@class-action-os/db";
import { eq } from "drizzle-orm";

export const adminRouter = new Hono();

// Get all pending extractions (Review Queue)
adminRouter.get("/reviews/pending", async (c) => {
  const pending = await db.select().from(extractedFactsStaging).where(eq(extractedFactsStaging.status, "pending"));
  return c.json({ data: pending });
});

// Approve extraction
adminRouter.post("/reviews/:id/approve", async (c) => {
  const id = c.req.param("id");
  const extracted = await db.select().from(extractedFactsStaging).where(eq(extractedFactsStaging.id, id)).limit(1).then(res => res[0]);

  if (!extracted) return c.json({ error: "Not found" }, 404);

  const data = extracted.extractedData as any;

  // Apply to primary cases table
  await db.update(cases).set({
    caseType: data.case_type,
    status: data.status,
    claimDeadline: data.claim_deadline,
    reviewStatus: "approved",
    updatedAt: new Date()
  }).where(eq(cases.id, extracted.caseId));

  await db.update(extractedFactsStaging).set({ status: "approved", reviewedAt: new Date() }).where(eq(extractedFactsStaging.id, id));

  return c.json({ message: "Approved" });
});

