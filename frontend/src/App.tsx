import React, { useState, useEffect } from 'react';
import { ActiveTab, Station, Asset, Alert, InventoryItem, WorkOrder, EdgeStatus, ActionDecision, CrossDomainRisk } from './types';
import { api, initialStations, initialAssets, initialAlerts, initialInventory, initialWorkOrders } from './services/api';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MissionControlDashboard } from './components/dashboard/MissionControlDashboard';
import { TwinCanvas3D } from './components/digitaltwin/TwinCanvas3D';
import { AssetDetailDrawer } from './components/digitaltwin/AssetDetailDrawer';
import { AssetRegistryPanel } from './components/digitaltwin/AssetRegistryPanel';
import { SensorTable } from './components/digitaltwin/SensorTable';
import { StationHealthPanel } from './components/digitaltwin/StationHealthPanel';
import { EnergyManagement } from './components/energy/EnergyManagement';
import { EquipmentHealth } from './components/equipment/EquipmentHealth';
import { SmartLogistics } from './components/logistics/SmartLogistics';
import { EnvironmentMonitor } from './components/environment/EnvironmentMonitor';
import { AlertEngine } from './components/alerts/AlertEngine';
import { ScenarioSimulator } from './components/simulation/ScenarioSimulator';
import { MaintenanceKanban } from './components/maintenance/MaintenanceKanban';
import { AICopilot } from './components/ai/AICopilot';
import { ReportCenter } from './components/reports/ReportCenter';
import { EmergencyModeModal } from './components/emergency/EmergencyModeModal';
import { DemoTourRunner } from './components/demo/DemoTourRunner';
import { ResetDemoModal } from './components/common/ResetDemoModal';
import { ErrorState } from './components/common/StateViews';
import './styles/theme.css';

export const App: React.FC = () => {
  const [stations, setStations] = useState<Station[]>(initialStations);
  const [activeStationId, setActiveStationId] = useState<'BHARATI' | 'MAITRI'>('BHARATI');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [activeDecision, setActiveDecision] = useState<ActionDecision | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [demoAnomalyAssetId, setDemoAnomalyAssetId] = useState<string | null>(null);
  // Kept separate from activeDecision above: the Emergency modal and the asset drawer can
  // both be open independently, and must not stomp on each other's in-progress decision.
  const [activeEmergencyDecision, setActiveEmergencyDecision] = useState<ActionDecision | null>(null);
  const [emergencyDecisionLoading, setEmergencyDecisionLoading] = useState(false);
  const [emergencyDecisionError, setEmergencyDecisionError] = useState<string | null>(null);
  // Cross-Domain Risk: backend is the sole source of truth, never computed/cached client-side.
  // riskRefreshTrigger is bumped after any action that mutates station state, forcing a re-fetch.
  const [crossDomainRisk, setCrossDomainRisk] = useState<CrossDomainRisk | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [riskRefreshTrigger, setRiskRefreshTrigger] = useState(0);
  const [edgeStatus, setEdgeStatus] = useState<EdgeStatus>({
    is_online: true,
    status: 'ONLINE',
    queue_depth: 0,
    last_sync: '07:42 IST (Nominal)',
    station_edge_nodes: []
  });

  // UI state
  const [activeRole, setActiveRole] = useState('National Operator');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [vibrationOverlay, setVibrationOverlay] = useState(false);
  const [showResetDemoModal, setShowResetDemoModal] = useState(false);
  const [resetDemoLoading, setResetDemoLoading] = useState(false);
  const [resetDemoError, setResetDemoError] = useState<string | null>(null);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

  // Initial Data Load — falls back to bundled initial* mock state on failure so the
  // app never renders blank; the banner below surfaces the failure instead.
  const loadInitialData = React.useCallback(async () => {
    try {
      const [sts, asts, alts, inv, wos] = await Promise.all([
        api.getStations(),
        api.getAssets(),
        api.getAlerts(),
        api.getInventory(),
        api.getWorkOrders()
      ]);
      setStations(sts);
      setAssets(asts);
      setAlerts(alts);
      setInventory(inv);
      setWorkOrders(wos);
      setInitialLoadError(null);
    } catch (e: any) {
      setInitialLoadError(e?.message || 'Could not reach the POLAR-TWIN backend. Showing last known data.');
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Cross-Domain Risk: re-fetch whenever the active station changes or riskRefreshTrigger is bumped
  // (after anomaly inject/reset or any approved decision — see those handlers below).
  useEffect(() => {
    let cancelled = false;
    setRiskLoading(true);
    api.getCrossDomainRisk(activeStationId)
      .then(r => { if (!cancelled) { setCrossDomainRisk(r); setRiskError(null); } })
      .catch(e => { if (!cancelled) setRiskError(e?.message || 'Risk calculation unavailable.'); })
      .finally(() => { if (!cancelled) setRiskLoading(false); });
    return () => { cancelled = true; };
  }, [activeStationId, riskRefreshTrigger]);

  // Continuous subtle telemetry pulse (life-like simulator)
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(prev => prev.map(a => {
        // subtle jitter for realistic sensor stream
        if (a.status === 'critical') return a;
        const jitter = (Math.random() - 0.5) * 0.04;
        return {
          ...a,
          vibration: Number(Math.max(0.2, a.vibration + jitter).toFixed(2)),
          temperature: Number((a.temperature + (Math.random() - 0.5) * 0.2).toFixed(1))
        };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentStation = stations.find(s => s.stationId === activeStationId) || stations[0] || {
    stationId: 'BHARATI',
    name: 'Bharati Station',
    coordinates: '69°24\'29"S, 76°11\'14"E',
    region: 'Larsemann Hills (Coastal)',
    established: 2012,
    status: 'operational',
    healthScore: 92.4,
    connectivity: 'ONLINE',
    currentTemp: -28.4,
    windSpeedKts: 36.5,
    personnelCount: 24,
    fuelDaysRemaining: 142,
    powerLoadKw: 345.0,
    powerCapacityKw: 600.0,
    batterySoc: 84.0,
    healthBreakdown: { energy: 88.5, equipment: 94.0, logistics: 91.2, environment: 95.0, connectivity: 89.0, operations: 94.5 }
  };

  const stationAssets = assets.filter(a => a.stationId === activeStationId);
  const stationAlerts = alerts.filter(a => a.stationId === activeStationId);
  const stationInventory = inventory.filter(i => i.stationId === activeStationId);
  const stationWorkOrders = workOrders.filter(w => w.stationId === activeStationId);

  // Satellite Toggle (Store-and-forward edge buffer)
  const handleToggleSatellite = async (online: boolean) => {
    const res = await api.toggleSatellite(online);
    setEdgeStatus(res);
  };

  // Resolve which generator the demo anomaly controller targets for the active station,
  // dynamically (never a hardcoded 'GEN-02'/'M-GEN-01' literal) — prefers whichever
  // generator is already flagged warning/critical, falling back to the station's first generator.
  const resolveAnomalyAssetId = (): string => {
    const atRisk = stationAssets.find(a => a.type === 'generator' && (a.status === 'warning' || a.status === 'critical'));
    if (atRisk) return atRisk.assetId;
    const anyGen = stationAssets.find(a => a.type === 'generator');
    return anyGen ? anyGen.assetId : (stationAssets[0]?.assetId || '');
  };

  // Anomaly Injection
  const handleInjectAnomaly = async () => {
    const targetId = resolveAnomalyAssetId();
    if (!targetId) return;
    setDemoAnomalyAssetId(targetId);
    await api.injectAnomaly(targetId);
    const [asts, alts, sts] = await Promise.all([
      api.getAssets(),
      api.getAlerts(),
      api.getStations()
    ]);
    setAssets(asts);
    setAlerts(alts);
    setStations(sts);
    setRiskRefreshTrigger(t => t + 1);
    const target = asts.find(a => a.assetId === targetId);
    if (target) handleSelectAsset(target);
  };

  const handleResetAnomaly = async () => {
    const targetId = demoAnomalyAssetId || resolveAnomalyAssetId();
    if (!targetId) return;
    await api.resetAnomaly(targetId);
    const [asts, alts, sts, wos] = await Promise.all([
      api.getAssets(),
      api.getAlerts(),
      api.getStations(),
      api.getWorkOrders()
    ]);
    setAssets(asts);
    setAlerts(alts);
    setStations(sts);
    setWorkOrders(wos);
    setRiskRefreshTrigger(t => t + 1);
    if (activeDecision && activeDecision.assetId === targetId) {
      setActiveDecision(null);
      setDecisionError(null);
    }
    setDemoAnomalyAssetId(null);
  };

  // Global Demo Reset (P3 Phase 7): a REAL backend state reset covering both stations,
  // not a browser reload and not scoped to a single asset like handleResetAnomaly above.
  const handleResetDemo = async () => {
    setResetDemoLoading(true);
    setResetDemoError(null);
    try {
      await api.resetDemo();
      const [sts, asts, alts, inv, wos] = await Promise.all([
        api.getStations(),
        api.getAssets(),
        api.getAlerts(),
        api.getInventory(),
        api.getWorkOrders()
      ]);
      setStations(sts);
      setAssets(asts);
      setAlerts(alts);
      setInventory(inv);
      setWorkOrders(wos);
      setEdgeStatus({
        is_online: true,
        status: 'ONLINE',
        queue_depth: 0,
        last_sync: '07:42 IST (Nominal)',
        station_edge_nodes: []
      });
      setSelectedAsset(null);
      setActiveDecision(null);
      setDecisionError(null);
      setActiveEmergencyDecision(null);
      setEmergencyDecisionError(null);
      setShowEmergencyModal(false);
      setDemoAnomalyAssetId(null);
      setRiskRefreshTrigger(t => t + 1);
      setShowResetDemoModal(false);
    } catch (e: any) {
      setResetDemoError(e?.message || 'Reset failed. Please try again.');
    } finally {
      setResetDemoLoading(false);
    }
  };

  // Asset selection: switching to a different asset invalidates any decision panel in view
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setActiveDecision(prev => (prev && prev.assetId === asset.assetId ? prev : null));
    setDecisionError(null);
  };

  const handleCloseAssetDrawer = () => {
    setSelectedAsset(null);
    setActiveDecision(null);
    setDecisionError(null);
  };

  // "Locate in Digital Twin" (high priority): navigates to the 3D Digital Twin tab and
  // selects the asset — TwinCanvas3D reacts to selectedAsset changing by flying the camera
  // to the asset's real GLB anchor and highlighting it, wherever selection came from.
  const handleLocateInDigitalTwin = (asset: Asset) => {
    setActiveTab('digitaltwin');
    handleSelectAsset(asset);
  };

  // AI Recommendation -> Simulation -> Human Approval -> Action
  const handleRequestRecommendation = async (asset: Asset) => {
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      const dec = await api.requestRecommendation(asset.stationId, asset.assetId);
      setActiveDecision(dec);
    } catch (e: any) {
      setDecisionError(e?.message || 'Failed to reach AI recommendation service.');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Cross-Domain Risk -> Primary Driver -> AI Recommendation: connects the risk panel to the
  // existing per-asset decision flow (opens the drawer and immediately requests a recommendation
  // for the asset the risk engine identified as the primary driver).
  const handleInspectRiskDriver = (assetId: string) => {
    const asset = stationAssets.find(a => a.assetId === assetId);
    if (!asset) return;
    handleSelectAsset(asset);
    handleRequestRecommendation(asset);
  };

  const handleRunDecisionSimulation = async () => {
    if (!activeDecision) return;
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      const dec = await api.simulateDecision(activeDecision.id);
      setActiveDecision(dec);
    } catch (e: any) {
      setDecisionError(e?.message || 'Simulation failed.');
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleApproveDecision = async () => {
    if (!activeDecision) return;
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      const dec = await api.approveDecision(activeDecision.id, activeRole);
      setActiveDecision(dec);
      const [asts, alts, sts, wos] = await Promise.all([
        api.getAssets(),
        api.getAlerts(),
        api.getStations(),
        api.getWorkOrders()
      ]);
      setAssets(asts);
      setAlerts(alts);
      setStations(sts);
      setWorkOrders(wos);
      setRiskRefreshTrigger(t => t + 1);
      const updatedAsset = asts.find(a => a.assetId === dec.assetId);
      if (updatedAsset) setSelectedAsset(updatedAsset);
    } catch (e: any) {
      setDecisionError(e?.message || 'Approval failed.');
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleRejectDecision = async () => {
    if (!activeDecision) return;
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      const dec = await api.rejectDecision(activeDecision.id, activeRole);
      setActiveDecision(dec);
    } catch (e: any) {
      setDecisionError(e?.message || 'Rejection failed.');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Emergency Triage: AI Recommendation -> Simulation -> Human Approval -> Action
  // (same decision/approval architecture as above, kept in a separate state slot — see note above)
  const handleRequestEmergencyRecommendation = async () => {
    setEmergencyDecisionLoading(true);
    setEmergencyDecisionError(null);
    try {
      const dec = await api.requestEmergencyRecommendation(activeStationId);
      setActiveEmergencyDecision(dec);
    } catch (e: any) {
      setEmergencyDecisionError(e?.message || 'Failed to reach AI recommendation service.');
    } finally {
      setEmergencyDecisionLoading(false);
    }
  };

  const handleRunEmergencyDecisionSimulation = async () => {
    if (!activeEmergencyDecision) return;
    setEmergencyDecisionLoading(true);
    setEmergencyDecisionError(null);
    try {
      const dec = await api.simulateDecision(activeEmergencyDecision.id);
      setActiveEmergencyDecision(dec);
    } catch (e: any) {
      setEmergencyDecisionError(e?.message || 'Simulation failed.');
    } finally {
      setEmergencyDecisionLoading(false);
    }
  };

  const handleApproveEmergencyDecision = async () => {
    if (!activeEmergencyDecision) return;
    setEmergencyDecisionLoading(true);
    setEmergencyDecisionError(null);
    try {
      const dec = await api.approveDecision(activeEmergencyDecision.id, activeRole);
      setActiveEmergencyDecision(dec);
      const [asts, alts, sts] = await Promise.all([
        api.getAssets(),
        api.getAlerts(),
        api.getStations()
      ]);
      setAssets(asts);
      setAlerts(alts);
      setStations(sts);
      setRiskRefreshTrigger(t => t + 1);
    } catch (e: any) {
      setEmergencyDecisionError(e?.message || 'Approval failed.');
    } finally {
      setEmergencyDecisionLoading(false);
    }
  };

  const handleRejectEmergencyDecision = async () => {
    if (!activeEmergencyDecision) return;
    setEmergencyDecisionLoading(true);
    setEmergencyDecisionError(null);
    try {
      const dec = await api.rejectDecision(activeEmergencyDecision.id, activeRole);
      setActiveEmergencyDecision(dec);
    } catch (e: any) {
      setEmergencyDecisionError(e?.message || 'Rejection failed.');
    } finally {
      setEmergencyDecisionLoading(false);
    }
  };

  const handleCloseEmergencyModal = () => {
    setShowEmergencyModal(false);
    setActiveEmergencyDecision(null);
    setEmergencyDecisionError(null);
  };

  // Acknowledge Alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    await api.acknowledgeAlert(alertId);
    setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, acknowledged: true } : a));
  };

  // Create Work Order
  const handleCreateWorkOrder = async (orderData: Partial<WorkOrder>) => {
    const newWo = await api.createWorkOrder({
      ...orderData,
      stationId: activeStationId
    });
    setWorkOrders(prev => [newWo, ...prev]);
    setActiveTab('maintenance');
    if (selectedAsset) handleCloseAssetDrawer();
  };

  // Update Work Order Status
  const handleUpdateWorkOrderStatus = (orderId: string, status: WorkOrder['status']) => {
    setWorkOrders(prev => prev.map(w => w.orderId === orderId ? { ...w, status } : w));
  };

  const handleToggleChecklist = (orderId: string, itemIndex: number) => {
    setWorkOrders(prev => prev.map(w => {
      if (w.orderId !== orderId) return w;
      const updated = [...w.checklist];
      updated[itemIndex].done = !updated[itemIndex].done;
      return { ...w, checklist: updated };
    }));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Mission Control Header */}
      <Header
        currentStation={currentStation}
        onSelectStation={setActiveStationId}
        edgeStatus={edgeStatus}
        onToggleSatellite={handleToggleSatellite}
        onOpenEmergency={() => setShowEmergencyModal(true)}
        onStartDemo={() => setShowDemoTour(true)}
        activeRole={activeRole}
        onSelectRole={setActiveRole}
        onOpenResetDemo={() => setShowResetDemoModal(true)}
      />

      {/* Main Workspace Layout: Sidebar + Screen Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'emergency') {
              setShowEmergencyModal(true);
            } else {
              setActiveTab(tab);
            }
          }}
          unacknowledgedAlertsCount={alerts.filter(a => !a.acknowledged).length}
        />

        {/* Content Viewport */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 68px)' }}>
          {initialLoadError && (
            <div style={{ marginBottom: 20 }}>
              <ErrorState
                title="Backend connection issue"
                message={initialLoadError}
                onRetry={loadInitialData}
              />
            </div>
          )}
          {activeTab === 'dashboard' && (
            <MissionControlDashboard
              station={currentStation}
              assets={stationAssets}
              alerts={stationAlerts}
              inventory={stationInventory}
              onNavigateTab={setActiveTab}
              onSelectAsset={handleSelectAsset}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onInjectAnomaly={handleInjectAnomaly}
              onResetAnomaly={handleResetAnomaly}
              risk={crossDomainRisk}
              riskLoading={riskLoading}
              riskError={riskError}
              onInspectRiskDriver={handleInspectRiskDriver}
              onOpenEmergency={() => setShowEmergencyModal(true)}
            />
          )}

          {activeTab === 'digitaltwin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 120px)' }}>
              <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                    {currentStation.name} — Operational Digital Twin
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Real photogrammetry model, spatially-anchored assets, telemetry, health and simulation, connected
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    onClick={handleInjectAnomaly}
                  >
                    Inject Generator Anomaly
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    onClick={handleResetAnomaly}
                  >
                    Reset Normal
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, minHeight: 0 }}>
                <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <TwinCanvas3D
                    stationId={currentStation.stationId}
                    assets={stationAssets}
                    station={currentStation}
                    alerts={alerts}
                    unacknowledgedAlertsCount={alerts.filter(a => !a.acknowledged).length}
                    selectedAsset={selectedAsset}
                    onSelectAsset={handleSelectAsset}
                    vibrationOverlay={vibrationOverlay}
                    onToggleVibration={() => setVibrationOverlay(prev => !prev)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', minHeight: 0 }}>
                  <AssetRegistryPanel
                    assets={stationAssets}
                    station={currentStation}
                    selectedAssetId={selectedAsset?.assetId}
                    onSelectAsset={handleSelectAsset}
                  />
                  <StationHealthPanel
                    risk={crossDomainRisk}
                    loading={riskLoading}
                    station={currentStation}
                    unacknowledgedCriticalCount={alerts.filter(a => !a.acknowledged && (a.level === 'critical' || a.level === 'emergency')).length}
                  />
                  <SensorTable assets={stationAssets} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'energy' && (
            <EnergyManagement station={currentStation} assets={stationAssets} />
          )}

          {activeTab === 'equipment' && (
            <EquipmentHealth
              assets={stationAssets}
              onSelectAsset={handleSelectAsset}
              onCreateWorkOrder={(a) => {
                handleCloseAssetDrawer();
                handleCreateWorkOrder({ assetId: a.assetId, title: `Corrective Maintenance for ${a.name}` });
              }}
            />
          )}

          {activeTab === 'logistics' && (
            <SmartLogistics inventory={stationInventory} />
          )}

          {activeTab === 'environment' && (
            <EnvironmentMonitor station={currentStation} />
          )}

          {activeTab === 'alerts' && (
            <AlertEngine
              alerts={stationAlerts}
              assets={stationAssets}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onLocateInDigitalTwin={handleLocateInDigitalTwin}
              onCreateWorkOrder={(a) => {
                handleCreateWorkOrder({ assetId: a.assetId, title: `Resolution for Alert on ${a.name}` });
              }}
            />
          )}

          {activeTab === 'simulation' && (
            <ScenarioSimulator station={currentStation} />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceKanban
              workOrders={stationWorkOrders}
              assets={stationAssets}
              onCreateWorkOrder={handleCreateWorkOrder}
              onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
              onToggleChecklist={handleToggleChecklist}
            />
          )}

          {activeTab === 'copilot' && (
            <AICopilot
              station={currentStation}
              assets={stationAssets}
              selectedAsset={selectedAsset}
              onLocateInDigitalTwin={handleLocateInDigitalTwin}
              onCreateWorkOrder={(a) => handleCreateWorkOrder({ assetId: a.assetId, title: `AI Copilot-flagged review of ${a.name}` })}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'reports' && (
            <ReportCenter
              station={currentStation}
              assets={stationAssets}
              alerts={stationAlerts}
            />
          )}
        </main>
      </div>

      {/* Flyout Asset Details Drawer */}
      {selectedAsset && (
        <AssetDetailDrawer
          asset={selectedAsset}
          onClose={handleCloseAssetDrawer}
          onCreateWorkOrder={(a) => {
            handleCloseAssetDrawer();
            handleCreateWorkOrder({ assetId: a.assetId, title: `Overhaul & Inspection of ${a.name}` });
          }}
          onLocateInDigitalTwin={handleLocateInDigitalTwin}
          activeRole={activeRole}
          decision={activeDecision}
          decisionLoading={decisionLoading}
          decisionError={decisionError}
          onRequestRecommendation={() => handleRequestRecommendation(selectedAsset)}
          onRunSimulation={handleRunDecisionSimulation}
          onApproveDecision={handleApproveDecision}
          onRejectDecision={handleRejectDecision}
          onDismissDecision={() => { setActiveDecision(null); setDecisionError(null); }}
        />
      )}

      {/* Emergency Mode Modal */}
      {showEmergencyModal && (
        <EmergencyModeModal
          station={currentStation}
          onClose={handleCloseEmergencyModal}
          activeRole={activeRole}
          decision={activeEmergencyDecision}
          decisionLoading={emergencyDecisionLoading}
          decisionError={emergencyDecisionError}
          onRequestRecommendation={handleRequestEmergencyRecommendation}
          onRunSimulation={handleRunEmergencyDecisionSimulation}
          onApproveDecision={handleApproveEmergencyDecision}
          onRejectDecision={handleRejectEmergencyDecision}
          onDismissDecision={() => { setActiveEmergencyDecision(null); setEmergencyDecisionError(null); }}
        />
      )}

      {/* 5-Min Guided SIH Presentation Tour Runner */}
      {showDemoTour && (
        <DemoTourRunner
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
          onSelectStation={setActiveStationId}
          onInjectAnomaly={handleInjectAnomaly}
          onSelectAsset={handleSelectAsset}
          assets={stationAssets}
          onToggleSatellite={handleToggleSatellite}
          onClose={() => setShowDemoTour(false)}
        />
      )}

      {/* Global Demo Reset Confirmation */}
      {showResetDemoModal && (
        <ResetDemoModal
          loading={resetDemoLoading}
          error={resetDemoError}
          onConfirm={handleResetDemo}
          onClose={() => { setShowResetDemoModal(false); setResetDemoError(null); }}
        />
      )}
    </div>
  );
};

export default App;
