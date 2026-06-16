import React, { useState, useEffect } from "react";
import { Users, Phone, ShieldAlert, Plus, Trash2, Shield, HeartPulse } from "lucide-react";
import { api, BACKEND_URL } from "@/lib/api";
import { toast } from "react-hot-toast";

const EMERGENCY_SERVICES = [
  { name: "ERSS (National Emergency)", number: "112", icon: ShieldAlert, color: "text-[var(--danger)]", bg: "bg-[var(--danger)]/10" },
  { name: "Women in Distress", number: "1091", icon: HeartPulse, color: "text-orange-500", bg: "bg-orange-500/10" },
  { name: "Cyber Crime Helpline", number: "1930", icon: Shield, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { name: "Domestic Abuse", number: "181", icon: Phone, color: "text-purple-500", bg: "bg-purple-500/10" },
];

const ContactsView = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState("");

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/contacts");
      if (res.data && res.data.contacts) {
        setContacts(res.data.contacts);
        localStorage.setItem("onealert_trusted_contacts", JSON.stringify(res.data.contacts));
      }
    } catch (e) {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContacts = async (updatedContacts) => {
    try {
      await api.post("/contacts", updatedContacts);
      setContacts(updatedContacts);
      localStorage.setItem("onealert_trusted_contacts", JSON.stringify(updatedContacts));
      toast.success("Contacts updated");
    } catch (e) {
      console.error("Save Contacts Error:", e?.response?.data || e.message);
      toast.error(`Failed to save contacts: ${e?.response?.data?.detail || e.message}`);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    
    const newContact = {
      id: `c-${Date.now()}`,
      name: newName,
      phone: newPhone,
      relationship: newRelation || "Guardian"
    };
    
    const updated = [...contacts, newContact];
    await handleSaveContacts(updated);
    
    setNewName("");
    setNewPhone("");
    setNewRelation("");
    setShowAddForm(false);
  };

  const handleRemoveContact = async (id) => {
    const updated = contacts.filter(c => c.id !== id);
    await handleSaveContacts(updated);
  };

  return (
    <div className="h-full flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-500 overflow-y-auto pr-1 pb-10">
      {/* Header */}
      <div className="shrink-0">
        <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Users className="text-[var(--primary)]" size={28} />
          Emergency Contacts
        </h2>
        <p className="text-xs text-[var(--text-secondary)] font-medium mt-1 uppercase tracking-widest">
          Trusted Guardians & National Services
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Trusted Contacts Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="text-lg font-display font-bold text-[var(--text-primary)]">Trusted Contacts</h3>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded hover:bg-[var(--primary)]/20 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddContact} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex flex-col gap-3">
              <input 
                value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Name" required
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <input 
                value={newPhone} onChange={e => setNewPhone(e.target.value)}
                placeholder="Phone Number" type="number" required min={10} maxLength={10}
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <input 
                value={newRelation} onChange={e => setNewRelation(e.target.value)}
                placeholder="Relationship (e.g., Parent, Friend)"
                className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[var(--primary)] text-black font-bold text-xs uppercase tracking-wider">Add Contact</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="p-8 text-center text-[var(--text-secondary)] text-sm animate-pulse">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] text-sm rounded-xl">
              No trusted contacts added yet.<br/>Add contacts to automatically alert them during an SOS.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="font-bold text-[var(--text-primary)] text-base">{contact.name}</span>
                    <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{contact.relationship}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors rounded-lg text-sm font-mono font-bold">
                      <Phone size={14} /> {contact.phone}
                    </a>
                    <button 
                      onClick={() => handleRemoveContact(contact.id)}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* National Services Section */}
        <div className="flex flex-col gap-4">
          <div className="border-b border-[var(--border)] pb-3">
            <h3 className="text-lg font-display font-bold text-[var(--text-primary)]">National Helplines</h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {EMERGENCY_SERVICES.map((srv, idx) => (
              <a key={idx} href={`tel:${srv.number}`} className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-all rounded-xl group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${srv.bg} ${srv.color}`}>
                    <srv.icon size={20} />
                  </div>
                  <span className="font-bold text-[var(--text-primary)] text-base">{srv.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-lg font-bold ${srv.color}`}>{srv.number}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsView;
