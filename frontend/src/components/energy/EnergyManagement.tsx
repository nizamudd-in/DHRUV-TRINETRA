import React, { useState } from 'react';
import { Station } from '../../types';
import { Zap, Fuel, BatteryCharging, Sun, Wind, ArrowRight, TrendingUp, AlertTriangle, Cpu, Gauge } from 'lucide-react';

interface EnergyManagementProps {
  station: Station;
}

export const EnergyManagement: React.FC<EnergyManagementProps> = ({ station }) => {
  const [forecastHorizon, setForecastHorizon] = useState<'24h' | '7d' | '30d'>('24h');

  // Generation sources
  const genSources = [
    { name: 'Caterpillar Genset 01', type: 'diesel', outputKw: 175.0, ratedKw: 200.0, status: 'active', fuelRate: '49.0 L/h', efficiency: '94%' },
    { name: 'Caterpillar Genset 02', type: 'diesel', outputKw: 170.0, ratedKw: 200.0, status: 'warning', fuelRate: '51.2 L/h', efficiency: '88%' },
    { name: 'Emergency Standby Genset 03', type: 'diesel', outputKw: 0.0, ratedKw: 200.0, status: 'standby', fuelRate: '0.0 L/h', efficiency: 'N/A' },
    { name: 'Bifacial Antarctic Solar Array', type: 'solar', outputKw: 28.0, ratedKw: 100.0, status: 'active', fuelRate: '0 L/h', efficiency: '92%' },
  ];

  // Consumers breakdown
  const consumers = [
    { name: 'Life Support & Space Heating (HVAC)', loadKw: 165.0, pct: 47.8, critical: true },
    { name: 'Polar Science Labs & Incubators', loadKw: 68.0, pct: 19.7, critical: false },
    { name: 'Seawater Desalination RO & Sewage', loadKw: 42.0, pct: 12.2, critical: true },
    { name: 'Galley, Food Cold Storage & Living', loadKw: 38.0, pct: 11.0, critical: true },
    { name: 'GSAT-10 Radome & Telecommunications', loadKw: 18.0, pct: 5.2, critical: true },
    { name: 'Lithium BESS Smart Charging Loop', loadKw: 14.0, pct: 4.1, critical: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Headline Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14
      }}>
        <div className="glass-panel metric-card">
          <div className="metric-label"><Zap size={15} color="var(--status-warning)" /> Current Microgrid Load</div>
          <div className="metric-value">
            {station.powerLoadKw} <span className="metric-unit">kW</span>
          </div>
          <div className="metric-sub">57.5% of 600 kW Total Rated Capacity</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><Fuel size={15} color="var(--accent-cyan)" /> Winter Fuel Runway</div>
          <div className="metric-value">
            {station.fuelDaysRemaining} <span className="metric-unit">days left</span>
          </div>
          <div className="metric-sub">Stock: 215,000 L Arctic ATF Diesel</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><BatteryCharging size={15} color="var(--status-normal)" /> BESS Battery Storage</div>
          <div className="metric-value">
            {station.batterySoc}% <span className="metric-unit">SOC</span>
          </div>
          <div className="metric-sub">State of Health (SOH): 96.4% • 400 kWh LiFePO4</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><Sun size={15} color="var(--accent-ice)" /> Renewable Generation</div>
          <div className="metric-value">
            28.0 <span className="metric-unit">kW</span>
          </div>
          <div className="metric-sub">Offsets ~8.2 L of diesel per hour</div>
        </div>
      </div>

      {/* Dynamic Animated Energy Flow Diagram */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Live Microgrid Power Flow Architecture
            </h3>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Dynamic AC/DC Bus Balancing (50 Hz / 415 V)
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1.2fr auto 1.2fr',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(7, 18, 33, 0.7)',
          padding: '24px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--panel-border)'
        }}>
          {/* Generation Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              1. Generation Sources
            </div>
            <div className="glass-panel" style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>GEN-01 (Primary)</span>
                <span className="telemetry-val" style={{ color: 'var(--status-normal)' }}>175 kW</span>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '10px 12px', borderLeft: '3px solid var(--status-warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>GEN-02 (Auxiliary)</span>
                <span className="telemetry-val" style={{ color: 'var(--status-warning)' }}>170 kW</span>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>Solar PV (Albedo)</span>
                <span className="telemetry-val" style={{ color: 'var(--accent-cyan)' }}>28 kW</span>
              </div>
            </div>
          </div>

          {/* Flow Arrow 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--accent-cyan)' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>373 kW</div>
            <ArrowRight size={28} />
          </div>

          {/* Central Station Microgrid Bus */}
          <div className="glass-panel-elevated" style={{
            padding: '20px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            border: '2px solid var(--accent-cyan)',
            boxShadow: 'var(--shadow-cyan-glow)'
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>
              CENTRAL MICROGRID BUS
            </div>
            <div className="telemetry-val" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
              345.0 <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>kW LOAD</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--status-normal)' }}>
              ● Frequency: 50.02 Hz • Bus Voltage: 414.8 V
            </div>
            <div style={{
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '6px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              color: 'var(--accent-ice)'
            }}>
              +28 kW excess routed to BESS Battery buffer
            </div>
          </div>

          {/* Flow Arrow 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--status-normal)' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>345 kW</div>
            <ArrowRight size={28} />
          </div>

          {/* Critical Consumers Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-normal)', textTransform: 'uppercase' }}>
              2. Distributed Loads
            </div>
            {consumers.slice(0, 4).map(c => (
              <div key={c.name} className="glass-panel" style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: c.critical ? '#fff' : 'var(--text-secondary)' }}>
                    {c.critical ? '🚨 ' : ''}{c.name}
                  </span>
                  <span className="telemetry-val" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {c.loadKw} kW
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Section: Generators Utilization & AI Load Forecasting */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
        {/* Generator Health & Performance Table */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge size={18} color="var(--accent-cyan)" /> Generator Units Operational Status
          </h4>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Output</th>
                <th>Status</th>
                <th>Fuel Rate</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {genSources.map(g => (
                <tr key={g.name}>
                  <td>
                    <strong style={{ color: '#fff' }}>{g.name}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rated {g.ratedKw} kW</div>
                  </td>
                  <td className="telemetry-val" style={{ fontWeight: 700, color: g.outputKw > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {g.outputKw} kW
                  </td>
                  <td>
                    <span className={`badge badge-${g.status === 'active' ? 'normal' : g.status === 'warning' ? 'warning' : 'info'}`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="telemetry-val">{g.fuelRate}</td>
                  <td className="telemetry-val">{g.efficiency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Load Forecasting & Fuel Runway Chart */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="var(--accent-cyan)" /> AI 24-Hour Load Forecast vs Actual
            </h4>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['24h', '7d', '30d'] as const).map(h => (
                <button
                  key={h}
                  onClick={() => setForecastHorizon(h)}
                  className={`btn ${forecastHorizon === h ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Multi-line Load Forecast Chart */}
          <div style={{ flex: 1, minHeight: '180px', background: 'rgba(7, 18, 33, 0.8)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <svg viewBox="0 0 400 140" style={{ width: '100%', height: '120px' }}>
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="390" y2="20" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />
              <line x1="40" y1="60" x2="390" y2="60" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />
              <line x1="40" y1="100" x2="390" y2="100" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />

              <text x="5" y="24" fill="#64748b" fontSize="9" fontFamily="monospace">450 kW</text>
              <text x="5" y="64" fill="#64748b" fontSize="9" fontFamily="monospace">350 kW</text>
              <text x="5" y="104" fill="#64748b" fontSize="9" fontFamily="monospace">250 kW</text>

              {/* Baseline Demand (grey dotted) */}
              <path d="M 40 70 Q 120 72 200 68 T 300 75 T 390 70" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4,4" />

              {/* AI Forecast Curve (cyan line) */}
              <path d="M 40 68 Q 120 62 200 55 T 300 50 T 390 48" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" />

              {/* Actual Load up to current time (emerald green) */}
              <path d="M 40 68 Q 120 62 200 55" fill="none" stroke="var(--status-normal)" strokeWidth="3" />
              <circle cx="200" cy="55" r="4" fill="var(--status-normal)" />
            </svg>

            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 3, background: 'var(--status-normal)', display: 'inline-block' }} />
                <span>Actual Load (345 kW)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 3, background: 'var(--accent-cyan)', display: 'inline-block' }} />
                <span>AI Predicted Surge (+14% due to cold)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 3, background: '#64748b', display: 'inline-block' }} />
                <span>Seasonal Baseline</span>
              </div>
            </div>
          </div>

          <div style={{
            padding: '10px 12px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertTriangle size={15} color="var(--status-warning)" />
            <span>
              <strong>Smart Fuel Forecast:</strong> Projected daily burn will increase from 1,510 L to 1,690 L/day if ambient temperature dips below -35°C next week.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
