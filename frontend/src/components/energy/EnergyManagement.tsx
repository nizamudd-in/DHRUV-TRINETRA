import React, { useState, useEffect } from 'react';
import { Station, Asset, StationHistory } from '../../types';
import { Zap, Fuel, BatteryCharging, Sun, ArrowRight, TrendingUp, Cpu, Gauge } from 'lucide-react';
import { api } from '../../services/api';
import { DataSourceBadge } from '../common/DataSourceBadge';
import { LoadingState, ErrorState } from '../common/StateViews';
import { TrendChart } from '../common/TrendChart';

interface EnergyManagementProps {
  station: Station;
  assets: Asset[];
}

export const EnergyManagement: React.FC<EnergyManagementProps> = ({ station, assets }) => {
  const [history, setHistory] = useState<StationHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = () => {
    setHistoryLoading(true);
    setHistoryError(null);
    api.getStationHistory(station.stationId)
      .then(setHistory)
      .catch(e => setHistoryError(e?.message || 'Historical telemetry unavailable.'))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(loadHistory, [station.stationId]);

  // Generation sources: derived from the REAL assets belonging to the active station
  // (generator/solar/wind_turbine types), not a hardcoded list.
  const generationAssets = assets.filter(a => ['generator', 'solar', 'wind_turbine'].includes(a.type));
  const totalGeneration = generationAssets.reduce((sum, a) => sum + a.powerKw, 0);

  // Renewable contribution (solar + wind) — real, from current asset output.
  const renewableKw = assets.filter(a => a.type === 'solar' || a.type === 'wind_turbine').reduce((s, a) => s + a.powerKw, 0);

  const loadFactorPct = station.powerCapacityKw > 0 ? (station.powerLoadKw / station.powerCapacityKw) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Energy &amp; Microgrid — {station.name}</h2>
        <DataSourceBadge kind="SIMULATED" detail="Station load, BESS and generator output are produced by the POLAR-TWIN prototype simulator." />
      </div>

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
          <div className="metric-sub">{loadFactorPct.toFixed(1)}% of {station.powerCapacityKw} kW Total Rated Capacity</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><Fuel size={15} color="var(--accent-cyan)" /> Winter Fuel Runway</div>
          <div className="metric-value">
            {station.fuelDaysRemaining} <span className="metric-unit">days left</span>
          </div>
          <div className="metric-sub">Arctic ATF Diesel reserve</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><BatteryCharging size={15} color="var(--status-normal)" /> BESS Battery Storage</div>
          <div className="metric-value">
            {station.batterySoc}% <span className="metric-unit">SOC</span>
          </div>
          <div className="metric-sub">400 kWh LiFePO4</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><Sun size={15} color="var(--accent-ice)" /> Renewable Generation</div>
          <div className="metric-value">
            {renewableKw.toFixed(1)} <span className="metric-unit">kW</span>
          </div>
          <div className="metric-sub">Solar / wind contribution (live)</div>
        </div>
      </div>

      {/* Dynamic Energy Flow Diagram — driven by real station assets */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Live Microgrid Power Flow
            </h3>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Generation {totalGeneration.toFixed(0)} kW &bull; Load {station.powerLoadKw.toFixed(0)} kW
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1.2fr',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(7, 18, 33, 0.7)',
          padding: '24px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--panel-border)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              Generation Sources
            </div>
            {generationAssets.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No generation assets found for this station.</div>
            ) : generationAssets.map(a => (
              <div
                key={a.assetId}
                className="glass-panel"
                style={{ padding: '10px 12px', borderLeft: `3px solid ${a.status === 'critical' ? 'var(--status-critical)' : a.status === 'warning' ? 'var(--status-warning)' : a.status === 'offline' ? 'var(--text-muted)' : 'transparent'}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span>{a.assetId} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({a.type})</span></span>
                  <span className="telemetry-val" style={{ color: a.status === 'warning' ? 'var(--status-warning)' : a.status === 'critical' || a.status === 'offline' ? 'var(--status-critical)' : 'var(--status-normal)' }}>
                    {a.powerKw.toFixed(0)} kW
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--accent-cyan)' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{totalGeneration.toFixed(0)} kW</div>
            <ArrowRight size={28} />
          </div>

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
              Central Microgrid Bus
            </div>
            <div className="telemetry-val" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
              {station.powerLoadKw.toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>kW LOAD</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: totalGeneration >= station.powerLoadKw ? 'var(--status-normal)' : 'var(--status-critical)' }}>
              {totalGeneration >= station.powerLoadKw
                ? `Margin: +${(totalGeneration - station.powerLoadKw).toFixed(0)} kW`
                : `Gap: ${(station.powerLoadKw - totalGeneration).toFixed(0)} kW (BESS covering)`}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Generators table & Real load/BESS trend chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge size={18} color="var(--accent-cyan)" /> Generation Unit Status
          </h4>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Output</th>
                <th>Status</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {generationAssets.map(a => (
                <tr key={a.assetId}>
                  <td>
                    <strong style={{ color: '#fff' }}>{a.name}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.assetId}</div>
                  </td>
                  <td className="telemetry-val" style={{ fontWeight: 700, color: a.powerKw > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {a.powerKw.toFixed(1)} kW
                  </td>
                  <td>
                    <span className={`badge badge-${a.status === 'offline' ? 'offline' : a.status === 'critical' ? 'critical' : a.status === 'warning' ? 'warning' : 'normal'}`}>
                      {a.powerKw === 0 && a.status === 'normal' ? 'standby' : a.status}
                    </span>
                  </td>
                  <td className="telemetry-val">{a.healthScore.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="var(--accent-cyan)" /> 24-Hour Load &amp; BESS Trend
            </h4>
            <DataSourceBadge kind="SIMULATED" />
          </div>

          {historyLoading && <LoadingState label="Loading historical telemetry…" compact />}
          {historyError && !historyLoading && <ErrorState message={historyError} onRetry={loadHistory} />}
          {history && !historyLoading && !historyError && (
            <TrendChart
              timeLabels={history.history.map(h => h.time)}
              series={[
                { label: 'Load', color: '#10b981', points: history.history.map(h => h.powerLoadKw), unit: ' kW' },
                { label: 'BESS SOC', color: '#00e5ff', points: history.history.map(h => h.batterySoc), unit: '%' }
              ]}
              height={170}
            />
          )}
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{history?.note}</div>
        </div>
      </div>
    </div>
  );
};
