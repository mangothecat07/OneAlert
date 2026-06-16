import React, { useState } from "react";
import { api } from "@/lib/api";
import { Shield, ShieldAlert, ShieldCheck, Link, MessageSquare, User, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

const ThreatScannerView = ({ onBack, onReport }) => {
  const [activeTab, setActiveTab] = useState("url");
  const [payload, setPayload] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async () => {
    if (!payload.trim()) return;
    
    setIsScanning(true);
    setResult(null);
    
    try {
      // Fake delay to simulate "deep AI scanning"
      await new Promise(resolve => setTimeout(resolve, 2000));
      const res = await api.post("/scan-threat", { type: activeTab, payload });
      setResult(res.data);
    } catch (e) {
      console.error("Scan failed", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleReport = () => {
    // Pass the payload as pre-filled description to the FIR
    onReport({
      description: `[AI Scanner Report]\\nType: ${activeTab.toUpperCase()}\\nContent: ${payload}\\n\\nThreat Score: ${result.score}/100\\nFlags: ${result.flags.join(", ")}`
    });
  };

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto gap-6 animate-in fade-in duration-500 overflow-y-auto pb-10 pr-2">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 sticky top-0 bg-[var(--bg)] z-10 pt-2">
        <h2 className="text-2xl font-display font-bold text-[var(--primary)] flex items-center gap-3">
          <Shield size={28} className={isScanning ? "animate-pulse" : ""} />
          Cyber Threat Scanner
        </h2>
        <button onClick={onBack} className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-sm hover:border-[var(--primary)] transition-colors">
          Back
        </button>
      </div>

      <div className="text-[var(--text-secondary)] text-lg mb-2">
        Preview module only. It is under development and will be properly implemented soon.
      </div>
      <div className="text-[var(--text-secondary)] text-sm mb-2">
        Paste a suspicious link, SMS message, or social media handle. Our AI heuristics engine will analyze it for phishing patterns, bot behavior, and financial fraud risks.
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
        {[
          { id: "url", label: "Link", icon: Link },
          { id: "text", label: "Message", icon: MessageSquare },
          { id: "profile", label: "Profile", icon: User }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === t.id 
                ? "bg-[var(--primary)] text-white shadow-md" 
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex flex-col gap-4">
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder={`Paste the suspicious ${activeTab === "url" ? "link" : activeTab === "text" ? "message" : "username or profile link"} here...`}
          className="w-full h-32 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
        />
        
        <button 
          onClick={handleScan}
          disabled={isScanning || !payload.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-white py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isScanning ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Analyzing Threat Vectors...
            </>
          ) : (
            "Scan Now"
          )}
        </button>
      </div>

      {/* Results Area */}
      {result && (
        <div className={`mt-4 p-6 border rounded-xl animate-in slide-in-from-bottom-4 ${
          result.is_malicious ? "bg-[var(--danger)]/5 border-[var(--danger)]/30" : "bg-[var(--primary)]/5 border-[var(--primary)]/30"
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4 mb-4">
            <div className="flex items-center gap-4">
              {result.is_malicious ? (
                <div className="w-16 h-16 rounded-full bg-[var(--danger)]/10 flex items-center justify-center text-[var(--danger)]">
                  <ShieldAlert size={32} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                  <ShieldCheck size={32} />
                </div>
              )}
              <div>
                <h3 className={`text-2xl font-bold ${result.is_malicious ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}>
                  {result.is_malicious ? "High Risk Detected" : "Appears Safe"}
                </h3>
                <div className="text-sm text-[var(--text-secondary)]">Threat Score: {result.score} / 100</div>
              </div>
            </div>
            
            {result.cached && (
               <span className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-xs text-[var(--text-secondary)]">
                 Found in Global Threat Cache
               </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-[var(--warning)]" /> Flags Triggered
              </h4>
              {result.flags.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-1">
                  {result.flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              ) : (
                <div className="text-sm text-[var(--text-secondary)] italic">No malicious patterns detected.</div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Recommendations</h4>
              {result.recommendations.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-1">
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              ) : (
                <div className="text-sm text-[var(--text-secondary)] italic">You can proceed, but always remain cautious.</div>
              )}
            </div>
          </div>

          {result.is_malicious && (
            <div className="mt-6 pt-6 border-t border-[var(--border)] flex justify-end">
              <button 
                onClick={handleReport}
                className="flex items-center gap-2 bg-[var(--danger)] text-white px-6 py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
              >
                Report to Cyber Cell <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ThreatScannerView;
