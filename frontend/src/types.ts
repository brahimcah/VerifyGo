export interface Location {
  lat: number;
  lng: number;
}

export interface DeliveryStatus {
  actorType: 'Human' | 'Drone';
  isKycVerified: boolean;
  isQodActive: boolean;
  location: Location;
  latency?: number;
  signal?: number;
  packetJitter?: number;
  eta?: string;
  distanceRemaining?: string;
  actorName?: string;
  actorId?: string;
  actorRating?: number;
  truckStatus?: 'ACTIVE' | 'ALERT' | 'COMPLETED';
}

export interface AgentAction {
  id: string;
  timestamp: string;
  action: string;
  reason: string;
  status: 'Active' | 'Warning' | 'Auto-Action' | 'Success' | 'System';
  toolUsed?: string;
  agentThought?: string;
  toolDetails?: string;
}

export interface StartDeliveryRequest {
  truckId: string;
  phoneNumber: string;
  lat: number;
  lon: number;
  latDestino: number;
  lonDestino: number;
  route: { lat: number; lon: number }[];
  actorType: 'Human' | 'Drone';
}

// ── Fleet types ───────────────────────────────────────────────────────────────

export type TruckStatus = 'ON_ROUTE' | 'AUTHORIZED' | 'ALERT' | 'ARRIVED' | 'DENIED';

export interface TruckChecks {
  numberValid: boolean | null;
  simSafe: boolean | null;
  driverLocation: boolean | null;
  truckChip: boolean | null;
  onRoute: boolean | null;
  qodActive: boolean;
}

export interface Truck {
  id: string;
  driver: string;
  status: TruckStatus;
  progress: number;
  fuel: number;
  speed: number;
  lat: number;
  lon: number;
  origin: string;
  destination: string;
  checks: TruckChecks;
  isLive?: boolean; // true = real Nokia NaC data from TRK-001
}

export interface Incident {
  id: string;
  truck_id: string;
  type: string;
  description: string;
  lat: number;
  lon: number;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
}

export interface Delivery {
  id: string;
  truck: string;
  driver: string;
  origin: string;
  destination: string;
  distance: number;
  duration: string;
  departed: string;
  arrived: string | null;
  status: TruckStatus;
  checks: Pick<TruckChecks, 'numberValid' | 'simSafe' | 'driverLocation' | 'truckChip'>;
}
