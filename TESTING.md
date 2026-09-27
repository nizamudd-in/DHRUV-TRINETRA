# POLAR-TWIN — Manual Testing Guide

This is the manual QA checklist for the POLAR-TWIN prototype (SIH 2026, Problem Statement 26060).
It covers every implemented feature end to end — P0/P1/P2 core workflows plus the P3 reporting/UX
backlog (real PDF/CSV export, real charts, data-source labels, prototype indicator, loading/error/
empty states, global demo reset).

There is no automated browser test suite in this repo yet (no Playwright/Cypress config, no
`test_*.py` backend tests) — this document is the actual verification path until one exists. Run
through it before any demo or handoff, and whenever P0–P3 code changes.

## 1. Setup

```bash
# Terminal 1 — backend (from backend/)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2 — frontend (from frontend/)
npm run dev
```

Open **http://localhost:5173**. Backend API is at **http://localhost:8000**.

Before starting a full pass, confirm both processes are actually running the code you intend to
test — restart both if you've made backend or frontend changes since they were last started.

## 2. How to use this checklist

Each test has a **Steps** list and an **Expected result**. Work through them in order — later
tests assume earlier ones left the app in a known state. Record PASS/FAIL and notes as you go.
If something fails, capture: what you did, what you expected, what actually happened, and any
browser console / network errors.

---

## TEST 1 — Bharati baseline load

**Steps**
1. Load the app fresh (hard refresh).
2. Confirm the station switcher in the header shows **BHARATI (Coastal)** selected.

**Expected result**
- No blank screen, no unhandled error.
- Header shows: POLARTWIN logo, station switcher, mission clocks (UTC + IST), SATCOM:
  ONLINE button, role selector, **5-Min SIH Demo** button, **EMERGENCY** button, **Reset
  Demo** button, and a **PROTOTYPE / DEMO** pill on the far right.
- Click the **PROTOTYPE / DEMO** pill → a popover opens explaining this is a demonstration
  with simulated telemetry and prototype (non-ML) models; click outside to close it.
- Sidebar shows all 11 modules: Mission Control, 3D Digital Twin, Energy & Microgrid,
  Equipment & Health, Logistics & Cargo, Polar Weather, Alerts Engine, What-If Simulation,
  Maintenance Kanban, AI Operations Copilot, Reports & Auditing.
- **Mission Control** (default tab): Station Health Index card, Power Load card, Fuel
  Runway card populate with numbers (not `NaN`/`undefined`). 3D twin canvas renders next to
  a `SIMULATED` `DataSourceBadge`. Cross-Domain Risk panel on the right shows a `PROTOTYPE`
  badge and a risk score.
- Visit each sidebar tab once — Energy & Microgrid, Equipment & Health, Logistics & Cargo,
  Polar Weather, Alerts Engine, What-If Simulation, AI Operations Copilot, Reports &
  Auditing should each show at least one `DataSourceBadge` (`SIMULATED`, `PROTOTYPE`, or
  `MIXED`) near their header.

---

## TEST 2 — Bharati anomaly injection

**Steps**
1. On Mission Control, in the "Hackathon Demo Controller" bar, click
   **Trigger Generator Vibration Anomaly**.
2. Watch the Station Health Index, Cross-Domain Risk panel, and (navigate to) Equipment &
   Health / Energy & Microgrid.

**Expected result**
- GEN-02's health score visibly drops and its status badge turns warning/critical.
- Cross-Domain Risk panel score/severity updates within a few seconds (it re-fetches on
  trigger).
- Alerts Engine shows a new/updated critical alert referencing GEN-02.
- Energy & Microgrid chart and Equipment & Health table reflect the changed vibration/
  temperature values — no stale numbers.

**Then, AI Recommendation → Simulation → Approval → Action:**
3. Click the affected asset (GEN-02) to open its detail drawer, or use **Get AI
   Recommendation** from the Cross-Domain Risk panel.
4. In the drawer's Decision Support Workflow section, click **Ask AI for Recommendation**.
5. Once a recommendation appears, click **View Simulation** (only shown if the decision has
   a proposed action pending).
6. Review the simulation result (projected load, fuel runway, mitigation strategy).
7. Click **Approve Action** (or **Reject** to test the rejection path).

**Expected result**
- Recommendation text, risk badge, and expected impact are populated (not placeholder text).
- Simulation result shows real numbers derived from the current station state.
- After approval, the panel shows "Action executed — approved by {role}" and the underlying
  asset/station state changes accordingly (e.g. health score improves, alert clears).
- The event appears in the **HISTORY** sub-tab of the drawer and in Reports & Auditing's
  audit trail.

**Export verification (do this while the anomaly is still active, so the report has real
data to show):**
8. Go to **Reports & Auditing**.
9. Click **Generate PDF** → a file should actually download (browser download prompt/tray,
   not just a spinner that resets). Open it.
10. Click **Export Real CSV** → a `.csv` file should download. Open it.

**Expected result**
- PDF opens cleanly in a PDF viewer, titled `POLAR-TWIN — Bharati Station Report`, contains
  a prototype disclaimer banner ("Not an official NCPOR report..."), and tables for
  Cross-Domain Risk, Equipment, Alerts, Inventory, Work Orders, AI Decisions, and Audit
  Trail — populated with real current Bharati numbers (GEN-02's elevated vibration should
  appear if the anomaly is still active).
- CSV opens in Excel/Sheets with header row
  `timestamp,station,asset_id,asset_name,asset_type,metric,value,unit,health_score,status,source_type`
  and real rows for every Bharati asset plus station-level rows — no placeholder/lorem
  values, all `source_type = SIMULATED`.
- Filename pattern: `POLAR-TWIN_BHARATI_Report_<date>_<time>.pdf` /
  `POLAR-TWIN_BHARATI_Telemetry_<date>_<time>.csv`.

---

## TEST 3 — Bharati reset

**Steps**
1. Click **Reset Demo** in the header.
2. Confirm the modal reads **"Reset entire demonstration?"**, explains it affects **both
   Bharati and Maitri**, and has **no password field** — just Cancel / Reset Demo.
3. Click **Reset Demo** to confirm.

**Expected result**
- Button shows a brief "Resetting…" state, then the modal closes.
- Mission Control health score, GEN-02's vibration/temperature/health, alerts, and
  Cross-Domain Risk all return to their baseline values (GEN-02 baseline is intentionally
  "warning" status with ~71.8% health / 3.9 mm/s vibration — that is the *baseline*, not
  evidence the reset failed).
- Work orders / decisions created during Test 2 are cleared.
- This must be a real backend reset (network tab shows a `POST /api/demo/reset` call), not
  a `location.reload()` — confirm by checking that any manually-typed URL hash/tab state
  you were on is preserved (a page reload would drop SPA state / show a flash).

---

## TEST 4 — Maitri baseline load

**Steps**
1. Click **MAITRI (Oasis)** in the header station switcher.
2. Repeat the Test 1 checks for Maitri.

**Expected result**
- All station-specific numbers change to Maitri's values (different coordinates, personnel
  count, health breakdown).
- Equipment & Health lists Maitri assets, including `M-GEN-01` and `M-GEN-02` (not
  Bharati's `GEN-01`/`GEN-02`).
- `DataSourceBadge`s and prototype indicator behave identically to Bharati.

---

## TEST 5 — Maitri anomaly + export

**Steps**
1. Repeat Test 2's anomaly/AI-recommendation/simulation/approval flow against a Maitri
   asset.
2. Export PDF and CSV from Reports & Auditing while on the Maitri station.

**Expected result**
- Same as Test 2, but every artifact is Maitri-specific: filenames contain `MAITRI`, PDF
  title says "Maitri Station Report", and asset rows are `M-GEN-01`/`M-GEN-02` etc.
- **Cross-station isolation check**: confirm the Maitri PDF/CSV contain no Bharati-only
  content (Bharati's coordinates, Bharati asset IDs like a bare `GEN-01`/`GEN-02` — note
  `M-GEN-02` legitimately contains the substring `GEN-02`, that is not a leak).

---

## TEST 6 — Maitri reset

**Steps**
1. Click **Reset Demo** and confirm.

**Expected result**
- Same as Test 3, but verify **both** stations reset — switch back to Bharati afterward and
  confirm it's also back to baseline (a single reset must restore both stations in one
  action, not just the currently-active one).

---

## TEST 7 — API failure handling

**Steps**
1. Stop the backend process (Ctrl+C in its terminal).
2. Reload the app, or navigate to a tab that fetches fresh data (Energy & Microgrid,
   Polar Weather, or trigger a new AI recommendation).
3. Restart the backend, then use any **Retry** button shown.

**Expected result**
- No blank white screen and no uncaught console exception that breaks the whole app.
- A visible error state appears (e.g. the app-level "Backend connection issue" banner at
  the top of the content area, or a component-level `ErrorState` with a Retry button) —
  not a silently frozen UI with stale spinners.
- After the backend is back up, clicking Retry (or reloading) recovers the app to a normal
  working state.

---

## TEST 8 — Empty / sparse data

**Steps**
1. After a fresh Reset Demo, check screens that depend on transient data: Maintenance
   Kanban (work orders), the AI decision panel before any recommendation has been
   requested, the Failure Cascade sub-tab before running a simulation.

**Expected result**
- Empty lists show an explicit "no data yet" state (e.g. "No work orders", "Ask AI for
  Recommendation" call-to-action) rather than a broken layout, a stuck spinner, or a
  misleadingly-populated chart with fabricated zero/placeholder values.

---

## TEST 9 — Export integrity (repeat, explicit)

**Steps**
1. From a station with an active anomaly, download both PDF and CSV.
2. Open the PDF in an actual PDF reader (not just a browser tab preview) and open the CSV
   in a spreadsheet app.

**Expected result**
- PDF: valid, multi-page, readable, contains the prototype disclaimer and no fabricated
  "official NCPOR approval/signature/certification" language.
- CSV: valid, real ISO timestamps, real asset IDs, real numeric readings across a 24-hour
  spread (not all identical), correct station column throughout.
- Neither file contains any secret, API key, or credential (there are none in the data
  model, but re-check if new fields are ever added to `models.py`).

---

## TEST 10 — P0–P2 regression sweep

Run quickly through the pre-P3 functionality to confirm nothing broke:

| Area | Steps | Expected |
|---|---|---|
| Station switching | Toggle Bharati ⇄ Maitri repeatedly | All panels update consistently, no stale cross-station data |
| 3D Digital Twin | Open **3D Digital Twin** tab, click an asset in the scene | Detail drawer opens for the clicked asset |
| Emergency Triage | Click **EMERGENCY** in header | Emergency modal opens; button label changes to **EMERGENCY ACTIVE** while engaged |
| Cross-Domain Risk | Trigger an anomaly | Risk panel's domain breakdown and contributing factors update, "Open Emergency Triage" button appears when risk is HIGH/CRITICAL |
| Failure Cascade | In an asset drawer, **CASCADE** sub-tab → **Run Failure Cascade Simulation** | Dependency graph / affected-systems list renders from live state |
| Health Model | Equipment & Health table | Health score bar + `%` matches the value shown in the asset drawer's TELEMETRY tab |
| Work Orders | Create a work order from an alert or asset drawer, check **Maintenance Kanban** | New order appears in the correct column |
| Inventory | **Logistics & Cargo** tab | Stockout/reorder counts and table render from live inventory state |
| Offline / sync queue | Click **SATCOM: ONLINE** to toggle offline | Button switches to **OFFLINE (N Queued)**; toggling back to online should sync/clear the queue |
| Audit trail | **Reports & Auditing**, or drawer's **HISTORY** tab | Recent actions (approvals, resets) are listed with timestamps |
| Role selector | Change the role dropdown, attempt to approve a decision that requires a different role | **Approve Action** is disabled with a tooltip explaining the required role (client-side hint only — note in Section 4) |

---

## 3. Console / network hygiene

During every test above, keep the browser DevTools console and Network tab open. At the end
of a full pass, confirm:
- Zero uncaught JS exceptions in the console.
- Zero failed (4xx/5xx) network requests that weren't intentionally triggered by Test 7.
- No requests to any endpoint other than `http://localhost:8000/api/...` (no accidental
  external calls).

## 4. Known, intentional limitations (not bugs)

- **Role-based access control is UI-only.** The role selector and the "requires approval
  by X" hint are client-side; the FastAPI backend has no auth/session layer and does not
  independently enforce roles. This is a known prototype limitation, not something to
  "fix" by editing the frontend — flag it if asked about production-readiness.
- **No automated test suite.** There are no `test_*.py` files and no Playwright/Cypress
  config in this repo. This document is the verification path until one is added.
- **GEN-02's baseline state is "warning" by design** (health ~71.8%, vibration 3.9 mm/s) —
  it's the pre-set demo scenario for showing the anomaly→AI→approval flow without extra
  clicks, not a leftover bug.
- **All data is either PROTOTYPE (deterministic rule-based models) or SIMULATED
  (generated telemetry)** — check the `DataSourceBadge` on each screen if you're ever
  unsure what a number represents. Nothing in this app is a live feed from Bharati or
  Maitri, and nothing claims official NCPOR certification.
