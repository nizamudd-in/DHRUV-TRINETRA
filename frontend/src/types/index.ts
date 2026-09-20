export interface StationHealthBreakdown {
  energy: number;
  equipment: number;
  logistics: number;
  environment: number;
  connectivity: number;
  operations: number;
}

export interface Station {
  stationId: 'BHARATI' | 'MAITRI';
  name: string;
  coordinates: string;
  region: string;
  established: number;
  status: 'operational' | 'degraded' | 'emergency';
  healthScore: number;
  connectivity: 'ONLINE' | 'SYNCING' | 'OFFLINE';
  healthBreakdown: StationHealthBreakdown;
  currentTemp: number;
  windSpeedKts: number;
  personnelCount: number;
  fuelDaysRemaining: number;
  powerLoadKw: number;
  powerCapacityKw: number;
  batterySoc: number;
  emergencyActive: boolean;
  protectedLoadKw: number;
  shedLoadKw: number;
  emergencyStrategy?: string | null;
}

export interface Asset {
  assetId: string;
  stationId: 'BHARATI' | 'MAITRI';
  name: string;
  type: 'generator' | 'hvac' | 'water_ro' | 'battery' | 'solar' | 'fuel_tank' | 'radome' | 'wind_turbine';
  building: string;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  healthScore: number;
  criticality: 'high' | 'medium' | 'low';
  vibration: number;
  temperature: number;
  powerKw: number;
  runtimeHours: number;
  lastMaintenance: string;
  predictedFailureDays?: number;
  failureRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendedAction: string;
  position3D: [number, number, number];
}

export interface Alert {
  alertId: string;
  stationId: 'BHARATI' | 'MAITRI';
  assetId?: string;
  level: 'info' | 'advisory' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  timestamp: string;
  riskScore: number;
  probability: number;
  impact: number;
  criticality: number;
  acknowledged: boolean;
  assignedTo?: string;
  workOrderId?: string;
}

export interface InventoryItem {
  itemId: string;
  stationId: 'BHARATI' | 'MAITRI';
  name: string;
  category: 'spare_parts' | 'fuel' | 'life_support' | 'medical' | 'rations';
  quantity: number;
  unit: string;
  dailyConsumption: number;
  daysRemaining: number;
  leadTimeDays: number;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  status: 'safe' | 'reorder_required' | 'stockout_risk';
}

export interface WorkOrder {
  orderId: string;
  stationId: 'BHARATI' | 'MAITRI';
  assetId: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'detected' | 'approved' | 'in_progress' | 'completed';
  assignedTechnician: string;
  estimatedHours: number;
  requiredSpares: string[];
  checklist: { item: string; done: boolean }[];
  createdAt: string;
  completedAt?: string;
}

export interface SimulationRequest {
  stationId: 'BHARATI' | 'MAITRI';
  ambientTempDelta: number;
  generatorOfflineId?: string;
  occupancyDelta: number;
  solarEfficiencyPct: number;
  supplyShipDelayDays: number;
}

export interface SimulationResult {
  scenarioName: string;
  projectedDemandKw: number;
  baseDemandKw: number;
  demandDeltaPct: number;
  projectedFuelBurnLph: number;
  fuelRunwayDays: number;
  batteryBufferHours: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'CRITICAL';
  criticalLoadsAffected: string[];
  mitigationStrategy: string[];
  // Populated only by load-shedding style scenarios (e.g. emergency triage)
  protectedLoadKw?: number;
  shedLoadKw?: number;
  projectedBatterySoc?: number;
  standbyGeneratorId?: string | null;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  confidence?: number;
  contributingFactors?: string[];
  recommendedActions?: string[];
  suggestedFollowups?: string[];
}

export interface ActionDecision {
  id: string;
  stationId: 'BHARATI' | 'MAITRI';
  assetId?: string | null;  // null/absent for station-level decisions (e.g. emergency triage)
  trigger: string;
  detectedIssue: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  explanation: string;
  recommendation: string;
  proposedAction: 'NONE' | 'OFFLINE_FOR_MAINTENANCE' | 'SCHEDULE_MAINTENANCE' | 'EMERGENCY_TRIAGE';
  expectedImpact: string;
  requiredApproval: string;
  simulationRequest?: SimulationRequest;
  simulationResult?: SimulationResult;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  approvedBy?: string;
  executedAt?: string;
  actionResult?: {
    assetStatus?: string;
    backupActivated?: string | null;
    standbyActivated?: string | null;
    workOrderId?: string;
    emergencyActive?: boolean;
    loadKw?: number;
    shedLoadKw?: number;
    protectedLoadKw?: number;
    batterySoc?: number;
    previousState?: Record<string, any>;
    resultingState?: Record<string, any>;
  };
  createdAt: string;
}

export interface AuditEvent {
  timestamp: string;
  stationId: string;
  assetId?: string | null;
  action: string;
  actor: string;
  decisionId?: string;
  result?: string;
  detail?: Record<string, any> | null;
}

export interface EdgeStatus {
  is_online: boolean;
  status: 'ONLINE' | 'OFFLINE';
  queue_depth: number;
  last_sync: string;
  station_edge_nodes: {
    stationId: string;
    node: string;
    ip: string;
    state: string;
    buffered_events: number;
  }[];
}

export type ActiveTab = 
  | 'dashboard'
  | 'digitaltwin'
  | 'energy'
  | 'equipment'
  | 'logistics'
  | 'environment'
  | 'alerts'
  | 'simulation'
  | 'maintenance'
  | 'copilot'
  | 'reports'
  | 'emergency';
