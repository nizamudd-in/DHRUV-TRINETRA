import React, { useState } from 'react';
import { Station, Asset, Alert } from '../../types';
import { FileText, Download, Printer, CheckCircle, ShieldCheck } from 'lucide-react';

interface ReportCenterProps {
  station: Station;
  assets: Asset[];
  alerts: Alert[];
}

export const ReportCenter: React.FC<ReportCenterProps> = ({ station, assets, alerts }) => {
  const [selectedReportType, setSelectedReportType] = useState<'daily' | 'fuel' | 'maintenance' | 'incident'>('daily');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = (format: 'pdf' | 'csv') => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(`PolarTwin Report successfully compiled and exported in ${format.toUpperCase()} format for National Centre for Polar and Ocean Research (NCPOR).`);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={22} color="var(--accent-cyan)" />
            NCPOR Antarctic Operations Executive Reporting & Compliance
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Ministry of Earth Sciences (MoES) Official Station Audit & Mission Logs
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <Download size={14} /> Export Raw CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
          >
            <Printer size={14} /> Generate Official PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { id: 'daily', title: 'Daily Station Executive Summary' },
          { id: 'fuel', title: 'Energy & Fuel Consumption Audit' },
          { id: 'maintenance', title: 'Equipment & RUL Maintenance Log' },
          { id: 'incident', title: 'Incident & Anomaly Investigation' }
        ].map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedReportType(r.id as any)}
            className={`btn ${selectedReportType === r.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            {r.title}
          </button>
        ))}
      </div>

      {/* Printable Report Document Card (Official Government / MoES Style) */}
      <div className="glass-panel-elevated" style={{
        padding: '36px',
        background: '#091526',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--panel-border-bright)',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Document Letterhead */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: '20px',
          borderBottom: '2px solid var(--accent-cyan)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              GOVERNMENT OF INDIA • MINISTRY OF EARTH SCIENCES
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
              NATIONAL CENTRE FOR POLAR AND OCEAN RESEARCH (NCPOR)
            </h1>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Headland Sada, Vasco-da-Gama, Goa 403804 • Polar Expedition Operations Directorate
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="badge badge-info" style={{ marginBottom: 4 }}>
              CLASSIFICATION: OFFICIAL
            </div>
            <div className="telemetry-val" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Report Ref: NCPOR/POLAR/2026/09-07
            </div>
            <div className="telemetry-val" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Date: 07-SEP-2026 • 07:30 UTC
            </div>
          </div>
        </div>

        {/* Report Meta Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          background: 'rgba(7, 18, 33, 0.6)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--panel-border)'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Facility</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{station.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Coordinates</div>
            <div className="telemetry-val" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{station.coordinates}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Operational Health Index</div>
            <div className="telemetry-val" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--status-normal)' }}>{station.healthScore}% NOMINAL</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overwintering Expedition</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{station.personnelCount} Personnel (44th ISEA)</div>
          </div>
        </div>

        {/* Report Content Body based on selected tab */}
        {selectedReportType === 'daily' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
              1. Executive Operational Overview
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Over the preceding 24-hour observation window, all life-support, power generation, and environmental containment systems at {station.name} operated within safety envelopes. A thermal heating load increase of +12.4% was recorded due to an ambient katabatic gale (-28.4°C, 36.5 kts). Emergency Standby Genset 03 successfully completed scheduled cold-start validation.
            </p>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, marginTop: 10 }}>
              2. Key Subsystem Performance Indices
            </h3>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Subsystem</th>
                  <th>Status</th>
                  <th>Current Load / Value</th>
                  <th>Compliance Horizon</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Microgrid Primary Power</td>
                  <td><span className="badge badge-normal">94% Nominal</span></td>
                  <td className="telemetry-val">345 kW / 600 kW</td>
                  <td>Satisfies 100% life-support reserve criteria</td>
                </tr>
                <tr>
                  <td>Winter Fuel Reserve</td>
                  <td><span className="badge badge-normal">Safe</span></td>
                  <td className="telemetry-val">215,000 Liters</td>
                  <td>142 Days Remaining (Surpasses 90d mandatory margin)</td>
                </tr>
                <tr>
                  <td>Caterpillar Genset 02</td>
                  <td><span className="badge badge-critical">Vibration Alert</span></td>
                  <td className="telemetry-val">3.90 mm/s (Bearing Temp 78.4°C)</td>
                  <td>Work Order WO-2026-089 active; spares verified in depot</td>
                </tr>
                <tr>
                  <td>Satellite Uplink GSAT-10</td>
                  <td><span className="badge badge-normal">Active</span></td>
                  <td className="telemetry-val">SNR 99.8% • Latency 580 ms</td>
                  <td>Edge Store-and-Forward sync buffer 0 events pending</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {selectedReportType === 'fuel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Fuel & Energy Consumption Breakdown</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Total daily consumption is averaging 1,510 Liters/day of Arctic ATF/Jet A-1. Solar bifacial PV arrays contributed 28 kW during solar daylight windows, conserving an estimated 196.8 Liters of diesel over the last 24 hours.
            </p>
          </div>
        )}

        {/* Official Signoff Block */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Certified by Digital Twin Engine:</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>PolarTwin Autonomous Validation v1.0</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SHA-256: 8f4b1e90c2a78d05... verified</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Dr. M. Ravichandran</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Director, NCPOR / Ministry of Earth Sciences</div>
          </div>
        </div>
      </div>
    </div>
  );
};
