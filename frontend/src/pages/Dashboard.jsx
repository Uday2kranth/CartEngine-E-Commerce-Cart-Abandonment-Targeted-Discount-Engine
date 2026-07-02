import React, { useState, useEffect } from 'react';
import { ShoppingCart, Percent, DollarSign, Users, AlertTriangle } from 'lucide-react';
import StatCard from '../components/StatCard';
import { BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { API_URL } from '../config';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confusionMatrix, setConfusionMatrix] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/stats`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load stats. Train the model first.');
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
      .then((res) => res.json())
      .then((data) => {
        if (data && data.confusion_matrix) {
          setConfusionMatrix(data.confusion_matrix);
        }
      })
      .catch((err) => console.error("Error loading confusion matrix:", err));
  }, []);

  if (loading) {
    return (
      <div className="loading-state flex flex-col justify-center items-center gap-4">
        <div className="thinking-dots"><span></span><span></span><span></span></div>
        <p>Loading analytics workspace...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="glass-card error-card flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={48} className="error-icon" />
        <h3>Data Analysis Unavailable</h3>
        <p className="error-msg">{error || 'Please run main.py to train the model and generate metrics first.'}</p>
      </div>
    );
  }

  // Format category and device data
  const categoryData = Object.entries(stats.category_abandonment).map(([cat, rate]) => ({
    category: `Category ${cat}`,
    rate: Math.round(rate * 1000) / 10,
  }));

  const deviceData = Object.entries(stats.device_abandonment).map(([dev, rate]) => {
    const labels = { '0': 'Desktop', '1': 'Mobile', '2': 'Tablet' };
    return {
      device: labels[dev] || `Device ${dev}`,
      rate: Math.round(rate * 1000) / 10,
    };
  });

  // Format monthly revenue and monthly abandonment data
  const monthlyLabels = {
    '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr', '5': 'May', '6': 'Jun',
    '7': 'Jul', '8': 'Aug', '9': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
  };

  const monthlyRevenueData = Object.entries(stats.monthly_revenue || {})
    .map(([m, rev]) => ({
      month: monthlyLabels[m] || `M${m}`,
      revenue: Math.round(rev),
      numMonth: parseInt(m)
    }))
    .sort((a, b) => a.numMonth - b.numMonth);

  const monthlyAbandonData = Object.entries(stats.monthly_abandonment || {})
    .map(([m, rate]) => ({
      month: monthlyLabels[m] || `M${m}`,
      rate: Math.round(rate * 1000) / 10,
      numMonth: parseInt(m)
    }))
    .sort((a, b) => a.numMonth - b.numMonth);

  const COLORS = ['#00f2fe', '#bd00ff', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#6366f1'];

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p className="page-subtitle">Overview of cart abandonment and conversion patterns.</p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={stats.total_sessions.toLocaleString()}
          subtext="Total logs analyzed"
          icon={Users}
        />
        <StatCard
          title="Cart Abandonment"
          value={`${(stats.cart_abandonment_rate * 100).toFixed(2)}%`}
          subtext="Added but not purchased"
          trend="2.4%"
          trendType="negative"
          icon={ShoppingCart}
        />
        <StatCard
          title="Overall Conversion"
          value={`${(stats.conversion_rate * 100).toFixed(2)}%`}
          subtext="Session to order conversion"
          trend="1.2%"
          trendType="positive"
          icon={Percent}
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtext={`Avg order: $${stats.average_order_value.toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      {/* Visual Charts Grid Layout (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* Row 1 - Category and Device */}
        <div className="glass-card chart-card flex flex-col gap-4">
          <div className="chart-header">
            <h4>Abandonment Rate by Product Category</h4>
            <span className="chart-subtitle">Percentage of carts abandoned per category</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={categoryData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="category" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" unit="%" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Bar dataKey="rate" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-card flex flex-col gap-4">
          <div className="chart-header">
            <h4>Abandonment Rate by Device Type</h4>
            <span className="chart-subtitle">Percentage of carts abandoned per device</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={deviceData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="device" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" unit="%" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Bar dataKey="rate" fill="var(--secondary)" radius={[4, 4, 0, 0]}>
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 1 ? 'var(--primary)' : 'var(--secondary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2 - Monthly Revenue and Monthly Abandonment */}
        <div className="glass-card chart-card flex flex-col gap-4">
          <div className="chart-header">
            <h4>Monthly Revenue Trend</h4>
            <span className="chart-subtitle">Revenue timeline across visit calendar months</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" prefix="$" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: 'var(--primary)' }}
                  formatter={(val) => [`$${val.toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-card flex flex-col gap-4">
          <div className="chart-header">
            <h4>Monthly Abandonment Rate</h4>
            <span className="chart-subtitle">Abandonment probability timeline across months</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyAbandonData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" unit="%" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#0d1426', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: 'var(--secondary)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  name="Abandonment Rate" 
                  stroke="var(--secondary)" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: 'var(--secondary)', strokeWidth: 1 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {confusionMatrix && (
        <div className="glass-card flex flex-col items-center gap-4 mt-6 w-full" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div className="chart-header w-full">
            <h4>XGBoost Classifier Confusion Matrix Heatmap</h4>
            <span className="chart-subtitle">Direct evaluation outcomes generated from test predictions.</span>
          </div>
          <div className="flex justify-center w-full py-2">
            <img src={confusionMatrix} alt="Confusion Matrix Heatmap" style={{ maxWidth: '480px', width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0.4rem', backgroundColor: '#fff' }} />
          </div>
        </div>
      )}

      <style>{`
        .loading-state, .error-card {
          min-height: 400px;
        }
        
        .error-card {
          border-color: rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.02);
        }

        .error-icon {
          color: var(--danger);
          filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.2));
        }

        .error-msg {
          color: var(--text-secondary);
          max-width: 400px;
          font-size: 0.9rem;
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
      `}</style>
    </div>
  );
};

export default Dashboard;
