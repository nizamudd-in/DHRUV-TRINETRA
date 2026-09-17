import React, { useState } from 'react';
import { InventoryItem } from '../../types';
import { Package, Ship, AlertTriangle, CheckCircle, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

interface SmartLogisticsProps {
  inventory: InventoryItem[];
}

export const SmartLogistics: React.FC<SmartLogisticsProps> = ({ inventory }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredItems = inventory.filter(i => activeCategory === 'all' || i.category === activeCategory);

  const stockoutRiskCount = inventory.filter(i => i.status === 'stockout_risk').length;
  const reorderCount = inventory.filter(i => i.status === 'reorder_required').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="glass-panel metric-card">
          <div className="metric-label"><Package size={15} color="var(--accent-cyan)" /> Total Tracked Inventory</div>
          <div className="metric-value">{inventory.length} <span className="metric-unit">SKUs</span></div>
          <div className="metric-sub">Heated Depot A, B & Cryo Storage</div>
        </div>

        <div className="glass-panel metric-card" style={{ borderLeft: '3px solid var(--status-critical)' }}>
          <div className="metric-label"><AlertTriangle size={15} color="var(--status-critical)" /> Stockout Risk Items</div>
          <div className="metric-value" style={{ color: 'var(--status-critical)' }}>
            {stockoutRiskCount} <span className="metric-unit">Critical Spares</span>
          </div>
          <div className="metric-sub">Days left &lt; Logistics Resupply Lead Time</div>
        </div>

        <div className="glass-panel metric-card" style={{ borderLeft: '3px solid var(--status-warning)' }}>
          <div className="metric-label"><Clock size={15} color="var(--status-warning)" /> Reorder Thresholds</div>
          <div className="metric-value" style={{ color: 'var(--status-warning)' }}>
            {reorderCount} <span className="metric-unit">Items</span>
          </div>
          <div className="metric-sub">Approval pending for Priority Resupply</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-label"><Ship size={15} color="var(--accent-ice)" /> Indian Expedition Vessel</div>
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>
            MV Vasiliy Golovnin
          </div>
          <div className="metric-sub">ETA Larsemann Hills: 45 Days</div>
        </div>
      </div>

      {/* Resupply Voyage Live Tracker Banner */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ship size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              44th Indian Scientific Expedition to Antarctica (ISEA) Resupply Voyage
            </h3>
          </div>
          <span className="badge badge-normal">VOYAGE ON SCHEDULE</span>
        </div>

        <div style={{
          background: 'rgba(7, 18, 33, 0.75)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--panel-border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vessel & Class</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>MV Vasiliy Golovnin (Arc 7 Icebreaker)</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Staging Port</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Cape Town Port, South Africa</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current Manifest Allocation</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>850T Fuel • 18 Spares TEUs • 65T Food</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sea-Ice Route Navigation</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-normal)' }}>Prydz Bay Polyna Channel Clear</div>
          </div>
        </div>
      </div>

      {/* Inventory Table with Category Filters */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={18} color="var(--accent-cyan)" /> Critical Spares & Provisions Inventory
          </h3>

          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'spare_parts', 'fuel', 'life_support', 'medical', 'rations'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: '0.72rem', textTransform: 'capitalize' }}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Daily Burn Rate</th>
              <th>Days Left</th>
              <th>Resupply Lead Time</th>
              <th>Status</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const isCrit = item.status === 'stockout_risk';
              const isWarn = item.status === 'reorder_required';

              return (
                <tr key={item.itemId} style={{ background: isCrit ? 'rgba(239, 68, 68, 0.05)' : isWarn ? 'rgba(245, 158, 11, 0.03)' : 'transparent' }}>
                  <td>
                    <strong style={{ color: '#fff' }}>{item.name}</strong>
                    <div className="telemetry-val" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.itemId} • {item.stationId}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{item.category.replace('_', ' ')}</td>
                  <td className="telemetry-val" style={{ fontWeight: 700 }}>
                    {item.quantity.toLocaleString()} {item.unit}
                  </td>
                  <td className="telemetry-val">
                    {item.dailyConsumption} {item.unit}/day
                  </td>
                  <td className="telemetry-val" style={{ color: isCrit ? 'var(--status-critical)' : isWarn ? 'var(--status-warning)' : 'var(--text-primary)', fontWeight: 700 }}>
                    {item.daysRemaining} days
                  </td>
                  <td className="telemetry-val">
                    {item.leadTimeDays} days
                  </td>
                  <td>
                    <span className={`badge badge-${isCrit ? 'critical' : isWarn ? 'warning' : 'normal'}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: item.criticality === 'critical' ? 'var(--status-critical)' : item.criticality === 'high' ? 'var(--status-warning)' : 'var(--status-normal)'
                    }}>
                      {item.criticality.toUpperCase()}
                    </span>
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
