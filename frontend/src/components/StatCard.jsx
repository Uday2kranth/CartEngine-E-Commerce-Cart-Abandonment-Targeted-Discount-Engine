import React from 'react';

const StatCard = ({ title, value, subtext, trend, trendType, icon: Icon }) => {
  const isPositive = trendType === 'positive';
  const isNegative = trendType === 'negative';

  return (
    <div className="glass-card stat-card">
      <div className="stat-card-header flex justify-between items-center">
        <span className="stat-title">{title}</span>
        {Icon && (
          <div className="stat-icon-wrapper">
            <Icon size={20} className="stat-icon" />
          </div>
        )}
      </div>
      
      <div className="stat-value">{value}</div>
      
      <div className="stat-footer flex items-center gap-2">
        {trend && (
          <span className={`stat-trend ${trendType}`}>
            {isPositive ? '+' : ''}{trend}
          </span>
        )}
        <span className="stat-subtext">{subtext}</span>
      </div>

      <style>{`
        .stat-card {
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: "";
          position: absolute;
          top: -20px;
          right: -20px;
          width: 60px;
          height: 60px;
          background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
          pointer-events: none;
        }

        .stat-title {
          font-size: 0.85rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        .stat-icon-wrapper {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon {
          color: var(--primary);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #ffffff 60%, #b2c5ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stat-footer {
          font-size: 0.75rem;
        }

        .stat-trend {
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .stat-trend.positive {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .stat-trend.negative {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }
        
        .stat-trend.neutral {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }

        .stat-subtext {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default StatCard;
