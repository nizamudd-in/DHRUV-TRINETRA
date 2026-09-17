import React, { useState } from 'react';
import { ActiveTab, Station, Asset } from '../../types';
import { Play, Pause, ChevronRight, ChevronLeft, CheckCircle2, X, Sparkles, ShieldAlert, Cpu } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DemoTourRunnerProps {
  activeTab: ActiveTab;
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectStation: (sid: 'BHARATI' | 'MAITRI') => void;
  onInjectAnomaly: () => void;
  onSelectAsset: (asset: Asset) => void;
  assets: Asset[];
  onToggleSatellite: (online: boolean) => void;
  onClose: () => void;
}

interface DemoStep {
  stepNumber: number;
  title: string;
  description: string;
  actionLabel: string;
  execute: () => void;
}

export const DemoTourRunner: React.FC<DemoTourRunnerProps> = ({
  activeTab,
  onNavigateTab,
  onSelectStation,
  onInjectAnomaly,
  onSelectAsset,
  assets,
  onToggleSatellite,
  onClose
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps: DemoStep[] = [
    {
      stepNumber: 1,
      title: '1. Unified Mission Control Overview',
      description: 'Showcase simultaneous remote health monitoring of both Maitri and Bharati research stations from mainland India (Goa/Delhi) with real-time operational indices.',
      actionLabel: 'Go to Dashboard',
      execute: () => {
        onNavigateTab('dashboard');
      }
    },
    {
      stepNumber: 2,
      title: '2. Select Bharati Station & 3D Twin',
      description: 'Switch station context to Bharati (Larsemann Hills). Loads the Three.js 3D architectural digital twin on aerodynamic elevated stilts.',
      actionLabel: 'Load Bharati 3D Twin',
      execute: () => {
        onSelectStation('BHARATI');
        onNavigateTab('digitaltwin');
      }
    },
    {
      stepNumber: 3,
      title: '3. Inject Live Generator Anomaly',
      description: 'Simulate mechanical wear: Caterpillar Genset 02 vibration surges to 4.85 mm/s (harmonic 2X) with bearing stator heat rising to 84.6°C.',
      actionLabel: 'Inject G-02 Anomaly',
      execute: () => {
        onInjectAnomaly();
        const g2 = assets.find(a => a.assetId === 'GEN-02');
        if (g2) onSelectAsset(g2);
      }
    },
    {
      stepNumber: 4,
      title: '4. Prioritized Risk-Scored Alert',
      description: 'The Smart Alert Engine evaluates Risk = P(Failure) × Operational Impact × Asset Criticality. Immediately escalates to CRITICAL alert level without alert fatigue.',
      actionLabel: 'Open Alerts Engine',
      execute: () => {
        onNavigateTab('alerts');
      }
    },
    {
      stepNumber: 5,
      title: '5. AI Operations Copilot Root-Cause Diagnosis',
      description: 'Query the conversational Antarctic Copilot. It explains the 2X harmonic vibration signature, roller bearing pitting, and calculates an 88.4% seizure risk.',
      actionLabel: 'Consult AI Copilot',
      execute: () => {
        onNavigateTab('copilot');
      }
    },
    {
      stepNumber: 6,
      title: '6. Check Critical Spare Parts Inventory',
      description: 'Cross-reference inventory in the Smart Logistics module: confirms 2 sets of Caterpillar Ceramic Bearings (INV-01) are in storage, mitigating supply bottlenecks.',
      actionLabel: 'Check Logistics Spares',
      execute: () => {
        onNavigateTab('logistics');
      }
    },
    {
      stepNumber: 7,
      title: '7. Run What-If Contingency Simulation',
      description: 'Simulate what happens if G-02 is taken offline during a -10°C katabatic wind chill. Calculate station microgrid load gap and fuel depletion rate.',
      actionLabel: 'Open Scenario Simulator',
      execute: () => {
        onNavigateTab('simulation');
      }
    },
    {
      stepNumber: 8,
      title: '8. Generate Corrective Work Order',
      description: 'Authorizes an emergency mechanical maintenance work order in the Kanban system, assigning technicians and reserving the required spare bearings.',
      actionLabel: 'Open Maintenance Kanban',
      execute: () => {
        onNavigateTab('maintenance');
      }
    },
    {
      stepNumber: 9,
      title: '9. Simulate Satellite Blackout (Store & Forward)',
      description: 'Cut cloud GSAT-10 satellite connectivity! Demonstrates Edge Resilience: local station gateway buffers all telemetry, sensor readings, and logs safely.',
      actionLabel: 'Disconnect Satellite',
      execute: () => {
        onToggleSatellite(false);
      }
    },
    {
      stepNumber: 10,
      title: '10. Restore Satellite & Auto-Sync',
      description: 'Reconnect satellite communication! The Edge Gateway automatically performs prioritized batch synchronization, flushing buffered packets to central command.',
      actionLabel: 'Restore Satellite & Sync',
      execute: () => {
        onToggleSatellite(true);
        try {
          confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
        } catch (_) {}
      }
    },
    {
      stepNumber: 11,
      title: '11. Generate Official NCPOR Audit Report',
      description: 'Generate the certified executive daily briefing and incident log for the Ministry of Earth Sciences with 1 click.',
      actionLabel: 'Open Report Center',
      execute: () => {
        onNavigateTab('reports');
      }
    }
  ];

  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      steps[nextIdx].execute();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      steps[prevIdx].execute();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: '460px',
      maxWidth: '92vw',
      background: 'rgba(9, 20, 36, 0.96)',
      backdropFilter: 'blur(20px)',
      border: '2px solid var(--accent-cyan)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 0 30px rgba(0, 229, 255, 0.35)',
      zIndex: 1500,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SIH 2026 Presentation Tour ({currentStepIndex + 1} / {steps.length})
          </span>
        </div>

        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Step Info */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          {currentStep.title}
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {currentStep.description}
        </p>
      </div>

      {/* Step Progress Bar */}
      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #0284c7, #00e5ff)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <button
          className="btn btn-outline"
          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft size={14} /> Back
        </button>

        <button
          className="btn btn-cyan"
          style={{ padding: '6px 16px', fontSize: '0.8rem', fontWeight: 700 }}
          onClick={() => {
            currentStep.execute();
            if (currentStepIndex < steps.length - 1) {
              handleNext();
            }
          }}
        >
          {currentStep.actionLabel} <ChevronRight size={14} />
        </button>

        <button
          className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          onClick={handleNext}
          disabled={currentStepIndex === steps.length - 1}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
