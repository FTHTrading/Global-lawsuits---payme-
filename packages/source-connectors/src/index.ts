export { FtcAdapter } from "./adapters/ftc-adapter.js";
export { EeocAdapter } from "./adapters/eeoc-adapter.js";
export { CourtListenerAdapter } from "./adapters/courtlistener-adapter.js";
export { SecAdapter } from "./adapters/sec-adapter.js";
export { PacerAdapter } from "./adapters/pacer-adapter.js";
export { ClassActionOrgAdapter } from "./adapters/classactionorg-adapter.js";

export type { SourceAdapter, FetchOptions, SourceHealth } from "./types.js";
export { PoliteFetcher, defaultFetcher } from "./utils/fetcher.js";

import { FtcAdapter } from "./adapters/ftc-adapter.js";
import { EeocAdapter } from "./adapters/eeoc-adapter.js";
import { CourtListenerAdapter } from "./adapters/courtlistener-adapter.js";
import { SecAdapter } from "./adapters/sec-adapter.js";
import { PacerAdapter } from "./adapters/pacer-adapter.js";
import { ClassActionOrgAdapter } from "./adapters/classactionorg-adapter.js";
import type { SourceAdapter } from "./types.js";

/**
 * Returns all available source adapters in priority order.
 */
export function getAllAdapters(): SourceAdapter[] {
  return [
    new FtcAdapter(),
    new EeocAdapter(),
    new CourtListenerAdapter(),
    new PacerAdapter(),
    new SecAdapter(),
    new ClassActionOrgAdapter(),
  ];
}

/**
 * Get a specific adapter by source name.
 */
export function getAdapter(source: string): SourceAdapter | null {
  const adapters: Record<string, () => SourceAdapter> = {
    ftc: () => new FtcAdapter(),
    eeoc: () => new EeocAdapter(),
    courtlistener: () => new CourtListenerAdapter(),
    pacer: () => new PacerAdapter(),
    sec: () => new SecAdapter(),
    classactionorg: () => new ClassActionOrgAdapter(),
  };
  const factory = adapters[source];
  return factory ? factory() : null;
}
