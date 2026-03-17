/**
 * CourtListener / RECAP Adapter
 *
 * Uses the CourtListener REST API to search for class action dockets
 * and documents from the free RECAP archive.
 * API docs: https://www.courtlistener.com/help/api/
 */

import type { UnifiedCase } from "@class-action-os/shared";
import type { SourceAdapter, FetchOptions, SourceHealth } from "../types.js";
import { PoliteFetcher } from "../utils/fetcher.js";
import { logger } from "../utils/logger.js";

const CL_API_BASE = "https://www.courtlistener.com/api/rest/v4";
const CL_SEARCH = "https://www.courtlistener.com/api/rest/v4/search/";

interface CLSearchResult {
  count: number;
  next: string | null;
  results: CLDocket[];
}

interface CLDocket {
  id: number;
  absolute_url: string;
  case_name: string;
  case_name_short: string;
  court: string;
  court_id: string;
  docket_number: string;
  date_filed: string | null;
  date_terminated: string | null;
  date_last_filing: string | null;
  nature_of_suit: string;
  cause: string;
  assigned_to_str: string;
  referred_to_str: string;
  suit_nature: string;
}

export class CourtListenerAdapter implements SourceAdapter {
  readonly sourceName = "courtlistener" as const;
  readonly displayName = "CourtListener / RECAP";
  private fetcher: PoliteFetcher;
  private token: string;

  constructor() {
    this.token = process.env.COURTLISTENER_API_TOKEN ?? "";
    this.fetcher = new PoliteFetcher({
      concurrency: 2,
      intervalMs: 1500,
    });
  }

  async fetchCases(options?: FetchOptions): Promise<UnifiedCase[]> {
    logger.info("CourtListener: Starting RECAP search ingestion");
    const cases: UnifiedCase[] = [];

    // Search for class action cases
    const searchTerms = [
      "class action settlement",
      "class action certified",
      "settlement agreement class",
      "claims administrator",
    ];

    const limit = options?.limit ?? 50;

    for (const query of searchTerms) {
      try {
        const params = new URLSearchParams({
          q: options?.query ?? query,
          type: "d", // dockets
          order_by: "dateFiled desc",
          ...(options?.since
            ? { filed_after: options.since.toISOString().split("T")[0] }
            : {}),
        });

        const url = `${CL_SEARCH}?${params}`;
        const data = await this.fetcher.fetchJson<CLSearchResult>(url, {
          headers: this.authHeaders(),
        });

        logger.info(
          `CourtListener: Query "${query}" returned ${data.count} total, ${data.results.length} page`
        );

        for (const docket of data.results.slice(0, limit)) {
          const normalized = this.normalizeDocket(docket);
          if (normalized) cases.push(normalized);
        }

        if (cases.length >= limit) break;
      } catch (err) {
        logger.warn({ err, query }, "CourtListener: Search query failed");
      }
    }

    // De-duplicate by docket number
    const seen = new Set<string>();
    const unique = cases.filter((c) => {
      const key = c.docket_number ?? c.case_name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    logger.info(`CourtListener: Ingested ${unique.length} cases`);
    return unique;
  }

  private normalizeDocket(docket: CLDocket): UnifiedCase | null {
    if (!docket.case_name) return null;

    const caseType = this.classifyCaseType(
      docket.nature_of_suit,
      docket.cause,
      docket.case_name
    );

    return {
      case_id: crypto.randomUUID(),
      source: "courtlistener",
      source_id: String(docket.id),
      source_url: `https://www.courtlistener.com${docket.absolute_url}`,
      case_name: docket.case_name,
      court: docket.court || docket.court_id,
      docket_number: docket.docket_number,
      filed_date: docket.date_filed,
      updated_date: docket.date_last_filing,
      defendants: this.extractDefendants(docket.case_name),
      case_type: caseType,
      status: this.inferStatus(docket),
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
      extraction_confidence: 0.5, // Lower — needs AI extraction on documents
      documents: [],
      raw_text: null,
      ai_summary: null,
    };
  }

  private classifyCaseType(
    natureOfSuit: string,
    cause: string,
    caseName: string
  ): UnifiedCase["case_type"] {
    const combined = `${natureOfSuit} ${cause} ${caseName}`.toLowerCase();
    if (combined.includes("securities") || combined.includes("10b-5") || combined.includes("sec "))
      return "securities";
    if (combined.includes("antitrust") || combined.includes("sherman") || combined.includes("price-fixing"))
      return "antitrust";
    if (combined.includes("employment") || combined.includes("title vii") || combined.includes("flsa") || combined.includes("wage"))
      return "employment";
    if (combined.includes("privacy") || combined.includes("data breach") || combined.includes("tcpa"))
      return "privacy";
    if (combined.includes("product") || combined.includes("defect") || combined.includes("recall"))
      return "product";
    if (combined.includes("consumer") || combined.includes("fraud") || combined.includes("ftc"))
      return "consumer";
    if (combined.includes("housing") || combined.includes("fair housing"))
      return "housing";
    return "other";
  }

  private inferStatus(docket: CLDocket): UnifiedCase["status"] {
    if (docket.date_terminated) return "settled";
    if (docket.date_last_filing) return "pending";
    return "filed";
  }

  private extractDefendants(caseName: string): string[] {
    // Typical format: "Plaintiff(s) v. Defendant(s)"
    const vMatch = caseName.match(/\s+v\.?\s+(.+)/i);
    if (vMatch) {
      return vMatch[1]
        .split(/,\s*|\s+and\s+/i)
        .map((d) => d.trim())
        .filter(Boolean)
        .slice(0, 5);
    }
    return [];
  }

  private authHeaders(): Record<string, string> {
    if (!this.token) return {};
    return { Authorization: `Token ${this.token}` };
  }

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await fetch(`${CL_API_BASE}/`, {
        headers: this.authHeaders(),
      });
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
