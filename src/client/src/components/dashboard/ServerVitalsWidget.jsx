import React from 'react';
import { Cpu, Activity, HardDrive, Server } from 'lucide-react';

export default function ServerVitalsWidget({ vitals }) {
  const cpu = vitals?.cpuUsagePercent != null ? Math.round(vitals.cpuUsagePercent) : null;
  const mem = vitals?.memoryUsagePercent != null ? Math.round(vitals.memoryUsagePercent) : null;
  const disk = vitals?.diskUsagePercent != null ? Math.round(vitals.diskUsagePercent) : null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Server size={16} style={{ color: 'var(--brand-blue)' }} />
          <span>Hostinger VPS Vitals</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Realtime Telemetry
        </span>
      </div>

      <div className="vitals-box">
        {/* CPU */}
        <div className="vital-metric">
          <div className="vital-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} style={{ color: 'var(--brand-blue)' }} /> CPU Utilization
            </span>
            <strong>{cpu != null ? `${cpu}%` : '--'}</strong>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${cpu || 0}%`,
                backgroundColor: (cpu || 0) > 85 ? 'var(--status-rose)' : (cpu || 0) > 65 ? 'var(--status-amber)' : 'var(--brand-blue)',
              }}
            />
          </div>
        </div>

        {/* MEMORY */}
        <div className="vital-metric">
          <div className="vital-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} style={{ color: 'var(--status-indigo)' }} /> Memory Usage
            </span>
            <strong>{mem != null ? `${mem}%` : '--'}</strong>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${mem || 0}%`,
                backgroundColor: (mem || 0) > 85 ? 'var(--status-rose)' : (mem || 0) > 65 ? 'var(--status-amber)' : 'var(--status-indigo)',
              }}
            />
          </div>
        </div>

        {/* DISK */}
        <div className="vital-metric">
          <div className="vital-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={14} style={{ color: 'var(--status-emerald)' }} /> Disk Storage
            </span>
            <strong>{disk != null ? `${disk}%` : '--'}</strong>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${disk || 0}%`,
                backgroundColor: (disk || 0) > 85 ? 'var(--status-rose)' : (disk || 0) > 65 ? 'var(--status-amber)' : 'var(--status-emerald)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
