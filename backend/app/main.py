import asyncio
import json
import random
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .models import (
    Station, Asset, Alert, InventoryItem, WorkOrder,
    SimulationRequest, SimulationResult, CopilotQuery, CopilotResponse
)
from .simulator import simulator
from .ai_engine import ai_engine

app = FastAPI(
    title="PolarTwin Backend API",
    description="Digital Twin & Remote Management Platform for Indian Antarctic Research Stations (Maitri & Bharati)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Station Endpoints ---
@app.get("/api/stations", response_model=List[Station])
def get_stations():
    return list(simulator.stations.values())

@app.get("/api/stations/{station_id}", response_model=Station)
def get_station(station_id: str):
    sid = station_id.upper()
    if sid not in simulator.stations:
        raise HTTPException(status_code=404, detail="Station not found")
    return simulator.stations[sid]

@app.get("/api/stations/{station_id}/health")
def get_station_health(station_id: str):
    sid = station_id.upper()
    if sid not in simulator.stations:
        raise HTTPException(status_code=404, detail="Station not found")
    st = simulator.stations[sid]
    return {
        "stationId": st.stationId,
        "name": st.name,
        "overallHealth": st.healthScore,
        "connectivity": st.connectivity,
        "breakdown": st.healthBreakdown
    }

# --- Asset & Telemetry Endpoints ---
@app.get("/api/assets", response_model=List[Asset])
def get_assets(station_id: Optional[str] = None):
    if station_id:
        sid = station_id.upper()
        return simulator.assets.get(sid, [])
    all_assets = []
    for asset_list in simulator.assets.values():
        all_assets.extend(asset_list)
    return all_assets

@app.get("/api/assets/{asset_id}", response_model=Asset)
def get_asset(asset_id: str):
    aid = asset_id.upper()
    for asset_list in simulator.assets.values():
        for a in asset_list:
            if a.assetId.upper() == aid:
                return a
    raise HTTPException(status_code=404, detail="Asset not found")

@app.get("/api/assets/{asset_id}/telemetry")
def get_asset_telemetry(asset_id: str):
    aid = asset_id.upper()
    target_asset = None
    for asset_list in simulator.assets.values():
        for a in asset_list:
            if a.assetId.upper() == aid:
                target_asset = a
                break
    if not target_asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Generate historical trend series (24 data points)
    history = []
    base_vib = target_asset.vibration
    base_temp = target_asset.temperature
    base_power = target_asset.powerKw
    for i in range(24):
        hour_label = f"{23-i}h ago" if i > 0 else "Current"
        history.append({
            "time": hour_label,
            "vibration": round(max(0.1, base_vib + (random.uniform(-0.15, 0.15) if i > 0 else 0)), 2),
            "temperature": round(base_temp + (random.uniform(-1.2, 1.2) if i > 0 else 0), 1),
            "powerKw": round(max(0, base_power + (random.uniform(-5.0, 5.0) if i > 0 else 0)), 1)
        })
    history.reverse()

    return {
        "assetId": target_asset.assetId,
        "name": target_asset.name,
        "currentVibration": target_asset.vibration,
        "currentTemperature": target_asset.temperature,
        "currentPowerKw": target_asset.powerKw,
        "healthScore": target_asset.healthScore,
        "failureRisk": target_asset.failureRisk,
        "history": history
    }

# --- Energy Endpoints ---
@app.get("/api/energy/{station_id}/current")
def get_current_energy(station_id: str):
    sid = station_id.upper()
    st = simulator.stations.get(sid, simulator.stations["BHARATI"])
    return {
        "stationId": st.stationId,
        "currentLoadKw": st.powerLoadKw,
        "powerCapacityKw": st.powerCapacityKw,
        "loadFactorPct": round((st.powerLoadKw / st.powerCapacityKw) * 100.0, 1),
        "fuelReserveLiters": 215000 if sid == "BHARATI" else 145000,
        "fuelDaysRemaining": st.fuelDaysRemaining,
        "dailyFuelBurnLiters": 1510.0 if sid == "BHARATI" else 1220.0,
        "batterySoc": st.batterySoc,
        "batterySoh": 96.4 if sid == "BHARATI" else 93.8,
        "batteryCapacityKwh": 400.0,
        "generationSources": [
            {"source": "Generator 1 (Caterpillar)", "outputKw": 175.0, "status": "active"},
            {"source": "Generator 2 (Caterpillar)", "outputKw": 170.0, "status": "active"},
            {"source": "Generator 3 (Standby)", "outputKw": 0.0, "status": "standby"},
            {"source": "Solar PV Bifacial", "outputKw": 28.0 if sid == "BHARATI" else 0.0, "status": "active"},
            {"source": "Wind Turbine Polar", "outputKw": 0.0 if sid == "BHARATI" else 18.5, "status": "active"}
        ],
        "loadDistribution": [
            {"consumer": "Life Support & Space Heating", "loadKw": 165.0, "pct": 47.8},
            {"consumer": "Science Laboratories & Cleanrooms", "loadKw": 68.0, "pct": 19.7},
            {"consumer": "Water Desalination & Sewage RO", "loadKw": 42.0, "pct": 12.2},
            {"consumer": "Galley & Living Quarters Aux", "loadKw": 38.0, "pct": 11.0},
            {"consumer": "Communication & Radome Upgrades", "loadKw": 18.0, "pct": 5.2},
            {"consumer": "BESS Battery Charging Loop", "loadKw": 14.0, "pct": 4.1}
        ]
    }

# --- Alerts Endpoints ---
@app.get("/api/alerts", response_model=List[Alert])
def get_alerts(station_id: Optional[str] = None):
    if station_id:
        sid = station_id.upper()
        return [a for a in simulator.alerts if a.stationId == sid]
    return simulator.alerts

@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    for a in simulator.alerts:
        if a.alertId == alert_id:
            a.acknowledged = True
            return {"success": True, "alertId": alert_id}
    raise HTTPException(status_code=404, detail="Alert not found")

@app.post("/api/alerts/{alert_id}/escalate")
def escalate_alert(alert_id: str):
    for a in simulator.alerts:
        if a.alertId == alert_id:
            a.level = "emergency"
            a.riskScore = 98.0
            return {"success": True, "alertId": alert_id, "newLevel": a.level}
    raise HTTPException(status_code=404, detail="Alert not found")

# --- Logistics & Inventory ---
@app.get("/api/inventory", response_model=List[InventoryItem])
def get_inventory(station_id: Optional[str] = None):
    if station_id:
        sid = station_id.upper()
        return [i for i in simulator.inventory if i.stationId == sid]
    return simulator.inventory

@app.get("/api/shipments")
def get_shipments():
    return [
        {
            "vesselName": "MV Vasiliy Golovnin (44th ISEA Resupply)",
            "voyage": "ISEA-2026-V1",
            "origin": "Cape Town, South Africa",
            "destination": "Larsemann Hills (Bharati Station) & Maitri",
            "status": "In Transit / Pre-departure Staging",
            "currentPosition": "33°55'S, 18°25'E (Cape Town Port)",
            "etaAntarctica": "45 days",
            "cargoBreakdown": {
                "arcticFuelTons": 850,
                "sparePartsContainers": 18,
                "foodProvisionsTons": 65,
                "scientificEquipmentWeightKg": 14200
            },
            "iceClass": "Arc 7 / Polar Icebreaker Support"
        }
    ]

# --- Work Orders ---
@app.get("/api/workorders", response_model=List[WorkOrder])
def get_work_orders(station_id: Optional[str] = None):
    if station_id:
        sid = station_id.upper()
        return [w for w in simulator.work_orders if w.stationId == sid]
    return simulator.work_orders

class CreateWorkOrderReq(BaseModel):
    stationId: str
    assetId: str
    title: str
    priority: str
    assignedTechnician: str
    estimatedHours: float
    requiredSpares: List[str]

@app.post("/api/workorders")
def create_work_order(req: CreateWorkOrderReq):
    new_wo = WorkOrder(
        orderId=f"WO-2026-{random.randint(100, 999)}",
        stationId=req.stationId,
        assetId=req.assetId,
        title=req.title,
        priority=req.priority,
        status="detected",
        assignedTechnician=req.assignedTechnician,
        estimatedHours=req.estimatedHours,
        requiredSpares=req.requiredSpares,
        checklist=[
            {"item": "Review safety guidelines and issue thermal outer gear", "done": False},
            {"item": "Verify isolation and lock-out/tag-out on target asset", "done": False},
            {"item": "Perform mechanical/electrical maintenance procedures", "done": False},
            {"item": "Test run asset for 30 minutes and capture vibration spectra", "done": False}
        ],
        createdAt="Just now"
    )
    simulator.work_orders.insert(0, new_wo)
    return new_wo

# --- Simulation Endpoint ---
@app.post("/api/simulation/run", response_model=SimulationResult)
def run_simulation(req: SimulationRequest):
    return ai_engine.run_simulation(req)

# --- AI Copilot Endpoint ---
@app.post("/api/ai/query", response_model=CopilotResponse)
def query_copilot(query: CopilotQuery):
    return ai_engine.process_copilot_query(query)

# --- Edge Store-and-Forward Sync Endpoints ---
class SatelliteToggleReq(BaseModel):
    online: bool

@app.post("/api/edge/toggle-satellite")
def toggle_satellite(req: SatelliteToggleReq):
    return simulator.toggle_satellite_connection(req.online)

@app.get("/api/edge/status")
def get_edge_status():
    return {
        "is_online": simulator.is_satellite_online,
        "status": "ONLINE" if simulator.is_satellite_online else "OFFLINE",
        "queue_depth": len(simulator.sync_queue),
        "last_sync": "07:42 IST (Nominal)" if simulator.is_satellite_online else "BUFFERED AT LOCAL GATEWAY",
        "station_edge_nodes": [
            {"stationId": "BHARATI", "node": "Bharati-Edge-GW-01", "ip": "10.240.1.1", "state": "ACTIVE", "buffered_events": len(simulator.sync_queue)},
            {"stationId": "MAITRI", "node": "Maitri-Edge-GW-01", "ip": "10.240.2.1", "state": "ACTIVE", "buffered_events": 0}
        ]
    }

# --- Demo Anomaly Injection & Reset Endpoints ---
class AnomalyReq(BaseModel):
    assetId: str = "GEN-02"
    severity: str = "critical"

@app.post("/api/demo/inject-anomaly")
def inject_anomaly(req: AnomalyReq):
    return simulator.inject_anomaly(req.assetId, req.severity)

@app.post("/api/demo/reset-anomaly")
def reset_anomaly(req: AnomalyReq):
    return simulator.reset_anomaly(req.assetId)

# --- Real-time WebSocket Telemetry ---
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Broadcast simulated high-frequency telemetry tick every 2 seconds
            tick_data = {
                "timestamp": asyncio.get_event_loop().time(),
                "stations": {
                    "BHARATI": {
                        "healthScore": simulator.stations["BHARATI"].healthScore,
                        "currentTemp": round(simulator.stations["BHARATI"].currentTemp + random.uniform(-0.1, 0.1), 1),
                        "windSpeed": round(simulator.stations["BHARATI"].windSpeedKts + random.uniform(-0.4, 0.4), 1),
                        "powerLoad": round(simulator.stations["BHARATI"].powerLoadKw + random.uniform(-2.0, 2.0), 1),
                        "g2_vibration": next((a.vibration for a in simulator.assets["BHARATI"] if a.assetId == "GEN-02"), 3.9),
                        "g2_temp": next((a.temperature for a in simulator.assets["BHARATI"] if a.assetId == "GEN-02"), 78.4)
                    },
                    "MAITRI": {
                        "healthScore": simulator.stations["MAITRI"].healthScore,
                        "currentTemp": round(simulator.stations["MAITRI"].currentTemp + random.uniform(-0.1, 0.1), 1),
                        "windSpeed": round(simulator.stations["MAITRI"].windSpeedKts + random.uniform(-0.5, 0.5), 1),
                        "powerLoad": round(simulator.stations["MAITRI"].powerLoadKw + random.uniform(-1.5, 1.5), 1)
                    }
                }
            }
            await websocket.send_text(json.dumps(tick_data))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
