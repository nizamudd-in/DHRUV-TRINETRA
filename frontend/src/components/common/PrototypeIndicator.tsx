import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

// Persistent, unobtrusive "this is a prototype" indicator for the app shell — see P3
// Phase 5. Communicates that this is a demonstration using simulated equipment
// telemetry (not that the system is fake) — never dominates the dashboard.
export const PrototypeIndicator: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 9999,
          background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)',
          color: 'var(--status-warning)', fontSize: '0.68rem', fontWeight: 700,
          letterSpacing: '0.03em', cursor: 'pointer', fontFamily: 'var(--font-mono)'
        }}
        title="About this demonstration"
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-warning)' }} />
        PROTOTYPE / DEMO
        <Info size={11} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '120%', right: 0, width: 300, zIndex: 1000,
          background: 'rgba(11, 23, 40, 0.98)', border: '1px solid var(--panel-border-bright)',
          borderRadius: 'var(--radius-md)', padding: '14px 16px', boxShadow: 'var(--shadow-lg)',
          fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            About this POLAR-TWIN demonstration
          </div>
          <p style={{ margin: 0 }}>
            This POLAR-TWIN demonstration uses public/contextual data where available and
            simulated equipment telemetry for non-public station systems. AI, health, risk and
            simulation outputs are prototype models — deterministic and rule-based, not a
            trained ML system, and not official NCPOR certification or approval.
          </p>
        </div>
      )}
    </div>
  );
};
