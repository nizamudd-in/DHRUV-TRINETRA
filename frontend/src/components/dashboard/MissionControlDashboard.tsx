import React from 'react';
import { Station, Asset, Alert, InventoryItem, ActiveTab, CrossDomainRisk } from '../../types';
import {
  Activity,
  Zap,
  Fuel,
  BatteryCharging,
  AlertOctagon,
  CloudSnow,
  Wind,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  Sliders,
  Box,
  ChevronRight
} from 'lucide-react';
import { TwinCanvas3D } from '../digitaltwin/TwinCanvas3D';
import { CrossDomainRiskPanel } from './CrossDomainRiskPanel';
import { DataSourceBadge } from '../common/DataSourceBadge';

interface MissionControlDashboardProps {
  station: Station;
  assets: Asset[];
  alerts: Alert[];
  inventory: InventoryItem[];
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectAsset: (asset: Asset) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onInjectAnomaly: () => void;
  onResetAnomaly: () => void;
  risk: CrossDomainRisk | null;
  riskLoading: boolean;
  riskError: string | null;
  onInspectRiskDriver: (assetId: string) => void;
  onOpenEmergency: () => void;
}

export const MissionControlDashboard: React.FC<MissionControlDashboardProps> = ({
  station,
  assets,
  alerts,
  inventory,
  onNavigateTab,
  onSelectAsset,
  onAcknowledgeAlert,
  onInjectAnomaly,
  onResetAnomaly,
  risk,
  riskLoading,
  riskError,
  onInspectRiskDriver,
  onOpenEmergency
}) => {
  const criticalAlerts = alerts.filter(a => a.level === 'critical' || a.level === 'warning');
  const criticalSpares = inventory.filter(i => i.status === 'stockout_risk' || i.status === 'reorder_required');
  const criticalAsset = assets.find(a => a.status === 'critical' || a.status === 'warning') || assets[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner: Station Health Score & Quick Mission Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14
      }}>
        {/* Overall Health Score Card */}
        <div className="glass-panel metric-card" style={{
          background: 'linear-gradient(135deg, rgba(14, 28, 48, 0.9) 0%, rgba(2, 132, 199, 0.15) 100%)',
          borderLeft: `4px solid ${station.emergencyActive ? 'var(--status-critical)' : station.healthScore > 90 ? 'var(--status-normal)' : 'var(--status-warning)'}`
        }}>
          <div className="metric-label">
            <ShieldAlert size={15} color="var(--accent-cyan)" /> Station Health Index
          </div>
          <div className="metric-value">
            <span style={{ color: station.emergencyActive ? 'var(--status-critical)' : station.healthScore > 90 ? 'var(--status-normal)' : 'var(--status-warning)' }}>
              {station.healthScore}%
            </span>
            <span className="metric-unit">{station.emergencyActive ? 'EMERGENCY TRIAGE' : 'Operational'}</span>
          </div>
          <div className="metric-sub">
            <span>Energy: {station.healthBreakdown.energy}%</span> • <span>Equip: {station.healthBreakdown.equipment}%</span>
          </div>
        </div>

        {/* Microgrid Power Load */}
        <div className="glass-panel metric-card">
          <div className="metric-label">
            <Zap size={15} color="var(--status-warning)" /> Station Power Load
            {station.emergencyActive && <span className="badge badge-critical" style={{ marginLeft: 8, fontSize: '0.6rem' }}>SHED {station.shedLoadKw} kW</span>}
          </div>
          <div className="metric-value">
            {station.powerLoadKw} <span className="metric-unit">kW</span>
          </div>
          <div className="metric-sub">
            <span>Capacity: {station.powerCapacityKw} kW</span> (57% Load)
          </div>
        </div>

        {/* Arctic Fuel Runway */}
        <div className="glass-panel metric-card">
          <div className="metric-label">
            <Fuel size={15} color="var(--accent-cyan)" /> Winter Fuel Reserve
          </div>
          <div className="metric-value">
            {station.fuelDaysRemaining} <span className="metric-unit">days left</span>
          </div>
          <div className="metric-sub">
            <span>215,000 L</span> (Burn: 1,510 L/day)
          </div>
        </div>

        {/* BESS Battery Storage */}
        <div className="glass-panel metric-card">
          <div className="metric-label">
            <BatteryCharging size={15} color="var(--status-normal)" /> BESS Storage (400 kWh)
          </div>
          <div className="metric-value">
            {station.batterySoc}% <span className="metric-unit">SOC</span>
          </div>
          <div className="metric-sub">
            <span>Health SOH: 96.4%</span> (Nominal)
          </div>
        </div>

        {/* Antarctic Ambient Weather */}
        <div className="glass-panel metric-card">
          <div className="metric-label">
            <CloudSnow size={15} color="var(--text-ice)" /> Ambient Temperature
          </div>
          <div className="metric-value" style={{ color: '#bae6fd' }}>
            {station.currentTemp}°C
          </div>
          <div className="metric-sub">
            <Wind size={13} /> <span>Katabatic Wind: {station.windSpeedKts} kts</span>
          </div>
        </div>
      </div>

      {/* Cross-Domain Risk */}
      <CrossDomainRiskPanel
        risk={risk}
        loading={riskLoading}
        error={riskError}
        onInspectDriver={onInspectRiskDriver}
        onOpenEmergency={onOpenEmergency}
      />

      {/* Main Command Center Grid: 3D Twin View & Alerts / Operations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 20
      }}>
        {/* Left Column: 3D Digital Twin Module Viewer */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Box size={18} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                {station.name} — Interactive 3D Digital Twin
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DataSourceBadge kind="SIMULATED" detail="Station telemetry, asset health, and 3D twin state are generated by the POLAR-TWIN prototype simulator." />
              <button
                className="btn btn-outline"
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                onClick={() => onNavigateTab('digitaltwin')}
              >
                Expand 3D View <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          {/* 3D Canvas Preview */}
          <div style={{ height: '360px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <TwinCanvas3D
              stationId={station.stationId}
              assets={assets}
              selectedAsset={criticalAsset || null}
              onSelectAsset={onSelectAsset}
              thermalOverlay={false}
              vibrationOverlay={criticalAsset ? criticalAsset.vibration > 3.0 : false}
              onToggleThermal={() => {}}
              onToggleVibration={() => {}}
            />
          </div>

          {/* Quick Anomaly Testing Action Bar for Hackathon Presentation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(7, 18, 33, 0.75)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--panel-border)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              ⚡ <strong>Hackathon Demo Controller:</strong> Test predictive fault loop
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-danger"
                style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                onClick={onInjectAnomaly}
              >
                Trigger Generator Vibration Anomaly
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                onClick={onResetAnomaly}
              >
                Reset Anomaly
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Operational Alert Feed & Fast Triage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Critical Alerts Card */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertOctagon size={18} color="var(--status-critical)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                  Active Operational Alerts ({alerts.length})
                </h3>
              </div>
              <button
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                onClick={() => onNavigateTab('alerts')}
              >
                View All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: '280px' }}>
              {criticalAlerts.map(alert => (
                <div
                  key={alert.alertId}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: alert.level === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${alert.level === 'critical' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge badge-${alert.level === 'critical' ? 'critical' : 'warning'}`}>
                        {alert.level.toUpperCase()}
                      </span>
                      <span className="telemetry-val" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {alert.timestamp}
                      </span>
                    </div>
                    <div className="telemetry-val" style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                      Risk Score: <strong>{alert.riskScore}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                    {alert.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                    {alert.description}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {!alert.acknowledged && (
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        onClick={() => onAcknowledgeAlert(alert.alertId)}
                      >
                        <CheckCircle2 size={12} /> Acknowledge
                      </button>
                    )}
                    {alert.assetId && (
                      <button
                        className="btn btn-cyan"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        onClick={() => {
                          const asset = assets.find(a => a.assetId === alert.assetId);
                          if (asset) onSelectAsset(asset);
                        }}
                      >
                        Inspect Asset <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Logistics Stockout Risk Card */}
          <div className="glass-panel" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Critical Logistics Runway
              </div>
              <button
                className="btn btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                onClick={() => onNavigateTab('logistics')}
              >
                Logistics Module
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {criticalSpares.slice(0, 2).map(item => (
                <div key={item.itemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="telemetry-val" style={{ color: item.status === 'stockout_risk' ? 'var(--status-critical)' : 'var(--status-warning)', fontWeight: 700 }}>
                    {item.daysRemaining}d left (Lead: {item.leadTimeDays}d)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Key Assets Status Table */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              Primary Infrastructure Assets Health Matrix ({station.name})
            </h3>
          </div>
          <button
            className="btn btn-outline"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => onNavigateTab('equipment')}
          >
            View All Equipment ({assets.length})
          </button>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Type / Location</th>
              <th>Status</th>
              <th>Health Index</th>
              <th>Vibration</th>
              <th>Temp</th>
              <th>Load</th>
              <th>Risk Level</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {assets.slice(0, 5).map(asset => (
              <tr key={asset.assetId} style={{ cursor: 'pointer' }} onClick={() => onSelectAsset(asset)}>
                <td>
                  <strong style={{ color: '#fff' }}>{asset.name}</strong>
                  <div className="telemetry-val" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{asset.assetId}</div>
                </td>
                <td>
                  <div>{asset.building}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{asset.type}</div>
                </td>
                <td>
                  <span className={`badge badge-${asset.status === 'offline' ? 'offline' : asset.status === 'critical' ? 'critical' : asset.status === 'warning' ? 'warning' : 'normal'}`}>
                    {asset.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                      <div style={{
                        width: `${asset.healthScore}%`,
                        height: '100%',
                        background: asset.healthScore > 85 ? 'var(--status-normal)' : asset.healthScore > 70 ? 'var(--status-warning)' : 'var(--status-critical)'
                      }} />
                    </div>
                    <span className="telemetry-val" style={{ fontSize: '0.78rem', fontWeight: 600 }}>{asset.healthScore}%</span>
                  </div>
                </td>
                <td className="telemetry-val" style={{ color: asset.vibration > 3.0 ? 'var(--status-critical)' : 'inherit' }}>
                  {asset.vibration} mm/s
                </td>
                <td className="telemetry-val" style={{ color: asset.temperature > 75 ? 'var(--status-critical)' : 'inherit' }}>
                  {asset.temperature}°C
                </td>
                <td className="telemetry-val">
                  {asset.powerKw} kW
                </td>
                <td>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: asset.failureRisk === 'High' ? 'var(--status-critical)' : asset.failureRisk === 'Medium' ? 'var(--status-warning)' : 'var(--status-normal)'
                  }}>
                    {asset.failureRisk}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-cyan"
                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAsset(asset);
                    }}
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
