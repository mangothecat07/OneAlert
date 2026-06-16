import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { PieChart as PieChartIcon, Filter, AlertTriangle, ShieldAlert } from "lucide-react";

const COLORS = ['#46c5a5', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const AnalyticsView = () => {
  const [data, setData] = useState({ categories: {}, locations: {}, repeat_offenders: [] });
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await api.get("/dashboard/analytics");
        setData(prev => {
          const prevKeys = Object.keys(prev.categories || {});
          const newKeys = Object.keys(resp.data.categories || {});
          
          if (prevKeys.length === 0) {
            // Initial load: select all
            setSelectedCategories(newKeys);
          } else {
            // Live update: check if any new categories appeared
            const newlyAdded = newKeys.filter(k => !prevKeys.includes(k));
            if (newlyAdded.length > 0) {
              setSelectedCategories(curr => [...curr, ...newlyAdded]);
            }
          }
          return resp.data;
        });
      } catch (e) {
        console.error("Failed to load analytics data", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000); // Live refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const getFilteredOverallData = () => {
    return Object.entries(data.categories)
      .filter(([key]) => selectedCategories.includes(key))
      .map(([name, value]) => ({ name, value }));
  };

  const getAbbreviations = (categories) => {
    const abbrMap = {};
    const used = new Set();
    
    categories.forEach(cat => {
      // First letter of each word (e.g., Financial Fraud -> FF)
      let abbr = cat.split(/[\s_-]+/).map(w => w[0].toUpperCase()).join('');
      if (abbr.length === 1) abbr = cat.substring(0, 3).toUpperCase();
      
      let finalAbbr = abbr;
      let counter = 1;
      while (used.has(finalAbbr)) {
        finalAbbr = `${abbr}${counter}`;
        counter++;
      }
      used.add(finalAbbr);
      abbrMap[cat] = finalAbbr;
    });
    return abbrMap;
  };

  const getLocationChartsData = () => {
    const locationData = [];
    const abbrMap = getAbbreviations(Object.keys(data.categories));
    
    Object.entries(data.locations).forEach(([location, categories]) => {
      let filteredTotal = 0;
      const mappedCategories = [];
      
      Object.entries(categories).forEach(([cat, count]) => {
        if (selectedCategories.includes(cat)) {
          filteredTotal += count;
          mappedCategories.push({ name: abbrMap[cat], fullName: cat, value: count });
        }
      });
      
      if (filteredTotal > 0) {
        locationData.push({
          location,
          categories: mappedCategories
        });
      }
    });
    return locationData;
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">Loading Analytics...</div>;
  }

  const overallData = getFilteredOverallData();
  const locationData = getLocationChartsData();

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 gap-6 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <PieChartIcon className="text-[var(--primary)]" /> Crime Pattern Analytics
        </h1>

        <div className="relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md hover:border-[var(--primary)] transition-colors text-sm"
          >
            <Filter size={16} /> Filter Categories
          </button>
          
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface)]">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Categories</span>
                <button 
                  onClick={() => setSelectedCategories(Object.keys(data.categories))}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Select All
                </button>
              </div>
              <div className="p-2 flex flex-col gap-1">
                {Object.keys(data.categories).map((cat) => (
                  <label key={cat} className="flex items-center gap-2 p-2 hover:bg-[var(--surface-hover)] rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedCategories.includes(cat)} 
                      onChange={() => toggleCategory(cat)}
                      className="accent-[var(--primary)]"
                    />
                    <span className="text-sm truncate" title={cat}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Overall Proportions Chart */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Overall Crime Proportions</h2>
          <div className="h-80 w-full">
            {overallData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overallData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {overallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '14px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-sm">No data for selected categories</div>
            )}
          </div>
        </div>

        {/* Repeat Offenders */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold text-[var(--danger)] mb-4 flex items-center gap-2">
            <AlertTriangle size={20} /> Repeat Offenders Identified
          </h2>
          <div className="flex-1 overflow-y-auto pr-2">
            {data.repeat_offenders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-sm italic">
                No repeat offenders found.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.repeat_offenders.map((offender, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--text-primary)]">{offender.name}</span>
                      <span className="text-sm text-[var(--text-secondary)] mt-1 font-mono">ID: {Object.keys(data.repeat_offenders)[idx]}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="px-2 py-1 bg-[var(--danger)]/10 text-[var(--danger)] text-sm font-bold rounded">
                        {offender.count} Cases
                      </span>
                      <span className="text-sm text-[var(--text-secondary)] mt-1">Platform: {offender.platform}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area / Location Breakdowns */}
      <div className="mt-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
          <ShieldAlert className="text-[var(--primary)]" /> Breakdown by Region
        </h2>
        
        {locationData.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)] border border-dashed border-[var(--border)] rounded-xl">
            No regional data available for the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {locationData.map((locItem, idx) => (
              <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2 truncate" title={locItem.location}>
                  {locItem.location}
                </h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locItem.categories} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={40} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                      <Tooltip 
                        cursor={{ fill: 'var(--surface-hover)' }}
                        contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        formatter={(value, name, props) => [value, props.payload.fullName]}
                        labelStyle={{ display: 'none' }}
                      />
                      <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                        {locItem.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AnalyticsView;
