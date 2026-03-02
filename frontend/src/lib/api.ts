import { DeliveryStatus, AgentAction } from '../types';

const API_BASE = 'http://localhost:8000/api';

export const api = {
  getDeliveryStatus: async (): Promise<DeliveryStatus> => {
    try {
      const res = await fetch(`${API_BASE}/delivery/status`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      // Mock data fallback
      return {
        actorType: 'Human',
        isKycVerified: true,
        isQodActive: true,
        location: { lat: 40.7128, lng: -74.0060 },
        latency: 24,
        signal: -85,
        packetJitter: 1.2,
        eta: '14:35',
        distanceRemaining: '4.2 km',
        actorName: 'John Doe',
        actorId: '#AGT-8821',
        actorRating: 4.9
      };
    }
  },
  getTimeline: async (): Promise<AgentAction[]> => {
    try {
      const res = await fetch(`${API_BASE}/delivery/timeline`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      // Mock data fallback
      return [
        {
          id: '1',
          timestamp: '10:42:05 AM',
          action: 'Detected zone exit',
          reason: 'Geofence boundary crossed at Sector 7. Initiating Quality of Demand (QoD) protocols for maintained throughput.',
          status: 'Active',
          toolUsed: 'Nokia NaaS API',
          toolDetails: 'latency: 12ms | status: 200 OK'
        },
        {
          id: '2',
          timestamp: '10:40:12 AM',
          action: 'Network congestion spike',
          reason: 'Throughput dropped below threshold (15mbps). Analyzing alternative routes.',
          status: 'Warning'
        },
        {
          id: '3',
          timestamp: '10:35:00 AM',
          action: 'Re-routing for signal',
          reason: 'Route optimized to maintain 5G connectivity for autonomous navigation systems.',
          status: 'Auto-Action',
          toolUsed: 'View Route Diff'
        },
        {
          id: '4',
          timestamp: '10:30:45 AM',
          action: 'Package Pickup Confirmed',
          reason: 'Driver #4292 verified package via barcode scan at warehouse B.',
          status: 'Success'
        },
        {
          id: '5',
          timestamp: '08:00:00 AM',
          action: 'Shift Started',
          reason: 'Agent initialized. Telemetry streams active.',
          status: 'System'
        }
      ];
    }
  },
  startDelivery: async (data: any) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) {
      return { success: true };
    }
  },
  triggerEvent: async (eventId: string) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/trigger-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });
      return await res.json();
    } catch (e) {
      return { success: true };
    }
  }
};
