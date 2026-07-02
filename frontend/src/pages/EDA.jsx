import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { API_URL } from '../config';

const EDA = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plots, setPlots] = useState(null);
  const [loadingPlots, setLoadingPlots] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/stats`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load stats.');
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    fetch(`${API_URL}/api/eda-plots`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plots.');
        return res.json();
      })
      .then((data) => {
        setPlots(data);
        setLoadingPlots(false);
      })
      .catch((err) => {
        console.error("Plots error:", err);
        setLoadingPlots(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-state flex flex-col justify-center items-center gap-4">
        <div className="thinking-dots"><span></span><span></span><span></span></div>
        <p>Loading Exploratory Data Analysis...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="glass-card error-card flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={48} className="error-icon" />
        <h3>Data Analysis Unavailable</h3>
        <p className="error-msg">{error || 'Please run training first.'}</p>
      </div>
    );
  }

  // Format marketing channels
  const channelLabels = {
    '0': 'Direct',
    '1': 'SEO (Organic)',
    '2': 'PPC (Paid)',
    '3': 'Social Media',
    '4': 'Email Marketing',
    '5': 'Affiliates'
  };

  const channelData = Object.entries(stats.channel_abandonment).map(([ch, rate]) => ({
    channel: channelLabels[ch] || `Channel ${ch}`,
    rate: Math.round(rate * 1000) / 10,
  }));

  // Format discount conversion line chart
  const discountData = Object.entries(stats.discount_conversion)
    .map(([disc, rate]) => ({
      discount: `${disc}%`,
      conversion: Math.round(rate * 1000) / 10,
    }))
    .sort((a, b) => parseInt(a.discount) - parseInt(b.discount));

  // Format Page Views Correlation Data (take pages_viewed 1 to 25 for cleaner chart)
  const pvCorrelationData = (stats.page_views_correlation || [])
    .filter(item => item.pages_viewed <= 25)
    .map(item => ({
      pages_viewed: item.pages_viewed,
      abandonment_rate: Math.round(item.cart_abandoned_rate * 1000) / 10,
      time_on_site: Math.round(item.time_on_site_sec)
    }))
    .sort((a, b) => a.pages_viewed - b.pages_viewed);

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="page-header">
        <h1>Exploratory Data Analysis</h1>
        <p className="page-subtitle">Deep dive into acquisition channels, page clicks, and discount conversion behaviors.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Marketing Channels */}
        <div className="glass-card chart-card flex flex-col gap-4">
          <div className="chart-header">
            <h4>Abandonment Rate by Marketing Channel</h4>
            <span className="chart-subtitle">Direct, Paid Ads, Social Media, and Email comparison</span>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={channelData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="channel" stroke="var(--text-secondary)" fontSize={11} angle={-15} textAnchor="end" height={45} />
                <YAxis stroke="var(--text-secondary)" unit="%" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Bar dataKey="rate" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Discount Impact Curve */}
        <div className="glass-card chart-card flex flex-col gap-4">
          <div className="chart-header">
            <h4>Discount Conversion Curve</h4>
            <span className="chart-subtitle">Purchase conversion rate mapped against offered discount levels</span>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={discountData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="discount" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" unit="%" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: 'var(--secondary)' }}
                />
                <Line
                  type="monotone"
                  dataKey="conversion"
                  name="Purchase Conversion"
                  stroke="var(--secondary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--secondary)', strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3 - Page Views and Duration Correlation Dual-Axis Chart */}
      <div className="glass-card chart-card flex flex-col gap-4">
        <div className="chart-header">
          <h4>Customer Engagement vs Abandonment Correlation</h4>
          <span className="chart-subtitle">Interaction between pages clicked, time spent, and cart abandonment rates</span>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={pvCorrelationData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="pages_viewed" label={{ value: 'Pages Viewed in Session', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)', fontSize: 11 }} stroke="var(--text-secondary)" fontSize={11} height={40} />
              <YAxis yAxisId="left" label={{ value: 'Abandonment Rate (%)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-secondary)', fontSize: 11 }} stroke="var(--text-secondary)" fontSize={11} unit="%" />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Time on Site (sec)', angle: 90, position: 'insideRight', offset: 10, fill: 'var(--text-secondary)', fontSize: 11 }} stroke="var(--text-secondary)" fontSize={11} unit="s" />
              <Tooltip
                contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar yAxisId="right" dataKey="time_on_site" name="Avg Time on Site (seconds)" fill="rgba(0, 242, 254, 0.08)" stroke="rgba(0, 242, 254, 0.3)" barSize={25} />
              <Line yAxisId="left" type="monotone" dataKey="abandonment_rate" name="Abandonment Rate (%)" stroke="var(--danger)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--danger)' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card info-card">
        <h5>Key EDA Observations</h5>
        <ul>
          <li><strong>Acquisition Channels:</strong> Paid Ads (PPC) and organic SEO demonstrate distinct cart abandonment profiles. Customizing offers for high-cost channels reduces acquisition losses.</li>
          <li><strong>Discount Sensitivity:</strong> Purchase probability grows as discount levels climb from 0% to 30%. However, margin degradation at 30% suggests 10%–15% is the sweet spot for maximizing expected revenue.</li>
          <li><strong>Engagement Indicators:</strong> Users who view more pages and stay longer on site exhibit drastically reduced abandonment rates. Conversions climb steeply once a session passes 8 pages viewed or 300 seconds.</li>
        </ul>
      </div>

      {/* Matplotlib Backend Plots Section */}
      <div className="flex flex-col items-center gap-6 mt-6 w-full">
        <h2 className="section-title text-center">Backend Evaluation & Diagnostic Plots</h2>
        <p className="section-sub text-center">Static high-fidelity visualizations generated directly in Python using Matplotlib and Seaborn.</p>
        
        {loadingPlots ? (
          <div className="thinking-dots flex items-center justify-center py-6">
            <span></span><span></span><span></span>
          </div>
        ) : plots ? (
          <div className="flex flex-col gap-8 w-full items-center">
            {/* 1. Class Balance */}
            {plots.class_balance && (
              <div className="glass-card plot-container flex flex-col gap-4">
                <div className="plot-img-wrap">
                  <img src={plots.class_balance} alt="Class Balance" />
                </div>
                <div className="clinician-explanation glass-card">
                  <h5>Data Science & Business Analysis</h5>
                  <p><strong>What this shows:</strong> The total distribution of sessions that purchased versus those that abandoned their shopping carts (target classes).</p>
                  <p><strong>Interpretation Guide:</strong> Check for class imbalance. Imbalanced datasets (e.g. 90% abandonment vs 10% purchases) require special stratifications or metrics during training to prevent the model from blindly guessing the majority class.</p>
                </div>
              </div>
            )}

            {/* 2. Boxplot Range */}
            {plots.boxplot && (
              <div className="glass-card plot-container flex flex-col gap-4">
                <div className="plot-img-wrap">
                  <img src={plots.boxplot} alt="Customer Engagement Range" />
                </div>
                <div className="clinician-explanation glass-card">
                  <h5>Data Science & Business Analysis</h5>
                  <p><strong>What this shows:</strong> The range and distribution of pages viewed by visitors, grouped by target outcome (purchased vs abandoned).</p>
                  <p><strong>Interpretation Guide:</strong> A higher median number of pages viewed for purchasing customers indicates strong shopping intent. E-commerce owners can use this to set trigger limits (e.g. nudge users who viewed more than 8 pages with targeted offers).</p>
                </div>
              </div>
            )}

            {/* 3. Correlation Heatmap */}
            {plots.correlation_heatmap && (
              <div className="glass-card plot-container flex flex-col gap-4">
                <div className="plot-img-wrap">
                  <img src={plots.correlation_heatmap} alt="Feature Correlations" />
                </div>
                <div className="clinician-explanation glass-card">
                  <h5>Data Science & Business Analysis</h5>
                  <p><strong>What this shows:</strong> A visual correlation matrix indicating relationships between numerical features like unit price, quantity, page views, and abandonment.</p>
                  <p><strong>Interpretation Guide:</strong> Dark red indicates strong positive correlation, while dark blue indicates strong negative correlation. Highly correlated features can introduce collinearity, which XGBoost handles robustly. It highlights which indicators are top candidates for predicting cart outcome.</p>
                </div>
              </div>
            )}

            {/* 4. Confusion Matrix */}
            {plots.confusion_matrix && (
              <div className="glass-card plot-container flex flex-col gap-4">
                <div className="plot-img-wrap">
                  <img src={plots.confusion_matrix} alt="Confusion Matrix" />
                </div>
                <div className="clinician-explanation glass-card">
                  <h5>Data Science & Business Analysis</h5>
                  <p><strong>What this shows:</strong> The classification accuracy of the model on the test dataset, showing true positives, false positives, true negatives, and false negatives.</p>
                  <p><strong>Interpretation Guide:</strong> The top-left to bottom-right diagonal shows correct classifications. Off-diagonal cells show error rates. A high number of False Negatives suggests the model is missing customers who abandon, allowing you to tune the decision threshold.</p>
                </div>
              </div>
            )}

            {/* 5. Probability Distributions */}
            {plots.distributions && (
              <div className="glass-card plot-container flex flex-col gap-4">
                <div className="plot-img-wrap">
                  <img src={plots.distributions} alt="Prediction Probabilities" />
                </div>
                <div className="clinician-explanation glass-card">
                  <h5>Data Science & Business Analysis</h5>
                  <p><strong>What this shows:</strong> The frequency distribution of abandonment probabilities generated by the XGBoost classifier across all sessions.</p>
                  <p><strong>Interpretation Guide:</strong> A bimodal shape (peaks near 0 and 1) indicates the model makes highly confident predictions. An even distribution or peak in the center indicates high uncertainty, suggesting the need for more descriptive user features (e.g. scroll depth or cursor speed).</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-secondary text-center">Unable to load Python diagnostic plots.</p>
        )}
      </div>

      <style>{`
        .loading-state, .error-card {
          min-height: 400px;
        }

        .chart-header h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
        }

        .chart-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .info-card h5 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 0.8rem;
        }

        .info-card ul {
          padding-left: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .info-card li strong {
          color: #fff;
        }

        .section-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
          margin-top: 2rem;
        }
        .section-sub {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }
        .plot-container {
          width: 100%;
          max-width: 720px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.2rem;
        }
        .plot-img-wrap {
          width: 100%;
          background: #fff;
          border-radius: 8px;
          padding: 0.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .plot-img-wrap img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        .clinician-explanation {
          width: 100%;
          padding: 1.2rem;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
        }
        .clinician-explanation h5 {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.6rem;
        }
        .clinician-explanation p {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default EDA;
