import React, { useState, useEffect } from "react";
import { ArrowLeft, ShieldAlert, PhoneCall, Mic, Navigation, AlertTriangle, DownloadIcon } from "lucide-react";
import { api, BACKEND_URL } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

import { Lock } from "lucide-react";

const relTime = (iso) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const IncidentView = ({ incident, incidentId, onBack, isCitizen = false }) => {
  const { username } = useAuth();
  const [currentIncident, setCurrentIncident] = useState(incident);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isLocked, setIsLocked] = useState(isCitizen);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");

  const [statusUpdate, setStatusUpdate] = useState("active");
  const [statusDesc, setStatusDesc] = useState("");
  const [commentText, setCommentText] = useState("");
  const [newSuspect, setNewSuspect] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingSuspect, setSubmittingSuspect] = useState(false);
  const [locFilter, setLocFilter] = useState("compact");
  const [openEvidenceLogs, setOpenEvidenceLogs] = useState({});

  const targetId = incident?.id || incidentId;

  const fetchLatest = async (pwd = null) => {
    setLoading(true);
    setError(false);
    try {
      const endpoint = isCitizen 
        ? `/incident/${targetId}` 
        : `/dashboard/incident/${targetId}`;
      
      const config = {};
      if (pwd && isCitizen) {
        config.headers = { "x-incident-password": pwd };
      }

      const resp = await api.get(endpoint, config);
      if (resp.data) {
        setCurrentIncident(resp.data);
        setIsLocked(false);
        setUnlockError("");
      }
    } catch (err) {
      if (isCitizen && err.response && err.response.status === 401) {
        setIsLocked(true);
        if (pwd) setUnlockError("Incorrect password. Please try again.");
      } else {
        console.error(err);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!targetId) return;
    if (isLocked) return;
    
    fetchLatest(enteredPassword);

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = BACKEND_URL.replace(/^https?:\/\//, "");
    const socket = new WebSocket(`${wsProtocol}//${wsUrl}/api/ws/incident/${targetId}`);
    
    socket.onmessage = (event) => {
      try {
        const updatedIncident = JSON.parse(event.data);
        if (updatedIncident && updatedIncident.id === targetId) {
          setCurrentIncident(updatedIncident);
        }
      } catch (err) {
        console.error("WebSocket message parsing error:", err);
      }
    };

    return () => {
      socket.close();
    };
  }, [targetId, isCitizen]);

  const handleUnlock = () => {
    if (!enteredPassword) return;
    fetchLatest(enteredPassword);
  };

  const toggleEvidenceLogs = (evidenceId) => {
    setOpenEvidenceLogs(prev => ({ ...prev, [evidenceId]: !prev[evidenceId] }));
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">Loading Incident...</div>;
  }

  if (error && !currentIncident) {
    return <div className="h-full flex items-center justify-center text-[var(--danger)] font-bold">Incident Not Found</div>;
  }

  if (isLocked) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 p-4">
         <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-2xl flex flex-col items-center gap-6 max-w-sm w-full shadow-2xl">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mb-2">
              <Lock size={32} className="text-[var(--primary)]" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] font-display tracking-wide">Report Locked</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2">This report is protected by a privacy password.</p>
            </div>
            
            <div className="w-full flex flex-col gap-3">
              <input 
                type="password"
                value={enteredPassword}
                onChange={e => setEnteredPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                className="w-full bg-[var(--bg)] border border-[var(--border)] px-4 py-3 text-center text-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-all font-mono rounded-xl"
                placeholder="••••••••"
                autoFocus
              />
              {unlockError && <p className="text-xs text-[var(--danger)] text-center font-bold">{unlockError}</p>}
            </div>

            <div className="w-full flex gap-3 mt-4">
              <button onClick={onBack} className="flex-1 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[var(--surface-hover)] transition-all">
                Cancel
              </button>
              <button onClick={handleUnlock} className="flex-1 px-4 py-3 bg-[var(--primary)] text-black rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                Unlock
              </button>
            </div>
         </div>
      </div>
    );
  }

  if (!currentIncident) return null;

  const downloadPDF = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Incident Report - ${currentIncident.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            h1 { color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px; }
            .section { margin-top: 20px; margin-bottom: 20px; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666; }
            .content { margin-top: 5px; padding: 10px; background: #f9f9f9; border-left: 4px solid #ccc; white-space: pre-wrap; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1>Official Incident Report</h1>
          <div class="section">
            <div class="label">Incident ID</div>
            <div class="content">${currentIncident.id}</div>
          </div>
          <div class="section">
            <div class="label">Reported Timestamp</div>
            <div class="content">${new Date(currentIncident.timestamp).toLocaleString()}</div>
          </div>
          <div class="section">
            <div class="label">Type</div>
            <div class="content">${currentIncident.type}</div>
          </div>
          <div class="section">
            <div class="label">Status</div>
            <div class="content">${currentIncident.status}</div>
          </div>
          <div class="section">
            <div class="label">Reporter Details</div>
            <div class="content">Name: ${currentIncident.user?.name || currentIncident.name || 'Unknown'}\nPhone: ${currentIncident.user?.phone || currentIncident.phone || 'Unknown'}</div>
          </div>
          <div class="section">
            <div class="label">Context / Description</div>
            <div class="content">${currentIncident.cyber_details?.description || 'N/A'}</div>
          </div>
          <div class="section">
            <div class="label">Suspects</div>
            <div class="content">${currentIncident.cyber_details?.suspects?.join(', ') || 'None identified'}</div>
          </div>
          <div class="section">
            <div class="label">Evidence Files Attached</div>
            <div class="content">${currentIncident.evidence?.map(f => f.file_name + " (SHA256: " + f.sha256_hash + ")").join('\\n') || 'No files attached'}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleUpdateStatus = async () => {
    if (!statusDesc.trim()) return toast.error("Please provide a status description");
    setSubmitting(true);
    try {
      const resp = await api.post(`/dashboard/incident/${currentIncident.id}/status`, {
        status: statusUpdate,
        description: statusDesc
      });
      setCurrentIncident(resp.data.incident);
      setStatusDesc("");
      toast.success("Status updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return toast.error("Please provide a comment");
    setSubmittingComment(true);
    try {
      const endpoint = isCitizen 
        ? `/incident/${currentIncident.id}/comment` 
        : `/dashboard/incident/${currentIncident.id}/comment`;
      
      const resp = await api.post(endpoint, {
        text: commentText
      });
      setCurrentIncident(resp.data.incident);
      setCommentText("");
      toast.success("Comment added successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddSuspect = async () => {
    if (!newSuspect.trim()) return toast.error("Please enter a suspect name or detail");
    setSubmittingSuspect(true);
    try {
      const resp = await api.post(`/incident/${currentIncident.id}/suspect`, {
        suspect: newSuspect,
        source: isCitizen ? "citizen" : "police"
      });
      setCurrentIncident(resp.data.incident);
      setNewSuspect("");
      toast.success("Suspect added successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add suspect");
    } finally {
      setSubmittingSuspect(false);
    }
  };

  const logEvidenceAccess = async (evidenceId) => {
    let viewerName = username || "Police Officer";
    if (isCitizen) {
      viewerName = prompt("Enter your name to log evidence access for compliance:");
      if (!viewerName) return false;
    }
    try {
      const resp = await api.post(`/incident/${currentIncident.id}/evidence/${evidenceId}/log`, { username: viewerName });
      setCurrentIncident(resp.data);
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to log evidence access");
      return false;
    }
  };

  const isActive = currentIncident.status === "active";
  const isDispatching = currentIncident.status === "dispatching";
  const isCyber = currentIncident.type === "cyber_report";
  const exactTime = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "medium" }).format(new Date(currentIncident.timestamp));

  return (
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pr-2 pb-10">
      <div className="flex items-center gap-4 border-b border-[var(--border)] pb-4 sticky top-0 bg-[var(--bg)] z-10 pt-2">
        <button onClick={onBack} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors border border-transparent hover:border-[var(--border)]">
          <ArrowLeft size={24} className="text-[var(--text-secondary)]" />
        </button>
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-display font-bold text-[var(--primary)] flex items-center gap-3">
              Incident Details:<br></br> {currentIncident.id}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1 font-mono">
              Reported: {exactTime}
            </p>
          </div>
          <div>
            <button
              onClick={downloadPDF}
              className="w-fit px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:text-[var(--primary)] transition-all flex items-center gap-2"
            >
              <DownloadIcon size={16} />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* User Info */}
          <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl flex flex-col gap-4">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">
              Reporter Information
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-xl font-bold text-[var(--primary)]">
                {(currentIncident.user?.name || currentIncident.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--text-primary)]">
                  {currentIncident.user?.name || currentIncident.name || "Unknown"}
                </span>
                {(currentIncident.user?.phone || currentIncident.phone) ? (
                  <a
                    href={`tel:${currentIncident.user?.phone || currentIncident.phone}`}
                    className="text-lg font-mono text-[var(--primary)] flex items-center gap-2 hover:text-[var(--primary)]/80 transition-colors group"
                    title="Click to call"
                  >
                    <PhoneCall size={16} className="group-hover:animate-pulse" />
                    {currentIncident.user?.phone || currentIncident.phone}
                  </a>
                ) : (
                  <span className="text-lg font-mono text-[var(--text-secondary)] flex items-center gap-1">
                    <PhoneCall size={16} /> No Phone
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Citizen reporter details from crime form */}
          {currentIncident.cyber_details?.reporter_details && (() => {
            const rd = currentIncident.cyber_details.reporter_details;
            const hasDetails = rd.name || rd.email || rd.phone || rd.address;
            if (!hasDetails) return null;
            return (
              <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl flex flex-col gap-3">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">
                  Citizen Details
                </h3>
                {rd.name && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-[var(--text-secondary)] uppercase">Name</span>
                    <span className="text-base font-bold text-[var(--text-primary)]">{rd.name}</span>
                  </div>
                )}
                {rd.phone && (
                  <a href={`tel:${rd.phone}`} className="flex items-center gap-2 text-base font-mono text-[var(--primary)] hover:opacity-80 transition-opacity group">
                    <PhoneCall size={14} className="group-hover:animate-pulse" /> {rd.phone}
                  </a>
                )}
                {rd.email && (
                  <a href={`mailto:${rd.email}`} className="text-base font-mono text-[var(--primary)] hover:opacity-80 transition-opacity">
                    {rd.email}
                  </a>
                )}
                {rd.address && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-[var(--text-secondary)] uppercase">Address</span>
                    <span className="text-sm text-[var(--text-primary)] leading-relaxed">{rd.address}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Location */}
          {currentIncident.location && (
            <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">
                Location Data
              </h3>
              <div className="flex flex-col gap-2">
                {currentIncident.location.address ? (
                  <p className="text-base text-[var(--text-primary)] font-medium flex items-start gap-2">
                    <Navigation size={18} className="text-blue-400 shrink-0 mt-0.5" />
                    {currentIncident.location.address}
                  </p>
                ) : null}
                <div className="flex items-center gap-2 mt-2">
                   <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded font-mono text-sm">
                     {currentIncident.location.lat.toFixed(6)}, {currentIncident.location.lng.toFixed(6)}
                   </span>
                   {currentIncident.location.is_live_tracking && (
                     <span className="text-xs bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 px-3 py-1 rounded font-bold uppercase tracking-wider animate-pulse">
                       Live Tracking Active
                     </span>
                   )}
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis / Threat Score */}
          {currentIncident.ai_analysis && (
            <div className={`bg-[var(--surface)] border p-5 rounded-xl flex flex-col gap-4 ${
              currentIncident.ai_analysis.threat_score >= 80 ? "border-[var(--danger)]" : 
              currentIncident.ai_analysis.threat_score >= 50 ? "border-orange-500" : "border-[var(--border)]"
            }`}>
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2 flex items-center justify-between">
                <span>Threat Engine Analysis</span>
                <span className={`text-base font-bold ${
                  currentIncident.ai_analysis.threat_score >= 80 ? "text-[var(--danger)]" : 
                  currentIncident.ai_analysis.threat_score >= 50 ? "text-orange-500" : "text-yellow-500"
                }`}>
                  SCORE: {currentIncident.ai_analysis.threat_score}
                </span>
              </h3>
              
              {currentIncident.ai_analysis.flags && currentIncident.ai_analysis.flags.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[var(--text-secondary)] uppercase">Detected Risk Flags</span>
                  <div className="flex flex-wrap gap-2">
                    {currentIncident.ai_analysis.flags.map((flag, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 rounded uppercase tracking-wider font-bold">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[var(--text-secondary)] italic">
                  No critical risk flags detected by the engine.
                </div>
              )}
            </div>
          )}

          {/* 4a: CCB Integration Status — only for cyber_report incidents */}
          {currentIncident.type === "cyber_report" && (
            <div className={`bg-[var(--surface)] border p-5 rounded-xl flex flex-col gap-3 ${
              currentIncident.ccb_sync_status === "synced" ? "border-green-500/50" :
              currentIncident.ccb_sync_status === "failed" ? "border-[var(--danger)]/50" :
              "border-[var(--border)]"
            }`}>
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2 flex items-center justify-between">
                <span>Cyber Crime Branch (CCB)</span>
                {currentIncident.ccb_sync_status === "synced" ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-bold uppercase">✓ Synced</span>
                ) : currentIncident.ccb_sync_status === "failed" ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 font-bold uppercase">✗ Failed</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)] font-bold uppercase">Not Forwarded</span>
                )}
              </h3>
              {currentIncident.ccb_case_ref ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)] uppercase">Case Reference</span>
                  <span className="font-mono text-sm text-green-400 font-bold tracking-wider">{currentIncident.ccb_case_ref}</span>
                </div>
              ) : (
                <div className="text-sm text-[var(--text-secondary)] italic">
                  {currentIncident.ccb_sync_status === "failed" ? "Forward to CCB failed. Retry from actions." : "No case reference issued yet."}
                </div>
              )}
            </div>
          )}

          {/* Status & Triggers */}
          <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl flex flex-col gap-4">
             <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">
              Status Information
            </h3>
            <div className="flex items-center justify-between">
              <span className={`text-sm uppercase font-bold px-3 py-1.5 rounded border ${
                isActive ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30" : 
                isDispatching ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                currentIncident.status === 'investigating' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" :
                currentIncident.status === 'resolved' ? "bg-green-500/10 text-green-400 border-green-500/30" :
                "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)]"
              }`}>
                {currentIncident.status}
              </span>
              <span className="flex items-center gap-1 px-3 py-1.5 border border-[var(--danger)]/30 text-[var(--danger)] bg-[var(--danger)]/10 font-bold text-sm rounded capitalize">
                Type: {currentIncident.type.replace("_", " ")}
              </span>
            </div>
            {currentIncident.trigger_type && (
               <div className="text-sm font-mono text-[var(--text-secondary)] mt-2">
                 Triggered via: <span className="text-[var(--primary)]">{currentIncident.trigger_type}</span>
               </div>
            )}
            
            {/* Action Box based on Role */}
            {!isCitizen ? (
              <div className="mt-4 border-t border-[var(--border)] pt-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase">Update Status</h4>
                <div className="flex flex-col gap-3">
                  <select 
                    className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] w-full sm:w-1/3"
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="dispatching">Dispatching</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <textarea 
                    placeholder="Status context/description..." 
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] h-24 resize-none"
                    value={statusDesc}
                    onChange={(e) => setStatusDesc(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleUpdateStatus}
                      disabled={submitting}
                      className="px-6 py-2.5 bg-[var(--primary)] text-black font-bold text-sm rounded hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors flex items-center justify-center w-full sm:w-auto"
                    >
                      {submitting ? "Updating..." : "Update Status"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 border-t border-[var(--border)] pt-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase">Add Comment</h4>
                <div className="flex flex-col gap-3">
                  <textarea 
                    placeholder="Provide additional details or context..." 
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] h-24 resize-none"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleAddComment}
                      disabled={submittingComment}
                      className="px-6 py-2.5 bg-[var(--primary)] text-black font-bold text-sm rounded hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors flex items-center justify-center w-full sm:w-auto"
                    >
                      {submittingComment ? "Adding..." : "Add Comment"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Status History Timeline */}
            {currentIncident.status_history && currentIncident.status_history.length > 0 && (
              <div className="mt-4 border-t border-[var(--border)] pt-4 flex flex-col gap-3">
                <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase">Status History</h4>
                <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-1">
                  {[...currentIncident.status_history].reverse().map((sh, idx) => {
                    const isPolice = sh.source === "police";
                    const isCitizenSrc = sh.source === "citizen";
                    const sourceColor = isPolice ? "text-blue-400" : isCitizenSrc ? "text-white" : "text-[var(--text-secondary)]";
                    const bgColor = isPolice ? "bg-blue-400" : isCitizenSrc ? "bg-white" : "bg-[var(--text-secondary)]";
                    const shadow = isPolice ? "shadow-[0_0_8px_rgba(96,165,250,0.5)]" : isCitizenSrc ? "shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "";
                    
                    return (
                      <div key={idx} className="flex gap-4 text-base">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-1.5 ${idx === 0 ? shadow : ""} ${bgColor}`}></div>
                          {idx !== currentIncident.status_history.length - 1 && (
                            <div className="w-px h-full bg-[var(--border)] mt-2"></div>
                          )}
                        </div>
                        <div className="flex flex-col pb-3">
                          <div className="flex items-center gap-3">
                            <span className={`font-bold uppercase text-sm ${sourceColor}`}>
                              {sh.status} <span className="opacity-70 text-xs capitalize">({sh.source || "System"})</span>
                            </span>
                            <span className="text-sm font-mono text-[var(--text-secondary)]">
                              {new Intl.DateTimeFormat("en-US", { timeStyle: "medium" }).format(new Date(sh.timestamp))}
                            </span>
                          </div>
                          <span className="text-[var(--text-primary)] mt-1 text-base leading-relaxed">
                            {sh.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments Timeline */}
            {currentIncident.comments && currentIncident.comments.length > 0 && (
              <div className="mt-4 border-t border-[var(--border)] pt-4 flex flex-col gap-3">
                <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase">Comments & Updates</h4>
                <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-1">
                  {[...currentIncident.comments].reverse().map((c, idx) => {
                    const isPolice = c.source === "police";
                    const isCitizenSrc = c.source === "citizen";
                    const sourceColor = isPolice ? "text-blue-400" : isCitizenSrc ? "text-white" : "text-[var(--text-secondary)]";
                    const bgColor = isPolice ? "bg-blue-400" : isCitizenSrc ? "bg-white" : "bg-[var(--text-secondary)]";
                    const shadow = isPolice ? "shadow-[0_0_8px_rgba(96,165,250,0.5)]" : isCitizenSrc ? "shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "";
                    
                    return (
                      <div key={idx} className="flex gap-4 text-base">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-1.5 ${idx === 0 ? shadow : ""} ${bgColor}`}></div>
                          {idx !== currentIncident.comments.length - 1 && (
                            <div className="w-px h-full bg-[var(--border)] mt-2"></div>
                          )}
                        </div>
                        <div className="flex flex-col pb-3">
                          <div className="flex items-center gap-3">
                            <span className={`font-bold uppercase text-sm ${sourceColor}`}>
                              {c.source || "System"}
                            </span>
                            <span className="text-sm font-mono text-[var(--text-secondary)]">
                              {new Intl.DateTimeFormat("en-US", { timeStyle: "medium" }).format(new Date(c.timestamp))}
                            </span>
                          </div>
                          <span className="text-[var(--text-primary)] mt-1 text-base leading-relaxed">
                            {c.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
          {/* Location History for SOS */}
          {currentIncident.type === "physical_sos" && (
            <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2 flex items-center gap-2">
                <Navigation size={14} className="text-blue-400" /> Live Location History
              </h3>
              
              {(!currentIncident.location_history || currentIncident.location_history.length === 0) ? (
                <div className="text-sm text-[var(--text-secondary)] italic border border-[var(--border)] bg-[var(--surface-hover)] p-3 rounded">
                  No location history available yet. Tracking is initializing.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={() => setLocFilter("compact")}
                      className={`text-xs px-3 py-1 rounded border font-bold uppercase tracking-wider transition-colors ${locFilter === "compact" ? "bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/50" : "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)] hover:border-gray-500"}`}
                    >
                      Compact
                    </button>
                    <button 
                      onClick={() => setLocFilter("verbose")}
                      className={`text-xs px-3 py-1 rounded border font-bold uppercase tracking-wider transition-colors ${locFilter === "verbose" ? "bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/50" : "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)] hover:border-gray-500"}`}
                    >
                      Verbose
                    </button>
                  </div>
                  <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {(() => {
                      const getCompactHistory = (history) => {
                        if (!history) return [];
                        const compact = [];
                        for (let i = 0; i < history.length; i++) {
                          const loc = history[i];
                          if (compact.length === 0) {
                            compact.push({
                              ...loc,
                              first_seen: loc.timestamp,
                              last_seen: loc.timestamp
                            });
                          } else {
                            const last = compact[compact.length - 1];
                            const distLat = Math.abs(last.lat - loc.lat);
                            const distLng = Math.abs(last.lng - loc.lng);
                            // ~11 meters tolerance
                            if (distLat < 0.0001 && distLng < 0.0001) {
                              last.last_seen = loc.timestamp;
                            } else {
                              compact.push({
                                ...loc,
                                first_seen: loc.timestamp,
                                last_seen: loc.timestamp
                              });
                            }
                          }
                        }
                        return compact;
                      };

                      const displayHistory = locFilter === "compact" 
                        ? getCompactHistory(currentIncident.location_history) 
                        : currentIncident.location_history;

                      return [...displayHistory].reverse().map((loc, i) => (
                        <div key={i} className={`flex items-start gap-3 border-l-2 pl-3 relative ${loc.is_duplicate && locFilter === "verbose" ? "border-neutral-700/50 opacity-70" : "border-[var(--primary)]/30"}`}>
                          <div className={`absolute w-2 h-2 rounded-full -left-[5px] top-1.5 ${i === 0 && locFilter !== "verbose" ? "bg-[var(--danger)] animate-pulse" : (loc.is_duplicate && locFilter === "verbose" ? "bg-neutral-600" : "bg-[var(--primary)]")}`}></div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg)] self-start px-2 py-0.5 rounded border border-[var(--border)] flex flex-col gap-0.5">
                              {locFilter === "compact" ? (
                                <>
                                  <span>First Seen: {new Date(loc.first_seen).toLocaleTimeString()}</span>
                                  <span>Last Seen: {new Date(loc.last_seen).toLocaleTimeString()} {i === 0 ? "(Latest)" : ""}</span>
                                </>
                              ) : (
                                <span>{new Date(loc.timestamp).toLocaleTimeString()} {i === 0 ? "(Latest)" : ""}{loc.is_duplicate && " (Dup)"}</span>
                              )}
                            </span>
                            <span className="text-sm text-[var(--text-primary)] font-mono mt-1">
                              {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)} 
                              <span className="text-xs text-[var(--text-secondary)] ml-2">±{Math.round(loc.accuracy)}m</span>
                            </span>
                            {loc.address && (
                              <span className="text-xs text-[var(--text-secondary)] mt-0.5 leading-tight pr-2">
                                {loc.address}
                              </span>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Cyber Details / Description */}
          {currentIncident.cyber_details && (
            <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl flex flex-col gap-4 flex-1">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">
                Report Details
              </h3>
              
              {currentIncident.cyber_details.crime_category && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Category</span>
                  <span className="text-base text-[var(--danger)] font-bold">{currentIncident.cyber_details.crime_category}</span>
                </div>
              )}

              {currentIncident.cyber_details.description && (
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Description</span>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--bg)] p-4 border border-[var(--border)] rounded-lg min-h-[120px] whitespace-pre-wrap">
                    {currentIncident.cyber_details.description}
                  </p>
                </div>
              )}

              {/* Suspects Section */}
              <div className="flex flex-col gap-2 mt-4">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Identified Suspects</span>
                
                {(!currentIncident.cyber_details.suspects || currentIncident.cyber_details.suspects.length === 0) ? (
                  <div className="text-sm text-[var(--text-secondary)] italic border border-[var(--border)] bg-[var(--surface-hover)] p-3 rounded">
                    No suspects attached.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentIncident.cyber_details.suspects.map((s, i) => {
                      const isString = typeof s === "string";
                      const suspectName = isString ? s : s.name;
                      const source = isString ? "citizen" : s.source;
                      
                      const isPolice = source === "police";
                      
                      return (
                        <span key={i} className={`text-sm px-3 py-1.5 rounded-full border font-medium flex items-center gap-2 ${
                          isPolice 
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {suspectName}
                          <span className="text-[10px] uppercase opacity-70 border-l pl-2 border-current">
                            {isPolice ? "Police" : "User"}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
                
                {/* Allow Anyone to Add Suspect */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add a suspect..."
                    className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    value={newSuspect}
                    onChange={(e) => setNewSuspect(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSuspect()}
                  />
                  <button
                    onClick={handleAddSuspect}
                    disabled={submittingSuspect || !newSuspect.trim()}
                    className="px-4 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] hover:border-[var(--primary)] disabled:opacity-50 transition-colors font-bold whitespace-nowrap"
                  >
                    {submittingSuspect ? "..." : "+ Add"}
                  </button>
                </div>
              </div>

              {/* Victims Section */}
              {currentIncident.cyber_details?.victims && currentIncident.cyber_details.victims.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Victims</span>
                  <div className="flex flex-col gap-2">
                    {currentIncident.cyber_details.victims.map((v, i) => (
                      <div key={i} className="flex items-start gap-3 bg-[var(--bg)] border border-orange-500/20 rounded-lg p-3">
                        <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex flex-col gap-0.5 text-sm">
                          <span className="font-bold text-[var(--text-primary)]">{v.name || "Unknown"}</span>
                          <span className="text-[var(--text-secondary)] text-xs">
                            {[v.age && `Age: ${v.age}`, v.contact && `Contact: ${v.contact}`, v.relation_to_suspect && `Relation: ${v.relation_to_suspect}`].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence Attachments */}
          {currentIncident.evidence && currentIncident.evidence.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">
                Digital Evidence
              </h3>
              <div className="flex flex-col gap-3">
                {currentIncident.evidence.map((ev, i) => (
                  <div key={i} className="flex flex-col bg-[var(--bg)] border border-[var(--border)] p-3 rounded-lg gap-2">
                    <div className="flex items-center justify-between">
                     <div className="flex flex-col gap-2 overflow-hidden">
                        {ev.is_sensitive ? (
                          <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              const proceed = await logEvidenceAccess(ev.evidence_id);
                              if (!proceed) return;

                              let pwd = currentIncident.decryption_key || "";
                              if (isCitizen) {
                                pwd = prompt("This file is encrypted. Enter password to view:");
                                if (!pwd) return;
                              } else if (!pwd) {
                                toast.error("No decryption key found for this incident.");
                                return;
                              }
                              const toastId = toast.loading("Decrypting document...");
                              try {
                                const resp = await fetch(`${BACKEND_URL}/api/evidence/decrypt`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ file_path: ev.file_path, password: pwd })
                                });
                                if (!resp.ok) {
                                  toast.error("Incorrect password or decryption failed.", { id: toastId });
                                  return;
                                }
                                const blob = await resp.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = ev.file_name;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                toast.success("Document downloaded securely", { id: toastId });
                              } catch(err) {
                                toast.error("Decryption error", { id: toastId });
                              }
                            }}
                            className="text-sm font-bold flex items-start text-left gap-2 hover:underline text-[var(--text-primary)] break-words"
                          >
                            <span className="shrink-0">{ev.file_type.includes("image") ? "🖼️" : "📄"}</span> 
                            <span>{ev.file_name}</span>
                          </button>
                        ) : (
                          <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              const proceed = await logEvidenceAccess(ev.evidence_id);
                              if (proceed) {
                                window.open(`${BACKEND_URL}/${ev.file_path}`, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="text-sm font-bold flex items-start text-left gap-2 hover:underline text-[var(--text-primary)] break-words"
                          >
                            <span className="shrink-0">{ev.file_type.includes("image") ? "🖼️" : "📄"}</span> 
                            <span>{ev.file_name}</span>
                          </button>
                        )}
                        {ev.is_sensitive && (
                          <span className="text-[10px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 px-2 py-1 rounded uppercase font-bold tracking-wider flex items-center gap-1 self-start">
                            <ShieldAlert size={12} /> Sensitive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-2 mt-1">
                      <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
                        <span className="font-mono break-all bg-[var(--surface-hover)] py-0.5 px-1.5 border border-[var(--border)] rounded">
                          SHA256: {ev.sha256_hash}
                        </span>
                        <br/>
                       
                      </div>
                       <button 
                          onClick={() => toggleEvidenceLogs(ev.evidence_id)}
                          className="hover:text-[var(--primary)] transition-colors underline"
                        >
                          {openEvidenceLogs[ev.evidence_id] ? "Hide Access Logs" : `Access Logs (${(ev.access_logs || []).length})`}
                        </button>

                      {openEvidenceLogs[ev.evidence_id] && (
                        <div className="flex flex-col gap-1.5 mt-2 bg-[var(--surface-hover)] p-2 rounded max-h-32 overflow-y-auto">
                          {(!ev.access_logs || ev.access_logs.length === 0) ? (
                            <span className="text-xs text-[var(--text-secondary)] italic">No access logs yet.</span>
                          ) : (
                            [...ev.access_logs].reverse().map((log, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="font-bold text-[var(--text-primary)]">{log.username}</span>
                                <span className="text-[var(--text-secondary)]">
                                  {new Intl.DateTimeFormat("en-US", { timeStyle: "short", dateStyle: "short" }).format(new Date(log.timestamp))}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentView;
