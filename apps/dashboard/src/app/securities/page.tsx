"use client";

import { CaseCard } from "@/components/case-card";
import { TrendingUp } from "lucide-react";

const mockSecurities = [
  {
    id: "s1",
    title: "Robinhood GameStop Trading Restrictions Settlement",
    source: "sec",
    case_type: "securities",
    defendants: ["Robinhood Markets, Inc."],
    status: "claim_open",
    estimated_payout_min: 50,
    estimated_payout_max: 10000,
    claim_deadline: new Date(Date.now() + 35 * 86400000).toISOString(),
    ai_score: 88,
    summary: "Settlement for investors impacted by trading restrictions during January 2021.",
    claim_url: "https://example.com/robinhood",
  },
  {
    id: "s2",
    title: "Luckin Coffee Securities Fraud Settlement",
    source: "sec",
    case_type: "securities",
    defendants: ["Luckin Coffee Inc."],
    status: "under_review",
    estimated_payout_min: 100,
    estimated_payout_max: 5000,
    claim_deadline: new Date(Date.now() + 50 * 86400000).toISOString(),
    ai_score: 72,
    summary: "Securities fraud class action related to fabricated financial results.",
  },
];

export default function SecuritiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-brand-400" />
          Securities Actions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          SEC enforcement actions & securities fraud settlements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockSecurities.map((c) => (
          <CaseCard key={c.id} caseData={c} />
        ))}
      </div>
    </div>
  );
}
