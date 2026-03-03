import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Fleet from './components/Fleet';
import Incidents from './components/Incidents';
import Deliveries from './components/Deliveries';
import NokiaFlows from './components/NokiaFlows';

type ViewId = 'Dashboard' | 'Fleet' | 'Incidents' | 'Deliveries' | 'NokiaFlows';

const VIEWS: Record<ViewId, () => React.ReactElement> = {
  Dashboard,
  Fleet,
  Incidents,
  Deliveries,
  NokiaFlows,
};

export default function App() {
  const [view, setView] = useState<ViewId>('Dashboard');
  const View = VIEWS[view] ?? Dashboard;

  return (
    <div className="bg-gray-950 min-h-screen text-white">
      <Sidebar view={view} onView={v => setView(v as ViewId)} />
      <div className="ml-56 p-8 min-h-screen">
        <View />
      </div>
    </div>
  );
}
