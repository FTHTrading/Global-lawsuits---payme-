"use client";

import { Bell, Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-14 border-b border-surface-border bg-surface-raised/50 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search cases, defendants, settlements..."
          className="bg-transparent text-sm text-gray-300 placeholder-gray-600 border-none outline-none w-full"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-surface-overlay text-gray-400 hover:text-gray-200 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
          K
        </div>
      </div>
    </header>
  );
}
