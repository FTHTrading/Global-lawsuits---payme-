"use client";

import { CaseCard } from "@/components/case-card";
import { Shield } from "lucide-react";

const mockFtc = [
  {
    id: "f1",
    title: "FTC v. Publisher's Clearing House",
    source: "ftc",
    case_type: "consumer",
    defendants: ["Publisher's Clearing House LLC"],
    status: "claim_open",
    estimated_payout_min: 10,
    estimated_payout_max: 500,
    claim_deadline: new Date(Date.now() + 18 * 86400000).toISOString(),
    ai_score: 82,
    summary: "Refund program for consumers who paid for magazine subscriptions through deceptive practices.",
    claim_url: "https://example.com/pch-refund",
  },
  {
    id: "f2",
    title: "FTC v. Vonage Holdings",
    source: "ftc",
    case_type: "consumer",
    defendants: ["Vonage Holdings Corp."],
    status: "claim_open",
    estimated_payout_min: 20,
    estimated_payout_max: 100,
    claim_deadline: new Date(Date.now() + 40 * 86400000).toISOString(),
    ai_score: 76,
    summary: "Refunds for consumers charged hidden fees or prevented from cancelling service.",
  },
  {
    id: "f3",
    title: "FTC v. Age of Empires Loot Box Settlement",
    source: "ftc",
    case_type: "consumer",
    defendants: ["Microsoft Corp."],
    status: "announced",
    estimated_payout_min: 5,
    estimated_payout_max: 50,
    claim_deadline: new Date(Date.now() + 90 * 86400000).toISOString(),
    ai_score: 65,
    summary: "FTC action against deceptive in-game purchase practices.",
  },
];

export default function FtcPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-brand-400" />
          FTC Refund Programs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Federal Trade Commission consumer refund opportunities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockFtc.map((c) => (
          <CaseCard key={c.id} caseData={c} />
        ))}
      </div>
    </div>
  );
}
