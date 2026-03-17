import type { UnifiedCase } from "@class-action-os/shared";

/**
 * Every source adapter must implement this interface.
 * The pipeline calls `fetchCases()` to get raw data,
 * then each adapter normalizes into UnifiedCase[].
 */
export interface SourceAdapter {
  /** Unique source identifier */
  readonly sourceName: string;

  /** Human-readable label */
  readonly displayName: string;

  /** Fetch and return normalized cases. Pages internally. */
  fetchCases(options?: FetchOptions): Promise<UnifiedCase[]>;

  /** Check source health / availability */
  healthCheck(): Promise<SourceHealth>;
}

export interface FetchOptions {
  /** Only return cases updated after this date */
  since?: Date;
  /** Max cases to return (for dev/testing) */
  limit?: number;
  /** Search term filter */
  query?: string;
}

export interface SourceHealth {
  source: string;
  healthy: boolean;
  lastChecked: Date;
  latencyMs: number;
  message?: string;
}
