/**
 * class-action-os — Worker Jobs
 *
 * BullMQ-based background job definitions for:
 *  - Source ingestion (per-source + all)
 *  - Daily sync orchestration
 *  - AI triage / scoring
 *  - Entity matching
 *  - Deadline monitoring
 */

import { Queue, Worker, Job } from "bullmq";
import pino from "pino";
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });

import { getAdapter, getAllAdapters } from "@class-action-os/source-connectors";
import { normalizeCases } from "@class-action-os/case-normalizer";
import { triageCase, rescoreAllCases } from "@class-action-os/ai-triage";
import { matchAllUsers } from "@class-action-os/entity-matcher";
import { runDeadlineCheck } from "@class-action-os/deadline-monitor";
import { db, cases, sourceSyncRuns } from "@class-action-os/db";
import { isNull } from "drizzle-orm";

const log = pino({ transport: { target: "pino-pretty" } });

// ─── Redis Connection ────────────────────────────────────────
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = { url: redisUrl };

// ─── Queue Definitions ───────────────────────────────────────
export const ingestQueue = new Queue("ingest", { connection });
export const triageQueue = new Queue("triage", { connection });
export const matchQueue = new Queue("match", { connection });
export const deadlineQueue = new Queue("deadlines", { connection });

// ─── Ingest Worker ───────────────────────────────────────────
const ingestWorker = new Worker(
  "ingest",
  async (job: Job) => {
    const { source, since } = job.data;
    log.info({ source }, "Starting ingestion job");

    const adapters =
      source === "all" ? getAllAdapters() : [getAdapter(source)].filter(Boolean);

    const results: Record<string, any> = {};

    for (const adapter of adapters) {
      if (!adapter) continue;

      const syncStart = new Date();
      try {
        // Health check first
        const health = await adapter.healthCheck();
        if (!health.healthy) {
          log.warn({ source: adapter.sourceName }, "Source unreachable, skipping");
          results[adapter.sourceName] = { skipped: true, reason: "unreachable" };
          continue;
        }

        // Fetch cases
        const rawCases = await adapter.fetchCases({
          since: since ? new Date(since) : undefined,
        });
        log.info(
          { source: adapter.sourceName, count: rawCases.length },
          "Fetched raw cases"
        );

        // Normalize and upsert
        const normResult = await normalizeCases(rawCases);
        log.info(
          { source: adapter.sourceName, ...normResult },
          "Normalization complete"
        );

        // Record sync run
        await db.insert(sourceSyncRuns).values({
          source: adapter.sourceName,
          startedAt: syncStart,
          completedAt: new Date(),
          casesFound: rawCases.length,
          casesNew: normResult.inserted,
          casesUpdated: normResult.updated,
          errors: normResult.errors.length,
          errorDetails: normResult.errors.length > 0 ? normResult.errors : [],
          status: "completed",
        });

        results[adapter.sourceName] = normResult;
      } catch (err) {
        const msg = (err as Error).message;
        log.error({ source: adapter.sourceName, error: msg }, "Ingestion failed");

        await db.insert(sourceSyncRuns).values({
          source: adapter.sourceName,
          startedAt: syncStart,
          completedAt: new Date(),
          casesFound: 0,
          casesNew: 0,
          casesUpdated: 0,
          errors: 1,
          errorDetails: [msg],
          status: "failed",
        });

        results[adapter.sourceName] = { error: msg };
      }
    }

    return results;
  },
  { connection, concurrency: 1 }
);

ingestWorker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Ingest job completed");
});
ingestWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, error: err.message }, "Ingest job failed");
});

// ─── Triage Worker ───────────────────────────────────────────
const triageWorker = new Worker(
  "triage",
  async (job: Job) => {
    const { caseId, mode } = job.data;

    if (mode === "rescore-all") {
      log.info("Re-scoring all cases");
      const count = await rescoreAllCases();
      return { rescored: count };
    }

    if (caseId) {
      log.info({ caseId }, "Triaging single case");
      await triageCase(caseId);
      return { triaged: caseId };
    }

    // Triage untriaged cases (no ai_score yet)
    const untriaged = await db
      .select({ id: cases.id })
      .from(cases)
      .where(isNull(cases.aiScore))
      .limit(100);

    log.info({ count: untriaged.length }, "Triaging untriaged cases");
    let triaged = 0;
    for (const c of untriaged) {
      try {
        await triageCase(c.id);
        triaged++;
      } catch (err) {
        log.error({ caseId: c.id, error: (err as Error).message }, "Triage failed");
      }
    }

    return { triaged };
  },
  { connection, concurrency: 1 }
);

triageWorker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Triage job completed");
});
triageWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, error: err.message }, "Triage job failed");
});

// ─── Match Worker ────────────────────────────────────────────
const matchWorker = new Worker(
  "match",
  async (_job: Job) => {
    log.info("Running global entity matching");
    const result = await matchAllUsers();
    log.info(result, "Matching complete");
    return result;
  },
  { connection, concurrency: 1 }
);

matchWorker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Match job completed");
});

// ─── Deadline Worker ─────────────────────────────────────────
const deadlineWorker = new Worker(
  "deadlines",
  async (_job: Job) => {
    log.info("Running deadline check");
    const result = await runDeadlineCheck();
    log.info(result, "Deadline check complete");
    return result;
  },
  { connection, concurrency: 1 }
);

deadlineWorker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Deadline job completed");
});

// ─── Graceful Shutdown ───────────────────────────────────────
async function shutdown() {
  log.info("Shutting down workers...");
  await Promise.all([
    ingestWorker.close(),
    triageWorker.close(),
    matchWorker.close(),
    deadlineWorker.close(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

log.info("Workers started — listening for jobs");

export { ingestWorker, triageWorker, matchWorker, deadlineWorker };
