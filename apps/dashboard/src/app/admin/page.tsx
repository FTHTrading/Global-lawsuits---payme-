"use client";

import { Settings, RefreshCw, Play, Database, Zap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function AdminPage() {
  const [running, setRunning] = useState<string | null>(null);

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
      description: "Run complete pipeline: ingest → triage → match → deadlines → email",
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-400" />
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage pipeline operations, trigger jobs, and review system status
        </p>
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

      {/* System Info */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          System Info
        </h2>
        <div className="card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">API</p>
              <p className="text-white font-medium">Running</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Workers</p>
              <p className="text-white font-medium">4 active</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Database</p>
              <p className="text-white font-medium">PostgreSQL 16</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Redis</p>
              <p className="text-white font-medium">Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
