import React, { useState } from "react";
import { LayoutDashboard, BarChart3, ShieldAlert, Percent, Sparkles, ShoppingCart, TrendingUp, Zap, ArrowRight, CheckCircle2, Database } from "lucide-react";
import { API_URL } from "../config";

const Welcome = ({ setActivePage, setBackendStatus, backendTrained, backendAccuracy }) => {
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      const response = await fetch(`${API_URL}/api/load-sample`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        const statusRes = await fetch(`${API_URL}/api/status`);
        const statusData = await statusRes.json();
        const acc = statusData.metrics?.accuracy != null ? (statusData.metrics.accuracy * 100).toFixed(1) : null;
        setBackendStatus({ checked: true, trained: true, accuracy: acc });
        setActivePage("optimizer");
      } else {
        alert("Error: " + (data.detail || "Could not load sample dataset."));
      }
    } catch (e) {
      alert("Connection failed: " + e.message);
    } finally {
      setLoadingDemo(false);
    }
  };

  const features = [
    {
      icon: LayoutDashboard,
      title: "Analytics Dashboard",
      desc: "KPI tiles, category abandonment rates, device breakdowns, monthly revenue trends, and abandonment probability timelines — all in one view.",
      tab: "dashboard",
      color: "#00f2fe",
      badge: "Live Data"
    },
    {
      icon: BarChart3,
      title: "EDA Analytics",
      desc: "Deep-dive into marketing channel distributions, price tier breakdowns, payment method analysis, and feature-level correlation plots.",
      tab: "eda",
      color: "#bd00ff",
      badge: "Exploratory"
    },
    {
      icon: ShieldAlert,
      title: "Model Performance",
      desc: "XGBoost evaluation metrics: Accuracy, Precision, Recall, F1-Score, ROC-AUC, and a per-class classification report breakdown.",
      tab: "performance",
      color: "#f59e0b",
      badge: "ML Metrics"
    },
    {
      icon: Percent,
      title: "Discount Optimizer",
      desc: "Simulate a customer session, run the ML model, and compute the profit-maximizing targeted discount across 7 discount levels.",
      tab: "optimizer",
      color: "#10b981",
      badge: "Revenue Engine"
    },
    {
      icon: Sparkles,
      title: "AI Copilot",
      desc: "Chat with the CartEngine AI agent. Ask questions about session data, get discount recommendations, and generate personalized cart-recovery emails.",
      tab: "chatbot",
      color: "#a78bfa",
      badge: "AI Agent"
    },
  ];

  return (
    <div className="welcome-page">
      {/* Hero */}
      <div className="welcome-hero">
        <div className="hero-badge">
          <Zap size={13} />
          <span>Cart Abandonment Intelligence Platform</span>
        </div>
        <h1 className="hero-title">
          CartEngine<br />
          <span className="hero-gradient">Targeted Discount Engine</span>
        </h1>
        <p className="hero-sub">
          XGBoost-powered cart abandonment prediction with real-time discount optimization.
          Identify high-risk sessions and serve profit-maximizing incentives automatically.
        </p>

        <div className="hero-status-row">
          <div className={`model-status-pill ${backendTrained ? "pill-ready" : "pill-pending"}`}>
            {backendTrained ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
            <span>{backendTrained ? `Model Ready · ${backendAccuracy ? backendAccuracy + "% Accuracy" : ""}` : (loadingDemo ? "Training Model..." : "Dataset Session Pending")}</span>
          </div>
          {backendTrained ? (
            <>
              <button className="btn-primary hero-cta" onClick={() => setActivePage("optimizer")}>
                <Percent size={16} />
                Open Discount Optimizer
                <ArrowRight size={14} />
              </button>
              <button className="btn-secondary hero-cta" onClick={() => setActivePage("dashboard")}>
                <LayoutDashboard size={15} />
                View Dashboard
              </button>
            </>
          ) : (
            <>
              <button className="btn-primary hero-cta" onClick={handleLoadDemo} disabled={loadingDemo}>
                {loadingDemo ? (
                  <span>Loading Demo...</span>
                ) : (
                  <>
                    <Database size={16} />
                    Load Demo Dataset
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
              <button className="btn-secondary hero-cta" onClick={() => setActivePage("upload")} disabled={loadingDemo}>
                <Sparkles size={15} />
                Go to Session Hub
              </button>
            </>
          )}
        </div>
      </div>

      {/* How it works strip */}
      <div className="how-strip">
        <div className="how-step">
          <ShoppingCart size={18} className="how-icon" />
          <div><strong>1. Customer Session</strong><p>User browses, adds to cart — session captured with 15 features</p></div>
        </div>
        <div className="how-arrow">→</div>
        <div className="how-step">
          <TrendingUp size={18} className="how-icon" />
          <div><strong>2. Abandonment Prediction</strong><p>XGBoost model predicts abandonment probability in real-time</p></div>
        </div>
        <div className="how-arrow">→</div>
        <div className="how-step">
          <Percent size={18} className="how-icon" />
          <div><strong>3. Optimal Discount</strong><p>Discount engine computes the profit-maximizing offer at 0–30%</p></div>
        </div>
        <div className="how-arrow">→</div>
        <div className="how-step">
          <Sparkles size={18} className="how-icon" />
          <div><strong>4. AI Email</strong><p>Copilot generates a personalized cart-recovery email instantly</p></div>
        </div>
      </div>

      {/* Feature cards grid */}
      <div className="features-grid">
        {features.map(({ icon: Icon, title, desc, tab, color, badge }) => (
          <div key={tab} className="feature-card" style={{ "--card-accent": color }}>
            <div className="card-header">
              <div className="card-icon-wrap" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <span className="card-badge" style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}>{badge}</span>
            </div>
            <h4 className="card-title">{title}</h4>
            <p className="card-desc">{desc}</p>
            <button
              className="card-cta"
              style={{ color }}
              onClick={() => {
                if (tab === "chatbot") {
                  const fab = document.querySelector(".chat-fab");
                  if (fab) fab.click();
                } else {
                  setActivePage(tab);
                }
              }}
            >
              Open {title} <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .welcome-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding-bottom: 2rem;
        }

        /* Hero */
        .welcome-hero {
          background: linear-gradient(160deg, rgba(0,242,254,0.04) 0%, rgba(189,0,255,0.03) 60%, transparent 100%);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 2.8rem 2.5rem 2.2rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0,242,254,0.08);
          border: 1px solid rgba(0,242,254,0.2);
          border-radius: 20px;
          padding: 0.25rem 0.75rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--primary);
          width: fit-content;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .hero-title {
          font-size: 2.8rem;
          font-weight: 800;
          line-height: 1.1;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .hero-gradient {
          background: linear-gradient(135deg, #00f2fe 0%, #bd00ff 60%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          font-size: 1rem;
          color: var(--text-secondary);
          max-width: 600px;
          line-height: 1.6;
        }

        .hero-status-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 0.3rem;
        }

        .model-status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0.35rem 0.9rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid;
        }
        .pill-ready { color: var(--success); background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25); }
        .pill-pending { color: var(--text-secondary); background: rgba(255,255,255,0.03); border-color: var(--border-color); }

        .hero-cta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          padding: 0.55rem 1.2rem;
          border-radius: 10px;
        }

        .btn-secondary {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 0.55rem 1.2rem;
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.88rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.12); }

        /* How strip */
        .how-strip {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255,255,255,0.015);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 1.2rem 1.8rem;
          overflow-x: auto;
        }

        .how-step {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          min-width: 180px;
          flex: 1;
        }

        .how-icon { color: var(--primary); flex-shrink: 0; margin-top: 2px; }

        .how-step strong { font-size: 0.82rem; color: var(--text-primary); display: block; margin-bottom: 3px; }
        .how-step p { font-size: 0.72rem; color: var(--text-secondary); line-height: 1.4; margin: 0; }

        .how-arrow { color: var(--text-muted); font-size: 1.2rem; flex-shrink: 0; }

        /* Feature cards */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.2rem;
        }

        .feature-card {
          background: rgba(255,255,255,0.015);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.4rem;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }

        .feature-card:hover {
          background: rgba(255,255,255,0.025);
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }

        .feature-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--card-accent), transparent);
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .feature-card:hover::before { opacity: 1; }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.18rem 0.5rem;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .card-desc {
          font-size: 0.79rem;
          color: var(--text-secondary);
          line-height: 1.55;
          flex: 1;
        }

        .card-cta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: transparent;
          border: none;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0.3rem 0;
          font-family: inherit;
          transition: gap 0.2s ease;
        }
        .card-cta:hover { gap: 0.65rem; }
      `}</style>
    </div>
  );
};

export default Welcome;
