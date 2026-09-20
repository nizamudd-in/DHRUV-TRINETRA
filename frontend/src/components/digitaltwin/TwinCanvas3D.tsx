import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Asset } from '../../types';
import { Layers, Eye, RefreshCw, ZoomIn, ZoomOut, Compass, Flame, Activity } from 'lucide-react';

interface TwinCanvas3DProps {
  stationId: 'BHARATI' | 'MAITRI';
  assets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  thermalOverlay: boolean;
  vibrationOverlay: boolean;
  onToggleThermal: () => void;
  onToggleVibration: () => void;
}

export const TwinCanvas3D: React.FC<TwinCanvas3DProps> = ({
  stationId,
  assets,
  selectedAsset,
  onSelectAsset,
  thermalOverlay,
  vibrationOverlay,
  onToggleThermal,
  onToggleVibration
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredAsset, setHoveredAsset] = useState<Asset | null>(null);
  const [cameraMode, setCameraMode] = useState<'perspective' | 'top' | 'generator'>('perspective');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clickableMeshesRef = useRef<{ mesh: THREE.Mesh; asset: Asset }[]>([]);
  const animFrameIdRef = useRef<number>(0);
  const rotatingTurbineRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060e1a);
    scene.fog = new THREE.FogExp2(0x060e1a, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(28, 22, 34);
    camera.lookAt(0, 3, 0);
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
    // Subtle terrain height variation
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 1.5;
      pos.setZ(i, z);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e3650,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid lines for tactical digital twin overlay
    const grid = new THREE.GridHelper(100, 50, 0x00e5ff, 0x173152);
    grid.position.y = 0.05;
    scene.add(grid);

    clickableMeshesRef.current = [];

    // Helper to add clickable asset box
    const createAssetMesh = (
      asset: Asset,
      geo: THREE.BufferGeometry,
      color: number,
      pos3D: [number, number, number],
      opacity: number = 0.95
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.35,
        metalness: 0.4,
        transparent: opacity < 1,
        opacity: opacity
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos3D);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Status indicator ring on top
      let ringColor = 0x10b981; // normal
      if (asset.status === 'offline') ringColor = 0x64748b;
      else if (asset.status === 'critical' || asset.healthScore < 70) ringColor = 0xef4444;
      else if (asset.status === 'warning') ringColor = 0xf59e0b;

      const ringGeo = new THREE.RingGeometry(0.7, 0.9, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos3D[0], pos3D[1] + 2.5, pos3D[2]);
      scene.add(ring);

      clickableMeshesRef.current.push({ mesh, asset });
      return mesh;
    };

    if (stationId === 'BHARATI') {
      // --- BHARATI 3D ARCHITECTURE ---
      // Elevated Main Superstructure on Stilts
      const mainBuildingGeo = new THREE.BoxGeometry(16, 5, 12);
      const mainBuildingMat = new THREE.MeshStandardMaterial({
        color: 0x254668,
        roughness: 0.3,
        metalness: 0.6,
      });
      const mainBuilding = new THREE.Mesh(mainBuildingGeo, mainBuildingMat);
      mainBuilding.position.set(0, 5.5, 0);
      mainBuilding.castShadow = true;
      mainBuilding.receiveShadow = true;
      scene.add(mainBuilding);

      // Windows band
      const winGeo = new THREE.BoxGeometry(16.1, 1.2, 12.1);
      const winMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x004766,
        roughness: 0.1,
        metalness: 0.9
      });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(0, 5.8, 0);
      scene.add(win);

      // Stilts supporting Bharati
      const stiltGeo = new THREE.CylinderGeometry(0.3, 0.3, 3.5, 16);
      const stiltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
      const stiltPositions: [number, number, number][] = [
        [-6.5, 1.75, -4.5], [6.5, 1.75, -4.5],
        [-6.5, 1.75, 4.5], [6.5, 1.75, 4.5],
        [0, 1.75, -4.5], [0, 1.75, 4.5]
      ];
      stiltPositions.forEach(p => {
        const stilt = new THREE.Mesh(stiltGeo, stiltMat);
        stilt.position.set(...p);
        stilt.castShadow = true;
        scene.add(stilt);
      });

      // Radome Satellite Dome (Upper observation roof)
      const radomeAsset = assets.find(a => a.type === 'radome') || assets[0];
      if (radomeAsset) {
        const radomeGeo = new THREE.SphereGeometry(2.2, 32, 24);
        createAssetMesh(radomeAsset, radomeGeo, 0xe2e8f0, [0, 9.2, 0]);
      }

      // Helipad with Indian Tri-color concentric circle
      const helipadGeo = new THREE.CylinderGeometry(6, 6, 0.5, 32);
      const helipadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3, roughness: 0.7 });
      const helipad = new THREE.Mesh(helipadGeo, helipadMat);
      helipad.position.set(15, 0.25, 0);
      helipad.receiveShadow = true;
      scene.add(helipad);

      const hCircleGeo = new THREE.RingGeometry(4.5, 5.0, 32);
      const hCircleMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide });
      const hCircle = new THREE.Mesh(hCircleGeo, hCircleMat);
      hCircle.rotation.x = -Math.PI / 2;
      hCircle.position.set(15, 0.52, 0);
      scene.add(hCircle);

      // Power Block Building (Houses GEN-01, GEN-02, BESS)
      const powerBlockGeo = new THREE.BoxGeometry(10, 4, 8);
      const powerBlockMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 });
      const powerBlock = new THREE.Mesh(powerBlockGeo, powerBlockMat);
      powerBlock.position.set(-11, 2, 0);
      powerBlock.castShadow = true;
      scene.add(powerBlock);

      // Generators inside power block
      const gen1 = assets.find(a => a.assetId === 'GEN-01');
      if (gen1) {
        createAssetMesh(gen1, new THREE.BoxGeometry(2.5, 2, 2), 0x38bdf8, [-9, 3.5, 2]);
      }
      const gen2 = assets.find(a => a.assetId === 'GEN-02');
      if (gen2) {
        createAssetMesh(gen2, new THREE.BoxGeometry(2.5, 2, 2), gen2.status === 'offline' ? 0x64748b : gen2.status === 'critical' ? 0xef4444 : gen2.status === 'warning' ? 0xf59e0b : 0x38bdf8, [-9, 3.5, -2]);
      }

      // Fuel Tank Depot
      const fuelAsset = assets.find(a => a.type === 'fuel_tank');
      if (fuelAsset) {
        const tankGeo = new THREE.CylinderGeometry(2, 2, 4.5, 24);
        const t1 = createAssetMesh(fuelAsset, tankGeo, 0x64748b, [18, 2.25, 12]);
        t1.rotation.z = Math.PI / 2;
      }

      // Solar Bifacial Array
      const solarAsset = assets.find(a => a.type === 'solar');
      if (solarAsset) {
        const solarPanelGeo = new THREE.BoxGeometry(5, 0.1, 8);
        const sMesh = createAssetMesh(solarAsset, solarPanelGeo, 0x0284c7, [14, 2.5, -12]);
        sMesh.rotation.x = 0.45; // Polar angle
      }

      // Desalination RO Utility Annex
      const waterAsset = assets.find(a => a.type === 'water_ro');
      if (waterAsset) {
        createAssetMesh(waterAsset, new THREE.BoxGeometry(4, 3, 4), 0x06b6d4, [6, 1.5, 10]);
      }

      // Central HVAC
      const hvacAsset = assets.find(a => a.type === 'hvac');
      if (hvacAsset) {
        createAssetMesh(hvacAsset, new THREE.BoxGeometry(3, 1.8, 3), 0x10b981, [0, 8.2, -4]);
      }

    } else {
      // --- MAITRI 3D ARCHITECTURE (Schirmacher Oasis) ---
      // Main Station Modular Blocks on Ground Plinth
      const maitriMainGeo = new THREE.BoxGeometry(14, 4, 10);
      const maitriMainMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.5 });
      const maitriMain = new THREE.Mesh(maitriMainGeo, maitriMainMat);
      maitriMain.position.set(0, 2, 0);
      maitriMain.castShadow = true;
      scene.add(maitriMain);

      // Genset Shack
      const mGen1 = assets.find(a => a.assetId === 'M-GEN-01');
      if (mGen1) createAssetMesh(mGen1, new THREE.BoxGeometry(3, 2.2, 2.5), 0x38bdf8, [-8, 1.5, 3]);

      const mGen2 = assets.find(a => a.assetId === 'M-GEN-02');
      if (mGen2) createAssetMesh(mGen2, new THREE.BoxGeometry(3, 2.2, 2.5), 0x38bdf8, [-8, 1.5, -3]);

      // Priyadarshini Lake Water Pumphouse & Trace Heated Pipe
      const lakePump = assets.find(a => a.assetId === 'M-PUMP-LAKE');
      if (lakePump) {
        createAssetMesh(lakePump, new THREE.BoxGeometry(3, 2.5, 3), 0x0284c7, [18, 1.25, 14]);

        // Trace heated pipeline connecting to main block
        const pipeCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(18, 0.8, 14));
        const pipeGeo = new THREE.TubeGeometry(pipeCurve, 20, 0.25, 8, false);
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x451a03, roughness: 0.4 });
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        scene.add(pipe);
      }

      // Priyadarshini Meltwater Lake surface
      const lakeGeo = new THREE.CircleGeometry(10, 32);
      const lakeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });
      const lake = new THREE.Mesh(lakeGeo, lakeMat);
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(22, 0.08, 18);
      scene.add(lake);

      // Polar Wind Turbine Mast & Rotating Blades
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

        // 3 Blades
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
      const meshes = clickableMeshesRef.current.map(c => c.mesh);
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const found = clickableMeshesRef.current.find(c => c.mesh === intersects[0].object);
        if (found) {
          setHoveredAsset(found.asset);
          container.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredAsset(null);
      container.style.cursor = 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = clickableMeshesRef.current.map(c => c.mesh);
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const found = clickableMeshesRef.current.find(c => c.mesh === intersects[0].object);
        if (found) {
          onSelectAsset(found.asset);
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

      // Orbit horizontally around origin
      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      let angle = Math.atan2(camera.position.z, camera.position.x);
      angle -= dx * 0.006;
      camera.position.x = radius * Math.cos(angle);
      camera.position.z = radius * Math.sin(angle);

      // Pitch angle
      camera.position.y = Math.max(5, Math.min(50, camera.position.y + dy * 0.05));
      camera.lookAt(0, 3, 0);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!camera) return;
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      camera.position.x *= factor;
      camera.position.y = Math.max(5, Math.min(65, camera.position.y * factor));
      camera.position.z *= factor;
      camera.lookAt(0, 3, 0);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseDrag);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Render loop
    let angleSpin = 0;
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Rotate Maitri wind turbine if active
      if (rotatingTurbineRef.current) {
        rotatingTurbineRef.current.rotation.z += 0.04;
      }

      // Subtle atmospheric vibration effect if overlay active
      if (vibrationOverlay) {
        angleSpin += 0.1;
        clickableMeshesRef.current.forEach(({ mesh, asset }) => {
          if (asset.vibration > 2.0) {
            mesh.position.y += Math.sin(angleSpin) * 0.02;
          }
        });
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
      cancelAnimationFrame(animFrameIdRef.current);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseDrag);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [stationId, thermalOverlay, vibrationOverlay]);

  // Adjust camera view presets
  const handlePresetView = (mode: 'perspective' | 'top' | 'generator') => {
    setCameraMode(mode);
    if (!cameraRef.current) return;
    const c = cameraRef.current;
    if (mode === 'perspective') {
      c.position.set(28, 22, 34);
    } else if (mode === 'top') {
      c.position.set(0.1, 55, 0.1);
    } else if (mode === 'generator') {
      c.position.set(-18, 8, 0);
    }
    c.lookAt(0, 3, 0);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '480px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Left: Station & Coordinate Tag */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: 16,
        padding: '8px 14px',
        background: 'rgba(7, 18, 33, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--panel-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'none'
      }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: stationId === 'BHARATI' ? 'var(--accent-cyan)' : 'var(--status-normal)',
          boxShadow: '0 0 10px currentColor'
        }} />
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            {stationId === 'BHARATI' ? 'BHARATI DIGITAL TWIN' : 'MAITRI DIGITAL TWIN'}
          </div>
          <div className="telemetry-val" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {stationId === 'BHARATI' ? '69°24\'29"S, 76°11\'14"E • Larsemann Hills' : '70°45\'57"S, 11°44\'09"E • Schirmacher Oasis'}
          </div>
        </div>
      </div>

      {/* Top Right: View Controls & Overlays */}
      <div style={{
        position: 'absolute',
        top: 14,
        right: 16,
        display: 'flex',
        gap: 8,
        background: 'rgba(7, 18, 33, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '6px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--panel-border)'
      }}>
        <button
          className={`btn ${thermalOverlay ? 'btn-danger' : 'btn-outline'}`}
          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
          onClick={onToggleThermal}
          title="Toggle Thermal Gradient Overlay"
        >
          <Flame size={14} /> Thermal
        </button>
        <button
          className={`btn ${vibrationOverlay ? 'btn-cyan' : 'btn-outline'}`}
          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
          onClick={onToggleVibration}
          title="Toggle Harmonic Vibration Overlay"
        >
          <Activity size={14} /> Vibration
        </button>
        <div style={{ width: 1, backgroundColor: 'var(--panel-border)', margin: '0 2px' }} />
        <button
          className={`btn ${cameraMode === 'perspective' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
          onClick={() => handlePresetView('perspective')}
        >
          3D Orbit
        </button>
        <button
          className={`btn ${cameraMode === 'top' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
          onClick={() => handlePresetView('top')}
        >
          Top View
        </button>
        <button
          className={`btn ${cameraMode === 'generator' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
          onClick={() => handlePresetView('generator')}
        >
          Power Bay
        </button>
      </div>

      {/* Bottom Center: Hovered Asset Telemetry Card */}
      {hoveredAsset && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(11, 23, 40, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--panel-border-bright)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: 'var(--shadow-lg)',
          pointerEvents: 'none'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {hoveredAsset.type} • {hoveredAsset.building}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
              {hoveredAsset.name} ({hoveredAsset.assetId})
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--panel-border)', paddingLeft: 12 }}>
            <span className={`badge badge-${hoveredAsset.status === 'offline' ? 'offline' : hoveredAsset.status === 'critical' ? 'critical' : hoveredAsset.status === 'warning' ? 'warning' : 'normal'}`}>
              {hoveredAsset.status.toUpperCase()}
            </span>
          </div>
          <div className="telemetry-val" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
            ⚡ {hoveredAsset.powerKw} kW | 🌡️ {hoveredAsset.temperature}°C | 〰️ {hoveredAsset.vibration} mm/s
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Click to open telemetry drawer
          </div>
        </div>
      )}

      {/* Bottom Left: Navigation hint */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 16,
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        pointerEvents: 'none'
      }}>
        Left-click + Drag to Orbit • Scroll to Zoom • Click asset to inspect
      </div>
    </div>
  );
};
