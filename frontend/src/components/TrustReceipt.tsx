import React from 'react';
import { X, Share2, ShieldCheck, CheckSquare, ShieldAlert, Wifi, AlertTriangle, Route, ChevronDown } from 'lucide-react';

export default function TrustReceipt({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#0b1319] text-white overflow-y-auto pb-10">
      {/* Header */}
      <div className="sticky top-0 bg-[#0b1319]/90 backdrop-blur-md z-20 flex items-center justify-between p-4 border-b border-[#23303b]">
        <button onClick={onClose} className="text-white"><X size={24} /></button>
        <h1 className="text-lg font-bold">Trust Receipt</h1>
        <button className="text-[#00a8ff]"><Share2 size={20} /></button>
      </div>

      <div className="p-5 flex flex-col items-center gap-6">
        
        {/* Shield Icon */}
        <div className="relative mt-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#1c2731] to-[#0b1319] border border-[#23303b] flex items-center justify-center shadow-[0_0_30px_rgba(0,168,255,0.1)]">
            <ShieldCheck size={40} className="text-white opacity-80" />
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#00a8ff] rounded-full flex items-center justify-center border-2 border-[#0b1319]">
            <ShieldCheck size={16} className="text-white" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="bg-[#00d084]/10 text-[#00d084] border border-[#00d084]/20 px-3 py-1 rounded-full text-xs font-bold tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#00d084] rounded-full"></div>
            DELIVERY VERIFIED
          </div>
          <h2 className="text-lg font-medium text-[#8b9eb0] mt-2">Network Secured by Sentinel AI</h2>
          <p className="text-xs text-[#5c7080]">24 Oct, 2023 • 14:35 PM</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mt-2">
          <div className="bg-[#162028] border border-[#23303b] rounded-xl p-3 flex flex-col gap-2">
            <CheckSquare size={16} className="text-[#00a8ff]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8b9eb0] uppercase">Verifications</span>
            <span className="text-2xl font-bold">12</span>
          </div>
          <div className="bg-[#162028] border border-[#23303b] rounded-xl p-3 flex flex-col gap-2">
            <ShieldAlert size={16} className="text-[#ffb020]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8b9eb0] uppercase">Resolved</span>
            <span className="text-2xl font-bold">1</span>
          </div>
          <div className="bg-[#162028] border border-[#23303b] rounded-xl p-3 flex flex-col gap-2">
            <Wifi size={16} className="text-[#00d084]" />
            <span className="text-[10px] font-bold tracking-wider text-[#8b9eb0] uppercase">SLA Score</span>
            <span className="text-2xl font-bold">99.9%</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="w-full bg-[#162028] border border-[#23303b] rounded-xl overflow-hidden">
          <div className="grid grid-cols-2 border-b border-[#23303b]">
            <div className="p-4 border-r border-[#23303b] flex flex-col gap-1">
              <span className="text-xs text-[#8b9eb0]">Verification ID</span>
              <span className="font-bold text-sm">#8839-XA-99</span>
            </div>
            <div className="p-4 flex flex-col gap-1">
              <span className="text-xs text-[#8b9eb0]">Agent ID</span>
              <span className="font-bold text-sm">Sentinel-AI-04</span>
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-4 border-r border-[#23303b] flex flex-col gap-1">
              <span className="text-xs text-[#8b9eb0]">Telemetry</span>
              <span className="font-bold text-sm flex items-center gap-1.5">
                <Wifi size={12} className="text-[#00a8ff]" /> 5G Ultra-Rel
              </span>
            </div>
            <div className="p-4 flex flex-col gap-1">
              <span className="text-xs text-[#8b9eb0]">Connection</span>
              <span className="font-bold text-sm flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-[#00d084]" /> TLS 1.3 Enc
              </span>
            </div>
          </div>
        </div>

        {/* Accordions */}
        <div className="w-full flex flex-col gap-3">
          <button className="w-full bg-[#162028] border border-[#23303b] rounded-xl p-4 flex items-center justify-between hover:bg-[#1c2731] transition-colors">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-[#ff4d4d]" />
              <span className="font-bold text-sm">Incident Report Details</span>
            </div>
            <ChevronDown size={20} className="text-[#8b9eb0]" />
          </button>
          
          <button className="w-full bg-[#162028] border border-[#23303b] rounded-xl p-4 flex items-center justify-between hover:bg-[#1c2731] transition-colors">
            <div className="flex items-center gap-3">
              <Route size={18} className="text-[#00a8ff]" />
              <span className="font-bold text-sm">Route Telemetry Logs</span>
            </div>
            <ChevronDown size={20} className="text-[#8b9eb0]" />
          </button>
        </div>

        {/* Map Snippet */}
        <div className="w-full h-32 rounded-xl overflow-hidden relative border border-[#23303b]">
          <img src="https://picsum.photos/seed/map/400/200" alt="Map" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1319] to-transparent"></div>
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs text-[#8b9eb0] font-medium">Destination</span>
              <span className="font-bold text-white">Logistics Hub A4</span>
            </div>
            <button className="bg-[#00a8ff] hover:bg-[#0090db] text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors">
              View Route
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-2 pb-8">
          <div className="flex items-center gap-2 text-[#8b9eb0]">
            <div className="w-6 h-6 border-2 border-current rounded-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-current rounded-full"></div>
            </div>
            <span className="font-bold tracking-widest text-lg">NOKIA</span>
          </div>
          <span className="text-[10px] tracking-widest text-[#5c7080] uppercase mt-2">Digital Network Signature Verified</span>
          <span className="text-[10px] text-[#5c7080] font-mono">Hash: 8f9a...3b21</span>
        </div>

      </div>
    </div>
  );
}
