import React from 'react';
import { Station, ActionDecision } from '../../types';
import { AlertTriangle, ShieldAlert, Zap, Flame, Radio, Droplets, X, Bot, Sliders, ThumbsUp, ThumbsDown, RefreshCw, CheckCircle2 } from 'lucide-react';

// Mirrors the backend's minimal RBAC allowlist (ai_engine.APPROVER_ROLE_ALLOWLIST) so the
// Approve button can be disabled client-side; the backend re-checks this and is the source of truth.
const APPROVER_ROLE_ALLOWLIST: Record<string, string[]> = {
  'Station Commander': ['Station Commander', 'National Operator'],
  'Chief Systems Engineer': ['Chief Systems Engineer', 'Station Commander', 'National Operator']
};

interface EmergencyModeModalProps {
  station: Station;
  onClose: () => void;
  activeRole?: string;
  decision?: ActionDecision | null;
  decisionLoading?: boolean;
  decisionError?: string | null;
  onRequestRecommendation?: () => void;
  onRunSimulation?: () => void;
  onApproveDecision?: () => void;
  onRejectDecision?: () => void;
  onDismissDecision?: () => void;
}

export const EmergencyModeModal: React.FC<EmergencyModeModalProps> = ({
  station,
  onClose,
  activeRole = 'National Operator',
  decision = null,
  decisionLoading = false,
  decisionError = null,
  onRequestRecommendation,
  onRunSimulation,
  onApproveDecision,
  onRejectDecision,
  onDismissDecision
}) => {
  const canApprove = !decision ? false : (
    !decision.requiredApproval || (APPROVER_ROLE_ALLOWLIST[decision.requiredApproval] || [decision.requiredApproval, 'National Operator']).includes(activeRole)
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(10, 0, 0, 0.88)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        width: '640px',
        maxWidth: '92vw',
        maxHeight: '90vh',
        background: '#0e0406',
        border: '2px solid var(--status-critical)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-critical-glow)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Urgent Header */}
        <div style={{
          background: 'linear-gradient(90deg, #991b1b 0%, #7f1d1d 100%)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={24} className="radar-spinner" style={{ animationDuration: '2s' }} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '0.05em' }}>
                POLAR EMERGENCY LIFE-SUPPORT TRIAGE
              </h2>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Station: <strong>{station.name.toUpperCase()}</strong> • {station.emergencyActive ? 'TRIAGE ACTIVE' : 'CRITICAL STATUS OVERRIDE'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          {/* Live Emergency Status (persists across modal open/close — server is the source of truth) */}
          {station.emergencyActive && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-normal)' }}>
                <CheckCircle2 size={16} /> Emergency Triage Engaged — {station.emergencyStrategy || 'SELECTIVE_LOAD_SHED'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#fff' }}>
                Load: <strong>{station.powerLoadKw} kW</strong> ({station.shedLoadKw} kW shed) • Protected load preserved: <strong>{station.protectedLoadKw} kW</strong> • BESS: <strong>{station.batterySoc}%</strong>
              </div>
            </div>
          )}

          {/* Active Contingency Banner */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5' }}>
              ⚠️ STATION SNAPSHOT AT TRIGGER TIME:
            </div>
            <div style={{ fontSize: '0.8rem', color: '#fff', lineHeight: 1.4 }}>
              Load: <strong>{station.powerLoadKw} kW</strong> / {station.powerCapacityKw} kW capacity • BESS: <strong>{station.batterySoc}%</strong> SOC<br />
              Ambient: <strong>{station.currentTemp}°C</strong>, {station.windSpeedKts} kts katabatic wind • Health Index: <strong>{station.healthScore}%</strong>
            </div>
          </div>

          {/* Life-Support Subsystem Status */}
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>
              Life-Support Subsystem Redundancies
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flame size={20} color="var(--status-normal)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Thermal Space Heating</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-normal)' }}>PROTECTED • +21°C Habitat Zone</div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Radio size={20} color="var(--status-normal)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Satellite Comms Lifeline</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-normal)' }}>Priority 1 (simulated/prototype link)</div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Droplets size={20} color="var(--status-normal)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Potable Water Supply</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-normal)' }}>Reservoir buffer nominal</div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={20} color="var(--status-warning)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Backup Microgrid BESS</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-warning)' }}>400 kWh ({station.batterySoc}% Reserve)</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Recommendation -> Simulation -> Human Approval -> Action (reuses the same decision architecture as asset-level actions) */}
          <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
                Emergency Decision Support Workflow
              </span>
            </div>

            {!decision && !decisionLoading && (
              <button className="btn btn-danger" style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700 }} onClick={onRequestRecommendation}>
                <Bot size={14} /> Assess Situation &amp; Get AI Triage Recommendation
              </button>
            )}

            {decisionLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                <RefreshCw size={14} className="radar-spinner" /> Processing…
              </div>
            )}

            {decisionError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#fca5a5' }}>
                {decisionError}
              </div>
            )}

            {decision && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="telemetry-val" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{decision.id}</span>
                  <span className={`badge badge-${decision.risk === 'High' || decision.risk === 'Critical' ? 'critical' : decision.risk === 'Medium' ? 'warning' : 'normal'}`}>
                    {decision.risk} RISK
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Observation</div>
                  <div style={{ fontSize: '0.82rem', color: '#fff' }}>{decision.detectedIssue}</div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                  {decision.explanation}
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', marginBottom: 4 }}>AI Recommendation</div>
                  <div style={{ fontSize: '0.85rem', color: '#fff', marginBottom: 6 }}>{decision.recommendation}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected impact: {decision.expectedImpact}</div>
                </div>

                {decision.approvalStatus === 'PENDING' && (
                  <>
                    {!decision.simulationResult && (
                      <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={onRunSimulation} disabled={decisionLoading}>
                        <Sliders size={14} /> View Simulation (Selective Load Shed)
                      </button>
                    )}

                    {decision.simulationResult && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>What-If Simulation Result</span>
                          <span className={`badge badge-${decision.simulationResult.riskLevel === 'CRITICAL' ? 'critical' : decision.simulationResult.riskLevel === 'MEDIUM' ? 'warning' : 'normal'}`}>
                            {decision.simulationResult.riskLevel} RISK
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div className="glass-panel" style={{ padding: '10px' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Projected Load (from {decision.simulationResult.baseDemandKw} kW)</div>
                            <div className="telemetry-val" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                              {decision.simulationResult.projectedDemandKw} kW
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Shed: {decision.simulationResult.shedLoadKw} kW • Protected: {decision.simulationResult.protectedLoadKw} kW
                            </div>
                          </div>
                          <div className="glass-panel" style={{ padding: '10px' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>BESS Impact</div>
                            <div className="telemetry-val" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                              {decision.simulationResult.projectedBatterySoc}% SOC
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Autonomy buffer: {decision.simulationResult.batteryBufferHours}h
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Generation contribution: {decision.simulationResult.standbyGeneratorId
                            ? <>standby generator <strong style={{ color: '#fff' }}>{decision.simulationResult.standbyGeneratorId}</strong> (+150 kW)</>
                            : 'no standby generator available at this station'}
                        </div>
                        <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '16px', margin: 0 }}>
                          {decision.simulationResult.mitigationStrategy.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Requires approval by: <strong style={{ color: '#fff' }}>{decision.requiredApproval}</strong> (current role: {activeRole})
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700, flex: 1 }}
                          onClick={onApproveDecision}
                          disabled={decisionLoading || !decision.simulationResult || !canApprove}
                          title={!canApprove ? `Requires ${decision.requiredApproval} or National Operator role` : (!decision.simulationResult ? 'Run the simulation first' : undefined)}
                        >
                          <ThumbsUp size={14} /> ENGAGE EMERGENCY TRIAGE
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                          onClick={onRejectDecision}
                          disabled={decisionLoading}
                        >
                          <ThumbsDown size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {decision.approvalStatus === 'EXECUTED' && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-normal)' }}>
                      <CheckCircle2 size={14} /> Emergency triage engaged — approved by {decision.approvedBy}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Load {decision.actionResult?.loadKw} kW ({decision.actionResult?.shedLoadKw} kW shed) • Protected {decision.actionResult?.protectedLoadKw} kW • BESS {decision.actionResult?.batterySoc}%
                      {decision.actionResult?.standbyActivated && <> • Standby generator {decision.actionResult.standbyActivated} activated</>}
                      {decision.actionResult?.standbyActivated === null && <> • No standby generator available</>}
                    </div>
                    <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.72rem', marginTop: 4, alignSelf: 'flex-start' }} onClick={onDismissDecision}>
                      Dismiss
                    </button>
                  </div>
                )}

                {decision.approvalStatus === 'REJECTED' && (
                  <div style={{ background: 'rgba(100, 116, 139, 0.12)', border: '1px solid rgba(100, 116, 139, 0.35)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Recommendation rejected by {decision.approvedBy} — no station state was changed.
                    </div>
                    <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.72rem', marginTop: 4, alignSelf: 'flex-start' }} onClick={onDismissDecision}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
              Prototype/simulation only — figures are computed from live station telemetry, not real NCPOR satellite data.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(0,0,0,0.4)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <button className="btn btn-outline" onClick={onClose}>
            <ShieldAlert size={14} /> Stand Down & Exit Mode
          </button>
        </div>
      </div>
    </div>
  );
};
