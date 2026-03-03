interface Props {
  view: string;
  onView: (v: string) => void;
}

const NAV = [
  { id: 'Dashboard',   icon: '◈',  label: 'Dashboard'   },
  { id: 'Fleet',       icon: '🚛', label: 'Fleet'        },
  { id: 'Incidents',   icon: '⚠️', label: 'Incidents'    },
  { id: 'Deliveries',  icon: '📦', label: 'Deliveries'   },
  { id: 'NokiaFlows',  icon: '📡', label: 'Nokia Flows'  },
];

export default function Sidebar({ view, onView }: Props) {
  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="p-5 border-b border-gray-800">
        <div className="text-blue-400 font-bold text-lg tracking-tight">FleetSync AI</div>
        <div className="text-gray-500 text-xs mt-0.5">Nokia NaC · Gemini 2.5</div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => onView(n.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-all ${
              view === n.id
                ? 'bg-blue-500/15 text-blue-400 font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <span>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500">Nokia NaC connected</span>
        </div>
      </div>
    </div>
  );
}
