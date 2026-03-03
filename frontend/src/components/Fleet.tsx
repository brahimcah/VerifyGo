import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DeliveryStatus, Incident, Truck, TruckChecks } from '../types';
import { DEMO_TRUCKS, STATUS_CONFIG } from '../lib/constants';
import FleetMap from './FleetMap';

// ── Re-use the same builder from Dashboard ────────────────────────────────────

function buildTruck1(status: DeliveryStatus, incidents: Incident[]): Truck {
  const hasSIMSwap  = incidents.some(i => i.type === 'SIM_SWAP'     && i.status === 'OPEN');
  const hasGPSSpoof = incidents.some(i => i.type === 'GPS_SPOOFING' && i.status === 'OPEN');
  const truckStatus =
    status.truckStatus === 'ALERT'     ? 'ALERT' as const :
    status.truckStatus === 'COMPLETED' ? 'ARRIVED' as const : 'ON_ROUTE' as const;
  return {
    id: 'TRK-001', driver: '+99999991000', isLive: true,
    status: truckStatus,
    progress: Math.max(0, Math.min(100, Math.round((1 - parseFloat(status.distanceRemaining ?? '621') / 621) * 100))),
    fuel: 72, speed: truckStatus === 'ALERT' ? 0 : 89,
    lat: status.location.lat, lon: status.location.lng,
    origin: 'Madrid', destination: 'Barcelona',
    checks: {
      numberValid: status.isKycVerified, simSafe: !hasSIMSwap,
      driverLocation: !hasGPSSpoof, truckChip: true,
      onRoute: truckStatus !== 'ALERT', qodActive: status.isQodActive,
    },
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const CHECK_FIELDS: { label: string; key: keyof TruckChecks }[] = [
  { label: 'Number valid',    key: 'numberValid' },
  { label: 'SIM safe',        key: 'simSafe' },
  { label: 'Driver location', key: 'driverLocation' },
  { label: 'Truck chip',      key: 'truckChip' },
  { label: 'On route',        key: 'onRoute' },
  { label: 'QoD active',      key: 'qodActive' },
];

function CheckList({ checks }: { checks: TruckChecks }) {
  return (
    <div className="space-y-2">
      {CHECK_FIELDS.map(({ label, key }) => {
        const val = checks[key];
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
  );
}

function TruckCard({ truck, selected, onClick }: { truck: Truck; selected: Truck | null; onClick: (t: Truck) => void; }) {
  const s = STATUS_CONFIG[truck.status];
  return (
    <div
      onClick={() => onClick(truck)}
      className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-blue-500/50 ${
        selected?.id === truck.id ? 'border-blue-500/70 ring-1 ring-blue-500/30' : 'border-gray-800'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-white font-semibold text-sm flex items-center gap-1.5">
            {truck.id}
            {truck.isLive && <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-medium">LIVE</span>}
          </div>
          <div className="text-gray-500 text-xs mt-0.5">{truck.driver}</div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.color} border ${s.border}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${s.dot} ${truck.status === 'ALERT' ? 'animate-pulse' : ''}`} />
          {s.label}
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">{truck.origin} → {truck.destination}</span>
            <span className="text-gray-400">{truck.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                truck.status === 'ALERT' ? 'bg-amber-400' : truck.status === 'ARRIVED' ? 'bg-emerald-400' : 'bg-blue-500'
              }`}
              style={{ width: `${truck.progress}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>⛽ {truck.fuel}%</span>
          <span>🚀 {truck.speed} km/h</span>
        </div>
      </div>
    </div>
  );
}

function TruckDetail({ truck, onClose }: { truck: Truck; onClose: () => void }) {
  const s = STATUS_CONFIG[truck.status];
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🚛</div>
          <div>
            <div className="text-white font-bold flex items-center gap-2">
              {truck.id}
              {truck.isLive && <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">LIVE — Nokia NaC</span>}
            </div>
            <div className="text-gray-500 text-sm">{truck.driver}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${s.bg} ${s.color} border ${s.border}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 ml-2 text-lg">✕</button>
        </div>
      </div>

      <FleetMap trucks={[truck]} selectedTruck={truck} height="200px" />

      <div className="grid grid-cols-3 gap-3">
        {[['Progress', truck.progress + '%'], ['Fuel', truck.fuel + '%'], ['Speed', truck.speed + ' km/h']].map(([k, v]) => (
          <div key={k} className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-gray-500 text-xs">{k}</div>
            <div className="text-white font-semibold mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
          Nokia NaC Checks {truck.isLive ? '— Live Data' : ''}
        </div>
        <CheckList checks={truck.checks} />
      </div>
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

export default function Fleet() {
  const [status, setStatus]     = useState<DeliveryStatus | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected]  = useState<Truck | null>(null);

  useEffect(() => {
    const load = async () => {
      const [s, inc] = await Promise.all([api.getDeliveryStatus(), api.getIncidents()]);
      setStatus(s); setIncidents(inc);
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const trucks: Truck[] = status
    ? [buildTruck1(status, incidents), ...DEMO_TRUCKS]
    : DEMO_TRUCKS;

  const handleSelect = (t: Truck) => setSelected(selected?.id === t.id ? null : t);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-white font-bold text-xl">Fleet</div>
        <div className="text-gray-500 text-sm">Individual truck management · TRK-001 is live Nokia NaC data</div>
      </div>

      <div className={`grid gap-4 ${selected ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <div className={selected ? 'col-span-1 space-y-3' : 'col-span-3 grid grid-cols-3 gap-4'}>
          {trucks.map(t => (
            <React.Fragment key={t.id}>
              <TruckCard truck={t} selected={selected} onClick={handleSelect} />
            </React.Fragment>
          ))}
        </div>
        {selected && (
          <div className="col-span-1">
            <TruckDetail truck={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
