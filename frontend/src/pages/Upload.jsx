import React, { useState } from 'react';
import { UploadCloud, Sparkles, Trash2, LayoutDashboard, BarChart3, ShieldAlert, Percent, Database, ArrowRight } from 'lucide-react';
import { API_URL } from '../config';

const Upload = ({ setActivePage, backendStatus, setBackendStatus }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);

  const trained = backendStatus.trained;

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        await uploadFile(file);
      } else {
        setError("Only CSV files are allowed.");
      }
    }
  };

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    setLoading(true);
    setError(null);
    setLoadingMessage("Uploading CSV file and training machine learning model...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        // Fetch new status to update the UI
        const statusRes = await fetch(`${API_URL}/api/status`);
        const statusData = await statusRes.json();
        const acc = statusData.metrics?.accuracy != null ? (statusData.metrics.accuracy * 100).toFixed(1) : null;
        setBackendStatus({ checked: true, trained: true, accuracy: acc });
        setActivePage("optimizer"); // Redirect to the Inference Console (Discount Optimizer)
      } else {
        setError(data.detail || "Failed to train the model on the uploaded CSV.");
      }
    } catch (err) {
      setError("Connection error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoading(true);
    setError(null);
    setLoadingMessage("Loading pre-included Ecommerce dataset and training ML pipeline...");
    try {
      const response = await fetch(`${API_URL}/api/load-sample`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        const statusRes = await fetch(`${API_URL}/api/status`);
        const statusData = await statusRes.json();
        const acc = statusData.metrics?.accuracy != null ? (statusData.metrics.accuracy * 100).toFixed(1) : null;
        setBackendStatus({ checked: true, trained: true, accuracy: acc });
        setActivePage("optimizer");
      } else {
        setError(data.detail || "Failed to train the model on the demo dataset.");
      }
    } catch (err) {
      setError("Connection error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!window.confirm("Are you sure you want to reset this dataset session? This will delete the trained model and evaluations.")) {
      return;
    }
    setLoading(true);
    setLoadingMessage("Resetting active dataset session...");
    try {
      const response = await fetch(`${API_URL}/api/reset-session`, {
        method: "POST",
      });
      if (response.ok) {
        setBackendStatus({ checked: true, trained: false, accuracy: null });
      } else {
        const data = await response.json();
        alert("Error resetting session: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Reset failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChatOpen = () => {
    const chatFab = document.querySelector('.chat-fab');
    if (chatFab) {
      chatFab.click();
    }
  };

  if (loading) {
    return (
      <div className="upload-loading-overlay flex flex-col justify-center items-center gap-4">
        <div className="thinking-dots"><span></span><span></span><span></span></div>
        <p className="loading-txt">{loadingMessage}</p>
        <p className="loading-sub">This may take up to a minute depending on dataset size.</p>
        <style>{`
          .upload-loading-overlay {
            min-height: 450px;
            text-align: center;
          }
          .loading-txt {
            font-size: 1.1rem;
            color: #fff;
            font-weight: 500;
          }
          .loading-sub {
            font-size: 0.8rem;
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="page-header">
        <h1>{trained ? "Active Dataset Session Hub" : "Dataset Session Hub"}</h1>
        <p className="page-subtitle">
          {trained 
            ? "Your predictive model is ready. Direct navigation buttons and reset session actions below." 
            : "Upload customer behavior log CSV data to train a targeted discount prediction model."
          }
        </p>
      </div>

      {error && (
        <div className="glass-card error-alert">
          <p>{error}</p>
        </div>
      )}

      {!trained ? (
        /* Untrained view: CSV Upload / Drag-and-Drop + Demo Loader */
        <div className="upload-view flex flex-col gap-6">
          <div 
            className={`dropzone glass-card ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <UploadCloud size={48} className="upload-icon" />
            <h3>Drag & Drop Customer Dataset CSV</h3>
            <p>or click below to browse files from your computer</p>
            <label className="btn-primary select-btn">
              Browse Files
              <input type="file" accept=".csv" onChange={handleFileInput} style={{ display: 'none' }} />
            </label>
            <span className="file-hint">Required schema: Columns representing unit_price, quantity, pages_viewed, rating, and cart_abandoned.</span>
          </div>

          <div className="flex justify-center items-center gap-4 py-2">
            <span className="divider-line"></span>
            <span className="divider-txt">OR</span>
            <span className="divider-line"></span>
          </div>

          <div className="demo-box glass-card flex flex-col items-center gap-4 text-center">
            <div className="icon-wrap">
              <Database size={24} />
            </div>
            <div>
              <h4>Test Drive with Demo Dataset</h4>
              <p>No CSV file? Click below to immediately load our 25,000-record e-commerce checkout logs dataset.</p>
            </div>
            <button className="btn-secondary" onClick={handleLoadDemo}>
              Load Demo Dataset
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Trained view: Reset session + Exact named shortcut buttons grid */
        <div className="active-session-view flex flex-col items-center gap-8 mt-4">
          <div className="reset-section flex flex-col items-center gap-3 text-center">
            <button className="btn-danger reset-btn flex items-center gap-2" onClick={handleResetSession}>
              <Trash2 size={16} />
              Reset Session & Upload New CSV
            </button>
            <p className="reset-hint">Resets all memory variables, deletes trained classifiers, and returns to dropzone.</p>
          </div>

          <div className="shortcut-grid-title flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h5>Core Navigation Directories</h5>
          </div>

          <div className="grid grid-cols-2 gap-6 w-full max-w-4w">
            {/* Analytics Dashboard */}
            <div className="glass-card shortcut-card flex flex-col gap-3">
              <div className="card-top">
                <LayoutDashboard size={20} className="shortcut-icon icon-dash" />
                <h4>Analytics Dashboard</h4>
              </div>
              <p>Explore visual charts, device metrics, category breakdowns, and revenue timeline trends.</p>
              <button className="btn-arrow" onClick={() => setActivePage("dashboard")}>
                Go to Analytics Dashboard <ArrowRight size={13} />
              </button>
            </div>

            {/* EDA Analytics */}
            <div className="glass-card shortcut-card flex flex-col gap-3">
              <div className="card-top">
                <BarChart3 size={20} className="shortcut-icon icon-eda" />
                <h4>EDA Analytics</h4>
              </div>
              <p>Inspect detailed exploratory correlation heatmaps, class distributions, and boxplots.</p>
              <button className="btn-arrow" onClick={() => setActivePage("eda")}>
                Go to EDA Analytics <ArrowRight size={13} />
              </button>
            </div>

            {/* Model Performance */}
            <div className="glass-card shortcut-card flex flex-col gap-3">
              <div className="card-top">
                <ShieldAlert size={20} className="shortcut-icon icon-perf" />
                <h4>Model Performance</h4>
              </div>
              <p>View trained XGBoost metrics, confusion matrix heatmaps, and feature importances.</p>
              <button className="btn-arrow" onClick={() => setActivePage("performance")}>
                Go to Model Performance <ArrowRight size={13} />
              </button>
            </div>

            {/* Discount Optimizer */}
            <div className="glass-card shortcut-card flex flex-col gap-3">
              <div className="card-top">
                <Percent size={20} className="shortcut-icon icon-opt" />
                <h4>Discount Optimizer</h4>
              </div>
              <p>Input customer attributes to simulate real-time predictions and calculate optimal discounts.</p>
              <button className="btn-arrow" onClick={() => setActivePage("optimizer")}>
                Go to Discount Optimizer <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* AI Copilot shortcut banner (centered full-width) */}
          <div className="glass-card shortcut-card copilot-banner w-full max-w-4w flex justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="copilot-icon-wrap">
                <Sparkles size={22} />
              </div>
              <div className="banner-txt">
                <h4>AI Copilot</h4>
                <p>Open the AI Chat Assistant to ask questions and generate recovery copy.</p>
              </div>
            </div>
            <button className="btn-secondary" onClick={handleChatOpen}>
              Open Chat Copilot
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* Error alert */
        .error-alert {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: var(--danger);
          padding: 1rem;
          border-radius: 10px;
          font-size: 0.9rem;
        }

        /* Dropzone design */
        .dropzone {
          padding: 3rem 2rem;
          border: 2px dashed var(--border-color);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: center;
        }
        .dropzone:hover, .dropzone.drag-active {
          border-color: var(--primary);
          background: rgba(0, 242, 254, 0.03);
        }
        .upload-icon {
          color: var(--text-secondary);
        }
        .dropzone:hover .upload-icon {
          color: var(--primary);
          transform: translateY(-2px);
        }
        .select-btn {
          cursor: pointer;
          padding: 0.55rem 1.4rem;
          border-radius: 10px;
          margin-top: 0.5rem;
        }
        .file-hint {
          font-size: 0.72rem;
          color: var(--text-muted);
          max-width: 450px;
          line-height: 1.4;
        }

        /* Divider */
        .divider-line {
          height: 1px;
          background: var(--border-color);
          flex: 1;
        }
        .divider-txt {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* Demo box */
        .demo-box {
          padding: 1.8rem;
          border-radius: 16px;
          background: rgba(255,255,255,0.015);
        }
        .demo-box h4 {
          color: #fff;
          font-weight: 600;
          margin-bottom: 0.35rem;
        }
        .demo-box p {
          font-size: 0.83rem;
          color: var(--text-secondary);
          max-width: 450px;
          line-height: 1.5;
        }
        .icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 242, 254, 0.08);
          border: 1px solid rgba(0, 242, 254, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        /* Reset Section */
        .btn-danger {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          font-family: inherit;
          padding: 0.65rem 1.6rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-danger:hover {
          background: #ef4444;
          color: #fff;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
        }
        .reset-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Shortcuts */
        .max-w-4w {
          max-width: 800px;
        }
        .shortcut-grid-title h5 {
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .shortcut-card {
          padding: 1.4rem;
          border-radius: 16px;
          background: rgba(255,255,255,0.015);
          transition: all 0.25s ease;
        }
        .shortcut-card:hover {
          background: rgba(255, 255, 255, 0.025);
          transform: translateY(-2px);
        }
        .card-top {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 0.5rem;
        }
        .shortcut-icon {
          flex-shrink: 0;
        }
        .icon-dash { color: #00f2fe; }
        .icon-eda { color: #bd00ff; }
        .icon-perf { color: #f59e0b; }
        .icon-opt { color: #10b981; }

        .shortcut-card h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .shortcut-card p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 0.6rem;
          flex: 1;
        }
        .btn-arrow {
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 0.82rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          cursor: pointer;
          width: fit-content;
          padding: 0;
          transition: all 0.2s ease;
        }
        .btn-arrow:hover {
          color: var(--primary-hover);
          gap: 0.55rem;
        }

        /* Copilot Banner */
        .copilot-banner {
          flex-direction: row;
          padding: 1.2rem 1.6rem;
        }
        .copilot-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(167, 139, 250, 0.08);
          border: 1px solid rgba(167, 139, 250, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a78bfa;
          flex-shrink: 0;
        }
        .banner-txt h4 {
          margin: 0;
        }
        .banner-txt p {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default Upload;
