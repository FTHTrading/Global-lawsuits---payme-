"use client";

import { UserCheck, ExternalLink, X } from "lucide-react";
import { cn, formatCurrency, daysUntil, urgencyColor, sourceIcon, confidenceBadge } from "@/lib/utils";

const mockMatches = [
  {
    id: "m1",
    confidence: "high",
    match_score: 0.89,
    match_reasons: ["You purchased an iPhone", "Apple is in your merchant list"],
    case: {
      id: "1",
      title: "Apple iPhone Throttling Settlement",
      source: "ftc",
      defendants: ["Apple Inc."],
      status: "claim_open",
      estimated_payout_min: 25,
      estimated_payout_max: 500,
      claim_deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
      claim_url: "https://example.com/claim",
    },
  },
  {
    id: "m2",
    confidence: "high",
    match_score: 0.82,
    match_reasons: ["Robinhood is in your brokerage accounts"],
    case: {
      id: "s1",
      title: "Robinhood GameStop Trading Restrictions",
      source: "sec",
      defendants: ["Robinhood Markets, Inc."],
      status: "claim_open",
      estimated_payout_min: 50,
      estimated_payout_max: 10000,
      claim_deadline: new Date(Date.now() + 35 * 86400000).toISOString(),
    },
  },
  {
    id: "m3",
    confidence: "medium",
    match_score: 0.61,
    match_reasons: ["Capital One matched via entity alias"],
    case: {
      id: "2",
      title: "Capital One Data Breach Settlement",
      source: "courtlistener",
      defendants: ["Capital One Financial Corp"],
      status: "claim_open",
      estimated_payout_min: 50,
      estimated_payout_max: 25000,
      claim_deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
    },
  },
];

export default function MatchesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-brand-400" />
          My Matches
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cases matched to your profile — review and file claims
        </p>
      </div>

      <div className="space-y-3">
        {mockMatches.map((match) => {
          const days = daysUntil(match.case.claim_deadline);
          return (
            <div key={match.id} className="card-hover animate-fade-in">
              <div className="flex items-start gap-4">
                {/* Confidence indicator */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2",
                      match.match_score >= 0.8
                        ? "border-green-500 text-green-400"
                        : match.match_score >= 0.6
                        ? "border-yellow-500 text-yellow-400"
                        : "border-gray-600 text-gray-400"
                    )}
                  >
                    {Math.round(match.match_score * 100)}%
                  </div>
                  <span
                    className={cn(
                      "badge text-[10px] mt-1",
                      confidenceBadge(match.confidence)
                    )}
                  >
                    {match.confidence}
                  </span>
                </div>

                {/* Case details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{sourceIcon(match.case.source)}</span>
                    <h3 className="font-semibold text-white text-sm truncate">
                      {match.case.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    vs. {match.case.defendants.join(", ")}
                  </p>

                  {/* Match reasons */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {match.match_reasons.map((reason, i) => (
                      <span
                        key={i}
                        className="badge bg-brand-500/10 text-brand-300 border-brand-500/20 text-[10px]"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-4 mt-3">
                    {match.case.estimated_payout_min && (
                      <span className="text-xs text-gray-400">
                        {formatCurrency(match.case.estimated_payout_min)} –{" "}
                        {formatCurrency(match.case.estimated_payout_max!)}
                      </span>
                    )}
                    <span className={cn("text-xs font-medium", urgencyColor(days))}>
                      {days}d left
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  {match.case.claim_url ? (
                    <a
                      href={match.case.claim_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs !py-1.5"
                    >
                      File Claim <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  ) : (
                    <button className="btn-primary text-xs !py-1.5">
                      Prepare Claim
                    </button>
                  )}
                  <button className="btn-secondary text-xs !py-1.5">
                    <X className="w-3 h-3 mr-1" /> Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
