Voice Command Integration Plan

## Feasibility
Yes. Chrome/Edge + HTTPS + internet. Cloud ASR. Firefox/Safari limited. Full work possible with constraints.

## Architecture
Frontend only (Web Speech API). No BE changes needed.

Core pieces:
- `useVoice` hook: controls recognition
- `commands.js`: config array `{ phrase, action, payload? }`
- `commandParser.js`: `text` → `command`
- `executeCommand.js`: `action` → UI/BE call
- UI: Mic button + status + transcript + TTS feedback

## Steps

1. **Feature detect**  
   ```js
   const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
   if (!SpeechRecognition) return; // hide mic button
   ```

2. **Hook** (`onealert/app/frontend/src/hooks/useVoiceCommand.js`)  
   ```js
   const useVoice = (onCommand) => {
     const [listening, setListening] = useState(false);
     const recognition = useMemo(() => {
       const r = new SpeechRecognition();
       r.continuous = false;
       r.interimResults = true;
       r.lang = 'en-US';
       r.onresult = (e) => {
         const transcript = e.results[0][0].transcript;
         onCommand(transcript);
       };
       r.onend = () => setListening(false);
       r.onerror = (e) => console.error(e);
       return r;
     }, []);
     const toggle = () => {
       if (listening) recognition.stop();
       else recognition.start();
       setListening(!listening);
     };
     return { listening, toggle };
   };
   ```

3. **Commands config** (`onealert/app/frontend/src/config/commands.js`)  
   ```js
   export default [
     { phrase: "refresh", action: "refresh" },
     { phrase: "go to dashboard", action: "navigate", to: "/" },
     { phrase: "show anomalies", action: "navigate", to: "/anomalies" },
     { phrase: "toggle dark mode", action: "toggleTheme" },
     { phrase: "open settings", action: "navigate", to: "/settings" },
     // add more as needed
   ];
   ```

4. **Parser** (`onealert/app/frontend/src/utils/commandParser.js`)  
   ```js
   export const parseCommand = (text, commands) => {
     const normalized = text.toLowerCase().trim();
     // longest phrase first -> more specific
     const sorted = [...commands].sort((a,b) => b.phrase.length - a.phrase.length);
     for (const cmd of sorted) {
       if (normalized.includes(cmd.phrase.toLowerCase())) {
         return cmd;
       }
     }
     return { action: "unknown", original: text };
   };
   ```

5. **Executor** (`onealert/app/frontend/src/utils/executeCommand.js`)  
   ```js
   export const execute = (cmd, navigate, axios, toast, speak) => {
     switch (cmd.action) {
       case "navigate":
         navigate(cmd.to);
         speak?.("Navigating");
         break;
       case "refresh":
         window.location.reload();
         break;
       case "toggleTheme":
         // assume context or global store
         document.documentElement.classList.toggle("dark");
         toast.success("Theme toggled");
         break;
       case "unknown":
         toast.error("Unknown command");
         break;
       // more cases...
     }
   };
   ```

6. **UI integration** (`onealert/app/frontend/src/components/Navbar.jsx`)  
   - Import `useVoice`, `parseCommand`, `executeCommand`, `commands`.
   - Add Mic button to right side.
   - `const { listening, toggle } = useVoice(handleCommand);`
   - `handleCommand = (transcript) => { const cmd = parseCommand(transcript, commands); executeCommand(cmd, navigate, axios, toast, speakIfEnabled); }`
   - Button style: red glow when `listening`.
   - Show transcript in tooltip below button.
   - Toast on recognition: "Heard: '...'".

7. **TTS feedback** (optional)  
   ```js
   const speakIfEnabled = (msg) => {
     if (localStorage.getItem("voiceTTS") !== "false") {
       const u = new SpeechSynthesisUtterance(msg);
       window.speechSynthesis.speak(u);
     }
   };
   ```
   Provide toggle in user settings.

8. **Error handling**  
   Recognition `onerror`:
   - `no-speech`: show toast "No speech detected. Try again." (do not restart automatically)
   - `network`: show toast "Network error. Retrying..." → `setTimeout(recognition.start, 1000)`
   - `not-allowed`: show toast "Mic permission denied. Enable in browser settings."
   - `service-unavailable`: show toast "Speech service unavailable. Try later."

9. **Permissions**  
   `recognition.start()` must be user gesture. Mic prompt first time. If denied, show help text.

10. **Testing**  
    - Unit test `commandParser` with various inputs: exact match, partial, unknown.
    - Mock `SpeechRecognition` in hook tests to simulate `onresult`/`onerror`.
    - Manual testing: Chrome/Edge desktop, mobile if needed.
    - Simulate speech via Chrome DevTools: `navigator.mediaDevices.getUserMedia` not needed; use "Microphone" dropdown in Sensors panel to inject text? Actually Chrome has speech simulation in DevTools under "Sensors" > "Voice" (may need extension). Easier: just speak.

11. **Accessibility**  
    - All voice-triggered actions also accessible via visible buttons/shortcuts.
    - Add keyboard shortcut (e.g., `Ctrl+Shift+V`) to toggle listening.
    - Mic button `aria-label="Activate voice commands"`.
    - Live transcript `aria-live="polite"`.

12. **Production**  
    - HTTPS required. Vercel provides.
    - Graceful degrade: hide mic if no support.
    - Option: user preference `voiceEnabled` stored in localStorage.
    - Consider rate limiting commands (avoid spamming).

13. **Limitations**  
    - Internet required (cloud ASR).
    - Accuracy varies; design for easy correction (e.g., "undo" command).
    - Continuous listening drains battery; default push-to-talk.
    - Background noise → errors. Encourage quiet environment.

## Timeline
- Day 1: hook + parser + commands config.
- Day 2: UI + TTS + error handling.
- Day 3: accessibility + keyboard shortcut.
- Day 4: testing + polish.
- Day 5: QA across browsers + documentation.

## Conclusion
Full voice integration feasible. Complexity low. Main cost: design UX for reliability + fallbacks. No BE work required.




More details:
This implementation plan outlines the steps to integrate voice-activated commands into your **Synapse** React dashboard. By leveraging the **Web Speech API**, you can bridge your existing 18-option audit suite with a hands-free, terminal-inspired interface.

# Synapse Voice Integration Implementation Plan (0-100)

## 1. Core Architecture Overview
The integration follows a **Listener → Parser → Executor** pattern. The frontend will capture audio, translate it to text via the browser's native API, and map those strings to the specific functional logic defined in `synapse_script.md`[cite: 1] and `synapse_web.md`[cite: 2].



---

## 2. Phase 1: Foundation & Hooks (Day 1)

### **A. Feature Detection**
Ensure the browser supports `window.SpeechRecognition`. Since Synapse is optimized for **WSL/Linux** environments[cite: 1], this will primarily target Chrome or Edge on the host machine.

### **B. Custom React Hook: `useVoiceCommand.js`**
Create `app/frontend/src/hooks/useVoiceCommand.js` to manage the lifecycle of the microphone.
*   **Continuous Mode:** Set `continuous = false` for a "Push-to-Talk" feel, which is more reliable in noisy technical environments[cite: 3].
*   **Interim Results:** Set `interimResults = true` to show the user what Synapse is hearing in real-time.

### **C. Command Configuration: `commands.js`**
Map natural language phrases to the **18 Scan Types** found in the `synapse.sh` logic[cite: 1].

| Phrase Example | Target Action | Synapse Script Equivalent[cite: 1] |
| :--- | :--- | :--- |
| "Run Discovery" | `executeScan(1)` | Option 1 (DISCOVERY) |
| "Identify Host" | `executeScan(2)` | Option 2 (IDENTITY) |
| "Check Vulnerabilities" | `executeScan(9)` | Option 9 (VULN) |
| "Start Watchdog" | `executeScan(18)` | Option 18 (WATCHDOG) |
| "Go to Dashboard" | `navigate('/')` | UI Navigation |

---

## 3. Phase 2: Logic & Execution (Day 2)

### **A. Command Parser**
Implement fuzzy matching. If a user says "Check for vulns," the parser should intelligently map this to the **VULN (Option 9)** scan[cite: 1].

### **B. Command Executor**
The executor will interface with your existing **Axios** setup[cite: 2].
*   **API Calls:** Trigger the FastAPI endpoints (e.g., `POST /api/scan/start`) defined in your backend structure[cite: 2].
*   **State Updates:** Update the **Recharts** components or **Lucide** icons to reflect that a voice-triggered scan is active[cite: 2].

---

## 4. Phase 3: UI/UX Placement & Feedback (Day 3)

### **A. The "Synapse Orb" (Mic Button)**
*   **Placement:** Top-right corner of the `Navbar.jsx`[cite: 3]. 
*   **Visual States:**
    *   **Idle:** Low-opacity neon ring.
    *   **Listening:** Pulsing red/cyan glow (Tron aesthetic) using **Framer Motion**[cite: 2].
    *   **Processing:** A "loading" rotation animation.

### **B. Live Transcript Overlay**
*   Place a small, high-contrast text bar at the bottom of the screen (similar to a terminal status bar).
*   Use a monospace font to match the terminal-centric workflow[cite: 2].
*   **Aria-Live:** Use `aria-live="polite"` for screen reader accessibility[cite: 3].

### **C. TTS Feedback (Text-to-Speech)**
Provide an optional audio confirmation.
*   *Command recognized:* "Executing SSH Audit. Detecting weak ciphers..."[cite: 1].
*   *Error:* "Command not recognized. Please repeat."

---

## 5. Phase 4: Error Handling & Refinement (Day 4)

### **A. Resilience Protocols[cite: 3]**
*   **`no-speech`:** If the user stays silent, reset the orb gracefully without a jarring error.
*   **`network`:** Automatically retry the connection once if the cloud-based ASR (Automatic Speech Recognition) fails.
*   **`not-allowed`:** Display a clear "Microphone Blocked" icon with instructions to enable permissions.

### **B. Keyboard Override**
*   Map `Ctrl + Shift + V` to toggle the microphone manually, adhering to the terminal-centric workflow preferred by the user[cite: 2, 3].

---

## 6. Phase 5: QA & Deployment (Day 5)

*   **HTTPS Requirement:** Ensure the Vercel deployment uses HTTPS (required for Web Speech API)[cite: 3].
*   **Performance:** Check that the background `synapse.sh` execution doesn't lag the React UI while voice commands are being processed[cite: 1, 2].
*   **Documentation:** Update the `README.md` to list available voice keywords.

## Conclusion
This plan moves Synapse from a static dashboard to a responsive, voice-aware security framework. By utilizing the existing **JSON-based logging** and **FastAPI endpoints**[cite: 2], the voice integration remains a "zero-backend-change" upgrade to the frontend's capability.
