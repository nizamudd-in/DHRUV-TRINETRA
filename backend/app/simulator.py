import math
import time
import random
from datetime import datetime, timezone
from typing import Dict, List, Any
from .models import Station, Asset, Alert, InventoryItem, WorkOrder, StationHealthBreakdown

class PolarTwinSimulator:
    def __init__(self):
        self.stations: Dict[str, Station] = {
            "BHARATI": Station(
                stationId="BHARATI",
                name="Bharati Station",
                coordinates="69°24'29\"S, 76°11'14\"E",
                region="Larsemann Hills (Coastal)",
                established=2012,
                status="operational",
                healthScore=92.4,
                connectivity="ONLINE",
                currentTemp=-28.4,
                windSpeedKts=36.5,
                personnelCount=24,
                fuelDaysRemaining=142,
                powerLoadKw=345.0,
                powerCapacityKw=600.0,
                batterySoc=84.0,
                healthBreakdown=StationHealthBreakdown(
                    energy=88.5, equipment=94.0, logistics=91.2, environment=95.0, connectivity=89.0, operations=94.5
                )
            ),
            "MAITRI": Station(
                stationId="MAITRI",
                name="Maitri Station",
                coordinates="70°45'57\"S, 11°44'09\"E",
                region="Schirmacher Oasis (Inland Ice Margin)",
                established=1989,
                status="operational",
                healthScore=89.1,
                connectivity="ONLINE",
                currentTemp=-33.2,
                windSpeedKts=48.2,
                personnelCount=21,
                fuelDaysRemaining=118,
                powerLoadKw=280.0,
                powerCapacityKw=450.0,
                batterySoc=78.5,
                healthBreakdown=StationHealthBreakdown(
                    energy=84.0, equipment=88.5, logistics=87.0, environment=92.0, connectivity=90.0, operations=91.0
                )
            )
        }

        # Assets for Bharati & Maitri
        self.assets: Dict[str, List[Asset]] = {
            "BHARATI": [
                Asset(
                    assetId="GEN-01", stationId="BHARATI", name="Caterpillar Main Genset 1", type="generator",
                    building="Power Block A", status="normal", healthScore=94.2, criticality="high",
                    vibration=1.4, temperature=61.5, powerKw=175.0, runtimeHours=8240.0,
                    lastMaintenance="2026-06-10", predictedFailureDays=180, failureRisk="Low",
                    recommendedAction="Normal scheduled oil analysis at 8,500 hrs",
                    position3D=[-8.0, 1.0, 4.0]
                ),
                Asset(
                    assetId="GEN-02", stationId="BHARATI", name="Caterpillar Main Genset 2", type="generator",
                    building="Power Block A", status="warning", healthScore=71.8, criticality="high",
                    vibration=3.9, temperature=78.4, powerKw=170.0, runtimeHours=7810.0,
                    lastMaintenance="2026-05-18", predictedFailureDays=14, failureRisk="Medium",
                    recommendedAction="Inspect bearing & mechanical harmonic alignment",
                    position3D=[-8.0, 1.0, -4.0]
                ),
                Asset(
                    assetId="GEN-03", stationId="BHARATI", name="Emergency Standby Genset 3", type="generator",
                    building="Power Block B", status="normal", healthScore=98.0, criticality="high",
                    vibration=0.8, temperature=28.0, powerKw=0.0, runtimeHours=1450.0,
                    lastMaintenance="2026-07-02", predictedFailureDays=365, failureRisk="Low",
                    recommendedAction="Weekly 15-minute test spin completed",
                    position3D=[-14.0, 1.0, 0.0]
                ),
                Asset(
                    assetId="HVAC-01", stationId="BHARATI", name="Central Thermal HVAC Primary", type="hvac",
                    building="Central Block", status="normal", healthScore=91.5, criticality="high",
                    vibration=1.1, temperature=44.2, powerKw=65.0, runtimeHours=14200.0,
                    lastMaintenance="2026-06-25", predictedFailureDays=90, failureRisk="Low",
                    recommendedAction="Air filter differential pressure nominal",
                    position3D=[0.0, 4.0, 0.0]
                ),
                Asset(
                    assetId="WATER-RO-1", stationId="BHARATI", name="Seawater Desalination RO Plant", type="water_ro",
                    building="Utility Annex", status="normal", healthScore=93.0, criticality="high",
                    vibration=1.6, temperature=38.0, powerKw=42.0, runtimeHours=6400.0,
                    lastMaintenance="2026-06-12", predictedFailureDays=110, failureRisk="Low",
                    recommendedAction="Permeate conductivity 240 ppm (excellent)",
                    position3D=[6.0, 1.0, 8.0]
                ),
                Asset(
                    assetId="BESS-01", stationId="BHARATI", name="Lithium Iron Phosphate BESS (400 kWh)", type="battery",
                    building="Power Block B", status="normal", healthScore=96.4, criticality="high",
                    vibration=0.0, temperature=21.0, powerKw=45.0, runtimeHours=5200.0,
                    lastMaintenance="2026-07-20", predictedFailureDays=450, failureRisk="Low",
                    recommendedAction="Cell balance variance 4 mV (nominal)",
                    position3D=[-12.0, 1.0, -6.0]
                ),
                Asset(
                    assetId="SOLAR-PV-01", stationId="BHARATI", name="Bifacial Antarctic Solar Array (100 kWp)", type="solar",
                    building="South Ridge Field", status="normal", healthScore=89.0, criticality="medium",
                    vibration=0.2, temperature=-18.0, powerKw=28.0, runtimeHours=8900.0,
                    lastMaintenance="2026-03-10", predictedFailureDays=200, failureRisk="Low",
                    recommendedAction="Albedo reflection yield nominal",
                    position3D=[15.0, 0.5, -12.0]
                ),
                Asset(
                    assetId="FUEL-FARM-01", stationId="BHARATI", name="Double-Walled Arctic ATF/Diesel Depot", type="fuel_tank",
                    building="Fuel Depot", status="normal", healthScore=97.5, criticality="high",
                    vibration=0.0, temperature=-12.0, powerKw=4.5, runtimeHours=22000.0,
                    lastMaintenance="2026-04-14", predictedFailureDays=500, failureRisk="Low",
                    recommendedAction="Level: 215,000 L / 250,000 L (86%)",
                    position3D=[20.0, 1.5, 10.0]
                ),
                Asset(
                    assetId="RADOME-01", stationId="BHARATI", name="GSAT-10 Polar Radome Satellite Uplink", type="radome",
                    building="Upper Deck Mast", status="normal", healthScore=95.0, criticality="high",
                    vibration=0.4, temperature=18.0, powerKw=12.0, runtimeHours=18400.0,
                    lastMaintenance="2026-07-01", predictedFailureDays=300, failureRisk="Low",
                    recommendedAction="Pointing angle lock 99.8% SNR",
                    position3D=[0.0, 8.5, 0.0]
                )
            ],
            "MAITRI": [
                Asset(
                    assetId="M-GEN-01", stationId="MAITRI", name="Ruston Cummins Genset A", type="generator",
                    building="Main Power Shack", status="normal", healthScore=90.2, criticality="high",
                    vibration=1.8, temperature=66.0, powerKw=140.0, runtimeHours=11200.0,
                    lastMaintenance="2026-06-01", predictedFailureDays=110, failureRisk="Low",
                    recommendedAction="Exhaust temperature stable at 380°C",
                    position3D=[-6.0, 1.0, 3.0]
                ),
                Asset(
                    assetId="M-GEN-02", stationId="MAITRI", name="Ruston Cummins Genset B", type="generator",
                    building="Main Power Shack", status="normal", healthScore=88.4, criticality="high",
                    vibration=2.1, temperature=69.0, powerKw=140.0, runtimeHours=10800.0,
                    lastMaintenance="2026-05-20", predictedFailureDays=95, failureRisk="Low",
                    recommendedAction="Lubrication pressure verified",
                    position3D=[-6.0, 1.0, -3.0]
                ),
                Asset(
                    assetId="M-BOILER-01", stationId="MAITRI", name="Central Hydronic Heating Boiler", type="hvac",
                    building="Boiler House", status="normal", healthScore=89.0, criticality="high",
                    vibration=0.9, temperature=72.0, powerKw=55.0, runtimeHours=16000.0,
                    lastMaintenance="2026-06-15", predictedFailureDays=130, failureRisk="Low",
                    recommendedAction="Glycol loop pressure 2.4 bar",
                    position3D=[2.0, 1.0, 5.0]
                ),
                Asset(
                    assetId="M-PUMP-LAKE", stationId="MAITRI", name="Priyadarshini Lake Heated Water Line", type="water_ro",
                    building="Lake Pumphouse", status="normal", healthScore=86.5, criticality="high",
                    vibration=1.7, temperature=4.5, powerKw=32.0, runtimeHours=7400.0,
                    lastMaintenance="2026-06-28", predictedFailureDays=80, failureRisk="Medium",
                    recommendedAction="Trace heating trace cables pulling 28A",
                    position3D=[18.0, 0.5, 14.0]
                ),
                Asset(
                    assetId="M-WIND-01", stationId="MAITRI", name="Polar Rugged Wind Turbine (20 kW)", type="wind_turbine",
                    building="East Ridge Mast", status="normal", healthScore=92.0, criticality="medium",
                    vibration=2.4, temperature=-22.0, powerKw=18.5, runtimeHours=5900.0,
                    lastMaintenance="2026-04-10", predictedFailureDays=160, failureRisk="Low",
                    recommendedAction="Pitch control locked under storm mode",
                    position3D=[25.0, 5.0, -8.0]
                )
            ]
        }

        # Active Alerts
        self.alerts: List[Alert] = [
            Alert(
                alertId="ALT-001",
                stationId="BHARATI",
                assetId="GEN-02",
                level="critical",
                title="GEN-02 Harmonic Vibration Anomaly",
                description="Bearing vibration reached 3.9 mm/s (baseline: 1.4 mm/s). Correlated with 12°C stator heat delta.",
                timestamp="12 min ago",
                riskScore=84.5,
                probability=0.88,
                impact=0.92,
                criticality=0.95,
                acknowledged=False,
                assignedTo="Chief Eng. R. Sharma"
            ),
            Alert(
                alertId="ALT-002",
                stationId="BHARATI",
                assetId="FUEL-FARM-01",
                level="warning",
                title="Fuel Burn Rate Acceleration",
                description="Station consumption is 11% above seasonal baseline due to -28°C cold snap.",
                timestamp="38 min ago",
                riskScore=62.0,
                probability=0.70,
                impact=0.85,
                criticality=0.90,
                acknowledged=True
            ),
            Alert(
                alertId="ALT-003",
                stationId="BHARATI",
                assetId="HVAC-01",
                level="advisory",
                title="Zone 3 Living Quarters Temp Delta",
                description="Living quarters corridor temperature dipped to +17.2°C (setpoint: +21°C).",
                timestamp="2 hrs ago",
                riskScore=35.0,
                probability=0.45,
                impact=0.50,
                criticality=0.60,
                acknowledged=True
            ),
            Alert(
                alertId="ALT-004",
                stationId="MAITRI",
                assetId="M-PUMP-LAKE",
                level="warning",
                title="Lake Water Line Trace Heating Current Surge",
                description="Trace heating circuit drawn 34A (rated 30A max) to prevent intake freezing at -33°C.",
                timestamp="1 hr ago",
                riskScore=68.0,
                probability=0.75,
                impact=0.80,
                criticality=0.88,
                acknowledged=False
            )
        ]

        # Inventory Items
        self.inventory: List[InventoryItem] = [
            InventoryItem(itemId="INV-01", stationId="BHARATI", name="Caterpillar G3516 Ceramic Journal Bearings", category="spare_parts", quantity=2, unit="sets", dailyConsumption=0.01, daysRemaining=180, leadTimeDays=90, criticality="critical", status="safe"),
            InventoryItem(itemId="INV-02", stationId="BHARATI", name="Polar Arctic Fuel Micron Filter Cartridges", category="spare_parts", quantity=4, unit="units", dailyConsumption=0.15, daysRemaining=26, leadTimeDays=60, criticality="critical", status="stockout_risk"),
            InventoryItem(itemId="INV-03", stationId="BHARATI", name="Dow Filmtec RO Desalination Membranes", category="spare_parts", quantity=6, unit="elements", dailyConsumption=0.03, daysRemaining=200, leadTimeDays=90, criticality="high", status="safe"),
            InventoryItem(itemId="INV-04", stationId="BHARATI", name="Arctic Winterized Diesel (Jet A-1 / ATF)", category="fuel", quantity=215000, unit="liters", dailyConsumption=1510.0, daysRemaining=142, leadTimeDays=120, criticality="critical", status="safe"),
            InventoryItem(itemId="INV-05", stationId="BHARATI", name="Silicon Carbide Heating Elements (2 kW)", category="life_support", quantity=5, unit="pcs", dailyConsumption=0.08, daysRemaining=62, leadTimeDays=75, criticality="critical", status="reorder_required"),
            InventoryItem(itemId="INV-06", stationId="BHARATI", name="Deep-Freeze Emergency Medical Trauma Kits", category="medical", quantity=14, unit="kits", dailyConsumption=0.02, daysRemaining=700, leadTimeDays=120, criticality="critical", status="safe"),
            InventoryItem(itemId="INV-07", stationId="BHARATI", name="Freeze-Dried Caloric Rations (25-person 6mo)", category="rations", quantity=180, unit="crates", dailyConsumption=0.8, daysRemaining=225, leadTimeDays=120, criticality="high", status="safe"),
            InventoryItem(itemId="INV-08", stationId="MAITRI", name="Priyadarshini Lake Submersible Pump Impellers", category="spare_parts", quantity=1, unit="set", dailyConsumption=0.02, daysRemaining=50, leadTimeDays=90, criticality="critical", status="stockout_risk"),
            InventoryItem(itemId="INV-09", stationId="MAITRI", name="Hydronic Glycol Antifreeze Drums (200L)", category="life_support", quantity=18, unit="drums", dailyConsumption=0.06, daysRemaining=300, leadTimeDays=90, criticality="high", status="safe")
        ]

        # Work Orders
        self.work_orders: List[WorkOrder] = [
            WorkOrder(
                orderId="WO-2026-089",
                stationId="BHARATI",
                assetId="GEN-02",
                title="Emergency Inspection of G-02 Generator Bearing & Harmonic Damping",
                priority="high",
                status="in_progress",
                assignedTechnician="S. Sen (Mechanical)",
                estimatedHours=4.5,
                requiredSpares=["INV-01 Ceramic Journal Bearings", "INV-02 Fuel Filter"],
                checklist=[
                    {"item": "Isolate electrical output and engage manual lockout tagout (LOTO)", "done": True},
                    {"item": "Attach vibration accelerometer to drive-end and non-drive-end bearings", "done": True},
                    {"item": "Sample lubrication oil for iron/copper metallic particulate debris", "done": False},
                    {"item": "Inspect coupling elastomer for thermal degradation", "done": False},
                    {"item": "Perform cold rotation test prior to load recommissioning", "done": False}
                ],
                createdAt="2026-09-07T08:15:00Z"
            ),
            WorkOrder(
                orderId="WO-2026-088",
                stationId="BHARATI",
                assetId="SOLAR-PV-01",
                title="Clean snow drift accumulation on South Ridge PV array",
                priority="medium",
                status="approved",
                assignedTechnician="K. Verma (Electrical)",
                estimatedHours=2.0,
                requiredSpares=[],
                checklist=[
                    {"item": "Verify wind chill index is above -35°C before outdoor egress", "done": True},
                    {"item": "Soft-brush snow deposits from lower bifacial reflectors", "done": False},
                    {"item": "Verify DC string voltage at combiner box 1", "done": False}
                ],
                createdAt="2026-09-06T14:30:00Z"
            ),
            WorkOrder(
                orderId="WO-2026-087",
                stationId="BHARATI",
                assetId="WATER-RO-1",
                title="Desalination intake line backwash cycle and membrane CIP cleaning",
                priority="low",
                status="completed",
                assignedTechnician="A. Joshi (Life Support)",
                estimatedHours=3.0,
                requiredSpares=[],
                checklist=[
                    {"item": "Circulate citric acid cleaning solution for 45 minutes", "done": True},
                    {"item": "Measure differential pressure across cartridge filter", "done": True},
                    {"item": "Record permeate salinity and reset CIP interval timer", "done": True}
                ],
                createdAt="2026-09-05T09:00:00Z",
                completedAt="2026-09-05T12:30:00Z"
            )
        ]

        # Sync Queue for Store-and-Forward
        self.sync_queue: List[Dict[str, Any]] = []
        self.is_satellite_online: bool = True

    def toggle_satellite_connection(self, online: bool) -> Dict[str, Any]:
        self.is_satellite_online = online
        status = "ONLINE" if online else "OFFLINE"
        for st in self.stations.values():
            st.connectivity = status
        
        flushed_count = 0
        if online and self.sync_queue:
            flushed_count = len(self.sync_queue)
            self.sync_queue.clear()

        return {
            "is_online": self.is_satellite_online,
            "status": status,
            "flushed_events": flushed_count,
            "queue_depth": len(self.sync_queue),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def inject_anomaly(self, asset_id: str, severity: str = "critical") -> Dict[str, Any]:
        """Simulates an anomaly for the SIH demo sequence"""
        target_asset = None
        target_station = "BHARATI"
        for st_id, assets in self.assets.items():
            for a in assets:
                if a.assetId == asset_id:
                    target_asset = a
                    target_station = st_id
                    break

        if not target_asset:
            return {"error": "Asset not found"}

        if severity == "critical":
            target_asset.vibration = 4.85
            target_asset.temperature = 84.6
            target_asset.healthScore = 64.0
            target_asset.status = "critical"
            target_asset.failureRisk = "High"
            target_asset.predictedFailureDays = 3
            target_asset.recommendedAction = "IMMEDIATE SHUTDOWN & BEARING REPLACEMENT RECOMMENDED"

            # Create immediate high-priority alert
            new_alert = Alert(
                alertId=f"ALT-{int(time.time()) % 10000}",
                stationId=target_station,
                assetId=target_asset.assetId,
                level="critical",
                title=f"{target_asset.assetId} Catastrophic Bearing Thermal-Vibration Excursion",
                description=f"Vibration jumped to {target_asset.vibration:.2f} mm/s with bearing temperature at {target_asset.temperature:.1f}°C. Severe mechanical wear detected.",
                timestamp="Just now",
                riskScore=94.0,
                probability=0.95,
                impact=0.98,
                criticality=0.98,
                acknowledged=False
            )
            self.alerts.insert(0, new_alert)
            self.stations[target_station].healthScore = 84.5
            self.stations[target_station].healthBreakdown.equipment = 72.0
            self.stations[target_station].healthBreakdown.energy = 78.0

            # If offline, queue event
            if not self.is_satellite_online:
                self.sync_queue.append({
                    "type": "ANOMALY_TRIGGERED",
                    "assetId": target_asset.assetId,
                    "alertId": new_alert.alertId,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

            return {
                "success": True,
                "asset": target_asset,
                "alert": new_alert,
                "stationHealth": self.stations[target_station].healthScore
            }
        
        return {"success": True}

    def reset_anomaly(self, asset_id: str) -> Dict[str, Any]:
        """Resets asset to normal state"""
        for st_id, assets in self.assets.items():
            for a in assets:
                if a.assetId == asset_id:
                    a.vibration = 1.3
                    a.temperature = 58.0
                    a.healthScore = 93.5
                    a.status = "normal"
                    a.failureRisk = "Low"
                    a.predictedFailureDays = 160
                    a.recommendedAction = "Routine inspection at scheduled window"
                    self.stations[st_id].healthScore = 92.4
                    self.stations[st_id].healthBreakdown.equipment = 94.0
                    return {"success": True, "asset": a}
        return {"error": "Asset not found"}

simulator = PolarTwinSimulator()
