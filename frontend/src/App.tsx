import React, { useState, useEffect } from 'react';
import { ActiveTab, Station, Asset, Alert, InventoryItem, WorkOrder, EdgeStatus } from './types';
import { api, initialStations, initialAssets, initialAlerts, initialInventory, initialWorkOrders } from './services/api';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MissionControlDashboard } from './components/dashboard/MissionControlDashboard';
import { TwinCanvas3D } from './components/digitaltwin/TwinCanvas3D';
import { AssetDetailDrawer } from './components/digitaltwin/AssetDetailDrawer';
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
  const [thermalOverlay, setThermalOverlay] = useState(false);
  const [vibrationOverlay, setVibrationOverlay] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
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
    };
    loadData();
  }, []);

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

  // Anomaly Injection
  const handleInjectAnomaly = async () => {
    await api.injectAnomaly('GEN-02');
    const [asts, alts, sts] = await Promise.all([
      api.getAssets(),
      api.getAlerts(),
      api.getStations()
    ]);
    setAssets(asts);
    setAlerts(alts);
    setStations(sts);
    const g2 = asts.find(a => a.assetId === 'GEN-02');
    if (g2) setSelectedAsset(g2);
  };

  const handleResetAnomaly = async () => {
    await api.resetAnomaly('GEN-02');
    const [asts, alts, sts] = await Promise.all([
      api.getAssets(),
      api.getAlerts(),
      api.getStations()
    ]);
    setAssets(asts);
    setAlerts(alts);
    setStations(sts);
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
    if (selectedAsset) setSelectedAsset(null);
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
          {activeTab === 'dashboard' && (
            <MissionControlDashboard
              station={currentStation}
              assets={stationAssets}
              alerts={stationAlerts}
              inventory={stationInventory}
              onNavigateTab={setActiveTab}
              onSelectAsset={setSelectedAsset}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onInjectAnomaly={handleInjectAnomaly}
              onResetAnomaly={handleResetAnomaly}
            />
          )}

          {activeTab === 'digitaltwin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 120px)' }}>
              <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                    {currentStation.name} — Full Interactive 3D Digital Twin Architecture
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Physical stilt elevation, solar array, helipad, radome and generator modules with raycast inspection
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    onClick={handleInjectAnomaly}
                  >
                    Inject G-02 Anomaly
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

              <div style={{ flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <TwinCanvas3D
                  stationId={currentStation.stationId}
                  assets={stationAssets}
                  selectedAsset={selectedAsset}
                  onSelectAsset={setSelectedAsset}
                  thermalOverlay={thermalOverlay}
                  vibrationOverlay={vibrationOverlay}
                  onToggleThermal={() => setThermalOverlay(prev => !prev)}
                  onToggleVibration={() => setVibrationOverlay(prev => !prev)}
                />
              </div>
            </div>
          )}

          {activeTab === 'energy' && (
            <EnergyManagement station={currentStation} />
          )}

          {activeTab === 'equipment' && (
            <EquipmentHealth
              assets={stationAssets}
              onSelectAsset={setSelectedAsset}
              onCreateWorkOrder={(a) => {
                setSelectedAsset(null);
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
              onSelectAsset={setSelectedAsset}
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
            <AICopilot station={currentStation} />
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
          onClose={() => setSelectedAsset(null)}
          onCreateWorkOrder={(a) => {
            setSelectedAsset(null);
            handleCreateWorkOrder({ assetId: a.assetId, title: `Overhaul & Inspection of ${a.name}` });
          }}
        />
      )}

      {/* Emergency Mode Modal */}
      {showEmergencyModal && (
        <EmergencyModeModal
          station={currentStation}
          onClose={() => setShowEmergencyModal(false)}
        />
      )}

      {/* 5-Min Guided SIH Presentation Tour Runner */}
      {showDemoTour && (
        <DemoTourRunner
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
          onSelectStation={setActiveStationId}
          onInjectAnomaly={handleInjectAnomaly}
          onSelectAsset={setSelectedAsset}
          assets={stationAssets}
          onToggleSatellite={handleToggleSatellite}
          onClose={() => setShowDemoTour(false)}
        />
      )}
    </div>
  );
};

export default App;
