/**
 * EEOC Class Member Searches & Settlements Adapter
 *
 * Scrapes https://www.eeoc.gov/class-member-search-and-claims-process-select-eeoc-litigation-and-settlements
 * for active employment-related class member participation opportunities.
 */

import * as cheerio from "cheerio";
import type { UnifiedCase } from "@class-action-os/shared";
import type { SourceAdapter, FetchOptions, SourceHealth } from "../types.js";
import { PoliteFetcher } from "../utils/fetcher.js";
import { logger } from "../utils/logger.js";

const EEOC_URL =
  "https://www.eeoc.gov/class-member-search-and-claims-process-select-eeoc-litigation-and-settlements";
const EEOC_BASE = "https://www.eeoc.gov";

export class EeocAdapter implements SourceAdapter {
  readonly sourceName = "eeoc" as const;
  readonly displayName = "EEOC Class Member Searches";
  private fetcher: PoliteFetcher;

  constructor() {
    this.fetcher = new PoliteFetcher({
      concurrency: 1,
      intervalMs: 2500,
      userAgent: "ClassActionOS/1.0 (legal-research; admin@classactionos.dev)",
    });
  }

  async fetchCases(options?: FetchOptions): Promise<UnifiedCase[]> {
    logger.info("EEOC: Starting class-member search ingestion");
    const cases: UnifiedCase[] = [];

    try {
      const html = await this.fetcher.fetchHtml(EEOC_URL);
      const $ = cheerio.load(html);

      // The EEOC page lists settlements/cases in structured content blocks
      const entries: Array<{ title: string; url: string; text: string }> = [];

      $(
        "article, .field--name-body a, .node__content a, main a, .view-content a"
      ).each((_, el) => {
        const $a = $(el);
        const title = $a.text().trim();
        let href = $a.attr("href") ?? "";

        if (!title || title.length < 10) return;
        if (href.startsWith("/")) href = EEOC_BASE + href;
        if (!href.startsWith("http")) return;
        // Filter to EEOC-related pages
        if (!href.includes("eeoc.gov")) return;

        const parentText = $a.parent().text().trim();
        entries.push({ title, url: href, text: parentText });
      });

      // De-duplicate
      const seen = new Set<string>();
      const unique = entries.filter((e) => {
        if (seen.has(e.url)) return false;
        seen.add(e.url);
        return true;
      });

      logger.info(`EEOC: Found ${unique.length} entries`);
      const limit = options?.limit ?? unique.length;

      for (const entry of unique.slice(0, limit)) {
        try {
          const caseData = await this.fetchDetail(entry);
          if (caseData) cases.push(caseData);
        } catch (err) {
          logger.warn({ err, url: entry.url }, "EEOC: Failed detail page");
        }
      }
    } catch (err) {
      logger.error({ err }, "EEOC: Failed to fetch listing page");
      throw err;
    }

    logger.info(`EEOC: Ingested ${cases.length} cases`);
    return cases;
  }

  private async fetchDetail(entry: {
    title: string;
    url: string;
    text: string;
  }): Promise<UnifiedCase | null> {
    const html = await this.fetcher.fetchHtml(entry.url);
    const $ = cheerio.load(html);

    const bodyText =
      $("article .field--name-body, .node__content, main .content")
        .first()
        .text()
        .trim() || "";

    const fullText = `${entry.text}\n\n${bodyText}`;
    if (fullText.length < 50) return null;

    // Extract deadline
    const claimDeadline = this.extractDate(fullText);

    // Determine status
    const lower = fullText.toLowerCase();
    let status: UnifiedCase["status"] = "settled";
    if (lower.includes("claims are now being accepted") || lower.includes("submit a claim")) {
      status = "claims_open";
    } else if (lower.includes("closed") || lower.includes("no longer")) {
      status = "claims_closed";
    }

    // Claim URL
    let claimUrl: string | null = null;
    $("a").each((_, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr("href") ?? "";
      if (
        (text.includes("claim") || text.includes("participate") || text.includes("submit")) &&
        href.startsWith("http")
      ) {
        claimUrl = href;
      }
    });

    const defendants = this.extractDefendants(entry.title);
    const settlementAmount = this.extractDollarAmount(fullText);

    return {
      case_id: crypto.randomUUID(),
      source: "eeoc",
      source_id: entry.url,
      source_url: entry.url,
      case_name: entry.title,
      court: "EEOC / Federal",
      docket_number: null,
      filed_date: null,
      updated_date: new Date().toISOString().split("T")[0],
      defendants,
      case_type: "employment",
      status,
      claim_deadline: claimDeadline,
      opt_out_deadline: null,
      objection_deadline: null,
      estimated_payout: settlementAmount
        ? { min: null, max: null, notes: `Settlement: $${settlementAmount.toLocaleString()}` }
        : null,
      settlement_amount: settlementAmount,
      eligibility_text: this.extractEligibility(fullText),
      class_definition: null,
      claim_url: claimUrl,
      proof_required: ["employment_record"],
      ai_score: 0,
      match_score: 0,
      extraction_confidence: 0.6,
      documents: [entry.url],
      raw_text: fullText.slice(0, 10000),
      ai_summary: null,
    };
  }

  private extractDate(text: string): string | null {
    const patterns = [
      /deadline[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
      /by\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
      /(?:must|should)\s+(?:be\s+)?(?:filed|submitted)\s+by\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m?.[1]) {
        try {
          const d = new Date(m[1]);
          if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
        } catch { /* date parse failed */ }
      }
    }
    return null;
  }

  private extractDollarAmount(text: string): number | null {
    const match = text.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*(?:million|billion)?/i);
    if (!match) return null;
    let amount = parseFloat(match[1].replace(/,/g, ""));
    const ctx = text.slice(match.index!, match.index! + match[0].length + 15);
    if (/million/i.test(ctx)) amount *= 1_000_000;
    if (/billion/i.test(ctx)) amount *= 1_000_000_000;
    return amount;
  }

  private extractDefendants(title: string): string[] {
    // EEOC case titles: "EEOC v. Company Name" or "Company Name"
    const vMatch = title.match(/v\.?\s+(.+)/i);
    if (vMatch) return [vMatch[1].trim()];
    return [title.split(/[–\-:]/)[0].trim()];
  }

  private extractEligibility(text: string): string | null {
    const patterns = [
      /(?:you\s+may\s+be\s+eligible|class\s+members?\s+include)[^.]+\./i,
      /(?:if\s+you\s+(?:worked|were employed|applied))[^.]+\./i,
      /(?:individuals?\s+who)[^.]+\./i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m[0].trim();
    }
    return null;
  }

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await fetch(EEOC_URL, { method: "HEAD" });
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
