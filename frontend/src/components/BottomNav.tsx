import React from 'react';
import { LayoutDashboard, History, Truck, Settings, Bot } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#0b1319] border-t border-[#23303b] px-6 py-3 flex justify-between items-center z-50">
      <button 
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-[#00a8ff]' : 'text-[#8b9eb0]'}`}
      >
        <LayoutDashboard size={20} />
        <span className="text-[10px] font-medium">Dashboard</span>
      </button>
      <button 
        onClick={() => setActiveTab('timeline')}
        className={`flex flex-col items-center gap-1 relative ${activeTab === 'timeline' ? 'text-[#00a8ff]' : 'text-[#8b9eb0]'}`}
      >
        <History size={20} />
        <span className="text-[10px] font-medium">Timeline</span>
        {activeTab === 'timeline' && <div className="absolute -bottom-3 w-8 h-1 bg-[#00a8ff] rounded-t-full" />}
      </button>
      
      <div className="relative -top-6">
        <button 
          onClick={() => setActiveTab('new')}
          className="bg-[#00a8ff] text-white p-4 rounded-full shadow-[0_0_20px_rgba(0,168,255,0.4)] hover:bg-[#0090db] transition-colors"
        >
          <Bot size={24} />
        </button>
      </div>

      <button 
        onClick={() => setActiveTab('fleet')}
        className={`flex flex-col items-center gap-1 ${activeTab === 'fleet' ? 'text-[#00a8ff]' : 'text-[#8b9eb0]'}`}
      >
        <Truck size={20} />
        <span className="text-[10px] font-medium">Fleet</span>
      </button>
      <button 
        onClick={() => setActiveTab('settings')}
        className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-[#00a8ff]' : 'text-[#8b9eb0]'}`}
      >
        <Settings size={20} />
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </div>
  );
}
