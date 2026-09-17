import React, { useState } from 'react';
import { WorkOrder, Asset } from '../../types';
import { Wrench, CheckCircle2, Clock, Plus, User, AlertCircle, ArrowRight, CheckSquare, Square } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MaintenanceKanbanProps {
  workOrders: WorkOrder[];
  assets: Asset[];
  onCreateWorkOrder: (order: Partial<WorkOrder>) => void;
  onUpdateWorkOrderStatus: (orderId: string, status: WorkOrder['status']) => void;
  onToggleChecklist: (orderId: string, itemIndex: number) => void;
}

export const MaintenanceKanban: React.FC<MaintenanceKanbanProps> = ({
  workOrders,
  assets,
  onCreateWorkOrder,
  onUpdateWorkOrderStatus,
  onToggleChecklist
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('GEN-02');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<WorkOrder['priority']>('high');
  const [technician, setTechnician] = useState('Chief Mechanical Eng. S. Sen');
  const [estimatedHours, setEstimatedHours] = useState(4);

  const columns: { status: WorkOrder['status']; title: string; color: string }[] = [
    { status: 'detected', title: '1. Detected Anomaly', color: 'var(--status-critical)' },
    { status: 'approved', title: '2. Operator Approved', color: 'var(--status-warning)' },
    { status: 'in_progress', title: '3. In Progress', color: 'var(--accent-cyan)' },
    { status: 'completed', title: '4. Completed & Logged', color: 'var(--status-normal)' },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateWorkOrder({
      assetId: selectedAssetId,
      title: title || `Inspection of ${selectedAssetId}`,
      priority,
      assignedTechnician: technician,
      estimatedHours
    });
    setShowModal(false);
    setTitle('');
  };

  const advanceStatus = (order: WorkOrder) => {
    const sequence: WorkOrder['status'][] = ['detected', 'approved', 'in_progress', 'completed'];
    const currentIndex = sequence.indexOf(order.status);
    if (currentIndex < sequence.length - 1) {
      const nextStatus = sequence[currentIndex + 1];
      onUpdateWorkOrderStatus(order.orderId, nextStatus);
      if (nextStatus === 'completed') {
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch (_) {}
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div className="glass-panel" style={{ padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={22} color="var(--accent-cyan)" />
            Antarctic Station Maintenance Management & Work Orders
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Digital Twin Closed-Loop: Anomaly Detected ➔ Approved ➔ In Progress ➔ Completed & Updated
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} /> New Work Order
        </button>
      </div>

      {/* 4-Column Kanban Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        alignItems: 'start'
      }}>
        {columns.map(col => {
          const ordersInCol = workOrders.filter(w => w.status === col.status);

          return (
            <div
              key={col.status}
              className="glass-panel"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: '480px',
                background: 'rgba(9, 20, 36, 0.75)'
              }}
            >
              {/* Column Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 8,
                borderBottom: `2px solid ${col.color}`
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  {col.title}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {ordersInCol.length}
                </span>
              </div>

              {/* Cards inside column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ordersInCol.map(order => (
                  <div
                    key={order.orderId}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(15, 33, 58, 0.85)',
                      border: '1px solid var(--panel-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="telemetry-val" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {order.orderId} • {order.stationId}
                      </span>
                      <span className={`badge badge-${order.priority === 'emergency' || order.priority === 'high' ? 'critical' : 'normal'}`} style={{ fontSize: '0.65rem' }}>
                        {order.priority.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                      {order.title}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                      Asset: <strong>{order.assetId}</strong>
                    </div>

                    {/* Checklists preview */}
                    {order.checklist && order.checklist.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Safety Checklist:
                        </div>
                        {order.checklist.map((item, idx) => (
                          <div
                            key={idx}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', cursor: 'pointer' }}
                            onClick={() => onToggleChecklist(order.orderId, idx)}
                          >
                            {item.done ? (
                              <CheckSquare size={13} color="var(--status-normal)" />
                            ) : (
                              <Square size={13} color="var(--text-muted)" />
                            )}
                            <span style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                              {item.item}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Spares Required */}
                    {order.requiredSpares && order.requiredSpares.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--status-warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 6px', borderRadius: '4px' }}>
                        Spares: {order.requiredSpares.join(', ')}
                      </div>
                    )}

                    {/* Technician & Hours */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} /> {order.assignedTechnician}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {order.estimatedHours}h
                      </span>
                    </div>

                    {/* Advance Action */}
                    {col.status !== 'completed' && (
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px', fontSize: '0.72rem', marginTop: 4 }}
                        onClick={() => advanceStatus(order)}
                      >
                        Advance to {col.status === 'detected' ? 'Approved' : col.status === 'approved' ? 'In Progress' : 'Completed'} <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Work Order Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="glass-panel-elevated" style={{ width: '480px', maxWidth: '90vw', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              Create Station Maintenance Work Order
            </h3>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Target Asset</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="input-control"
                  style={{ width: '100%' }}
                >
                  {assets.map(a => (
                    <option key={a.assetId} value={a.assetId}>{a.name} ({a.assetId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Work Order Title</label>
                <input
                  type="text"
                  placeholder="e.g. Inspect bearing vibration and lubrication"
                  className="input-control"
                  style={{ width: '100%' }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="input-control"
                    style={{ width: '100%' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Est. Duration (Hrs)</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="input-control"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Assigned Station Technician</label>
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  className="input-control"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Authorize & Issue Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
