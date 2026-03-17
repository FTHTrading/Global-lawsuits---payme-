"use client";

import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn, formatDate, daysUntil, urgencyColor, sourceIcon } from "@/lib/utils";

const mockDeadlines = [
  {
    id: "d1",
    type: "claim_deadline",
    date: new Date(Date.now() + 3 * 86400000).toISOString(),
    caseTitle: "Apple iPhone Throttling Settlement",
    source: "ftc",
    defendants: ["Apple Inc."],
  },
  {
    id: "d2",
    type: "claim_deadline",
    date: new Date(Date.now() + 5 * 86400000).toISOString(),
    caseTitle: "T-Mobile Data Breach Settlement",
    source: "courtlistener",
    defendants: ["T-Mobile US, Inc."],
  },
  {
    id: "d3",
    type: "objection_deadline",
    date: new Date(Date.now() + 10 * 86400000).toISOString(),
    caseTitle: "Wells Fargo EEOC Settlement",
    source: "eeoc",
    defendants: ["Wells Fargo & Company"],
  },
  {
    id: "d4",
    type: "claim_deadline",
    date: new Date(Date.now() + 21 * 86400000).toISOString(),
    caseTitle: "Capital One Data Breach",
    source: "courtlistener",
    defendants: ["Capital One Financial Corp"],
  },
  {
    id: "d5",
    type: "claim_deadline",
    date: new Date(Date.now() + 35 * 86400000).toISOString(),
    caseTitle: "Robinhood GameStop Settlement",
    source: "sec",
    defendants: ["Robinhood Markets, Inc."],
  },
  {
    id: "d6",
    type: "claim_deadline",
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    caseTitle: "Facebook Privacy Settlement (Expired)",
    source: "courtlistener",
    defendants: ["Meta Platforms, Inc."],
  },
];

export default function DeadlinesPage() {
  const sorted = [...mockDeadlines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const expired = sorted.filter((d) => daysUntil(d.date) <= 0);
  const upcoming = sorted.filter((d) => daysUntil(d.date) > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-brand-400" />
          Deadline Calendar
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track claim deadlines, objection dates, and hearing schedules
        </p>
      </div>

      {/* Urgent banner */}
      {upcoming.filter((d) => daysUntil(d.date) <= 7).length > 0 && (
        <div className="card bg-red-500/5 border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-400 font-medium">
              {upcoming.filter((d) => daysUntil(d.date) <= 7).length} deadline(s) within 7 days
            </p>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Upcoming
        </h2>
        <div className="space-y-2">
          {upcoming.map((d) => {
            const days = daysUntil(d.date);
            return (
              <div key={d.id} className="card-hover animate-fade-in">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                      days <= 3
                        ? "bg-red-500/20 text-red-400"
                        : days <= 7
                        ? "bg-orange-500/20 text-orange-400"
                        : days <= 14
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-green-500/20 text-green-400"
                    )}
                  >
                    {days}d
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{sourceIcon(d.source)}</span>
                      <p className="text-sm font-medium text-white truncate">
                        {d.caseTitle}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {d.type.replace(/_/g, " ")} · {formatDate(d.date)} · vs.{" "}
                      {d.defendants.join(", ")}
                    </p>
                  </div>
                  <div className={cn("text-xs font-medium", urgencyColor(days))}>
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    {days} days
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expired */}
      {expired.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Expired
          </h2>
          <div className="space-y-2 opacity-50">
            {expired.map((d) => (
              <div key={d.id} className="card">
                <div className="flex items-center gap-4">
                  <CheckCircle className="w-5 h-5 text-gray-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 truncate line-through">
                      {d.caseTitle}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Expired {formatDate(d.date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
