import * as THREE from 'three';
import type { Asset } from '../../types';

// --- Central Bharati asset/anchor registry (Section 23) ---
// Single source of truth for every anchor's identity, category, and (where one exists) which
// real backend Asset its telemetry comes from. TwinCanvas3D, AssetRegistryPanel and
// SensorTable all import from here — nothing else defines anchor names, categories, or
// display labels, and NOTHING here hardcodes a 3D coordinate. Positions always come from
// `anchor.getWorldPosition()` against the loaded GLB at runtime (see TwinCanvas3D.tsx).

export type BharatiAnchorCategory = 'POWER' | 'FUEL' | 'COMMUNICATION' | 'INFRASTRUCTURE' | 'LOGISTICS';

export const BHARATI_CATEGORY_ORDER: BharatiAnchorCategory[] = [
  'POWER', 'FUEL', 'COMMUNICATION', 'INFRASTRUCTURE', 'LOGISTICS'
];

export const BHARATI_CATEGORY_LABELS: Record<BharatiAnchorCategory, string> = {
  POWER: 'Power',
  FUEL: 'Fuel',
  COMMUNICATION: 'Communication',
  INFRASTRUCTURE: 'Infrastructure',
  LOGISTICS: 'Logistics'
};

export interface BharatiAnchorDef {
  anchorName: string;
  assetId: string;
  displayName: string;
  category: BharatiAnchorCategory;
  // Real backend Asset this anchor's telemetry comes from, if any. Several physical anchors
  // can legitimately share one backend asset (e.g. the fuel depot has one monitored asset but
  // three physical anchor points) — that is not fabricated data, just several viewpoints onto
  // the one real telemetry stream. Anchors with no backend asset get an honest "no live
  // telemetry" treatment throughout the UI instead of invented numbers.
  backendAssetId?: string;
  infoTitle?: string;
  infoMessage?: string;
}

export const BHARATI_ANCHOR_DEFS: BharatiAnchorDef[] = [
  { anchorName: 'ANCHOR_MAIN_BUILDING', assetId: 'MAIN_BUILDING', displayName: 'Main Building', category: 'INFRASTRUCTURE' },
  { anchorName: 'ANCHOR_GEN_01', assetId: 'GEN-01', displayName: 'Generator 01', category: 'POWER', backendAssetId: 'GEN-01' },
  { anchorName: 'ANCHOR_GEN_02', assetId: 'GEN-02', displayName: 'Generator 02', category: 'POWER', backendAssetId: 'GEN-02' },
  { anchorName: 'ANCHOR_GEN_03', assetId: 'GEN-03', displayName: 'Generator 03', category: 'POWER', backendAssetId: 'GEN-03' },
  { anchorName: 'ANCHOR_FUEL_PUMP_STATION_01', assetId: 'FUEL-PUMP-01', displayName: 'Fuel Pump Station', category: 'FUEL', backendAssetId: 'FUEL-FARM-01' },
  { anchorName: 'ANCHOR_FUEL_TANK_01', assetId: 'FUEL-TANK-01', displayName: 'Fuel Tank 01', category: 'FUEL', backendAssetId: 'FUEL-FARM-01' },
  { anchorName: 'ANCHOR_FUEL_TANK_02', assetId: 'FUEL-TANK-02', displayName: 'Fuel Tank 02', category: 'FUEL', backendAssetId: 'FUEL-FARM-01' },
  { anchorName: 'ANCHOR_ANTENNA_01', assetId: 'ANTENNA-01', displayName: 'Antenna 01', category: 'COMMUNICATION', backendAssetId: 'RADOME-01' },
  { anchorName: 'ANCHOR_ANTENNA_02', assetId: 'ANTENNA-02', displayName: 'Antenna 02', category: 'COMMUNICATION', backendAssetId: 'RADOME-01' },
  { anchorName: 'ANCHOR_ANTENNA_03', assetId: 'ANTENNA-03', displayName: 'Antenna 03', category: 'COMMUNICATION', backendAssetId: 'RADOME-01' },
  { anchorName: 'ANCHOR_SATELLITE_COMM_01', assetId: 'SATCOM-01', displayName: 'Satellite Communication', category: 'COMMUNICATION', backendAssetId: 'RADOME-01' },
  {
    anchorName: 'ANCHOR_CONTAINER_AREA_01', assetId: 'CONTAINER-AREA-01', displayName: 'Container Area', category: 'INFRASTRUCTURE',
    infoTitle: 'Container Area',
    infoMessage: 'No dedicated live telemetry for this location in the current prototype. See the Logistics & Cargo tab for real inventory data.'
  },
  {
    anchorName: 'ANCHOR_SHIP_01', assetId: 'SHIP-01', displayName: 'Marine Support Vessel', category: 'LOGISTICS',
    infoTitle: 'Marine Support Vessel',
    infoMessage: 'No dedicated live telemetry for this vessel in the current prototype. See the Logistics & Cargo tab for resupply voyage information.'
  }
];

// Configurable per-category vertical offset — where the marker floats above its anchor point.
export const ANCHOR_VERTICAL_OFFSET: Record<BharatiAnchorCategory, [number, number, number]> = {
  POWER: [0, 1.0, 0],
  FUEL: [0, 1.0, 0],
  COMMUNICATION: [0, 1.5, 0],
  INFRASTRUCTURE: [0, 3.0, 0],
  LOGISTICS: [0, 1.0, 0]
};

export function resolveAnchorAsset(def: BharatiAnchorDef, assets: Asset[]): Asset | undefined {
  return def.backendAssetId ? assets.find(a => a.assetId === def.backendAssetId) : undefined;
}

// Real app status vocabulary only (normal/warning/critical/offline) — deliberately not a
// separate category-flavored vocabulary (no invented "LOW"/"ONLINE" states), since anything
// beyond the backend's actual Asset.status would be fabricated state.
export function statusColorHex(status: string): number {
  if (status === 'CRITICAL') return 0xef4444;
  if (status === 'WARNING') return 0xf59e0b;
  if (status === 'OFFLINE') return 0x64748b;
  if (status === 'NORMAL') return 0x10b981;
  return 0x38bdf8; // NO DATA / unknown — neutral, does not imply health
}

export function assetStatusColorHex(asset: Asset): number {
  if (asset.status === 'offline') return 0x64748b;
  if (asset.status === 'critical' || asset.healthScore < 70) return 0xef4444;
  if (asset.status === 'warning') return 0xf59e0b;
  return 0x10b981;
}

export function healthBandColorHex(health: number): number {
  if (health >= 90) return 0x10b981;
  if (health >= 70) return 0x22d3ee;
  if (health >= 40) return 0xf59e0b;
  return 0xef4444;
}

// Bounding box of a category's anchors, computed at runtime from the GLB's real (post-load)
// anchor world positions — never hardcoded. Used for camera zone presets (Section 14).
export function categoryBoundsFromAnchors(
  category: BharatiAnchorCategory,
  anchorWorldPositions: Record<string, THREE.Vector3>
): THREE.Box3 | null {
  const box = new THREE.Box3();
  let found = false;
  BHARATI_ANCHOR_DEFS.filter(d => d.category === category).forEach((d) => {
    const wp = anchorWorldPositions[d.anchorName];
    if (wp) {
      box.expandByPoint(wp);
      found = true;
    }
  });
  return found ? box : null;
}
