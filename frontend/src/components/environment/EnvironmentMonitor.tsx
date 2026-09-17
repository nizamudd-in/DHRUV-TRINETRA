import React from 'react';
import { Station } from '../../types';
import { CloudSnow, Wind, Compass, Droplets, Sun, AlertTriangle, Activity, Eye } from 'lucide-react';

interface EnvironmentMonitorProps {
  station: Station;
}

export const EnvironmentMonitor: React.FC<EnvironmentMonitorProps> = ({ station }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Polar Meteorological Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="metric-label"><CloudSnow size={15} color="var(--accent-cyan)" /> Ambient Air Temp</div>
          <div className="metric-value" style={{ color: '#bae6fd' }}>
            {station.currentTemp}°C
          </div>
          <div className="metric-sub">Wind Chill Index: -44.2°C</div>
        </div>

        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
          <div className="metric-label"><Wind size={15} color="var(--status-warning)" /> Katabatic Wind Speed</div>
          <div className="metric-value">
            {station.windSpeedKts} <span className="metric-unit">kts</span>
          </div>
          <div className="metric-sub">Heading: 115° ESE • Gusts to 54 kts</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><Compass size={15} color="var(--accent-ice)" /> Atmospheric Pressure</div>
          <div className="metric-value">
            984.2 <span className="metric-unit">hPa</span>
          </div>
          <div className="metric-sub">Falling -1.8 hPa/3h (Blizzard watch)</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><Eye size={15} color="var(--text-secondary)" /> Surface Visibility</div>
          <div className="metric-value">
            2.4 <span className="metric-unit">km</span>
          </div>
          <div className="metric-sub">Blowing drift snow at ground level</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><Sun size={15} color="var(--accent-cyan)" /> Geomagnetic Kp Index</div>
          <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>
            Kp 4.2 <span className="metric-unit">Active</span>
          </div>
          <div className="metric-sub">Aurora Australis visible on South Horizon</div>
        </div>
      </div>

      {/* Cross-Correlation: Environment vs Heating & Microgrid Load */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Antarctic Cross-Correlation Engine: Katabatic Wind & Cold vs Heating Demand
            </h3>
          </div>
          <span className="badge badge-warning">ELEVATED THERMAL STRAIN</span>
        </div>

        <div style={{
          background: 'rgba(7, 18, 33, 0.75)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            The Digital Twin Engine continuously correlates meteorological telemetry with station energy consumption models:
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12, padding: '10px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Katabatic Wind</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--status-warning)' }}>▲ 36.5 kts (+30%)</div>
            </div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>+</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ambient Cold</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#bae6fd' }}>▼ -28.4°C (-6°C)</div>
            </div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>➔</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>HVAC Trace Heating</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--status-critical)' }}>▲ +45 kW Surge</div>
            </div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>➔</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fuel Depletion Acceleration</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>▲ +180 L / day</div>
            </div>
          </div>

          <div style={{
            fontSize: '0.78rem',
            color: '#fff',
            background: 'rgba(2, 132, 199, 0.15)',
            borderLeft: '3px solid var(--accent-cyan)',
            padding: '8px 12px'
          }}>
            💡 <strong>Predictive Recommendation:</strong> Seal external damper vents on Zone B and engage supplementary waste heat recovery unit on Genset 01 exhaust loop.
          </div>
        </div>
      </div>

      {/* 24-Hour Environmental History Chart */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
          24-Hour Polar Weather Station Telemetry Trend ({station.name})
        </h3>
        <svg viewBox="0 0 500 130" style={{ width: '100%', height: '130px', background: 'rgba(7, 18, 33, 0.8)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
          <line x1="40" y1="20" x2="490" y2="20" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />
          <line x1="40" y1="60" x2="490" y2="60" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />
          <line x1="40" y1="100" x2="490" y2="100" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />

          {/* Temperature trend curve (cyan) */}
          <path d="M 40 40 Q 120 50 200 65 T 320 85 T 420 90 T 490 92" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" />

          {/* Wind speed trend curve (yellow) */}
          <path d="M 40 90 Q 120 80 200 60 T 320 40 T 420 30 T 490 28" fill="none" stroke="var(--status-warning)" strokeWidth="2" />
        </svg>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: '0.75rem', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, background: 'var(--accent-cyan)' }} />
            <span>Ambient Temp Trend (-22°C ➔ -28.4°C)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, background: 'var(--status-warning)' }} />
            <span>Katabatic Wind Speed (22 kts ➔ 36.5 kts)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
