import React from "react";
import CardShell from "./CardShell.jsx";
import { AlertCircle, AlertTriangle, ShieldAlert, PhoneCall, Mic, Navigation } from "lucide-react";

const relTime = (iso) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const Incidents = ({ data, onViewIncident }) => {
  return (
    <CardShell
      testid="card-incidents"
      subtitle={<span className="break-all">Active SOS Streams</span>}
      title={<span className="break-all">Emergency Incidents</span>}
      right={
        data && (
          <div className="flex flex-wrap gap-2 font-mono md:text-base text-sm items-center justify-end">
            <span
              className="px-2 py-1 border border-[var(--danger)]/40 text-[var(--danger)] bg-[var(--danger)]/5 break-all"
            >
              {data.critical_count} ACTIVE
            </span>
            <span
              className="px-2 py-1 border border-[var(--text-secondary)]/40 text-[var(--text-secondary)] bg-[var(--warn)]/5 break-all"
            >
              {(data.incidents || []).length} TOTAL
            </span>
          </div>
        )
      }
    >
      {data && data.incidents && data.incidents.length > 0 ? (
        <div className="space-y-3 overflow-y-auto pr-1 max-h-full">
          {(() => {
            const sortedIncidents = [...data.incidents].sort((a, b) => {
              const scoreA = a.ai_analysis?.threat_score || 0;
              const scoreB = b.ai_analysis?.threat_score || 0;
              if (scoreA !== scoreB) return scoreB - scoreA;
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            return sortedIncidents.map((incident) => {
            const isActive = incident.status === "active";
            const isDispatching = incident.status === "dispatching";
            const isCyber = incident.type === "cyber_report";
            const exactTime = new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "medium" }).format(new Date(incident.timestamp));
            
            const threatScore = incident.ai_analysis?.threat_score || 0;
            let threatColorClass = "";
            let threatPulse = "";
            if (threatScore >= 80) {
              threatColorClass = "border-[var(--danger)] bg-[var(--danger)]/5";
              threatPulse = isActive ? "shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-shadow duration-1000" : "";
            } else if (threatScore >= 50) {
              threatColorClass = "border-orange-500 bg-orange-500/5";
            } else if (threatScore > 0) {
              threatColorClass = "border-yellow-500 bg-yellow-500/5";
            } else {
              threatColorClass = "border-[var(--border)] bg-[var(--surface)]";
            }

            return (
              <div
                key={incident.id}
                onClick={() => onViewIncident && onViewIncident(incident)}
                className={`relative overflow-hidden border p-5 flex flex-col gap-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all rounded-lg ${threatColorClass} ${threatPulse}`}
              >
                {/* Header: Threat Score, Status, Time */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {threatScore > 0 && (
                      <span className={`text-xs font-bold tracking-widest px-2 py-1 rounded shadow-sm border border-black/20 ${
                        threatScore >= 80 ? "bg-[var(--danger)] text-white" :
                        threatScore >= 50 ? "bg-orange-500 text-white" :
                        "bg-yellow-500 text-black"
                      }`}>
                        THREAT: {threatScore}
                      </span>
                    )}
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${
                      isActive ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30" : 
                      isDispatching ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                      incident.status === 'investigating' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" :
                      incident.status === 'resolved' ? "bg-green-500/10 text-green-400 border-green-500/30" :
                      "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)]"
                    }`}>
                      {incident.status}
                    </span>
                    {incident.trigger_type === "voice" && (
                      <span className="flex items-center gap-1 px-2 py-1 border border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 text-[10px] uppercase font-bold tracking-wider rounded">
                        <Mic size={10} /> Voice Trigger
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap pt-1">
                    {relTime(incident.timestamp)} ago
                  </div>
                </div>

                {/* Body: Victim / Crime Info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-display font-bold text-[var(--text-primary)]">
                      {isCyber && incident.cyber_details?.crime_category 
                        ? incident.cyber_details.crime_category 
                        : (incident.user?.name || incident.name || "Unknown Victim")}
                    </span>
                    {isActive && !isCyber && (
                      <ShieldAlert size={18} className="text-[var(--danger)]" />
                    )}
                  </div>
                  
                  {isCyber && incident.cyber_details?.description ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {incident.cyber_details.description}
                      </p>
                      <div className="text-sm font-mono text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                        <span>ID: {incident.id}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <PhoneCall size={12} /> {incident.user?.phone || incident.phone || "No Phone"}
                      </span>
                      <span className="opacity-50">|</span>
                      <span>ID: {incident.id}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Location */}
                {incident.location && (
                  <div className="flex items-start gap-2 pt-3 border-t border-[var(--border)]/50 mt-auto">
                    <Navigation size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />
                    <span className="text-xs text-[var(--text-secondary)] leading-snug line-clamp-2">
                      {incident.location.address || `${incident.location.lat.toFixed(5)}, ${incident.location.lng.toFixed(5)}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })})()}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-sm">
          No incidents reported.
        </div>
      )}
    </CardShell>
  );
};

export default Incidents;
