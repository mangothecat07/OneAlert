import React, { useState, useEffect } from "react";
import {
  Settings,
  Moon,
  Sun,
  Palette,
  RotateCcw,
  Check,
  Layout,
  Globe,
  Link,
  LogOut,
  Lock,
  Unlock,
} from "lucide-react";
import VoiceTest from "@/components/onealert/VoiceTest.jsx";
import { useAuth } from "@/context/AuthContext";

const BASE_COLORS = [
  { name: "OneAlert Green", hex: "#46c5a5" },
  { name: "Security Blue", hex: "#3b82f6" },
  { name: "Alert Red", hex: "#ef4444" },
  { name: "Deep Purple", hex: "#a855f7" },
  { name: "Warning Orange", hex: "#f97316" },
];

const SettingsView = () => {
  const [theme, setTheme] = useState(
    localStorage.getItem("onealert-theme") || "dark",
  );
  const [primaryColor, setPrimaryColor] = useState(
    localStorage.getItem("onealert-primary") || "#46c5a5",
  );
  const [backendUrl, setBackendUrl] = useState(
    localStorage.getItem("onealert_backend_url") ||
      import.meta.env.VITE_BACKEND_URL ||
      "http://localhost:8082",
  );
  const [disableText, setDisableText] = useState("");
  const isTracking = localStorage.getItem("location_tracking") === "true";
  const { isAuthenticated } = useAuth();
  const isRestricted = !isAuthenticated; // citizens cannot configure backend



  const colors = [
    ...BASE_COLORS,
    theme === "light"
      ? { name: "Pure Black", hex: "#000000" }
      : { name: "Pure White", hex: "#ffffff" },
  ];

  useEffect(() => {
    if (theme === "light" && primaryColor === "#ffffff") {
      setPrimaryColor("#000000");
    } else if (
      (theme === "dark" || theme === "grey") &&
      primaryColor === "#000000"
    ) {
      setPrimaryColor("#ffffff");
    }

    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("onealert-theme", theme);
    document.documentElement.style.setProperty("--primary", primaryColor);
    localStorage.setItem("onealert-primary", primaryColor);
  }, [theme, primaryColor]);

  const resetSettings = () => {
    setTheme("dark");
    setPrimaryColor("#46c5a5");
    setBackendUrl(import.meta.env.VITE_BACKEND_URL || "http://localhost:8082");
    localStorage.removeItem("onealert_backend_url");
  };

  const saveBackendUrl = () => {
    localStorage.setItem("onealert_backend_url", backendUrl);
    window.location.reload();
  };

  const disableTracking = () => {
    localStorage.setItem("location_tracking", "false");
    localStorage.removeItem("tracked_incidents");
    window.location.reload();
  };

  return (
    <div className="h-full flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-500 overflow-y-auto pr-1 pb-10">
      <div className="shrink-0">
        <h2 className="text-2xl font-display font-medium text-[var(--text-primary)] flex items-center gap-3">
          <Settings className="text-[var(--primary)]" size={28} />
          System Settings
        </h2>
        <p className="text-xs text-[var(--text-secondary)] font-medium mt-1 uppercase tracking-widest">
          Interface & Aesthetics Configuration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Layout className="text-[var(--primary)]" size={20} />
            <h3 className="text-lg text-[var(--text-primary)] font-display">
              Appearance Mode
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["dark", "grey", "light"].map((m) => (
              <button
                key={m}
                onClick={() => setTheme(m)}
                className={`p-3 border flex flex-col items-center gap-2 transition-all ${theme === m ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] bg-[var(--bg)]"}`}
              >
                {m === "dark" ? (
                  <Moon size={20} />
                ) : m === "light" ? (
                  <Sun size={20} />
                ) : (
                  <Palette size={20} />
                )}
                <span className="md:text-sm text-sm font-medium uppercase tracking-widest">
                  {m}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Palette className="text-[var(--primary)]" size={20} />
            <h3 className="text-lg text-[var(--text-primary)] font-display">
              Signature Hue
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => setPrimaryColor(c.hex)}
                className={`group relative h-12 border transition-all flex items-center justify-center ${primaryColor === c.hex ? "border-[var(--text-primary)]" : "border-[var(--border)]"}`}
                style={{ backgroundColor: c.hex }}
              >
                {primaryColor === c.hex && (
                  <Check
                    size={20}
                    className={
                      c.hex === "#ffffff" || c.hex === "#46c5a5"
                        ? "text-black"
                        : "text-white"
                    }
                  />
                )}
              </button>
            ))}
          </div>
        </div>



        <div className="border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-6 md:col-span-2">
          <div className="flex items-center gap-3">
            <Globe className="text-[var(--primary)]" size={20} />
            <h3 className="text-lg text-[var(--text-primary)] font-display">
              Backend Configuration
            </h3>
          </div>

          <div className="flex flex-col gap-4">
            <div className="md:text-sm text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">
              API Endpoint URL
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                  <Link size={16} />
                </div>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="http://localhost:8082"
                  className="w-full bg-[var(--bg)] border border-[var(--border)] pl-12 pr-4 py-3 md:text-sm text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-all font-mono"
                />
              </div>
              <button
                onClick={saveBackendUrl}
                className="px-6 py-3 bg-[var(--primary)] text-black font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all flex items-center gap-2"
              >
                Apply
              </button>
            </div>
            <p className="md:text-sm text-sm  text-[var(--text-secondary)] italic">
              * Changing the backend URL will reload the application to apply
              new socket and API connections.
            </p>
          </div>
        </div>



        {!isAuthenticated && (
        <div className="border border-[var(--danger)]/50 bg-[var(--surface)] p-6 flex flex-col gap-6 md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--danger)]"></div>
          <div className="flex items-center gap-3">
            <Globe className="text-[var(--danger)] animate-pulse" size={20} />
            <h3 className="text-lg text-[var(--danger)] font-display uppercase tracking-widest font-bold">
              Emergency Location Tracking
            </h3>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">

              Disabling this feature during an active emergency will immediately stop broadcasting your real-time coordinates to first responders.
            </p>

            {isTracking && (
              <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-5 rounded-lg flex flex-col gap-4 mt-2">
                <p className="text-sm text-[var(--danger)] font-bold uppercase tracking-wider">
                  Verification Required to Disable
                </p>
                <p 
                  className="text-sm text-[var(--text-primary)] font-mono bg-black/50 p-3 rounded border border-white/10 select-none cursor-not-allowed"
                  onCopy={(e) => e.preventDefault()}
                >
                  i want to stop gps tracking. i understand the consequences while disabling location in an active emergency situation
                </p>
                <input
                  type="text"
                  value={disableText}
                  onChange={(e) => setDisableText(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  className="w-full bg-[var(--bg)] border border-[var(--danger)]/50 px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--danger)] font-mono transition-colors"
                  placeholder="Type the exact phrase above..."
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  disabled={disableText !== "i want to stop gps tracking. i understand the consequences while disabling location in an active emergency situation"}
                  onClick={disableTracking}
                  className="px-6 py-3 bg-[var(--danger)] text-white font-bold uppercase tracking-widest text-sm hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                >
                  Disable Live Tracking
                </button>
              </div>
            )}
          </div>
        </div>
        )}

      </div>
    </div>
  );
};

export default SettingsView;
