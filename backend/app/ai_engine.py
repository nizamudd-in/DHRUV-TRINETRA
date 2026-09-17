from typing import Dict, Any, List
from .models import SimulationRequest, SimulationResult, CopilotQuery, CopilotResponse
from .simulator import simulator

class PolarAIEngine:
    def __init__(self):
        pass

    def run_simulation(self, req: SimulationRequest) -> SimulationResult:
        st = simulator.stations.get(req.stationId, simulator.stations["BHARATI"])
        base_demand = st.powerLoadKw

        # Temperature impact: roughly 3.5 kW extra heating per 1°C ambient drop
        temp_impact = abs(req.ambientTempDelta) * 3.5 if req.ambientTempDelta < 0 else 0
        occupancy_impact = req.occupancyDelta * 1.2
        projected_demand = base_demand + temp_impact + occupancy_impact

        # If generator offline
        critical_loads_affected = []
        gen_capacity = st.powerCapacityKw
        if req.generatorOfflineId:
            # Drop 200 kW capacity
            gen_capacity -= 200.0
            if projected_demand > gen_capacity:
                critical_loads_affected = [
                    "Non-essential Science Incubators (Zone C)",
                    "Sub-surface Geothermal Drill Heaters",
                    "Secondary RO Desalination Loop"
                ]

        demand_delta_pct = ((projected_demand - base_demand) / base_demand) * 100.0
        projected_fuel_burn = projected_demand * 0.28 # ~0.28 L/kWh for arctic diesel
        
        # Calculate fuel runway
        fuel_reserve = 215000 if req.stationId == "BHARATI" else 145000
        daily_burn = projected_fuel_burn * 24
        fuel_runway = int(fuel_reserve / daily_burn) if daily_burn > 0 else 120

        # Battery buffer hours
        battery_kwh = 400.0 * (st.batterySoc / 100.0)
        unmet_load = max(0.0, projected_demand - gen_capacity)
        battery_buffer = (battery_kwh / unmet_load) if unmet_load > 0 else 18.0

        risk_level = "LOW"
        if unmet_load > 50.0 or req.supplyShipDelayDays > 20:
            risk_level = "CRITICAL"
        elif unmet_load > 0.0 or demand_delta_pct > 15.0 or req.supplyShipDelayDays > 0:
            risk_level = "MEDIUM"

        mitigations = [
            f"Spin up Emergency Standby Genset 3 (capacity +150 kW)",
            "Enable Zone-based selective thermal load shedding for Lab Block",
            "Set BESS dispatch to Peak-Shaving mode between 18:00 - 22:00 UTC",
            f"Logistics: expedite winter resupply vessel (Lead time buffer: {max(0, 45 - req.supplyShipDelayDays)} days)"
        ]

        return SimulationResult(
            scenarioName=f"Stress Test: ΔT={req.ambientTempDelta}°C, Offline={req.generatorOfflineId or 'None'}",
            projectedDemandKw=round(projected_demand, 1),
            baseDemandKw=round(base_demand, 1),
            demandDeltaPct=round(demand_delta_pct, 1),
            projectedFuelBurnLph=round(projected_fuel_burn, 1),
            fuelRunwayDays=fuel_runway,
            batteryBufferHours=round(battery_buffer, 1),
            riskLevel=risk_level,
            criticalLoadsAffected=critical_loads_affected,
            mitigationStrategy=mitigations
        )

    def process_copilot_query(self, query: CopilotQuery) -> CopilotResponse:
        p = query.prompt.lower()
        st = simulator.stations.get(query.stationId, simulator.stations["BHARATI"])
        assets = simulator.assets.get(query.stationId, [])

        # Generator G-02 or risk query
        if "generator" in p or "g-02" in p or "highest" in p or "risk" in p or "attention" in p or "fail" in p:
            g2 = next((a for a in assets if a.assetId == "GEN-02"), None)
            vibe = g2.vibration if g2 else 3.9
            temp = g2.temperature if g2 else 78.4
            health = g2.healthScore if g2 else 71.8

            return CopilotResponse(
                answer=(
                    f"**Generator G-02** has the highest operational risk index at {st.name}.\n\n"
                    f"• **Current Health Score:** {health:.1f}% ({'CRITICAL' if health < 70 else 'WARNING'})\n"
                    f"• **Bearing Vibration:** {vibe:.2f} mm/s (Normal threshold: <1.8 mm/s)\n"
                    f"• **Stator/Bearing Temp:** {temp:.1f}°C (+14°C above baseline)\n\n"
                    f"AI spectral vibration analysis indicates a 2X shaft rotational harmonic, indicating drive-end ceramic roller bearing pitting. "
                    f"If left unaddressed during the upcoming katabatic gale, bearing lockup probability within 96 hours is **88.4%**."
                ),
                confidence=0.96,
                contributingFactors=[
                    "High harmonic 2X vibration peak detected by accelerometer",
                    "Elevated lube oil differential temperature (+8.2°C)",
                    "Continuous duty runtime past 7,800 operational hours"
                ],
                recommendedActions=[
                    "Execute Work Order WO-2026-089 (Mechanical Bearing Inspection)",
                    "Verify spare Caterpillar G3516 Ceramic Journal Bearings (INV-01: 2 sets available in storage)",
                    "Pre-warm Emergency Standby Genset 3 (GEN-03) prior to taking G-02 offline",
                    "Run What-If simulation to model load shedding during maintenance window"
                ],
                suggestedFollowups=[
                    "Check spare part availability for GEN-02",
                    "Simulate taking Generator G-02 offline",
                    "What is current fuel consumption rate?"
                ]
            )

        # Energy & Fuel query
        elif "fuel" in p or "energy" in p or "consumption" in p or "power" in p or "spike" in p or "increase" in p:
            return CopilotResponse(
                answer=(
                    f"**Energy Analysis for {st.name}:**\n\n"
                    f"• Current station load: **{st.powerLoadKw} kW** (Load factor: 57.5% of 600 kW capacity)\n"
                    f"• Winter fuel reserve: **{st.fuelDaysRemaining} days remaining** (215,000 L Arctic ATF/Diesel)\n"
                    f"• Battery BESS Storage: **{st.batterySoc}% SOC** (nominal health 96.4%)\n\n"
                    f"Energy consumption increased by **+12.4%** over the past 24 hours. The primary contributor is the thermal HVAC system responding to "
                    f"ambient katabatic winds (-28.4°C, 36.5 knots), requiring +45 kW continuous trace heating."
                ),
                confidence=0.94,
                contributingFactors=[
                    "Ambient temperature dropped to -28.4°C",
                    "Katabatic wind chill factor increased thermal dissipation",
                    "Priyadarshini / Desalination trace heating energized"
                ],
                recommendedActions=[
                    "Maintain current diesel generation split: G-01 (175 kW) + G-02 (170 kW)",
                    "Bifacial solar field yield is contributing 28 kW during albedo daylight hours",
                    "Ensure fuel depot heating circuits remain above -15°C to avoid paraffin wax crystallization"
                ],
                suggestedFollowups=[
                    "What happens if temperature drops to -40°C?",
                    "Which spare parts are running low?",
                    "Show station health breakdown"
                ]
            )

        # Logistics & Spares query
        elif "spare" in p or "inventory" in p or "logistics" in p or "stockout" in p or "cargo" in p or "ship" in p:
            return CopilotResponse(
                answer=(
                    f"**Logistics & Critical Spares Overview ({st.name}):**\n\n"
                    f"• **Stockout Risk:** Item **INV-02** (*Polar Arctic Fuel Micron Filter Cartridges*) has only **26 days remaining** with a 60-day resupply lead time.\n"
                    f"• **High Priority:** Item **INV-05** (*Silicon Carbide 2kW Heating Elements*) is at reorder threshold (62 days left).\n"
                    f"• **Critical Spares:** Ceramic Journal Bearings for Genset (INV-01) currently have 2 replacement sets safely stored in Heated Depot Block B.\n\n"
                    f"The Indian Antarctic Expedition resupply vessel *MV Vasiliy Golovnin* is scheduled to depart Cape Town in 45 days."
                ),
                confidence=0.98,
                contributingFactors=[
                    "Restricted logistics window (summer resupply voyage only)",
                    "High filter clogging rate under sub-zero fuel viscosity",
                    "Uncertainty in icebreaker sea-ice navigation"
                ],
                recommendedActions=[
                    "Add 12 units of Arctic Fuel Filters to Priority 1 Manifest for MV Vasiliy Golovnin",
                    "Transfer 1 set of spare filters from Maitri station via Twin Otter ski-plane if weather permits",
                    "Verify hermetic seals on emergency trauma kits"
                ],
                suggestedFollowups=[
                    "Which asset needs attention first?",
                    "What is current fuel consumption rate?",
                    "Simulate 15-day cargo ship delay"
                ]
            )

        # General status query
        else:
            return CopilotResponse(
                answer=(
                    f"**PolarTwin Mission Overview for {st.name}:**\n\n"
                    f"• Station Health Index: **{st.healthScore}%** (Operational)\n"
                    f"• Active Personnel: **{st.personnelCount} overwintering team members**\n"
                    f"• Life Support & Heating: **NOMINAL (All zones > +19°C)**\n"
                    f"• Active Alerts: 1 Critical (G-02 Bearing), 1 Warning (Fuel Burn), 1 Advisory (HVAC Zone 3)\n"
                    f"• Satellite Connectivity: **ONLINE via GSAT-10 (Latency: 580 ms)**"
                ),
                confidence=0.95,
                contributingFactors=[
                    "Overwintering winter conditions in progress",
                    "All life-support redundancy active"
                ],
                recommendedActions=[
                    "Monitor G-02 vibration trend continuously",
                    "Review daily fuel usage vs forecast model"
                ],
                suggestedFollowups=[
                    "Which asset needs attention first?",
                    "Why did energy consumption increase?",
                    "What happens if Generator 1 goes offline?"
                ]
            )

ai_engine = PolarAIEngine()
