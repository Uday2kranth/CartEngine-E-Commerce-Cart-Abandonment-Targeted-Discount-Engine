import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatDrawer from "./components/ChatDrawer";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import EDA from "./pages/EDA";
import ModelPerformance from "./pages/ModelPerformance";
import Predict from "./pages/Predict";
import Upload from "./pages/Upload";
import { AlertCircle } from "lucide-react";
import { API_URL } from "./config";

function App() {
  const [activePage, setActivePage] = useState("welcome");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ checked: false, trained: false, accuracy: null });
  const [serverKeys, setServerKeys] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/api/status`)
      .then((r) => r.json())
      .then((d) => {
        const acc = d.metrics?.accuracy != null ? (d.metrics.accuracy * 100).toFixed(1) : null;
        setBackendStatus({ checked: true, trained: !!d.model_trained, accuracy: acc });
      })
      .catch(() => setBackendStatus({ checked: true, trained: false, accuracy: null }));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/keys-status`)
      .then((r) => r.json())
      .then((d) => setServerKeys(d || {}))
      .catch(() => {});
  }, []);

  const sidebarWidth = sidebarCollapsed ? "92px" : "260px";

  const renderPage = () => {
    switch (activePage) {
      case "welcome":      return <Welcome setActivePage={setActivePage} setBackendStatus={setBackendStatus} backendTrained={backendStatus.trained} backendAccuracy={backendStatus.accuracy} />;
      case "upload":       return <Upload setActivePage={setActivePage} backendStatus={backendStatus} setBackendStatus={setBackendStatus} />;
      case "dashboard":   return <Dashboard />;
      case "eda":         return <EDA />;
      case "performance": return <ModelPerformance />;
      case "optimizer":   return <Predict />;
      default:            return <Welcome setActivePage={setActivePage} setBackendStatus={setBackendStatus} backendTrained={backendStatus.trained} backendAccuracy={backendStatus.accuracy} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onCollapseChange={setSidebarCollapsed}
      />

      <main className="main-content" style={{ marginLeft: sidebarWidth, transition: "margin-left 0.26s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        {backendStatus.checked && !backendStatus.trained && activePage !== "welcome" && (
          <div className="warning-banner">
            <AlertCircle size={17} />
            <span><strong>Warning:</strong> The ML model has not been trained. Run <code>python main.py</code> first.</span>
          </div>
        )}
        {renderPage()}
      </main>

      <ChatDrawer serverKeys={serverKeys} />

      <style>{`
        .warning-banner {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(245, 158, 10, 0.07);
          border: 1px solid rgba(245, 158, 10, 0.28);
          border-radius: 8px;
          padding: 0.85rem 1.3rem;
          color: var(--warning);
          font-size: 0.87rem;
          margin-bottom: 1.5rem;
        }
        .warning-banner code {
          background: rgba(245,158,10,0.12);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-size: 0.82rem;
        }
      `}</style>
    </div>
  );
}

export default App;
