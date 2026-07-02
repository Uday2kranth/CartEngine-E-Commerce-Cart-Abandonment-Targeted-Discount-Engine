import React, { useState, useEffect } from 'react';
import { AlertTriangle, Cpu, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../config';

const ModelPerformance = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/model-performance`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load model performance.');
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-state flex flex-col justify-center items-center gap-4">
        <div className="thinking-dots"><span></span><span></span><span></span></div>
        <p>Loading model statistics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="glass-card error-card flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={48} className="error-icon" />
        <h3>Performance Data Unavailable</h3>
        <p className="error-msg">{error || 'Please run training first.'}</p>
      </div>
    );
  }

  // Format feature importance (take top 10 for clean look)
  const importanceData = metrics.feature_importance.slice(0, 10).map((item) => ({
    name: item.feature.replace('_', ' '),
    importance: Math.round(item.importance * 1000) / 10,
  })).reverse(); // Reverse so highest is at the top of the horizontal chart

  const { tn, fp, fn, tp } = metrics.confusion_matrix;
  const totalCm = tn + fp + fn + tp;

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="page-header">
        <h1>Model Performance</h1>
        <p className="page-subtitle">XGBoost Classifier evaluation metrics and feature importance logs.</p>
      </div>

      {/* Model accuracy cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card metric-pill">
          <span className="pill-title">Accuracy</span>
          <div className="pill-value">{(metrics.accuracy * 100).toFixed(2)}%</div>
          <span className="pill-subtext">Overall correct predictions</span>
        </div>
        <div className="glass-card metric-pill">
          <span className="pill-title">Precision</span>
          <div className="pill-value">{(metrics.precision * 100).toFixed(2)}%</div>
          <span className="pill-subtext">Precision on cart abandoned class</span>
        </div>
        <div className="glass-card metric-pill">
          <span className="pill-title">Recall</span>
          <div className="pill-value">{(metrics.recall * 100).toFixed(2)}%</div>
          <span className="pill-subtext">Percentage of abandoners captured</span>
        </div>
        <div className="glass-card metric-pill">
          <span className="pill-title">F1-Score</span>
          <div className="pill-value">{(metrics.f1_score * 100).toFixed(2)}%</div>
          <span className="pill-subtext">Balanced precision-recall mean</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* Confusion Matrix */}
        <div className="glass-card flex flex-col gap-4">
          <div className="chart-header">
            <h4>Confusion Matrix</h4>
            <span className="chart-subtitle">Actual vs Predicted values split</span>
          </div>
          
          <div className="cm-grid">
            <div className="cm-axis-label empty"></div>
            <div className="cm-axis-label header">Predicted Active</div>
            <div className="cm-axis-label header">Predicted Abandon</div>
            
            <div className="cm-axis-label header side">Actual Active</div>
            <div className="cm-cell tn">
              <span className="cell-num">{tn}</span>
              <span className="cell-label">True Negative</span>
              <span className="cell-pct">{((tn/totalCm)*100).toFixed(1)}%</span>
            </div>
            <div className="cm-cell fp">
              <span className="cell-num">{fp}</span>
              <span className="cell-label">False Positive</span>
              <span className="cell-pct">{((fp/totalCm)*100).toFixed(1)}%</span>
            </div>
            
            <div className="cm-axis-label header side">Actual Abandon</div>
            <div className="cm-cell fn">
              <span className="cell-num">{fn}</span>
              <span className="cell-label">False Negative</span>
              <span className="cell-pct">{((fn/totalCm)*100).toFixed(1)}%</span>
            </div>
            <div className="cm-cell tp">
              <span className="cell-num">{tp}</span>
              <span className="cell-label">True Positive</span>
              <span className="cell-pct">{((tp/totalCm)*100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Feature Importance */}
        <div className="glass-card flex flex-col gap-4">
          <div className="chart-header">
            <h4>Top 10 Feature Importances</h4>
            <span className="chart-subtitle">Features that dominate the XGBoost decisions</span>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart
                data={importanceData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" stroke="var(--text-secondary)" fontSize={11} unit="%" />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={11} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Bar dataKey="importance" name="Weight" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style>{`
        .metric-pill {
          padding: 1.2rem 1.5rem;
          border-left: 3px solid var(--primary);
        }

        .metric-pill:nth-child(2) { border-left-color: var(--secondary); }
        .metric-pill:nth-child(3) { border-left-color: var(--warning); }
        .metric-pill:nth-child(4) { border-left-color: var(--success); }

        .pill-title {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pill-value {
          font-size: 1.8rem;
          font-weight: 700;
          margin: 0.4rem 0;
          color: #fff;
        }

        .pill-subtext {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        /* Confusion Matrix CSS */
        .cm-grid {
          display: grid;
          grid-template-columns: 80px 1fr 1fr;
          grid-template-rows: 40px 120px 120px;
          gap: 6px;
          margin-top: 1rem;
        }

        .cm-axis-label {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-align: center;
          font-weight: 500;
        }

        .cm-axis-label.header {
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }

        .cm-axis-label.side {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          border-right: 1px solid var(--border-color);
          padding-left: 6px;
        }

        .cm-cell {
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.03);
        }

        .cm-cell.tn, .cm-cell.tp {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.2);
        }
        
        .cm-cell.fp, .cm-cell.fn {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.15);
        }

        .cell-num {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }

        .cell-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0.2rem 0;
        }

        .cell-pct {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default ModelPerformance;
