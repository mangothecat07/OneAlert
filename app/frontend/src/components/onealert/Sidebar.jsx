import React from "react";
import VoiceButton from "./VoiceButton";
import {
  Home,
  Settings,
  Mic,
  ShieldAlert,
  LogOut,
  Book,
  Terminal,
  Users,
  FileText,
  PieChart,
  ScanSearch,
  Map
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NavBtn = ({ icon: Icon, label, active, danger, testid, onClick, className = "" }) => (
  <button
    data-testid={testid}
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`group relative w-10 h-10 flex items-center justify-center border transition-all duration-150 ${className} ${
      active
        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
        : danger
          ? "border-transparent text-[var(--danger)] hover:border-[var(--danger)]/60 hover:bg-[var(--danger)]/10"
          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
    }`}
  >
    <Icon size={18} strokeWidth={1.8} />
    <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap bg-[var(--surface)] border border-[var(--border)] text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
      {label}
    </span>
  </button>
);

const Sidebar = ({ active = "home", onNavigate = () => {} }) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <aside
      data-testid="onealert-sidebar"
      className="fixed bottom-0 md:bottom-0 md:top-0 left-0 right-0 md:right-auto md:w-16 h-16 md:h-full flex flex-row md:flex-col items-center justify-between border-t md:border-t-0 md:border-r border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md md:bg-[var(--bg)] py-2 md:py-4 z-50 px-4 md:px-0"
    >
      <div className="flex flex-row md:flex-col items-center gap-4 md:gap-6 flex-1 md:flex-initial justify-around md:justify-start">
        <div
          data-testid="onealert-logo"
          className="hidden md:flex w-10 h-10 items-center justify-center text-[var(--primary)]"
          title="onealert"
        >
          <img src="/logo.svg" alt="OneAlert" className="w-10 h-10" />
        </div>

        <div className="flex flex-row md:flex-col items-center gap-2 md:mt-4 w-full md:w-auto justify-around md:justify-center">
          <NavBtn
            testid="nav-home-button"
            icon={Home}
            label="Home"
            active={active === "home"}
            onClick={() => onNavigate("home")}
          />
          {!isAuthenticated && (
            <NavBtn
              testid="nav-evidence-button"
              icon={ShieldAlert}
              label="Report Cyber Crime"
              danger={true}
              onClick={() => onNavigate("report")}
            />
          )}
          
          {!isAuthenticated && (
            <div className="hidden md:block">
              <NavBtn
                testid="nav-contacts-button"
                icon={Users}
                label="Contacts"
                active={active === "contacts"}
                onClick={() => onNavigate("contacts")}
              />
            </div>
          )}
          
          {!isAuthenticated && (
            <div className="hidden md:block">
              <NavBtn
                testid="nav-reports-button"
                icon={FileText}
                label="My Reports"
                active={active === "my_reports"}
                onClick={() => onNavigate("my_reports")}
              />
            </div>
          )}
          {!isAuthenticated && (
            <NavBtn
              testid="nav-scanner-button"
              icon={ScanSearch}
              label="Threat Scanner"
              active={active === "scanner"}
              onClick={() => onNavigate("scanner")}
            />
          )}
          <div className="hidden md:block">
            <NavBtn
              testid="nav-zones-button"
              icon={Map}
              label="Unsafe Zones"
              active={active === "zones"}
              onClick={() => onNavigate("zones")}
            />
          </div>
          <div className="hidden md:block">
            <NavBtn
              testid="nav-help-button"
              icon={Book}
              label="Help"
              active={active === "help"}
              onClick={() => onNavigate("help")}
            />
          </div>
          {isAuthenticated && (
            <div className=" md:block">
              <NavBtn
                testid="nav-analytics-button"
                icon={PieChart}
                label="Analytics"
                active={active === "analytics"}
                onClick={() => onNavigate("analytics")}
              />
            </div>
          )}
           {!isAuthenticated && (
          <VoiceButton onNavigate={onNavigate} />)}
        </div>
        
      </div>
      

      <div className="hidden md:flex flex-col items-center gap-2">
        <NavBtn
          testid="nav-settings-button"
          icon={Settings}
          label="Settings"
          onClick={() => onNavigate("settings")}
        />
        {isAuthenticated && (
          <NavBtn
            testid="nav-logout-button"
            icon={LogOut}
            label="Logout"
            danger
            onClick={() => logout()}
          />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
