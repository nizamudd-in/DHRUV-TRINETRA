import React from 'react';
import { CrossDomainRisk, Station } from '../../types';
import { HeartPulse } from 'lucide-react';
import { DataSourceBadge } from '../common/DataSourceBadge';

interface StationHealthPanelProps {
  risk: CrossDomainRisk | null;
  loading: boolean;
  station: Station;
  unacknowledgedCriticalCount: number;
}

const DOMAIN_LABEL: Record<string, string> = {
  energy: 'Energy', equipment: 'Equipment', environment: 'Environment',
  logistics: 'Logistics', communication: 'Communication'
};

const DOMAIN_ORDER = ['energy', 'equipment', 'environment', 'communication', 'logistics'];

function healthColor(pct: number): string {
  if (pct >= 80) return 'var(--status-normal)';
  if (pct >= 50) return 'var(--status-warning)';
  return 'var(--status-critical)';
}

// Station Health by category (Section 9). Energy/Equipment/Environment/Logistics/
// Communication all come straight from the already-live cross-domain risk engine (inverted
// from risk score to health score) — already dynamic, already reacts to anomaly injection,
// zero new backend calls. Fuel and Safety are derived client-side from data POLAR-TWIN
// already has (fuelDaysRemaining, emergencyActive, critical alert count).
export const StationHealthPanel: React.FC<StationHealthPanelProps> = ({ risk, loading, station, unacknowledgedCriticalCount }) => {
  const fuelHealth = Math.max(0, Math.min(100, Math.round((station.fuelDaysRemaining / 180) * 100)));
  const safetyHealth = station.emergencyActive
    ? 25
    : Math.max(0, 100 - unacknowledgedCriticalCount * 20);
  const overall = risk ? Math.round(100 - risk.overallScore) : null;

  return (
    <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeartPulse size={16} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Station Health
          </h3>
        </div>
        <DataSourceBadge kind="PROTOTYPE" detail="Energy/Equipment/Environment/Logistics/Communication are derived from the live cross-domain risk engine; Fuel/Safety are simple prototype derivations. Not a certified engineering health assessment." />
      </div>

      {loading && !risk && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calculating…</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {risk && DOMAIN_ORDER.map((domain) => {
          const d = risk.domainRisks.find(dr => dr.domain === domain);
          const pct = d ? Math.round(100 - d.score) : null;
          return (
            <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', width: 100 }}>{DOMAIN_LABEL[domain]}</span>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct ?? 0}%`, height: '100%', background: healthColor(pct ?? 0) }} />
              </div>
              <span className="telemetry-val" style={{ fontSize: '0.72rem', fontWeight: 700, width: 34, textAlign: 'right' }}>{pct ?? '—'}%</span>
            </div>
          );
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', width: 100 }}>Fuel</span>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${fuelHealth}%`, height: '100%', background: healthColor(fuelHealth) }} />
          </div>
          <span className="telemetry-val" style={{ fontSize: '0.72rem', fontWeight: 700, width: 34, textAlign: 'right' }}>{fuelHealth}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', width: 100 }}>Safety</span>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${safetyHealth}%`, height: '100%', background: healthColor(safetyHealth) }} />
          </div>
          <span className="telemetry-val" style={{ fontSize: '0.72rem', fontWeight: 700, width: 34, textAlign: 'right' }}>{safetyHealth}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>Overall</span>
        <span className="telemetry-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: overall !== null ? healthColor(overall) : '#fff' }}>
          {overall !== null ? `${overall}%` : '—'}
        </span>
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        Status: {station.status.toUpperCase()}
      </div>
    </div>
  );
};
