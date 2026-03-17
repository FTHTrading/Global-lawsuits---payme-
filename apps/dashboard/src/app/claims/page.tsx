"use client";

import { CaseCard } from "@/components/case-card";
import { Scale, Filter, ArrowUpDown } from "lucide-react";

const mockClaims = [
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
    summary: "Settlement for users who experienced reduced iPhone performance.",
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
    summary: "For individuals affected by the 2019 data breach.",
  },
  {
    id: "3",
    title: "T-Mobile Data Breach Settlement",
    source: "courtlistener",
    case_type: "consumer",
    defendants: ["T-Mobile US, Inc."],
    status: "claim_open",
    estimated_payout_min: 25,
    estimated_payout_max: 100,
    claim_deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    ai_score: 79,
    summary: "Settlement related to T-Mobile customer data breach.",
  },
  {
    id: "4",
    title: "Equifax Data Breach Settlement",
    source: "ftc",
    case_type: "consumer",
    defendants: ["Equifax Inc."],
    status: "claim_open",
    estimated_payout_min: 125,
    estimated_payout_max: 20000,
    claim_deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    ai_score: 95,
    summary: "Extended claims period for Equifax 2017 data breach victims.",
    claim_url: "https://example.com/equifax-claim",
  },
];

export default function ClaimsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-brand-400" />
            Open Claims
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cases with active claim periods — ready to file
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filter
          </button>
          <button className="btn-secondary text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
            Sort
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockClaims.map((c) => (
          <CaseCard key={c.id} caseData={c} />
        ))}
      </div>
    </div>
  );
}
