import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DeliveryStatus, Incident, Delivery, TruckChecks } from '../types';
import { DEMO_DELIVERIES, STATUS_CONFIG } from '../lib/constants';

function buildTrk1Delivery(status: DeliveryStatus, incidents: Incident[]): Delivery {
  const hasSIMSwap = incidents.some(i => i.type === 'SIM_SWAP' && i.status === 'OPEN');
  const truckStatus =
    status.truckStatus === 'ALERT'     ? 'ALERT' as const :
    status.truckStatus === 'COMPLETED' ? 'ARRIVED' as const : 'ON_ROUTE' as const;
  return {
    id: 'DEL-001', truck: 'TRK-001', driver: '+99999991000',
    origin: 'Madrid', destination: 'Barcelona', distance: 621,
    duration: status.truckStatus === 'COMPLETED' ? status.eta ?? '—' : 'In progress',
    departed: '10:30', arrived: status.truckStatus === 'COMPLETED' ? status.eta ?? null : null,
    status: truckStatus,
    checks: {
      numberValid: status.isKycVerified,
      simSafe: !hasSIMSwap,
      driverLocation: status.isKycVerified,
      truckChip: true,
    },
  };
}

const DELIVERY_CHECK_FIELDS: { label: string; key: keyof Pick<TruckChecks, 'numberValid' | 'simSafe' | 'driverLocation' | 'truckChip'> }[] = [
  { label: 'Number valid',    key: 'numberValid' },
  { label: 'SIM safe',        key: 'simSafe' },
  { label: 'Driver location', key: 'driverLocation' },
  { label: 'Truck chip',      key: 'truckChip' },
];

export default function Deliveries() {
  const [status, setStatus]       = useState<DeliveryStatus | null>(null);
  const [incidents, setIncidents]  = useState<Incident[]>([]);
  const [selected, setSelected]    = useState<Delivery | null>(null);

  useEffect(() => {
    const load = async () => {
      const [s, inc] = await Promise.all([api.getDeliveryStatus(), api.getIncidents()]);
      setStatus(s); setIncidents(inc);
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const deliveries: (Delivery & { isLive?: boolean })[] = status
    ? [{ ...buildTrk1Delivery(status, incidents), isLive: true }, ...DEMO_DELIVERIES]
    : DEMO_DELIVERIES;

  const total     = deliveries.length;
  const completed = deliveries.filter(d => d.status === 'ARRIVED').length;
  const active    = deliveries.filter(d => ['ON_ROUTE', 'AUTHORIZED', 'ALERT'].includes(d.status)).length;
  const denied    = deliveries.filter(d => d.status === 'DENIED').length;

  const handleSelect = (d: Delivery) => setSelected(selected?.id === d.id ? null : d);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-white font-bold text-xl">Delivery History</div>
        <div className="text-gray-500 text-sm">All journeys and their status · DEL-001 is live</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total today',  value: total,     color: 'text-white' },
          { label: 'Completed',    value: completed,  color: 'text-emerald-400' },
          { label: 'In progress',  value: active,     color: 'text-blue-400' },
          { label: 'Denied',       value: denied,     color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-500 text-xs mb-2">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 text-xs text-gray-500 px-4 py-3 border-b border-gray-800 uppercase tracking-wider">
          <span>ID</span><span>Truck</span><span>Origin</span><span>Destination</span><span>Distance</span><span>Dep. / Arr.</span><span>Status</span>
        </div>

        {deliveries.map(d => {
          const s = STATUS_CONFIG[d.status];
          return (
            <div
              key={d.id}
              onClick={() => handleSelect(d)}
              className="grid grid-cols-7 items-center px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 text-xs font-mono">{d.id}</span>
                {(d as any).isLive && <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 rounded">LIVE</span>}
              </div>
              <span className="text-gray-300 text-xs font-medium">{d.truck}</span>
              <span className="text-gray-400 text-xs">{d.origin}</span>
              <span className="text-gray-400 text-xs">{d.destination}</span>
              <span className="text-gray-400 text-xs">{d.distance} km</span>
              <span className="text-gray-500 text-xs font-mono">
                {d.departed}{d.arrived ? ` → ${d.arrived}` : d.status !== 'DENIED' ? ' → …' : ''}
              </span>
              <div className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.color} border ${s.border}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white font-bold">{selected.id} — {selected.truck}</div>
              <div className="text-gray-500 text-sm">{selected.origin} → {selected.destination} · {selected.distance} km · {selected.duration}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-400 text-lg">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[['Driver', selected.driver], ['Departed', selected.departed], ['Arrived', selected.arrived ?? '—'], ['Duration', selected.duration]].map(([k, v]) => (
              <div key={k} className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-500 text-xs">{k}</div>
                <div className="text-white text-sm font-medium mt-1">{v}</div>
              </div>
            ))}
          </div>
          <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Nokia NaC Checks — Flow 1</div>
          <div className="space-y-2">
            {DELIVERY_CHECK_FIELDS.map(({ label, key }) => {
              const val = selected.checks[key];
              return (
                <div key={key} className="flex items-center justify-between bg-gray-800/40 rounded-lg px-3 py-2.5">
                  <span className="text-gray-300 text-sm">{label}</span>
                  <span className={`text-sm font-bold ${val === true ? 'text-green-400' : val === false ? 'text-red-400' : 'text-gray-600'}`}>
                    {val === true ? '✓' : val === false ? '✗' : '–'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
