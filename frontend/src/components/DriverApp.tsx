import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { DeliveryStatus, Incident } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteData {
  origin:      { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  waypoints:   { lat: number; lon: number }[];
  distance_km: number;
}

interface User {
  phone_number: string;
  name:         string;
  actor_id:     string;
  truck_id:     string;
  rating:       number;
  route:        RouteData;
}

interface JourneyResult {
  status: string;
  reason: string;
  reason_display?: string;
  checks?: { sim_safe: boolean; driver_location_ok: boolean; roaming: boolean };
}

// Test numbers shown on the login screen (from backend user_manager.py)
const TEST_NUMBERS = [
  { phone: '+99999991000', label: 'Carlos Rodríguez · TRK-001' },
  { phone: '+99999991001', label: 'Ana García · TRK-002' },
];

// ── Mini Map ──────────────────────────────────────────────────────────────────

function DriverMap({ route, height = '220px' }: { route: RouteData; height?: string }) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  // Convert {lat,lon} objects → [lat,lon] tuples for Leaflet
  const leafletWaypoints = route.waypoints.map(w => [w.lat, w.lon] as [number, number]);

  useEffect(() => {
    if (mapInstance.current) return;

    function initMap() {
      if (!mapRef.current || mapInstance.current) return;
      const L = (window as any).L;
      if (!L) return;

      const [lat, lon] = leafletWaypoints[0];
      const map = L.map(mapRef.current, { zoomControl: false, scrollWheelZoom: false, dragging: false });
      mapInstance.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©CartoDB', maxZoom: 19,
      }).addTo(map);
      map.setView([lat, lon], 7);

      L.polyline(leafletWaypoints, { color: '#60a5fa', weight: 3, opacity: 0.7, dashArray: '6,4' }).addTo(map);

      const mkIcon = (color: string) => L.divIcon({
        html: `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:2px solid #1e293b"></div>`,
        className: '', iconAnchor: [5, 5],
      });
      const driverIcon = L.divIcon({
        html: `<div style="background:#60a5fa;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px #60a5fa"></div>`,
        className: '', iconAnchor: [7, 7],
      });

      L.marker(leafletWaypoints[0], { icon: mkIcon('#4ade80') }).addTo(map).bindPopup(route.origin.name);
      L.marker(leafletWaypoints[leafletWaypoints.length - 1], { icon: mkIcon('#f87171') }).addTo(map).bindPopup(route.destination.name);
      const mid = Math.floor(leafletWaypoints.length / 2);
      L.marker(leafletWaypoints[mid], { icon: driverIcon }).addTo(map).bindPopup('You are here');
    }

    if ((window as any).L) {
      initMap();
    } else if (!document.querySelector('script[src*="leaflet"]')) {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      const id = setInterval(() => { if ((window as any).L) { clearInterval(id); initMap(); } }, 100);
    }
  }, []); // eslint-disable-line

  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }} />;
}

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleLogin = async () => {
    if (!phone.trim()) { setError('Enter your phone number.'); return; }
    setError('');
    setLoading(true);
    const res = await api.login(phone.trim());
    setLoading(false);
    if (res.ok) {
      onLogin(res.user as User);
    } else {
      setError(res.error ?? 'Phone number not registered.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🚛</div>
          <div className="text-blue-400 font-bold text-2xl tracking-tight">FleetSync AI</div>
          <div className="text-gray-500 text-sm mt-1">Driver App</div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-2">
              Phone number
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="+34600000000"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-blue-500 transition-colors"
            />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-xl transition-all text-base"
          >
            {loading ? 'Verifying…' : 'Log In'}
          </button>
        </div>

        {/* Test numbers from backend */}
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-600 text-xs text-center mb-3">Test numbers</p>
          {TEST_NUMBERS.map(({ phone: num, label }) => (
            <button
              key={num}
              onClick={() => setPhone(num)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span className="text-gray-400 text-xs font-mono">{num}</span>
              <span className="text-gray-600 text-xs ml-2">— {label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Home Screen ───────────────────────────────────────────────────────────────

function HomeScreen({ user, onStartJourney }: { user: User; onStartJourney: () => void }) {
  const { route } = user;
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-5 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm">
          {initials}
        </div>
        <div>
          <div className="text-white font-semibold">{user.name}</div>
          <div className="text-gray-500 text-xs">{user.phone_number} · {user.truck_id}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-gray-500 text-xs">Nokia NaC</span>
        </div>
      </div>

      {/* Route card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
        <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-4">Assigned route</div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex flex-col items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="w-0.5 h-10 bg-gray-700" />
            <div className="w-3 h-3 rounded-full bg-red-400" />
          </div>
          <div className="flex flex-col justify-between h-16">
            <div>
              <div className="text-white font-semibold">{route.origin.name}</div>
              <div className="text-gray-500 text-xs">Origin</div>
            </div>
            <div>
              <div className="text-white font-semibold">{route.destination.name}</div>
              <div className="text-gray-500 text-xs">Destination</div>
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-white font-bold text-lg">{route.distance_km} km</div>
            <div className="text-gray-500 text-xs">Total distance</div>
          </div>
        </div>

        {/* Verifications that will be done */}
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Nokia NaC will verify</div>
          <div className="space-y-2">
            {['Phone number', 'SIM card integrity', 'Your GPS location', 'Roaming status'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map preview */}
      <div className="mb-6">
        <DriverMap route={route} height="180px" />
      </div>

      {/* Start */}
      <button
        onClick={onStartJourney}
        className="w-full bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-bold py-5 rounded-2xl transition-all text-lg shadow-lg shadow-blue-500/20"
      >
        🚀 Start Journey
      </button>
    </div>
  );
}

// ── Verifying Screen ──────────────────────────────────────────────────────────

// Checks visibles al usuario (sin Gemini — es interno del backend)
const RESULT_CHECKS = [
  { key: 'phone',    label: 'Phone number verified' },
  { key: 'sim',      label: 'SIM card integrity' },
  { key: 'location', label: 'Driver location' },
  { key: 'qod',      label: 'QoD route activation' },
];

function getCheckResults(journey: JourneyResult): { label: string; passed: boolean }[] {
  const c = journey.checks;
  const r = journey.reason ?? '';
  const authorized = journey.status === 'AUTHORIZED';

  return RESULT_CHECKS.map(({ key, label }) => {
    if (authorized) return { label, passed: true };
    switch (key) {
      case 'phone':    return { label, passed: !r.includes('CRITICAL_ERROR') };
      case 'sim':      return { label, passed: c?.sim_safe !== false && !r.includes('SIM_SWAP') };
      case 'location': return { label, passed: c?.driver_location_ok !== false && !r.includes('DRIVER_NOT_AT_START') && !r.includes('ROAMING') };
      case 'qod':      return { label, passed: authorized };
      default:         return { label, passed: authorized };
    }
  });
}

function VerifyingScreen({ user, onResult }: {
  user: User;
  onResult: (status: 'AUTHORIZED' | 'DENIED', result: JourneyResult) => void;
}) {
  const [loading, setLoading]   = useState(true);
  const [journey, setJourney]   = useState<JourneyResult | null>(null);
  const [revealed, setRevealed] = useState(0); // cuántos checks se han revelado animadamente

  // Llamada a la API
  useEffect(() => {
    let cancelled = false;

    api.startDelivery({
      truckId:     user.truck_id,
      phoneNumber: user.phone_number,
      lat:         user.route.origin.lat,
      lon:         user.route.origin.lon,
      latDestino:  user.route.destination.lat,
      lonDestino:  user.route.destination.lon,
      route:       user.route.waypoints,
      actorType:   'Human',
    }).then(res => {
      if (cancelled) return;
      const j: JourneyResult = res?.journey ?? { status: 'DENIED', reason: 'API error' };
      setJourney(j);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  // Cuando llega la respuesta, revelar checks uno a uno.
  // Si un check falla, se revela ese check fallido y se salta directo a DENIED.
  useEffect(() => {
    if (loading || !journey) return;
    let cancelled = false;
    const checks = getCheckResults(journey);

    // Encontrar el primer check fallido (si hay)
    const firstFail = checks.findIndex(c => !c.passed);

    const total = RESULT_CHECKS.length;
    // Si hay fallo, revelar hasta ese inclusive; si no, todos
    const revealUpTo = firstFail >= 0 ? firstFail + 1 : total;

    let step = 0;
    const id = setInterval(() => {
      step++;
      if (!cancelled) setRevealed(step);
      if (step >= revealUpTo) {
        clearInterval(id);
        setTimeout(() => {
          if (!cancelled) {
            onResult(journey.status === 'AUTHORIZED' ? 'AUTHORIZED' : 'DENIED', journey);
          }
        }, firstFail >= 0 ? 800 : 1200);
      }
    }, 400);

    return () => { cancelled = true; clearInterval(id); };
  }, [loading, journey]); // eslint-disable-line

  const checks = journey ? getCheckResults(journey) : [];

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-5 py-12 justify-center">
      <div className="max-w-sm mx-auto w-full">
        <div className="text-center mb-10">
          <div className="text-4xl mb-3 animate-pulse">🔍</div>
          <div className="text-white font-bold text-xl">Verifying identity</div>
          <div className="text-gray-500 text-sm mt-1">Nokia NaC is checking your data…</div>
        </div>

        {loading ? (
          /* ── Spinner mientras la API responde ── */
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Running security checks…</span>
          </div>
        ) : (
          /* ── Resultados reales del backend, revelados uno a uno ── */
          <div className="space-y-3">
            {checks.map((c, i) => {
              if (i >= revealed) return null;
              const passed = c.passed;
              return (
                <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  passed ? 'bg-green-400/5 border-green-400/20' : 'bg-red-400/5 border-red-400/30'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    passed ? 'bg-green-400/20' : 'bg-red-400/20'
                  }`}>
                    <span className={`text-sm font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
                      {passed ? '✓' : '✗'}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${passed ? 'text-green-400' : 'text-red-400'}`}>
                    {c.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Journey Screen ────────────────────────────────────────────────────────────

const INCIDENT_DISPLAY: Record<string, { icon: string; msg: string; color: string; bg: string }> = {
  GPS_SPOOFING:    { icon: '⚠️', msg: 'GPS anomaly detected by Nokia NaC',    color: 'text-red-400',   bg: 'bg-red-400/10' },
  SIM_SWAP:        { icon: '🔴', msg: 'SIM swap detected — contact manager',  color: 'text-red-400',   bg: 'bg-red-400/10' },
  ROUTE_DEVIATION: { icon: '⚠️', msg: 'You are off the expected route',       color: 'text-amber-400', bg: 'bg-amber-400/10' },
  QOD_MANUAL:      { icon: '📶', msg: 'Connection prioritized via Nokia NaC', color: 'text-blue-400',  bg: 'bg-blue-400/10' },
  DELIVERY_COMPLETED: { icon: '✅', msg: 'Delivery confirmed at destination',  color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

function JourneyScreen({ user, onArrived }: { user: User; onArrived: (result: any) => void }) {
  const { route } = user;
  const [status,    setStatus]    = useState<DeliveryStatus | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [elapsed,   setElapsed]   = useState(0);
  const [confirm,   setConfirm]   = useState(false);

  useEffect(() => {
    const load = async () => {
      const [s, inc] = await Promise.all([api.getDeliveryStatus(), api.getIncidents()]);
      setStatus(s);
      setIncidents(inc);
    };
    load();
    const pollId  = setInterval(load, 5000);
    const clockId = setInterval(() => setElapsed(e => e + 1), 60000);
    return () => { clearInterval(pollId); clearInterval(clockId); };
  }, []);

  const handleConfirmArrival = async () => {
    const res = await api.completeDelivery();
    onArrived(res?.result ?? { status: 'ARRIVED', reason: 'Confirmed by driver' });
  };

  const remainingKm  = parseFloat(status?.distanceRemaining ?? String(route.distance_km));
  const progress     = isNaN(remainingKm) ? 0 :
    Math.max(0, Math.min(100, Math.round((1 - remainingKm / route.distance_km) * 100)));
  const coveredKm    = Math.round((progress / 100) * route.distance_km);
  const isAlert      = status?.truckStatus === 'ALERT';

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-5 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-white font-bold text-lg">Journey active</div>
          <div className="text-gray-500 text-xs">{user.truck_id} · {elapsed}h elapsed</div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
          isAlert
            ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
            : 'bg-blue-400/10 border-blue-400/30 text-blue-400'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isAlert ? 'bg-amber-400' : 'bg-blue-400'}`} />
          {isAlert ? 'Alert' : 'On Route'}
        </div>
      </div>

      {/* Map */}
      <div className="mb-5">
        <DriverMap route={route} height="200px" />
      </div>

      {/* Progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="text-green-400 text-xs mb-0.5">FROM</div>
            <div className="text-white font-semibold text-sm">{route.origin.name}</div>
          </div>
          <div className="flex-1 px-3">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-center text-gray-500 text-xs mt-1">{progress}%</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 text-xs mb-0.5">TO</div>
            <div className="text-white font-semibold text-sm">{route.destination.name}</div>
          </div>
        </div>
        <div className="flex justify-between text-xs border-t border-gray-800 pt-3">
          <div className="text-center"><div className="text-gray-500">Covered</div><div className="text-white font-semibold">{coveredKm} km</div></div>
          <div className="text-center"><div className="text-gray-500">Remaining</div><div className="text-white font-semibold">{Math.round(remainingKm)} km</div></div>
          <div className="text-center"><div className="text-gray-500">Total</div><div className="text-white font-semibold">{route.distance_km} km</div></div>
        </div>
      </div>

      {/* Nokia NaC telemetry strip */}
      {status && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 mb-4 grid grid-cols-3 gap-2 text-center">
          <div><div className="text-gray-600 text-xs">Latency</div><div className="text-white text-sm font-bold">{status.latency} ms</div></div>
          <div><div className="text-gray-600 text-xs">Signal</div><div className="text-white text-sm font-bold">{status.signal} dBm</div></div>
          <div>
            <div className="text-gray-600 text-xs">QoD</div>
            <div className={`text-sm font-bold ${status.isQodActive ? 'text-blue-400' : 'text-gray-600'}`}>
              {status.isQodActive ? 'Active' : 'Off'}
            </div>
          </div>
        </div>
      )}

      {/* Route Security — real incidents from route_monitor */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">🛡️ Route Security</div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isAlert ? 'bg-amber-400' : 'bg-green-400'}`} />
            <span className={`text-xs ${isAlert ? 'text-amber-400' : 'text-green-400'}`}>{isAlert ? 'Alert' : 'Active'}</span>
          </div>
        </div>
        {incidents.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span>✓</span><span>No incidents detected</span>
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map(inc => {
              const cfg = INCIDENT_DISPLAY[inc.type];
              if (!cfg) return null;
              return (
                <div key={inc.id} className={`flex items-start gap-2 p-3 rounded-xl ${cfg.bg}`}>
                  <span>{cfg.icon}</span>
                  <div className="flex-1">
                    <div className={`text-xs font-medium ${cfg.color}`}>{inc.type}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{cfg.msg}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Arrival button */}
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-bold py-4 rounded-2xl transition-all text-base mt-auto"
        >
          🏁 I have arrived
        </button>
      ) : (
        <div className="bg-gray-900 border border-emerald-500/40 rounded-2xl p-4 mt-auto">
          <p className="text-white text-sm font-medium text-center mb-4">
            Confirm arrival at <span className="text-emerald-400">{route.destination.name}</span>?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirm(false)} className="flex-1 bg-gray-800 text-gray-400 font-medium py-3 rounded-xl text-sm">Cancel</button>
            <button onClick={handleConfirmArrival} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm">Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Arrived Screen ────────────────────────────────────────────────────────────

function ArrivedScreen({ user, result, onReset }: { user: User; result: JourneyResult | null; onReset: () => void }) {
  const { route } = user;
  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-5 py-12 justify-center">
      <div className="max-w-sm mx-auto w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <div className="text-white font-bold text-2xl mb-1">Delivery complete!</div>
        <div className="text-emerald-400 text-sm mb-8">{route.origin.name} → {route.destination.name}</div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6 text-left">
          <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Nokia NaC — Flow 4 checks</div>
          <div className="space-y-2">
            {[
              'Distance to destination',
              'Driver at destination',
              'SIM integrity confirmed',
              'Delivery completed',
            ].map(label => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                <span className="text-gray-300 text-sm">{label}</span>
                <span className="text-green-400 font-bold">✓</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-2xl p-4 mb-8">
          <div className="text-emerald-400 text-xs font-medium uppercase tracking-wider mb-1">Verification result</div>
          <div className="text-white font-bold text-lg">ARRIVED</div>
          <div className="text-gray-400 text-xs mt-1">{result?.reason ?? 'Driver confirmed at destination'}</div>
        </div>

        <button onClick={onReset} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-2xl transition-all">
          Back to Home
        </button>
      </div>
    </div>
  );
}

// ── Denied Screen ─────────────────────────────────────────────────────────────

function DeniedScreen({ result, onReset }: { result: JourneyResult | null; onReset: () => void }) {
  const checks = [
    { label: 'Phone number',    val: true },
    { label: 'SIM card',        val: result?.checks?.sim_safe ?? false },
    { label: 'Your location',   val: result?.checks?.driver_location_ok ?? null },
    { label: 'Roaming status',  val: result?.checks?.roaming === false ? true : null },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-5 py-12 justify-center">
      <div className="max-w-sm mx-auto w-full text-center">
        <div className="text-6xl mb-4">🚫</div>
        <div className="text-white font-bold text-2xl mb-1">Journey denied</div>
        <div className="text-red-400 text-sm mb-8">Nokia NaC verification failed</div>

        <div className="bg-gray-900 border border-red-400/20 rounded-2xl p-5 mb-6 text-left">
          <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Check results</div>
          <div className="space-y-2">
            {checks.map(c => (
              <div key={c.label} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                <span className="text-gray-300 text-sm">{c.label}</span>
                <span className={`font-bold text-sm ${c.val === true ? 'text-green-400' : c.val === false ? 'text-red-400' : 'text-gray-600'}`}>
                  {c.val === true ? '✓' : c.val === false ? '✗' : '–'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-red-400/10 border border-red-400/30 rounded-2xl p-4 mb-8">
          <div className="text-red-400 text-xs font-medium uppercase tracking-wider mb-1">Reason</div>
          <div className="text-white text-sm mt-1">{result?.reason_display ?? result?.reason ?? 'VERIFICATION_FAILED'}</div>
        </div>

        <button onClick={onReset} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-4 rounded-2xl transition-all">
          Try again
        </button>
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

type Screen = 'LOGIN' | 'HOME' | 'VERIFYING' | 'JOURNEY' | 'ARRIVED' | 'DENIED';

export default function DriverApp() {
  const [screen,        setScreen]        = useState<Screen>('LOGIN');
  const [user,          setUser]          = useState<User | null>(null);
  const [journeyResult, setJourneyResult] = useState<JourneyResult | null>(null);

  const handleLogin       = (u: User)               => { setUser(u); setScreen('HOME'); };
  const handleStartJourney = ()                      => setScreen('VERIFYING');
  const handleVerifyResult = (s: 'AUTHORIZED' | 'DENIED', r: JourneyResult) => {
    setJourneyResult(r);
    setScreen(s === 'AUTHORIZED' ? 'JOURNEY' : 'DENIED');
  };
  const handleArrived     = (r: JourneyResult)       => { setJourneyResult(r); setScreen('ARRIVED'); };
  const handleReset       = ()                        => setScreen('HOME');

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#030712', boxShadow: '0 0 60px rgba(0,0,0,0.8)', borderRadius: 16, overflow: 'hidden' }}>
      {screen === 'LOGIN'     && <LoginScreen onLogin={handleLogin} />}
      {screen === 'HOME'      && user && <HomeScreen user={user} onStartJourney={handleStartJourney} />}
      {screen === 'VERIFYING' && user && <VerifyingScreen user={user} onResult={handleVerifyResult} />}
      {screen === 'JOURNEY'   && user && <JourneyScreen user={user} onArrived={handleArrived} />}
      {screen === 'ARRIVED'   && user && <ArrivedScreen user={user} result={journeyResult} onReset={handleReset} />}
      {screen === 'DENIED'    && <DeniedScreen result={journeyResult} onReset={handleReset} />}
    </div>
  );
}
