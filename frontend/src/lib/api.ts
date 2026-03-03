import { DeliveryStatus, AgentAction, StartDeliveryRequest, Incident } from '../types';

const API_BASE = 'http://localhost:8000/api';

export const api = {
  getDeliveryStatus: async (): Promise<DeliveryStatus> => {
    try {
      const res = await fetch(`${API_BASE}/delivery/status`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return {
        actorType: 'Human',
        isKycVerified: true,
        isQodActive: false,
        location: { lat: 40.4168, lng: -3.7038 },
        latency: 24,
        signal: -85,
        packetJitter: 0.8,
        eta: '14:35',
        distanceRemaining: '621.0 km',
        actorName: 'Carlos Rodríguez',
        actorId: '#AGT-8821',
        actorRating: 4.9,
        truckStatus: 'ACTIVE',
      };
    }
  },

  getTimeline: async (): Promise<AgentAction[]> => {
    try {
      const res = await fetch(`${API_BASE}/delivery/timeline`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return [{
        id: 'sys-1', timestamp: '08:00:00', action: 'Shift Started',
        reason: 'FleetSync AI initialized. Nokia NaC MCP connected. Telemetry streams active.',
        status: 'System', toolUsed: 'Nokia NaC MCP', toolDetails: 'protocol: 2024-11-05 | tools: 70 available',
      }];
    }
  },

  getIncidents: async (): Promise<Incident[]> => {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return [];
    }
  },

  login: async (phoneNumber: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      return await res.json();
    } catch {
      return { ok: false, error: 'Cannot reach backend' };
    }
  },

  completeDelivery: async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  },

  startDelivery: async (data: StartDeliveryRequest) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: true };
    }
  },

  triggerEvent: async (eventId: string) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/trigger-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      return await res.json();
    } catch {
      return { success: true };
    }
  },
};
