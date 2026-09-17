import { Station, Asset, Alert, InventoryItem, WorkOrder, SimulationRequest, SimulationResult, CopilotMessage, EdgeStatus } from '../types';

const API_BASE = '/api';

// Fallback in-memory seed data
export const initialStations: Station[] = [
  {
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
  },
  {
    stationId: 'MAITRI',
    name: 'Maitri Station',
    coordinates: '70°45\'57"S, 11°44\'09"E',
    region: 'Schirmacher Oasis (Inland)',
    established: 1989,
    status: 'operational',
    healthScore: 89.1,
    connectivity: 'ONLINE',
    currentTemp: -33.2,
    windSpeedKts: 48.2,
    personnelCount: 21,
    fuelDaysRemaining: 118,
    powerLoadKw: 280.0,
    powerCapacityKw: 450.0,
    batterySoc: 78.5,
    healthBreakdown: { energy: 84.0, equipment: 88.5, logistics: 87.0, environment: 92.0, connectivity: 90.0, operations: 91.0 }
  }
];

export const initialAssets: Asset[] = [
  {
    assetId: 'GEN-01', stationId: 'BHARATI', name: 'Caterpillar Main Genset 1', type: 'generator',
    building: 'Power Block A', status: 'normal', healthScore: 94.2, criticality: 'high',
    vibration: 1.4, temperature: 61.5, powerKw: 175.0, runtimeHours: 8240.0,
    lastMaintenance: '2026-06-10', predictedFailureDays: 180, failureRisk: 'Low',
    recommendedAction: 'Normal scheduled oil analysis at 8,500 hrs',
    position3D: [-8.0, 1.0, 4.0]
  },
  {
    assetId: 'GEN-02', stationId: 'BHARATI', name: 'Caterpillar Main Genset 2', type: 'generator',
    building: 'Power Block A', status: 'warning', healthScore: 71.8, criticality: 'high',
    vibration: 3.9, temperature: 78.4, powerKw: 170.0, runtimeHours: 7810.0,
    lastMaintenance: '2026-05-18', predictedFailureDays: 14, failureRisk: 'Medium',
    recommendedAction: 'Inspect bearing & mechanical harmonic alignment',
    position3D: [-8.0, 1.0, -4.0]
  },
  {
    assetId: 'GEN-03', stationId: 'BHARATI', name: 'Emergency Standby Genset 3', type: 'generator',
    building: 'Power Block B', status: 'normal', healthScore: 98.0, criticality: 'high',
    vibration: 0.8, temperature: 28.0, powerKw: 0.0, runtimeHours: 1450.0,
    lastMaintenance: '2026-07-02', predictedFailureDays: 365, failureRisk: 'Low',
    recommendedAction: 'Weekly 15-minute test spin completed',
    position3D: [-14.0, 1.0, 0.0]
  },
  {
    assetId: 'HVAC-01', stationId: 'BHARATI', name: 'Central Thermal HVAC Primary', type: 'hvac',
    building: 'Central Block', status: 'normal', healthScore: 91.5, criticality: 'high',
    vibration: 1.1, temperature: 44.2, powerKw: 65.0, runtimeHours: 14200.0,
    lastMaintenance: '2026-06-25', predictedFailureDays: 90, failureRisk: 'Low',
    recommendedAction: 'Air filter differential pressure nominal',
    position3D: [0.0, 4.0, 0.0]
  },
  {
    assetId: 'WATER-RO-1', stationId: 'BHARATI', name: 'Seawater Desalination RO Plant', type: 'water_ro',
    building: 'Utility Annex', status: 'normal', healthScore: 93.0, criticality: 'high',
    vibration: 1.6, temperature: 38.0, powerKw: 42.0, runtimeHours: 6400.0,
    lastMaintenance: '2026-06-12', predictedFailureDays: 110, failureRisk: 'Low',
    recommendedAction: 'Permeate conductivity 240 ppm (nominal)',
    position3D: [6.0, 1.0, 8.0]
  },
  {
    assetId: 'BESS-01', stationId: 'BHARATI', name: 'Lithium Iron Phosphate BESS (400 kWh)', type: 'battery',
    building: 'Power Block B', status: 'normal', healthScore: 96.4, criticality: 'high',
    vibration: 0.0, temperature: 21.0, powerKw: 45.0, runtimeHours: 5200.0,
    lastMaintenance: '2026-07-20', predictedFailureDays: 450, failureRisk: 'Low',
    recommendedAction: 'Cell balance variance 4 mV (nominal)',
    position3D: [-12.0, 1.0, -6.0]
  },
  {
    assetId: 'SOLAR-PV-01', stationId: 'BHARATI', name: 'Bifacial Antarctic Solar Array (100 kWp)', type: 'solar',
    building: 'South Ridge Field', status: 'normal', healthScore: 89.0, criticality: 'medium',
    vibration: 0.2, temperature: -18.0, powerKw: 28.0, runtimeHours: 8900.0,
    lastMaintenance: '2026-03-10', predictedFailureDays: 200, failureRisk: 'Low',
    recommendedAction: 'Albedo reflection yield nominal',
    position3D: [15.0, 0.5, -12.0]
  },
  {
    assetId: 'FUEL-FARM-01', stationId: 'BHARATI', name: 'Double-Walled Arctic ATF/Diesel Depot', type: 'fuel_tank',
    building: 'Fuel Depot', status: 'normal', healthScore: 97.5, criticality: 'high',
    vibration: 0.0, temperature: -12.0, powerKw: 4.5, runtimeHours: 22000.0,
    lastMaintenance: '2026-04-14', predictedFailureDays: 500, failureRisk: 'Low',
    recommendedAction: 'Level: 215,000 L / 250,000 L (86%)',
    position3D: [20.0, 1.5, 10.0]
  },
  {
    assetId: 'RADOME-01', stationId: 'BHARATI', name: 'GSAT-10 Polar Radome Satellite Uplink', type: 'radome',
    building: 'Upper Deck Mast', status: 'normal', healthScore: 95.0, criticality: 'high',
    vibration: 0.4, temperature: 18.0, powerKw: 12.0, runtimeHours: 18400.0,
    lastMaintenance: '2026-07-01', predictedFailureDays: 300, failureRisk: 'Low',
    recommendedAction: 'Pointing angle lock 99.8% SNR',
    position3D: [0.0, 8.5, 0.0]
  },
  // Maitri Assets
  {
    assetId: 'M-GEN-01', stationId: 'MAITRI', name: 'Ruston Cummins Genset A', type: 'generator',
    building: 'Main Power Shack', status: 'normal', healthScore: 90.2, criticality: 'high',
    vibration: 1.8, temperature: 66.0, powerKw: 140.0, runtimeHours: 11200.0,
    lastMaintenance: '2026-06-01', predictedFailureDays: 110, failureRisk: 'Low',
    recommendedAction: 'Exhaust temperature stable at 380°C',
    position3D: [-6.0, 1.0, 3.0]
  },
  {
    assetId: 'M-GEN-02', stationId: 'MAITRI', name: 'Ruston Cummins Genset B', type: 'generator',
    building: 'Main Power Shack', status: 'normal', healthScore: 88.4, criticality: 'high',
    vibration: 2.1, temperature: 69.0, powerKw: 140.0, runtimeHours: 10800.0,
    lastMaintenance: '2026-05-20', predictedFailureDays: 95, failureRisk: 'Low',
    recommendedAction: 'Lubrication pressure verified',
    position3D: [-6.0, 1.0, -3.0]
  },
  {
    assetId: 'M-PUMP-LAKE', stationId: 'MAITRI', name: 'Priyadarshini Lake Heated Water Line', type: 'water_ro',
    building: 'Lake Pumphouse', status: 'warning', healthScore: 82.5, criticality: 'high',
    vibration: 1.9, temperature: 4.5, powerKw: 34.0, runtimeHours: 7400.0,
    lastMaintenance: '2026-06-28', predictedFailureDays: 45, failureRisk: 'Medium',
    recommendedAction: 'Trace heating trace cables pulling 34A (current spike)',
    position3D: [18.0, 0.5, 14.0]
  },
  {
    assetId: 'M-WIND-01', stationId: 'MAITRI', name: 'Polar Rugged Wind Turbine (20 kW)', type: 'wind_turbine',
    building: 'East Ridge Mast', status: 'normal', healthScore: 92.0, criticality: 'medium',
    vibration: 2.4, temperature: -22.0, powerKw: 18.5, runtimeHours: 5900.0,
    lastMaintenance: '2026-04-10', predictedFailureDays: 160, failureRisk: 'Low',
    recommendedAction: 'Pitch control locked in storm mode',
    position3D: [25.0, 5.0, -8.0]
  }
];

export const initialAlerts: Alert[] = [
  {
    alertId: 'ALT-001',
    stationId: 'BHARATI',
    assetId: 'GEN-02',
    level: 'critical',
    title: 'GEN-02 Harmonic Vibration Anomaly',
    description: 'Bearing vibration reached 3.9 mm/s (baseline: 1.4 mm/s). Correlated with 12°C stator heat delta.',
    timestamp: '12 min ago',
    riskScore: 84.5,
    probability: 0.88,
    impact: 0.92,
    criticality: 0.95,
    acknowledged: false,
    assignedTo: 'Chief Eng. R. Sharma'
  },
  {
    alertId: 'ALT-002',
    stationId: 'BHARATI',
    assetId: 'FUEL-FARM-01',
    level: 'warning',
    title: 'Fuel Burn Rate Acceleration',
    description: 'Station consumption is 11% above seasonal baseline due to -28°C cold snap.',
    timestamp: '38 min ago',
    riskScore: 62.0,
    probability: 0.70,
    impact: 0.85,
    criticality: 0.90,
    acknowledged: true
  },
  {
    alertId: 'ALT-003',
    stationId: 'BHARATI',
    assetId: 'HVAC-01',
    level: 'advisory',
    title: 'Zone 3 Living Quarters Temp Delta',
    description: 'Living quarters corridor temperature dipped to +17.2°C (setpoint: +21°C).',
    timestamp: '2 hrs ago',
    riskScore: 35.0,
    probability: 0.45,
    impact: 0.50,
    criticality: 0.60,
    acknowledged: true
  },
  {
    alertId: 'ALT-004',
    stationId: 'MAITRI',
    assetId: 'M-PUMP-LAKE',
    level: 'warning',
    title: 'Lake Water Line Trace Heating Current Surge',
    description: 'Trace heating circuit drawn 34A (rated 30A max) to prevent intake freezing at -33°C.',
    timestamp: '1 hr ago',
    riskScore: 68.0,
    probability: 0.75,
    impact: 0.80,
    criticality: 0.88,
    acknowledged: false
  }
];

export const initialInventory: InventoryItem[] = [
  { itemId: 'INV-01', stationId: 'BHARATI', name: 'Caterpillar G3516 Ceramic Journal Bearings', category: 'spare_parts', quantity: 2, unit: 'sets', dailyConsumption: 0.01, daysRemaining: 180, leadTimeDays: 90, criticality: 'critical', status: 'safe' },
  { itemId: 'INV-02', stationId: 'BHARATI', name: 'Polar Arctic Fuel Micron Filter Cartridges', category: 'spare_parts', quantity: 4, unit: 'units', dailyConsumption: 0.15, daysRemaining: 26, leadTimeDays: 60, criticality: 'critical', status: 'stockout_risk' },
  { itemId: 'INV-03', stationId: 'BHARATI', name: 'Dow Filmtec RO Desalination Membranes', category: 'spare_parts', quantity: 6, unit: 'elements', dailyConsumption: 0.03, daysRemaining: 200, leadTimeDays: 90, criticality: 'high', status: 'safe' },
  { itemId: 'INV-04', stationId: 'BHARATI', name: 'Arctic Winterized Diesel (Jet A-1 / ATF)', category: 'fuel', quantity: 215000, unit: 'liters', dailyConsumption: 1510.0, daysRemaining: 142, leadTimeDays: 120, criticality: 'critical', status: 'safe' },
  { itemId: 'INV-05', stationId: 'BHARATI', name: 'Silicon Carbide Heating Elements (2 kW)', category: 'life_support', quantity: 5, unit: 'pcs', dailyConsumption: 0.08, daysRemaining: 62, leadTimeDays: 75, criticality: 'critical', status: 'reorder_required' },
  { itemId: 'INV-06', stationId: 'BHARATI', name: 'Deep-Freeze Emergency Medical Trauma Kits', category: 'medical', quantity: 14, unit: 'kits', dailyConsumption: 0.02, daysRemaining: 700, leadTimeDays: 120, criticality: 'critical', status: 'safe' },
  { itemId: 'INV-07', stationId: 'BHARATI', name: 'Freeze-Dried Caloric Rations (25-person 6mo)', category: 'rations', quantity: 180, unit: 'crates', dailyConsumption: 0.8, daysRemaining: 225, leadTimeDays: 120, criticality: 'high', status: 'safe' },
  { itemId: 'INV-08', stationId: 'MAITRI', name: 'Priyadarshini Lake Submersible Pump Impellers', category: 'spare_parts', quantity: 1, unit: 'set', dailyConsumption: 0.02, daysRemaining: 50, leadTimeDays: 90, criticality: 'critical', status: 'stockout_risk' }
];

export const initialWorkOrders: WorkOrder[] = [
  {
    orderId: 'WO-2026-089',
    stationId: 'BHARATI',
    assetId: 'GEN-02',
    title: 'Emergency Inspection of G-02 Generator Bearing & Harmonic Damping',
    priority: 'high',
    status: 'in_progress',
    assignedTechnician: 'S. Sen (Mechanical)',
    estimatedHours: 4.5,
    requiredSpares: ['INV-01 Ceramic Journal Bearings', 'INV-02 Fuel Filter'],
    checklist: [
      { item: 'Isolate electrical output and engage manual lockout tagout (LOTO)', done: true },
      { item: 'Attach vibration accelerometer to drive-end and non-drive-end bearings', done: true },
      { item: 'Sample lubrication oil for iron/copper metallic particulate debris', done: false },
      { item: 'Inspect coupling elastomer for thermal degradation', done: false },
      { item: 'Perform cold rotation test prior to load recommissioning', done: false }
    ],
    createdAt: '2026-09-07T08:15:00Z'
  },
  {
    orderId: 'WO-2026-088',
    stationId: 'BHARATI',
    assetId: 'SOLAR-PV-01',
    title: 'Clean snow drift accumulation on South Ridge PV array',
    priority: 'medium',
    status: 'approved',
    assignedTechnician: 'K. Verma (Electrical)',
    estimatedHours: 2.0,
    requiredSpares: [],
    checklist: [
      { item: 'Verify wind chill index is above -35°C before outdoor egress', done: true },
      { item: 'Soft-brush snow deposits from lower bifacial reflectors', done: false },
      { item: 'Verify DC string voltage at combiner box 1', done: false }
    ],
    createdAt: '2026-09-06T14:30:00Z'
  },
  {
    orderId: 'WO-2026-087',
    stationId: 'BHARATI',
    assetId: 'WATER-RO-1',
    title: 'Desalination intake line backwash cycle and membrane CIP cleaning',
    priority: 'low',
    status: 'completed',
    assignedTechnician: 'A. Joshi (Life Support)',
    estimatedHours: 3.0,
    requiredSpares: [],
    checklist: [
      { item: 'Circulate citric acid cleaning solution for 45 minutes', done: true },
      { item: 'Measure differential pressure across cartridge filter', done: true },
      { item: 'Record permeate salinity and reset CIP interval timer', done: true }
    ],
    createdAt: '2026-09-05T09:00:00Z',
    completedAt: '2026-09-05T12:30:00Z'
  }
];

// In-memory state holder for fallback mode
let memoryStations = [...initialStations];
let memoryAssets = [...initialAssets];
let memoryAlerts = [...initialAlerts];
let memoryInventory = [...initialInventory];
let memoryWorkOrders = [...initialWorkOrders];
let isSatelliteOnline = true;
let syncQueueCount = 0;

export const api = {
  async getStations(): Promise<Station[]> {
    try {
      const res = await fetch(`${API_BASE}/stations`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
    } catch (_) {}
    return memoryStations;
  },

  async getStation(id: string): Promise<Station> {
    try {
      const res = await fetch(`${API_BASE}/stations/${id}`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
    } catch (_) {}
    return memoryStations.find(s => s.stationId === id) || memoryStations[0];
  },

  async getAssets(stationId?: string): Promise<Asset[]> {
    try {
      const url = stationId ? `${API_BASE}/assets?station_id=${stationId}` : `${API_BASE}/assets`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
    } catch (_) {}
    return stationId ? memoryAssets.filter(a => a.stationId === stationId) : memoryAssets;
  },

  async getAlerts(stationId?: string): Promise<Alert[]> {
    try {
      const url = stationId ? `${API_BASE}/alerts?station_id=${stationId}` : `${API_BASE}/alerts`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
    } catch (_) {}
    return stationId ? memoryAlerts.filter(a => a.stationId === stationId) : memoryAlerts;
  },

  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST' });
    } catch (_) {}
    const a = memoryAlerts.find(x => x.alertId === alertId);
    if (a) a.acknowledged = true;
  },

  async getInventory(stationId?: string): Promise<InventoryItem[]> {
    try {
      const url = stationId ? `${API_BASE}/inventory?station_id=${stationId}` : `${API_BASE}/inventory`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
    } catch (_) {}
    return stationId ? memoryInventory.filter(i => i.stationId === stationId) : memoryInventory;
  },

  async getWorkOrders(stationId?: string): Promise<WorkOrder[]> {
    try {
      const url = stationId ? `${API_BASE}/workorders?station_id=${stationId}` : `${API_BASE}/workorders`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
    } catch (_) {}
    return stationId ? memoryWorkOrders.filter(w => w.stationId === stationId) : memoryWorkOrders;
  },

  async createWorkOrder(order: Partial<WorkOrder>): Promise<WorkOrder> {
    const newWo: WorkOrder = {
      orderId: `WO-2026-${Math.floor(100 + Math.random() * 900)}`,
      stationId: (order.stationId as any) || 'BHARATI',
      assetId: order.assetId || 'GEN-02',
      title: order.title || 'Corrective Maintenance Order',
      priority: order.priority || 'high',
      status: 'detected',
      assignedTechnician: order.assignedTechnician || 'Senior Engineer',
      estimatedHours: order.estimatedHours || 3.0,
      requiredSpares: order.requiredSpares || [],
      checklist: [
        { item: 'Review safety guidelines and issue thermal outer gear', done: false },
        { item: 'Verify isolation and lock-out/tag-out on target asset', done: false },
        { item: 'Perform mechanical/electrical maintenance procedures', done: false },
        { item: 'Test run asset for 30 minutes and capture vibration spectra', done: false }
      ],
      createdAt: 'Just now'
    };
    try {
      const res = await fetch(`${API_BASE}/workorders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWo)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    memoryWorkOrders.unshift(newWo);
    return newWo;
  },

  async runSimulation(req: SimulationRequest): Promise<SimulationResult> {
    try {
      const res = await fetch(`${API_BASE}/simulation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    // Fallback simulation math
    const baseDemand = req.stationId === 'BHARATI' ? 345.0 : 280.0;
    const tempImpact = Math.abs(req.ambientTempDelta) * 3.5;
    const occImpact = req.occupancyDelta * 1.2;
    const projectedDemand = baseDemand + tempImpact + occImpact;
    const genCap = (req.stationId === 'BHARATI' ? 600.0 : 450.0) - (req.generatorOfflineId ? 200.0 : 0.0);
    const demandDeltaPct = ((projectedDemand - baseDemand) / baseDemand) * 100.0;
    const projectedFuelBurn = projectedDemand * 0.28;
    const fuelRunway = Math.round(215000 / (projectedFuelBurn * 24));
    const unmet = Math.max(0, projectedDemand - genCap);
    const batteryHours = unmet > 0 ? Number((336 / unmet).toFixed(1)) : 18.0;

    return {
      scenarioName: `Stress Test: ΔT=${req.ambientTempDelta}°C, Offline=${req.generatorOfflineId || 'None'}`,
      projectedDemandKw: Math.round(projectedDemand * 10) / 10,
      baseDemandKw: baseDemand,
      demandDeltaPct: Math.round(demandDeltaPct * 10) / 10,
      projectedFuelBurnLph: Math.round(projectedFuelBurn * 10) / 10,
      fuelRunwayDays: fuelRunway,
      batteryBufferHours: batteryHours,
      riskLevel: unmet > 50 || req.supplyShipDelayDays > 20 ? 'CRITICAL' : (unmet > 0 || demandDeltaPct > 15 ? 'MEDIUM' : 'LOW'),
      criticalLoadsAffected: unmet > 0 ? ['Non-essential Science Incubators (Zone C)', 'Secondary RO Desalination Loop'] : [],
      mitigationStrategy: [
        'Spin up Emergency Standby Genset 3 (capacity +150 kW)',
        'Enable Zone-based selective thermal load shedding for Lab Block',
        'Set BESS dispatch to Peak-Shaving mode between 18:00 - 22:00 UTC',
        `Logistics: expedite winter resupply vessel (Lead time buffer: ${Math.max(0, 45 - req.supplyShipDelayDays)} days)`
      ]
    };
  },

  async queryCopilot(prompt: string, stationId: 'BHARATI' | 'MAITRI' = 'BHARATI'): Promise<CopilotMessage> {
    try {
      const res = await fetch(`${API_BASE}/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, stationId })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: Math.random().toString(),
          sender: 'assistant',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: data.confidence,
          contributingFactors: data.contributingFactors,
          recommendedActions: data.recommendedActions,
          suggestedFollowups: data.suggestedFollowups
        };
      }
    } catch (_) {}

    const p = prompt.toLowerCase();
    if (p.includes('generator') || p.includes('g-02') || p.includes('risk') || p.includes('attention')) {
      return {
        id: Math.random().toString(),
        sender: 'assistant',
        text: `**Generator G-02** has the highest operational risk index at Bharati Station.\n\n• **Current Health Score:** 71.8% (WARNING)\n• **Bearing Vibration:** 3.90 mm/s (Normal threshold: <1.8 mm/s)\n• **Stator/Bearing Temp:** 78.4°C (+14°C above baseline)\n\nAI spectral vibration analysis indicates a 2X shaft rotational harmonic, indicating drive-end ceramic roller bearing pitting. Failure probability within 96 hours is **88.4%**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 0.96,
        contributingFactors: ['High harmonic 2X vibration peak detected by accelerometer', 'Elevated lube oil differential temperature (+8.2°C)', 'Continuous duty runtime past 7,800 operational hours'],
        recommendedActions: ['Execute Work Order WO-2026-089', 'Verify spare Ceramic Journal Bearings (INV-01: 2 sets available)', 'Pre-warm Emergency Standby Genset 3 (GEN-03)', 'Run What-If simulation to model load shedding'],
        suggestedFollowups: ['Check spare part availability for GEN-02', 'Simulate taking Generator G-02 offline', 'What is current fuel consumption rate?']
      };
    } else if (p.includes('fuel') || p.includes('energy') || p.includes('power') || p.includes('spike')) {
      return {
        id: Math.random().toString(),
        sender: 'assistant',
        text: `**Energy Analysis for Bharati Station:**\n\n• Current station load: **345.0 kW** (Load factor: 57.5% of 600 kW capacity)\n• Winter fuel reserve: **142 days remaining** (215,000 L Arctic ATF/Diesel)\n• Battery BESS Storage: **84.0% SOC**\n\nEnergy consumption increased by **+12.4%** due to ambient katabatic winds (-28.4°C, 36.5 knots), requiring +45 kW continuous trace heating.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 0.94,
        contributingFactors: ['Ambient temperature dropped to -28.4°C', 'Katabatic wind chill factor increased thermal dissipation', 'Desalination trace heating energized'],
        recommendedActions: ['Maintain current diesel generation split: G-01 + G-02', 'Bifacial solar field yield is contributing 28 kW', 'Ensure fuel depot heating circuits remain above -15°C'],
        suggestedFollowups: ['What happens if temperature drops to -40°C?', 'Which spare parts are running low?']
      };
    } else {
      return {
        id: Math.random().toString(),
        sender: 'assistant',
        text: `**PolarTwin Mission Overview:**\n\n• Station Health Index: **92.4%** (Operational)\n• Active Personnel: **24 overwintering team members**\n• Life Support & Heating: **NOMINAL (All zones > +19°C)**\n• Active Alerts: 1 Critical (G-02 Bearing), 1 Warning (Fuel Burn), 1 Advisory (HVAC Zone 3)\n• Satellite Connectivity: **ONLINE via GSAT-10 (Latency: 580 ms)**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 0.95,
        contributingFactors: ['Overwintering conditions in progress', 'All life-support redundancy active'],
        recommendedActions: ['Monitor G-02 vibration trend continuously', 'Review daily fuel usage vs forecast model'],
        suggestedFollowups: ['Which asset needs attention first?', 'Why did energy consumption increase?']
      };
    }
  },

  async toggleSatellite(online: boolean): Promise<EdgeStatus> {
    isSatelliteOnline = online;
    if (online) {
      syncQueueCount = 0;
    }
    try {
      const res = await fetch(`${API_BASE}/edge/toggle-satellite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          is_online: data.is_online,
          status: data.status,
          queue_depth: data.queue_depth,
          last_sync: data.is_online ? '07:42 IST (Nominal)' : 'BUFFERED AT LOCAL GATEWAY',
          station_edge_nodes: [
            { stationId: 'BHARATI', node: 'Bharati-Edge-GW-01', ip: '10.240.1.1', state: 'ACTIVE', buffered_events: data.queue_depth },
            { stationId: 'MAITRI', node: 'Maitri-Edge-GW-01', ip: '10.240.2.1', state: 'ACTIVE', buffered_events: 0 }
          ]
        };
      }
    } catch (_) {}

    return {
      is_online: isSatelliteOnline,
      status: isSatelliteOnline ? 'ONLINE' : 'OFFLINE',
      queue_depth: syncQueueCount,
      last_sync: isSatelliteOnline ? '07:42 IST (Nominal)' : 'BUFFERED AT LOCAL GATEWAY',
      station_edge_nodes: [
        { stationId: 'BHARATI', node: 'Bharati-Edge-GW-01', ip: '10.240.1.1', state: 'ACTIVE', buffered_events: syncQueueCount },
        { stationId: 'MAITRI', node: 'Maitri-Edge-GW-01', ip: '10.240.2.1', state: 'ACTIVE', buffered_events: 0 }
      ]
    };
  },

  async injectAnomaly(assetId: string = 'GEN-02'): Promise<void> {
    try {
      await fetch(`${API_BASE}/demo/inject-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, severity: 'critical' })
      });
    } catch (_) {}

    const g2 = memoryAssets.find(a => a.assetId === assetId);
    if (g2) {
      g2.vibration = 4.85;
      g2.temperature = 84.6;
      g2.healthScore = 64.0;
      g2.status = 'critical';
      g2.failureRisk = 'High';
      g2.predictedFailureDays = 3;
      g2.recommendedAction = 'IMMEDIATE SHUTDOWN & BEARING REPLACEMENT RECOMMENDED';
    }
    const bh = memoryStations.find(s => s.stationId === 'BHARATI');
    if (bh) {
      bh.healthScore = 84.5;
      bh.healthBreakdown.equipment = 72.0;
    }
    const newAlt: Alert = {
      alertId: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
      stationId: 'BHARATI',
      assetId: assetId,
      level: 'critical',
      title: `${assetId} Catastrophic Bearing Thermal-Vibration Excursion`,
      description: 'Vibration jumped to 4.85 mm/s with bearing temperature at 84.6°C. Severe mechanical wear detected.',
      timestamp: 'Just now',
      riskScore: 94.0,
      probability: 0.95,
      impact: 0.98,
      criticality: 0.98,
      acknowledged: false
    };
    memoryAlerts.unshift(newAlt);
    if (!isSatelliteOnline) {
      syncQueueCount += 1;
    }
  },

  async resetAnomaly(assetId: string = 'GEN-02'): Promise<void> {
    try {
      await fetch(`${API_BASE}/demo/reset-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId })
      });
    } catch (_) {}

    const g2 = memoryAssets.find(a => a.assetId === assetId);
    if (g2) {
      g2.vibration = 1.4;
      g2.temperature = 61.5;
      g2.healthScore = 94.2;
      g2.status = 'normal';
      g2.failureRisk = 'Low';
      g2.predictedFailureDays = 180;
      g2.recommendedAction = 'Routine inspection at scheduled window';
    }
    const bh = memoryStations.find(s => s.stationId === 'BHARATI');
    if (bh) {
      bh.healthScore = 92.4;
      bh.healthBreakdown.equipment = 94.0;
    }
  }
};
