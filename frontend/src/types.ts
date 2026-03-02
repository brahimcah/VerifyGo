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
