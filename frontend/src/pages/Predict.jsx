import React, { useState } from 'react';
import { Sliders, RefreshCw, AlertTriangle } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../config';

const Predict = () => {
  // Input fields state
  const [inputs, setInputs] = useState({
    device_type: 1,
    user_type: 1,
    marketing_channel: 2,
    product_category: 3,
    unit_price: 650,
    quantity: 1,
    pages_viewed: 8,
    time_on_site_sec: 420,
    visit_day: 15,
    visit_month: 6,
    visit_weekday: 2,
    visit_season: 1,
    location: 104,
    rating: 4,
    payment_method: 1,
  });

  const [optimResult, setOptimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/optimize-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to optimize discounts.');
      }
      setOptimResult(data);
      localStorage.setItem('active_simulator_inputs', JSON.stringify(inputs));
      localStorage.setItem('active_simulator_result', JSON.stringify(data));
    } catch (err) {
      console.error('Error optimizing discount:', err);
      setError(err.message);
      setOptimResult(null);
    } finally {
      setLoading(false);
    }
  };



  // Format matrix data for chart
  const chartData = optimResult
    ? (optimResult?.discount_matrix ?? []).map((row) => ({
        discount: `${row?.discount_percent ?? 0}%`,
        expected_revenue: Math.round((row?.expected_revenue ?? 0) * 100) / 100,
        purchase_probability: Math.round((row?.purchase_probability ?? 0) * 1000) / 10,
      }))
    : [];

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="page-header">
        <h1>Targeted Discount Engine</h1>
        <p className="page-subtitle">Simulate real-time cart sessions and calculate profit-maximizing targeted discounts.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        {/* Left Column - Input Form */}
        <div className="glass-card flex flex-col gap-4">
          <div className="form-header flex items-center gap-2">
            <Sliders size={18} className="form-icon" />
            <h4>Session Parameter Simulator</h4>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Product Category (0-7)</label>
              <select value={inputs.product_category} onChange={(e) => handleInputChange('product_category', e.target.value)}>
                {[...Array(8).keys()].map(i => (
                  <option key={i} value={i}>Category {i}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Device Type</label>
              <select value={inputs.device_type} onChange={(e) => handleInputChange('device_type', e.target.value)}>
                <option value={0}>Desktop</option>
                <option value={1}>Mobile</option>
                <option value={2}>Tablet</option>
              </select>
            </div>

            <div className="form-group">
              <label>Marketing Channel</label>
              <select value={inputs.marketing_channel} onChange={(e) => handleInputChange('marketing_channel', e.target.value)}>
                <option value={0}>Direct</option>
                <option value={1}>SEO (Organic)</option>
                <option value={2}>PPC (Paid)</option>
                <option value={3}>Social Media</option>
                <option value={4}>Email Marketing</option>
                <option value={5}>Affiliates</option>
              </select>
            </div>

            <div className="form-group">
              <label>User Type</label>
              <select value={inputs.user_type} onChange={(e) => handleInputChange('user_type', e.target.value)}>
                <option value={0}>New Customer</option>
                <option value={1}>Returning Customer</option>
              </select>
            </div>

            <div className="form-group slider-group full-width">
              <div className="flex justify-between">
                <label>Unit Price ($)</label>
                <span className="slider-value">${inputs.unit_price}</span>
              </div>
              <input type="range" min="10" max="2000" step="10" value={inputs.unit_price} onChange={(e) => handleInputChange('unit_price', e.target.value)} />
            </div>

            <div className="form-group slider-group">
              <div className="flex justify-between">
                <label>Quantity</label>
                <span className="slider-value">{inputs.quantity}</span>
              </div>
              <input type="range" min="1" max="10" step="1" value={inputs.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} />
            </div>

            <div className="form-group slider-group">
              <div className="flex justify-between">
                <label>Pages Viewed</label>
                <span className="slider-value">{inputs.pages_viewed}</span>
              </div>
              <input type="range" min="1" max="30" step="1" value={inputs.pages_viewed} onChange={(e) => handleInputChange('pages_viewed', e.target.value)} />
            </div>

            <div className="form-group slider-group">
              <div className="flex justify-between">
                <label>Time on Site (sec)</label>
                <span className="slider-value">{inputs.time_on_site_sec}s</span>
              </div>
              <input type="range" min="10" max="2000" step="10" value={inputs.time_on_site_sec} onChange={(e) => handleInputChange('time_on_site_sec', e.target.value)} />
            </div>

            <div className="form-group slider-group">
              <div className="flex justify-between">
                <label>Location Code (0-250)</label>
                <span className="slider-value">#{inputs.location}</span>
              </div>
              <input type="range" min="0" max="250" step="1" value={inputs.location} onChange={(e) => handleInputChange('location', e.target.value)} />
            </div>
            
            <div className="form-group">
              <label>Month of Visit</label>
              <select value={inputs.visit_month} onChange={(e) => handleInputChange('visit_month', e.target.value)}>
                {[...Array(12).keys()].map(i => (
                  <option key={i+1} value={i+1}>Month {i+1}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Weekday Index</label>
              <select value={inputs.visit_weekday} onChange={(e) => handleInputChange('visit_weekday', e.target.value)}>
                <option value={0}>Monday</option>
                <option value={1}>Tuesday</option>
                <option value={2}>Wednesday</option>
                <option value={3}>Thursday</option>
                <option value={4}>Friday</option>
                <option value={5}>Saturday</option>
                <option value={6}>Sunday</option>
              </select>
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select value={inputs.payment_method} onChange={(e) => handleInputChange('payment_method', e.target.value)}>
                <option value={0}>Credit Card</option>
                <option value={1}>Debit Card</option>
                <option value={2}>PayPal</option>
                <option value={3}>Digital Wallet</option>
                <option value={4}>Cash on Delivery</option>
                <option value={5}>Gift Card</option>
              </select>
            </div>

            <div className="form-group">
              <label>Product Rating (1-5)</label>
              <select value={inputs.rating} onChange={(e) => handleInputChange('rating', e.target.value)}>
                <option value={1}>1 Star</option>
                <option value={2}>2 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={5}>5 Stars</option>
              </select>
            </div>
          </div>

          <button className="btn-primary flex items-center justify-center gap-2 mt-2" onClick={handleOptimize} disabled={loading}>
            {loading ? <RefreshCw className="spinner" size={18} /> : null}
            Optimize Discounts
          </button>
        </div>

        {/* Right Column - Results */}
        <div className="flex flex-col gap-4">
          {error && (
            <div className="glass-card error-card flex flex-col items-center justify-center gap-4 text-center p-8">
              <AlertTriangle size={48} className="error-icon" />
              <h3>Optimization Error</h3>
              <p className="error-msg">{error}</p>
            </div>
          )}

          {!error && !optimResult ? (
            <div className="glass-card placeholder-card flex flex-col items-center justify-center text-center p-8">
              <Sliders size={32} className="placeholder-icon" />
              <h5>Awaiting Session Details</h5>
              <p>Modify session inputs in the left panel and click "Optimize Discounts" to evaluate purchase probabilities and optimize targeting.</p>
            </div>
          ) : null}

          {!error && optimResult ? (
            <>
              {/* Optimization KPI Lift */}
              <div className="glass-card flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4>Discount Recommendation</h4>
                  <span className="cart-badge">${optimResult?.cart_value?.toFixed(2) ?? '0.00'} Cart Value</span>
                </div>
                
                <div className="risk-meter-wrapper">
                  <div className="flex justify-between font-semibold text-sm mb-1">
                    <span>Baseline Abandonment Probability:</span>
                    <span className="risk-value">{((optimResult?.discount_matrix?.[0]?.abandonment_probability ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="risk-bar-bg">
                    <div 
                      className="risk-bar" 
                      style={{ 
                        width: `${(optimResult?.discount_matrix?.[0]?.abandonment_probability ?? 0) * 100}%`,
                        background: (optimResult?.discount_matrix?.[0]?.abandonment_probability ?? 0) > 0.6 ? 'var(--danger)' : 'var(--success)'
                      }} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="lift-kpi">
                    <span className="lift-title">Best Discount</span>
                    <div className="lift-value accent">{optimResult?.optimal_discount ?? 0}%</div>
                  </div>
                  <div className="lift-kpi">
                    <span className="lift-title">Expected Revenue</span>
                    <div className="lift-value">${optimResult?.max_expected_revenue?.toFixed(2) ?? '0.00'}</div>
                  </div>
                  <div className="lift-kpi">
                    <span className="lift-title">Net Rev Lift</span>
                    <div className="lift-value success">+${optimResult?.revenue_lift?.toFixed(2) ?? '0.00'}</div>
                  </div>
                </div>
              </div>

              {/* Optimization Curve Chart */}
              <div className="glass-card flex flex-col gap-4">
                <div className="chart-header">
                  <h4>Expected Revenue Curve</h4>
                  <span className="chart-subtitle">Expected revenue (bars) and purchase probability (line) at each discount step</span>
                </div>
                <div style={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
                      <XAxis dataKey="discount" stroke="var(--text-secondary)" fontSize={10} />
                      <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={10} prefix="$" />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={10} unit="%" />
                      <Tooltip
                        contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar yAxisId="left" dataKey="expected_revenue" name="Expected Revenue ($)" fill="rgba(0, 242, 254, 0.15)" stroke="var(--primary)" strokeWidth={1} radius={[2, 2, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="purchase_probability" name="Purchase Probability (%)" stroke="var(--secondary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--secondary)' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Optimization Table */}
              <div className="glass-card p-0 overflow-hidden">
                <div className="table-header p-4">
                  <h4>Targeted Discount Optimization Matrix</h4>
                </div>
                <div className="predict-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Discount</th>
                        <th>Conversion</th>
                        <th>Net Price</th>
                        <th>Expected Revenue</th>
                        <th>Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(optimResult?.discount_matrix ?? []).map((row) => {
                        const isOptimal = row?.discount_percent === optimResult?.optimal_discount;
                        return (
                          <tr key={row.discount_percent} className={isOptimal ? 'optimal-row' : ''}>
                            <td>{row?.discount_percent ?? 0}%</td>
                            <td>{((row?.purchase_probability ?? 0) * 100).toFixed(1)}%</td>
                            <td>${row?.net_price?.toFixed(2) ?? '0.00'}</td>
                            <td>${row?.expected_revenue?.toFixed(2) ?? '0.00'}</td>
                            <td>
                              {isOptimal ? (
                                <span className="optimal-badge">Optimal</span>
                              ) : (
                                <span className="empty-badge">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          ) : null}
        </div>
      </div>

      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.2rem 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .slider-value {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--primary);
        }

        .form-icon {
          color: var(--primary);
        }

        /* Results panel styles */
        .placeholder-card {
          border-style: dashed;
          border-color: rgba(255, 255, 255, 0.15);
          height: 100%;
          min-height: 380px;
        }

        .placeholder-icon {
          color: var(--text-muted);
          margin-bottom: 1rem;
        }

        .placeholder-card h5 {
          font-size: 1rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .placeholder-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          max-width: 320px;
        }

        .cart-badge {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-color);
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .risk-bar-bg {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 0.25rem;
        }

        .risk-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }

        .risk-value {
          color: #fff;
        }

        .lift-kpi {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.6rem;
          text-align: center;
        }

        .lift-title {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .lift-value {
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
          margin-top: 0.2rem;
        }

        .lift-value.accent {
          color: var(--primary);
        }

        .lift-value.success {
          color: var(--success);
        }

        /* Predict optimization matrix table */
        .predict-table-wrapper {
          width: 100%;
        }

        .predict-table-wrapper table {
          font-size: 0.85rem;
        }

        .predict-table-wrapper tr.optimal-row {
          background: rgba(0, 242, 254, 0.04) !important;
        }
        
        .predict-table-wrapper tr.optimal-row td {
          border-bottom-color: rgba(0, 242, 254, 0.2);
          font-weight: 600;
        }

        .optimal-badge {
          background: rgba(16, 185, 129, 0.15);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .empty-badge {
          color: var(--text-muted);
        }

        /* Email layout styles */
        .personal-sparkle {
          color: var(--primary);
        }

        .email-result-wrapper {
          position: relative;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          max-height: 240px;
          overflow-y: auto;
        }

        .copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.03);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-btn:hover {
          color: var(--primary);
          background: rgba(255,255,255,0.08);
        }
        
        .copy-btn svg.copied {
          color: var(--success);
        }

        .email-output {
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .error-card {
          border-color: rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.02);
          min-height: 380px;
        }

        .error-icon {
          color: var(--danger);
          filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.2));
        }

        .error-msg {
          color: var(--text-secondary);
          max-width: 320px;
          font-size: 0.85rem;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Predict;
