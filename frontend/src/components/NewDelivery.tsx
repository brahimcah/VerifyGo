import React, { useState } from 'react';
import { ArrowLeft, User, Bot, MapPin, Navigation, Satellite, ShieldCheck, AlertTriangle, Rocket, Wifi, Smartphone, Route, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

// Preset routes for the demo (Madrid → Barcelona)
const PRESETS = {
  'Madrid → Barcelona': {
    origin: 'Warehouse Madrid A1',
    destination: 'Hub Barcelona',
    lat: 40.4168, lon: -3.7038,
    latDestino: 41.3851, lonDestino: 2.1734,
    route: [
      { lat: 40.4168, lon: -3.7038 },
      { lat: 40.7, lon: -1.5 },
      { lat: 41.3851, lon: 2.1734 },
    ],
  },
};

type ToastState = { message: string; ok: boolean } | null;

export default function NewDelivery({ onBack, onDispatch }: { onBack: () => void; onDispatch: () => void }) {
  const [actorType, setActorType] = useState<'Human' | 'Drone'>('Human');
  const [truckId] = useState('TRK-001');
  const [phoneNumber] = useState('+99999991000');
  const [dispatching, setDispatching] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const preset = PRESETS['Madrid → Barcelona'];

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      const result = await api.startDelivery({
        truckId,
        phoneNumber,
        lat: preset.lat,
        lon: preset.lon,
        latDestino: preset.latDestino,
        lonDestino: preset.lonDestino,
        route: preset.route,
        actorType,
      });
      if (result?.success) {
        showToast('Journey authorized — monitoring started');
        setTimeout(onDispatch, 800);
      } else {
        showToast(result?.journey?.reason ?? 'Journey denied by AI', false);
      }
    } catch {
      showToast('Could not reach backend', false);
    } finally {
      setDispatching(false);
    }
  };

  const handleSimulateEvent = async (eventId: string, label: string) => {
    const result = await api.triggerEvent(eventId);
    showToast(result?.success ? `${label} simulated` : 'Event failed', result?.success ?? false);
  };

  const simEvents = [
    { id: 'gps_drift',       label: 'GPS Drift',       icon: <Satellite size={18} />, color: '#ffb020' },
    { id: 'sim_swap',        label: 'SIM Swap',         icon: <Smartphone size={18} />, color: '#ef4444' },
    { id: 'route_deviation', label: 'Route Deviation',  icon: <Route size={18} />,      color: '#ffb020' },
    { id: 'manual_qod',      label: 'Manual QoD',       icon: <Wifi size={18} />,       color: '#00a8ff' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0b1319] text-white overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-[#0b1319]/90 backdrop-blur-md z-20 flex items-center justify-between p-4 border-b border-[#23303b]">
        <button onClick={onBack} className="text-white"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold">New Delivery</h1>
        <div className="w-8" />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-5 mt-4 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border ${
          toast.ok
            ? 'bg-[#00d084]/10 border-[#00d084]/30 text-[#00d084]'
            : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
        }`}>
          <CheckCircle size={16} className="shrink-0" />
          {toast.message}
        </div>
      )}

      <div className="p-5 flex flex-col gap-6">

        {/* Actor Toggle */}
        <div className="flex bg-[#162028] p-1 rounded-xl border border-[#23303b]">
          <button
            onClick={() => setActorType('Human')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${actorType === 'Human' ? 'bg-[#23303b] text-white shadow-sm' : 'text-[#8b9eb0] hover:text-white'}`}
          >
            <User size={16} /> Human Courier
          </button>
          <button
            onClick={() => setActorType('Drone')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${actorType === 'Drone' ? 'bg-[#23303b] text-white shadow-sm' : 'text-[#8b9eb0] hover:text-white'}`}
          >
            <Bot size={16} /> Autonomous Drone
          </button>
        </div>

        {/* Route Info */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-[#8b9eb0] tracking-wider flex items-center gap-2">
            <Navigation size={14} className="text-[#00a8ff]" /> ROUTE
          </h3>
          <div className="bg-[#162028] border border-[#23303b] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full border-2 border-[#00a8ff] shrink-0"></div>
              <div>
                <div className="text-sm font-semibold">{preset.origin}</div>
                <div className="text-[10px] text-[#8b9eb0] font-mono">{preset.lat}, {preset.lon}</div>
              </div>
            </div>
            <div className="ml-[5px] w-0.5 h-4 bg-[#23303b]"></div>
            <div className="flex items-center gap-3">
              <MapPin size={14} className="text-[#ef4444] shrink-0" />
              <div>
                <div className="text-sm font-semibold">{preset.destination}</div>
                <div className="text-[10px] text-[#8b9eb0] font-mono">{preset.latDestino}, {preset.lonDestino}</div>
              </div>
            </div>
          </div>

          {/* Truck / Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#162028] border border-[#23303b] rounded-xl px-3 py-2">
              <div className="text-[10px] text-[#8b9eb0] mb-1">Truck ID</div>
              <div className="text-sm font-bold font-mono">{truckId}</div>
            </div>
            <div className="bg-[#162028] border border-[#23303b] rounded-xl px-3 py-2">
              <div className="text-[10px] text-[#8b9eb0] mb-1">Phone</div>
              <div className="text-sm font-bold font-mono">{phoneNumber}</div>
            </div>
          </div>
        </div>

        {/* Simulation Events */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-[#8b9eb0] tracking-wider flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#ffb020]" /> SIMULATE EVENTS
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {simEvents.map(ev => (
              <button
                key={ev.id}
                onClick={() => handleSimulateEvent(ev.id, ev.label)}
                className="bg-[#162028] border border-[#23303b] border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-[#1c2731] active:scale-95 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#23303b] flex items-center justify-center" style={{ color: ev.color }}>
                  {ev.icon}
                </div>
                <span className="text-xs font-medium text-center">{ev.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Consent & Auth */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-[#8b9eb0] tracking-wider flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#00a8ff]" /> CONSENT & AUTH STATUS
          </h3>
          {[
            { icon: <MapPin size={14} />, label: 'Location Access', sub: 'Precise location granted' },
            { icon: <User size={14} />, label: 'Identity Verified', sub: 'KYC via Nokia NaC' },
            { icon: <Wifi size={14} />, label: 'Network Telemetry', sub: 'Nokia NaC MCP active' },
          ].map(item => (
            <div key={item.label} className="bg-[#162028] border border-[#23303b] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00d084]/10 flex items-center justify-center text-[#00d084]">
                  {item.icon}
                </div>
                <div>
                  <div className="text-sm font-bold">{item.label}</div>
                  <div className="text-xs text-[#8b9eb0]">{item.sub}</div>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-[#00d084] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>
          ))}
        </div>

        {/* Dispatch */}
        <button
          onClick={handleDispatch}
          disabled={dispatching}
          className="mt-4 w-full bg-gradient-to-r from-[#00a8ff] to-[#0080ff] hover:from-[#0090db] hover:to-[#0070e0] disabled:opacity-60 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,168,255,0.3)] transition-all active:scale-95"
        >
          <Rocket size={20} /> {dispatching ? 'Authorizing…' : 'Dispatch Simulation'}
        </button>
      </div>
    </div>
  );
}
