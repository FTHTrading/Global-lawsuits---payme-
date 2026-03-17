/**
 * ClassAction.org Discovery Adapter (optional)
 *
 * Scrapes classaction.org for consumer-facing settlement listings.
 * Lower confidence than official sources — used for discovery only.
 * Always attributes source and never relies solely on this data.
 */

import * as cheerio from "cheerio";
import type { UnifiedCase } from "@class-action-os/shared";
import type { SourceAdapter, FetchOptions, SourceHealth } from "../types.js";
import { PoliteFetcher } from "../utils/fetcher.js";
import { logger } from "../utils/logger.js";

const CA_BASE = "https://www.classaction.org";
const CA_SETTLEMENTS = `${CA_BASE}/settlements`;

export class ClassActionOrgAdapter implements SourceAdapter {
  readonly sourceName = "classactionorg" as const;
  readonly displayName = "ClassAction.org (Discovery)";
  private fetcher: PoliteFetcher;

  constructor() {
    this.fetcher = new PoliteFetcher({
      concurrency: 1,
      intervalMs: 3000,
      userAgent: "ClassActionOS/1.0 (legal-research; admin@classactionos.dev)",
    });
  }

  async fetchCases(options?: FetchOptions): Promise<UnifiedCase[]> {
    logger.info("ClassAction.org: Starting settlement discovery");
    const cases: UnifiedCase[] = [];

    try {
      const html = await this.fetcher.fetchHtml(CA_SETTLEMENTS);
      const $ = cheerio.load(html);

      const entries: Array<{ title: string; url: string; excerpt: string }> = [];

      $("article, .settlement-item, .node, .views-row, .post").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a").first();
        const title = ($link.text() || $el.find("h2, h3").first().text()).trim();
        let href = $link.attr("href") ?? "";

        if (!title || title.length < 5) return;
        if (href.startsWith("/")) href = CA_BASE + href;
        if (!href.startsWith("http")) return;

        const excerpt =
          $el.find("p, .field--name-body, .excerpt, .summary").first().text().trim() || "";

        entries.push({ title, url: href, excerpt });
      });

      const seen = new Set<string>();
      const unique = entries.filter((e) => {
        if (seen.has(e.url)) return false;
        seen.add(e.url);
        return true;
      });

      logger.info(`ClassAction.org: Found ${unique.length} entries`);
      const limit = options?.limit ?? unique.length;

      for (const entry of unique.slice(0, limit)) {
        try {
          const caseData = await this.fetchDetail(entry);
          if (caseData) cases.push(caseData);
        } catch (err) {
          logger.warn({ err, url: entry.url }, "ClassAction.org: Detail failed");
        }
      }
    } catch (err) {
      logger.error({ err }, "ClassAction.org: Failed listing fetch");
      throw err;
    }

    logger.info(`ClassAction.org: Ingested ${cases.length} cases`);
    return cases;
  }

  private async fetchDetail(entry: {
    title: string;
    url: string;
    excerpt: string;
  }): Promise<UnifiedCase | null> {
    const html = await this.fetcher.fetchHtml(entry.url);
    const $ = cheerio.load(html);

    const bodyText =
      $("article .field--name-body, .node__content, .entry-content, main .content")
        .first()
        .text()
        .trim() || "";

    const fullText = `${entry.excerpt}\n\n${bodyText}`;
    if (fullText.length < 50) return null;

    const settlementAmount = this.extractDollarAmount(fullText);
    const claimDeadline = this.extractDeadline(fullText);

    // Extract claim link
    let claimUrl: string | null = null;
    $("a").each((_, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr("href") ?? "";
      if (
        (text.includes("file a claim") ||
          text.includes("submit a claim") ||
          text.includes("claim form")) &&
        href.startsWith("http")
      ) {
        claimUrl = href;
      }
    });

    const lower = fullText.toLowerCase();
    let status: UnifiedCase["status"] = "settled";
    if (lower.includes("claims are open") || lower.includes("file a claim")) {
      status = "claims_open";
    } else if (lower.includes("closed") || lower.includes("expired")) {
      status = "claims_closed";
    }

    return {
      case_id: crypto.randomUUID(),
      source: "classactionorg",
      source_id: entry.url,
      source_url: entry.url,
      case_name: entry.title,
      court: null,
      docket_number: null,
      filed_date: null,
      updated_date: new Date().toISOString().split("T")[0],
      defendants: this.extractDefendants(entry.title),
      case_type: this.classifyFromTitle(entry.title, fullText),
      status,
      claim_deadline: claimDeadline,
      opt_out_deadline: null,
      objection_deadline: null,
      estimated_payout: settlementAmount
        ? { min: null, max: null, notes: `$${settlementAmount.toLocaleString()}` }
        : null,
      settlement_amount: settlementAmount,
      eligibility_text: this.extractEligibility(fullText),
      class_definition: null,
      claim_url: claimUrl,
      proof_required: ["none"],
      ai_score: 0,
      match_score: 0,
      extraction_confidence: 0.4, // Low — secondary source
      documents: [entry.url],
      raw_text: fullText.slice(0, 10000),
      ai_summary: null,
    };
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

  private extractDeadline(text: string): string | null {
    const m = text.match(
      /(?:deadline|by|before|must\s+be\s+(?:filed|submitted))[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i
    );
    if (m?.[1]) {
      try {
        const d = new Date(m[1]);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      } catch { /* date parse failed */ }
    }
    return null;
  }

  private extractDefendants(title: string): string[] {
    const parts = title.split(/\s*[–\-|:]\s*/);
    if (parts.length > 0) return [parts[0].trim()];
    return [title];
  }

  private extractEligibility(text: string): string | null {
    const m = text.match(
      /(?:eligible\s+if|you\s+may\s+be\s+eligible|class\s+members?\s+include)[^.]+\./i
    );
    return m ? m[0].trim() : null;
  }

  private classifyFromTitle(title: string, text: string): UnifiedCase["case_type"] {
    const combined = `${title} ${text}`.toLowerCase();
    if (combined.includes("securities") || combined.includes("stock") || combined.includes("investor"))
      return "securities";
    if (combined.includes("privacy") || combined.includes("data breach")) return "privacy";
    if (combined.includes("employment") || combined.includes("wage") || combined.includes("worker"))
      return "employment";
    if (combined.includes("product") || combined.includes("defect") || combined.includes("recall"))
      return "product";
    if (combined.includes("antitrust") || combined.includes("price-fixing")) return "antitrust";
    return "consumer";
  }

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await fetch(CA_SETTLEMENTS, { method: "HEAD" });
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
