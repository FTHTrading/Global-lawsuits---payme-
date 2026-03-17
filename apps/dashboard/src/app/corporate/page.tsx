"use client";

import { CaseCard } from "@/components/case-card";
import { Building2 } from "lucide-react";

const mockCorporate = [
  {
    id: "c1",
    title: "Meta Platforms Privacy Class Action",
    source: "courtlistener",
    case_type: "consumer",
    defendants: ["Meta Platforms, Inc."],
    status: "under_review",
    estimated_payout_min: 100,
    estimated_payout_max: 1000,
    claim_deadline: new Date(Date.now() + 60 * 86400000).toISOString(),
    ai_score: 78,
    summary: "Alleged violations of user privacy through data collection practices.",
  },
  {
    id: "c2",
    title: "Amazon Flex Driver Misclassification",
    source: "eeoc",
    case_type: "employment",
    defendants: ["Amazon.com, Inc."],
    status: "claim_open",
    estimated_payout_min: 500,
    estimated_payout_max: 5000,
    claim_deadline: new Date(Date.now() + 25 * 86400000).toISOString(),
    ai_score: 85,
    summary: "Class action alleging Amazon Flex drivers were misclassified as independent contractors.",
  },
];

export default function CorporatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-brand-400" />
          Corporate Actions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Major corporate class actions and settlements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockCorporate.map((c) => (
          <CaseCard key={c.id} caseData={c} />
        ))}
      </div>
    </div>
  );
}
