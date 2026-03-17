"use client";

import { FileBox, Upload, CheckCircle, AlertCircle, File } from "lucide-react";
import { cn } from "@/lib/utils";

const mockEvidence = [
  {
    id: "ev1",
    label: "Purchase receipt — Apple iPhone 12",
    type: "purchase_receipt",
    uploaded: true,
    fileName: "apple_receipt_2021.pdf",
    linkedCases: ["Apple iPhone Throttling Settlement"],
  },
  {
    id: "ev2",
    label: "Brokerage statement — Robinhood",
    type: "account_statement",
    uploaded: true,
    fileName: "robinhood_jan2021.pdf",
    linkedCases: ["Robinhood GameStop Trading Restrictions"],
  },
  {
    id: "ev3",
    label: "Employment record — Wells Fargo",
    type: "employment_record",
    uploaded: false,
    fileName: null,
    linkedCases: ["EEOC v. Wells Fargo & Company"],
  },
  {
    id: "ev4",
    label: "Identity document (required for claims > $1000)",
    type: "identity",
    uploaded: false,
    fileName: null,
    linkedCases: [],
  },
];

export default function EvidencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileBox className="w-6 h-6 text-brand-400" />
          My Evidence Vault
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload and manage documents for claim filing
        </p>
      </div>

      {/* Upload area */}
      <div className="card border-dashed border-2 border-surface-border hover:border-brand-500/40 transition-colors cursor-pointer">
        <div className="flex flex-col items-center justify-center py-8">
          <Upload className="w-8 h-8 text-gray-500 mb-3" />
          <p className="text-sm text-gray-400 font-medium">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-gray-600 mt-1">
            PDF, JPG, PNG up to 10MB
          </p>
        </div>
      </div>

      {/* Evidence list */}
      <div className="space-y-3">
        {mockEvidence.map((ev) => (
          <div key={ev.id} className="card-hover animate-fade-in">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  ev.uploaded
                    ? "bg-green-500/10 text-green-400"
                    : "bg-yellow-500/10 text-yellow-400"
                )}
              >
                {ev.uploaded ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{ev.label}</p>
                {ev.fileName && (
                  <div className="flex items-center gap-1 mt-1">
                    <File className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{ev.fileName}</span>
                  </div>
                )}
                {ev.linkedCases.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {ev.linkedCases.map((c) => (
                      <span
                        key={c}
                        className="badge bg-surface-overlay text-gray-400 border-surface-border text-[10px]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {ev.uploaded ? (
                  <span className="badge bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Uploaded
                  </span>
                ) : (
                  <button className="btn-primary text-xs !py-1.5 !px-3">
                    Upload
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
