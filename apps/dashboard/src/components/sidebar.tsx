"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Scale,
  Building2,
  TrendingUp,
  Shield,
  Users,
  UserCheck,
  FileBox,
  Calendar,
  Settings,
  Activity,
  Bell,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Open Claims", href: "/claims", icon: Scale },
  { name: "Corporate Actions", href: "/corporate", icon: Building2 },
  { name: "Securities", href: "/securities", icon: TrendingUp },
  { name: "FTC Refunds", href: "/ftc", icon: Shield },
  { name: "EEOC Actions", href: "/eeoc", icon: Users },
  { name: "My Matches", href: "/matches", icon: UserCheck },
  { name: "My Evidence", href: "/evidence", icon: FileBox },
  { name: "Deadlines", href: "/deadlines", icon: Calendar },
  { name: "Source Health", href: "/sources", icon: Activity },
  { name: "Admin", href: "/admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-surface-raised border-r border-surface-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-surface-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                ClassAction
              </h1>
              <p className="text-[10px] text-gray-500 -mt-0.5">OS</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-surface-overlay text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ChevronLeft
            className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-brand-600/15 text-brand-400 border border-brand-500/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface-overlay border border-transparent"
              )}
            >
              <item.icon className={cn("w-4.5 h-4.5 shrink-0", isActive && "text-brand-400")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      {!collapsed && (
        <div className="p-3 border-t border-surface-border">
          <div className="card !p-3 bg-brand-950/30 border-brand-500/10">
            <p className="text-xs text-brand-300 font-medium">Pro Plan</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Unlimited sources · Real-time sync
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
