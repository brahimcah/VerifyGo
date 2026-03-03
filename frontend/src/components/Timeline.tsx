import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bot, MapPin, Wifi, Route, Package, LogIn, ChevronRight, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { AgentAction } from '../types';

export default function Timeline({ onBack }: { onBack: () => void }) {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchTimeline = async () => {
      const data = await api.getTimeline();
      setActions(data);
      setLastUpdated(new Date());
    };
    fetchTimeline();
    // Poll every 5s — incidents get created in real-time by route_monitor
    const interval = setInterval(fetchTimeline, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':      return 'text-[#00a8ff] border-[#00a8ff]/30 bg-[#00a8ff]/10';
      case 'Warning':     return 'text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/10';
      case 'Auto-Action': return 'text-[#ffb020] border-[#ffb020]/30 bg-[#ffb020]/10';
      case 'Success':     return 'text-[#00d084] border-[#00d084]/30 bg-[#00d084]/10';
      case 'System':      return 'text-[#8b9eb0] border-[#8b9eb0]/30 bg-[#8b9eb0]/10';
      default:            return 'text-[#8b9eb0] border-[#8b9eb0]/30 bg-[#8b9eb0]/10';
    }
  };

  const getNodeColor = (status: string, isFirst: boolean) => {
    if (status === 'Warning') return 'border-[#ef4444] text-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.4)]';
    if (isFirst) return 'border-[#00a8ff] text-[#00a8ff] shadow-[0_0_15px_rgba(0,168,255,0.4)]';
    return 'border-[#23303b] text-[#8b9eb0]';
  };

  const getIcon = (action: string, status: string) => {
    if (status === 'Warning') return <ShieldAlert size={16} />;
    if (action.toLowerCase().includes('gps') || action.toLowerCase().includes('spoofing')) return <AlertTriangle size={16} />;
    if (action.toLowerCase().includes('sim'))     return <AlertTriangle size={16} />;
    if (action.toLowerCase().includes('zone'))    return <MapPin size={16} />;
    if (action.toLowerCase().includes('network')) return <Wifi size={16} />;
    if (action.toLowerCase().includes('route') || action.toLowerCase().includes('deviation')) return <Route size={16} />;
    if (action.toLowerCase().includes('package') || action.toLowerCase().includes('delivery')) return <Package size={16} />;
    return <LogIn size={16} />;
  };

  return (
    <div className="flex flex-col h-full bg-[#0b1319] text-white overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-[#0b1319]/90 backdrop-blur-md z-20 flex items-center justify-between p-4 border-b border-[#23303b]">
        <button onClick={onBack} className="text-white"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold">Decision Timeline</h1>
        <div className="w-10 h-10 rounded-full bg-[#162028] border border-[#23303b] flex items-center justify-center">
          <Bot size={20} className="text-[#00a8ff]" />
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            AI Agent Log
            <div className="w-2 h-2 bg-[#00a8ff] rounded-full animate-pulse"></div>
          </h2>
          <span className="text-[10px] text-[#8b9eb0] font-mono">
            {lastUpdated.toLocaleTimeString()}
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="text-center text-[#8b9eb0] text-sm py-12">
            <Bot size={32} className="mx-auto mb-3 opacity-40" />
            <p>No events yet.</p>
            <p className="text-xs mt-1">Start a delivery to see AI decisions here.</p>
          </div>
        ) : (
          <div className="relative pl-6 border-l border-[#23303b] flex flex-col gap-8">
            {actions.map((action, index) => (
              <div key={action.id} className="relative">
                {/* Timeline Node */}
                <div className={`absolute -left-[45px] w-10 h-10 rounded-full border-2 bg-[#0b1319] flex items-center justify-center ${getNodeColor(action.status, index === 0)}`}>
                  {getIcon(action.action, action.status)}
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
                          <Bot size={14} className="text-[#00d084]" />
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
        )}

        <div className="mt-12 text-center text-[10px] tracking-widest text-[#8b9eb0] font-mono">
          END OF LOGS
        </div>
      </div>
    </div>
  );
}
