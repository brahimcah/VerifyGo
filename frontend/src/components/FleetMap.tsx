import { useEffect, useRef } from 'react';
import { Truck } from '../types';
import { STATUS_CONFIG } from '../lib/constants';

interface Props {
  trucks: Truck[];
  selectedTruck?: Truck | null;
  height?: string;
}

export default function FleetMap({ trucks, selectedTruck, height = '300px' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (mapInstance.current) return;

    // Load Leaflet CSS once
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    function initMap() {
      if (!mapRef.current || mapInstance.current) return;
      const L = (window as any).L;
      if (!L) return;

      const centerTruck = selectedTruck ?? trucks[0];
      const center: [number, number] = centerTruck
        ? [centerTruck.lat, centerTruck.lon]
        : [40.0, -3.5];
      const zoom = selectedTruck ? 8 : 6;

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
      mapInstance.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap ©CartoDB',
        maxZoom: 19,
      }).addTo(map);

      map.setView(center, zoom);

      const displayTrucks = selectedTruck ? [selectedTruck] : trucks;
      displayTrucks.forEach(t => {
        const c = STATUS_CONFIG[t.status]?.markerColor ?? '#60a5fa';
        const liveRing = t.isLive
          ? `box-shadow:0 0 0 3px ${c}44,0 0 10px ${c}88`
          : `box-shadow:0 0 6px ${c}88`;
        const icon = L.divIcon({
          html: `<div style="background:${c};width:14px;height:14px;border-radius:50%;border:2px solid #1e293b;${liveRing}"></div>`,
          className: '',
          iconAnchor: [7, 7],
        });
        L.marker([t.lat, t.lon], { icon })
          .addTo(map)
          .bindPopup(`<div style="background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:8px;font-family:monospace;font-size:12px;min-width:160px">
            <div style="font-weight:bold;margin-bottom:4px">${t.id}${t.isLive ? ' 🔴 LIVE' : ''}</div>
            <div style="color:#94a3b8">${t.origin} → ${t.destination}</div>
            <div style="color:${c};margin-top:4px">${STATUS_CONFIG[t.status]?.label ?? t.status}</div>
          </div>`);
      });
    }

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}
    />
  );
}
