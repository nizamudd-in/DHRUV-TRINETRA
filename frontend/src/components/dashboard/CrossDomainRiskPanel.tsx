import React from 'react';
import { CrossDomainRisk, RiskSeverity } from '../../types';
import { Gauge, RefreshCw, ArrowUpRight, Network } from 'lucide-react';
import { DataSourceBadge } from '../common/DataSourceBadge';

interface CrossDomainRiskPanelProps {
  risk: CrossDomainRisk | null;
  loading: boolean;
  error: string | null;
  onInspectDriver: (assetId: string) => void;
  onOpenEmergency: () => void;
}

const severityBadgeClass = (sev: RiskSeverity | string): string => {
  if (sev === 'CRITICAL' || sev === 'HIGH') return 'critical';
  if (sev === 'MEDIUM') return 'warning';
  return 'normal';
};

const domainLabel: Record<string, string> = {
  environment: 'Environment',
  energy: 'Energy',
  equipment: 'Equipment',
  logistics: 'Logistics',
  communication: 'Communication'
};

export const CrossDomainRiskPanel: React.FC<CrossDomainRiskPanelProps> = ({
  risk, loading, error, onInspectDriver, onOpenEmergency
}) => {
  return (
    <div className="glass-panel" style={{
      padding: '18px',
      borderLeft: `4px solid ${risk ? `var(--status-${risk.overallRisk === 'CRITICAL' || risk.overallRisk === 'HIGH' ? 'critical' : risk.overallRisk === 'MEDIUM' ? 'warning' : 'normal'})` : 'var(--panel-border)'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Network size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Cross-Domain Risk
          </h3>
          <DataSourceBadge kind="PROTOTYPE" label="Derived: cross-domain risk engine" detail="Rule-based, deterministic — not a trained ML model." />
        </div>
        {risk && (
          <span className={`badge badge-${severityBadgeClass(risk.overallRisk)}`}>{risk.overallRisk}</span>
        )}
      </div>

      {loading && !risk && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
          <RefreshCw size={14} className="radar-spinner" /> Calculating cross-domain risk…
        </div>
      )}

      {error && !risk && (
        <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>{error}</div>
      )}

      {risk && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="telemetry-val" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: risk.overallRisk === 'CRITICAL' || risk.overallRisk === 'HIGH' ? 'var(--status-critical)' : risk.overallRisk === 'MEDIUM' ? 'var(--status-warning)' : 'var(--status-normal)' }}>
                {risk.overallScore}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>/ 100 overall risk score</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                <Gauge size={11} style={{ verticalAlign: -1 }} /> Primary Driver
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{risk.primaryDriver}</div>
            </div>
          </div>

          {/* Domain breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {risk.domainRisks.map(d => (
              <div key={d.domain} className="glass-panel" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{domainLabel[d.domain] || d.domain}</span>
                <span className={`badge badge-${severityBadgeClass(d.severity)}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                  {d.severity}
                </span>
              </div>
            ))}
          </div>

          {/* Contributing factors */}
          {risk.contributingFactors.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                Contributing Factors
              </div>
              <ul style={{ fontSize: '0.78rem', color: '#fff', paddingLeft: '16px', margin: 0, lineHeight: 1.5 }}>
                {risk.contributingFactors.slice(0, 5).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          {/* Cross-domain interactions */}
          {risk.interactions.length > 0 && (
            <div style={{ background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: 4 }}>
                Cross-Domain Interactions
              </div>
              <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '16px', margin: 0, lineHeight: 1.5 }}>
                {risk.interactions.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          )}

          {/* Affected systems + actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {risk.affectedSystems.length > 0 && <>Affected: {risk.affectedSystems.join(', ')}</>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {risk.domainRisks.find(d => d.domain === 'equipment')?.driver && (
                <button
                  className="btn btn-cyan"
                  style={{ padding: '5px 12px', fontSize: '0.72rem' }}
                  onClick={() => onInspectDriver(risk.domainRisks.find(d => d.domain === 'equipment')!.driver as string)}
                >
                  Get AI Recommendation <ArrowUpRight size={12} />
                </button>
              )}
              {(risk.overallRisk === 'HIGH' || risk.overallRisk === 'CRITICAL') && (
                <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={onOpenEmergency}>
                  Open Emergency Triage
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
