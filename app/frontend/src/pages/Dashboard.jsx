import React, { useEffect, useState } from "react";
import Sidebar from "@/components/onealert/Sidebar.jsx";
import TopBar from "@/components/onealert/TopBar.jsx";
import { api, endpoints, BACKEND_URL } from "@/lib/api";

import HomeView from "@/components/onealert/views/HomeView.jsx";
import SettingsView from "@/components/onealert/views/SettingsView.jsx";
import IncidentView from "@/components/onealert/views/IncidentView.jsx";
import HelpView from "@/components/onealert/views/HelpView.jsx";
import AnalyticsView from "@/components/onealert/views/AnalyticsView.jsx";
import ThreatScannerView from "@/components/onealert/views/ThreatScannerView.jsx";
import AwarenessView from "@/components/onealert/views/AwarenessView.jsx";
import UnsafeZonesView from "@/components/onealert/views/UnsafeZonesView.jsx";

import { Activity, Layers, Compass, Settings } from "lucide-react";
import { getEffectiveInterval } from "@/lib/apiFetchConfig";

const Dashboard = () => {
  const [active, setActive] = useState("home");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [stats, setStats] = useState({});
  const [incidents, setIncidents] = useState({
    incidents: [],
    critical_count: 0,
  });
  const [energy, setEnergy] = useState({
    series: [],
    total_bandwidth: 0,
    total_energy: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [s, i] = await Promise.all([
          api.get(endpoints.stats),
          api.get("/dashboard/incidents"),
        ]);
        setStats(s.data || {});
        const fetchedIncidents = i.data?.incidents ? i.data : { incidents: [], critical_count: 0 };
        setIncidents(fetchedIncidents);

        // Background Geocoding
        fetchedIncidents.incidents.forEach(async (inc) => {
          if (inc.location && !inc.location.address) {
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${inc.location.lat}&lon=${inc.location.lng}&format=json`);
              const geo = await res.json();
              if (geo.display_name) {
                // Persist to backend
                await api.post(`/dashboard/incident/${inc.id}/address`, { address: geo.display_name });
                
                // Update local state
                setIncidents((prev) => ({
                  ...prev,
                  incidents: prev.incidents.map((curr) =>
                    curr.id === inc.id
                      ? { ...curr, location: { ...curr.location, address: geo.display_name } }
                      : curr
                  ),
                }));
              }
            } catch (e) {
              console.warn(`Geocoding failed for ${inc.id}`);
            }
          }
        });
      } catch (err) {
        // Fallback to mock data to keep basic functionalities working without a backend
        const mockIncidents = [
          {
            id: "INC-MOCK-1",
            user_id: "usr_mock",
            name: "Demo User",
            phone: "+91 0000000000",
            status: "active",
            trigger_type: "voice",
            timestamp: new Date().toISOString(),
            location: { lat: 28.6139, lng: 77.2090, accuracy: 15.5 }
          }
        ];
        
        setStats({ active_incidents: 1, resolved_today: 0, active_users: 1 });
        setIncidents({ incidents: mockIncidents, critical_count: 1 });
        
        if (window.__USER_ROLE__ === "theadmin") {
          console.error("Dashboard load failed, using mock data", err);
        }
      }
    };

    // Initial load
    load();

    // Periodic refresh logic for stats
    const interval = getEffectiveInterval("dashboard");
    const id = setInterval(() => {
      api.get(endpoints.stats).then(s => setStats(s.data || {})).catch(()=>{});
    }, interval);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = BACKEND_URL.replace(/^https?:\/\//, "");
    
    const socket = new WebSocket(`${wsProtocol}//${wsUrl}/api/dashboard/ws`);
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "incident_update" && data.incident) {
          setIncidents(prev => {
            const exists = prev.incidents.find(i => i.id === data.incident.id);
            if (exists) {
              return {
                ...prev,
                incidents: prev.incidents.map(i => i.id === data.incident.id ? data.incident : i)
              };
            } else {
              return {
                ...prev,
                incidents: [data.incident, ...prev.incidents],
                critical_count: prev.critical_count + (data.incident.status === 'active' ? 1 : 0)
              };
            }
          });
        }
      } catch (err) {
        console.error("Dashboard WS parse error", err);
      }
    };
    
    return () => socket.close();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("onealert-theme") || "dark";
    const savedColor = localStorage.getItem("onealert-primary") || "#46c5a5";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.style.setProperty("--primary", savedColor);
  }, []);

  const renderView = () => {
    const viewData = { incidents };

    switch (active) {
      case "home":
      case "operations":
        return <HomeView data={viewData} onViewIncident={(inc) => {
          window.open(`/incident/${inc.id}`, '_blank');
        }} />;
      case "settings":
        return <SettingsView />;
      case "help":
        return <HelpView onNavigate={setActive} />;
      case "analytics":
        return <AnalyticsView />;
      case "zones":
        return <UnsafeZonesView />;
      case "scanner":
        return <ThreatScannerView onBack={() => setActive("help")} onReport={() => {}} />;
      case "awareness":
        return <AwarenessView onBack={() => setActive("help")} />;

      default:
        return <HomeView data={viewData} onViewIncident={(inc) => {
          window.open(`/incident/${inc.id}`, '_blank');
        }} />;
    }
  };

  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] grid-overlay flex flex-col"
      data-testid="dashboard-root"
    >
      <Sidebar active={active} onNavigate={setActive} />

      <TopBar stats={stats} active={active} onNavigate={setActive} />

      <main
        data-testid="dashboard-main"
        className="md:ml-16 p-4 md:p-6 mb-16 lg:mb-0 h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] overflow-y-auto relative"
      >
        <div className="h-full">{renderView()}</div>
      </main>
    </div>
  );
};

export default Dashboard;
