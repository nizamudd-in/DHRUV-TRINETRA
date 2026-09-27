import React, { useState, useEffect } from 'react';
import { Station, StationHistory } from '../../types';
import { CloudSnow, Wind, Activity } from 'lucide-react';
import { api } from '../../services/api';
import { DataSourceBadge } from '../common/DataSourceBadge';
import { LoadingState, ErrorState } from '../common/StateViews';
import { TrendChart } from '../common/TrendChart';

interface EnvironmentMonitorProps {
  station: Station;
}

// Same coefficient used by ai_engine.run_simulation ("roughly 3.5 kW extra heating per
// 1°C ambient drop below baseline") — reused here rather than inventing a separate figure.
const HEATING_KW_PER_DEGREE_BELOW_BASELINE = 3.5;
const BASELINE_TEMP_C = -22.0; // the "normal" seasonal baseline used elsewhere in the app

export const EnvironmentMonitor: React.FC<EnvironmentMonitorProps> = ({ station }) => {
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

  // Derived (not fabricated): a standard wind-chill approximation from real temp + wind.
  const windKmh = station.windSpeedKts * 1.852;
  const windChill = windKmh > 4.8
    ? 13.12 + 0.6215 * station.currentTemp - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * station.currentTemp * Math.pow(windKmh, 0.16)
    : station.currentTemp;

  const tempDeltaBelowBaseline = Math.max(0, BASELINE_TEMP_C - station.currentTemp);
  const extraHeatingKw = tempDeltaBelowBaseline * HEATING_KW_PER_DEGREE_BELOW_BASELINE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Polar Weather — {station.name}</h2>
        <DataSourceBadge kind="SIMULATED" detail="Ambient temperature and wind speed are produced by the POLAR-TWIN prototype simulator." />
      </div>

      {/* Top Polar Meteorological Gauges — only fields this prototype actually tracks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div className="metric-label"><CloudSnow size={15} color="var(--accent-cyan)" /> Ambient Air Temp</div>
          <div className="metric-value" style={{ color: '#bae6fd' }}>
            {station.currentTemp}°C
          </div>
          <div className="metric-sub">Derived wind chill: {windChill.toFixed(1)}°C</div>
        </div>

        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
          <div className="metric-label"><Wind size={15} color="var(--status-warning)" /> Katabatic Wind Speed</div>
          <div className="metric-value">
            {station.windSpeedKts} <span className="metric-unit">kts</span>
          </div>
          <div className="metric-sub">{windKmh.toFixed(0)} km/h</div>
        </div>
      </div>

      {/* Cross-Correlation: Environment vs Heating Load — computed from REAL station telemetry */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Cold &amp; Wind vs Heating Demand
            </h3>
          </div>
          <DataSourceBadge kind="PROTOTYPE" label="Derived: prototype heating-load estimate" />
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
            Estimated additional heating load, derived from the current ambient temperature against
            a {BASELINE_TEMP_C}°C seasonal baseline at {HEATING_KW_PER_DEGREE_BELOW_BASELINE} kW/°C
            (the same coefficient the What-If Simulator uses).
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12, padding: '10px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Katabatic Wind</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--status-warning)' }}>{station.windSpeedKts.toFixed(1)} kts</div>
            </div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>+</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ambient Cold</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#bae6fd' }}>{station.currentTemp.toFixed(1)}°C</div>
            </div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>&#10148;</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Est. Extra Heating Load</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: extraHeatingKw > 0 ? 'var(--status-critical)' : 'var(--status-normal)' }}>
                {extraHeatingKw > 0 ? `+${extraHeatingKw.toFixed(0)} kW` : 'None'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 24-Hour Environmental History Chart — real trend data */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
            24-Hour Polar Weather Telemetry Trend ({station.name})
          </h3>
          <DataSourceBadge kind="SIMULATED" />
        </div>

        {historyLoading && <LoadingState label="Loading historical telemetry…" compact />}
        {historyError && !historyLoading && <ErrorState message={historyError} onRetry={loadHistory} />}
        {history && !historyLoading && !historyError && (
          <TrendChart
            timeLabels={history.history.map(h => h.time)}
            series={[
              { label: 'Ambient Temp', color: '#00e5ff', points: history.history.map(h => h.currentTemp), unit: '°C' },
              { label: 'Wind Speed', color: '#f59e0b', points: history.history.map(h => h.windSpeedKts), unit: ' kts' }
            ]}
            height={170}
          />
        )}
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>{history?.note}</div>
      </div>
    </div>
  );
};
