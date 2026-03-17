/**
 * SEC Litigation Releases Adapter
 *
 * Fetches from https://www.sec.gov/enforcement-litigation/litigation-releases
 * for securities-related federal civil enforcement cases.
 * Lane C — securities actions for investment account matching.
 */

import * as cheerio from "cheerio";
import type { UnifiedCase } from "@class-action-os/shared";
import type { SourceAdapter, FetchOptions, SourceHealth } from "../types.js";
import { PoliteFetcher } from "../utils/fetcher.js";
import { logger } from "../utils/logger.js";

const SEC_BASE = "https://www.sec.gov";
const SEC_LIT_URL = "https://www.sec.gov/enforcement-litigation/litigation-releases";

export class SecAdapter implements SourceAdapter {
  readonly sourceName = "sec" as const;
  readonly displayName = "SEC Litigation Releases";
  private fetcher: PoliteFetcher;

  constructor() {
    this.fetcher = new PoliteFetcher({
      concurrency: 1,
      intervalMs: 2000,
      userAgent:
        process.env.SEC_USER_AGENT ??
        "ClassActionOS/1.0 (legal-research; admin@classactionos.dev)",
    });
  }

  async fetchCases(options?: FetchOptions): Promise<UnifiedCase[]> {
    logger.info("SEC: Starting litigation releases ingestion");
    const cases: UnifiedCase[] = [];

    try {
      const html = await this.fetcher.fetchHtml(SEC_LIT_URL);
      const $ = cheerio.load(html);

      const entries: Array<{ title: string; url: string; date: string; text: string }> = [];

      // SEC litigation releases are typically listed in a table or list
      $("table tr, .views-row, article, li").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a").first();
        const title = $link.text().trim();
        let href = $link.attr("href") ?? "";

        if (!title || title.length < 10) return;
        if (href.startsWith("/")) href = SEC_BASE + href;
        if (!href.startsWith("http")) return;

        const dateText =
          $el.find("td:first-child, .date-display-single, time").first().text().trim() || "";
        const descText = $el.text().trim();

        entries.push({ title, url: href, date: dateText, text: descText });
      });

      // De-dup
      const seen = new Set<string>();
      const unique = entries.filter((e) => {
        if (seen.has(e.url)) return false;
        seen.add(e.url);
        return true;
      });

      logger.info(`SEC: Found ${unique.length} litigation release entries`);
      const limit = options?.limit ?? unique.length;

      for (const entry of unique.slice(0, limit)) {
        try {
          const detail = await this.fetchDetail(entry);
          if (detail) cases.push(detail);
        } catch (err) {
          logger.warn({ err, url: entry.url }, "SEC: Failed detail fetch");
        }
      }
    } catch (err) {
      logger.error({ err }, "SEC: Failed to fetch listing");
      throw err;
    }

    logger.info(`SEC: Ingested ${cases.length} cases`);
    return cases;
  }

  private async fetchDetail(entry: {
    title: string;
    url: string;
    date: string;
    text: string;
  }): Promise<UnifiedCase | null> {
    const html = await this.fetcher.fetchHtml(entry.url);
    const $ = cheerio.load(html);

    const bodyText =
      $("article .field--name-body, .node__content, #main-content, main .content")
        .first()
        .text()
        .trim() || "";

    const fullText = `${entry.text}\n\n${bodyText}`;
    if (fullText.length < 50) return null;

    const defendants = this.extractDefendants(entry.title, fullText);
    const settlementAmount = this.extractDollarAmount(fullText);
    const filedDate = this.normalizeDate(entry.date);

    return {
      case_id: crypto.randomUUID(),
      source: "sec",
      source_id: entry.url,
      source_url: entry.url,
      case_name: entry.title,
      court: "SEC / Federal",
      docket_number: this.extractLitNumber(entry.title, entry.url),
      filed_date: filedDate,
      updated_date: new Date().toISOString().split("T")[0],
      defendants,
      case_type: "securities",
      status: this.inferStatus(fullText),
      claim_deadline: this.extractDeadline(fullText),
      opt_out_deadline: null,
      objection_deadline: null,
      estimated_payout: settlementAmount
        ? { min: null, max: null, notes: `SEC action: $${settlementAmount.toLocaleString()}` }
        : null,
      settlement_amount: settlementAmount,
      eligibility_text: this.extractEligibility(fullText),
      class_definition: null,
      claim_url: null,
      proof_required: ["account_statement"],
      ai_score: 0,
      match_score: 0,
      extraction_confidence: 0.65,
      documents: [entry.url],
      raw_text: fullText.slice(0, 10000),
      ai_summary: null,
    };
  }

  private extractDefendants(title: string, _text: string): string[] {
    // SEC titles often: "SEC Charges [Company] with..."
    const chargesMatch = title.match(
      /(?:SEC\s+)?(?:Charges?|Sues?|Obtains?|Settles?\s+with)\s+(.+?)(?:\s+(?:with|for|in)\b)/i
    );
    if (chargesMatch) {
      return chargesMatch[1]
        .split(/,\s*|\s+and\s+/i)
        .map((d) => d.trim())
        .filter(Boolean);
    }

    const vMatch = title.match(/v\.?\s+(.+)/i);
    if (vMatch) return [vMatch[1].trim()];

    return [title.split(/[–\-:]/)[0].trim()];
  }

  private extractLitNumber(title: string, url: string): string | null {
    const match = url.match(/LR-?\d+/i) || title.match(/LR-?\d+/i);
    return match ? match[0] : null;
  }

  private inferStatus(text: string): UnifiedCase["status"] {
    const lower = text.toLowerCase();
    if (lower.includes("settlement") || lower.includes("settled")) return "settled";
    if (lower.includes("judgment") || lower.includes("ordered")) return "settled";
    if (lower.includes("charges") || lower.includes("filed")) return "filed";
    return "pending";
  }

  private extractDeadline(text: string): string | null {
    const m = text.match(/deadline[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i);
    if (m?.[1]) return this.normalizeDate(m[1]);
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

  private extractEligibility(text: string): string | null {
    const m = text.match(
      /(?:investors?\s+who|shareholders?\s+who|purchasers?\s+of)[^.]+\./i
    );
    return m ? m[0].trim() : null;
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

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await fetch(SEC_LIT_URL, { method: "HEAD" });
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
