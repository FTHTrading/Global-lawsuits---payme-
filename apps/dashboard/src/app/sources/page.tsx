"use client";

import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { cn, sourceIcon } from "@/lib/utils";

const mockSources = [
  {
    name: "ftc",
    displayName: "FTC Refund Programs",
    reachable: true,
    latencyMs: 245,
    lastSync: "2024-01-15T10:30:00Z",
    casesFound: 45,
    casesInserted: 3,
    casesUpdated: 8,
    status: "healthy",
  },
  {
    name: "eeoc",
    displayName: "EEOC Class Member Search",
    reachable: true,
    latencyMs: 380,
    lastSync: "2024-01-15T10:30:00Z",
    casesFound: 23,
    casesInserted: 1,
    casesUpdated: 4,
    status: "healthy",
  },
  {
    name: "courtlistener",
    displayName: "CourtListener RECAP",
    reachable: true,
    latencyMs: 150,
    lastSync: "2024-01-15T10:30:00Z",
    casesFound: 89,
    casesInserted: 12,
    casesUpdated: 15,
    status: "healthy",
  },
  {
    name: "pacer",
    displayName: "PACER Case Locator",
    reachable: true,
    latencyMs: 890,
    lastSync: "2024-01-15T08:00:00Z",
    casesFound: 56,
    casesInserted: 5,
    casesUpdated: 10,
    status: "warning",
  },
  {
    name: "sec",
    displayName: "SEC Litigation Releases",
    reachable: true,
    latencyMs: 320,
    lastSync: "2024-01-15T10:30:00Z",
    casesFound: 28,
    casesInserted: 2,
    casesUpdated: 6,
    status: "healthy",
  },
  {
    name: "classactionorg",
    displayName: "ClassAction.org",
    reachable: false,
    latencyMs: null,
    lastSync: "2024-01-14T10:30:00Z",
    casesFound: 0,
    casesInserted: 0,
    casesUpdated: 0,
    status: "error",
    lastError: "HTTP 503 Service Unavailable",
  },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "healthy":
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-400" />;
    default:
      return <Activity className="w-5 h-5 text-gray-400" />;
  }
}

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-400" />
            Source Health
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor data source connectivity and sync status
          </p>
        </div>
        <button className="btn-primary text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Sync All Now
        </button>
      </div>

      <div className="space-y-3">
        {mockSources.map((source) => (
          <div key={source.name} className="card-hover animate-fade-in">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{sourceIcon(source.name)}</span>
              <StatusIcon status={source.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {source.displayName}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {source.latencyMs != null && (
                    <span className="text-xs text-gray-500">
                      {source.latencyMs}ms latency
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Last sync:{" "}
                    {new Date(source.lastSync).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {(source as any).lastError && (
                    <span className="text-xs text-red-400">
                      {(source as any).lastError}
                    </span>
                  )}
                </div>
              </div>

              {/* Sync stats */}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{source.casesFound}</p>
                  <p>found</p>
                </div>
                <div className="text-center">
                  <p className="text-green-400 font-bold text-lg">
                    +{source.casesInserted}
                  </p>
                  <p>new</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-400 font-bold text-lg">
                    {source.casesUpdated}
                  </p>
                  <p>updated</p>
                </div>
              </div>

              <div
                className={cn(
                  "badge",
                  source.status === "healthy"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : source.status === "warning"
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                )}
              >
                {source.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
