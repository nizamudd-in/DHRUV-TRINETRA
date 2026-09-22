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

// Result of the deterministic prototype health model (backend/app/health_model.py) —
// NOT a trained ML model. componentScores are each 0-100 ("how healthy is just this factor").
export interface AssetHealthDetail {
  assetId: string;
  name: string;
  currentVibration: number;
  currentTemperature: number;
  currentPowerKw: number;
  healthScore: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'AT_RISK' | 'CRITICAL';
  healthComponents: Record<string, number>;
  healthFactors: string[];
  healthCalculatedAt: string;
  healthModelApplied: boolean;
  failureRisk: string;
  history: { time: string; vibration: number; temperature: number; powerKw: number }[];
  // Same anchor points the health model actually scores against — charts must use
  // these, never invent their own threshold lines. Keyed by metric name.
  thresholds: Record<string, { baseline: number; warning: number; critical: number }>;
  sourceType: 'SIMULATED';
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

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DomainRisk {
  domain: 'environment' | 'energy' | 'equipment' | 'logistics' | 'communication';
  severity: RiskSeverity;
  score: number;
  driver?: string | null;
  reason: string;
}

export interface CrossDomainRisk {
  stationId: 'BHARATI' | 'MAITRI';
  overallRisk: RiskSeverity;
  overallScore: number;
  primaryDriver: string;
  domainRisks: DomainRisk[];
  contributingFactors: string[];
  affectedSystems: string[];
  interactions: string[];
  recommendations: string[];
  calculatedAt: string;
}

export interface CascadeStep {
  sequence: number;
  source: string;
  target: string;
  relationship: 'POWERS' | 'DEPENDS_ON' | 'BACKUP_FOR' | 'SUPPORTS' | 'COOLS' | 'HEATS' | 'COMMUNICATES_WITH' | 'REQUIRES' | 'PROTECTS';
  effect: string;
  severity: RiskSeverity;
  explanation: string;
}

export interface FailureCascade {
  cascadeId: string;
  stationId: 'BHARATI' | 'MAITRI';
  triggerAssetId: string;
  triggerAssetName: string;
  triggerFailure: string;
  severity: RiskSeverity;
  initialState: Record<string, any>;
  cascadeSteps: CascadeStep[];
  affectedAssets: string[];
  affectedDomains: string[];
  lostCapacityKw: number;
  projectedLoadKw: number;
  projectedGenerationMarginKw: number;
  batteryImpact: {
    powerGapKw: number;
    currentSoc: number;
    projectedSoc: number;
    bufferHours: number | null;
    criticalDependency: boolean;
  };
  operationalImpact: string[];
  missionImpact: string;
  finalRisk: CrossDomainRisk;
  mitigations: string[];
  generatedAt: string;
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

export interface StationHistoryPoint {
  time: string;
  powerLoadKw: number;
  batterySoc: number;
  currentTemp: number;
  windSpeedKts: number;
}

export interface StationHistory {
  stationId: string;
  sourceType: 'SIMULATED';
  note: string;
  history: StationHistoryPoint[];
}

export interface AssetTelemetryPoint {
  time: string;
  vibration: number;
  temperature: number;
  powerKw: number;
}

// A data source classification for the reusable <DataSourceBadge /> — see Phase 4
// (see also AssetHealthDetail.healthModelApplied / .thresholds for the health model's
// own transparency fields, added by the P2 health-model task).
export type DataSourceKind = 'PUBLIC' | 'SIMULATED' | 'PROTOTYPE' | 'MIXED';

export interface DemoResetSummary {
  status: string;
  stations: string[];
  reset_items: string[];
  timestamp: string;
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
