import React, { useEffect, useState } from 'react';
import { Menu, Bell, MapPin, Clock, Phone, Video, Wifi, Activity, AlertTriangle, ShieldCheck, Truck } from 'lucide-react';
import { api } from '../lib/api';
import { DeliveryStatus } from '../types';

export default function Dashboard() {
  const [status, setStatus] = useState<DeliveryStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const data = await api.getDeliveryStatus();
      setStatus(data);
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return <div className="flex h-full items-center justify-center text-white">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-[#0b1319] text-white overflow-hidden relative pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 z-10 bg-gradient-to-b from-[#0b1319] to-transparent">
        <button className="text-white"><Menu size={24} /></button>
        <h1 className="text-lg font-semibold">Ops Control Center</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell size={20} />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
          <div className="w-8 h-8 bg-[#00a8ff] rounded-full"></div>
        </div>
      </div>

      {/* Top Badges */}
      <div className="flex gap-2 px-4 z-10 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 bg-[#162028]/80 backdrop-blur-md border border-[#23303b] px-3 py-1.5 rounded-full whitespace-nowrap">
          <div className="w-2 h-2 bg-[#00d084] rounded-full"></div>
          <span className="text-xs font-medium">Route Active</span>
        </div>
        <div className="flex items-center gap-2 bg-[#162028]/80 backdrop-blur-md border border-[#23303b] px-3 py-1.5 rounded-full whitespace-nowrap">
          <MapPin size={12} className="text-[#00a8ff]" />
          <span className="text-xs font-medium">{status.distanceRemaining}</span>
        </div>
        <div className="flex items-center gap-2 bg-[#162028]/80 backdrop-blur-md border border-[#23303b] px-3 py-1.5 rounded-full whitespace-nowrap">
          <Clock size={12} className="text-[#ffb020]" />
          <span className="text-xs font-medium">ETA: {status.eta}</span>
        </div>
      </div>

      {/* Map Area (Placeholder) */}
      <div className="absolute inset-0 z-0 opacity-40 flex items-center justify-center overflow-hidden">
        {/* A simple grid background to simulate a map */}
        <div className="w-[200%] h-[200%] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 transform rotate-12"></div>
        
        {/* Center Marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex items-center justify-center w-16 h-16">
            <div className="absolute inset-0 border-2 border-[#00a8ff] rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-2 border border-[#00a8ff] rounded-full opacity-50"></div>
            <div className="w-10 h-10 bg-[#00a8ff]/20 border border-[#00a8ff] rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(0,168,255,0.5)]">
              <Truck size={18} className="text-[#00a8ff]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#162028]/95 backdrop-blur-xl border-t border-[#23303b] rounded-t-3xl p-5 z-10 flex flex-col gap-4 max-h-[70vh] overflow-y-auto pb-24">
        
        {/* Active Actor */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[#8b9eb0] text-xs font-semibold tracking-wider">
              <ShieldCheck size={14} />
              <span>ACTIVE ACTOR</span>
            </div>
            <div className="bg-[#00d084]/10 text-[#00d084] border border-[#00d084]/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
              ONLINE
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="https://picsum.photos/seed/courier/100/100" alt="Courier" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
              <div className="absolute -bottom-1 -right-1 bg-[#162028] rounded-full p-0.5">
                <div className="bg-[#00a8ff] text-white rounded-full p-0.5">
                  <ShieldCheck size={10} />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{status.actorName}</h2>
              <p className="text-xs text-[#8b9eb0]">ID: {status.actorId} • {status.actorType} Agent</p>
              <div className="flex gap-2 mt-1">
                <span className="bg-[#23303b] text-[#8b9eb0] text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck size={10} /> {status.isKycVerified ? 'KYC Verified' : 'Unverified'}
                </span>
                <span className="bg-[#23303b] text-[#8b9eb0] text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                  ★ {status.actorRating} Rating
                </span>
              </div>
            </div>
            <button className="text-[#8b9eb0]"><Menu size={20} className="rotate-90" /></button>
          </div>

          <div className="flex gap-2 mt-2">
            <button className="flex-1 bg-[#23303b] hover:bg-[#2a3a47] text-white py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <Phone size={16} className="text-[#8b9eb0]" /> Contact
            </button>
            <button className="flex-1 bg-[#23303b] hover:bg-[#2a3a47] text-white py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <Video size={16} className="text-[#8b9eb0]" /> View Cam
            </button>
          </div>
        </div>

        {/* Network Telemetry */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold">Network Telemetry</h3>
            {status.isQodActive && (
              <div className="bg-[#00a8ff]/10 text-[#00a8ff] border border-[#00a8ff]/20 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-[#00a8ff] rounded-full animate-pulse"></div>
                QOD ACTIVE
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1c2731] border border-[#23303b] rounded-xl p-3 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8b9eb0]">Latency</span>
                <Wifi size={14} className="text-[#00d084]" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{status.latency}</span>
                <span className="text-xs text-[#8b9eb0]">ms</span>
              </div>
              <div className="flex items-end gap-1 h-6 mt-1">
                {[40, 60, 30, 50, 80, 100].map((h, i) => (
                  <div key={i} className="flex-1 bg-[#00a8ff] rounded-t-sm opacity-80" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>

            <div className="bg-[#1c2731] border border-[#23303b] rounded-xl p-3 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8b9eb0]">Signal (5G)</span>
                <Activity size={14} className="text-[#00a8ff]" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{status.signal}</span>
                <span className="text-xs text-[#8b9eb0]">dBm</span>
              </div>
              <div className="w-full h-1.5 bg-[#23303b] rounded-full mt-auto overflow-hidden">
                <div className="h-full bg-[#00d084] w-[80%] rounded-full"></div>
              </div>
            </div>
          </div>

          {status.packetJitter && status.packetJitter > 1.0 && (
            <div className="bg-[#ffb020]/10 border border-[#ffb020]/20 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle size={20} className="text-[#ffb020]" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">Packet Jitter</h4>
                <p className="text-xs text-[#8b9eb0]">Fluctuation detected in last 5m</p>
              </div>
              <span className="text-[#ffb020] font-bold text-sm">{status.packetJitter}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
