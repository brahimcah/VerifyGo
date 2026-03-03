import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Incident } from '../types';
import { DEMO_INCIDENTS, INCIDENT_SEVERITY, SEVERITY_CONFIG } from '../lib/constants';

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

export default function Incidents() {
  const [liveIncidents, setLive] = useState<Incident[]>([]);

  useEffect(() => {
    const load = async () => setLive(await api.getIncidents());
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  // Merge real incidents first, then demo
  const all = [
    ...liveIncidents.map(i => ({ ...i, isLive: true  })),
    ...DEMO_INCIDENTS.map(i => ({ ...i, isLive: false })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const highCount = all.filter(i => (INCIDENT_SEVERITY[i.type] ?? 'info') === 'high').length;
  const qodCount  = all.filter(i => i.type === 'QOD_MANUAL').length;
  const simCount  = all.filter(i => i.type === 'SIM_SWAP').length;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-white font-bold text-xl">Incidents</div>
        <div className="text-gray-500 text-sm">Critical alerts and fleet events · TRK-001 incidents are live</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-2">Active alerts</div>
          <div className="text-2xl font-bold text-red-400">{highCount}</div>
          <div className="text-gray-600 text-xs mt-1">need attention</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-2">QoD activated</div>
          <div className="text-2xl font-bold text-blue-400">{qodCount + 2}</div>
          <div className="text-gray-600 text-xs mt-1">Nokia NaC sessions</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-2">SIM Swaps today</div>
          <div className="text-2xl font-bold text-amber-400">{simCount + 1}</div>
          <div className="text-gray-600 text-xs mt-1">journeys denied</div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-6 text-xs text-gray-500 px-4 py-3 border-b border-gray-800 uppercase tracking-wider">
          <span>Time</span>
          <span>Truck</span>
          <span className="col-span-2">Type</span>
          <span>Description</span>
          <span>Status</span>
        </div>

        {all.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-600 text-sm">
            No incidents yet — start TRK-001 journey and trigger simulation events.
          </div>
        )}

        {all.map(inc => {
          const sev = INCIDENT_SEVERITY[inc.type] ?? 'info';
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div key={inc.id} className="grid grid-cols-6 items-center px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <span className="text-gray-500 text-xs font-mono">{formatTime(inc.created_at)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-300 text-xs font-medium">{inc.truck_id}</span>
                {inc.isLive && <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 rounded">LIVE</span>}
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span>{cfg.icon}</span>
                <span className={`text-xs font-medium ${cfg.color}`}>{inc.type}</span>
              </div>
              <span className="text-gray-500 text-xs">{inc.description}</span>
              <div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                  inc.status === 'OPEN'
                    ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                    : 'text-gray-500 bg-gray-800 border-gray-700'
                }`}>
                  {inc.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
