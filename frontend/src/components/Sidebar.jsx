import React, { useState, useEffect } from "react";
import { LayoutDashboard, BarChart3, ShieldAlert, Sparkles, Percent, ChevronLeft, ChevronRight, Wifi, WifiOff, Home, Database } from "lucide-react";
import { API_URL } from "../config";

const Sidebar = ({ activePage, setActivePage, onCollapseChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState({ online: false, trained: false, accuracy: null, checked: false });

  const menuItems = [
    { id: "welcome",     label: "Welcome Portal",     desc: "Getting started guide", icon: Home },
    { id: "upload",      label: "Session Hub",        desc: "Manage dataset session",icon: Database },
    { id: "dashboard",   label: "Dashboard",          desc: "Analytics overview",    icon: LayoutDashboard },
    { id: "eda",         label: "EDA Analytics",      desc: "Data exploration",      icon: BarChart3 },
    { id: "performance", label: "Model Performance",  desc: "ML evaluation metrics", icon: ShieldAlert },
    { id: "optimizer",   label: "Discount Optimizer", desc: "Revenue simulation",    icon: Percent },
  ];

  useEffect(() => {
    const check = () => {
      fetch(`${API_URL}/api/status`)
        .then((r) => r.json())
        .then((d) => {
          const acc = d.metrics?.accuracy != null ? (d.metrics.accuracy * 100).toFixed(1) : null;
          setStatus({ online: true, trained: !!d.model_trained, accuracy: acc, checked: true });
        })
        .catch(() => setStatus({ online: false, trained: false, accuracy: null, checked: true }));
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (onCollapseChange) onCollapseChange(next);
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`} style={{ width: collapsed ? "92px" : "260px" }}>
      {/* Brand */}
      <div className="sidebar-logo">
        <Sparkles className="logo-icon" size={22} />
        {!collapsed && (
          <div className="brand-text">
            <h3>CartEngine</h3>
            <span className="logo-subtext">Targeted Discount System</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {menuItems.map(({ id, label, desc, icon: Icon }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={`nav-item ${isActive ? "active" : ""} ${collapsed ? "nav-collapsed" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="nav-icon" size={18} />
              {!collapsed && (
                <div className="nav-label-group">
                  <span className="nav-label">{label}</span>
                  <span className="nav-desc">{desc}</span>
                </div>
              )}
              {isActive && !collapsed && <div className="active-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Footer: live status + toggle */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="status-card">
            <div className="status-row">
              {status.online ? <Wifi size={11} className="wifi-on" /> : <WifiOff size={11} className="wifi-off" />}
              <span className={`status-label ${status.online ? "label-on" : "label-off"}`}>
                {!status.checked ? "Connecting..." : status.online ? (status.trained ? "Model Ready" : "Backend Online") : "Backend Offline"}
              </span>
              {status.checked && <span className={`dot ${status.online ? "dot-green" : "dot-red"}`} />}
            </div>
            {status.online && status.accuracy && (
              <div className="acc-row">Accuracy: <strong>{status.accuracy}%</strong></div>
            )}
          </div>
        )}

        {collapsed && status.checked && (
          <div className="dot-mini-wrap" title={status.online ? `Model Ready · ${status.accuracy ?? "?"}% acc` : "Backend Offline"}>
            <span className={`dot-mini ${status.online ? "dot-green" : "dot-red"}`} />
          </div>
        )}

        <button className="collapse-btn" onClick={handleToggle} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Collapse</span></>}
        </button>
      </div>

      <style>{`
        .sidebar {
          background: rgba(8, 11, 22, 0.95);
          backdrop-filter: blur(12px);
          border-right: 1px solid var(--border-color);
          height: 100vh;
          position: fixed;
          top: 0; left: 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width 0.26s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .sidebar-logo {
          padding: 1.5rem 1rem 1.3rem;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          border-bottom: 1px solid var(--border-color);
          min-height: 68px;
          overflow: hidden;
          white-space: nowrap;
        }
        .sidebar-collapsed .sidebar-logo { justify-content: center; padding: 1.5rem 0 1.3rem; }

        .logo-icon { color: var(--primary); filter: drop-shadow(0 0 8px var(--primary-glow)); flex-shrink: 0; }

        .brand-text h3 {
          font-size: 1.05rem; font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .logo-subtext { font-size: 0.67rem; color: var(--text-secondary); }

        .sidebar-nav {
          padding: 1rem 0.7rem;
          display: flex; flex-direction: column; gap: 0.3rem;
          flex-grow: 1; overflow: hidden;
        }
        .sidebar-collapsed .sidebar-nav { padding: 1rem 0.35rem; align-items: center; }

        .nav-item {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          display: flex; align-items: center; gap: 0.7rem;
          padding: 0.65rem 0.85rem;
          text-align: left; width: 100%;
          border-radius: 10px; position: relative;
          transition: all 0.2s ease;
          white-space: nowrap; overflow: hidden; cursor: pointer;
        }
        .nav-collapsed { justify-content: center; padding: 0.7rem; width: 44px; }
        .nav-item:hover { color: var(--text-primary); background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.05); }
        .nav-collapsed:hover .nav-icon { transform: scale(1.22); filter: drop-shadow(0 0 6px var(--primary)); color: var(--primary); }
        .nav-item.active { color: var(--primary); background: rgba(0,242,254,0.05); border-color: rgba(0,242,254,0.15); }
        .nav-icon { transition: all 0.2s ease; flex-shrink: 0; }
        .nav-item.active .nav-icon { color: var(--primary); filter: drop-shadow(0 0 5px var(--primary-glow)); }

        .nav-label-group { display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
        .nav-label { font-size: 0.87rem; font-weight: 500; }
        .nav-desc { font-size: 0.67rem; color: var(--text-muted); }

        .active-indicator {
          position: absolute; right: 0; top: 22%; height: 56%; width: 3px;
          background: var(--primary); border-radius: 4px 0 0 4px;
          box-shadow: 0 0 8px var(--primary);
        }

        .sidebar-footer {
          padding: 0.7rem; border-top: 1px solid var(--border-color);
          display: flex; flex-direction: column; gap: 0.45rem;
        }
        .sidebar-collapsed .sidebar-footer { align-items: center; padding: 0.7rem 0.35rem; }

        .status-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px; padding: 0.45rem 0.65rem;
          display: flex; flex-direction: column; gap: 3px;
        }
        .status-row { display: flex; align-items: center; gap: 5px; }
        .wifi-on { color: var(--success); } .wifi-off { color: var(--danger); }
        .status-label { font-size: 0.71rem; font-weight: 600; flex: 1; }
        .label-on { color: var(--success); } .label-off { color: var(--danger); }
        .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .dot-green { background: var(--success); box-shadow: 0 0 6px var(--success); animation: pDot 2s infinite; }
        .dot-red { background: var(--danger); box-shadow: 0 0 6px var(--danger); }
        @keyframes pDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(1.35)} }
        .acc-row { font-size: 0.67rem; color: var(--text-secondary); padding-left: 16px; }
        .acc-row strong { color: var(--primary); }

        .dot-mini-wrap { display: flex; justify-content: center; cursor: help; }
        .dot-mini { width: 8px; height: 8px; border-radius: 50%; }

        .collapse-btn {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          border-radius: 8px; padding: 0.4rem 0.65rem;
          display: flex; align-items: center; gap: 0.45rem;
          font-size: 0.73rem; width: 100%; cursor: pointer;
          transition: all 0.2s ease; justify-content: center;
          font-family: inherit;
        }
        .sidebar-collapsed .collapse-btn { width: 36px; padding: 0.4rem; }
        .collapse-btn:hover { color: var(--primary); border-color: rgba(0,242,254,0.2); background: rgba(0,242,254,0.04); }
      `}</style>
    </aside>
  );
};

export default Sidebar;
