/**
 * Users / Profiles API Routes
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, userProfiles } from "@class-action-os/db";

export const usersRouter = new Hono();

// ─── Get user profile ────────────────────────────────────────
usersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, id))
    .limit(1);

  if (!profile) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({ data: profile });
});

// ─── Create user profile ────────────────────────────────────
usersRouter.post("/", async (c) => {
  const body = await c.req.json();

  const [profile] = await db
    .insert(userProfiles)
    .values({
      displayName: body.displayName,
      emailAddresses: body.emailAddresses ?? body.emails ?? [],
      employers: body.employers ?? [],
      merchants: body.merchants ?? [],
      products: body.products ?? [],
      brokerages: body.brokerages ?? body.brokerageAccounts ?? [],
      mailingAddresses: body.mailingAddresses ?? body.addresses ?? [],
      uploadedEvidence: body.uploadedEvidence ?? [],
    })
    .returning();

  return c.json({ data: profile }, 201);
});

// ─── Update user profile ────────────────────────────────────
usersRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const [profile] = await db
    .update(userProfiles)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, id))
    .returning();

  if (!profile) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({ data: profile });
});

// ─── List all user profiles ─────────────────────────────────
usersRouter.get("/", async (c) => {
  const profiles = await db.select().from(userProfiles);
  return c.json({ data: profiles });
});

// ─── Delete user profile ─────────────────────────────────────
usersRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(userProfiles)
    .where(eq(userProfiles.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({ success: true });
});
