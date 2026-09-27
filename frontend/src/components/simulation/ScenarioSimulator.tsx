import React, { useState } from 'react';
import { Station, SimulationRequest, SimulationResult } from '../../types';
import { Sliders, Play, AlertTriangle, ShieldCheck, Zap, Fuel, BatteryCharging, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { DataSourceBadge } from '../common/DataSourceBadge';

interface ScenarioSimulatorProps {
  station: Station;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({ station }) => {
  const [ambientTempDelta, setAmbientTempDelta] = useState<number>(-10);
  const [generatorOfflineId, setGeneratorOfflineId] = useState<string>('GEN-02');
  const [occupancyDelta, setOccupancyDelta] = useState<number>(0);
  const [supplyDelayDays, setSupplyDelayDays] = useState<number>(15);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    const req: SimulationRequest = {
      stationId: station.stationId,
      ambientTempDelta,
      generatorOfflineId: generatorOfflineId === 'NONE' ? undefined : generatorOfflineId,
      occupancyDelta,
      solarEfficiencyPct: 100,
      supplyShipDelayDays: supplyDelayDays
    };

    const res = await api.runSimulation(req);
    setResult(res);
    setIsSimulating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Antarctic Operational Scenario Sandbox & What-If Simulation Engine
            </h2>
          </div>
          <DataSourceBadge kind="PROTOTYPE" label="Derived: physics-informed simulation" detail="Results are computed by the POLAR-TWIN prototype's deterministic simulation model, not measured or forecast from live station data." />
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Evaluate extreme polar contingency scenarios before committing field decisions. Test cold snaps, generator trips, and winter shipping disruptions against station life support models.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: 20 }}>
        {/* Controls Column */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--accent-cyan)' }}>
            1. Simulation Parameters
          </h3>

          {/* Ambient Temp Drop */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              <span>Ambient Temp Shift (ΔT)</span>
              <span className="telemetry-val" style={{ color: 'var(--accent-cyan)' }}>{ambientTempDelta}°C</span>
            </div>
            <input
              type="range"
              min="-25"
              max="5"
              step="1"
              value={ambientTempDelta}
              onChange={(e) => setAmbientTempDelta(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>-25°C (Extreme Gale)</span>
              <span>0°C (Normal)</span>
              <span>+5°C (Summer)</span>
            </div>
          </div>

          {/* Generator Offline Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Simulate Genset Forced Outage:
            </label>
            <select
              value={generatorOfflineId}
              onChange={(e) => setGeneratorOfflineId(e.target.value)}
              className="input-control"
              style={{ width: '100%' }}
            >
              <option value="NONE">All Generators Normal (Online)</option>
              <option value="GEN-01">Trip Caterpillar Genset 01 (-200 kW)</option>
              <option value="GEN-02">Trip Caterpillar Genset 02 (-200 kW, High Vibration)</option>
            </select>
          </div>

          {/* Supply Ship Delay */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              <span>Resupply Vessel Arrival Delay</span>
              <span className="telemetry-val" style={{ color: 'var(--status-warning)' }}>+{supplyDelayDays} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="5"
              value={supplyDelayDays}
              onChange={(e) => setSupplyDelayDays(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--status-warning)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>On Time (0d)</span>
              <span>Pack-Ice Pack (+20d)</span>
              <span>Severe Winter Block (+45d)</span>
            </div>
          </div>

          {/* Personnel Occupancy Delta */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              <span>Overwintering Crew Variance (Personnel)</span>
              <span className="telemetry-val">{occupancyDelta >= 0 ? `+${occupancyDelta}` : occupancyDelta} members</span>
            </div>
            <input
              type="range"
              min="-10"
              max="15"
              step="1"
              value={occupancyDelta}
              onChange={(e) => setOccupancyDelta(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--status-normal)' }}
            />
          </div>

          {/* Run Button */}
          <button
            className="btn btn-primary"
            style={{ padding: '12px', fontSize: '0.9rem', marginTop: 8 }}
            onClick={handleRunSimulation}
            disabled={isSimulating}
          >
            {isSimulating ? <RefreshCw size={16} className="radar-spinner" /> : <Play size={16} />}
            {isSimulating ? 'Executing Digital Twin Mathematical Model...' : 'RUN STRESS SIMULATION'}
          </button>
        </div>

        {/* Results Column */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              2. Projected Operational Impact
            </h3>
            {result && (
              <span className={`badge badge-${result.riskLevel === 'CRITICAL' ? 'critical' : result.riskLevel === 'MEDIUM' ? 'warning' : 'normal'}`}>
                {result.riskLevel} RISK LEVEL
              </span>
            )}
          </div>

          {!result ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              border: '1px dashed var(--panel-border)',
              borderRadius: 'var(--radius-md)',
              padding: '40px'
            }}>
              <Sliders size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                Adjust the scenario parameters on the left and click <strong>RUN STRESS SIMULATION</strong> to execute the thermodynamic & logistics forecasting model.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Metric Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="glass-panel" style={{ padding: '12px' }}>
                  <div className="metric-label"><Zap size={14} color="var(--status-warning)" /> Projected Microgrid Load</div>
                  <div className="telemetry-val" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {result.projectedDemandKw} kW
                  </div>
                  <div style={{ fontSize: '0.72rem', color: result.demandDeltaPct > 0 ? 'var(--status-warning)' : 'var(--status-normal)' }}>
                    {result.demandDeltaPct > 0 ? `+${result.demandDeltaPct}%` : `${result.demandDeltaPct}%`} vs Baseline ({result.baseDemandKw} kW)
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '12px' }}>
                  <div className="metric-label"><Fuel size={14} color="var(--accent-cyan)" /> Projected Fuel Runway</div>
                  <div className="telemetry-val" style={{ fontSize: '1.4rem', fontWeight: 700, color: result.fuelRunwayDays < 100 ? 'var(--status-critical)' : 'var(--status-normal)' }}>
                    {result.fuelRunwayDays} days
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Burn: {result.projectedFuelBurnLph} L/h
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '12px' }}>
                  <div className="metric-label"><BatteryCharging size={14} color="var(--status-normal)" /> BESS Backup Buffer</div>
                  <div className="telemetry-val" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    {result.batteryBufferHours} hrs
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Autonomous life-support battery runtime
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '12px' }}>
                  <div className="metric-label"><AlertTriangle size={14} color="var(--status-critical)" /> Critical Shedding</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: result.criticalLoadsAffected.length > 0 ? 'var(--status-critical)' : 'var(--status-normal)' }}>
                    {result.criticalLoadsAffected.length > 0 ? `${result.criticalLoadsAffected.length} Subsystems` : 'None (Full Power)'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Automatic load shedding
                  </div>
                </div>
              </div>

              {/* Critical Loads Alert if any */}
              {result.criticalLoadsAffected.length > 0 && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fca5a5', marginBottom: 4 }}>
                    ⚠️ AUTOMATIC LOAD SHEDDING TRIGGERED:
                  </div>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '18px' }}>
                    {result.criticalLoadsAffected.map((load, i) => (
                      <li key={i}>{load}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Recommended Mitigation Protocols */}
              <div style={{
                background: 'rgba(0, 229, 255, 0.08)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 6 }}>
                  🤖 AI PRESCRIPTIVE MITIGATION STRATEGY:
                </div>
                <ul style={{ fontSize: '0.78rem', color: '#fff', lineHeight: 1.4, paddingLeft: '16px' }}>
                  {result.mitigationStrategy.map((strat, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{strat}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
