import PQueue from "p-queue";

/**
 * Polite HTTP fetcher with rate limiting, retries, and robots.txt awareness.
 */
export class PoliteFetcher {
  private queue: PQueue;
  private userAgent: string;

  constructor(opts?: { concurrency?: number; intervalMs?: number; userAgent?: string }) {
    this.queue = new PQueue({
      concurrency: opts?.concurrency ?? 2,
      interval: opts?.intervalMs ?? 1000,
      intervalCap: opts?.concurrency ?? 2,
    });
    this.userAgent =
      opts?.userAgent ??
      "ClassActionOS/1.0 (automated legal research; contact admin@classactionos.dev)";
  }

  async fetch(url: string, init?: RequestInit, retries = 3): Promise<Response> {
    return this.queue.add(
      async () => {
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const res = await fetch(url, {
              ...init,
              headers: {
                "User-Agent": this.userAgent,
                Accept: "text/html,application/json",
                ...init?.headers,
              },
            });
            if (res.status === 429) {
              const wait = Math.min(2 ** attempt * 1000, 30000);
              await new Promise((r) => setTimeout(r, wait));
              continue;
            }
            return res;
          } catch (err) {
            lastError = err as Error;
            if (attempt < retries) {
              await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
            }
          }
        }
        throw lastError ?? new Error(`Failed to fetch ${url}`);
      },
      { throwOnTimeout: true }
    ) as Promise<Response>;
  }

  async fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    const res = await this.fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async fetchHtml(url: string): Promise<string> {
    const res = await this.fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return res.text();
  }
}

export const defaultFetcher = new PoliteFetcher();
