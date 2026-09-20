import React, { useState, useEffect } from 'react';
import { Asset, ActionDecision, AuditEvent } from '../../types';
import { X, Activity, Thermometer, Zap, Clock, ShieldAlert, Wrench, CheckCircle2, Bot, Sliders, ThumbsUp, ThumbsDown, RefreshCw, History } from 'lucide-react';
import { api } from '../../services/api';

// Mirrors the backend's minimal RBAC allowlist (ai_engine.APPROVER_ROLE_ALLOWLIST) so the
// Approve button can be disabled client-side; the backend re-checks this and is the source of truth.
const APPROVER_ROLE_ALLOWLIST: Record<string, string[]> = {
  'Station Commander': ['Station Commander', 'National Operator'],
  'Chief Systems Engineer': ['Chief Systems Engineer', 'Station Commander', 'National Operator']
};

interface AssetDetailDrawerProps {
  asset: Asset | null;
  onClose: () => void;
  onCreateWorkOrder: (asset: Asset) => void;
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

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = ({
  asset,
  onClose,
  onCreateWorkOrder,
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
  const [activeSubTab, setActiveSubTab] = useState<'telemetry' | 'spectrum' | 'history'>('telemetry');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    if (!asset) return;
    api.getAudit(asset.stationId, asset.assetId).then(setAuditEvents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.assetId, asset?.stationId, decision?.approvalStatus]);

  if (!asset) return null;

  const isCritical = asset.status === 'critical' || asset.healthScore < 70;
  const isWarning = asset.status === 'warning';
  const isOffline = asset.status === 'offline';
  const canApprove = !decision ? false : (
    !decision.requiredApproval || (APPROVER_ROLE_ALLOWLIST[decision.requiredApproval] || [decision.requiredApproval, 'National Operator']).includes(activeRole)
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '420px',
      maxWidth: '90vw',
      height: '100vh',
      background: 'rgba(11, 23, 40, 0.96)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid var(--panel-border-bright)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--panel-border)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        background: 'rgba(16, 33, 56, 0.5)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className={`badge badge-${isOffline ? 'offline' : isCritical ? 'critical' : isWarning ? 'warning' : 'normal'}`}>
              {asset.status.toUpperCase()}
            </span>
            <span className="telemetry-val" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {asset.assetId}
            </span>
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            {asset.name}
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {asset.building} • Criticality: <strong style={{ color: 'var(--accent-cyan)' }}>{asset.criticality.toUpperCase()}</strong>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 4
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Sub tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--panel-border)',
        background: 'rgba(7, 18, 33, 0.6)'
      }}>
        {(['telemetry', 'spectrum', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: 'transparent',
              border: 'none',
              color: activeSubTab === tab ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderBottom: activeSubTab === tab ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Drawer Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {activeSubTab === 'telemetry' && (
          <>
            {/* Health Score Banner */}
            <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Asset Health Index
                </div>
                <div className="metric-value" style={{ color: isCritical ? 'var(--status-critical)' : isWarning ? 'var(--status-warning)' : 'var(--status-normal)' }}>
                  {asset.healthScore}%
                  <span className="metric-unit">/ 100</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Failure Risk</div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: asset.failureRisk === 'High' ? 'var(--status-critical)' : asset.failureRisk === 'Medium' ? 'var(--status-warning)' : 'var(--status-normal)'
                }}>
                  {asset.failureRisk} Risk
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Est. RUL: {asset.predictedFailureDays} days
                </div>
              </div>
            </div>

            {/* Live Telemetry Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div className="metric-label">
                  <Activity size={14} style={{ color: 'var(--accent-cyan)' }} /> Vibration
                </div>
                <div className="telemetry-val" style={{ fontSize: '1.4rem', fontWeight: 700, color: asset.vibration > 3.0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                  {asset.vibration} <span className="metric-unit">mm/s</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Baseline: &lt;1.8 mm/s
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '12px' }}>
                <div className="metric-label">
                  <Thermometer size={14} style={{ color: 'var(--status-warning)' }} /> Temperature
                </div>
                <div className="telemetry-val" style={{ fontSize: '1.4rem', fontWeight: 700, color: asset.temperature > 75 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                  {asset.temperature}°C
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Max safe: 85°C
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '12px' }}>
                <div className="metric-label">
                  <Zap size={14} style={{ color: 'var(--status-normal)' }} /> Active Load
                </div>
                <div className="telemetry-val" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {asset.powerKw} <span className="metric-unit">kW</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Rated: 200 kW
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '12px' }}>
                <div className="metric-label">
                  <Clock size={14} style={{ color: 'var(--accent-ice)' }} /> Total Runtime
                </div>
                <div className="telemetry-val" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {asset.runtimeHours.toLocaleString()} <span className="metric-unit">hrs</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Next overhaul: 10,000h
                </div>
              </div>
            </div>

            {/* AI Diagnostics & Action Banner */}
            <div style={{
              background: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 229, 255, 0.08)',
              border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 229, 255, 0.3)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ShieldAlert size={16} color={isCritical ? 'var(--status-critical)' : 'var(--accent-cyan)'} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: isCritical ? '#fca5a5' : 'var(--accent-cyan)' }}>
                  AI Prescriptive Recommendation
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.4 }}>
                {asset.recommendedAction}
              </p>
            </div>

            {/* AI Recommendation -> Simulation -> Human Approval -> Action */}
            <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={16} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
                  Decision Support Workflow
                </span>
              </div>

              {!decision && !decisionLoading && (
                <button className="btn btn-cyan" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={onRequestRecommendation}>
                  <Bot size={14} /> Ask AI for Recommendation
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

                  <div style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: 4 }}>AI Recommendation</div>
                    <div style={{ fontSize: '0.85rem', color: '#fff', marginBottom: 6 }}>{decision.recommendation}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected impact: {decision.expectedImpact}</div>
                  </div>

                  {decision.proposedAction !== 'NONE' && decision.approvalStatus === 'PENDING' && (
                    <>
                      {!decision.simulationResult && decision.simulationRequest && (
                        <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={onRunSimulation} disabled={decisionLoading}>
                          <Sliders size={14} /> View Simulation
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
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Projected Load / Power Gap</div>
                              <div className="telemetry-val" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                {decision.simulationResult.projectedDemandKw} kW
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {decision.simulationResult.demandDeltaPct > 0 ? '+' : ''}{decision.simulationResult.demandDeltaPct}% vs baseline ({decision.simulationResult.baseDemandKw} kW)
                              </div>
                            </div>
                            <div className="glass-panel" style={{ padding: '10px' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Fuel Runway / Battery Buffer</div>
                              <div className="telemetry-val" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                {decision.simulationResult.fuelRunwayDays}d / {decision.simulationResult.batteryBufferHours}h
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                Burn: {decision.simulationResult.projectedFuelBurnLph} L/h
                              </div>
                            </div>
                          </div>
                          {decision.simulationResult.criticalLoadsAffected.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                              ⚠️ Affected systems: {decision.simulationResult.criticalLoadsAffected.join(', ')}
                            </div>
                          )}
                          <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '16px', margin: 0 }}>
                            {decision.simulationResult.mitigationStrategy.slice(0, 3).map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Requires approval by: <strong style={{ color: '#fff' }}>{decision.requiredApproval}</strong> (current role: {activeRole})
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '8px 14px', fontSize: '0.8rem', flex: 1 }}
                            onClick={onApproveDecision}
                            disabled={decisionLoading || !canApprove}
                            title={!canApprove ? `Requires ${decision.requiredApproval} or National Operator role` : undefined}
                          >
                            <ThumbsUp size={14} /> Approve Action
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '8px 14px', fontSize: '0.8rem', flex: 1 }}
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
                        <CheckCircle2 size={14} /> Action executed — approved by {decision.approvedBy}
                      </div>
                      {decision.actionResult?.assetStatus && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {asset.assetId} → {decision.actionResult.assetStatus.toUpperCase()}
                          {decision.actionResult.backupActivated && ` • ${decision.actionResult.backupActivated} activated as standby`}
                          {decision.actionResult.backupActivated === null && ` • No standby generator available — station degraded`}
                        </div>
                      )}
                      {decision.actionResult?.workOrderId && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Work order <strong style={{ color: '#fff' }}>{decision.actionResult.workOrderId}</strong> created
                        </div>
                      )}
                      <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.72rem', marginTop: 4, alignSelf: 'flex-start' }} onClick={onDismissDecision}>
                        Dismiss
                      </button>
                    </div>
                  )}

                  {decision.approvalStatus === 'REJECTED' && (
                    <div style={{ background: 'rgba(100, 116, 139, 0.12)', border: '1px solid rgba(100, 116, 139, 0.35)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Recommendation rejected by {decision.approvedBy}
                      </div>
                      <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.72rem', marginTop: 4, alignSelf: 'flex-start' }} onClick={onDismissDecision}>
                        Dismiss
                      </button>
                    </div>
                  )}

                  {decision.proposedAction === 'NONE' && (
                    <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.72rem', alignSelf: 'flex-start' }} onClick={onDismissDecision}>
                      Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeSubTab === 'spectrum' && (
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: 10 }}>
              FFT Vibration Frequency Spectrum (0 - 1000 Hz)
            </div>
            {/* SVG Harmonic Spectrum */}
            <svg viewBox="0 0 300 120" style={{ width: '100%', height: '120px', background: 'rgba(7, 18, 33, 0.8)', borderRadius: '6px' }}>
              {/* Grid lines */}
              <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />
              <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />
              <line x1="0" y1="90" x2="300" y2="90" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3,3" />

              {/* Spectrum path */}
              <path
                d={asset.vibration > 3.0
                  ? "M 10 110 Q 30 108 50 105 T 90 20 T 130 95 T 180 35 T 220 100 T 260 105 T 290 108"
                  : "M 10 110 Q 40 105 70 85 T 120 105 T 170 95 T 220 105 T 290 110"}
                fill="none"
                stroke={asset.vibration > 3.0 ? "var(--status-critical)" : "var(--accent-cyan)"}
                strokeWidth="2.5"
              />
              {/* Anomaly peak highlight */}
              {asset.vibration > 3.0 && (
                <>
                  <circle cx="90" cy="20" r="4" fill="var(--status-critical)" />
                  <text x="96" y="24" fill="var(--status-critical)" fontSize="9" fontFamily="monospace">2X Harmonic (4.85 mm/s)</text>
                  <circle cx="180" cy="35" r="3.5" fill="var(--status-warning)" />
                  <text x="186" y="38" fill="var(--status-warning)" fontSize="8" fontFamily="monospace">Outer Race Ball Pass</text>
                </>
              )}
            </svg>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Peak detected at 120 Hz shaft frequency matching roller bearing element pitting.
            </div>
          </div>
        )}

        {activeSubTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {auditEvents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  <History size={13} /> Live Activity Log
                </div>
                {auditEvents.map((ev, i) => (
                  <div key={i} className="glass-panel" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span className="telemetry-val">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span>{ev.actor}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#fff', marginTop: 2 }}>{ev.action}</div>
                  </div>
                ))}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  Historical maintenance records below (prototype/demo data)
                </div>
              </div>
            )}
            <div className="glass-panel" style={{ padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                2026-06-10 • Routine 8,000h Service
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: 4 }}>
                Synthetic lubricating oil replaced (Castrol Arctic ATF). Filter element cleaned.
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                2026-03-22 • Vibration Baseline Calibration
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: 4 }}>
                Tri-axial piezoelectric accelerometer recalibrated with Indian Polar Registry standards.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--panel-border)',
        background: 'rgba(11, 23, 40, 0.9)',
        display: 'flex',
        gap: 10
      }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => {
            onCreateWorkOrder(asset);
          }}
        >
          <Wrench size={16} /> Create Work Order
        </button>
        <button
          className="btn btn-outline"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};
