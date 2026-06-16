import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import IncidentView from "@/components/onealert/views/IncidentView.jsx";
import { useAuth } from "@/context/AuthContext";

const StandaloneIncidentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Basic setup for standalone page theme
    const savedTheme = localStorage.getItem("onealert-theme") || "dark";
    const savedColor = localStorage.getItem("onealert-primary") || "#46c5a5";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.style.setProperty("--primary", savedColor);
  }, []);

  const isCitizen = !isAuthenticated;

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      window.close();
      // If window.close() fails (e.g. not opened by script), fallback to dashboard
      navigate(isAuthenticated ? "/police/dashboard" : "/");
    }
  };

  return (
    <div className="h-screen bg-[var(--bg)] text-[var(--text-primary)] grid-overlay p-4 md:p-8 overflow-y-auto">
      <IncidentView 
        incidentId={id} 
        onBack={handleBack} 
        isCitizen={isCitizen}
      />
    </div>
  );
};

export default StandaloneIncidentView;
