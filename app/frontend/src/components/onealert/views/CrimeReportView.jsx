import React, { useState, useEffect } from "react";
import { Upload, X, ShieldAlert, Plus, FileText, Send, CheckCircle, Sparkles, Copy, Printer, Save,DownloadIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { BACKEND_URL } from "@/lib/api";

const CRIME_CATEGORIES = [
  "Violence / Assault",
  "Domestic Abuse",
  "Child Abuse / Exploitation",
  "Robbery / Theft",
  "Vandalism / Property Damage",
  "Cybercrime / Hacking",
  "Financial Fraud / Scam",
  "Stalking",
  "Harassment / Intimidation",
  "Deepfake / Impersonation",
  "Blackmail / Extortion",
  "Hate Crime",
  "Missing Person",
  "Medical Emergency",
  "Other"
];

const CrimeReportView = ({ onBack }) => {
  const getDraft = () => {
    try {
      // Check if Threat Scanner or another component passed a prefill
      const prefill = localStorage.getItem("onealert_draft_prefill");
      if (prefill) {
        localStorage.removeItem("onealert_draft_prefill"); // consume it
        return { ...JSON.parse(prefill), isPrefill: true };
      }
      
      const draft = localStorage.getItem("onealert_crime_draft");
      if (draft) return JSON.parse(draft);
    } catch (e) {}
    return null;
  };
  const initialDraft = getDraft();

  const [draftId, setDraftId] = useState(initialDraft?.draftId || null);
  const [userDetails, setUserDetails] = useState(initialDraft?.userDetails || "");
  const [description, setDescription] = useState(initialDraft?.description || "");
  const [categories, setCategories] = useState(initialDraft?.categories || []);
  const [suspects, setSuspects] = useState(initialDraft?.suspects || []);
  const [newSuspect, setNewSuspect] = useState("");
  
  // BNSS Form Additions
  const [dateOfOccurrence, setDateOfOccurrence] = useState(initialDraft?.dateOfOccurrence || "");
  const [timeOfOccurrence, setTimeOfOccurrence] = useState(initialDraft?.timeOfOccurrence || "");
  const [placeOfOccurrence, setPlaceOfOccurrence] = useState(initialDraft?.placeOfOccurrence || "");
  const [sections, setSections] = useState(initialDraft?.sections || "");
  // Victims
  const [victims, setVictims] = useState(initialDraft?.victims || []);
  const [newVictimName, setNewVictimName] = useState("");
  const [newVictimAge, setNewVictimAge] = useState("");
  const [newVictimContact, setNewVictimContact] = useState("");
  const [newVictimRelation, setNewVictimRelation] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState(initialDraft?.evidenceFiles || []);
  const [submitting, setSubmitting] = useState(false);
  
  // 4b: FIR draft state
  const [firText, setFirText] = useState("");
  const [firModalOpen, setFirModalOpen] = useState(false);
  const [showVictimForm, setShowVictimForm] = useState(false);



  // Save draft whenever fields change
  useEffect(() => {
    localStorage.setItem("onealert_crime_draft", JSON.stringify({
      draftId, userDetails, description, categories, suspects, victims,
      dateOfOccurrence, timeOfOccurrence, placeOfOccurrence, sections, evidenceFiles
    }));
  }, [draftId, userDetails, description, categories, suspects, victims, dateOfOccurrence, timeOfOccurrence, placeOfOccurrence, sections, evidenceFiles]);

  const toggleCategory = (cat) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter(c => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const addSuspect = () => {
    if (newSuspect.trim()) {
      setSuspects([...suspects, newSuspect.trim()]);
      setNewSuspect("");
    }
  };

  const removeSuspect = (index) => {
    setSuspects(suspects.filter((_, i) => i !== index));
  };

  const addVictim = () => {
    if (!newVictimName.trim()) return;
    setVictims([...victims, {
      name: newVictimName.trim(),
      age: newVictimAge.trim(),
      contact: newVictimContact.trim(),
      relation_to_suspect: newVictimRelation.trim()
    }]);
    setNewVictimName("");
    setNewVictimAge("");
    setNewVictimContact("");
    setNewVictimRelation("");
    setShowVictimForm(false);
  };

  const removeVictim = (index) => {
    setVictims(victims.filter((_, i) => i !== index));
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const resp = await fetch(`${BACKEND_URL}/api/evidence/upload`, {
          method: "POST",
          body: formData
        });
        if (!resp.ok) throw new Error("Upload failed");
        const data = await resp.json();
        setEvidenceFiles(prev => [...prev, data.evidence]);
        toast.success(`Uploaded ${file.name}`);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const removeEvidence = (index) => {
    setEvidenceFiles(evidenceFiles.filter((_, i) => i !== index));
  };

  const toggleEvidenceSensitivity = (index) => {
    const newEv = [...evidenceFiles];
    newEv[index] = { ...newEv[index], is_sensitive: !newEv[index].is_sensitive };
    setEvidenceFiles(newEv);
  };

  const sendReport = async () => {
    if (!description.trim()) {
      toast.error("Please provide a description of the incident.");
      return;
    }

    let pwd = localStorage.getItem("onealert_reports_password");
    if (!pwd) {
      pwd = prompt("Please enter a secure privacy password for this incident report (you will need this to view it later):");
      if (!pwd) {
        toast.error("Password is required to submit a report.");
        return;
      }
    }

    setSubmitting(true);
    
    // Attempt to get location
    let lat = 0, lng = 0, accuracy = 0;
    try {
      if ("geolocation" in navigator) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        accuracy = pos.coords.accuracy;
      }
    } catch (e) {
      console.warn("Location not available for report.");
    }

    const payload = {
      id: `INC-${Date.now()}`,
      type: "cyber_report",
      trigger_type: "manual_form",
      status: "active",
      incident_password: pwd,
      severity: "high",
      timestamp: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      user: {
        user_id: "usr_citizen",
        name: "Citizen User",
        phone: "+91 0000000000",
        emergency_contacts_notified: false
      },
      location: { lat, lng, accuracy, is_live_tracking: false },
      cyber_details: {
        reporter_details: userDetails,
        crime_category: categories.join(", "),
        description: `[Date: ${dateOfOccurrence} ${timeOfOccurrence} | Place: ${placeOfOccurrence} | Sections: ${sections}]\n\n` + description,
        suspects,
        victims
      },
      evidence: evidenceFiles
    };

    try {
      const resp = await fetch(`${BACKEND_URL}/api/incident`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error("Failed to submit");
      
      toast.success("Crime report submitted securely.");
      localStorage.removeItem("onealert_crime_draft");
      setDescription("");
      setCategories([]);
      setSuspects([]);
      setVictims([]);
      setEvidenceFiles([]);
      if (onBack) onBack();
    } catch (err) {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveAsDraft = () => {
    const existingDrafts = JSON.parse(localStorage.getItem("onealert_saved_drafts") || "[]");
    const currentId = draftId || `DRF-${Date.now()}`;
    const newDraft = {
      id: currentId,
      type: "cyber_report",
      status: "draft",
      timestamp: new Date().toISOString(),
      cyber_details: {
        reporter_details: userDetails,
        crime_category: categories.join(", "),
        description: `[Date: ${dateOfOccurrence} ${timeOfOccurrence} | Place: ${placeOfOccurrence} | Sections: ${sections}]\n\n` + description,
        suspects,
        victims
      },
      raw_draft: {
        userDetails, description, categories, suspects, victims,
        dateOfOccurrence, timeOfOccurrence, placeOfOccurrence, sections, evidenceFiles
      }
    };
    
    const index = existingDrafts.findIndex(d => d.id === currentId);
    if (index >= 0) {
      existingDrafts[index] = newDraft;
    } else {
      existingDrafts.push(newDraft);
    }
    
    localStorage.setItem("onealert_saved_drafts", JSON.stringify(existingDrafts));
    toast.success("Saved as Draft in Your Reports");
    if (onBack) onBack();
  };

  const generateFIR = () => {
    if (!description.trim()) {
      toast.error("Please describe the incident first.");
      return;
    }
    
    const d = new Date();
    const dateStr = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    
    const suspectsText = suspects.length > 0 
      ? suspects.map((s, i) => `  ${i+1}. ${s}`).join("\n") 
      : "  None identified at this time.";
      
    const victimsText = victims.length > 0
      ? victims.map((v, i) => `  ${i+1}. ${v.name}${v.age ? ` (Age: ${v.age})` : ""}${v.contact ? `, Contact: ${v.contact}` : ""}${v.relation_to_suspect ? `, Relation to Suspect: ${v.relation_to_suspect}` : ""}`).join("\n")
      : "  Same as complainant / Not separately identified.";

    const template = `FIR Format - How to File an FIR

TO

The Station House Officer,
Police Station: ____________________
District: ____________________

Subject: First Information Report under Section 173 BNSS, 2023

Respected Sir/Madam,

I, ${userDetails || '[Full Name]'}, aged ___ years, do hereby lodge the following complaint:

1. DATE AND TIME OF OCCURRENCE: On ${dateStr} at approximately ${timeStr}.
2. PLACE OF OCCURRENCE: ${placeOfOccurrence || '[Exact location with landmarks]'}
3. DETAILS OF INCIDENT (${categories.length > 0 ? categories.join(", ") : 'Unspecified Category'}): 
${description}
4. ACCUSED PERSON(S): 
${suspectsText}
5. VICTIM(S):
${victimsText}
6. DIGITAL EVIDENCE ATTACHED: ${evidenceFiles.length} file(s)
7. SECTIONS APPLICABLE: The above offence is punishable under Section(s) ${sections || '_____'} of Bharatiya Nyaya Sanhita, 2023 and the Information Technology Act, 2000.

I request you to register an FIR and investigate the matter. I am ready to cooperate in the investigation.

Date: ${dateStr}
Place: ____________________

(Signature of Informant)
Name: ${userDetails || '____________________'}
Contact: ____________________
`;

    setFirText(template);
    setFirModalOpen(true);
  };

  const downloadFIR = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>FIR Draft — OneAlert</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 40px; color: #111; line-height: 1.8; }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 13px; }
          </style>
        </head>
        <body><pre>${firText}</pre></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const downloadPDF = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Crime Report Draft</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            h1 { color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px; }
            .section { margin-top: 20px; margin-bottom: 20px; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666; }
            .content { margin-top: 5px; padding: 10px; background: #f9f9f9; border-left: 4px solid #ccc; white-space: pre-wrap; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { padding: 8px 10px; border: 1px solid #ddd; font-size: 13px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Official Crime Report Draft</h1>
          <div class="section">
            <div class="label">Your Details (Reporter)</div>
            <div class="content">${userDetails || 'Not provided'}</div>
          </div>
          <div class="section">
            <div class="label">Crime Category</div>
            <div class="content">${categories.length > 0 ? categories.join(", ") : 'Not specified'}</div>
          </div>
          <div class="section">
            <div class="label">Incident Details</div>
            <div class="content">Date: ${dateOfOccurrence || '—'} | Time: ${timeOfOccurrence || '—'} | Place: ${placeOfOccurrence || '—'}</div>
          </div>
          <div class="section">
            <div class="label">Context / Description</div>
            <div class="content">${description || 'Not provided'}</div>
          </div>
          <div class="section">
            <div class="label">Victims</div>
            ${victims.length > 0 ? `
            <table>
              <tr><th>Name</th><th>Age</th><th>Contact</th><th>Relation to Suspect</th></tr>
              ${victims.map(v => `<tr><td>${v.name || '—'}</td><td>${v.age || '—'}</td><td>${v.contact || '—'}</td><td>${v.relation_to_suspect || '—'}</td></tr>`).join('')}
            </table>` : '<div class="content">No victims listed separately.</div>'}
          </div>
          <div class="section">
            <div class="label">Suspects</div>
            <div class="content">${suspects.length > 0 ? suspects.map((s, i) => (i+1) + '. ' + s).join('\n') : 'None identified'}</div>
          </div>
          <div class="section">
            <div class="label">Evidence Files Attached</div>
            <div class="content">${evidenceFiles.length > 0 ? evidenceFiles.map(f => f.file_name + ' (SHA256: ' + f.sha256_hash + ')').join('\n') : 'No files attached'}</div>
          </div>
          <p style="margin-top: 40px; font-size: 12px; color: #999; text-align: center;">Generated securely via OneAlert</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--primary)] flex items-center gap-3">
            <ShieldAlert size={28} />
            Draft Crime Report
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Log incident details. Submit when ready.
          </p>
        </div>
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
            <X size={24} className="text-[var(--text-secondary)]" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
        
        {/* Left Column: Details */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Your Details</label>
            <textarea
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors resize-none h-20"
              placeholder="Name, Phone Number, Email etc."
              value={userDetails}
              onChange={(e) => setUserDetails(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Context / Description</label>
            <textarea
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors resize-none h-32"
              placeholder="Describe the incident in detail"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Crime Categories</label>
            <div className="flex flex-wrap gap-2">
              {CRIME_CATEGORIES.map(c => (
                <label key={c} className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-primary)] cursor-pointer hover:border-[var(--primary)] transition-colors">
                  <input type="checkbox" checked={categories.includes(c)} onChange={() => toggleCategory(c)} className="accent-[var(--primary)] w-3 h-3" />
                  {c}
                </label>
              ))}
            </div>
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-2">Date & Time</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input type="date" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none" value={dateOfOccurrence} onChange={(e) => setDateOfOccurrence(e.target.value)} />
              <input type="time" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none" value={timeOfOccurrence} onChange={(e) => setTimeOfOccurrence(e.target.value)} />
            </div>
            <input type="text" placeholder="Place of Occurrence" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none mt-1" value={placeOfOccurrence} onChange={(e) => setPlaceOfOccurrence(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Suspects</label>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Phone, URL, Name, or Handle"
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                value={newSuspect}
                onChange={(e) => setNewSuspect(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSuspect()}
              />
              <button 
                onClick={addSuspect}
                className="p-3 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors text-[var(--primary)]"
              >
                <Plus size={20} />
              </button>
            </div>
            {suspects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suspects.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-full px-3 py-1 text-xs">
                    <span>{s}</span>
                    <button onClick={() => removeSuspect(i)} className="text-red-400 hover:text-red-300">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Victims Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Victims</label>
              <button
                onClick={() => setShowVictimForm(!showVictimForm)}
                className="flex items-center gap-1 text-xs text-[var(--primary)] hover:opacity-80 transition-opacity"
              >
                <Plus size={13} /> {showVictimForm ? "Cancel" : "Add Victim"}
              </button>
            </div>

            {/* Inline victim entry form */}
            {showVictimForm && (
              <div className="flex flex-col gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name *"
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                    value={newVictimName}
                    onChange={(e) => setNewVictimName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Age"
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                    value={newVictimAge}
                    onChange={(e) => setNewVictimAge(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Contact / Phone"
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                    value={newVictimContact}
                    onChange={(e) => setNewVictimContact(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Relation to Suspect"
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                    value={newVictimRelation}
                    onChange={(e) => setNewVictimRelation(e.target.value)}
                  />
                </div>
                <button
                  onClick={addVictim}
                  className="self-end px-3 py-1.5 bg-[var(--primary)] text-black text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Add
                </button>
              </div>
            )}

            {/* Victims list */}
            {victims.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                {victims.map((v, i) => (
                  <div key={i} className="flex items-start justify-between bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs group">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[var(--text-primary)]">{v.name}</span>
                      <span className="text-[var(--text-secondary)]">
                        {[v.age && `Age ${v.age}`, v.contact, v.relation_to_suspect].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <button onClick={() => removeVictim(i)} className="text-[var(--text-secondary)] hover:text-red-400 ml-2 opacity-50 group-hover:opacity-100 transition-all mt-0.5">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {victims.length === 0 && !showVictimForm && (
              <p className="text-xs text-[var(--text-secondary)] italic">No victims listed. Click "Add Victim" if applicable.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Applicable Sections</label>
            <input 
              type="text"
              placeholder="e.g. 318(4) BNSS"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-colors"
              value={sections}
              onChange={(e) => setSections(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column: Evidence */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 h-full">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Digital Evidence</label>
            
            <div className="relative border-2 border-dashed border-[var(--border)] bg-[var(--surface)] rounded-xl p-8 flex flex-col items-center justify-center hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all duration-300 cursor-pointer group">
              <input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleFileChange}
              />
              <Upload size={32} className="text-[var(--text-secondary)] group-hover:text-[var(--primary)] mb-3 transition-colors" />
              <span className="text-sm text-[var(--text-secondary)] text-center">
                Upload screenshots, chat logs, or files
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-4 flex-1 overflow-y-auto">
              {evidenceFiles.map((ev, i) => (
                <div key={i} className="flex flex-col bg-[var(--surface)] border border-[var(--border)] p-3 rounded-lg group hover:border-[var(--primary)]/50 transition-colors gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <CheckCircle size={16} className="text-[var(--primary)] shrink-0" />
                      <span className="text-sm text-[var(--text-primary)] font-medium truncate" title={ev.file_name}>
                        {ev.file_name}
                      </span>
                    </div>
                    <button onClick={() => removeEvidence(i)} className="text-[var(--text-secondary)] hover:text-red-400 p-1 opacity-50 group-hover:opacity-100 transition-all">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-7">
                    <span className="text-sm bg-[var(--bg)] px-2 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border)] font-mono">
                      SHA256: {ev.sha256_hash.substring(0, 16)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-7 mt-1 pt-1 border-t border-[var(--border)]/30">
                    <label className="flex items-center gap-2 cursor-pointer group/sens">
                      <input
                        type="checkbox"
                        checked={ev.is_sensitive || false}
                        onChange={() => toggleEvidenceSensitivity(i)}
                        className="w-3 h-3 accent-[var(--primary)] rounded cursor-pointer"
                      />
                      <span className="text-sm text-[var(--text-secondary)] uppercase tracking-wider font-bold group-hover/sens:text-[var(--text-primary)] transition-colors">
                        Mark Sensitive
                      </span>
                    </label>
                  </div>
                </div>
              ))}
              {evidenceFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-50 py-10">
                  <FileText size={48} className="mb-4" />
                  <p className="text-sm">No evidence uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4b: FIR Draft Modal */}
      {firModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-lg">FIR Draft (BNSS 2023 Format)</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Review and fill missing details before submission</p>
                </div>
              </div>
              <button onClick={() => setFirModalOpen(false)} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
                <X size={20} className="text-[var(--text-secondary)]" />
              </button>
            </div>
            {/* FIR Content */}
            <div className="flex-1 flex flex-col p-5 min-h-[50vh]">
              <textarea 
                className="flex-1 w-full font-mono text-xs text-[var(--text-primary)] leading-relaxed bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 focus:border-[var(--primary)] focus:outline-none resize-none shadow-inner"
                value={firText}
                onChange={(e) => setFirText(e.target.value)}
              />
            </div>
            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--border)] gap-3">
              <span className="text-xs text-[var(--text-secondary)] italic">⚠ Draft only — pending legal review</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(firText); toast.success("Copied to clipboard!"); }}
                  className="px-4 py-2 rounded-lg text-sm font-bold border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--primary)] transition-all flex items-center gap-2"
                >
                  <Copy size={15} /> Copy
                </button>
                <button
                  onClick={downloadFIR}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--primary)] text-black hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <FileText size={15} /> Print / Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-4 flex justify-between items-center bg-[var(--bg)] pb-4">
        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={saveAsDraft}
              
               className="flex-1 sm:flex-none justify-center px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:text-[var(--primary)] transition-all flex items-center gap-2"
            >
              <Save size={16} />
              Save as Draft
            </button>
            <button
              onClick={sendReport}
              disabled={submitting}
              className="flex-1 sm:flex-none justify-center px-6 py-3 rounded-lg text-sm font-bold tracking-widest uppercase bg-[var(--primary)] text-black hover:bg-[var(--primary)]/90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(70,197,165,0.4)]"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
              Send Report
            </button>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={generateFIR}
             className="flex-1 sm:flex-none justify-center px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:text-[var(--primary)] transition-all flex items-center gap-2"
            >
              <FileText size={16} />
              Generate FIR Draft
            </button>
            <button
              onClick={downloadPDF}
              className="flex-1 sm:flex-none justify-center px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:text-[var(--primary)] transition-all flex items-center gap-2"
            >
              <DownloadIcon size={18} />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrimeReportView;
