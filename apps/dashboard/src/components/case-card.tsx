import { cn, formatCurrency, formatDate, daysUntil, urgencyColor, sourceIcon, confidenceBadge } from "@/lib/utils";
import { ExternalLink, Clock, DollarSign, AlertTriangle } from "lucide-react";

interface CaseCardProps {
  caseData: any;
  compact?: boolean;
}

export function CaseCard({ caseData, compact }: CaseCardProps) {
  const deadlineDays = caseData.claim_deadline
    ? daysUntil(caseData.claim_deadline)
    : null;

  return (
    <div className="card-hover animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Source badge + type */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{sourceIcon(caseData.source)}</span>
            <span className="badge bg-surface-overlay text-gray-400 border-surface-border text-[10px] uppercase tracking-wider">
              {caseData.source}
            </span>
            {caseData.case_type && (
              <span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20 text-[10px]">
                {caseData.case_type}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-white text-sm leading-snug truncate">
            {caseData.title}
          </h3>

          {/* Defendants */}
          {caseData.defendants?.length > 0 && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              vs. {caseData.defendants.join(", ")}
            </p>
          )}

          {/* Summary */}
          {!compact && caseData.summary && (
            <p className="text-xs text-gray-400 mt-2 line-clamp-2">
              {caseData.summary}
            </p>
          )}
        </div>

        {/* Score */}
        {caseData.ai_score != null && (
          <div className="flex flex-col items-center shrink-0">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2",
                caseData.ai_score >= 80
                  ? "border-green-500 text-green-400"
                  : caseData.ai_score >= 50
                  ? "border-yellow-500 text-yellow-400"
                  : "border-gray-600 text-gray-500"
              )}
            >
              {Math.round(caseData.ai_score)}
            </div>
            <span className="text-[10px] text-gray-600 mt-0.5">score</span>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-border">
        {caseData.estimated_payout_min != null && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <DollarSign className="w-3 h-3" />
            <span>
              {formatCurrency(caseData.estimated_payout_min)}
              {caseData.estimated_payout_max
                ? ` – ${formatCurrency(caseData.estimated_payout_max)}`
                : ""}
            </span>
          </div>
        )}

        {deadlineDays != null && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              urgencyColor(deadlineDays)
            )}
          >
            {deadlineDays <= 7 ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span>
              {deadlineDays <= 0
                ? "Expired"
                : `${deadlineDays}d left`}
            </span>
          </div>
        )}

        {caseData.status && (
          <span
            className={cn(
              "badge text-[10px]",
              caseData.status === "claim_open"
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : caseData.status === "under_review"
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-gray-500/20 text-gray-400 border-gray-500/30"
            )}
          >
            {caseData.status.replace(/_/g, " ")}
          </span>
        )}

        {caseData.claim_url && (
          <a
            href={caseData.claim_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Claim <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
