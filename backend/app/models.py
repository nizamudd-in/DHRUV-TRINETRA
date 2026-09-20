from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class StationHealthBreakdown(BaseModel):
    energy: float = 88.0
    equipment: float = 94.0
    logistics: float = 91.0
    environment: float = 95.0
    connectivity: float = 89.0
    operations: float = 94.0

class Station(BaseModel):
    stationId: str
    name: str
    coordinates: str
    region: str
    established: int
    status: str = "operational" # operational, degraded, emergency
    healthScore: float = 92.0
    connectivity: str = "ONLINE" # ONLINE, SYNCING, OFFLINE
    healthBreakdown: StationHealthBreakdown = Field(default_factory=StationHealthBreakdown)
    currentTemp: float = -28.5
    windSpeedKts: float = 38.0
    personnelCount: int = 24
    fuelDaysRemaining: int = 142
    powerLoadKw: float = 345.0
    powerCapacityKw: float = 600.0
    batterySoc: float = 84.0
    emergencyActive: bool = False
    protectedLoadKw: float = 0.0
    shedLoadKw: float = 0.0
    emergencyStrategy: Optional[str] = None  # e.g. SELECTIVE_LOAD_SHED

class TelemetryReading(BaseModel):
    assetId: str
    stationId: str
    timestamp: str
    powerKw: float
    temperature: float
    vibration: float # mm/s
    fuelRate: float # L/h
    runtimeHours: float
    healthScore: float
    status: str # normal, warning, critical, offline

class Asset(BaseModel):
    assetId: str
    stationId: str
    name: str
    type: str # generator, hvac, water_ro, battery, solar, fuel_tank, radome, wind_turbine
    building: str
    status: str = "normal" # normal, warning, critical, offline
    healthScore: float = 95.0
    criticality: str = "high" # high, medium, low
    vibration: float = 1.2
    temperature: float = 52.0
    powerKw: float = 180.0
    runtimeHours: float = 8420.0
    lastMaintenance: str = "2026-07-15"
    predictedFailureDays: Optional[int] = 120
    failureRisk: str = "Low" # Low, Medium, High, Critical
    recommendedAction: str = "Routine inspection at 9,000h interval"
    position3D: List[float] = [0.0, 0.0, 0.0]

class Alert(BaseModel):
    alertId: str
    stationId: str
    assetId: Optional[str] = None
    level: str # info, advisory, warning, critical, emergency
    title: str
    description: str
    timestamp: str
    riskScore: float # 0 - 100
    probability: float # 0.0 - 1.0
    impact: float # 0.0 - 1.0
    criticality: float # 0.0 - 1.0
    acknowledged: bool = False
    assignedTo: Optional[str] = None
    workOrderId: Optional[str] = None

class InventoryItem(BaseModel):
    itemId: str
    stationId: str
    name: str
    category: str # spare_parts, fuel, life_support, medical, rations
    quantity: int
    unit: str
    dailyConsumption: float
    daysRemaining: int
    leadTimeDays: int
    criticality: str # critical, high, medium, low
    status: str # safe, reorder_required, stockout_risk

class WorkOrder(BaseModel):
    orderId: str
    stationId: str
    assetId: str
    title: str
    priority: str # low, medium, high, emergency
    status: str # detected, approved, in_progress, completed
    assignedTechnician: str
    estimatedHours: float
    requiredSpares: List[str]
    checklist: List[Dict[str, Any]]
    createdAt: str
    completedAt: Optional[str] = None

class SimulationRequest(BaseModel):
    stationId: str = "BHARATI"
    ambientTempDelta: float = 0.0 # e.g. -10 C
    generatorOfflineId: Optional[str] = None # e.g. "GEN-02"
    occupancyDelta: int = 0
    solarEfficiencyPct: float = 100.0
    supplyShipDelayDays: int = 0

class SimulationResult(BaseModel):
    scenarioName: str
    projectedDemandKw: float
    baseDemandKw: float
    demandDeltaPct: float
    projectedFuelBurnLph: float
    fuelRunwayDays: int
    batteryBufferHours: float
    riskLevel: str
    criticalLoadsAffected: List[str]
    mitigationStrategy: List[str]
    # Optional fields populated only by load-shedding style scenarios (e.g. emergency triage)
    protectedLoadKw: Optional[float] = None
    shedLoadKw: Optional[float] = None
    projectedBatterySoc: Optional[float] = None
    standbyGeneratorId: Optional[str] = None

class CopilotQuery(BaseModel):
    prompt: str
    stationId: str = "BHARATI"
    context: Optional[Dict[str, Any]] = None

class CopilotResponse(BaseModel):
    answer: str
    confidence: float
    contributingFactors: List[str]
    recommendedActions: List[str]
    suggestedFollowups: List[str]

class ActionDecision(BaseModel):
    id: str
    stationId: str
    assetId: Optional[str] = None  # None for station-level decisions (e.g. emergency triage)
    trigger: str
    detectedIssue: str
    risk: str  # Low, Medium, High, Critical
    explanation: str
    recommendation: str
    proposedAction: str  # NONE, OFFLINE_FOR_MAINTENANCE, SCHEDULE_MAINTENANCE, EMERGENCY_TRIAGE
    expectedImpact: str
    requiredApproval: str  # role name, "" if no approval needed
    simulationRequest: Optional[SimulationRequest] = None
    simulationResult: Optional[SimulationResult] = None
    approvalStatus: str = "PENDING"  # PENDING, APPROVED, REJECTED, EXECUTED
    approvedBy: Optional[str] = None
    executedAt: Optional[str] = None
    actionResult: Optional[Dict[str, Any]] = None
    createdAt: str

class RecommendationRequest(BaseModel):
    stationId: str
    assetId: str

class StationRequest(BaseModel):
    stationId: str

class ApprovalRequest(BaseModel):
    approvedBy: str

class RejectionRequest(BaseModel):
    rejectedBy: str

class SyncEvent(BaseModel):
    eventId: str
    stationId: str
    deviceId: str
    timestamp: str
    sequenceNumber: int
    payload: Dict[str, Any]
    checksum: str
    priority: str = "NORMAL" # HIGH, NORMAL, LOW
