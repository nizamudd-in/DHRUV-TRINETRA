import React from 'react';
import { DataSourceKind } from '../../types';
import { Database, Cpu, Globe, Layers } from 'lucide-react';

interface DataSourceBadgeProps {
  kind: DataSourceKind;
  label?: string;
  detail?: string;
}

const KIND_CONFIG: Record<DataSourceKind, { text: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  PUBLIC: { text: 'NCPOR / Public', color: 'var(--status-normal)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: <Globe size={11} /> },
  SIMULATED: { text: 'Simulated telemetry', color: 'var(--accent-cyan)', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.25)', icon: <Database size={11} /> },
  PROTOTYPE: { text: 'Prototype-derived', color: 'var(--status-warning)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: <Cpu size={11} /> },
  MIXED: { text: 'Mixed sources', color: 'var(--text-secondary)', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', icon: <Layers size={11} /> }
};

// Reusable "where did this number come from" indicator — see P3 Phase 4.
// Never label anything PUBLIC unless it genuinely comes from NCPOR/public data.
export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ kind, label, detail }) => {
  const cfg = KIND_CONFIG[kind];
  return (
    <span
      title={detail}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 9999,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap'
      }}
    >
      {cfg.icon} {label || cfg.text}
    </span>
  );
};
