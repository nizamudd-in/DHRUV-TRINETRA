import React from 'react';
import { RefreshCw, AlertTriangle, Inbox } from 'lucide-react';

// Reusable loading / error / empty presentational states — see P3 Phase 6.
// Goal: no blank screens, no misleading zero values, always a way forward.

export const LoadingState: React.FC<{ label?: string; compact?: boolean }> = ({ label = 'Loading…', compact }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: compact ? '10px' : '30px', color: 'var(--accent-cyan)', fontSize: '0.85rem'
  }}>
    <RefreshCw size={compact ? 14 : 18} className="radar-spinner" />
    <span>{label}</span>
  </div>
);

export const ErrorState: React.FC<{ title?: string; message: string; onRetry?: () => void }> = ({
  title = 'Something went wrong', message, onRetry
}) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
    padding: '24px', border: '1px dashed rgba(239, 68, 68, 0.35)', borderRadius: 'var(--radius-md)',
    background: 'rgba(239, 68, 68, 0.06)'
  }}>
    <AlertTriangle size={22} color="var(--status-critical)" />
    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5' }}>{title}</div>
    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{message}</div>
    {onRetry && (
      <button className="btn btn-outline" style={{ padding: '5px 14px', fontSize: '0.75rem', marginTop: 4 }} onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{ title?: string; message: string }> = ({
  title = 'No data available', message
}) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center',
    padding: '24px', border: '1px dashed var(--panel-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)'
  }}>
    <Inbox size={20} />
    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</div>
    <div style={{ fontSize: '0.75rem' }}>{message}</div>
  </div>
);
