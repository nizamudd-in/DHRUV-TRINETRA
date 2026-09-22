import React, { useState } from 'react';

export interface TrendSeries {
  label: string;
  color: string;
  points: number[]; // same length as timeLabels
  unit?: string;
}

export interface TrendThreshold {
  label: string;
  value: number;
  color: string;
}

interface TrendChartProps {
  timeLabels: string[];
  series: TrendSeries[];
  thresholds?: TrendThreshold[];
  height?: number;
  yUnit?: string;
}

const W = 600;

// A genuinely data-driven SVG trend chart — real points, real thresholds, hover
// tooltips, a legend. No external charting library (none is in this project's
// dependency tree), styled to match the app's existing hand-rolled SVG panels.
export const TrendChart: React.FC<TrendChartProps> = ({ timeLabels, series, thresholds = [], height = 160 }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!timeLabels.length || !series.length || series.every(s => s.points.length === 0)) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        No telemetry points to chart.
      </div>
    );
  }

  const allValues = series.flatMap(s => s.points).concat(thresholds.map(t => t.value));
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const pad = (rawMax - rawMin) * 0.12 || Math.max(1, Math.abs(rawMax) * 0.1);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;
  const n = timeLabels.length;

  const xFor = (i: number) => 44 + (i / Math.max(1, n - 1)) * (W - 60);
  const yFor = (v: number) => 14 + (1 - (v - yMin) / (yMax - yMin || 1)) * (height - 34);

  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => yMin + (i / gridLines) * (yMax - yMin));

  const xLabelStep = Math.max(1, Math.round(n / 6));

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height, background: 'rgba(7, 18, 33, 0.8)', borderRadius: 'var(--radius-md)' }}>
        {/* Y gridlines + labels */}
        {gridYs.map((v, i) => (
          <g key={i}>
            <line x1={44} y1={yFor(v)} x2={W - 12} y2={yFor(v)} stroke="rgba(56, 189, 248, 0.12)" strokeDasharray="3,3" />
            <text x={4} y={yFor(v) + 3} fill="#64748b" fontSize="8" fontFamily="monospace">{v.toFixed(1)}</text>
          </g>
        ))}

        {/* Threshold lines (drawn from real health-model/config thresholds, never invented) */}
        {thresholds.map((t, i) => (
          <g key={`th-${i}`}>
            <line x1={44} y1={yFor(t.value)} x2={W - 12} y2={yFor(t.value)} stroke={t.color} strokeWidth="1.3" strokeDasharray="5,3" opacity={0.75} />
            <text x={W - 10} y={yFor(t.value) - 3} fill={t.color} fontSize="8" fontFamily="monospace" textAnchor="end">{t.label}</text>
          </g>
        ))}

        {/* Series lines */}
        {series.map((s, si) => (
          <polyline
            key={si}
            fill="none"
            stroke={s.color}
            strokeWidth="2.2"
            points={s.points.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ')}
          />
        ))}

        {/* Hover guideline + points */}
        {hoverIdx !== null && (
          <>
            <line x1={xFor(hoverIdx)} y1={10} x2={xFor(hoverIdx)} y2={height - 20} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            {series.map((s, si) => (
              <circle key={si} cx={xFor(hoverIdx)} cy={yFor(s.points[hoverIdx])} r={3.5} fill={s.color} stroke="#060e1a" strokeWidth="1" />
            ))}
          </>
        )}

        {/* Hover hit targets */}
        {timeLabels.map((_, i) => (
          <rect
            key={i}
            x={xFor(i) - (W / n) / 2}
            y={0}
            width={W / n}
            height={height - 18}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
          />
        ))}

        {/* X labels */}
        {timeLabels.map((t, i) => (
          i % xLabelStep === 0 ? (
            <text key={i} x={xFor(i)} y={height - 4} fill="#64748b" fontSize="7.5" fontFamily="monospace" textAnchor="middle">{t}</text>
          ) : null
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && (
        <div style={{
          position: 'absolute',
          left: `${(xFor(hoverIdx) / W) * 100}%`,
          top: 6,
          transform: 'translateX(-50%)',
          background: 'rgba(11, 23, 40, 0.96)',
          border: '1px solid var(--panel-border-bright)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontSize: '0.68rem',
          color: '#fff',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 2,
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{timeLabels[hoverIdx]}</div>
          {series.map((s, si) => (
            <div key={si} style={{ color: s.color }}>
              {s.label}: <strong>{s.points[hoverIdx]}{s.unit || ''}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 6 }}>
        {series.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 3, background: s.color, display: 'inline-block', borderRadius: 2 }} />
            <span>{s.label}</span>
          </div>
        ))}
        {thresholds.map((t, i) => (
          <div key={`tl-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 0, borderTop: `2px dashed ${t.color}`, display: 'inline-block' }} />
            <span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
