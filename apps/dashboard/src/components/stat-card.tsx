import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "brand" | "green" | "yellow" | "red" | "blue";
}

const colorMap = {
  brand: "text-brand-400 bg-brand-500/10 border-brand-500/20",
  green: "text-green-400 bg-green-500/10 border-green-500/20",
  yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  red: "text-red-400 bg-red-500/10 border-red-500/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "brand",
}: StatCardProps) {
  return (
    <div className="card animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="stat-number text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs mt-1 font-medium",
                trend.value >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg border", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
