// Real anchor names found by directly inspecting communication.glb's node hierarchy —
// never invented. 'anchor_communication_room' is unique to this file (not present in
// BHARATI_TEXTURE_TEST.glb or pipeline.glb); the antenna/satellite anchors share identical
// world-space coordinates with the other two models, confirming all three GLBs come from
// the same underlying Blender scene/scale.
export const COMMUNICATION_ANCHOR_NAMES = {
  ROOM: 'anchor_communication_room',
  ANTENNA_01: 'ANCHOR_ANTENNA_01',
  ANTENNA_02: 'ANCHOR_ANTENNA_02',
  ANTENNA_03: 'ANCHOR_ANTENNA_03',
  SATELLITE: 'ANCHOR_SATELLITE_COMM_01'
} as const;

export const COMMUNICATION_ANCHOR_LIST: string[] = Object.values(COMMUNICATION_ANCHOR_NAMES);

export type CommunicationPathType = 'INTERNAL' | 'SATELLITE_LINK';

export interface CommunicationPathDef {
  id: string;
  from: string; // anchor name
  to: string;   // anchor name
  type: CommunicationPathType;
  tooltip: string;
}

// communication.glb has no exported cable/line mesh to reuse (its BézierCurve and
// room_to_d* nodes are transform-only empties with no mesh, left over from Blender curve
// objects that weren't converted to mesh geometry before export) — so these paths are
// built at runtime between the file's REAL anchor positions, per the room → antenna →
// satellite topology. One path per real antenna (there are three), all converging on the
// one real satellite anchor.
export const COMMUNICATION_PATHS: CommunicationPathDef[] = [
  { id: 'ROOM_TO_ANTENNA_01', from: COMMUNICATION_ANCHOR_NAMES.ROOM, to: COMMUNICATION_ANCHOR_NAMES.ANTENNA_01, type: 'INTERNAL', tooltip: 'Internal Data Link' },
  { id: 'ROOM_TO_ANTENNA_02', from: COMMUNICATION_ANCHOR_NAMES.ROOM, to: COMMUNICATION_ANCHOR_NAMES.ANTENNA_02, type: 'INTERNAL', tooltip: 'Internal Data Link' },
  { id: 'ROOM_TO_ANTENNA_03', from: COMMUNICATION_ANCHOR_NAMES.ROOM, to: COMMUNICATION_ANCHOR_NAMES.ANTENNA_03, type: 'INTERNAL', tooltip: 'Internal Data Link' },
  { id: 'ANTENNA_01_TO_SATELLITE', from: COMMUNICATION_ANCHOR_NAMES.ANTENNA_01, to: COMMUNICATION_ANCHOR_NAMES.SATELLITE, type: 'SATELLITE_LINK', tooltip: 'Satellite Communication Link' },
  { id: 'ANTENNA_02_TO_SATELLITE', from: COMMUNICATION_ANCHOR_NAMES.ANTENNA_02, to: COMMUNICATION_ANCHOR_NAMES.SATELLITE, type: 'SATELLITE_LINK', tooltip: 'Satellite Communication Link' },
  { id: 'ANTENNA_03_TO_SATELLITE', from: COMMUNICATION_ANCHOR_NAMES.ANTENNA_03, to: COMMUNICATION_ANCHOR_NAMES.SATELLITE, type: 'SATELLITE_LINK', tooltip: 'Satellite Communication Link' }
];

export const COMMUNICATION_PATH_COLOR: Record<CommunicationPathType, number> = {
  INTERNAL: 0x38bdf8,
  SATELLITE_LINK: 0x60a5fa
};

// Every comm node (room + antennas + satellite) is monitored by the same real backend
// asset — the station only tracks one communications asset, not one per antenna — so all
// five anchors legitimately open the same real telemetry, consistent with how the fuel
// depot's three anchors already share FUEL-FARM-01 in bharatiAssetConfig.ts.
export const COMMUNICATION_BACKEND_ASSET_ID = 'RADOME-01';

export const COMMUNICATION_NODE_LABEL: Record<string, string> = {
  [COMMUNICATION_ANCHOR_NAMES.ROOM]: 'Communication Room',
  [COMMUNICATION_ANCHOR_NAMES.ANTENNA_01]: 'Antenna 01',
  [COMMUNICATION_ANCHOR_NAMES.ANTENNA_02]: 'Antenna 02',
  [COMMUNICATION_ANCHOR_NAMES.ANTENNA_03]: 'Antenna 03',
  [COMMUNICATION_ANCHOR_NAMES.SATELLITE]: 'Satellite Communication'
};
