import React, { useState } from "react";
import Incidents from "../Incidents.jsx";
import { Search } from "lucide-react";

const HomeView = ({ data, onViewIncident }) => {
  const { incidents } = data;
  const [query, setQuery] = useState("");

  const incidentsList = incidents?.incidents || [];

  const filteredIncidents = incidentsList.filter(inc => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (inc.name && inc.name.toLowerCase().includes(q)) ||
      (inc.id && inc.id.toLowerCase().includes(q)) ||
      (inc.phone && inc.phone.toLowerCase().includes(q)) ||
      (inc.status && inc.status.toLowerCase().includes(q)) ||
      (inc.cyber_details?.crime_category && inc.cyber_details.crime_category.toLowerCase().includes(q)) ||
      (inc.cyber_details?.description && inc.cyber_details.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 h-10 border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] focus-within:border-[var(--primary)] transition-colors w-full md:w-96 rounded-lg">
          <Search size={16} className="text-[var(--text-secondary)] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search incidents by name, ID, phone, or category..."
            className="bg-transparent outline-none flex-1 text-sm font-medium placeholder:text-[var(--text-secondary)] text-[var(--text-primary)] min-w-0"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Incidents data={{...incidents, incidents: filteredIncidents}} onViewIncident={onViewIncident} />
      </div>
    </div>
  );
};

export default HomeView;
