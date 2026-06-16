import React, { useState } from "react";
import {
  Mic,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useVoice } from "../../context/VoiceContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import commands from "../../config/commands";
import { executeCommand } from "../../utils/executeCommand";

const VoiceTest = () => {
  const navigate = useNavigate();
  const [lastCommand, setLastCommand] = useState("");

  const { status, transcript, volume, toggle, engine } = useVoice((cmd) => {
    setLastCommand(cmd);
  });

  const getStatusUI = () => {
    switch (status) {
      case "loading":
        return {
          icon: <Loader2 className="animate-spin" size={24} />,
          text: `Loading AI (${engine})...`,
          color: "text-yellow-500",
          bg: "bg-yellow-500/10",
        };
      case "ready":
        return {
          icon: <ShieldCheck size={24} />,
          text: `${engine === "local" ? "Local AI" : "Cloud Engine"} Ready`,
          color: "text-[var(--primary)]",
          bg: "bg-[var(--primary)]/10",
        };
      case "listening":
        return {
          icon: <Zap className="animate-pulse" size={24} />,
          text: "Active Listening",
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        };
      case "error":
        return {
          icon: <ShieldAlert size={24} />,
          text: "Engine Error",
          color: "text-red-500",
          bg: "bg-red-500/10",
        };
      default:
        return {
          icon: <Mic size={24} />,
          text: "System Idle",
          color: "text-gray-500",
          bg: "bg-gray-500/10",
        };
    }
  };

  const ui = getStatusUI();

  return (
    <div className="p-6 bg-[var(--bg)] border border-[var(--border)] rounded-xl max-w-md mx-auto font-mediumspace shadow-2xl">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
        <h2 className="text-[15px] uppercase tracking-[0.2em] text-[var(--text-primary)] font-bold">
          {engine === "local" ? "Local ASR Diagnostics" : "Cloud Engine Test"}
        </h2>
      </div>

      <div className="flex items-center justify-between p-4 bg-[var(--bg)] border-[2px] border-[var(--border)] rounded-lg mb-4">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-lg ${ui.bg} text-[var(--primary)] border border-current/20`}
          >
            {ui.icon}
          </div>
          <div>
            <div className="text-[15px] text-gray-500 uppercase font-bold tracking-tight mb-0.5">
              Engine Status
            </div>
            <div
              className={`text-[15px] font-bold tracking-tight text-[var(--primary)]`}
            >
              {ui.text}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          disabled={status === "loading"}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[15px] uppercase font-bold tracking-widest transition-all disabled:opacity-20 active:scale-95"
        >
          {status === "listening" ? "Stop" : "Start"}
        </button>
      </div>

      {/* Audio Level Visualizer */}
      {status === "listening" && (
        <div className="mb-8 px-1">
          <div className="flex items-center justify-between text-[15px] uppercase text-gray-500 font-bold mb-1.5 tracking-widest">
            <span>Input Gain</span>
            <span className="text-[var(--primary)]">{Math.round(volume)}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-75 ease-out shadow-[0_0_10px_rgba(70,197,165,0.4)]"
              style={{ width: `${Math.min(100, volume)}%` }}
            />
          </div>
        </div>
      )}

      {(status === "listening" || transcript) && (
        <div className="space-y-4">
          <div className="p-5 bg-[var(--bg)] border-[2px] border-[var(--border)] rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)]/50" />
            <span className="text-[15px] text-gray-600 uppercase font-bold tracking-widest mb-3 block">
              Live Inference Stream
            </span>
            <div className="min-h-[80px] text-[15px] text-[var(--primary)] font-medium break-words leading-relaxed opacity-90">
              {transcript || "..."}
            </div>
          </div>

          {lastCommand && (
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-[var(--primary)]/5 border-[2px] border-[var(--primary)]/20 rounded-md">
              <span className="text-[15px] text-[var(--primary)] font-bold uppercase tracking-widest">
                Last Heard:
              </span>
              <span className="text-[15px] text-white font-medium bg-black/40 px-2 py-0.5 rounded border border-white/10">
                {lastCommand}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Manual Command List */}
      <div className="mt-8 border-t border-[var(--border)] pt-6">
        <details className="group">
          <summary className="flex items-center justify-between p-4 bg-[var(--bg)] border-[2px] border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--bg)]/10 transition-all list-none">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[var(--primary)]/10 rounded-md text-[var(--primary)]">
                <ShieldCheck size={16} />
              </div>
              <span className="text-[15px] uppercase font-bold tracking-widest text-gray-400">
                Command Dictionary
              </span>
            </div>
            <ChevronDown
              className="text-gray-600 group-open:rotate-180 transition-transform"
              size={18}
            />
          </summary>
          <div className="grid grid-cols-1 gap-2 mt-3 p-2 bg-[var(--surface)] border-[2px] border-[var(--border)] rounded-lg max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--primary)]/20">
            {Object.values(
              commands.reduce((acc, cmd) => {
                if (!cmd.phrase.trim()) return acc;
                let key = cmd.action;
                if (cmd.to) key += `_${cmd.to}`;
                if (cmd.scanType) key += `_${cmd.scanType}`;
                if (!acc[key]) acc[key] = { phrases: [], cmd };
                acc[key].phrases.push(cmd.phrase);
                return acc;
              }, {}),
            ).map((group, idx) => (
              <button
                key={idx}
                onClick={() =>
                  executeCommand(group.cmd, {
                    navigate,
                    toast,
                    toggle,
                    speak: (msg) => {
                      const u = new SpeechSynthesisUtterance(msg);
                      window.speechSynthesis.speak(u);
                    },
                  })
                }
                className="w-full text-left p-4 hover:bg-[var(--primary)]/10 border border-transparent hover:border-[var(--primary)]/30 rounded-lg transition-all group/btn flex items-center justify-between"
              >
                <div>
                  <div className="text-[15px] text-[var(--primary)] font-bold lowercase">
                    {group.phrases.join(" / ")}
                  </div>
                  <div className="text-[15px] text-[var(--primary)] uppercase font-bold mt-1 opacity-80 group-hover/btn:opacity-100 transition-opacity flex items-center gap-2">
                    <Zap size={10} /> {group.cmd.action}
                  </div>
                </div>
                <div className="opacity-0 group-hover/btn:opacity-100 transition-opacity text-[var(--primary)]">
                  <ShieldCheck size={14} />
                </div>
              </button>
            ))}
          </div>
        </details>
      </div>

      <div className="mt-8 pt-6 border-t border-[#1a1a1a]">
        <div className="flex gap-3 text-[10px] text-gray-500 leading-relaxed italic bg-white/5 p-4 rounded-lg border border-white/5">
          <div className="text-[var(--primary)] shrink-0 font-bold">INFO:</div>
          <div>
            {engine === "local"
              ? "WASM-based Zipformer model active. Processing 100% locally. No external cloud latency."
              : "WebSpeech API active. Processing via browser engine (requires network for most browsers)."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTest;
