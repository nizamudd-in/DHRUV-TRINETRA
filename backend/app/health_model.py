"""
Prototype deterministic asset health model.

This is a transparent, rule-based scoring formula — NOT a trained machine-learning
model, NOT a certified predictive-maintenance system, and NOT real NCPOR telemetry.
It exists so the prototype's asset health scores are genuinely derived from live
telemetry (vibration, temperature, runtime, load) instead of hand-set constants,
so health visibly changes when telemetry changes and returns to a consistent
baseline when telemetry is reset.

FORMULA (per asset type that has a telemetry model below):

    healthScore = 100 - vibration_penalty - temperature_penalty
                       - runtime_penalty  - load_penalty        (generators only)

Each penalty is a continuous piecewise-linear function of the raw telemetry value,
anchored at the documented threshold points below (see _piecewise_penalty). Using
linear interpolation between named anchors — rather than step functions — avoids
discontinuous jumps as a value crosses a threshold, per the prototype's design goal.

Asset types with no telemetry-backed model here (battery, solar, fuel_tank, radome,
wind_turbine) fall back to their existing seeded/prototype health value rather than
fabricating a formula for telemetry this prototype doesn't track as a wear
indicator — see calculate_asset_health()'s fallback branch.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

# ---------------------------------------------------------------------------------
# Centralized thresholds/weights — the ONLY place penalty curves are configured.
# Each entry is a sorted list of (telemetry_value, penalty_points) anchors.
# ---------------------------------------------------------------------------------

GENERATOR_HEALTH_MODEL: Dict[str, List[Tuple[float, float]]] = {
    # mm/s -> penalty. 1.8 mm/s is the "safe baseline" already referenced elsewhere
    # in the app (AssetDetailDrawer, AI copilot); 4.5+ mm/s matches the vibration
    # the demo's "critical" anomaly injection sets (4.85 mm/s).
    "vibration": [(1.8, 0.0), (3.0, 15.0), (4.5, 32.0), (6.0, 42.0)],
    # degrees C -> penalty. 75C/85C mirror the "near safety threshold" / "max safe
    # temperature" language already used elsewhere in the app for generators.
    "temperature": [(75.0, 0.0), (80.0, 10.0), (85.0, 25.0), (95.0, 40.0)],
    # operating hours -> penalty (generic cumulative wear curve).
    "runtime": [(0.0, 0.0), (8000.0, 6.0), (12000.0, 14.0), (20000.0, 24.0)],
    # kW -> penalty, against an assumed ~200 kW generator rating. The prototype has
    # no per-unit rated-capacity field; 200 kW mirrors the same assumption already
    # used by the What-If Simulator and Failure Cascade engine (STANDBY_GEN_CAPACITY_KW
    # region) so load stress reads consistently across the app.
    "load": [(0.0, 0.0), (150.0, 2.0), (200.0, 7.0), (260.0, 14.0)],
}

HVAC_HEALTH_MODEL: Dict[str, List[Tuple[float, float]]] = {
    "vibration": [(1.5, 0.0), (2.5, 12.0), (4.0, 28.0), (6.0, 38.0)],
    "temperature": [(50.0, 0.0), (60.0, 8.0), (70.0, 20.0), (85.0, 34.0)],
    "runtime": [(0.0, 0.0), (10000.0, 6.0), (15000.0, 14.0), (25000.0, 24.0)],
}

WATER_RO_HEALTH_MODEL: Dict[str, List[Tuple[float, float]]] = {
    "vibration": [(1.5, 0.0), (2.5, 12.0), (4.0, 28.0), (6.0, 38.0)],
    "temperature": [(45.0, 0.0), (55.0, 8.0), (65.0, 20.0), (80.0, 34.0)],
    "runtime": [(0.0, 0.0), (8000.0, 6.0), (12000.0, 14.0), (20000.0, 24.0)],
}

ASSET_TYPE_MODELS: Dict[str, Dict[str, List[Tuple[float, float]]]] = {
    "generator": GENERATOR_HEALTH_MODEL,
    "hvac": HVAC_HEALTH_MODEL,
    "water_ro": WATER_RO_HEALTH_MODEL,
    # battery, solar, fuel_tank, radome, wind_turbine: no telemetry-backed model yet.
    # BESS in particular should key off SOC/SOH/cycle-count rather than
    # vibration/temperature once that telemetry exists — documented limitation.
}

# Overall health -> status band, used for the "healthStatus" field in the API result.
HEALTH_STATUS_BANDS: List[Tuple[float, str]] = [
    (85.0, "HEALTHY"),
    (60.0, "DEGRADED"),
    (35.0, "AT_RISK"),
    (0.0, "CRITICAL"),
]


def _piecewise_penalty(value: float, points: List[Tuple[float, float]]) -> float:
    """Linearly interpolate a penalty curve between documented anchor points.
    Clamps to the first/last anchor's penalty outside the defined range. Continuous
    everywhere — no discontinuous jumps at a threshold boundary."""
    if value <= points[0][0]:
        return points[0][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if value <= x1:
            frac = (value - x0) / (x1 - x0) if x1 > x0 else 0.0
            return y0 + frac * (y1 - y0)
    return points[-1][1]


def _component_score(penalty: float, points: List[Tuple[float, float]]) -> float:
    """Normalizes a single factor's penalty onto a 0-100 'how healthy is just this
    factor' sub-score, for the componentScores breakdown in the API result."""
    max_penalty = points[-1][1]
    if max_penalty <= 0:
        return 100.0
    return max(0.0, 100.0 - (penalty / max_penalty) * 100.0)


def get_thresholds(asset_type: str) -> Dict[str, Dict[str, float]]:
    """Exposes the SAME anchor points used for scoring (not invented separately) as
    {baseline, warning, critical} triples per metric, so charts can draw threshold
    lines that are guaranteed consistent with the health model's actual math."""
    model = ASSET_TYPE_MODELS.get(asset_type)
    if not model:
        return {}
    out: Dict[str, Dict[str, float]] = {}
    for metric, points in model.items():
        out[metric] = {
            "baseline": points[0][0],
            "warning": points[1][0],
            "critical": points[2][0]
        }
    return out


def _status_band(score: float) -> str:
    for threshold, label in HEALTH_STATUS_BANDS:
        if score >= threshold:
            return label
    return "CRITICAL"


def calculate_asset_health(asset: Any) -> Dict[str, Any]:
    """
    Deterministic prototype health model — NOT a trained ML model.

    Computes healthScore = 100 - sum(telemetry penalties) using the documented
    threshold tables above, for asset types with a defined model. Asset types
    without a telemetry-backed model (see ASSET_TYPE_MODELS) fall back to the
    asset's existing seeded health value, explicitly flagged via modelApplied=False.

    Returns a dict: healthScore, status, components, factors, calculatedAt, modelApplied.
    """
    model = ASSET_TYPE_MODELS.get(asset.type)

    if model is None:
        return {
            "healthScore": round(asset.healthScore, 1),
            "status": _status_band(asset.healthScore),
            "components": {},
            "factors": [f"No telemetry-backed health model for asset type '{asset.type}' — using seeded prototype value."],
            "calculatedAt": datetime.now(timezone.utc).isoformat(),
            "modelApplied": False
        }

    components: Dict[str, float] = {}
    factors: List[str] = []
    penalty_total = 0.0

    vib_points = model["vibration"]
    vib_pen = _piecewise_penalty(asset.vibration, vib_points)
    components["vibration"] = round(_component_score(vib_pen, vib_points), 1)
    penalty_total += vib_pen
    if vib_pen >= vib_points[2][1] * 0.5:
        factors.append(f"Vibration {asset.vibration:.2f} mm/s significantly above baseline")
    elif vib_pen > 0:
        factors.append(f"Vibration {asset.vibration:.2f} mm/s slightly elevated")

    temp_points = model["temperature"]
    temp_pen = _piecewise_penalty(asset.temperature, temp_points)
    components["temperature"] = round(_component_score(temp_pen, temp_points), 1)
    penalty_total += temp_pen
    if temp_pen >= temp_points[2][1] * 0.7:
        factors.append(f"Temperature {asset.temperature:.1f}°C near the configured safety limit")
    elif temp_pen > 0:
        factors.append(f"Temperature {asset.temperature:.1f}°C mildly elevated")

    runtime_points = model["runtime"]
    runtime_pen = _piecewise_penalty(asset.runtimeHours, runtime_points)
    components["runtime"] = round(_component_score(runtime_pen, runtime_points), 1)
    penalty_total += runtime_pen
    if runtime_pen >= runtime_points[2][1] * 0.7:
        factors.append(f"Runtime {asset.runtimeHours:,.0f} h approaching major-overhaul wear territory")

    if "load" in model:
        load_points = model["load"]
        load_pen = _piecewise_penalty(asset.powerKw, load_points)
        components["load"] = round(_component_score(load_pen, load_points), 1)
        penalty_total += load_pen
        if load_pen >= load_points[2][1] * 0.7:
            factors.append(f"Sustained load {asset.powerKw:.0f} kW adding thermal/mechanical stress")

    health_score = max(0.0, min(100.0, 100.0 - penalty_total))
    if not factors:
        factors.append("All monitored telemetry within nominal thresholds")

    return {
        "healthScore": round(health_score, 1),
        "status": _status_band(health_score),
        "components": components,
        "factors": factors,
        "calculatedAt": datetime.now(timezone.utc).isoformat(),
        "modelApplied": True
    }
