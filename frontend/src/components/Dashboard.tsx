import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DeliveryStatus, Incident, Truck } from '../types';
import { DEMO_TRUCKS, DEMO_INCIDENTS, SEVERITY_CONFIG, INCIDENT_SEVERITY, STATUS_CONFIG } from '../lib/constants';
import FleetMap from './FleetMap';

// ── Helpers ───────────────────────────────────────────────────────────────────

function estimateProgress(distanceRemaining?: string): number {
  const km = parseFloat(distanceRemaining ?? '');
  if (isNaN(km)) return 50;
  return Math.max(0, Math.min(100, Math.round((1 - km / 621) * 100)));
}

function buildTruck1(status: DeliveryStatus, incidents: Incident[]): Truck {
  const hasSIMSwap  = incidents.some(i => i.type === 'SIM_SWAP'     && i.status === 'OPEN');
  const hasGPSSpoof = incidents.some(i => i.type === 'GPS_SPOOFING' && i.status === 'OPEN');
  const truckStatus =
    status.truckStatus === 'ALERT'     ? 'ALERT' as const :
    status.truckStatus === 'COMPLETED' ? 'ARRIVED' as const : 'ON_ROUTE' as const;
  return {
    id: 'TRK-001', driver: '+99999991000', isLive: true,
    status: truckStatus,
    progress: estimateProgress(status.distanceRemaining),
    fuel: 72, speed: truckStatus === 'ALERT' ? 0 : 89,
    lat: status.location.lat, lon: status.location.lng,
    origin: 'Madrid', destination: 'Barcelona',
    checks: {
      numberValid: status.isKycVerified,
      simSafe: !hasSIMSwap,
      driverLocation: !hasGPSSpoof,
      truckChip: true,
      onRoute: truckStatus !== 'ALERT',
      qodActive: status.isQodActive,
    },
  };
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-gray-500 text-xs mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color ?? 'text-white'}`}>{value}</div>
      {sub && <div className="text-gray-600 text-xs mt-1">{sub}</div>}
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [status, setStatus]     = useState<DeliveryStatus | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    const load = async () => {
      const [s, inc] = await Promise.all([api.getDeliveryStatus(), api.getIncidents()]);
      setStatus(s);
      setIncidents(inc);
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (!status) return <div className="flex h-full items-center justify-center text-gray-500">Loading…</div>;

  const truck1   = buildTruck1(status, incidents);
  const allTrucks = [truck1, ...DEMO_TRUCKS];
  const allIncidents = [...incidents, ...DEMO_INCIDENTS];

  const activeCount  = allTrucks.filter(t => ['ON_ROUTE', 'AUTHORIZED', 'ALERT'].includes(t.status)).length;
  const alertCount   = allTrucks.filter(t => t.status === 'ALERT').length;
  const arrivedCount = allTrucks.filter(t => t.status === 'ARRIVED').length;
  const qodCount     = allTrucks.filter(t => t.checks.qodActive).length;

  const recentActivity = [...allIncidents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white font-bold text-xl">Dashboard</div>
          <div className="text-gray-500 text-sm">Fleet overview — real-time Nokia NaC data</div>
        </div>
        {/* Start journey button */}
        <button
          onClick={async () => {
            await api.startDelivery({
              truckId: 'TRK-001', phoneNumber: '+99999991000',
              lat: 40.4168, lon: -3.7038, latDestino: 41.3851, lonDestino: 2.1734,
              route: [{ lat: 40.4168, lon: -3.7038 }, { lat: 40.7, lon: -1.5 }, { lat: 41.3851, lon: 2.1734 }],
              actorType: 'Human',
            });
          }}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 rounded-lg text-sm font-medium transition-all"
        >
          ▶ Start TRK-001 Journey
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Active trucks"    value={activeCount} sub={`of ${allTrucks.length} in fleet`} color="text-blue-400" />
        <StatCard label="Active alerts"    value={alertCount}  sub={alertCount > 0 ? 'needs attention' : 'all clear'} color="text-amber-400" />
        <StatCard label="Deliveries today" value={arrivedCount} sub="completed" color="text-emerald-400" />
        <StatCard label="QoD sessions"     value={qodCount}    sub="Nokia NaC active" color="text-purple-400" />
      </div>

      {/* Map */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-400 text-sm font-medium">📍 Fleet location</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-400/30" />
            TRK-001 live position
          </div>
        </div>
        <FleetMap trucks={allTrucks} height="320px" />
        <div className="flex gap-4 mt-3 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: v.markerColor }} />
              <span className="text-gray-500 text-xs">{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Telemetry strip (TRK-001 live) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 grid grid-cols-4 gap-4">
        <div>
          <div className="text-gray-500 text-xs mb-1">TRK-001 Status</div>
          <div className={`text-sm font-bold ${STATUS_CONFIG[truck1.status]?.color ?? 'text-white'}`}>
            {STATUS_CONFIG[truck1.status]?.label ?? truck1.status}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs mb-1">Network Latency</div>
          <div className="text-sm font-bold text-white">{status.latency} ms</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs mb-1">Signal</div>
          <div className="text-sm font-bold text-white">{status.signal} dBm</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs mb-1">QoD</div>
          <div className={`text-sm font-bold ${status.isQodActive ? 'text-blue-400' : 'text-gray-600'}`}>
            {status.isQodActive ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Simulate events */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-gray-400 text-sm font-medium mb-3">🔧 Simulate events on TRK-001</div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'gps_drift',       label: 'GPS Drift',       cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' },
            { id: 'sim_swap',        label: 'SIM Swap',         cls: 'border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20' },
            { id: 'route_deviation', label: 'Route Deviation',  cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' },
            { id: 'manual_qod',      label: 'Manual QoD',       cls: 'border-blue-500/40 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' },
          ].map(e => (
            <button
              key={e.id}
              onClick={() => api.triggerEvent(e.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${e.cls}`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-gray-400 text-sm font-medium mb-4">Recent activity</div>
        <div className="space-y-2">
          {recentActivity.length === 0 && (
            <div className="text-gray-600 text-sm text-center py-4">No incidents yet — start a journey to generate activity.</div>
          )}
          {recentActivity.map(inc => {
            const sev  = INCIDENT_SEVERITY[inc.type] ?? 'info';
            const cfg  = SEVERITY_CONFIG[sev];
            return (
              <div key={inc.id} className={`flex items-center gap-3 p-3 rounded-lg ${cfg.bg}`}>
                <span>{cfg.icon}</span>
                <div className="flex-1">
                  <span className={`text-xs font-medium ${cfg.color}`}>{inc.type}</span>
                  <span className="text-gray-500 text-xs ml-2">{inc.truck_id}</span>
                  <div className="text-gray-400 text-xs mt-0.5">{inc.description}</div>
                </div>
                <span className="text-gray-600 text-xs shrink-0">{formatTime(inc.created_at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
