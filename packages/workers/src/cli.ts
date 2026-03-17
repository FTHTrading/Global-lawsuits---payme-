#!/usr/bin/env node
/**
 * class-action-os — CLI
 *
 * Usage:
 *   tsx src/cli.ts ingest --all
 *   tsx src/cli.ts ingest --source ftc
 *   tsx src/cli.ts sync
 *   tsx src/cli.ts triage
 *   tsx src/cli.ts triage --case-id <uuid>
 *   tsx src/cli.ts match
 *   tsx src/cli.ts deadlines
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });
import pino from "pino";

import { getAdapter, getAllAdapters } from "@class-action-os/source-connectors";
import { normalizeCases } from "@class-action-os/case-normalizer";
import { triageCase, rescoreAllCases } from "@class-action-os/ai-triage";
import { matchAllUsers } from "@class-action-os/entity-matcher";
import { runDeadlineCheck } from "@class-action-os/deadline-monitor";
import { db, cases, sourceSyncRuns } from "@class-action-os/db";
import { isNull, or, eq } from "drizzle-orm";

const log = pino({ transport: { target: "pino-pretty" } });

const args = process.argv.slice(2);
const command = args[0];

function getFlag(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}
function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

async function main() {
  switch (command) {
    // ─── Ingest ────────────────────────────────────────────
    case "ingest": {
      const sourceName = getFlag("--source");
      const isAll = hasFlag("--all") || !sourceName;

      const adapters = isAll
        ? getAllAdapters()
        : [getAdapter(sourceName as any)].filter(Boolean);

      if (adapters.length === 0) {
        log.error({ source: sourceName }, "Unknown source");
        process.exit(1);
      }

      for (const adapter of adapters) {
        if (!adapter) continue;
        const syncStart = new Date();
        log.info({ source: adapter.sourceName }, "Starting ingestion...");

        try {
          const health = await adapter.healthCheck();
          if (!health.healthy) {
            log.warn({ source: adapter.sourceName }, "Unreachable — skipping");
            continue;
          }

          const rawCases = await adapter.fetchCases({});
          log.info({ source: adapter.sourceName, count: rawCases.length }, "Fetched");

          const result = await normalizeCases(rawCases);
          log.info({ source: adapter.sourceName, ...result }, "Normalized");

          await db.insert(sourceSyncRuns).values({
            source: adapter.sourceName,
            startedAt: syncStart,
            completedAt: new Date(),
            casesFound: rawCases.length,
            casesNew: result.inserted,
            casesUpdated: result.updated,
            errors: result.errors.length,
            errorDetails: result.errors.length > 0 ? result.errors : [],
            status: "completed",
          });
        } catch (err) {
          log.error(
            { source: adapter.sourceName, error: (err as Error).message },
            "Ingestion failed"
          );
        }
      }
      break;
    }

    // ─── Full Daily Sync ──────────────────────────────────
    case "sync": {
      log.info("=== Daily Sync Started ===");

      // Step 1: Ingest all
      const adapters = getAllAdapters();
      for (const adapter of adapters) {
        const syncStart = new Date();
        try {
          const health = await adapter.healthCheck();
          if (!health.healthy) {
            log.warn({ source: adapter.sourceName }, "Unreachable — skipping");
            continue;
          }
          const rawCases = await adapter.fetchCases({});
          const result = await normalizeCases(rawCases);
          log.info({ source: adapter.sourceName, ...result }, "Ingested");

          await db.insert(sourceSyncRuns).values({
            source: adapter.sourceName,
            startedAt: syncStart,
            completedAt: new Date(),
            casesFound: rawCases.length,
            casesNew: result.inserted,
            casesUpdated: result.updated,
            errors: result.errors.length,
            errorDetails: result.errors.length > 0 ? result.errors : [],
            status: "completed",
          });
        } catch (err) {
          log.error(
            { source: adapter.sourceName, error: (err as Error).message },
            "Failed"
          );
        }
      }

      // Step 2: Re-score all
      log.info("Re-scoring all cases...");
      const rescored = await rescoreAllCases();
      log.info({ rescored }, "Re-scoring complete");

      // Step 3: Match
      log.info("Running entity matching...");
      const matchResult = await matchAllUsers();
      log.info(matchResult, "Matching complete");

      // Step 4: Deadline check
      log.info("Checking deadlines...");
      const deadlineResult = await runDeadlineCheck();
      log.info(deadlineResult, "Deadline check complete");

      // Step 5: Send email alerts (already handled inside runDeadlineCheck)
      log.info("=== Daily Sync Complete ===");
      break;
    }

    // ─── Triage ───────────────────────────────────────────
    case "triage": {
      const caseId = getFlag("--case-id");

      if (caseId) {
        log.info({ caseId }, "Triaging single case");
        await triageCase(caseId);
        log.info("Done");
      } else if (hasFlag("--rescore")) {
        log.info("Re-scoring all cases...");
        const count = await rescoreAllCases();
        log.info({ count }, "Done");
      } else {
        // Triage all untriaged
        const untriaged = await db
          .select({ id: cases.id })
          .from(cases)
          .where(or(isNull(cases.aiScore), eq(cases.aiScore, 0)))
          .limit(500);

        log.info({ count: untriaged.length }, "Triaging untriaged cases");
        for (const c of untriaged) {
          try {
            await triageCase(c.id);
          } catch (err) {
            log.error({ caseId: c.id, error: (err as Error).message }, "Failed");
          }
        }
        // Compute composite AI scores now that fields are extracted
        log.info("Computing AI scores...");
        await rescoreAllCases();
        log.info("Done");
      }
      break;
    }

    // ─── Match ────────────────────────────────────────────
    case "match": {
      log.info("Running entity matching for all users...");
      const result = await matchAllUsers();
      log.info(result, "Done");
      break;
    }

    // ─── Deadlines ────────────────────────────────────────
    case "deadlines": {
      log.info("Running deadline check...");
      const result = await runDeadlineCheck();
      log.info(result, "Done");
      break;
    }

    default:
      console.log(`
class-action-os CLI

Commands:
  ingest [--all | --source <name>]   Ingest cases from sources
  sync                               Full daily sync pipeline
  triage [--case-id <id> | --rescore] AI triage & scoring
  match                              Run entity matching
  deadlines [--send-emails]          Check deadlines & notify

Sources: ftc, eeoc, courtlistener, sec, pacer, classactionorg
      `);
      break;
  }

  process.exit(0);
}

main().catch((err) => {
  log.error(err, "CLI error");
  process.exit(1);
});
