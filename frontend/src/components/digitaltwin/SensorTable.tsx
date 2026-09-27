import React from 'react';
import { Asset } from '../../types';
import { Gauge } from 'lucide-react';
import { DataSourceBadge } from '../common/DataSourceBadge';

interface SensorTableProps {
  assets: Asset[];
}

interface SensorRow {
  status: 'normal' | 'warning' | 'critical' | 'offline';
  sensor: string;
  assetName: string;
  domain: string;
  value: string;
  unit: string;
}

const DOMAIN_BY_TYPE: Record<string, string> = {
  generator: 'Equipment', hvac: 'Equipment', water_ro: 'Equipment', battery: 'Equipment',
  solar: 'Equipment', radome: 'Communication', fuel_tank: 'Logistics', wind_turbine: 'Equipment'
};

// Sensor drawer/table (Sections 7 & 8) — flattens ONLY real existing numeric telemetry
// fields already on Asset. No fabricated sensor types (no fake CO2/humidity/signal-strength
// rows): an asset/anchor with no backing telemetry simply doesn't appear here.
export const SensorTable: React.FC<SensorTableProps> = ({ assets }) => {
  const rows: SensorRow[] = [];
  assets.forEach((a) => {
    const domain = DOMAIN_BY_TYPE[a.type] || 'Equipment';
    rows.push({ status: a.status, sensor: `${a.assetId}-VIB`, assetName: a.name, domain, value: a.vibration.toFixed(2), unit: 'mm/s' });
    rows.push({ status: a.status, sensor: `${a.assetId}-TEMP`, assetName: a.name, domain, value: a.temperature.toFixed(1), unit: '°C' });
    rows.push({ status: a.status, sensor: `${a.assetId}-PWR`, assetName: a.name, domain, value: a.powerKw.toFixed(1), unit: 'kW' });
    rows.push({ status: a.status, sensor: `${a.assetId}-HEALTH`, assetName: a.name, domain, value: a.healthScore.toFixed(0), unit: '%' });
  });

  const lastUpdate = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';

  return (
    <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gauge size={16} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Sensors
          </h3>
        </div>
        <DataSourceBadge kind="SIMULATED" detail="Sensor values are the same simulated asset telemetry used throughout POLAR-TWIN — not real Bharati sensor feeds." />
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 260 }}>
        <table className="custom-table" style={{ fontSize: '0.7rem' }}>
          <thead>
            <tr>
              <th></th>
              <th>Sensor</th>
              <th>Asset</th>
              <th>Domain</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Quality</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <span className={`badge badge-${r.status === 'offline' ? 'offline' : r.status === 'critical' ? 'critical' : r.status === 'warning' ? 'warning' : 'normal'}`} style={{ padding: '1px 5px', fontSize: '0.6rem' }}>
                    ●
                  </span>
                </td>
                <td className="telemetry-val">{r.sensor}</td>
                <td>{r.assetName}</td>
                <td>{r.domain}</td>
                <td className="telemetry-val" style={{ fontWeight: 700 }}>{r.value}</td>
                <td>{r.unit}</td>
                <td style={{ color: 'var(--status-normal)' }}>GOOD</td>
                <td className="telemetry-val" style={{ color: 'var(--text-muted)' }}>{lastUpdate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
