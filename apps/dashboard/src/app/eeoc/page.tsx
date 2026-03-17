"use client";

import { CaseCard } from "@/components/case-card";
import { Users } from "lucide-react";

const mockEeoc = [
  {
    id: "e1",
    title: "EEOC v. Wells Fargo & Company",
    source: "eeoc",
    case_type: "employment",
    defendants: ["Wells Fargo & Company"],
    status: "claim_open",
    estimated_payout_min: 1000,
    estimated_payout_max: 5000,
    claim_deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    ai_score: 81,
    summary: "Settlement for employees disciplined in connection with sales practices.",
  },
  {
    id: "e2",
    title: "EEOC v. Amazon Fulfillment LLC",
    source: "eeoc",
    case_type: "employment",
    defendants: ["Amazon Fulfillment LLC"],
    status: "under_review",
    estimated_payout_min: 500,
    estimated_payout_max: 3000,
    claim_deadline: new Date(Date.now() + 55 * 86400000).toISOString(),
    ai_score: 68,
    summary: "Alleged discrimination in hiring and accommodation practices.",
  },
];

export default function EeocPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-400" />
          EEOC Actions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Employment settlements and class-member participation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockEeoc.map((c) => (
          <CaseCard key={c.id} caseData={c} />
        ))}
      </div>
    </div>
  );
}
