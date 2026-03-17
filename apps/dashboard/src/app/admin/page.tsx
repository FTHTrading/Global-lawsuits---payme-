"use client";

import { Settings, RefreshCw, Play, Database, Zap, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [running, setRunning] = useState<string | null>(null);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const actions = [
    {
      id: "ingest-all",
      label: "Ingest All Sources",
      description: "Fetch latest cases from all 6 data sources",
      icon: RefreshCw,
      color: "brand",
    },
    {
      id: "triage",
      label: "Run AI Triage",
      description: "Extract fields and score all untriaged cases",
      icon: Zap,
      color: "yellow",
    },
    {
      id: "match",
      label: "Run Entity Matching",
      description: "Match all cases against user profiles",
      icon: Users,
      color: "green",
    },
    {
      id: "deadlines",
      label: "Check Deadlines",
      description: "Scan approaching deadlines and send notifications",
      icon: Play,
      color: "red",
    },
    {
      id: "rescore",
      label: "Re-score All Cases",
      description: "Recalculate AI scores for all cases in database",
      icon: Database,
      color: "blue",
    },
    {
      id: "sync",
      label: "Full Daily Sync",
      description: "Run complete pipeline: ingest ? triage ? match ? deadlines ? email",
      icon: RefreshCw,
      color: "brand",
    },
  ];

  async function runAction(id: string) {
    setRunning(id);
    // In production this would call the API
    await new Promise((r) => setTimeout(r, 2000));
    setRunning(null);
  }

  async function fetchPendingReviews() {
    setLoadingReviews(true);
    try {
      // In development, Next.js proxy/rewrites needs to map to 4000, 
      // or we can just fetch from localhost:4000 directly.
      const res = await fetch("http://localhost:4000/api/admin/reviews/pending");
      const data = await res.json();
      setPendingReviews(data.data || []);
    } catch (err) {
      console.error("Failed to load reviews", err);
    }
    setLoadingReviews(false);
  }

  async function approveReview(id: string) {
    try {
      const res = await fetch("http://localhost:4000/api/admin/reviews/" + id + "/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: "admin-local" })
      });
      if (res.ok) {
        setPendingReviews((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to approve review", err);
    }
  }

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-400" />
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage pipeline operations, review AI extractions, and trigger jobs
        </p>
      </div>

      {/* AI Extraction Reviews */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Pending AI Extractions ({pendingReviews.length})
        </h2>
        {loadingReviews ? (
          <p className="text-gray-500 text-sm">Loading pending reviews...</p>
        ) : pendingReviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending extractions needing manual review.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingReviews.map((review) => (
              <div key={review.id} className="card p-4 border border-brand-500/20 bg-black/40">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-white">Case ID: {review.caseId}</h3>
                    <p className="text-xs text-gray-400">Extraction Confidence: {(Math.round((review.confidence ?? 0) * 100))}%</p>
                  </div>
                  <button 
                    onClick={() => approveReview(review.id)}
                    className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded transition"
                  >
                    Approve Extraction
                  </button>
                </div>
                <div className="bg-black/60 p-3 rounded text-xs text-gray-300 font-mono overflow-auto max-h-40">
                  {JSON.stringify(review.extractedPayload, null, 2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => runAction(action.id)}
              disabled={running !== null}
              className={cn(
                "card text-left transition-all hover:border-brand-500/40",
                running === action.id && "animate-pulse border-brand-500/40"
              )}
            >
              <div className="flex items-start gap-3">
                <action.icon
                  className={cn(
                    "w-5 h-5 shrink-0",
                    running === action.id
                      ? "text-brand-400 animate-spin"
                      : "text-gray-400"
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-white">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
