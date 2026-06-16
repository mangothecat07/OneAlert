import React, { useState } from "react";
import {
  Book,
  ShieldAlert,
  Phone,
  HelpCircle,
  Mic,
  FileText,
  AlertCircle,
  Info,
  ChevronRight,
  Search,
  Link,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

// Command definitions — action describes what clicking does
const CITIZEN_COMMANDS = [
  {
    id: "scan_link",
    label: "Scan Link — Cyber Safety Scanner",
    description: "Scan suspicious URLs, emails, or messages using VirusTotal and Cloudflare threat intelligence.",
    icon: Link,
    color: "text-green-600",
    border: "border-green-600/30",
    bg: "bg-green-600/5 hover:bg-green-600/10",
    action: "scan_link",
    keywords: ["scan", "link", "url", "virus", "phishing", "safe", "threat"],
  },
  {
    id: "threat_scanner",
    label: "Threat Scanner — AI Analysis",
    description: "Scan suspicious URLs, emails, or messages using our deep AI heuristic engine to detect phishing and impersonation.",
    icon: Search,
    color: "text-pink-500",
    border: "border-pink-500/30",
    bg: "bg-pink-500/5 hover:bg-pink-500/10",
    action: "scanner",
    keywords: ["scan", "link", "url", "phishing", "threat", "ai", "impersonation"],
  },
  {
    id: "awareness",
    label: "Awareness — Cyber Security Guide",
    description: "Learn how to protect yourself against phishing, deepfakes, cyberstalking, and financial fraud.",
    icon: ShieldCheck,
    color: "text-indigo-600",
    border: "border-indigo-600/30",
    bg: "bg-indigo-600/5 hover:bg-indigo-600/10",
    action: "awareness",
    keywords: ["awareness", "guide", "learn", "phishing", "deepfake", "fraud", "protect"],
  },
  {
    id: "sos",
    label: "SOS — Emergency Alert",
    description: "Trigger an emergency SOS. Notifies police and your emergency contacts with your real-time location.",
    icon: Phone,
    color: "text-[var(--danger)]",
    border: "border-[var(--danger)]/30",
    bg: "bg-[var(--danger)]/5 hover:bg-[var(--danger)]/10",
    action: "sos",
    keywords: ["sos", "emergency", "help", "call"],
  },
  {
    id: "report",
    label: "Report — File a Crime",
    description: "Open the secure crime reporting form. Upload evidence, describe the incident and submit anonymously.",
    icon: ShieldAlert,
    color: "text-orange-600",
    border: "border-orange-600/30",
    bg: "bg-orange-600/5 hover:bg-orange-600/10",
    action: "report",
    keywords: ["report", "crime", "file", "submit", "cyber"],
  },
  {
    id: "my_reports",
    label: "My Reports — Track Cases",
    description: "View all reports you have submitted. Track status updates from police, add comments and suspects.",
    icon: FileText,
    color: "text-cyan-600",
    border: "border-cyan-600/30",
    bg: "bg-cyan-600/5 hover:bg-cyan-600/10",
    action: "my_reports",
    keywords: ["my reports", "track", "cases", "history"],
  },
  {
    id: "voice",
    label: "Voice — Activate Voice Control",
    description: "Say 'SOS', 'Report', or 'My Reports' to trigger actions hands-free using the microphone.",
    icon: Mic,
    color: "text-[var(--primary)]",
    border: "border-[var(--primary)]/30",
    bg: "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10",
    action: "voice",
    keywords: ["voice", "mic", "microphone", "speak", "listen"],
  },
  {
    id: "help",
    label: "Help — What is OneAlert?",
    description: "OneAlert is a unified cyber-physical safety platform. Report crimes, trigger SOS, and track police responses in real time.",
    icon: HelpCircle,
    color: "text-sky-500",
    border: "border-sky-500/30",
    bg: "bg-sky-500/5 hover:bg-sky-500/10",
    action: "info",
    keywords: ["help", "about", "what", "onealert", "info"],
  },
  {
    id: "evidence",
    label: "Evidence — Upload Digital Proof",
    description: "Attach images, documents or files to your report. All uploads are SHA-256 hashed for integrity.",
    icon: AlertCircle,
    color: "text-purple-600",
    border: "border-purple-600/30",
    bg: "bg-purple-600/5 hover:bg-purple-600/10",
    action: "report",
    keywords: ["evidence", "upload", "file", "hash", "proof", "attachment"],
  },
];

const POLICE_COMMANDS = [
  {
    id: "dashboard",
    label: "Dashboard — Live Operations",
    description: "Monitor all active incidents and SOS alerts in real time from the command center.",
    icon: AlertCircle,
    color: "text-[var(--danger)]",
    border: "border-[var(--danger)]/30",
    bg: "bg-[var(--danger)]/5 hover:bg-[var(--danger)]/10",
    action: "home",
    keywords: ["dashboard", "operations", "live", "monitor"],
  },
  {
    id: "status_update",
    label: "Status Update — Update Incidents",
    description: "Open any incident and update its status to Dispatching, Investigating, or Resolved with context notes.",
    icon: Info,
    color: "text-cyan-600",
    border: "border-cyan-600/30",
    bg: "bg-cyan-600/5 hover:bg-cyan-600/10",
    action: "home",
    keywords: ["status", "update", "dispatching", "investigating", "resolved"],
  },
  {
    id: "voice_police",
    label: "Voice — Hands-Free Navigation",
    description: "Use voice commands to navigate the dashboard and manage incidents without touching the screen.",
    icon: Mic,
    color: "text-[var(--primary)]",
    border: "border-[var(--primary)]/30",
    bg: "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10",
    action: "voice",
    keywords: ["voice", "mic", "navigate", "hands-free"],
  },
  {
    id: "scan_link",
    label: "Scan Link — Cyber Safety Scanner",
    description: "Scan suspicious URLs, emails, or messages using VirusTotal and Cloudflare threat intelligence.",
    icon: Link,
    color: "text-green-600",
    border: "border-green-600/30",
    bg: "bg-green-600/5 hover:bg-green-600/10",
    action: "scan_link",
    keywords: ["scan", "link", "url", "virus", "phishing", "safe", "threat"],
  },
  {
    id: "awareness",
    label: "Awareness — Cyber Security Guide",
    description: "Learn how to protect yourself against phishing, deepfakes, cyberstalking, and financial fraud.",
    icon: ShieldCheck,
    color: "text-indigo-600",
    border: "border-indigo-600/30",
    bg: "bg-indigo-600/5 hover:bg-indigo-600/10",
    action: "awareness",
    keywords: ["awareness", "guide", "learn", "phishing", "deepfake", "fraud", "protect"],
  },
  {
    id: "threat_scanner",
    label: "Threat Scanner — AI Analysis",
    description: "Scan suspicious URLs, emails, or messages using our deep AI heuristic engine to detect phishing and impersonation.",
    icon: Search,
    color: "text-pink-500",
    border: "border-pink-500/30",
    bg: "bg-pink-500/5 hover:bg-pink-500/10",
    action: "scanner",
    keywords: ["scan", "link", "url", "phishing", "threat", "ai", "impersonation"],
  },
];

const HelpView = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [showVTPrompt, setShowVTPrompt] = useState(false);

  const commands = isAuthenticated ? POLICE_COMMANDS : CITIZEN_COMMANDS;

  const filtered = commands.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.keywords.some((k) => k.includes(q))
    );
  });

  const handleAction = (cmd) => {
    if (cmd.action === "scan_link") {
      setShowVTPrompt(true);
      return;
    }
    if (cmd.action === "voice") {
      toast("Click the mic button to speak.", { icon: "🎙️" });
      return;
    }
    if (cmd.action === "info") {
      toast("OneAlert: Unified Cyber-Physical Safety Platform", { icon: "ℹ️" });
      return;
    }
    if (onNavigate) onNavigate(cmd.action);
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pb-10 pr-1">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <h2 className="text-2xl font-display font-bold text-[var(--primary)] flex items-center gap-3">
          <Book size={28} />
          Help
        </h2>
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest">
          {isAuthenticated ? "Police Operations Interface" : "Citizen Safety Toolkit"}
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 h-10 border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] focus-within:border-[var(--primary)] transition-colors rounded-lg shrink-0">
        <Search size={16} className="text-[var(--text-secondary)] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help"
          className="bg-transparent outline-none flex-1 text-sm font-medium placeholder:text-[var(--text-secondary)] text-[var(--text-primary)]"
        />
      </div>

      {/* Command Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((cmd) => (
          <button
            key={cmd.id}
            onClick={() => handleAction(cmd)}
            className={`group relative flex flex-col gap-3 p-5 border-2 ${cmd.border} ${cmd.bg} transition-all rounded-xl text-left overflow-hidden`}
          >
            {/* Left glow bar */}
            <div className={`absolute top-0 left-0 w-[3px] h-full ${cmd.color.replace("text-", "bg-")} opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-l-xl`} />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-black/10 ${cmd.color}`}>
                  <cmd.icon size={20} />
                </div>
                <span className={`font-bold text-sm uppercase tracking-widest ${cmd.color}`}>
                  {cmd.label.split("—")[0].trim()}
                </span>
              </div>
              <ChevronRight size={16} className={`${cmd.color} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
            </div>

            <div>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                {cmd.description}
              </p>
            </div>

            {/* Bottom command label */}
            <div className={`text-xs font-mono ${cmd.color} opacity-100 uppercase tracking-wider`}>
              — {cmd.label.split("—")[1]?.trim()}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)] mt-10">
          <Book size={40} className="opacity-100" />
          <p className="text-sm uppercase tracking-widest">No actions match your search</p>
        </div>
      )}

      {/* VirusTotal Prompt Modal */}
      {showVTPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
              <Link size={24} className="text-green-400" />
              Scan Suspicious Link
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              We use <strong className="text-[var(--text-primary)]">VirusTotal</strong> and <strong className="text-[var(--text-primary)]">Cloudflare Radar</strong> to scan links for malware and phishing.
              <br /><br />
              Choose which scanner you'd like to use:
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-2">
              <button
                onClick={() => setShowVTPrompt(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all order-3 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.open("https://radar.cloudflare.com/scan", "_blank");
                  setShowVTPrompt(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all order-2"
              >
                Cloudflare Radar
              </button>
              <button
                onClick={() => {
                  window.open("https://www.virustotal.com/gui/home/url", "_blank");
                  setShowVTPrompt(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all order-1 sm:order-3"
              >
                VirusTotal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpView;
