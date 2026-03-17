/**
 * Source Health API Routes
 */

import { Hono } from "hono";
import { desc, sql } from "drizzle-orm";
import { db, sourceSyncRuns } from "@class-action-os/db";
import { getAllAdapters, getAdapter } from "@class-action-os/source-connectors";

export const sourceHealthRouter = new Hono();

// ─── Get health for all sources ──────────────────────────────
sourceHealthRouter.get("/", async (c) => {
  const adapters = getAllAdapters();

  const healthResults = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const health = await adapter.healthCheck();

      // Get last sync run
      const [lastSync] = await db
        .select()
        .from(sourceSyncRuns)
        .where(sql`${sourceSyncRuns.source} = ${adapter.sourceName}`)
        .orderBy(desc(sourceSyncRuns.startedAt))
        .limit(1);

      return {
        source: adapter.sourceName,
        displayName: adapter.displayName,
        healthy: health.healthy,
        latencyMs: health.latencyMs,
        message: health.message,
        lastSync: lastSync
          ? {
              startedAt: lastSync.startedAt,
              completedAt: lastSync.completedAt,
              casesFound: lastSync.casesFound,
              casesNew: lastSync.casesNew,
              casesUpdated: lastSync.casesUpdated,
              errors: lastSync.errors,
            }
          : null,
      };
    })
  );

  const results = healthResults.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          source: adapters[i].sourceName,
          displayName: adapters[i].displayName,
          healthy: false,
          message: (r.reason as Error).message,
        }
  );

  return c.json({ data: results });
});

// ─── Get health for a specific source ────────────────────────
sourceHealthRouter.get("/:source", async (c) => {
  const sourceName = c.req.param("source") as any;

  try {
    const adapter = getAdapter(sourceName);
    if (!adapter) {
      return c.json({ error: `Unknown source: ${sourceName}` }, 404);
    }

    const health = await adapter.healthCheck();

    const syncHistory = await db
      .select()
      .from(sourceSyncRuns)
      .where(sql`${sourceSyncRuns.source} = ${sourceName}`)
      .orderBy(desc(sourceSyncRuns.startedAt))
      .limit(10);

    return c.json({
      data: {
        displayName: adapter.displayName,
        ...health,
        recentSyncs: syncHistory,
      },
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});
