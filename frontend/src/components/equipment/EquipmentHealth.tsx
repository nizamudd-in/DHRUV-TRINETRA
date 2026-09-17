import React, { useState } from 'react';
import { Asset } from '../../types';
import { Cpu, Search, Filter, Wrench, ShieldAlert, ArrowUpDown, ChevronRight } from 'lucide-react';

interface EquipmentHealthProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onCreateWorkOrder: (asset: Asset) => void;
}

export const EquipmentHealth: React.FC<EquipmentHealthProps> = ({
  assets,
  onSelectAsset,
  onCreateWorkOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.building.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchesRisk = filterRisk === 'all' || a.failureRisk === filterRisk;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top Filter & Search Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: '260px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search equipment by name, ID, or building..."
            className="input-control"
            style={{ width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-control"
            >
              <option value="all">All Statuses</option>
              <option value="normal">Normal</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Failure Risk:</span>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="input-control"
            >
              <option value="all">All Risks</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Antarctic Equipment Registry & Predictive Health Diagnostics ({filteredAssets.length})
            </h3>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            AI RUL Remaining Useful Life Continuous Estimation
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Asset Identifier</th>
              <th>Location & Subsystem</th>
              <th>Status</th>
              <th>Health Score</th>
              <th>Vibration</th>
              <th>Bearing Temp</th>
              <th>Runtime</th>
              <th>Est. RUL</th>
              <th>Failure Risk</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map(asset => {
              const isCrit = asset.status === 'critical' || asset.healthScore < 70;
              const isWarn = asset.status === 'warning';

              return (
                <tr
                  key={asset.assetId}
                  style={{
                    background: isCrit ? 'rgba(239, 68, 68, 0.05)' : isWarn ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                    cursor: 'pointer'
                  }}
                  onClick={() => onSelectAsset(asset)}
                >
                  <td>
                    <strong style={{ color: '#fff' }}>{asset.name}</strong>
                    <div className="telemetry-val" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {asset.assetId}
                    </div>
                  </td>
                  <td>
                    <div>{asset.building}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {asset.type.replace('_', ' ')}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${isCrit ? 'critical' : isWarn ? 'warning' : 'normal'}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                        <div style={{
                          width: `${asset.healthScore}%`,
                          height: '100%',
                          background: asset.healthScore > 85 ? 'var(--status-normal)' : asset.healthScore > 70 ? 'var(--status-warning)' : 'var(--status-critical)'
                        }} />
                      </div>
                      <span className="telemetry-val" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                        {asset.healthScore}%
                      </span>
                    </div>
                  </td>
                  <td className="telemetry-val" style={{ color: asset.vibration > 3.0 ? 'var(--status-critical)' : 'inherit', fontWeight: asset.vibration > 3.0 ? 700 : 400 }}>
                    {asset.vibration} mm/s
                  </td>
                  <td className="telemetry-val" style={{ color: asset.temperature > 75 ? 'var(--status-critical)' : 'inherit', fontWeight: asset.temperature > 75 ? 700 : 400 }}>
                    {asset.temperature}°C
                  </td>
                  <td className="telemetry-val">
                    {asset.runtimeHours.toLocaleString()} h
                  </td>
                  <td className="telemetry-val" style={{ color: (asset.predictedFailureDays || 999) < 30 ? 'var(--status-critical)' : 'var(--accent-ice)' }}>
                    {asset.predictedFailureDays} days
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: asset.failureRisk === 'High' ? 'var(--status-critical)' : asset.failureRisk === 'Medium' ? 'var(--status-warning)' : 'var(--status-normal)'
                    }}>
                      {asset.failureRisk}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-cyan"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsset(asset);
                        }}
                      >
                        Inspect
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateWorkOrder(asset);
                        }}
                        title="Create Maintenance Work Order"
                      >
                        <Wrench size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
