import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset, Station, Alert } from '../../types';
import { RefreshCw, X, AlertTriangle, Crosshair, Thermometer, Zap, HeartPulse, Radio, Ghost, PlaySquare, Video } from 'lucide-react';
import { DataSourceBadge } from '../common/DataSourceBadge';
import {
  BHARATI_ANCHOR_DEFS, ANCHOR_VERTICAL_OFFSET, BharatiAnchorCategory,
  resolveAnchorAsset, assetStatusColorHex, healthBandColorHex, categoryBoundsFromAnchors
} from './bharatiAssetConfig';

interface TwinCanvas3DProps {
  stationId: 'BHARATI' | 'MAITRI';
  assets: Asset[];
  station: Station;
  alerts: Alert[];
  unacknowledgedAlertsCount: number;
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  vibrationOverlay: boolean;
  onToggleVibration: () => void;
}

const BHARATI_MODEL_URL = '/models/BHARATI_TEXTURE_TEST.glb';

interface LoadedBharatiModel {
  scene: THREE.Group;
  anchorWorldPositions: Record<string, THREE.Vector3>;
  clusterSize: THREE.Vector3;
}

// Loaded once per browser session and reused across every mount/tab-switch — the real
// Bharati photogrammetry scan is 90MB+ and must never be re-fetched/re-parsed just because
// the user toggled an overlay or switched tabs.
let bharatiModelPromise: Promise<LoadedBharatiModel> | null = null;
function loadBharatiModel(onProgress?: (pct: number) => void): Promise<LoadedBharatiModel> {
  if (!bharatiModelPromise) {
    const loader = new GLTFLoader();
    bharatiModelPromise = loader
      .loadAsync(BHARATI_MODEL_URL, (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      })
      .then((gltf: GLTF) => {
        gltf.scene.updateMatrixWorld(true);

        const clusterBox = new THREE.Box3();
        BHARATI_ANCHOR_DEFS.forEach((def) => {
          const node = gltf.scene.getObjectByName(def.anchorName);
          if (node) {
            const wp = new THREE.Vector3();
            node.getWorldPosition(wp);
            clusterBox.expandByPoint(wp);
          } else {
            console.warn(`Bharati GLB is missing expected anchor: ${def.anchorName}`);
          }
        });

        const clusterCenter = clusterBox.isEmpty() ? new THREE.Vector3() : clusterBox.getCenter(new THREE.Vector3());
        const clusterSize = clusterBox.isEmpty() ? new THREE.Vector3(20, 10, 20) : clusterBox.getSize(new THREE.Vector3());
        const fullBox = new THREE.Box3().setFromObject(gltf.scene);

        // Recenter on the ANCHOR CLUSTER (the real station footprint), not the whole terrain
        // scan, so the camera frames the station itself and the existing origin-pivoted orbit
        // controls stay centered on it.
        gltf.scene.position.x -= clusterCenter.x;
        gltf.scene.position.z -= clusterCenter.z;
        gltf.scene.position.y -= fullBox.min.y;
        gltf.scene.updateMatrixWorld(true);

        const anchorWorldPositions: Record<string, THREE.Vector3> = {};
        BHARATI_ANCHOR_DEFS.forEach((def) => {
          const node = gltf.scene.getObjectByName(def.anchorName);
          if (node) {
            const wp = new THREE.Vector3();
            node.getWorldPosition(wp);
            anchorWorldPositions[def.anchorName] = wp;
          }
        });

        gltf.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        return { scene: gltf.scene, anchorWorldPositions, clusterSize };
      });
  }
  return bharatiModelPromise;
}

// Unified clickable hotspot — real telemetry-backed assets, the whole-station marker, and
// logistics/infrastructure anchors with no backing telemetry (which get an honest info card,
// never invented numbers) all funnel through the same raycast + click path.
type Hotspot =
  | { mesh: THREE.Mesh; kind: 'asset'; asset: Asset; label: string }
  | { mesh: THREE.Mesh; kind: 'station'; label: string }
  | { mesh: THREE.Mesh; kind: 'info'; label: string; title: string; message: string };

interface MarkerVisual {
  label: string;
  hotspotKind: 'asset' | 'station' | 'info';
  backendAssetId?: string;
  mesh: THREE.Mesh;
  markerMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  thermalElevated: boolean;
}

type VisualizationMode = 'NORMAL' | 'THERMAL' | 'POWER' | 'ASSET_HEALTH' | 'XRAY' | 'ALERTS' | 'REPLAY';

const MODE_META: { id: VisualizationMode; label: string; icon: React.ReactNode; enabled: boolean }[] = [
  { id: 'NORMAL', label: 'Normal', icon: <Video size={13} />, enabled: true },
  { id: 'THERMAL', label: 'Thermal', icon: <Thermometer size={13} />, enabled: true },
  { id: 'POWER', label: 'Power', icon: <Zap size={13} />, enabled: false },
  { id: 'ASSET_HEALTH', label: 'Asset Health', icon: <HeartPulse size={13} />, enabled: true },
  { id: 'XRAY', label: 'X-Ray / System', icon: <Ghost size={13} />, enabled: false },
  { id: 'ALERTS', label: 'Alerts', icon: <Radio size={13} />, enabled: true },
  { id: 'REPLAY', label: 'Replay', icon: <PlaySquare size={13} />, enabled: false }
];

function statusColor(asset: Asset): number {
  return assetStatusColorHex(asset);
}

export const TwinCanvas3D: React.FC<TwinCanvas3DProps> = ({
  stationId,
  assets,
  station,
  alerts,
  unacknowledgedAlertsCount,
  selectedAsset,
  onSelectAsset,
  vibrationOverlay,
  onToggleVibration
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<Hotspot | null>(null);
  const [glbLoading, setGlbLoading] = useState(false);
  const [glbProgress, setGlbProgress] = useState(0);
  const [glbError, setGlbError] = useState<string | null>(null);
  const [stationPanelOpen, setStationPanelOpen] = useState(false);
  const [infoPanel, setInfoPanel] = useState<{ title: string; message: string } | null>(null);
  const [showAnchors, setShowAnchors] = useState(false);
  const [anchorScreenPositions, setAnchorScreenPositions] = useState<{ name: string; assetId: string; x: number; y: number; visible: boolean }[]>([]);
  const [activeMode, setActiveMode] = useState<VisualizationMode>('NORMAL');
  const [activeZone, setActiveZone] = useState<string>('OVERVIEW');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clickableRef = useRef<Hotspot[]>([]);
  const markerVisualsRef = useRef<MarkerVisual[]>([]);
  const animFrameIdRef = useRef<number>(0);
  const rotatingTurbineRef = useRef<THREE.Group | null>(null);
  const bharatiRootRef = useRef<THREE.Group | null>(null);
  const bharatiAnchorDebugRef = useRef<{ name: string; assetId: string; worldPos: THREE.Vector3 }[]>([]);
  const anchorWorldPositionsRef = useRef<Record<string, THREE.Vector3>>({});
  const showAnchorsRef = useRef(false);
  const activeModeRef = useRef<VisualizationMode>('NORMAL');
  // Orbit target / home camera position — kept in refs (not literals) so the real Bharati
  // model can auto-frame itself via its measured anchor cluster while the existing
  // drag/wheel/preset math (which always orbits around world X=0,Z=0) stays untouched.
  const orbitTargetYRef = useRef<number>(3);
  const homeCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(28, 22, 34));
  // Scalar "home" distance the model was framed at — every camera preset derives its
  // position from this same measured scale, so none of them can end up too close/clipping
  // or too far/tiny regardless of the real model's actual scale.
  const homeDistanceRef = useRef<number>(47);
  // Camera fly-to animation state — used both by asset selection and by zone-preset buttons.
  const flyStartPosRef = useRef<THREE.Vector3 | null>(null);
  const flyStartLookRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const flyTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const flyTargetLookRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const flyStartTimeRef = useRef<number>(0);
  const FLY_MS = 700;

  useEffect(() => {
    showAnchorsRef.current = showAnchors;
  }, [showAnchors]);

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  // Reset the station/info panels whenever the active station changes.
  useEffect(() => {
    setStationPanelOpen(false);
    setInfoPanel(null);
  }, [stationId]);

  const beginFlyTo = (lookAtPoint: THREE.Vector3, viewDistance: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const dir = new THREE.Vector3(lookAtPoint.x, 0, lookAtPoint.z);
    if (dir.lengthSq() < 0.01) dir.set(1, 0, 1);
    dir.normalize();
    const newPos = new THREE.Vector3(
      lookAtPoint.x + dir.x * viewDistance * 0.6,
      lookAtPoint.y + viewDistance * 0.55,
      lookAtPoint.z + dir.z * viewDistance * 0.6
    );
    flyStartPosRef.current = camera.position.clone();
    flyStartLookRef.current.set(0, orbitTargetYRef.current, 0);
    flyTargetPosRef.current = newPos;
    flyTargetLookRef.current.copy(lookAtPoint);
    flyStartTimeRef.current = performance.now();
  };

  // Camera fly-to when the selected asset changes to one with a known anchor — regardless of
  // whether selection came from clicking a marker, the Asset Registry panel, an alert's
  // "Locate in Digital Twin" button, or any other tab. This is what makes "Locate in Digital
  // Twin" and "camera fly-to-asset" work for free everywhere selection already happens.
  useEffect(() => {
    if (!selectedAsset || stationId !== 'BHARATI' || !cameraRef.current) return;
    const mv = markerVisualsRef.current.find(m => m.backendAssetId === selectedAsset.assetId);
    if (!mv) return; // asset has no 3D anchor (e.g. HVAC-01/WATER-RO-1/BESS-01) — drawer still opens, just no fly
    beginFlyTo(mv.mesh.position, 12);
  }, [selectedAsset, stationId]);

  // Live telemetry / mode / selection → marker visuals. One consolidated pass so status
  // color, visualization-mode coloring, and selection dim/glow never fight each other. Does
  // NOT rebuild the scene (that would reset the user's camera orbit and re-touch the GLB on
  // every 3s telemetry tick) — it recolors already-created marker/ring materials in place.
  useEffect(() => {
    markerVisualsRef.current.forEach((m) => {
      const asset = m.backendAssetId ? assets.find(a => a.assetId === m.backendAssetId) : undefined;
      let color = 0x38bdf8; // neutral default — no backend telemetry for this anchor
      let opacity = 1;
      let emissiveIntensity = 0.55;

      if (activeMode === 'ASSET_HEALTH' && asset) {
        color = healthBandColorHex(asset.healthScore);
      } else if (activeMode === 'ALERTS') {
        const assetAlerts = asset ? alerts.filter(al => al.assetId === asset.assetId && !al.acknowledged) : [];
        if (assetAlerts.length > 0) {
          const worst = assetAlerts.reduce((a, b) => (b.riskScore > a.riskScore ? b : a));
          color = worst.level === 'critical' || worst.level === 'emergency' ? 0xef4444 : worst.level === 'warning' ? 0xf59e0b : 0x38bdf8;
        } else {
          color = 0x334155;
          opacity = 0.25;
        }
      } else if (asset) {
        color = statusColor(asset);
      } else if (m.hotspotKind === 'station') {
        color = station.status === 'operational' ? 0x10b981 : station.status === 'degraded' ? 0xf59e0b : 0xef4444;
      }

      m.thermalElevated = !!asset && (asset.status === 'warning' || asset.status === 'critical');

      const isSelected = !!(selectedAsset && asset && asset.assetId === selectedAsset.assetId);
      if (isSelected) {
        color = 0x5eead4;
        emissiveIntensity = 1.2;
        opacity = 1;
      } else if (selectedAsset) {
        opacity = Math.min(opacity, 0.35);
      }

      m.markerMat.color.setHex(color);
      m.markerMat.emissive.setHex(color);
      m.markerMat.emissiveIntensity = emissiveIntensity;
      m.markerMat.opacity = opacity;
      m.ringMat.color.setHex(isSelected ? 0xffffff : color);
      m.ringMat.opacity = opacity;
    });
  }, [assets, selectedAsset, activeMode, alerts, station.status]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    let cancelled = false;
    const localDisposables: (THREE.BufferGeometry | THREE.Material)[] = [];

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060e1a);
    scene.fog = new THREE.FogExp2(0x060e1a, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    orbitTargetYRef.current = 3;
    homeCameraPosRef.current.set(28, 22, 34);
    homeDistanceRef.current = 47;
    camera.position.copy(homeCameraPosRef.current);
    camera.lookAt(0, orbitTargetYRef.current, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xd0e8ff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    scene.add(sunLight);

    // Cyan accent rim light for Polar mission aesthetic
    const polarRimLight = new THREE.DirectionalLight(0x00e5ff, 0.6);
    polarRimLight.position.set(-30, 20, -30);
    scene.add(polarRimLight);

    // Ground: Antarctic Ice Terrain with Moraine Rock patches
    const groundGeo = new THREE.PlaneGeometry(160, 160, 48, 48);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 1.5;
      posAttr.setZ(i, z);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e3650, roughness: 0.85, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(100, 50, 0x00e5ff, 0x173152);
    grid.position.y = 0.05;
    scene.add(grid);

    clickableRef.current = [];
    markerVisualsRef.current = [];
    bharatiAnchorDebugRef.current = [];
    bharatiRootRef.current = null;

    // Helper to add a clickable, dim/glow/mode-reactive marker at an explicit world position.
    const createMarkerAt = (
      x: number, y: number, z: number,
      color: number,
      hotspotFor: (mesh: THREE.Mesh) => Hotspot,
      backendAssetId: string | undefined,
      hotspotKind: 'asset' | 'station' | 'info'
    ) => {
      const markerGeo = new THREE.OctahedronGeometry(0.55, 0);
      const markerMat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.2,
        transparent: true, opacity: 1
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(x, y, z);
      scene.add(marker);
      localDisposables.push(markerGeo, markerMat);

      const ringGeo = new THREE.RingGeometry(0.7, 0.9, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 1 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, y + 1.6, z);
      scene.add(ring);
      localDisposables.push(ringGeo, ringMat);

      const hotspot = hotspotFor(marker);
      clickableRef.current.push(hotspot);
      markerVisualsRef.current.push({
        label: hotspot.label, hotspotKind, backendAssetId, mesh: marker, markerMat, ringMat, thermalElevated: false
      });
      return marker;
    };

    // Legacy helper retained for Maitri's procedural building-shaped geometry (unchanged).
    const createAssetMesh = (
      asset: Asset,
      geo: THREE.BufferGeometry,
      color: number,
      pos3D: [number, number, number],
      opacity: number = 0.95
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        color: color, roughness: 0.35, metalness: 0.4, transparent: opacity < 1, opacity: opacity
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos3D);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const ringColor = statusColor(asset);
      const ringGeo = new THREE.RingGeometry(0.7, 0.9, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos3D[0], pos3D[1] + 2.5, pos3D[2]);
      scene.add(ring);

      clickableRef.current.push({ mesh, kind: 'asset', asset, label: asset.assetId });
      return mesh;
    };

    if (stationId === 'BHARATI') {
      // --- REAL BHARATI PHOTOGRAMMETRY MODEL ---
      // All procedural box/cylinder/sphere Bharati geometry and manually-positioned markers
      // are gone. The real GLB (with its embedded ANCHOR_* empties) is the visual +
      // positional source of truth; telemetry/health/alerts still flow entirely through the
      // existing Asset[] registry via BHARATI_ANCHOR_DEFS' backendAssetId mapping.
      setGlbLoading(true);
      setGlbError(null);
      setGlbProgress(0);

      const placeBharatiHotspots = (anchorWorldPositions: Record<string, THREE.Vector3>) => {
        const debugList: { name: string; assetId: string; worldPos: THREE.Vector3 }[] = [];
        BHARATI_ANCHOR_DEFS.forEach((def) => {
          const wp = anchorWorldPositions[def.anchorName];
          if (!wp) return; // anchor genuinely absent from this GLB — skip, never invent one
          const backendAsset = resolveAnchorAsset(def, assets);

          let color = 0x38bdf8;
          if (backendAsset) color = statusColor(backendAsset);
          else if (def.category === 'INFRASTRUCTURE' && def.assetId === 'MAIN_BUILDING') {
            color = station.status === 'operational' ? 0x10b981 : station.status === 'degraded' ? 0xf59e0b : 0xef4444;
          }

          const offset = ANCHOR_VERTICAL_OFFSET[def.category];
          const x = wp.x + offset[0];
          const y = wp.y + offset[1];
          const z = wp.z + offset[2];

          const kind: 'asset' | 'station' | 'info' = backendAsset ? 'asset' : def.assetId === 'MAIN_BUILDING' ? 'station' : 'info';
          createMarkerAt(x, y, z, color, (mesh): Hotspot => {
            if (backendAsset) return { mesh, kind: 'asset', asset: backendAsset, label: def.assetId };
            if (def.assetId === 'MAIN_BUILDING') return { mesh, kind: 'station', label: def.assetId };
            return { mesh, kind: 'info', label: def.assetId, title: def.infoTitle || def.assetId, message: def.infoMessage || 'No live telemetry available for this asset.' };
          }, backendAsset?.assetId, kind);

          debugList.push({ name: def.anchorName, assetId: def.assetId, worldPos: new THREE.Vector3(x, y, z) });
        });
        bharatiAnchorDebugRef.current = debugList;
      };

      loadBharatiModel((pct) => {
        if (!cancelled) setGlbProgress(pct);
      })
        .then(({ scene: bharatiScene, anchorWorldPositions, clusterSize }) => {
          if (cancelled) return;
          scene.add(bharatiScene);
          bharatiRootRef.current = bharatiScene;
          anchorWorldPositionsRef.current = anchorWorldPositions;

          // Auto-frame the camera around the measured ANCHOR CLUSTER (the real station
          // footprint), not the whole terrain scan, so the initial view clearly shows the
          // main building and surrounding assets instead of a wide, mostly-empty island.
          const maxDim = Math.max(clusterSize.x, clusterSize.y, clusterSize.z, 8);
          const distance = Math.max(maxDim * 2.6, 22);
          const lookAtY = Math.min(clusterSize.y * 0.4 + 1, 10);
          orbitTargetYRef.current = lookAtY;
          homeDistanceRef.current = distance;
          homeCameraPosRef.current.set(distance * 0.62, distance * 0.55 + lookAtY, distance * 0.68);
          camera.position.copy(homeCameraPosRef.current);
          camera.lookAt(0, lookAtY, 0);

          placeBharatiHotspots(anchorWorldPositions);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('Bharati GLB failed to load:', err);
          setGlbError('3D model failed to load — asset markers unavailable in this view. Use Equipment & Health to inspect assets.');
        })
        .finally(() => {
          if (!cancelled) setGlbLoading(false);
        });
    } else {
      // --- MAITRI 3D ARCHITECTURE (Schirmacher Oasis) --- unchanged procedural geometry
      const maitriMainGeo = new THREE.BoxGeometry(14, 4, 10);
      const maitriMainMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.5 });
      const maitriMain = new THREE.Mesh(maitriMainGeo, maitriMainMat);
      maitriMain.position.set(0, 2, 0);
      maitriMain.castShadow = true;
      scene.add(maitriMain);

      const mGen1 = assets.find(a => a.assetId === 'M-GEN-01');
      if (mGen1) createAssetMesh(mGen1, new THREE.BoxGeometry(3, 2.2, 2.5), 0x38bdf8, [-8, 1.5, 3]);

      const mGen2 = assets.find(a => a.assetId === 'M-GEN-02');
      if (mGen2) createAssetMesh(mGen2, new THREE.BoxGeometry(3, 2.2, 2.5), 0x38bdf8, [-8, 1.5, -3]);

      const lakePump = assets.find(a => a.assetId === 'M-PUMP-LAKE');
      if (lakePump) {
        createAssetMesh(lakePump, new THREE.BoxGeometry(3, 2.5, 3), 0x0284c7, [18, 1.25, 14]);

        const pipeCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(18, 0.8, 14));
        const pipeGeo = new THREE.TubeGeometry(pipeCurve, 20, 0.25, 8, false);
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x451a03, roughness: 0.4 });
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        scene.add(pipe);
      }

      const lakeGeo = new THREE.CircleGeometry(10, 32);
      const lakeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });
      const lake = new THREE.Mesh(lakeGeo, lakeMat);
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(22, 0.08, 18);
      scene.add(lake);

      const windAsset = assets.find(a => a.type === 'wind_turbine');
      if (windAsset) {
        const mastGeo = new THREE.CylinderGeometry(0.2, 0.4, 12, 16);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.set(24, 6, -8);
        scene.add(mast);

        const turbineGroup = new THREE.Group();
        turbineGroup.position.set(24, 12, -8);

        const nacelleGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16);
        const nacelle = new THREE.Mesh(nacelleGeo, mastMat);
        nacelle.rotation.x = Math.PI / 2;
        turbineGroup.add(nacelle);

        const bladeGeo = new THREE.BoxGeometry(0.2, 4.5, 0.05);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        for (let b = 0; b < 3; b++) {
          const blade = new THREE.Mesh(bladeGeo, bladeMat);
          blade.rotation.z = (b * (Math.PI * 2)) / 3;
          blade.position.y = 2.2 * Math.cos(blade.rotation.z);
          blade.position.x = 2.2 * Math.sin(blade.rotation.z);
          turbineGroup.add(blade);
        }
        scene.add(turbineGroup);
        rotatingTurbineRef.current = turbineGroup;
      }
    }

    // Raycaster for mouse click and hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = clickableRef.current.map(h => h.mesh);
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const found = clickableRef.current.find(h => h.mesh === intersects[0].object);
        if (found) {
          setHoveredHotspot(found);
          container.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredHotspot(null);
      container.style.cursor = 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const hotspotMeshes = clickableRef.current.map(h => h.mesh);
      const hotspotHits = raycaster.intersectObjects(hotspotMeshes, false);
      if (hotspotHits.length > 0) {
        const found = clickableRef.current.find(h => h.mesh === hotspotHits[0].object);
        if (found) {
          if (found.kind === 'asset') onSelectAsset(found.asset);
          else if (found.kind === 'station') setStationPanelOpen(true);
          else setInfoPanel({ title: found.title, message: found.message });
          return;
        }
      }

      // Any other hit on the model body (not a tracked anchor hotspot) safely falls back to
      // station-level info — this can never crash regardless of the GLB's internal mesh names.
      if (stationId === 'BHARATI' && bharatiRootRef.current) {
        const bodyHits = raycaster.intersectObject(bharatiRootRef.current, true);
        if (bodyHits.length > 0) {
          setStationPanelOpen(true);
        }
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);

    // Orbit Controls manual rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        // A manual drag cancels any in-flight camera animation so the two never fight.
        flyTargetPosRef.current = null;
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
    };
    const handleMouseDrag = (e: MouseEvent) => {
      if (!isDragging || !camera) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      let angle = Math.atan2(camera.position.z, camera.position.x);
      angle -= dx * 0.006;
      camera.position.x = radius * Math.cos(angle);
      camera.position.z = radius * Math.sin(angle);
      camera.position.y = Math.max(5, Math.min(50, camera.position.y + dy * 0.05));
      camera.lookAt(0, orbitTargetYRef.current, 0);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!camera) return;
      flyTargetPosRef.current = null;
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      camera.position.x *= factor;
      camera.position.y = Math.max(5, Math.min(65, camera.position.y * factor));
      camera.position.z *= factor;
      camera.lookAt(0, orbitTargetYRef.current, 0);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseDrag);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Render loop
    let angleSpin = 0;
    let frameCount = 0;
    const projected = new THREE.Vector3();
    const flyLookNow = new THREE.Vector3();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      frameCount++;

      if (rotatingTurbineRef.current) {
        rotatingTurbineRef.current.rotation.z += 0.04;
      }

      if (vibrationOverlay) {
        angleSpin += 0.1;
        clickableRef.current.forEach((h) => {
          if (h.kind === 'asset' && h.asset.vibration > 2.0) {
            h.mesh.position.y += Math.sin(angleSpin) * 0.02;
          }
        });
      }

      // THERMAL mode pulse — a highlight/overlay effect only; the GLB's own material is
      // never touched.
      if (activeModeRef.current === 'THERMAL') {
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
        markerVisualsRef.current.forEach((m) => {
          if (m.thermalElevated) {
            m.ringMat.opacity = 0.5 + pulse * 0.5;
            m.markerMat.emissiveIntensity = 0.6 + pulse * 0.8;
          }
        });
      }

      // Camera fly-to animation (asset selection or zone preset).
      if (flyTargetPosRef.current && flyStartPosRef.current) {
        const elapsed = performance.now() - flyStartTimeRef.current;
        const t = Math.min(elapsed / FLY_MS, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(flyStartPosRef.current, flyTargetPosRef.current, eased);
        flyLookNow.lerpVectors(flyStartLookRef.current, flyTargetLookRef.current, eased);
        camera.lookAt(flyLookNow);
        if (t >= 1) {
          flyTargetPosRef.current = null;
          flyStartPosRef.current = null;
        }
      }

      // Debug "Show Anchors" label projection — throttled to ~20fps and skipped entirely
      // when the toggle is off, so it costs nothing during normal use.
      if (showAnchorsRef.current && stationId === 'BHARATI' && frameCount % 3 === 0 && bharatiAnchorDebugRef.current.length > 0) {
        const next = bharatiAnchorDebugRef.current.map((a) => {
          projected.copy(a.worldPos).project(camera);
          return {
            name: a.name,
            assetId: a.assetId,
            x: (projected.x * 0.5 + 0.5) * container.clientWidth,
            y: (-projected.y * 0.5 + 0.5) * container.clientHeight,
            visible: projected.z < 1
          };
        });
        setAnchorScreenPositions(next);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameIdRef.current);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseDrag);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      // The cached Bharati GLB is shared across mounts — detach it, but never dispose its
      // (cached, reused) geometries/materials.
      if (bharatiRootRef.current) {
        scene.remove(bharatiRootRef.current);
      }
      // Everything created fresh for this run (hotspot markers/rings) is safe to dispose.
      localDisposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [stationId, vibrationOverlay]);

  // Camera zone presets (Section 14) — computed at runtime from the real anchor cluster per
  // category, never hardcoded. "Reset"/"Overview" returns to the auto-framed home view.
  const flyToZone = (zone: string) => {
    setActiveZone(zone);
    const camera = cameraRef.current;
    if (!camera) return;
    if (zone === 'OVERVIEW') {
      flyTargetPosRef.current = null;
      camera.position.copy(homeCameraPosRef.current);
      camera.lookAt(0, orbitTargetYRef.current, 0);
      return;
    }
    if (zone === 'TOP') {
      flyTargetPosRef.current = null;
      const d = homeDistanceRef.current;
      camera.position.set(0.1, d * 1.15 + orbitTargetYRef.current, 0.1);
      camera.lookAt(0, orbitTargetYRef.current, 0);
      return;
    }
    if (zone === 'MAIN_BUILDING') {
      const wp = anchorWorldPositionsRef.current['ANCHOR_MAIN_BUILDING'];
      if (wp) beginFlyTo(wp, 16);
      return;
    }
    const category = zone as BharatiAnchorCategory;
    const box = categoryBoundsFromAnchors(category, anchorWorldPositionsRef.current);
    if (box) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const dist = Math.max(size.x, size.y, size.z, 6) * 1.8 + 10;
      beginFlyTo(center, dist);
    }
  };

  const lastSyncLabel = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '480px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Always-visible Digital Twin status bar (Sections 1 & 15) */}
      <div style={{
        position: 'absolute', top: 14, left: 16, right: 16,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        padding: '8px 16px',
        background: 'rgba(7, 18, 33, 0.88)', backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-md)', border: '1px solid var(--panel-border)',
        pointerEvents: 'none', zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            backgroundColor: stationId === 'BHARATI'
              ? (station.status === 'operational' ? 'var(--status-normal)' : station.status === 'degraded' ? 'var(--status-warning)' : 'var(--status-critical)')
              : 'var(--status-normal)',
            boxShadow: '0 0 8px currentColor'
          }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.03em', color: '#fff' }}>
              {stationId === 'BHARATI' ? 'BHARATI DIGITAL TWIN' : 'MAITRI DIGITAL TWIN'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              ● {station.status}
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 26, background: 'var(--panel-border)' }} />

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Energy', value: `${station.powerLoadKw} / ${station.powerCapacityKw} kW` },
            { label: 'Fuel', value: `${station.fuelDaysRemaining} days` },
            { label: 'Env', value: `${station.currentTemp}°C` },
            { label: 'Wind', value: `${station.windSpeedKts} kt` },
            { label: 'Alerts', value: `${unacknowledgedAlertsCount}`, critical: unacknowledgedAlertsCount > 0 },
            { label: 'Health', value: `${station.healthScore}%` }
          ].map((f) => (
            <div key={f.label}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{f.label}</div>
              <div className="telemetry-val" style={{ fontSize: '0.8rem', fontWeight: 700, color: f.critical ? 'var(--status-critical)' : '#fff' }}>{f.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Last sync: {lastSyncLabel}</div>
          <DataSourceBadge kind="SIMULATED" label="LIVE SIMULATION" detail="Telemetry is generated by the POLAR-TWIN prototype simulator, refreshed continuously — SIMULATED / DEMONSTRATION, not a live feed from Bharati." />
        </div>
      </div>

      {/* Visualization mode toolbar (Sections 5 & 26) */}
      <div style={{
        position: 'absolute', top: 68, left: 16,
        display: 'flex', gap: 6, flexWrap: 'wrap',
        background: 'rgba(7, 18, 33, 0.85)', backdropFilter: 'blur(8px)',
        padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--panel-border)', zIndex: 20
      }}>
        {MODE_META.map((m) => (
          <button
            key={m.id}
            className={`btn ${activeMode === m.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '5px 9px', fontSize: '0.68rem', opacity: m.enabled ? 1 : 0.45, cursor: m.enabled ? 'pointer' : 'not-allowed' }}
            disabled={!m.enabled}
            title={m.enabled ? m.label : `${m.label} — coming in the next pass`}
            onClick={() => m.enabled && setActiveMode(m.id)}
          >
            {m.icon} {m.label}
          </button>
        ))}
        <div style={{ width: 1, backgroundColor: 'var(--panel-border)', margin: '0 2px' }} />
        <button
          className={`btn ${vibrationOverlay ? 'btn-cyan' : 'btn-outline'}`}
          style={{ padding: '5px 9px', fontSize: '0.68rem' }}
          onClick={onToggleVibration}
          title="Toggle harmonic vibration wobble effect on elevated-vibration markers"
        >
          Vibration FX
        </button>
      </div>

      {/* Camera zone presets (Section 14) */}
      {stationId === 'BHARATI' && (
        <div style={{
          position: 'absolute', top: 106, left: 16,
          display: 'flex', gap: 6, flexWrap: 'wrap',
          background: 'rgba(7, 18, 33, 0.85)', backdropFilter: 'blur(8px)',
          padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--panel-border)', zIndex: 20
        }}>
          {[
            { id: 'OVERVIEW', label: 'Overview' },
            { id: 'MAIN_BUILDING', label: 'Main Building' },
            { id: 'POWER', label: 'Power Zone' },
            { id: 'FUEL', label: 'Fuel Zone' },
            { id: 'COMMUNICATION', label: 'Comm Zone' },
            { id: 'LOGISTICS', label: 'Logistics Zone' },
            { id: 'TOP', label: 'Top View' }
          ].map((z) => (
            <button
              key={z.id}
              className={`btn ${activeZone === z.id ? 'btn-cyan' : 'btn-outline'}`}
              style={{ padding: '5px 9px', fontSize: '0.68rem' }}
              onClick={() => flyToZone(z.id)}
            >
              {z.label}
            </button>
          ))}
          <button
            className="btn btn-outline"
            style={{ padding: '5px 9px', fontSize: '0.68rem' }}
            onClick={() => setShowAnchors(v => !v)}
            title="Development-only: label every GLB anchor to verify marker placement"
          >
            <Crosshair size={13} /> {showAnchors ? 'Hide Anchors' : 'Show Anchors'}
          </button>
        </div>
      )}

      {/* Debug anchor labels — dev-only, default OFF */}
      {stationId === 'BHARATI' && showAnchors && anchorScreenPositions.filter(a => a.visible).map((a) => (
        <div key={a.name} style={{
          position: 'absolute', left: a.x, top: a.y, transform: 'translate(-50%, -120%)',
          pointerEvents: 'none', background: 'rgba(6, 14, 26, 0.85)', border: '1px solid #facc15',
          borderRadius: 4, padding: '2px 6px', fontSize: '0.62rem', color: '#facc15',
          whiteSpace: 'nowrap', zIndex: 60, lineHeight: 1.3
        }}>
          <div>{a.name}</div>
          <div style={{ color: '#fff', fontWeight: 700 }}>{a.assetId}</div>
        </div>
      ))}

      {stationId === 'BHARATI' && glbLoading && (
        <div style={{
          position: 'absolute', bottom: 46, right: 16,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(7, 18, 33, 0.9)', backdropFilter: 'blur(8px)',
          padding: '8px 14px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--panel-border)', fontSize: '0.75rem', color: 'var(--accent-cyan)'
        }}>
          <RefreshCw size={14} className="radar-spinner" />
          Loading Bharati photogrammetry model… {glbProgress > 0 ? `${glbProgress}%` : ''}
        </div>
      )}

      {stationId === 'BHARATI' && glbError && (
        <div style={{
          position: 'absolute', bottom: 46, right: 16,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(239, 68, 68, 0.12)', backdropFilter: 'blur(8px)',
          padding: '8px 14px', borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.35)', fontSize: '0.75rem', color: '#fca5a5', maxWidth: 280
        }}>
          <AlertTriangle size={14} /> {glbError}
        </div>
      )}

      {stationId === 'BHARATI' && stationPanelOpen && (
        <div style={{
          position: 'absolute', top: 150, right: 16, width: 300,
          background: 'rgba(11, 23, 40, 0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--panel-border-bright)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 10, zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
              BHARATI RESEARCH STATION
            </div>
            <button onClick={() => setStationPanelOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
              <X size={16} />
            </button>
          </div>
          <DataSourceBadge kind="SIMULATED" label="Station telemetry" detail="Station-level readings are generated by the POLAR-TWIN prototype simulator — SIMULATED / DEMONSTRATION TELEMETRY, not a live feed from Bharati." />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Full station summary is shown in the status bar above. Click a glowing marker on the model to inspect a specific asset.
          </div>
        </div>
      )}

      {stationId === 'BHARATI' && infoPanel && (
        <div style={{
          position: 'absolute', top: 150, right: 16, width: 300,
          background: 'rgba(11, 23, 40, 0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--panel-border-bright)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 10, zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
              {infoPanel.title.toUpperCase()}
            </div>
            <button onClick={() => setInfoPanel(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
              <X size={16} />
            </button>
          </div>
          <DataSourceBadge kind="PROTOTYPE" label="No live telemetry" detail="This anchor has no dedicated backend telemetry in the current prototype." />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {infoPanel.message}
          </div>
        </div>
      )}

      {hoveredHotspot && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(11, 23, 40, 0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--panel-border-bright)', borderRadius: 'var(--radius-md)',
          padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: 'var(--shadow-lg)', pointerEvents: 'none', zIndex: 25
        }}>
          {hoveredHotspot.kind === 'asset' ? (
            <>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  {hoveredHotspot.asset.type} • {hoveredHotspot.asset.building}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                  {hoveredHotspot.asset.name} ({hoveredHotspot.label})
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--panel-border)', paddingLeft: 12 }}>
                <span className={`badge badge-${hoveredHotspot.asset.status === 'offline' ? 'offline' : hoveredHotspot.asset.status === 'critical' ? 'critical' : hoveredHotspot.asset.status === 'warning' ? 'warning' : 'normal'}`}>
                  {hoveredHotspot.asset.status.toUpperCase()}
                </span>
              </div>
              <div className="telemetry-val" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                ⚡ {hoveredHotspot.asset.powerKw} kW | 🌡️ {hoveredHotspot.asset.temperature}°C | 〰️ {hoveredHotspot.asset.vibration} mm/s
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to open telemetry drawer</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{hoveredHotspot.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to inspect</div>
            </>
          )}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: '0.72rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>
        Left-click + Drag to Orbit • Scroll to Zoom • Click asset to inspect
      </div>
    </div>
  );
};
