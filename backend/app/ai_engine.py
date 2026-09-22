import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from .models import (
    SimulationRequest, SimulationResult, CopilotQuery, CopilotResponse, ActionDecision, Alert,
    DomainRisk, CrossDomainRisk, CascadeStep, FailureCascade
)
from .simulator import simulator
from .health_model import calculate_asset_health

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
            health = calculate_asset_health(asset)
            detected_issue = (
                f"{asset.assetId} showing elevated vibration ({asset.vibration:.2f} mm/s) and bearing "
                f"temperature ({asset.temperature:.1f}°C), health index {asset.healthScore:.1f}% ({health['status']})."
            )
            explanation = (
                f"Observation: {asset.assetId} vibration is {asset.vibration:.2f} mm/s against a safe baseline "
                f"of <1.8 mm/s, with bearing temperature at {asset.temperature:.1f}°C (max safe 85°C).\n"
                f"Contributing factors: sustained runtime past {asset.runtimeHours:,.0f} operating hours combined "
                f"with the harmonic vibration signature indicates mechanical bearing wear.\n"
                f"Health index {asset.healthScore:.1f}% ({health['status']}) — " + "; ".join(health["factors"]) + ".\n"
                f"Risk: {risk} probability of failure — predicted {asset.predictedFailureDays} days to failure "
                f"at the current degradation rate.\n"
                f"Health index computed by a deterministic prototype telemetry-based health model "
                f"(vibration + temperature + runtime + load), not a trained ML predictive-maintenance system."
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
                    simulator.refresh_asset_health(backup)
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
            simulator.refresh_asset_health(asset)
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
                simulator.refresh_asset_health(backup)
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

    # --- Cross-Domain Risk Engine (deterministic/rule-based, not a trained model) ---

    @staticmethod
    def _severity_from_score(score: float) -> str:
        if score >= 75:
            return "CRITICAL"
        if score >= 50:
            return "HIGH"
        if score >= 25:
            return "MEDIUM"
        return "LOW"

    def _equipment_domain(self, assets: List[Any]):
        if not assets:
            return DomainRisk(domain="equipment", severity="LOW", score=0.0, driver=None,
                               reason="No equipment telemetry available for this station."), None, []

        worst = None
        worst_score = -1.0
        for a in assets:
            score = max(0.0, 100.0 - a.healthScore)
            score += max(0.0, a.vibration - 1.8) * 12.0
            score += max(0.0, a.temperature - 75.0) * 1.2
            score += {"Critical": 30, "High": 20, "Medium": 10, "Low": 0}.get(a.failureRisk, 0)
            if a.status == "critical":
                score += 20.0
            elif a.status == "warning":
                score += 10.0
            score = min(100.0, score)
            if a.status == "offline":
                # Taken out of service (e.g. approved for maintenance) — the operational hazard is
                # contained even though the underlying wear readings haven't reset, so this asset
                # should no longer read as an active CRITICAL risk the way a still-running one would.
                score *= 0.5
            if score > worst_score:
                worst_score = score
                worst = a

        generators = [a for a in assets if a.type == "generator"]
        healthy_generators = [a for a in generators if a.status == "normal"]
        redundancy_note = None
        if generators and len(healthy_generators) <= 1:
            worst_score = min(100.0, worst_score + 15.0)
            redundancy_note = f"only {len(healthy_generators)} of {len(generators)} generators fully healthy (reduced redundancy)"

        reasons: List[str] = []
        if worst:
            if worst.vibration > 1.8:
                reasons.append(f"{worst.assetId} vibration {worst.vibration:.2f} mm/s vs safe baseline <1.8 mm/s")
            if worst.temperature > 75.0:
                reasons.append(f"{worst.assetId} temperature {worst.temperature:.1f}°C near the safety threshold")
            if worst.failureRisk in ("Medium", "High", "Critical"):
                reasons.append(f"{worst.assetId} failure risk classified {worst.failureRisk} ({worst.predictedFailureDays} days to failure)")
            if not reasons:
                reasons.append(f"{worst.assetId} health index {worst.healthScore:.1f}% — nominal")
        if redundancy_note:
            reasons.append(redundancy_note)

        severity = self._severity_from_score(worst_score)
        return DomainRisk(
            domain="equipment", severity=severity, score=round(worst_score, 1),
            driver=worst.assetId if worst else None, reason="; ".join(reasons) if reasons else "All equipment nominal."
        ), worst, reasons

    def _energy_domain(self, station, assets: List[Any]):
        generators = [a for a in assets if a.type == "generator"]
        degraded_generators = [a for a in generators if a.status in ("critical", "offline")]
        # The station model tracks one aggregate rated capacity rather than per-unit ratings,
        # so a degraded/offline generator's impact is approximated as a proportional derate —
        # an explicit estimate, not fabricated telemetry.
        derate_frac = (len(degraded_generators) / len(generators)) if generators else 0.0
        effective_capacity = max(1.0, station.powerCapacityKw * (1.0 - derate_frac * 0.5))
        load_factor = station.powerLoadKw / effective_capacity

        if load_factor >= 1.0:
            score = 90.0
        elif load_factor > 0.85:
            score = 60.0 + (load_factor - 0.85) * 200.0
        elif load_factor > 0.70:
            score = 30.0 + (load_factor - 0.70) * 200.0
        else:
            score = load_factor * 40.0

        if station.batterySoc < 20.0:
            score += 25.0
        elif station.batterySoc < 40.0:
            score += 10.0

        if station.fuelDaysRemaining < 30:
            score += 20.0
        elif station.fuelDaysRemaining < 60:
            score += 8.0

        score = min(100.0, score)
        reasons = [f"load factor {load_factor * 100:.0f}% of {'derated' if derate_frac > 0 else 'rated'} capacity ({station.powerLoadKw:.0f} kW / {effective_capacity:.0f} kW)"]
        if degraded_generators:
            reasons.append(f"{len(degraded_generators)} of {len(generators)} generators offline/critical")
        if station.batterySoc < 40.0:
            reasons.append(f"BESS at {station.batterySoc:.0f}% SOC")
        if station.fuelDaysRemaining < 60:
            reasons.append(f"fuel runway {station.fuelDaysRemaining} days")

        severity = self._severity_from_score(score)
        return DomainRisk(
            domain="energy", severity=severity, score=round(score, 1),
            driver=degraded_generators[0].assetId if degraded_generators else None,
            reason="; ".join(reasons)
        ), reasons

    def _environment_domain(self, station):
        score = 0.0
        if station.currentTemp <= -35.0:
            score += 55.0
        elif station.currentTemp <= -25.0:
            score += 30.0
        elif station.currentTemp <= -15.0:
            score += 12.0

        if station.windSpeedKts >= 50.0:
            score += 40.0
        elif station.windSpeedKts >= 35.0:
            score += 20.0
        elif station.windSpeedKts >= 20.0:
            score += 8.0

        score = min(100.0, score)
        reasons = []
        if station.currentTemp <= -25.0:
            reasons.append(f"ambient temperature {station.currentTemp:.1f}°C (extreme cold)")
        if station.windSpeedKts >= 35.0:
            reasons.append(f"katabatic wind {station.windSpeedKts:.1f} kts")
        if not reasons:
            reasons.append(f"ambient {station.currentTemp:.1f}°C, wind {station.windSpeedKts:.1f} kts — within normal envelope")

        severity = self._severity_from_score(score)
        return DomainRisk(domain="environment", severity=severity, score=round(score, 1), driver=None, reason="; ".join(reasons)), reasons

    def _logistics_domain(self, station_id: str):
        items = [i for i in simulator.inventory if i.stationId == station_id]
        if not items:
            return DomainRisk(domain="logistics", severity="LOW", score=0.0, driver=None,
                               reason="No inventory data available for this station."), []

        stockout = [i for i in items if i.status == "stockout_risk"]
        reorder = [i for i in items if i.status == "reorder_required"]
        critical_stockout = [i for i in stockout if i.criticality == "critical"]

        score = len(critical_stockout) * 35.0
        score += len([i for i in stockout if i.criticality != "critical"]) * 20.0
        score += len(reorder) * 8.0
        score = min(100.0, score)

        reasons = []
        driver = None
        pool = critical_stockout or stockout
        if pool:
            worst = min(pool, key=lambda i: i.daysRemaining)
            driver = worst.itemId
            reasons.append(f"{worst.name} at {worst.daysRemaining}d remaining vs {worst.leadTimeDays}d resupply lead time")
        if reorder:
            reasons.append(f"{len(reorder)} item(s) at reorder threshold")
        if not reasons:
            reasons.append("Critical spares and consumables within safe thresholds.")

        severity = self._severity_from_score(score)
        return DomainRisk(domain="logistics", severity=severity, score=round(score, 1), driver=driver, reason="; ".join(reasons)), reasons

    def _communication_domain(self, station):
        if station.connectivity == "OFFLINE":
            score = 70.0
            reasons = ["satellite uplink offline — telemetry buffered at edge gateway"]
        elif station.connectivity == "SYNCING":
            score = 35.0
            reasons = ["satellite link syncing/degraded"]
        else:
            score = 5.0
            reasons = ["satellite uplink online, nominal latency"]

        queue_depth = len(simulator.sync_queue)
        if queue_depth > 0:
            score = min(100.0, score + min(20.0, queue_depth * 4.0))
            reasons.append(f"{queue_depth} telemetry event(s) buffered pending sync")

        severity = self._severity_from_score(score)
        return DomainRisk(domain="communication", severity=severity, score=round(score, 1), driver=None, reason="; ".join(reasons)), reasons

    def calculate_cross_domain_risk(self, station_id: str) -> CrossDomainRisk:
        sid = station_id.upper()
        station = simulator.stations.get(sid)
        if not station:
            raise ValueError(f"Station '{station_id}' not found")
        assets = simulator.assets.get(sid, [])
        return self._compute_cross_domain_risk(sid, station, assets)

    def _compute_cross_domain_risk(self, sid: str, station, assets: List[Any]) -> CrossDomainRisk:
        """Core scoring shared by the live risk endpoint and the failure-cascade projector below —
        `station`/`assets` may be real (live simulator state) or a hypothetical projected snapshot,
        never mutating the simulator itself."""
        equipment_risk, worst_asset, eq_factors = self._equipment_domain(assets)
        energy_risk, en_factors = self._energy_domain(station, assets)
        environment_risk, env_factors = self._environment_domain(station)
        logistics_risk, log_factors = self._logistics_domain(sid)
        communication_risk, comm_factors = self._communication_domain(station)

        interactions: List[str] = []
        generators = [a for a in assets if a.type == "generator"]
        healthy_generators = [a for a in generators if a.status == "normal"]
        load_factor = (station.powerLoadKw / station.powerCapacityKw) if station.powerCapacityKw else 0.0

        # Rule A: equipment degradation + low generator redundancy + high load -> compounds equipment & energy
        if (worst_asset and worst_asset.type == "generator" and worst_asset.status in ("warning", "critical")
                and len(healthy_generators) <= 1 and load_factor > 0.5):
            boost = 12.0
            equipment_risk.score = min(100.0, equipment_risk.score + boost)
            energy_risk.score = min(100.0, energy_risk.score + boost)
            equipment_risk.severity = self._severity_from_score(equipment_risk.score)
            energy_risk.severity = self._severity_from_score(energy_risk.score)
            interactions.append(
                f"{worst_asset.assetId} degradation + reduced generator redundancy "
                f"({len(healthy_generators)}/{len(generators)} healthy) + station load at {load_factor * 100:.0f}% "
                f"capacity → compounding equipment and energy risk"
            )

        # Rule B: extreme cold + generator degradation -> elevated energy strain (heating demand implied)
        if station.currentTemp <= -25.0 and worst_asset and worst_asset.type == "generator" and worst_asset.status in ("warning", "critical"):
            boost = 8.0
            energy_risk.score = min(100.0, energy_risk.score + boost)
            energy_risk.severity = self._severity_from_score(energy_risk.score)
            interactions.append(
                f"Extreme cold ({station.currentTemp:.1f}°C) increasing heating demand while {worst_asset.assetId} "
                f"is degraded → elevated energy strain"
            )

        # Rule C: equipment degradation + critical spare unavailable -> constrained repair capability
        if worst_asset and worst_asset.status in ("warning", "critical"):
            needed_spare = next(
                (i for i in simulator.inventory if i.stationId == sid and i.criticality == "critical"
                 and i.status in ("stockout_risk", "reorder_required")),
                None
            )
            if needed_spare:
                boost = 10.0
                equipment_risk.score = min(100.0, equipment_risk.score + boost)
                logistics_risk.score = min(100.0, logistics_risk.score + boost)
                equipment_risk.severity = self._severity_from_score(equipment_risk.score)
                logistics_risk.severity = self._severity_from_score(logistics_risk.score)
                interactions.append(
                    f"{worst_asset.assetId} degraded while critical spare '{needed_spare.name}' is "
                    f"{needed_spare.status.replace('_', ' ')} ({needed_spare.daysRemaining}d remaining) → repair capability constrained"
                )

        # Rule D: communication degraded + unresolved critical alert -> reduced decision-support visibility
        active_critical_alerts = [
            a for a in simulator.alerts
            if a.stationId == sid and not a.acknowledged and a.level in ("critical", "emergency")
        ]
        comm_degraded = station.connectivity != "ONLINE" or len(simulator.sync_queue) > 0
        visibility_penalty = 0.0
        if comm_degraded and active_critical_alerts:
            visibility_penalty = 15.0
            interactions.append(
                f"Communication degraded while {len(active_critical_alerts)} unresolved critical alert(s) active "
                f"→ decision-support visibility reduced, increasing operational risk"
            )

        domain_risks = [equipment_risk, energy_risk, environment_risk, logistics_risk, communication_risk]
        weights = {"equipment": 0.30, "energy": 0.25, "environment": 0.15, "logistics": 0.15, "communication": 0.15}
        weighted_sum = sum(dr.score * weights[dr.domain] for dr in domain_risks)
        overall_score = min(100.0, weighted_sum + visibility_penalty)
        overall_severity = self._severity_from_score(overall_score)

        primary = max(domain_risks, key=lambda d: d.score)
        headline = primary.reason.split(";")[0].strip()
        primary_driver = f"{primary.domain.capitalize()} — {primary.driver + ': ' if primary.driver else ''}{headline}"

        contributing_factors: List[str] = []
        for dr, factors in [
            (equipment_risk, eq_factors), (energy_risk, en_factors), (environment_risk, env_factors),
            (logistics_risk, log_factors), (communication_risk, comm_factors)
        ]:
            if dr.score >= 25.0:
                contributing_factors.extend(factors)

        affected_systems: List[str] = []
        if worst_asset:
            affected_systems.append(worst_asset.assetId)
        if energy_risk.score >= 25.0:
            affected_systems.append("Microgrid / BESS")
        if environment_risk.score >= 25.0:
            affected_systems.append("Thermal / HVAC Load")
        if logistics_risk.driver:
            affected_systems.append(logistics_risk.driver)
        if communication_risk.score >= 25.0:
            affected_systems.append("SATCOM Uplink")
        affected_systems = list(dict.fromkeys(affected_systems))

        recommendations: List[str] = []
        if equipment_risk.severity in ("HIGH", "CRITICAL") and worst_asset:
            recommendations.append(f"Request an AI recommendation for {worst_asset.assetId} to evaluate corrective maintenance.")
        if energy_risk.severity in ("HIGH", "CRITICAL"):
            recommendations.append("Run a What-If simulation or consider Emergency Triage to relieve microgrid load.")
        if logistics_risk.severity in ("HIGH", "CRITICAL") and logistics_risk.driver:
            recommendations.append(f"Expedite resupply/transfer for {logistics_risk.driver}.")
        if communication_risk.severity in ("HIGH", "CRITICAL"):
            recommendations.append("Verify the SATCOM link and flush buffered telemetry once reconnected.")
        if not recommendations:
            recommendations.append("No corrective action required — continue routine monitoring.")

        return CrossDomainRisk(
            stationId=sid,
            overallRisk=overall_severity,
            overallScore=round(overall_score, 1),
            primaryDriver=primary_driver,
            domainRisks=domain_risks,
            contributingFactors=contributing_factors[:6],
            affectedSystems=affected_systems[:6],
            interactions=interactions,
            recommendations=recommendations[:4],
            calculatedAt=datetime.now(timezone.utc).isoformat()
        )

    # --- Failure Cascade Engine (deterministic/rule-based dependency propagation, prototype) ---

    # Minimal, demonstrable dependency map by asset type — not an exhaustive ontology.
    ASSET_TYPE_DOMAIN = {
        "generator": "energy", "battery": "energy", "solar": "energy",
        "wind_turbine": "energy", "fuel_tank": "energy",
        "hvac": "environment", "water_ro": "logistics", "radome": "communication",
    }
    ASSET_TYPE_RELATIONSHIP = {
        "generator": "POWERS", "hvac": "HEATS", "water_ro": "SUPPORTS",
        "radome": "COMMUNICATES_WITH", "battery": "SUPPORTS", "solar": "POWERS", "wind_turbine": "POWERS",
    }

    def simulate_failure_cascade(self, station_id: str, asset_id: str, failure_mode: str = "OFFLINE") -> FailureCascade:
        sid = station_id.upper()
        aid = asset_id.upper()
        station = simulator.stations.get(sid)
        if not station:
            raise ValueError(f"Station '{station_id}' not found")
        assets = simulator.assets.get(sid, [])
        trigger = next((a for a in assets if a.assetId.upper() == aid), None)
        if not trigger:
            raise ValueError(f"Asset '{asset_id}' not found at station '{sid}'")

        steps: List[CascadeStep] = []
        seq = 1
        affected_assets: List[str] = [trigger.assetId]
        affected_domains = {"equipment"}
        mitigations: List[str] = [f"Inspect {trigger.assetId} to diagnose and resolve the underlying fault."]
        operational_impact: List[str] = []

        already_offline = trigger.status == "offline"
        initial_state = {
            "generationCapacityKw": station.powerCapacityKw,
            "powerLoadKw": station.powerLoadKw,
            "batterySoc": station.batterySoc,
            "assetStatus": trigger.status,
            "assetPowerKw": trigger.powerKw,
        }

        battery_impact: Dict[str, Any] = {
            "powerGapKw": 0.0, "currentSoc": station.batterySoc, "projectedSoc": station.batterySoc,
            "bufferHours": None, "criticalDependency": False
        }
        lost_capacity_kw = 0.0
        projected_load_kw = station.powerLoadKw
        margin_after = station.powerCapacityKw - station.powerLoadKw
        virtual_battery_soc = station.batterySoc

        if trigger.type == "generator":
            affected_domains.add("energy")
            lost_capacity_kw = 0.0 if already_offline else trigger.powerKw

            if already_offline:
                steps.append(CascadeStep(
                    sequence=seq, source=trigger.assetId, target="Station Generation", relationship="POWERS",
                    effect="No additional capacity lost — asset is already offline",
                    severity="LOW",
                    explanation=f"{trigger.assetId} is already offline; a repeated failure trigger does not subtract further generation capacity."
                ))
            else:
                steps.append(CascadeStep(
                    sequence=seq, source=trigger.assetId, target="Station Generation", relationship="POWERS",
                    effect=f"Generation capacity reduced by {lost_capacity_kw:.0f} kW",
                    severity="HIGH" if lost_capacity_kw > 0 else "LOW",
                    explanation=f"{trigger.assetId} was contributing {lost_capacity_kw:.0f} kW of current output; failure removes this from available station generation."
                ))
            seq += 1

            capacity_before = station.powerCapacityKw
            capacity_after = max(0.0, capacity_before - lost_capacity_kw)
            margin_before = capacity_before - station.powerLoadKw
            margin_after = capacity_after - station.powerLoadKw
            steps.append(CascadeStep(
                sequence=seq, source="Station Generation", target="Power Margin", relationship="SUPPORTS",
                effect=f"Generation margin {'reduced' if margin_after < margin_before else 'unchanged'} from {margin_before:.0f} kW to {margin_after:.0f} kW",
                severity="CRITICAL" if margin_after < 0 else ("HIGH" if margin_after < capacity_before * 0.1 else "MEDIUM" if lost_capacity_kw > 0 else "LOW"),
                explanation=f"Available capacity ({capacity_after:.0f} kW) against current load ({station.powerLoadKw:.0f} kW) determines the operating margin."
            ))
            seq += 1

            # Dynamically resolve a same-station standby generator — never a hardcoded ID.
            backup = next(
                (a for a in assets if a.type == "generator" and a.assetId != trigger.assetId and a.status == "normal" and a.powerKw == 0.0),
                None
            )
            if backup:
                affected_assets.append(backup.assetId)
                steps.append(CascadeStep(
                    sequence=seq, source=backup.assetId, target=trigger.assetId, relationship="BACKUP_FOR",
                    effect=f"Standby generator {backup.assetId} available (+{STANDBY_GEN_CAPACITY_KW:.0f} kW if activated)",
                    severity="MEDIUM" if margin_after < 0 else "LOW",
                    explanation=f"{backup.assetId} is idle/standby and can be activated to offset some or all of the lost capacity, pending approval."
                ))
                mitigations.append(f"Activate standby generator {backup.assetId} to restore up to {STANDBY_GEN_CAPACITY_KW:.0f} kW of capacity.")
            else:
                steps.append(CascadeStep(
                    sequence=seq, source="Station Generation", target="Standby Generation", relationship="BACKUP_FOR",
                    effect="No standby generator available at this station",
                    severity="HIGH" if margin_after < 0 else "MEDIUM",
                    explanation="No idle generator was found in a standby-ready state; the station has reduced redundancy for this failure."
                ))
                operational_impact.append("Reduced generation redundancy — no standby unit available")
            seq += 1

            # BESS impact — only draws down if an actual power gap exists (never fabricated).
            power_gap = max(0.0, -margin_after)
            battery_kwh = 400.0 * (station.batterySoc / 100.0)
            if power_gap > 0.0:
                draw_kwh = min(power_gap, battery_kwh)
                projected_soc = max(0.0, station.batterySoc - (draw_kwh / 400.0) * 100.0)
                buffer_hours = round((battery_kwh - draw_kwh) / power_gap, 1) if power_gap > 0 else None
                virtual_battery_soc = projected_soc
                battery_impact = {
                    "powerGapKw": round(power_gap, 1), "currentSoc": station.batterySoc,
                    "projectedSoc": round(projected_soc, 1), "bufferHours": buffer_hours,
                    "criticalDependency": projected_soc < 30.0
                }
                steps.append(CascadeStep(
                    sequence=seq, source="BESS", target="Power Margin", relationship="SUPPORTS",
                    effect=f"BESS discharges to cover a {power_gap:.0f} kW gap — projected SOC {projected_soc:.0f}%",
                    severity="CRITICAL" if projected_soc < 20.0 else "HIGH" if projected_soc < 40.0 else "MEDIUM",
                    explanation=f"With {power_gap:.0f} kW unmet by generation, the 400 kWh BESS (currently {station.batterySoc:.0f}% SOC) becomes a critical dependency until standby generation or load shedding closes the gap."
                ))
                mitigations.append("Dispatch BESS to buffer the residual power gap.")
                mitigations.append("Shed non-critical load to reduce dependency on BESS.")
                operational_impact.append("Increased BESS dependency")
                affected_assets.append("BESS")
            else:
                steps.append(CascadeStep(
                    sequence=seq, source="BESS", target="Power Margin", relationship="SUPPORTS",
                    effect="No power gap — BESS is not required to cover this failure",
                    severity="LOW",
                    explanation="Remaining generation capacity covers current load without drawing on battery storage."
                ))
            seq += 1

            # HVAC / thermal effect — only meaningfully affected once a real gap exists.
            hvac_assets = [a for a in assets if a.type == "hvac"]
            if hvac_assets:
                hv = hvac_assets[0]
                if power_gap > 0.0:
                    affected_domains.add("environment")
                    affected_assets.append(hv.assetId)
                    steps.append(CascadeStep(
                        sequence=seq, source="Power Margin", target=hv.assetId, relationship="POWERS",
                        effect="Non-critical HVAC/thermal load becomes a shedding candidate",
                        severity="MEDIUM",
                        explanation="Prototype dependency model: insufficient generation margin increases pressure to shed non-critical thermal load while preserving primary life-support heating."
                    ))
                    mitigations.append("Shed non-critical HVAC/thermal load while preserving primary life-support heating.")
                    operational_impact.append("Reduced thermal resilience margin")
                else:
                    steps.append(CascadeStep(
                        sequence=seq, source="Power Margin", target=hv.assetId, relationship="POWERS",
                        effect="HVAC load unaffected — sufficient generation margin remains",
                        severity="LOW",
                        explanation="Current margin covers thermal load without requiring load shedding."
                    ))
                seq += 1

            # Protected loads
            steps.append(CascadeStep(
                sequence=seq, source="Power Margin", target="Protected Loads", relationship="PROTECTS",
                effect=(f"Protected load ({station.protectedLoadKw:.0f} kW) retains priority; non-critical loads become sheddable"
                        if power_gap > 0.0 else "Protected load priority unaffected"),
                severity="MEDIUM" if power_gap > 0.0 else "LOW",
                explanation="Life-support, water and communications load are preserved first under any load-shedding response."
            ))
            seq += 1
            if power_gap > 0.0:
                mitigations.append("Preserve protected load (life-support, water, comms) as top priority if shedding is required.")
                operational_impact.append("Non-critical loads may require shedding to preserve protected load")

            projected_load_kw = station.powerLoadKw

        else:
            # Generic dependency chain for non-generator trigger assets (radome, hvac, water_ro, battery, etc.)
            domain = self.ASSET_TYPE_DOMAIN.get(trigger.type, "equipment")
            relationship = self.ASSET_TYPE_RELATIONSHIP.get(trigger.type, "SUPPORTS")
            affected_domains.add(domain)
            steps.append(CascadeStep(
                sequence=seq, source=trigger.assetId, target=domain.capitalize(), relationship=relationship,
                effect=f"{trigger.assetId} function {'already lost' if already_offline else 'lost'} — {domain} domain directly impacted",
                severity="LOW" if already_offline else "HIGH",
                explanation=f"{trigger.assetId} ({trigger.type}) failure reduces {domain} domain capability. Prototype dependency model — not exhaustive physical simulation."
            ))
            seq += 1

            if trigger.type == "radome" and not already_offline:
                steps.append(CascadeStep(
                    sequence=seq, source="Communication", target="Decision Support", relationship="SUPPORTS",
                    effect="Remote monitoring/telemetry visibility reduced",
                    severity="MEDIUM",
                    explanation="Loss of the satellite uplink radome reduces telemetry visibility for remote decision support, consistent with the Cross-Domain Risk communication domain."
                ))
                seq += 1
                operational_impact.append("Reduced remote monitoring / decision-support visibility")
                mitigations.append("Verify SATCOM link redundancy and prioritize manual status reporting.")
            elif trigger.type == "hvac" and not already_offline:
                steps.append(CascadeStep(
                    sequence=seq, source=trigger.assetId, target="Habitat Comfort", relationship="HEATS",
                    effect="Thermal comfort / life-support heating margin reduced",
                    severity="MEDIUM",
                    explanation="Reduced HVAC capacity increases reliance on remaining thermal systems. Prototype dependency model."
                ))
                seq += 1
                operational_impact.append("Reduced thermal resilience")
            elif trigger.type == "water_ro" and not already_offline:
                operational_impact.append("Potable/process water supply risk")
            elif trigger.type == "battery" and not already_offline:
                operational_impact.append("Reduced buffering capacity for any future generation shortfall")

        # Project a hypothetical post-failure state (never mutates the live simulator) and feed it
        # into the SAME Cross-Domain Risk engine used everywhere else in the app.
        virtual_assets = [
            a.model_copy(update={"status": "offline", "powerKw": 0.0}) if a.assetId == trigger.assetId and not already_offline else a
            for a in assets
        ]
        virtual_station = station.model_copy(update={"batterySoc": virtual_battery_soc})
        final_risk = self._compute_cross_domain_risk(sid, virtual_station, virtual_assets)

        if final_risk.overallRisk == "CRITICAL":
            mission_impact = "Mission readiness significantly degraded — immediate corrective action recommended."
        elif final_risk.overallRisk == "HIGH":
            mission_impact = "Mission readiness reduced — elevated dependency on backup systems."
        elif final_risk.overallRisk == "MEDIUM":
            mission_impact = "Mission readiness marginally reduced — manageable with existing redundancy."
        else:
            mission_impact = "Mission readiness largely unaffected."

        cascade_severity = final_risk.overallRisk
        affected_assets = list(dict.fromkeys(affected_assets))
        affected_domains_list = list(affected_domains)
        mitigations = list(dict.fromkeys(mitigations))

        return FailureCascade(
            cascadeId=f"CAS-{int(time.time() * 1000) % 10_000_000}",
            stationId=sid,
            triggerAssetId=trigger.assetId,
            triggerAssetName=trigger.name,
            triggerFailure=failure_mode,
            severity=cascade_severity,
            initialState=initial_state,
            cascadeSteps=steps,
            affectedAssets=affected_assets,
            affectedDomains=affected_domains_list,
            lostCapacityKw=round(lost_capacity_kw, 1),
            projectedLoadKw=round(projected_load_kw, 1),
            projectedGenerationMarginKw=round(margin_after, 1),
            batteryImpact=battery_impact,
            operationalImpact=operational_impact,
            missionImpact=mission_impact,
            finalRisk=final_risk,
            mitigations=mitigations[:6],
            generatedAt=datetime.now(timezone.utc).isoformat()
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
