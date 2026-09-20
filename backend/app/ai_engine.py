import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from .models import SimulationRequest, SimulationResult, CopilotQuery, CopilotResponse, ActionDecision, Alert
from .simulator import simulator

# Minimal RBAC: which roles may approve an action that requires a given role.
# Kept deliberately small — this is a demo authorization gate, not a full auth system.
APPROVER_ROLE_ALLOWLIST = {
    "Station Commander": {"Station Commander", "National Operator"},
    "Chief Systems Engineer": {"Chief Systems Engineer", "Station Commander", "National Operator"},
}

# Emergency triage tuning constants (deterministic/rule-based, not a trained model)
PROTECTED_LOAD_FRACTION = 0.70   # share of current load treated as life-support/water/comms critical
EMERGENCY_SHED_FRACTION = 0.85   # fraction of the non-critical remainder actually shed under triage
STANDBY_GEN_CAPACITY_KW = 150.0  # matches the "+150 kW" standby capacity referenced elsewhere in the app

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

    def simulate_emergency_triage(self, station_id: str) -> SimulationResult:
        """Models selective load shedding under emergency triage, grounded in the station's current live state."""
        sid = station_id.upper()
        st = simulator.stations.get(sid)
        if not st:
            raise ValueError(f"Station '{station_id}' not found")

        current_load = st.powerLoadKw
        protected_load = round(current_load * PROTECTED_LOAD_FRACTION, 1)
        sheddable_load = round(max(0.0, current_load - protected_load), 1)
        shed_load = round(sheddable_load * EMERGENCY_SHED_FRACTION, 1)
        projected_load = round(current_load - shed_load, 1)
        demand_delta_pct = round(((projected_load - current_load) / current_load) * 100.0, 1) if current_load else 0.0

        # Find a same-station standby generator dynamically (never hardcode an ID like GEN-03/M-GEN-03)
        backup = next(
            (a for a in simulator.assets.get(sid, []) if a.type == "generator" and a.status == "normal" and a.powerKw == 0.0),
            None
        )
        effective_capacity = st.powerCapacityKw + (STANDBY_GEN_CAPACITY_KW if backup else 0.0)
        power_gap = round(max(0.0, projected_load - effective_capacity), 1)

        battery_kwh = 400.0 * (st.batterySoc / 100.0)
        if power_gap > 0.0:
            draw_kwh = min(power_gap, battery_kwh)
            projected_soc = round(max(0.0, st.batterySoc - (draw_kwh / 400.0) * 100.0), 1)
            battery_buffer_hours = round((battery_kwh - draw_kwh) / power_gap, 1) if power_gap > 0 else 18.0
        else:
            projected_soc = st.batterySoc
            battery_buffer_hours = 18.0

        if power_gap > 20.0:
            risk_level = "CRITICAL"
        elif power_gap > 0.0 or not backup:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        projected_fuel_burn = projected_load * 0.28  # ~0.28 L/kWh for arctic diesel
        fuel_reserve = 215000 if sid == "BHARATI" else 145000
        daily_burn = projected_fuel_burn * 24
        fuel_runway = int(fuel_reserve / daily_burn) if daily_burn > 0 else 120

        mitigations = [
            f"Preserve protected life-support, water and comms load ({protected_load} kW) at full priority",
            f"Shed {shed_load} kW of non-essential load (labs, secondary desalination, non-critical HVAC)",
        ]
        if backup:
            mitigations.append(f"Activate standby generator {backup.assetId} (+{STANDBY_GEN_CAPACITY_KW:.0f} kW) to cover the gap")
        else:
            mitigations.append("No standby generator available at this station — BESS and load shedding are the only buffer")
        mitigations.append(f"Dispatch BESS to cover any residual power gap ({power_gap} kW)")

        affected = []
        if shed_load > 0:
            affected = ["Non-essential Science Laboratories", "Secondary Desalination & Snowmelt Loop", "Non-critical HVAC Zones"]

        return SimulationResult(
            scenarioName=f"Emergency Triage: Selective Load Shed ({sid})",
            projectedDemandKw=projected_load,
            baseDemandKw=current_load,
            demandDeltaPct=demand_delta_pct,
            projectedFuelBurnLph=round(projected_fuel_burn, 1),
            fuelRunwayDays=fuel_runway,
            batteryBufferHours=battery_buffer_hours,
            riskLevel=risk_level,
            criticalLoadsAffected=affected,
            mitigationStrategy=mitigations,
            protectedLoadKw=protected_load,
            shedLoadKw=shed_load,
            projectedBatterySoc=projected_soc,
            standbyGeneratorId=backup.assetId if backup else None
        )

    def generate_emergency_recommendation(self, station_id: str) -> ActionDecision:
        """Rule-based station-level emergency triage recommendation, grounded in live alerts/station state."""
        sid = station_id.upper()
        st = simulator.stations.get(sid)
        if not st:
            raise ValueError(f"Station '{station_id}' not found")

        active_alerts = [
            a for a in simulator.alerts
            if a.stationId == sid and not a.acknowledged and a.level in ("critical", "warning", "emergency")
        ]
        critical_count = sum(1 for a in active_alerts if a.level in ("critical", "emergency"))

        if critical_count > 1 or (critical_count >= 1 and st.healthScore < 80):
            risk = "Critical"
        elif critical_count >= 1:
            risk = "High"
        elif active_alerts:
            risk = "Medium"
        else:
            risk = "Low"

        trigger_summary = "; ".join(a.title for a in active_alerts[:3]) if active_alerts else "Operator-initiated precautionary triage"

        detected_issue = (
            f"{st.name}: {len(active_alerts)} unresolved warning/critical alert(s) — {trigger_summary}. "
            f"Ambient conditions: {st.currentTemp}°C, {st.windSpeedKts} kts."
        )
        explanation = (
            f"Observation: current station load is {st.powerLoadKw} kW against {st.powerCapacityKw} kW rated capacity, "
            f"with BESS at {st.batterySoc}% SOC.\n"
            f"Contributing factors: {trigger_summary}.\n"
            f"Risk: {risk} — sustained full-load operation under active contingency increases cascading failure probability."
        )
        recommendation = (
            "Engage selective load shedding: preserve protected life-support, water and communications load, "
            "shed non-essential science/secondary desalination load, dispatch BESS, and activate standby "
            "generation where available."
        )
        expected_impact = "Reduces total station demand and protects life-critical systems, at the cost of non-essential operations until stood down."

        decision = ActionDecision(
            id=f"DEC-{int(time.time() * 1000) % 10_000_000}",
            stationId=sid,
            assetId=None,
            trigger="emergency_mode",
            detectedIssue=detected_issue,
            risk=risk,
            explanation=explanation,
            recommendation=recommendation,
            proposedAction="EMERGENCY_TRIAGE",
            expectedImpact=expected_impact,
            requiredApproval="Station Commander",
            simulationRequest=None,
            approvalStatus="PENDING",
            createdAt=datetime.now(timezone.utc).isoformat()
        )
        simulator.decisions[decision.id] = decision
        simulator.log_audit(sid, None, "Emergency triage recommendation generated", "AI ENGINE", decision.id, result="EMERGENCY_TRIAGE")
        return decision

    def generate_recommendation(self, station_id: str, asset_id: str) -> ActionDecision:
        """Rule-based (not ML) recommendation grounded in the asset's current live telemetry."""
        sid = station_id.upper()
        aid = asset_id.upper()
        st = simulator.stations.get(sid)
        if not st:
            raise ValueError(f"Station '{station_id}' not found")
        asset = next((a for a in simulator.assets.get(sid, []) if a.assetId.upper() == aid), None)
        if not asset:
            raise ValueError(f"Asset '{asset_id}' not found at station '{sid}'")

        elevated = (
            asset.status in ("warning", "critical")
            or asset.vibration > 3.0
            or asset.temperature > 75.0
            or asset.failureRisk in ("Medium", "High", "Critical")
        )

        sim_req: Optional[SimulationRequest] = None

        if asset.type == "generator" and elevated:
            risk = asset.failureRisk if asset.failureRisk in ("Medium", "High", "Critical") else "Medium"
            detected_issue = (
                f"{asset.assetId} showing elevated vibration ({asset.vibration:.2f} mm/s) and bearing "
                f"temperature ({asset.temperature:.1f}°C), health index {asset.healthScore:.1f}%."
            )
            explanation = (
                f"Observation: {asset.assetId} vibration is {asset.vibration:.2f} mm/s against a safe baseline "
                f"of <1.8 mm/s, with bearing temperature at {asset.temperature:.1f}°C (max safe 85°C).\n"
                f"Contributing factors: sustained runtime past {asset.runtimeHours:,.0f} operating hours combined "
                f"with the harmonic vibration signature indicates mechanical bearing wear.\n"
                f"Risk: {risk} probability of failure — predicted {asset.predictedFailureDays} days to failure "
                f"at the current degradation rate."
            )
            recommendation = f"Take {asset.assetId} offline for inspection and activate standby generation to cover the load gap."
            proposed_action = "OFFLINE_FOR_MAINTENANCE"
            expected_impact = "Reduced generation capacity; increased dependency on standby generation and battery buffer until the unit returns to service."
            required_approval = "Station Commander"
            sim_req = SimulationRequest(
                stationId=sid, generatorOfflineId=asset.assetId,
                ambientTempDelta=0.0, occupancyDelta=0, solarEfficiencyPct=100.0, supplyShipDelayDays=0
            )
        elif asset.type == "generator":
            detected_issue = f"{asset.assetId} operating within nominal parameters."
            risk = "Low"
            explanation = (
                f"Observation: {asset.assetId} vibration {asset.vibration:.2f} mm/s and temperature "
                f"{asset.temperature:.1f}°C are within safe limits. No elevated wear indicators detected."
            )
            recommendation = "Continue routine monitoring; no corrective action required at this time."
            proposed_action = "NONE"
            expected_impact = "No operational impact expected."
            required_approval = ""
        elif elevated:
            risk = asset.failureRisk if asset.failureRisk in ("Medium", "High", "Critical") else "Medium"
            detected_issue = f"{asset.assetId} health index at {asset.healthScore:.1f}% (status: {asset.status})."
            explanation = (
                f"Observation: {asset.assetId} ({asset.type}) health index has degraded to {asset.healthScore:.1f}%.\n"
                f"Contributing factor: {asset.recommendedAction}\n"
                f"Risk: {risk}."
            )
            recommendation = f"Schedule corrective maintenance for {asset.assetId}: {asset.recommendedAction}"
            proposed_action = "SCHEDULE_MAINTENANCE"
            expected_impact = "Asset remains in service under closer monitoring until the scheduled maintenance window; no immediate load impact."
            required_approval = "Chief Systems Engineer"
        else:
            detected_issue = f"{asset.assetId} operating within nominal parameters."
            risk = "Low"
            explanation = f"Observation: {asset.assetId} health index {asset.healthScore:.1f}%, status normal. No contributing risk factors detected."
            recommendation = "No action required; continue routine monitoring."
            proposed_action = "NONE"
            expected_impact = "No operational impact expected."
            required_approval = ""

        decision = ActionDecision(
            id=f"DEC-{int(time.time() * 1000) % 10_000_000}",
            stationId=sid,
            assetId=asset.assetId,
            trigger="operator_request",
            detectedIssue=detected_issue,
            risk=risk,
            explanation=explanation,
            recommendation=recommendation,
            proposedAction=proposed_action,
            expectedImpact=expected_impact,
            requiredApproval=required_approval,
            simulationRequest=sim_req,
            approvalStatus="PENDING",
            createdAt=datetime.now(timezone.utc).isoformat()
        )
        simulator.decisions[decision.id] = decision
        simulator.log_audit(sid, asset.assetId, "AI recommendation generated", "AI ENGINE", decision.id, result=proposed_action)
        return decision

    def simulate_decision(self, decision_id: str) -> ActionDecision:
        decision = simulator.decisions.get(decision_id)
        if not decision:
            raise ValueError("Decision not found")
        if decision.proposedAction == "EMERGENCY_TRIAGE":
            result = self.simulate_emergency_triage(decision.stationId)
        else:
            if not decision.simulationRequest:
                raise ValueError("This recommendation has no associated what-if simulation")
            result = self.run_simulation(decision.simulationRequest)
        decision.simulationResult = result
        simulator.log_audit(decision.stationId, decision.assetId, "What-if simulation executed", "OPERATOR", decision.id, result=result.riskLevel)
        return decision

    def approve_decision(self, decision_id: str, approved_by: str) -> ActionDecision:
        decision = simulator.decisions.get(decision_id)
        if not decision:
            raise ValueError("Decision not found")
        if decision.approvalStatus != "PENDING":
            raise ValueError(f"Decision already {decision.approvalStatus.lower()}")
        if decision.proposedAction == "NONE":
            raise ValueError("This recommendation has no action requiring approval")
        if decision.requiredApproval:
            allowed = APPROVER_ROLE_ALLOWLIST.get(decision.requiredApproval, {decision.requiredApproval, "National Operator"})
            if approved_by not in allowed:
                raise PermissionError(
                    f"Role '{approved_by}' is not authorized to approve this action "
                    f"(requires: {decision.requiredApproval} or National Operator)."
                )

        sid = decision.stationId
        station = simulator.stations[sid]
        action_result: Dict[str, Any] = {}

        if decision.proposedAction == "EMERGENCY_TRIAGE":
            sim = decision.simulationResult
            if not sim:
                raise ValueError("Run the simulation before approving emergency triage")

            previous_state = {
                "loadKw": station.powerLoadKw,
                "batterySoc": station.batterySoc,
                "protectedLoadKw": station.protectedLoadKw,
                "shedLoadKw": station.shedLoadKw,
                "emergencyActive": station.emergencyActive,
                "status": station.status
            }

            station.powerLoadKw = sim.projectedDemandKw
            station.protectedLoadKw = sim.protectedLoadKw if sim.protectedLoadKw is not None else station.protectedLoadKw
            station.shedLoadKw = sim.shedLoadKw if sim.shedLoadKw is not None else 0.0
            if sim.projectedBatterySoc is not None:
                station.batterySoc = sim.projectedBatterySoc
            station.emergencyActive = True
            station.emergencyStrategy = "SELECTIVE_LOAD_SHED"
            station.status = "emergency"

            if sim.riskLevel == "CRITICAL":
                station.healthScore = 68.0
                station.healthBreakdown.energy = 55.0
            elif sim.riskLevel == "MEDIUM":
                station.healthScore = 78.0
                station.healthBreakdown.energy = 70.0
            else:
                station.healthScore = 85.0
                station.healthBreakdown.energy = 80.0

            if sim.standbyGeneratorId:
                backup = next((a for a in simulator.assets.get(sid, []) if a.assetId == sim.standbyGeneratorId), None)
                if backup:
                    backup.powerKw = STANDBY_GEN_CAPACITY_KW
                    backup.recommendedAction = f"Activated as standby under emergency triage — approved by {approved_by}"
                action_result["standbyActivated"] = sim.standbyGeneratorId
            else:
                action_result["standbyActivated"] = None

            emergency_alert = Alert(
                alertId=f"ALT-{int(time.time()) % 10000}",
                stationId=sid, assetId=None, level="warning",
                title="Emergency Triage Engaged — Selective Load Shedding Active",
                description=(
                    f"Load reduced from {previous_state['loadKw']} kW to {station.powerLoadKw} kW "
                    f"({station.shedLoadKw} kW shed). Protected load {station.protectedLoadKw} kW preserved."
                ),
                timestamp="Just now", riskScore=70.0, probability=1.0, impact=0.9, criticality=0.9, acknowledged=False
            )
            simulator.alerts.insert(0, emergency_alert)

            resulting_state = {
                "loadKw": station.powerLoadKw,
                "batterySoc": station.batterySoc,
                "protectedLoadKw": station.protectedLoadKw,
                "shedLoadKw": station.shedLoadKw,
                "emergencyActive": station.emergencyActive,
                "status": station.status
            }
            action_result.update({
                "emergencyActive": True,
                "loadKw": station.powerLoadKw,
                "shedLoadKw": station.shedLoadKw,
                "protectedLoadKw": station.protectedLoadKw,
                "batterySoc": station.batterySoc,
                "previousState": previous_state,
                "resultingState": resulting_state
            })

            decision.approvalStatus = "EXECUTED"
            decision.approvedBy = approved_by
            decision.executedAt = datetime.now(timezone.utc).isoformat()
            decision.actionResult = action_result

            simulator.log_audit(
                sid, None, f"{decision.recommendation}", approved_by, decision.id, result="APPROVED",
                detail={"role": approved_by, "previousState": previous_state, "resultingState": resulting_state}
            )
            simulator.log_audit(sid, None, f"{sid} station state updated (emergency triage engaged)", "SYSTEM", decision.id, result="EXECUTED")

            return decision

        asset = next((a for a in simulator.assets.get(sid, []) if a.assetId == decision.assetId), None)
        if not asset:
            raise ValueError("Asset no longer exists")

        if decision.proposedAction == "OFFLINE_FOR_MAINTENANCE":
            prior_power = asset.powerKw
            asset.status = "offline"
            asset.powerKw = 0.0
            asset.recommendedAction = f"Taken offline for maintenance — approved by {approved_by}"
            action_result["assetStatus"] = "offline"

            # Find a same-station standby generator dynamically (never hardcode an ID like GEN-03/M-GEN-03)
            backup = next(
                (a for a in simulator.assets.get(sid, [])
                 if a.type == "generator" and a.assetId != asset.assetId and a.status == "normal" and a.powerKw == 0.0),
                None
            )
            if backup:
                backup.powerKw = prior_power
                backup.recommendedAction = f"Activated as standby to cover {asset.assetId} maintenance outage"
                action_result["backupActivated"] = backup.assetId
                station.healthBreakdown.equipment = 88.0
                station.healthBreakdown.energy = 84.0
                station.healthScore = 88.0
            else:
                action_result["backupActivated"] = None
                station.status = "degraded"
                station.healthBreakdown.equipment = 80.0
                station.healthBreakdown.energy = 74.0
                station.healthScore = 76.0

            for al in simulator.alerts:
                if al.assetId == asset.assetId and not al.acknowledged:
                    al.acknowledged = True

            wo = simulator.create_work_order(
                station_id=sid, asset_id=asset.assetId,
                title=f"Approved corrective maintenance: {decision.detectedIssue}",
                priority="high", assigned_technician="Duty Mechanical Engineer",
                estimated_hours=4.0, required_spares=[]
            )
            simulator.decision_workorders[decision.id] = wo.orderId
            action_result["workOrderId"] = wo.orderId

        elif decision.proposedAction == "SCHEDULE_MAINTENANCE":
            wo = simulator.create_work_order(
                station_id=sid, asset_id=asset.assetId,
                title=decision.recommendation, priority="medium",
                assigned_technician="Duty Technician", estimated_hours=3.0, required_spares=[]
            )
            simulator.decision_workorders[decision.id] = wo.orderId
            action_result["workOrderId"] = wo.orderId
        else:
            raise ValueError(f"Unsupported action: {decision.proposedAction}")

        decision.approvalStatus = "EXECUTED"
        decision.approvedBy = approved_by
        decision.executedAt = datetime.now(timezone.utc).isoformat()
        decision.actionResult = action_result

        simulator.log_audit(sid, asset.assetId, f"{decision.recommendation}", approved_by, decision.id, result="APPROVED")
        simulator.log_audit(sid, asset.assetId, f"{asset.assetId} state updated ({action_result.get('assetStatus', 'maintenance scheduled')})", "SYSTEM", decision.id, result="EXECUTED")

        return decision

    def reject_decision(self, decision_id: str, rejected_by: str) -> ActionDecision:
        decision = simulator.decisions.get(decision_id)
        if not decision:
            raise ValueError("Decision not found")
        if decision.approvalStatus != "PENDING":
            raise ValueError(f"Decision already {decision.approvalStatus.lower()}")
        decision.approvalStatus = "REJECTED"
        decision.approvedBy = rejected_by
        decision.executedAt = datetime.now(timezone.utc).isoformat()
        simulator.log_audit(decision.stationId, decision.assetId, f"Recommendation rejected: {decision.recommendation}", rejected_by, decision.id, result="REJECTED")
        return decision

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
                    f"• Satellite Connectivity: **ONLINE via SATCOM uplink (Latency: 580 ms)**"
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
