import React, { useState } from 'react';
import { Station } from '../../types';
import { AlertTriangle, ShieldAlert, Zap, Flame, Radio, Droplets, CheckCircle, X, Lock } from 'lucide-react';

interface EmergencyModeModalProps {
  station: Station;
  onClose: () => void;
}

export const EmergencyModeModal: React.FC<EmergencyModeModalProps> = ({ station, onClose }) => {
  const [sheddingLabs, setSheddingLabs] = useState(true);
  const [sheddingDrill, setSheddingDrill] = useState(true);
  const [heatingPriority, setHeatingPriority] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [actionSuccess, setActionSuccess] = useState(false);

  const handleApplyTriage = () => {
    if (!isAuthorized) {
      alert('Safety authorization code required (Enter 9999 for SIH Demo Override).');
      return;
    }
    setActionSuccess(true);
    setTimeout(() => {
      setActionSuccess(false);
      alert('Emergency Triage Protocol Engaged. Non-essential circuits isolated. Life support guaranteed for 72 hours on Standby Genset + BESS.');
    }, 600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(10, 0, 0, 0.88)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        width: '640px',
        maxWidth: '92vw',
        background: '#0e0406',
        border: '2px solid var(--status-critical)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-critical-glow)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Urgent Header */}
        <div style={{
          background: 'linear-gradient(90deg, #991b1b 0%, #7f1d1d 100%)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={24} className="radar-spinner" style={{ animationDuration: '2s' }} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '0.05em' }}>
                POLAR EMERGENCY LIFE-SUPPORT TRIAGE
              </h2>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Station: <strong>{station.name.toUpperCase()}</strong> • CRITICAL STATUS OVERRIDE
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Emergencies Banner */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5' }}>
              ⚠️ ACTIVE EXTREME CONTINGENCY TRIGGERS:
            </div>
            <div style={{ fontSize: '0.8rem', color: '#fff', lineHeight: 1.4 }}>
              • <strong>Generator G-02 Vibration / Thermal Excursion:</strong> Imminent bearing mechanical seizure.<br />
              • <strong>Blizzard Cold Snap:</strong> Ambient air temperature -28.4°C with 36.5 kts katabatic winds.
            </div>
          </div>

          {/* Life-Support Triage Status */}
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>
              Life-Support Subsystem Redundancies
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flame size={20} color="var(--status-normal)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Thermal Space Heating</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-normal)' }}>PROTECTED • +21°C Habitat Zone</div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Radio size={20} color="var(--status-normal)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Satellite Comms Lifeline</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-normal)' }}>GSAT-10 Uplink Priority 1</div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Droplets size={20} color="var(--status-normal)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Potable Water Supply</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-normal)' }}>Reservoir Buffer: 18,000 L</div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={20} color="var(--status-warning)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Backup Microgrid BESS</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-warning)' }}>400 kWh (84% Reserve Ready)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Load Shedding Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Automatic Emergency Load Shedding
            </h4>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: '#fff', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sheddingLabs}
                onChange={(e) => setSheddingLabs(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--status-critical)' }}
              />
              <span>Shed Non-essential Science Laboratories (-68 kW)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: '#fff', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sheddingDrill}
                onChange={(e) => setSheddingDrill(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--status-critical)' }}
              />
              <span>Shed Secondary Desalination & Outer Snowmelt Loop (-32 kW)</span>
            </label>
          </div>

          {/* Mandatory Human Authorization */}
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--panel-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <Lock size={18} color="var(--accent-cyan)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Authorized Human Signoff Required (Security Key):
              </div>
              <input
                type="password"
                placeholder="Enter 9999 for SIH Demo Override"
                className="input-control"
                style={{ width: '100%', marginTop: 4 }}
                value={authCode}
                onChange={(e) => {
                  setAuthCode(e.target.value);
                  setIsAuthorized(e.target.value === '9999');
                }}
              />
            </div>
            {isAuthorized && (
              <span className="badge badge-normal" style={{ height: 'fit-content' }}>
                AUTHORIZED
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(0,0,0,0.4)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <button className="btn btn-outline" onClick={onClose}>
            Stand Down & Exit Mode
          </button>
          <button
            className="btn btn-danger"
            style={{ padding: '10px 20px', fontWeight: 800 }}
            onClick={handleApplyTriage}
            disabled={!isAuthorized}
          >
            ENGAGE EMERGENCY TRIAGE
          </button>
        </div>
      </div>
    </div>
  );
};
