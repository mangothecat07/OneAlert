import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/pages/Dashboard.jsx";
import Login from "@/pages/Login.jsx";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "react-hot-toast";
import { VoiceProvider } from "@/context/VoiceContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { userStore } from "@/lib/api";
import EvidenceUploadModal from "@/components/onealert/EvidenceUploadModal.jsx";
import { resumeTrackingOnLoad } from "@/utils/LocationTracker";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

import Citizen from "@/pages/Citizen.jsx";
import StandaloneIncidentView from "@/pages/StandaloneIncidentView.jsx";

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/police/dashboard" replace /> : <Citizen />} 
        />

        {/* Standalone Incident View Route */}
        <Route path="/incident/:id" element={<StandaloneIncidentView />} />
        
        {/* Police Auth Route */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/police/dashboard" replace /> : <Login />} 
        />

        {/* Base Police Route */}
        <Route 
          path="/police" 
          element={isAuthenticated ? <Navigate to="/police/dashboard" replace /> : <Navigate to="/login" replace />} 
        />
        
        {/* Police Dashboard Route (Protected) */}
        <Route
          path="/police/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Fallback Route */}
        <Route 
          path="*" 
          element={isAuthenticated ? <Navigate to="/police/dashboard" replace /> : <Navigate to="/" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  // Global error suppression for non-admins
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      if (userStore.getRole() === "theadmin") {
        originalError.apply(console, args);
      }
    };

    console.warn = (...args) => {
      if (userStore.getRole() === "theadmin") {
        originalWarn.apply(console, args);
      }
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Resume global background location tracking if it was running before close
  useEffect(() => {
    resumeTrackingOnLoad();
  }, []);

  const isWebView =
    typeof window !== "undefined" &&
    window.navigator.userAgent.includes("Flutter");

  return (
    <div className="App min-h-screen bg-[#050505] text-white">
      <AuthProvider>
        <VoiceProvider>
          <AppContent />
        </VoiceProvider>
      </AuthProvider>

      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
