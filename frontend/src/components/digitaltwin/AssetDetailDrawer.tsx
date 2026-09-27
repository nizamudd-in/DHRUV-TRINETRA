import React, { useState, useEffect } from 'react';
import { Asset, ActionDecision, AuditEvent, FailureCascade, AssetHealthDetail } from '../../types';
import { X, Activity, Thermometer, Zap, Clock, ShieldAlert, Wrench, CheckCircle2, Bot, Sliders, ThumbsUp, ThumbsDown, RefreshCw, History, GitBranch, ArrowDown, Battery, ShieldCheck, Crosshair } from 'lucide-react';
import { api } from '../../services/api';
import { TrendChart } from '../common/TrendChart';
import { DataSourceBadge } from '../common/DataSourceBadge';

const severityBadgeClass = (sev: string): string => {
  if (sev === 'CRITICAL' || sev === 'HIGH') return 'critical';
  if (sev === 'MEDIUM') return 'warning';
  return 'normal';
};

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
  onLocateInDigitalTwin?: (asset: Asset) => void;
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
  onLocateInDigitalTwin,
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
  const [activeSubTab, setActiveSubTab] = useState<'telemetry' | 'trend' | 'cascade' | 'history'>('telemetry');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [cascade, setCascade] = useState<FailureCascade | null>(null);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeError, setCascadeError] = useState<string | null>(null);
  const [healthDetail, setHealthDetail] = useState<AssetHealthDetail | null>(null);

  useEffect(() => {
    if (!asset) return;
    api.getAudit(asset.stationId, asset.assetId).then(setAuditEvents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.assetId, asset?.stationId, decision?.approvalStatus]);

  // Health breakdown ("Calculated from: vibration/temperature/runtime/load") — re-fetched
  // whenever the asset's own telemetry changes (vibration/temperature/status), not just on select.
  useEffect(() => {
    if (!asset) return;
    api.getAssetHealth(asset.assetId).then(setHealthDetail);
  }, [asset?.assetId, asset?.vibration, asset?.temperature, asset?.status, asset?.powerKw]);

  // A different asset was selected — the previous asset's cascade result no longer applies.
  useEffect(() => {
    setCascade(null);
    setCascadeError(null);
  }, [asset?.assetId]);

  const handleRunCascade = async () => {
    if (!asset) return;
    setCascadeLoading(true);
    setCascadeError(null);
    try {
      const result = await api.simulateFailureCascade(asset.stationId, asset.assetId, 'OFFLINE');
      setCascade(result);
    } catch (e: any) {
      setCascadeError(e?.message || 'Failure cascade simulation unavailable.');
    } finally {
      setCascadeLoading(false);
    }
  };

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
        {(['telemetry', 'trend', 'cascade', 'history'] as const).map(tab => (
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

            {/* Health model transparency caption — kept to one compact line, not a redesign */}
            {healthDetail?.healthModelApplied && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: -10 }}>
                Calculated from: {Object.keys(healthDetail.healthComponents).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}
                {healthDetail.healthFactors.length > 0 && healthDetail.healthFactors[0] !== 'All monitored telemetry within nominal thresholds' && (
                  <> — {healthDetail.healthFactors[0]}</>
                )}
                <span style={{ fontStyle: 'italic' }}> (prototype telemetry-based model, not trained ML)</span>
              </div>
            )}

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

        {activeSubTab === 'trend' && (
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                24h Vibration &amp; Temperature Trend
              </div>
              {healthDetail && <DataSourceBadge kind="SIMULATED" />}
            </div>

            {!healthDetail && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Loading historical telemetry…
              </div>
            )}

            {healthDetail && (
              <TrendChart
                timeLabels={healthDetail.history.map(h => h.time)}
                series={[
                  { label: 'Vibration', color: '#00e5ff', points: healthDetail.history.map(h => h.vibration), unit: ' mm/s' },
                  { label: 'Temperature', color: '#f59e0b', points: healthDetail.history.map(h => h.temperature), unit: '°C' }
                ]}
                thresholds={healthDetail.thresholds.vibration ? [
                  { label: 'Vib. warning', value: healthDetail.thresholds.vibration.warning, color: '#f59e0b' },
                  { label: 'Vib. critical', value: healthDetail.thresholds.vibration.critical, color: '#ef4444' }
                ] : []}
                height={170}
              />
            )}
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Threshold lines are the same vibration warning/critical anchors the prototype health model scores against.
            </div>
          </div>
        )}

        {activeSubTab === 'cascade' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
                Failure Cascade Simulation
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              "If {asset.assetId} fails, what dependent systems are affected?" — prototype dependency model, computed from live station state. Simulation only; nothing is changed until an action is approved.
            </div>

            {!cascade && !cascadeLoading && (
              <button className="btn btn-cyan" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={handleRunCascade}>
                <GitBranch size={14} /> Run Failure Cascade Simulation
              </button>
            )}

            {cascadeLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                <RefreshCw size={14} className="radar-spinner" /> Tracing dependency graph…
              </div>
            )}

            {cascadeError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#fca5a5' }}>
                {cascadeError}
              </div>
            )}

            {cascade && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trigger</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{cascade.triggerAssetName} — {cascade.triggerFailure} Failure</div>
                  </div>
                  <span className={`badge badge-${severityBadgeClass(cascade.severity)}`}>{cascade.severity}</span>
                </div>

                {/* Cascade chain */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {cascade.cascadeSteps.map((s, i) => (
                    <React.Fragment key={i}>
                      <div className="glass-panel" style={{ padding: '8px 10px', borderLeft: `3px solid var(--status-${severityBadgeClass(s.severity) === 'critical' ? 'critical' : severityBadgeClass(s.severity) === 'warning' ? 'warning' : 'normal'})` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {s.sequence}. {s.source} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>[{s.relationship}]</span> → {s.target}
                          </span>
                          <span className={`badge badge-${severityBadgeClass(s.severity)}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>{s.severity}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#fff', marginTop: 3 }}>{s.effect}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.explanation}</div>
                      </div>
                      {i < cascade.cascadeSteps.length - 1 && (
                        <ArrowDown size={12} color="var(--text-muted)" style={{ alignSelf: 'center', margin: '1px 0' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Energy / BESS summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="glass-panel" style={{ padding: '10px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Lost Capacity / Margin</div>
                    <div className="telemetry-val" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      -{cascade.lostCapacityKw} kW
                    </div>
                    <div style={{ fontSize: '0.68rem', color: cascade.projectedGenerationMarginKw < 0 ? 'var(--status-critical)' : 'var(--text-muted)' }}>
                      Margin: {cascade.projectedGenerationMarginKw} kW
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '10px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}><Battery size={11} style={{ verticalAlign: -1 }} /> Battery Impact</div>
                    <div className="telemetry-val" style={{ fontSize: '1.05rem', fontWeight: 700, color: cascade.batteryImpact.criticalDependency ? 'var(--status-critical)' : '#fff' }}>
                      {cascade.batteryImpact.powerGapKw > 0 ? `${cascade.batteryImpact.currentSoc}% → ${cascade.batteryImpact.projectedSoc}%` : 'Not required'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {cascade.batteryImpact.bufferHours != null ? `Buffer: ${cascade.batteryImpact.bufferHours}h` : 'No power gap'}
                    </div>
                  </div>
                </div>

                {/* Affected systems */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Affected Systems / Domains
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cascade.affectedAssets.map((a, i) => (
                      <span key={`a-${i}`} className="badge badge-info" style={{ fontSize: '0.65rem' }}>{a}</span>
                    ))}
                    {cascade.affectedDomains.map((d, i) => (
                      <span key={`d-${i}`} className="badge badge-offline" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{d}</span>
                    ))}
                  </div>
                </div>

                {cascade.operationalImpact.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Operational Impact
                    </div>
                    <ul style={{ fontSize: '0.78rem', color: '#fff', paddingLeft: '16px', margin: 0, lineHeight: 1.5 }}>
                      {cascade.operationalImpact.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      <ShieldCheck size={12} style={{ verticalAlign: -1 }} /> {cascade.missionImpact}
                    </div>
                  </div>
                )}

                {/* Final projected risk */}
                <div style={{ background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>Projected Cross-Domain Risk</span>
                    <span className={`badge badge-${severityBadgeClass(cascade.finalRisk.overallRisk)}`}>{cascade.finalRisk.overallRisk}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#fff' }}>{cascade.finalRisk.overallScore} / 100 — {cascade.finalRisk.primaryDriver}</div>
                </div>

                {/* Mitigations + AI recommendation hand-off */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Available Mitigations (require human approval)
                  </div>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '16px', margin: 0, lineHeight: 1.5 }}>
                    {cascade.mitigations.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: '0.8rem', alignSelf: 'flex-start' }}
                    onClick={() => { setActiveSubTab('telemetry'); onRequestRecommendation?.(); }}
                  >
                    <Bot size={14} /> Get AI Recommendation for {cascade.triggerAssetId}
                  </button>
                </div>
              </div>
            )}
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
        {onLocateInDigitalTwin && (
          <button
            className="btn btn-cyan"
            onClick={() => onLocateInDigitalTwin(asset)}
            title="Jump to the 3D Digital Twin and fly the camera to this asset"
          >
            <Crosshair size={16} /> Locate in Digital Twin
          </button>
        )}
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
