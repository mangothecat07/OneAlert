import React, { useEffect, useCallback, useRef } from "react";

import { Mic, Loader2 } from "lucide-react";
import { useVoice } from "../../context/VoiceContext";
import commands from "../../config/commands";
import { parseCommand } from "../../utils/commandParser";
import { executeCommand } from "../../utils/executeCommand";
import { toast } from "react-hot-toast";

const VoiceButton = ({ onNavigate }) => {
  const speakIfEnabled = (msg) => {
    if (localStorage.getItem("voiceTTS") !== "false") {
      const u = new SpeechSynthesisUtterance(msg);
      window.speechSynthesis.speak(u);
    }
  };

  const toggleRef = useRef(null);

  const handleCommand = useCallback(
    (transcript) => {
      const cmd = parseCommand(transcript, commands);
      
      // If the command is a "pass" or empty, do absolutely nothing (no toast, no speak)
      if (cmd.action === 'pass') return;

      if (cmd.action !== 'triggerSilentSOS') {
        toast.success(`Heard: "${transcript}"`, {
          icon: "🎙️",
          style: {
            borderRadius: "0",
            background: "var(--bg)",
            color: "var(--primary)",
            border: "1px solid var(--primary)",
            fontFamily: "monospace",
            fontSize: "15px",
          },
        });
      }

      
      executeCommand(cmd, {
        navigate: onNavigate,
        toast,
        speak: speakIfEnabled,
        toggle: () => toggleRef.current?.(),
      });
    },

    [onNavigate]
  );

  const { listening, toggle, supported, status, engine } = useVoice(handleCommand);
  toggleRef.current = toggle;

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "V") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  if (!supported && engine === "cloud") return null;

  const isLoading = status === "loading";

  return (
    <button
      type="button"
      data-testid="nav-voice-button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={isLoading}
      title={isLoading ? "Loading Local AI..." : "Voice Command (Ctrl+Shift+V)"}
      aria-label="Voice Command"
      className={`group relative w-10 h-10 flex items-center justify-center border transition-all duration-150 ${
        listening
          ? "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)] animate-pulse ring-2 ring-[var(--danger)]/20"
          : isLoading
          ? "border-[var(--border)] text-[var(--text-secondary)] opacity-50 cursor-wait"
          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      {isLoading ? (
        <Loader2 size={18} strokeWidth={1.8} className="animate-spin" />
      ) : (
        <Mic 
          size={18} 
          strokeWidth={1.8} 
          className={listening ? "text-[var(--danger)]" : ""} 
        />
      )}
      
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap bg-[var(--surface)] border border-[var(--border)] text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
        {isLoading ? `Loading AI (${engine})` : listening ? "Listening..." : `Voice (${engine})`}
      </span>
    </button>
  );
};

export default VoiceButton;
