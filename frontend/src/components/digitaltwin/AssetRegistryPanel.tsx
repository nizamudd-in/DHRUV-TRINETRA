import React from 'react';
import { Asset, Station } from '../../types';
import { ListTree } from 'lucide-react';
import {
  BHARATI_ANCHOR_DEFS, BHARATI_CATEGORY_ORDER, BHARATI_CATEGORY_LABELS,
  resolveAnchorAsset
} from './bharatiAssetConfig';

interface AssetRegistryPanelProps {
  assets: Asset[];
  station: Station;
  selectedAssetId?: string | null;
  onSelectAsset: (asset: Asset) => void;
}

// Compact asset registry (Section 2) — grouped by the same 5 categories used by the 3D
// markers, sourced from the same central BHARATI_ANCHOR_DEFS registry so the list can never
// drift out of sync with what's clickable in the 3D view. Rows without a real backing asset
// (Main Building, Container Area, Ship) show an honest "NO DATA" status rather than a fake one.
export const AssetRegistryPanel: React.FC<AssetRegistryPanelProps> = ({ assets, station, selectedAssetId, onSelectAsset }) => {
  return (
    <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ListTree size={16} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Asset Registry
        </h3>
      </div>

      {BHARATI_CATEGORY_ORDER.map((category) => {
        const defs = BHARATI_ANCHOR_DEFS.filter(d => d.category === category);
        if (defs.length === 0) return null;
        return (
          <div key={category}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {BHARATI_CATEGORY_LABELS[category]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {defs.map((def) => {
                const backendAsset = resolveAnchorAsset(def, assets);
                const isMainBuilding = def.assetId === 'MAIN_BUILDING';
                const statusLabel = backendAsset
                  ? backendAsset.status.toUpperCase()
                  : isMainBuilding
                    ? station.status.toUpperCase()
                    : 'NO DATA';
                const dotColor = backendAsset
                  ? (backendAsset.status === 'critical' || backendAsset.healthScore < 70 ? 'var(--status-critical)'
                    : backendAsset.status === 'warning' ? 'var(--status-warning)'
                      : backendAsset.status === 'offline' ? 'var(--text-muted)' : 'var(--status-normal)')
                  : isMainBuilding
                    ? (station.status === 'operational' ? 'var(--status-normal)' : station.status === 'degraded' ? 'var(--status-warning)' : 'var(--status-critical)')
                    : 'var(--text-muted)';
                const clickable = !!backendAsset;
                const isSelected = backendAsset && selectedAssetId === backendAsset.assetId;

                return (
                  <button
                    key={def.anchorName}
                    onClick={() => backendAsset && onSelectAsset(backendAsset)}
                    disabled={!clickable}
                    title={clickable ? `Inspect ${def.displayName}` : `${def.displayName} — no dedicated telemetry in this prototype`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
                      border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                      cursor: clickable ? 'pointer' : 'default',
                      textAlign: 'left', width: '100%'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: clickable ? '#fff' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {def.assetId}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, boxShadow: '0 0 5px currentColor', color: dotColor }} />
                      {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
