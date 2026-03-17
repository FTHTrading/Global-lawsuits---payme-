"use client";

import { StatCard } from "@/components/stat-card";
import { CaseCard } from "@/components/case-card";
import {
  Scale,
  TrendingUp,
  Clock,
  AlertTriangle,
  DollarSign,
  Activity,
} from "lucide-react";

// Demo data for initial render — will be replaced by SWR fetches
const mockStats = {
  totalCases: 247,
  openClaims: 38,
  approachingDeadlines: 12,
  potentialRecovery: 84500,
};

const mockTopCases = [
  {
    id: "1",
    title: "Apple iPhone Throttling Settlement",
    source: "ftc",
    case_type: "consumer",
    defendants: ["Apple Inc."],
    status: "claim_open",
    estimated_payout_min: 25,
    estimated_payout_max: 500,
    claim_deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    ai_score: 92,
    summary: "Settlement for users who experienced reduced iPhone performance due to battery management software.",
    claim_url: "https://example.com/claim",
  },
  {
    id: "2",
    title: "Capital One Data Breach Settlement",
    source: "courtlistener",
    case_type: "consumer",
    defendants: ["Capital One Financial Corp"],
    status: "claim_open",
    estimated_payout_min: 50,
    estimated_payout_max: 25000,
    claim_deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
    ai_score: 87,
    summary: "Class action settlement for individuals affected by the 2019 Capital One data breach.",
  },
  {
    id: "3",
    title: "Google Location Tracking Settlement",
    source: "sec",
    case_type: "privacy",
    defendants: ["Google LLC", "Alphabet Inc."],
    status: "under_review",
    estimated_payout_min: 7,
    estimated_payout_max: 12,
    claim_deadline: new Date(Date.now() + 45 * 86400000).toISOString(),
    ai_score: 74,
    summary: "Settlement addressing allegations that Google tracked user locations even when Location History was turned off.",
  },
  {
    id: "4",
    title: "Wells Fargo Unauthorized Accounts",
    source: "eeoc",
    case_type: "employment",
    defendants: ["Wells Fargo & Company"],
    status: "claim_open",
    estimated_payout_min: 1000,
    estimated_payout_max: 5000,
    claim_deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    ai_score: 81,
    summary: "Settlement for employees terminated or disciplined in connection with sales practices.",
  },
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time class action intelligence overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={mockStats.totalCases}
          subtitle="Across 6 sources"
          icon={Scale}
          color="brand"
          trend={{ value: 12, label: "this week" }}
        />
        <StatCard
          title="Open Claims"
          value={mockStats.openClaims}
          subtitle="Ready to file"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Approaching Deadlines"
          value={mockStats.approachingDeadlines}
          subtitle="Within 14 days"
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Potential Recovery"
          value={`$${(mockStats.potentialRecovery / 1000).toFixed(1)}k`}
          subtitle="Estimated total"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Urgent Deadlines Banner */}
      <div className="card bg-red-500/5 border-red-500/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">
              3 deadlines expiring within 7 days
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and file claims before they expire
            </p>
          </div>
          <button className="btn-primary ml-auto text-xs !py-1.5 !px-3">
            View All
          </button>
        </div>
      </div>

      {/* Top Ranked Cases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Top Ranked Cases
          </h2>
          <button className="btn-secondary text-xs">View All Cases</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockTopCases.map((c) => (
            <CaseCard key={c.id} caseData={c} />
          ))}
        </div>
      </div>

      {/* Source Activity */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Source Activity
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: "FTC", icon: "🛡️", cases: 45, status: "healthy" },
            { name: "EEOC", icon: "⚖️", cases: 23, status: "healthy" },
            { name: "CourtListener", icon: "📜", cases: 89, status: "healthy" },
            { name: "PACER", icon: "🏛️", cases: 56, status: "warning" },
            { name: "SEC", icon: "📊", cases: 28, status: "healthy" },
            { name: "ClassAction.org", icon: "🔍", cases: 6, status: "stale" },
          ].map((source) => (
            <div key={source.name} className="card text-center">
              <span className="text-2xl">{source.icon}</span>
              <p className="text-xs font-medium text-white mt-2">
                {source.name}
              </p>
              <p className="text-lg font-bold text-white mt-1">
                {source.cases}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    source.status === "healthy"
                      ? "bg-green-400"
                      : source.status === "warning"
                      ? "bg-yellow-400"
                      : "bg-red-400"
                  }`}
                />
                <span className="text-[10px] text-gray-500">
                  {source.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
