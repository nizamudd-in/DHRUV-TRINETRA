import React, { useState } from 'react';
import { Station, Asset, Alert } from '../../types';
import { FileText, Download, Printer, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { DataSourceBadge } from '../common/DataSourceBadge';

interface ReportCenterProps {
  station: Station;
  assets: Asset[];
  alerts: Alert[];
}

export const ReportCenter: React.FC<ReportCenterProps> = ({ station, assets, alerts }) => {
  const [selectedReportType, setSelectedReportType] = useState<'daily' | 'fuel' | 'maintenance' | 'incident'>('daily');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Real server-generated PDF (see backend/app/report_generator.py) — no placeholder,
  // no fake "Downloaded" message unless the browser actually received a file.
  const handleExportPdf = async () => {
    setExportingPdf(true);
    setExportError(null);
    try {
      await api.downloadReportPdf(station.stationId);
    } catch (e: any) {
      setExportError(e?.message || 'PDF generation failed.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    setExportError(null);
    try {
      await api.downloadTelemetryCsv(station.stationId);
    } catch (e: any) {
      setExportError(e?.message || 'CSV export failed.');
    } finally {
      setExportingCsv(false);
    }
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
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            Prototype Station Audit & Mission Log — formatted for Ministry of Earth Sciences (MoES) review
            <DataSourceBadge kind="MIXED" detail="Equipment/energy figures: simulated telemetry. Risk/health/AI figures: prototype-derived models." />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-outline"
              onClick={handleExportCsv}
              disabled={exportingCsv}
            >
              <Download size={14} /> {exportingCsv ? 'Exporting…' : 'Export Real CSV'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExportPdf}
              disabled={exportingPdf}
            >
              <Printer size={14} /> {exportingPdf ? 'Generating…' : 'Generate PDF'}
            </button>
          </div>
          {exportError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#fca5a5' }}>
              <AlertTriangle size={12} /> {exportError}
            </div>
          )}
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

      {/* Printable Report Document Card (Prototype, Government/MoES-style layout) */}
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
              PROTOTYPE / DEMONSTRATION
            </div>
            <div className="telemetry-val" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Demo Ref: SIH26060-SAMPLE-REPORT
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
              Snapshot at report generation time: {station.name} is {station.status} with a {station.healthScore}% health
              index, ambient conditions {station.currentTemp}°C / {station.windSpeedKts} kts, and{' '}
              {alerts.filter(a => !a.acknowledged).length} unacknowledged active alert(s).
              {station.emergencyActive ? ' Emergency triage is currently ENGAGED.' : ''}
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
                  <td><span className={`badge badge-${station.powerLoadKw / station.powerCapacityKw > 0.9 ? 'critical' : 'normal'}`}>{((station.powerLoadKw / station.powerCapacityKw) * 100).toFixed(0)}% Load</span></td>
                  <td className="telemetry-val">{station.powerLoadKw} kW / {station.powerCapacityKw} kW</td>
                  <td>{station.powerLoadKw / station.powerCapacityKw < 0.95 ? 'Satisfies life-support reserve criteria' : 'Near capacity — review load shedding'}</td>
                </tr>
                <tr>
                  <td>Winter Fuel Reserve</td>
                  <td><span className={`badge badge-${station.fuelDaysRemaining < 60 ? 'warning' : 'normal'}`}>{station.fuelDaysRemaining < 60 ? 'Watch' : 'Safe'}</span></td>
                  <td className="telemetry-val">{station.fuelDaysRemaining} days</td>
                  <td>{station.fuelDaysRemaining >= 90 ? 'Surpasses 90d mandatory margin' : 'Below 90d mandatory margin'}</td>
                </tr>
                {(() => {
                  const worst = [...assets].sort((a, b) => a.healthScore - b.healthScore)[0];
                  if (!worst) return null;
                  return (
                    <tr>
                      <td>{worst.assetId} ({worst.name})</td>
                      <td><span className={`badge badge-${worst.status === 'offline' ? 'offline' : worst.status === 'critical' ? 'critical' : worst.status === 'warning' ? 'warning' : 'normal'}`}>{worst.status}</span></td>
                      <td className="telemetry-val">{worst.vibration.toFixed(2)} mm/s, {worst.temperature.toFixed(1)}°C (Health {worst.healthScore.toFixed(1)}%)</td>
                      <td>Lowest calculated health index at this station</td>
                    </tr>
                  );
                })()}
                <tr>
                  <td>Satellite Uplink (SATCOM)</td>
                  <td><span className={`badge badge-${station.connectivity === 'ONLINE' ? 'normal' : 'critical'}`}>{station.connectivity}</span></td>
                  <td className="telemetry-val">Connectivity: {station.connectivity}</td>
                  <td>See Communication panel for buffered event count</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {selectedReportType === 'fuel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Fuel &amp; Energy Consumption Snapshot</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Current load {station.powerLoadKw} kW against {station.powerCapacityKw} kW rated capacity ({((station.powerLoadKw / station.powerCapacityKw) * 100).toFixed(1)}%).
              BESS at {station.batterySoc}% SOC. Fuel runway {station.fuelDaysRemaining} days remaining.
            </p>
          </div>
        )}

        {/* Prototype Disclaimer Block */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Generated by:</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>PolarTwin Prototype Engine</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AI-generated recommendation — human authorization required</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Prototype / Demonstration</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Not an official NCPOR system</div>
          </div>
        </div>
      </div>
    </div>
  );
};
