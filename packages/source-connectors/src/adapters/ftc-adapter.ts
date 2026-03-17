/**
 * FTC Refund Programs Adapter
 *
 * Scrapes https://www.ftc.gov/enforcement/refunds for active
 * consumer refund opportunities and claim deadlines.
 * This is Lane A — money already flowing or claims being accepted.
 */

import * as cheerio from "cheerio";
import type { UnifiedCase } from "@class-action-os/shared";
import type { SourceAdapter, FetchOptions, SourceHealth } from "../types.js";
import { PoliteFetcher } from "../utils/fetcher.js";
import { logger } from "../utils/logger.js";

const FTC_REFUNDS_URL = "https://www.ftc.gov/enforcement/refunds";
const FTC_BASE = "https://www.ftc.gov";

interface FtcRefundEntry {
  title: string;
  url: string;
  description: string;
  date?: string;
}

export class FtcAdapter implements SourceAdapter {
  readonly sourceName = "ftc" as const;
  readonly displayName = "FTC Refund Programs";
  private fetcher: PoliteFetcher;

  constructor() {
    this.fetcher = new PoliteFetcher({
      concurrency: 1,
      intervalMs: 2000,
      userAgent: "ClassActionOS/1.0 (legal-research; admin@classactionos.dev)",
    });
  }

  async fetchCases(options?: FetchOptions): Promise<UnifiedCase[]> {
    logger.info("FTC: Starting refund program ingestion");
    const cases: UnifiedCase[] = [];

    try {
      // Fetch the main refunds listing page
      const html = await this.fetcher.fetchHtml(FTC_REFUNDS_URL);
      const entries = this.parseListingPage(html);
      logger.info(`FTC: Found ${entries.length} refund entries on listing page`);

      const limit = options?.limit ?? entries.length;

      for (const entry of entries.slice(0, limit)) {
        try {
          const detailCase = await this.fetchDetailPage(entry);
          if (detailCase) {
            cases.push(detailCase);
          }
        } catch (err) {
          logger.warn({ err, url: entry.url }, "FTC: Failed to fetch detail page");
        }
      }
    } catch (err) {
      logger.error({ err }, "FTC: Failed to fetch refunds listing");
      throw err;
    }

    logger.info(`FTC: Ingested ${cases.length} refund cases`);
    return cases;
  }

  /**
   * Parse the FTC refunds listing page for individual program links.
   */
  private parseListingPage(html: string): FtcRefundEntry[] {
    const $ = cheerio.load(html);
    const entries: FtcRefundEntry[] = [];

    // FTC lists refund programs as links in the main content area.
    // The exact selector may need adjustment as the FTC updates their site.
    $("article, .view-content .views-row, .node--type-refund-case, li").each(
      (_, el) => {
        const $el = $(el);
        const $link = $el.find("a").first();
        const title = $link.text().trim();
        let href = $link.attr("href") ?? "";

        if (!title || title.length < 5) return;

        // Make absolute URL
        if (href.startsWith("/")) {
          href = FTC_BASE + href;
        }
        if (!href.startsWith("http")) return;

        // Skip non-refund links
        if (
          href.includes("/news-events/") ||
          href.includes("/legal-library/") ||
          href.includes("/policy/")
        ) {
          return;
        }

        const description =
          $el.find(".field--name-body, .views-field-body, p").first().text().trim() || "";
        const dateText =
          $el.find(".date, .views-field-created, time").first().text().trim() || undefined;

        entries.push({ title, url: href, description, date: dateText });
      }
    );

    // De-duplicate by URL
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.url)) return false;
      seen.add(e.url);
      return true;
    });
  }

  /**
   * Fetch an individual refund detail page and extract case information.
   */
  private async fetchDetailPage(entry: FtcRefundEntry): Promise<UnifiedCase | null> {
    const html = await this.fetcher.fetchHtml(entry.url);
    const $ = cheerio.load(html);

    const bodyText =
      $("article .field--name-body, .node__content, main .content")
        .first()
        .text()
        .trim() || "";

    if (!bodyText && !entry.description) return null;

    const fullText = `${entry.description}\n\n${bodyText}`;

    // Extract deadline patterns
    const claimDeadline = this.extractDate(fullText, [
      /claim(?:s)?\s+(?:must\s+be\s+(?:filed|submitted)|deadline|by)\s*[:-]?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
      /deadline[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
      /by\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
    ]);

    // Extract claim URL from the page
    let claimUrl: string | null = null;
    $("a").each((_, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr("href") ?? "";
      if (
        (text.includes("file a claim") ||
          text.includes("submit a claim") ||
          text.includes("claim form") ||
          text.includes("get your refund")) &&
        href.startsWith("http")
      ) {
        claimUrl = href;
      }
    });

    // Determine status
    const lowerText = fullText.toLowerCase();
    let status: UnifiedCase["status"] = "claims_open";
    if (
      lowerText.includes("claims are closed") ||
      lowerText.includes("deadline has passed") ||
      lowerText.includes("no longer accepting")
    ) {
      status = "claims_closed";
    } else if (lowerText.includes("refund") && lowerText.includes("check")) {
      status = "claims_open";
    }

    // Extract settlement amount patterns
    const settlementAmount = this.extractDollarAmount(fullText);

    // Extract defendants from title
    const defendants = this.extractDefendants(entry.title);

    return {
      case_id: crypto.randomUUID(),
      source: "ftc",
      source_id: entry.url,
      source_url: entry.url,
      case_name: entry.title,
      court: "Federal Trade Commission",
      docket_number: null,
      filed_date: entry.date ? this.normalizeDate(entry.date) : null,
      updated_date: new Date().toISOString().split("T")[0],
      defendants,
      case_type: "consumer",
      status,
      claim_deadline: claimDeadline,
      opt_out_deadline: null,
      objection_deadline: null,
      estimated_payout: settlementAmount
        ? { min: null, max: null, notes: `Total settlement: $${settlementAmount.toLocaleString()}` }
        : null,
      settlement_amount: settlementAmount,
      eligibility_text: this.extractEligibility(fullText),
      class_definition: null,
      claim_url: claimUrl,
      proof_required: this.detectProofRequired(fullText),
      ai_score: 0,
      match_score: 0,
      extraction_confidence: 0.7,
      documents: [entry.url],
      raw_text: fullText.slice(0, 10000),
      ai_summary: null,
    };
  }

  private extractDate(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return this.normalizeDate(match[1]);
      }
    }
    return null;
  }

  private normalizeDate(dateStr: string): string | null {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split("T")[0];
    } catch {
      return null;
    }
  }

  private extractDollarAmount(text: string): number | null {
    const match = text.match(
      /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:million|billion)?/i
    );
    if (!match) return null;
    let amount = parseFloat(match[1].replace(/,/g, ""));
    if (/million/i.test(text.slice(match.index!, match.index! + match[0].length + 10))) {
      amount *= 1_000_000;
    }
    if (/billion/i.test(text.slice(match.index!, match.index! + match[0].length + 10))) {
      amount *= 1_000_000_000;
    }
    return amount;
  }

  private extractDefendants(title: string): string[] {
    // FTC titles often follow "Company Name" pattern
    const parts = title.split(/\s*[–\-|:]\s*/);
    if (parts.length > 0) {
      return [parts[0].trim()];
    }
    return [title];
  }

  private extractEligibility(text: string): string | null {
    const patterns = [
      /(?:you\s+may\s+be\s+eligible|eligible\s+(?:if|consumers?|individuals?|people))[^.]+\./i,
      /(?:if\s+you\s+(?:purchased|bought|used|signed up|paid))[^.]+\./i,
      /(?:consumers?\s+who)[^.]+\./i,
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match) return match[0].trim();
    }
    return null;
  }

  private detectProofRequired(text: string): UnifiedCase["proof_required"] {
    const proofs: UnifiedCase["proof_required"] = [];
    const lower = text.toLowerCase();
    if (lower.includes("receipt")) proofs.push("receipt");
    if (lower.includes("statement") || lower.includes("bank")) proofs.push("account_statement");
    if (lower.includes("email")) proofs.push("email");
    if (lower.includes("screenshot")) proofs.push("screenshot");
    if (lower.includes("no proof") || lower.includes("no documentation")) proofs.push("none");
    return proofs.length > 0 ? proofs : ["none"];
  }

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await fetch(FTC_REFUNDS_URL, { method: "HEAD" });
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
