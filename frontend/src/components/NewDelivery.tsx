import React, { useState } from 'react';
import { ArrowLeft, User, Bot, QrCode, MapPin, Navigation, Satellite, ShieldCheck, AlertTriangle, Rocket, Wifi } from 'lucide-react';
import { api } from '../lib/api';

export default function NewDelivery({ onBack, onDispatch }: { onBack: () => void, onDispatch: () => void }) {
  const [actorType, setActorType] = useState<'Human' | 'Drone'>('Human');
  const [deviceId, setDeviceId] = useState('DEV-8821-XJ');
  const [lowBandwidth, setLowBandwidth] = useState(false);

  const handleDispatch = async () => {
    await api.startDelivery({
      actorType,
      deviceId,
      lowBandwidth
    });
    onDispatch();
  };

  const handleSimulateEvent = async (eventId: string) => {
    await api.triggerEvent(eventId);
    alert(`Event ${eventId} triggered`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b1319] text-white overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-[#0b1319]/90 backdrop-blur-md z-20 flex items-center justify-between p-4 border-b border-[#23303b]">
        <button onClick={onBack} className="text-white"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold">New Delivery</h1>
        <button className="text-[#00a8ff] text-sm font-medium">Reset</button>
      </div>

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

        {/* Inputs */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white">Device ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <QrCode size={16} className="text-[#8b9eb0]" />
              </div>
              <input 
                type="text" 
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full bg-[#162028] border border-[#23303b] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#00a8ff] transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white">Origin</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="w-3 h-3 rounded-full border-2 border-[#00a8ff]"></div>
                </div>
                <input 
                  type="text" 
                  defaultValue="Warehouse A1"
                  className="w-full bg-[#162028] border border-[#23303b] rounded-xl py-3 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-[#00a8ff] transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white">Destination</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin size={16} className="text-[#8b9eb0]" />
                </div>
                <input 
                  type="text" 
                  placeholder="Dropoff"
                  className="w-full bg-[#162028] border border-[#23303b] rounded-xl py-3 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-[#00a8ff] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Manual Overrides */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Navigation size={16} className="text-[#00a8ff]" /> Manual Overrides
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleSimulateEvent('gps_drift')}
              className="bg-[#162028] border border-[#23303b] border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-[#1c2731] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#23303b] flex items-center justify-center">
                <Satellite size={18} className="text-[#8b9eb0]" />
              </div>
              <span className="text-xs font-medium text-center">Simulate GPS Drift</span>
            </button>
            <button 
              onClick={() => handleSimulateEvent('manual_qod')}
              className="bg-[#162028] border border-[#23303b] border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-[#1c2731] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#23303b] flex items-center justify-center">
                <ShieldCheck size={18} className="text-[#8b9eb0]" />
              </div>
              <span className="text-xs font-medium text-center">Request Manual QoD</span>
            </button>
          </div>

          <div className="bg-[#162028] border border-[#23303b] rounded-xl p-4 flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-[#ffb020]" />
              <div>
                <div className="text-sm font-bold">Force Low Bandwidth</div>
                <div className="text-xs text-[#8b9eb0]">Simulate poor network conditions</div>
              </div>
            </div>
            <button 
              onClick={() => setLowBandwidth(!lowBandwidth)}
              className={`w-12 h-6 rounded-full transition-colors relative ${lowBandwidth ? 'bg-[#ffb020]' : 'bg-[#23303b]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${lowBandwidth ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>
        </div>

        {/* Consent & Auth Status */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#00a8ff]" /> Consent & Auth Status
          </h3>
          
          <div className="flex flex-col gap-2">
            <div className="bg-[#162028] border border-[#23303b] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00d084]/10 flex items-center justify-center">
                  <MapPin size={14} className="text-[#00d084]" />
                </div>
                <div>
                  <div className="text-sm font-bold">Location Access</div>
                  <div className="text-xs text-[#8b9eb0]">Precise location granted</div>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-[#00d084] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>

            <div className="bg-[#162028] border border-[#23303b] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00d084]/10 flex items-center justify-center">
                  <User size={14} className="text-[#00d084]" />
                </div>
                <div>
                  <div className="text-sm font-bold">Identity Verified</div>
                  <div className="text-xs text-[#8b9eb0]">Actor authenticated</div>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-[#00d084] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>

            <div className="bg-[#162028] border border-[#23303b] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00d084]/10 flex items-center justify-center">
                  <Wifi size={14} className="text-[#00d084]" />
                </div>
                <div>
                  <div className="text-sm font-bold">Network Telemetry</div>
                  <div className="text-xs text-[#8b9eb0]">Streaming active</div>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-[#00d084] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Button */}
        <button 
          onClick={handleDispatch}
          className="mt-4 w-full bg-gradient-to-r from-[#00a8ff] to-[#0080ff] hover:from-[#0090db] hover:to-[#0070e0] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,168,255,0.3)] transition-all"
        >
          <Rocket size={20} /> Dispatch Simulation
        </button>
      </div>
    </div>
  );
}
