import React, { useEffect, useState } from "react";
import Sidebar from "@/components/onealert/Sidebar.jsx";
import TopBar from "@/components/onealert/TopBar.jsx";

import SettingsView from "@/components/onealert/views/SettingsView.jsx";
import CrimeReportView from "@/components/onealert/views/CrimeReportView.jsx";
import ThreatScannerView from "@/components/onealert/views/ThreatScannerView.jsx";
import IncidentView from "@/components/onealert/views/IncidentView.jsx";
import HelpView from "@/components/onealert/views/HelpView.jsx";
import ContactsView from "@/components/onealert/views/ContactsView.jsx";
import AwarenessView from "@/components/onealert/views/AwarenessView.jsx";
import UnsafeZonesView from "@/components/onealert/views/UnsafeZonesView.jsx";
import VoiceButton from "@/components/onealert/VoiceButton.jsx";
import { ShieldAlert, Phone, FileText, Filter, Lock } from "lucide-react";
import { api, BACKEND_URL } from "@/lib/api";
import { toast } from "react-hot-toast";
import { startGlobalTracking } from "@/utils/LocationTracker";

// A dedicated home view for citizens
const CitizenHomeView = ({ onOpenReport, onViewReports, onOpenScanner }) => {
  return (
    <div className="min-h-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 gap-8">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-display font-extrabold text-[var(--primary)] mb-4 tracking-tight drop-shadow-lg">
          OneAlert
        </h1>
        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-md mx-auto">
          Unified Cyber-Physical Safety Platform
          <br />
          
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
        <button
          className="flex flex-col items-center justify-center gap-3 md:gap-4 p-5 md:p-8 border-2 border-[var(--danger)] bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 transition-all rounded-2xl md:rounded-3xl group"
          onClick={() => {
            const num = import.meta.env.VITE_EMERGENCY_NUMBER;
            
            // Create SOS record
            const triggerSOS = async (lat = 0, lng = 0, accuracy = 0) => {
              const incId = `INC-${Date.now()}`;
              let pin = localStorage.getItem("onealert_reports_password");
              if (!pin) {
                pin = Math.floor(1000 + Math.random() * 9000).toString();
                localStorage.setItem("onealert_reports_password", pin);
              }
              
              // Fire request in the background instantly without blocking
              fetch(`${BACKEND_URL}/api/incident`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: incId,
                  type: "physical_sos",
                  trigger_type: "button",
                  status: "active",
                  severity: "critical",
                  timestamp: new Date().toISOString(),
                  last_updated: new Date().toISOString(),
                  user: {
                    user_id: "usr_citizen",
                    name: "Citizen User",
                    phone: "+91 0000000000",
                    emergency_contacts_notified: false
                  },
                  location: { lat, lng, accuracy, is_live_tracking: true },
                  evidence: [],
                  incident_password: pin
                })
              }).then(() => window.dispatchEvent(new CustomEvent('soft-reload'))).catch(e => console.error("Failed to sync SOS:", e));
              
              // Native Android Background SMS
              const sendNativeSMS = async () => {
                try {
                  const resp = await fetch(`${BACKEND_URL}/api/contacts`);
                  const data = await resp.json();
                  const contacts = data.contacts || [];
                  const message = `URGENT: Emergency SOS triggered. Location: ${lat}, ${lng}. Report: ${BACKEND_URL}/incident/${incId} PIN: ${pin} Please attempt contact to local authorities immediately in case the user is in danger.`;
                  if (window.SMS) {
                    if (contacts.length === 0) {
                      toast.error("No trusted contacts found to SMS.");
                    }
                    contacts.forEach(c => {
                      window.SMS.sendSMS(c.phone, message, 
                        () => toast.success("Native SMS sent to " + c.phone),
                        (err) => toast.error("Native SMS failed: " + err)
                      );
                    });
                  } else {
                    toast.error("SMS plugin not found. Ensure you are running the native APK.");
                  }
                } catch(e) { 
                  console.error("Native SMS failed", e); 
                  toast.error("Failed to fetch contacts for SMS.");
                }
              };
              sendNativeSMS(); // Fire and forget
              
              toast.error("SOS Alert Triggered!", { icon: "❗" });
              if ("vibrate" in navigator) {
                navigator.vibrate([200, 100, 200, 100, 500]);
              }

              // Start live tracking immediately every 2 seconds via Web Worker
              startGlobalTracking(incId);

              // Instantly open dialer
              const emergencyNumber = num || "112";
              window.location.href = `tel:${emergencyNumber}`;
              toast.error(`Dialing ${emergencyNumber}...`, { icon: "📞" });
            };

            if ("geolocation" in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => triggerSOS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                (err) => triggerSOS() // fallback without location
              );
            } else {
              triggerSOS();
            }
          }}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[var(--danger)] flex items-center justify-center text-black group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(239,68,68,0.5)]">
            <Phone className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" />
          </div>
          <div className="text-center">
            <h3 className="text-lg md:text-2xl font-bold text-[var(--danger)] uppercase tracking-widest">Emergency SOS</h3>
            <p className="text-xs md:text-sm text-neutral-400 mt-1 md:mt-2">Instantly notify Police and Contacts.</p>
          </div>
        </button>

        <button
          className="flex flex-col items-center justify-center gap-3 md:gap-4 p-5 md:p-8 border-2 border-transparent bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-gray-500 transition-all rounded-2xl md:rounded-3xl group"
          onClick={() => {
            // Create Silent SOS record
            const triggerSilentSOS = async (lat = 0, lng = 0, accuracy = 0) => {
              const incId = `INC-${Date.now()}`;
              let pin = localStorage.getItem("onealert_reports_password");
              if (!pin) {
                pin = Math.floor(1000 + Math.random() * 9000).toString();
                localStorage.setItem("onealert_reports_password", pin);
              }
              
              // Fire request in the background instantly without blocking
              fetch(`${BACKEND_URL}/api/incident`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: incId,
                  type: "physical_sos",
                  trigger_type: "silent_panic",
                  status: "active",
                  severity: "critical",
                  timestamp: new Date().toISOString(),
                  last_updated: new Date().toISOString(),
                  user: {
                    user_id: "usr_citizen",
                    name: "Citizen User",
                    phone: "+91 0000000000",
                    emergency_contacts_notified: false
                  },
                  location: { lat, lng, accuracy, is_live_tracking: true },
                  evidence: [],
                  incident_password: pin
                })
              }).then(() => window.dispatchEvent(new CustomEvent('soft-reload'))).catch(() => {});
              
              // Native Android Background SMS
              const sendNativeSMS = async () => {
                try {
                  const resp = await fetch(`${BACKEND_URL}/api/contacts`);
                  const data = await resp.json();
                  const contacts = data.contacts || [];
                  const message = `URGENT: SILENT SOS triggered. Location: ${lat}, ${lng}. Report: ${BACKEND_URL}/incident/${incId} PIN: ${pin} Do not call, user may be in danger and any non-discreet activity may be a threat to this user. Call authorities for help and provide PIN.`;
                  if (window.SMS) {
                    contacts.forEach(c => {
                      window.SMS.sendSMS(c.phone, message,
                        () => toast.success("Silent SMS sent to " + c.phone),
                        (err) => toast.error("Silent SMS failed: " + err)
                      );
                    });
                  } else {
                    toast.error("SMS plugin not found. Ensure you are running the native APK.");
                  }
                } catch(e) {}
              };
              sendNativeSMS(); // Fire and forget
              
              // Start live tracking silently every 2 seconds via Web Worker
              startGlobalTracking(incId);
            };

            if ("geolocation" in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => triggerSilentSOS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
                (err) => triggerSilentSOS()
              );
            } else {
              triggerSilentSOS();
            }
          }}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-500 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <div className="text-center">
            <h3 className="text-base md:text-xl font-bold text-gray-400 uppercase tracking-widest">Silent Panic</h3>
            <p className="text-xs md:text-sm text-neutral-500 mt-1 md:mt-2">Discreetly alert police & track location.</p>
          </div>
        </button>

        <button
          className="flex flex-col items-center justify-center gap-3 md:gap-4 p-5 md:p-8 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--primary)] transition-all rounded-2xl md:rounded-3xl group"
          onClick={() => {
            const btn = document.querySelector('[data-testid="nav-voice-button"]');
            if (btn) btn.click();
          }}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
          </div>
          <div className="text-center">
            <h3 className="text-base md:text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest">Voice Command</h3>
            <p className="text-xs md:text-sm text-neutral-400 mt-1 md:mt-2">Activate microphone for hands-free SOS.</p>
          </div>
        </button>
      </div>
    </div>
  );
};

const MyReportsView = ({ onBack, onOpenDraft }) => {
  const [incidents, setIncidents] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const resp = await api.get("/my-incidents");
        setIncidents(resp.data.incidents);
      } catch (e) {
        console.error("Failed to load my incidents");
      }
    };
    fetchIncidents();
    
    try {
      const savedDrafts = JSON.parse(localStorage.getItem("onealert_saved_drafts") || "[]");
      setDrafts(savedDrafts);
    } catch(e) {}
  }, []);

  const items = [
    ...(filter === "all" || filter === "reports" ? incidents : []),
    ...(filter === "all" || filter === "drafts" ? drafts : [])
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 sticky top-0 bg-[var(--bg)] z-10 pt-2">
        <h2 className="text-2xl font-display font-bold text-[var(--primary)] flex items-center gap-3">
          <FileText size={28} />
          My Reports
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1">
            <Filter size={14} className="text-[var(--text-secondary)] mx-2" />
            <select 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              className="bg-[var(--bg)] border-none text-sm text-[var(--text-primary)] focus:outline-none pr-2"
            >
              <option value="all">All</option>
              <option value="reports">Submitted</option>
              <option value="drafts">Drafts</option>
            </select>
          </div>
          <button onClick={onBack} className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-sm hover:border-[var(--primary)] transition-colors">
            Back
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto pb-10">
        {items.length === 0 ? (
          <p className="text-center text-[var(--text-secondary)] mt-10">No items found.</p>
        ) : (
          items.map((inc) => (
            <div 
              key={inc.id} 
              onClick={() => {
                if (inc.status === 'draft') {
                  if (inc.raw_draft) {
                    localStorage.setItem("onealert_crime_draft", JSON.stringify(inc.raw_draft));
                  } else if (inc.cyber_details) {
                    const cats = inc.cyber_details.crime_category ? inc.cyber_details.crime_category.split(", ") : [];
                    localStorage.setItem("onealert_crime_draft", JSON.stringify({
                      userDetails: inc.cyber_details.reporter_details || "",
                      categories: cats,
                      description: inc.cyber_details.description || "",
                      suspects: inc.cyber_details.suspects || [],
                      victims: inc.cyber_details.victims || [],
                      dateOfOccurrence: "",
                      timeOfOccurrence: "",
                      placeOfOccurrence: "",
                      sections: ""
                    }));
                  }
                  if (onOpenDraft) onOpenDraft();
                } else {
                  window.open(`/incident/${inc.id}`, '_blank');
                }
              }}
              className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl cursor-pointer hover:border-[var(--primary)] transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4"
            >
              <div className="flex flex-col">
                <span className="font-bold text-[var(--primary)] text-lg">{inc.id}</span>
                <span className="text-sm text-[var(--text-secondary)] capitalize">{inc.type.replace("_", " ")}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs uppercase font-bold px-3 py-1 rounded border ${
                  inc.status === 'draft' ? "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)]" :
                  inc.status === 'active' ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30" : 
                  inc.status === 'dispatching' ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                  inc.status === 'investigating' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" :
                  inc.status === 'resolved' ? "bg-green-500/10 text-green-400 border-green-500/30" :
                  "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)]"
                }`}>
                  {inc.status}
                </span>
                <span className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap text-right">
                  {new Date(inc.timestamp).toLocaleString('en-GB', { 
                    day: '2-digit', month: 'short', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Citizen = () => {
  const [active, setActive] = useState("home");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Request SMS permission on load so it doesn't interrupt emergency flows
    if (window.cordova && cordova.plugins && cordova.plugins.permissions) {
      const permissions = cordova.plugins.permissions;
      permissions.checkPermission(permissions.SEND_SMS, function(status) {
        if (!status.hasPermission) {
          permissions.requestPermission(permissions.SEND_SMS, () => {}, () => {});
        }
      }, null);
    }
  }, []);

  useEffect(() => {
    // Listen for incoming global updates
    const savedTheme = localStorage.getItem("onealert-theme") || "dark";
    const savedColor = localStorage.getItem("onealert-primary") || "#46c5a5";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.style.setProperty("--primary", savedColor);

    const handleSoftReload = () => setReloadKey(prev => prev + 1);
    window.addEventListener("soft-reload", handleSoftReload);
    return () => window.removeEventListener("soft-reload", handleSoftReload);
  }, []);

  const renderView = () => {
    switch (active) {
      case "home":
        return <CitizenHomeView onOpenReport={() => setActive("report")} onViewReports={() => setActive("my_reports")} onOpenScanner={() => setActive("scanner")} />;
      case "scanner":
        // We pass the prefilled data to CrimeReportView when they click report
        return <ThreatScannerView onBack={() => setActive("home")} onReport={(data) => {
           // We can pass data by setting localStorage or a global state, or simple hack:
           localStorage.setItem("onealert_draft_prefill", JSON.stringify(data));
           setActive("report");
        }} />;
      case "report":
        return <CrimeReportView onBack={() => setActive("home")} />;
      case "my_reports":
        return <MyReportsView onBack={() => setActive("home")} onOpenDraft={() => setActive("report")} />;
      case "contacts":
        return <ContactsView />;
      case "zones":
        return <UnsafeZonesView />;
      case "help":
        return <HelpView onNavigate={setActive} />;
      case "awareness":
        return <AwarenessView onBack={() => setActive("help")} />;
      case "settings":
        return <SettingsView />;
      default:
        return <CitizenHomeView onOpenReport={() => setActive("report")} onViewReports={() => setActive("my_reports")} />;
    }
  };

  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] grid-overlay flex flex-col"
      data-testid="citizen-root"
    >
      <Sidebar active={active} onNavigate={setActive} />

      {/* Reusing TopBar without stats so it hides Police-specific counts */}
      <TopBar active={active} onNavigate={setActive} />

      <main
        key={reloadKey}
        data-testid="citizen-main"
        className="md:ml-16 p-4 md:p-6 mb-16 lg:mb-0 h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] overflow-y-auto relative"
      >
        <div className="h-full">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default Citizen;
