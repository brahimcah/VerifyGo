import React, { useEffect, useState } from 'react';
import { ArrowLeft, Cpu, MapPin, Wifi, Route, Package, LogIn, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { AgentAction } from '../types';

export default function Timeline({ onBack }: { onBack: () => void }) {
  const [actions, setActions] = useState<AgentAction[]>([]);

  useEffect(() => {
    const fetchTimeline = async () => {
      const data = await api.getTimeline();
      setActions(data);
    };
    fetchTimeline();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-[#00a8ff] border-[#00a8ff]/30 bg-[#00a8ff]/10';
      case 'Warning': return 'text-[#ffb020] border-[#ffb020]/30 bg-[#ffb020]/10';
      case 'Auto-Action': return 'text-[#8b9eb0] border-[#8b9eb0]/30 bg-[#8b9eb0]/10';
      case 'Success': return 'text-[#00d084] border-[#00d084]/30 bg-[#00d084]/10';
      case 'System': return 'text-[#8b9eb0] border-[#8b9eb0]/30 bg-[#8b9eb0]/10';
      default: return 'text-[#8b9eb0] border-[#8b9eb0]/30 bg-[#8b9eb0]/10';
    }
  };

  const getIcon = (action: string) => {
    if (action.toLowerCase().includes('zone')) return <MapPin size={16} />;
    if (action.toLowerCase().includes('network')) return <Wifi size={16} />;
    if (action.toLowerCase().includes('route')) return <Route size={16} />;
    if (action.toLowerCase().includes('package')) return <Package size={16} />;
    return <LogIn size={16} />;
  };

  return (
    <div className="flex flex-col h-full bg-[#0b1319] text-white overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-[#0b1319]/90 backdrop-blur-md z-20 flex items-center justify-between p-4 border-b border-[#23303b]">
        <button onClick={onBack} className="text-white"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold">Decision Timeline</h1>
        <div className="w-10 h-10 rounded-full bg-[#162028] border border-[#23303b] flex items-center justify-center">
          <Cpu size={20} className="text-[#00a8ff]" />
        </div>
      </div>

      <div className="p-5">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          AI Agent Reflections
          <div className="w-2 h-2 bg-[#00a8ff] rounded-full"></div>
        </h2>

        <div className="relative pl-6 border-l border-[#23303b] flex flex-col gap-8">
          {actions.map((action, index) => (
            <div key={action.id} className="relative">
              {/* Timeline Node */}
              <div className={`absolute -left-[45px] w-10 h-10 rounded-full border-2 bg-[#0b1319] flex items-center justify-center ${
                index === 0 ? 'border-[#00a8ff] text-[#00a8ff] shadow-[0_0_15px_rgba(0,168,255,0.4)]' : 'border-[#23303b] text-[#8b9eb0]'
              }`}>
                {getIcon(action.action)}
              </div>

              <div className="flex flex-col gap-2 pl-2">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getStatusColor(action.status)}`}>
                    {action.status}
                  </span>
                  <span className="text-xs text-[#8b9eb0] font-mono">{action.timestamp}</span>
                </div>
                
                <h3 className="text-lg font-bold text-white leading-tight">{action.action}</h3>
                <p className="text-sm text-[#8b9eb0] leading-relaxed">{action.reason}</p>

                {action.toolUsed && (
                  <div className="mt-2 bg-[#162028] border border-[#23303b] rounded-xl p-3 flex items-center justify-between hover:bg-[#1c2731] cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#23303b] flex items-center justify-center">
                        {action.toolUsed.includes('Route') ? <MapPin size={14} className="text-[#00a8ff]" /> : <Cpu size={14} className="text-[#00d084]" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{action.toolUsed}</div>
                        {action.toolDetails && <div className="text-[10px] text-[#8b9eb0] font-mono">{action.toolDetails}</div>}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#8b9eb0]" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-[10px] tracking-widest text-[#8b9eb0] font-mono">
          END OF LOGS
        </div>
      </div>
    </div>
  );
}
