import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, FileText, CheckCircle, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { API } from "../../lib/api";

const EvidenceUploadModal = ({ isOpen, onClose, incidentId }) => {
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file to upload.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    formData.append("incident_id", incidentId || "INC-001");
    formData.append("description", description);

    try {
      const response = await fetch(`${API}/evidence/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      toast.success("Evidence uploaded successfully");
      setFiles([]);
      setDescription("");
      onClose();
    } catch (error) {
      toast.error("Error uploading evidence: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--primary)]/50 rounded-xl w-full max-w-md shadow-[0_0_30px_rgba(70,197,165,0.1)] relative flex flex-col overflow-hidden">
        {/* Header */}
        <div className="glass-header flex items-center justify-between p-5">
          <h2 className="text-lg font-display tracking-wider text-[var(--text-primary)] flex items-center gap-3">
            <Upload size={20} className="text-[var(--primary)] drop-shadow-[0_0_8px_var(--primary)]" />
            EVIDENCE UPLOAD
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6 bg-[var(--bg)]/50">
          <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-lg p-4">
            <p className="text-sm text-[var(--text-secondary)] font-mono leading-relaxed">
              Securely upload screenshots, chat logs, or other digital evidence for <span className="text-[var(--primary)] font-bold">{incidentId || "INC-001"}</span>.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-[var(--primary)] uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              Digital Asset
            </label>
            <div className="relative border-2 border-dashed border-[var(--border)] bg-[var(--surface)] rounded-xl p-8 flex flex-col items-center justify-center hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all duration-300 cursor-pointer group">
              <input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleFileChange}
              />
              <FileText size={24} className="text-[var(--text-secondary)] group-hover:text-[var(--primary)] mb-2 transition-colors" />
              <span className="text-sm text-[var(--text-secondary)] font-mono text-center">
                Click or drag to select files
              </span>
            </div>

            {files.length > 0 && (
              <div className="flex flex-col gap-2 mt-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] p-2 rounded-lg group hover:border-[var(--primary)]/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <CheckCircle size={14} className="text-[var(--primary)] shrink-0" />
                      <span className="text-xs text-[var(--text-primary)] font-mono truncate" title={f.name}>
                        {f.name}
                      </span>
                    </div>
                    <button 
                      onClick={() => removeFile(i)} 
                      className="text-[var(--text-secondary)] hover:text-red-400 p-1 rounded-md opacity-50 group-hover:opacity-100 transition-all z-20"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
              Context / Description
            </label>
            <textarea
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/50 transition-all resize-none shadow-inner"
              rows={3}
              placeholder="Provide context for this evidence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--border)] flex justify-end gap-4 bg-[var(--surface)]/80 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-bold tracking-widest uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
            disabled={uploading}
          >
            Abort
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="px-6 py-2.5 rounded-lg text-sm font-bold tracking-widest uppercase bg-[var(--primary)] text-black hover:bg-[var(--primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(70,197,165,0.4)] hover:shadow-[0_0_25px_rgba(70,197,165,0.6)]"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Processing
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Secure Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EvidenceUploadModal;
