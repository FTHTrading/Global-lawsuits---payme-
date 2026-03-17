/**
 * PACER Adapter
 *
 * Hooks into PACER Case Locator for official federal court metadata.
 * Registration is free, but document access incurs fees (~$0.10/page).
 * This adapter only searches case metadata — no document downloads by default.
 *
 * PACER Case Locator: https://pcl.uscourts.gov/pcl/index.jsf
 * PACER uses a SOAP/XML API under the hood; this adapter uses the JSON endpoints
 * available via the PACER NextGen CM/ECF system.
 */

import type { UnifiedCase } from "@class-action-os/shared";
import type { SourceAdapter, FetchOptions, SourceHealth } from "../types.js";
import { PoliteFetcher } from "../utils/fetcher.js";
import { logger } from "../utils/logger.js";

const PACER_LOGIN_URL = "https://pacer.login.uscourts.gov/services/cso-auth";
const PACER_SEARCH_URL = "https://pcl.uscourts.gov/pcl/rest/cases/find";

export class PacerAdapter implements SourceAdapter {
  readonly sourceName = "pacer" as const;
  readonly displayName = "PACER Case Locator";
  private fetcher: PoliteFetcher;
  private authToken: string | null = null;

  constructor() {
    this.fetcher = new PoliteFetcher({
      concurrency: 1,
      intervalMs: 3000, // PACER is sensitive to rate
    });
  }

  async fetchCases(options?: FetchOptions): Promise<UnifiedCase[]> {
    logger.info("PACER: Starting case search ingestion");

    const username = process.env.PACER_USERNAME;
    const password = process.env.PACER_PASSWORD;

    if (!username || !password) {
      logger.warn("PACER: No credentials configured — skipping");
      return [];
    }

    try {
      await this.authenticate(username, password);
    } catch (err) {
      logger.error({ err }, "PACER: Authentication failed");
      return [];
    }

    const cases: UnifiedCase[] = [];

    // Search for class action cases
    const searchQueries = [
      { nature_of_suit: "890", title: "class action" }, // Other Statutory Actions (class)
      { nature_of_suit: "850", title: "securities class action" },
      { nature_of_suit: "370", title: "consumer fraud class action" },
    ];

    const limit = options?.limit ?? 25;

    for (const sq of searchQueries) {
      try {
        const results = await this.searchCases(sq, options?.since);
        for (const result of results.slice(0, limit)) {
          const normalized = this.normalizePacerCase(result);
          if (normalized) cases.push(normalized);
        }
      } catch (err) {
        logger.warn({ err, query: sq }, "PACER: Search failed");
      }
    }

    logger.info(`PACER: Ingested ${cases.length} cases`);
    return cases;
  }

  private async authenticate(username: string, password: string): Promise<void> {
    logger.info("PACER: Authenticating...");
    const res = await this.fetcher.fetchJson<{ loginResult: string; token?: string }>(
      PACER_LOGIN_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: username,
          password,
          clientCode: process.env.PACER_CLIENT_CODE ?? "",
          redactFlag: "1",
        }),
      }
    );

    if (res.token) {
      this.authToken = res.token;
      logger.info("PACER: Authenticated successfully");
    } else {
      throw new Error(`PACER login failed: ${res.loginResult}`);
    }
  }

  private async searchCases(
    query: { nature_of_suit: string; title: string },
    since?: Date
  ): Promise<PacerCaseResult[]> {
    if (!this.authToken) return [];

    const params: Record<string, string> = {
      natureOfSuit: query.nature_of_suit,
      caseType: "cv", // civil
      ...(since ? { dateFiledFrom: since.toISOString().split("T")[0] } : {}),
    };

    try {
      const data = await this.fetcher.fetchJson<{ content: PacerCaseResult[] }>(
        PACER_SEARCH_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-NEXT-GEN-CSO": this.authToken,
          },
          body: JSON.stringify(params),
        }
      );
      return data.content ?? [];
    } catch (err) {
      logger.warn({ err }, "PACER: Case search request failed");
      return [];
    }
  }

  private normalizePacerCase(result: PacerCaseResult): UnifiedCase | null {
    return {
      case_id: crypto.randomUUID(),
      source: "pacer",
      source_id: result.caseId ?? String(result.caseNumberFull),
      source_url: result.caseLink ?? null,
      case_name: result.caseTitle ?? "Unknown",
      court: result.courtName ?? result.courtId ?? "Federal",
      docket_number: result.caseNumberFull ?? null,
      filed_date: result.dateFiled ?? null,
      updated_date: result.dateTerminated ?? result.dateFiled ?? null,
      defendants: result.parties
        ?.filter((p: any) => p.role === "dft")
        .map((p: any) => p.name)
        .slice(0, 10) ?? [],
      case_type: "other",
      status: result.dateTerminated ? "settled" : "pending",
      claim_deadline: null,
      opt_out_deadline: null,
      objection_deadline: null,
      estimated_payout: null,
      settlement_amount: null,
      eligibility_text: null,
      class_definition: null,
      claim_url: null,
      proof_required: [],
      ai_score: 0,
      match_score: 0,
      extraction_confidence: 0.8, // Official source
      documents: [],
      raw_text: null,
      ai_summary: null,
    };
  }

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await fetch("https://pacer.uscourts.gov", { method: "HEAD" });
      return {
        source: this.sourceName,
        healthy: res.ok,
        lastChecked: new Date(),
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        source: this.sourceName,
        healthy: false,
        lastChecked: new Date(),
        latencyMs: Date.now() - start,
        message: (err as Error).message,
      };
    }
  }
}

interface PacerCaseResult {
  caseId?: string;
  caseNumberFull?: string;
  caseTitle?: string;
  courtId?: string;
  courtName?: string;
  caseLink?: string;
  dateFiled?: string;
  dateTerminated?: string;
  parties?: Array<{ name: string; role: string }>;
}
