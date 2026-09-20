import React, { useState, useEffect } from 'react';
import { Station, EdgeStatus } from '../../types';
import { Radio, Wifi, WifiOff, AlertTriangle, Play, Shield, Globe, Clock, UserCheck } from 'lucide-react';

interface HeaderProps {
  currentStation: Station;
  onSelectStation: (id: 'BHARATI' | 'MAITRI') => void;
  edgeStatus: EdgeStatus;
  onToggleSatellite: (online: boolean) => void;
  onOpenEmergency: () => void;
  onStartDemo: () => void;
  activeRole: string;
  onSelectRole: (role: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStation,
  onSelectStation,
  edgeStatus,
  onToggleSatellite,
  onOpenEmergency,
  onStartDemo,
  activeRole,
  onSelectRole
}) => {
  const [timeUtc, setTimeUtc] = useState('');
  const [timeIst, setTimeIst] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toUTCString().slice(17, 25) + ' UTC');
      // IST is UTC + 5:30
      const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      setTimeIst(istDate.toUTCString().slice(17, 25) + ' IST');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      height: '68px',
      padding: '0 24px',
      background: 'rgba(7, 18, 33, 0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--panel-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 500
    }}>
      {/* Left: Brand & MoES/NCPOR Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #0284c7 0%, #00e5ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-cyan-glow)'
          }}>
            <Radio size={22} color="#060e1a" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>
                POLAR<span style={{ color: 'var(--accent-cyan)' }}>TWIN</span>
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                MoES • NCPOR
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
              Digital Twin & Smart Automation Platform for Antarctic Operations
            </div>
          </div>
        </div>

        {/* Station Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(11, 23, 40, 0.8)',
          borderRadius: 'var(--radius-md)',
          padding: '3px',
          border: '1px solid var(--panel-border)'
        }}>
          {(['BHARATI', 'MAITRI'] as const).map(sid => (
            <button
              key={sid}
              onClick={() => onSelectStation(sid)}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: currentStation.stationId === sid ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                color: currentStation.stationId === sid ? '#fff' : 'var(--text-secondary)'
              }}
            >
              {sid === 'BHARATI' ? 'BHARATI (Coastal)' : 'MAITRI (Oasis)'}
            </button>
          ))}
        </div>
      </div>

      {/* Middle: Polar Mission Clocks */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div className="glass-panel" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={16} color="var(--accent-cyan)" />
          <div style={{ textAlign: 'left' }}>
            <div className="telemetry-val" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              {timeUtc}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Station Operational Clock</div>
          </div>
          <div style={{ width: 1, height: 24, backgroundColor: 'var(--panel-border)' }} />
          <div style={{ textAlign: 'left' }}>
            <div className="telemetry-val" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {timeIst}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>HQ New Delhi / Goa</div>
          </div>
        </div>
      </div>

      {/* Right: Edge Connectivity Toggle, Role, Demo, Emergency */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Edge Satellite Link Button */}
        <button
          onClick={() => onToggleSatellite(!edgeStatus.is_online)}
          className={`btn ${edgeStatus.is_online ? 'btn-outline' : 'btn-danger'}`}
          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          title="Click to simulate Antarctic satellite link interruption (Store-and-forward edge buffer)"
        >
          {edgeStatus.is_online ? (
            <>
              <Wifi size={15} color="var(--status-normal)" />
              <span>SATCOM: <strong style={{ color: 'var(--status-normal)' }}>ONLINE</strong></span>
            </>
          ) : (
            <>
              <WifiOff size={15} color="var(--status-critical)" />
              <span>OFFLINE <span className="telemetry-val">({edgeStatus.queue_depth} Queued)</span></span>
            </>
          )}
        </button>

        {/* Role Selector */}
        <select
          value={activeRole}
          onChange={(e) => onSelectRole(e.target.value)}
          className="input-control"
          style={{ fontSize: '0.78rem', padding: '6px 10px', height: '34px' }}
        >
          <option value="National Operator">Role: National Operator (All Stations)</option>
          <option value="Station Commander">Role: Station Commander (Bharati)</option>
          <option value="Chief Systems Engineer">Role: Chief Systems Engineer</option>
          <option value="Logistics Officer">Role: Logistics Officer</option>
        </select>

        {/* 5-Min SIH Guided Tour Runner */}
        <button
          onClick={onStartDemo}
          className="btn btn-cyan"
          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
        >
          <Play size={14} /> 5-Min SIH Demo
        </button>

        {/* Emergency Life-Support Mode Button */}
        <button
          onClick={onOpenEmergency}
          className="btn btn-danger"
          style={{
            padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700,
            animation: currentStation.emergencyActive ? 'pulse-critical 2s infinite ease-in-out' : undefined
          }}
        >
          <AlertTriangle size={15} /> {currentStation.emergencyActive ? 'EMERGENCY ACTIVE' : 'EMERGENCY'}
        </button>
      </div>
    </header>
  );
};
