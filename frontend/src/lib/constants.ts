import { Truck, Delivery, Incident, TruckStatus } from '../types';

// ── Status config ─────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<TruckStatus, {
  color: string; bg: string; border: string; dot: string; label: string; markerColor: string;
}> = {
  ON_ROUTE:   { color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30',    dot: 'bg-blue-400',    label: 'On Route',   markerColor: '#60a5fa' },
  AUTHORIZED: { color: 'text-green-400',   bg: 'bg-green-400/10',   border: 'border-green-400/30',   dot: 'bg-green-400',   label: 'Authorized', markerColor: '#4ade80' },
  ALERT:      { color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30',   dot: 'bg-amber-400',   label: 'Alert',      markerColor: '#fbbf24' },
  ARRIVED:    { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', dot: 'bg-emerald-400', label: 'Arrived',    markerColor: '#34d399' },
  DENIED:     { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30',     dot: 'bg-red-400',     label: 'Denied',     markerColor: '#f87171' },
};

export const INCIDENT_SEVERITY: Record<string, 'high' | 'info' | 'success'> = {
  GPS_SPOOFING:       'high',
  SIM_SWAP:           'high',
  ROUTE_DEVIATION:    'high',
  LOCATION_MISMATCH:  'high',
  QOD_MANUAL:         'info',
  DELIVERY_COMPLETED: 'success',
};

export const SEVERITY_CONFIG = {
  high:    { color: 'text-red-400',     bg: 'bg-red-400/10',     icon: '⚠️' },
  info:    { color: 'text-blue-400',    bg: 'bg-blue-400/10',    icon: '📡' },
  success: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '✅' },
};

// ── Demo fleet (shown alongside the real TRK-001) ─────────────────────────────

export const DEMO_TRUCKS: Truck[] = [
  {
    id: 'TRUCK-02', driver: '+34600000002', status: 'AUTHORIZED', progress: 12, fuel: 91, speed: 0,
    lat: 41.3825, lon: 2.1769, origin: 'Barcelona', destination: 'Zaragoza',
    checks: { numberValid: true, simSafe: true, driverLocation: true, truckChip: true, onRoute: null, qodActive: true },
  },
  {
    id: 'TRUCK-03', driver: '+34600000003', status: 'ALERT', progress: 48, fuel: 45, speed: 67,
    lat: 39.4699, lon: -0.3763, origin: 'Valencia', destination: 'Murcia',
    checks: { numberValid: true, simSafe: true, driverLocation: false, truckChip: true, onRoute: false, qodActive: true },
  },
  {
    id: 'TRUCK-04', driver: '+34600000004', status: 'ARRIVED', progress: 100, fuel: 28, speed: 0,
    lat: 37.3891, lon: -5.9845, origin: 'Sevilla', destination: 'Málaga',
    checks: { numberValid: true, simSafe: true, driverLocation: true, truckChip: true, onRoute: true, qodActive: false },
  },
  {
    id: 'TRUCK-05', driver: '+34600000005', status: 'DENIED', progress: 0, fuel: 88, speed: 0,
    lat: 43.2630, lon: -2.9350, origin: 'Bilbao', destination: 'Pamplona',
    checks: { numberValid: true, simSafe: false, driverLocation: null, truckChip: null, onRoute: null, qodActive: false },
  },
];

// ── Demo incidents (shown alongside real incidents) ────────────────────────────

export const DEMO_INCIDENTS: Incident[] = [
  { id: 'DEMO-1', truck_id: 'TRUCK-03', type: 'ROUTE_DEVIATION',   description: 'Truck 800m off expected route',        lat: 39.47, lon: -0.38, status: 'OPEN',   created_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'DEMO-2', truck_id: 'TRUCK-03', type: 'LOCATION_MISMATCH', description: 'Driver GPS does not match network',    lat: 39.47, lon: -0.38, status: 'OPEN',   created_at: new Date(Date.now() - 28 * 60000).toISOString() },
  { id: 'DEMO-3', truck_id: 'TRUCK-05', type: 'SIM_SWAP',          description: 'Recent SIM swap — journey denied',     lat: 43.26, lon: -2.94, status: 'OPEN',   created_at: new Date(Date.now() - 81 * 60000).toISOString() },
  { id: 'DEMO-4', truck_id: 'TRUCK-04', type: 'DELIVERY_COMPLETED', description: 'Delivery confirmed at destination',   lat: 37.39, lon: -5.98, status: 'CLOSED', created_at: new Date(Date.now() - 106 * 60000).toISOString() },
];

// ── Demo deliveries ───────────────────────────────────────────────────────────

export const DEMO_DELIVERIES: Delivery[] = [
  { id: 'DEL-002', truck: 'TRUCK-02', driver: '+34600000002', origin: 'Barcelona', destination: 'Zaragoza', distance: 296, duration: '2h 55m', departed: '12:00', arrived: null,    status: 'AUTHORIZED', checks: { numberValid: true, simSafe: true,  driverLocation: true,  truckChip: true } },
  { id: 'DEL-003', truck: 'TRUCK-03', driver: '+34600000003', origin: 'Valencia',  destination: 'Murcia',   distance: 241, duration: '2h 40m', departed: '11:45', arrived: null,    status: 'ALERT',      checks: { numberValid: true, simSafe: true,  driverLocation: false, truckChip: true } },
  { id: 'DEL-004', truck: 'TRUCK-04', driver: '+34600000004', origin: 'Sevilla',   destination: 'Málaga',   distance: 210, duration: '2h 05m', departed: '08:05', arrived: '10:10', status: 'ARRIVED',    checks: { numberValid: true, simSafe: true,  driverLocation: true,  truckChip: true } },
  { id: 'DEL-005', truck: 'TRUCK-05', driver: '+34600000005', origin: 'Bilbao',    destination: 'Pamplona', distance: 98,  duration: '—',      departed: '—',     arrived: null,    status: 'DENIED',     checks: { numberValid: true, simSafe: false, driverLocation: null,  truckChip: null } },
];

// ── Nokia NaC Flows (with REAL tool names) ────────────────────────────────────

export const FLOW_STEPS: Record<string, { label: string; tool: string; status: 'ok' | 'warning' }[]> = {
  'FLOW 1': [
    { label: 'Check SIM Swap',       tool: 'checkSimSwap',             status: 'ok' },
    { label: 'Verify driver location', tool: 'verifyLocation',          status: 'ok' },
    { label: 'Get roaming status',   tool: 'getRoamingStatus',         status: 'ok' },
    { label: 'Gemini decision',      tool: 'gemini → evaluate()',      status: 'ok' },
  ],
  'FLOW 2': [
    { label: 'Calculate distance',   tool: 'haversine_km (local)',     status: 'ok' },
    { label: 'Activate QoD',         tool: 'createSession-QoD-V1',     status: 'ok' },
    { label: 'Gemini confirmation',  tool: 'gemini → evaluate()',      status: 'ok' },
  ],
  'FLOW 3': [
    { label: 'Retrieve real position', tool: 'retrieveLocation',       status: 'ok' },
    { label: 'Verify GPS match',     tool: 'verifyLocation',           status: 'warning' },
    { label: 'Check SIM integrity',  tool: 'checkSimSwap',             status: 'warning' },
    { label: 'Route deviation check', tool: 'haversine → waypoints',   status: 'warning' },
    { label: 'Create incident',      tool: 'incident_manager.add()',   status: 'warning' },
    { label: 'Activate QoD',         tool: 'createSession-QoD-V1',     status: 'warning' },
    { label: 'Gemini evaluation',    tool: 'gemini → evaluate()',      status: 'warning' },
  ],
  'FLOW 4': [
    { label: 'Distance to dest.',    tool: 'haversine_km (local)',     status: 'ok' },
    { label: 'Driver at destination', tool: 'verifyLocation',          status: 'ok' },
    { label: 'Retrieve final pos.',  tool: 'retrieveLocation',         status: 'ok' },
    { label: 'Check SIM Swap',       tool: 'checkSimSwap',             status: 'ok' },
    { label: 'Mark COMPLETED',       tool: 'route_monitor → COMPLETED', status: 'ok' },
    { label: 'Gemini decision',      tool: 'gemini → evaluate()',      status: 'ok' },
  ],
};

export const FLOW_DESCRIPTIONS: Record<string, string> = {
  'FLOW 1': 'Verifies driver SIM integrity and GPS location before authorizing the journey via Nokia NaC MCP.',
  'FLOW 2': 'Calculates route distance locally (haversine) and proactively activates QoD for priority bandwidth.',
  'FLOW 3': 'Loop every 60s — Nokia NaC retrieves real position, detects spoofing/SIM swaps/deviations, creates incidents.',
  'FLOW 4': 'Driver taps "I arrived" — Nokia NaC verifies driver is at destination; route_monitor marks journey COMPLETED.',
};

export const FLOW_OUTPUTS: Record<string, object> = {
  'FLOW 1': { status: 'AUTHORIZED', reason: 'All Nokia NaC checks passed', checks: { sim_safe: true, driver_location_ok: true, roaming: false } },
  'FLOW 2': { status: 'QOD_ACTIVATED', distance_km: 621.4, qod_duration_seconds: 37200, reason: 'Long route — QoD activated' },
  'FLOW 3': { status: 'ALERT', reason: 'GPS_SPOOFING — verifyLocation returned FALSE', action: 'Incident created. QoD boosted.' },
  'FLOW 4': { status: 'ARRIVED', distance_to_destination_meters: 95, reason: 'Driver and network position confirmed at destination' },
};
