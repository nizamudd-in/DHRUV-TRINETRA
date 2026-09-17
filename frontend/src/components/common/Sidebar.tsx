import React from 'react';
import { ActiveTab } from '../../types';
import {
  LayoutDashboard,
  Box,
  Zap,
  Cpu,
  Package,
  CloudSnow,
  AlertOctagon,
  Sliders,
  Wrench,
  Bot,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unacknowledgedAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  unacknowledgedAlertsCount
}) => {
  const menuItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Mission Control', icon: <LayoutDashboard size={18} /> },
    { id: 'digitaltwin', label: '3D Digital Twin', icon: <Box size={18} /> },
    { id: 'energy', label: 'Energy & Microgrid', icon: <Zap size={18} /> },
    { id: 'equipment', label: 'Equipment & Health', icon: <Cpu size={18} /> },
    { id: 'logistics', label: 'Logistics & Cargo', icon: <Package size={18} /> },
    { id: 'environment', label: 'Polar Weather', icon: <CloudSnow size={18} /> },
    { id: 'alerts', label: 'Alerts Engine', icon: <AlertOctagon size={18} />, badge: unacknowledgedAlertsCount },
    { id: 'simulation', label: 'What-If Simulation', icon: <Sliders size={18} /> },
    { id: 'maintenance', label: 'Maintenance Kanban', icon: <Wrench size={18} /> },
    { id: 'copilot', label: 'AI Operations Copilot', icon: <Bot size={18} /> },
    { id: 'reports', label: 'Reports & Auditing', icon: <FileText size={18} /> },
  ];

  return (
    <aside style={{
      width: '240px',
      background: 'rgba(7, 18, 33, 0.95)',
      borderRight: '1px solid var(--panel-border)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px 12px',
      minHeight: 'calc(100vh - 68px)',
      userSelect: 'none'
    }}>
      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '8px 12px 4px'
        }}>
          Operations Command
        </div>

        {menuItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: isActive ? 'var(--accent-cyan)' : 'inherit' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  background: 'var(--status-critical)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Emergency Shortcut Card */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fca5a5', fontSize: '0.78rem', fontWeight: 700 }}>
          <AlertTriangle size={15} /> Emergency Life-Support
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Dedicated survival triage & automatic thermal load shedding.
        </div>
        <button
          onClick={() => onTabChange('emergency')}
          className="btn btn-danger"
          style={{ width: '100%', padding: '6px', fontSize: '0.75rem' }}
        >
          Open Emergency Mode
        </button>
      </div>
    </aside>
  );
};
