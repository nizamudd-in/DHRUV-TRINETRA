import React from 'react';
import { RotateCcw, X, RefreshCw, AlertTriangle } from 'lucide-react';

interface ResetDemoModalProps {
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

// Confirmation UI for the TRUE global "Reset Demo" (P3 Phase 7). No password —
// this is a demo safety control, not a security boundary.
export const ResetDemoModal: React.FC<ResetDemoModalProps> = ({ loading, error, onConfirm, onClose }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(6, 14, 26, 0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100
    }}>
      <div style={{
        width: 460, maxWidth: '92vw', background: '#0b1728',
        border: '1px solid var(--panel-border-bright)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RotateCcw size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Reset entire demonstration?
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          All simulated anomalies, alerts, AI decisions/simulations, work orders, emergency
          state and queued sync events — for <strong style={{ color: '#fff' }}>both Bharati and Maitri</strong> —
          will be restored to baseline. This is a real backend state reset, not a page reload.
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#fca5a5' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading} style={{ fontWeight: 700 }}>
            {loading ? <RefreshCw size={15} className="radar-spinner" /> : <RotateCcw size={15} />}
            {loading ? 'Resetting…' : 'Reset Demo'}
          </button>
        </div>
      </div>
    </div>
  );
};
