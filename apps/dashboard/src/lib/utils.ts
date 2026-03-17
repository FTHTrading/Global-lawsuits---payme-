import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntil(date: string | Date): number {
  const target = new Date(date);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function urgencyColor(days: number): string {
  if (days <= 3) return "text-red-400";
  if (days <= 7) return "text-orange-400";
  if (days <= 14) return "text-yellow-400";
  return "text-green-400";
}

export function confidenceBadge(confidence: string): string {
  switch (confidence) {
    case "high":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export function sourceIcon(source: string): string {
  const map: Record<string, string> = {
    ftc: "🛡️",
    eeoc: "⚖️",
    courtlistener: "📜",
    pacer: "🏛️",
    sec: "📊",
    classactionorg: "🔍",
  };
  return map[source] ?? "📄";
}
