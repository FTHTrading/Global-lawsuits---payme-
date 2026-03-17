/**
 * Notifications API Routes
 */

import { Hono } from "hono";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, notifications } from "@class-action-os/db";

export const notificationsRouter = new Hono();

// ─── Get notifications for a user ───────────────────────────
notificationsRouter.get("/user/:userId", async (c) => {
  const userId = c.req.param("userId");
  const unreadOnly = c.req.query("unread") === "true";

  const query = db
    .select()
    .from(notifications)
    .where(
      unreadOnly
        ? and(
            eq(notifications.userId, userId),
            eq(notifications.read, false)
          )
        : eq(notifications.userId, userId)
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const results = await query;
  return c.json({ data: results });
});

// ─── Mark notification as read ───────────────────────────────
notificationsRouter.patch("/:id/read", async (c) => {
  const id = c.req.param("id");

  const [updated] = await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: "Notification not found" }, 404);
  }
  return c.json({ success: true });
});

// ─── Mark all notifications as read ──────────────────────────
notificationsRouter.post("/user/:userId/read-all", async (c) => {
  const userId = c.req.param("userId");

  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false))
    );

  return c.json({ success: true });
});

// ─── Get unread count ────────────────────────────────────────
notificationsRouter.get("/user/:userId/count", async (c) => {
  const userId = c.req.param("userId");

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false))
    );

  return c.json({ data: { unread: result?.count ?? 0 } });
});
