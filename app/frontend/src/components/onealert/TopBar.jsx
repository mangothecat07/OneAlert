import React, { useState, useMemo } from "react";
import { Search, Bell, ChevronDown, Users, FileText, Book, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

const DASHBOARDS_CITIZEN = [
  { id: "home", label: "Home" },
  { id: "report", label: "Report Crime" },
  { id: "contacts", label: "Contacts" },
  { id: "my_reports", label: "My Reports" },
  { id: "zones", label: "Unsafe Zones" },
  { id: "scanner", label: "Threat Scanner" },
  { id: "help", label: "Help" },
  { id: "settings", label: "Settings" },
];

const DASHBOARDS_POLICE = [
  { id: "home", label: "Dashboard" },
  { id: "analytics", label: "Analytics" },
  { id: "zones", label: "Unsafe Zones" },
  { id: "scanner", label: "Threat Scanner" },
  { id: "help", label: "Help" },
  { id: "settings", label: "Settings" },
];

const getContrastColor = (hex) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "black" : "white";
};

const TopBar = ({ stats, active, onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");

  const dashboards = isAuthenticated ? DASHBOARDS_POLICE : DASHBOARDS_CITIZEN;
  const selected = dashboards.find((d) => d.id === active) || { id: active, label: "Dashboard" };
  const criticalCount = stats?.active_incidents || 0;

  const badgeTextColor = useMemo(() => {
    const primary = localStorage.getItem("onealert-primary") || "#46c5a5";
    return getContrastColor(primary);
  }, [criticalCount]);

  return (
    <header
      data-testid="onealert-topbar"
      className="h-16 md:ml-16 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md px-4 md:px-6 sticky top-0 z-40"
    >
      <div className="flex items-center gap-3 md:gap-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="dashboard-selector"
              className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-neutral-700 transition-colors"
            >
              <span className="font-display text-[15px] md:text-[15px] font-medium text-[var(--text-primary)] truncate max-w-[100px] sm:max-w-none">
                {selected.label}
              </span>
              <ChevronDown size={14} className="text-[var(--text-secondary)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-[var(--surface)] border-[var(--border)] rounded-none min-w-[200px] md:min-w-[240px]"
          >
            {dashboards.map((d) => (
              <DropdownMenuItem
                key={d.id}
                data-testid={`dashboard-option-${d.id}`}
                onClick={() => onNavigate(d.id)}
                className={`rounded-none focus:bg-[var(--surface-hover)] cursor-pointer font-medium text-[14px] tracking-wide ${
                  selected.id === d.id
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                <span className="text-neutral-600 mr-3 ">{'>'}</span>
                {d.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end min-w-0 ml-2">

        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="notifications-button"
                className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center border border-[var(--border)] bg-[var(--bg)] hover:border-neutral-700 hover:bg-[var(--surface-hover)] transition-colors shrink-0"
                aria-label="Notifications"
              >
                <Bell
                  size={16}
                  className={
                    criticalCount > 0
                      ? "text-[var(--danger)] animate-pulse"
                      : "text-[var(--text-secondary)]"
                  }
                />
                {criticalCount > 0 && (
                    <span
                      data-testid="notifications-count"
                      className="absolute -top-px -right-px min-w-[14px] h-[14px] md:min-w-[16px] md:h-[16px] bg-[var(--danger)] text-[13px] md:text-[13px] font-bold font-medium px-1 flex items-center justify-center"
                      style={{ color: badgeTextColor }}
                    >
                      {criticalCount}
                    </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 bg-[var(--surface)] border-[var(--border)] rounded-none p-0 shadow-2xl text-[15px] overflow-hidden"
            >
              <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-hover)]">
                <h4 className="text-[15px] uppercase tracking-[0.25em] text-[var(--text-secondary)] font-medium">
                  Active Incidents
                </h4>
              </div>
              <div className="p-4 text-[var(--text-primary)]">
                 You have {criticalCount} active incidents requiring attention.
              </div>
              <div className="p-3 bg-[var(--surface-hover)] border-t border-[var(--border)]">
                <button
                  onClick={() => onNavigate("home")}
                  className="w-full text-center text-[12px] uppercase tracking-widest text-[var(--primary)] font-bold hover:opacity-70 transition-opacity"
                >
                  View Dashboard
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('soft-reload'))}
            className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--primary)] hover:bg-[var(--surface-hover)] transition-colors shrink-0 group"
            aria-label="Reload"
            title="Refresh App"
          >
            <RefreshCw size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
