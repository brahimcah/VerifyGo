/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Timeline from './components/Timeline';
import NewDelivery from './components/NewDelivery';
import TrustReceipt from './components/TrustReceipt';
import BottomNav from './components/BottomNav';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="w-full h-screen bg-[#0b1319] overflow-hidden flex justify-center">
      {/* Mobile container constraint for desktop viewing */}
      <div className="w-full max-w-md h-full relative border-x border-[#23303b] shadow-2xl flex flex-col">
        
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'timeline' && <Timeline onBack={() => setActiveTab('dashboard')} />}
          {activeTab === 'new' && <NewDelivery onBack={() => setActiveTab('dashboard')} onDispatch={() => setActiveTab('dashboard')} />}
          {activeTab === 'receipt' && <TrustReceipt onClose={() => setActiveTab('dashboard')} />}
          
          {/* Placeholders for other tabs */}
          {activeTab === 'fleet' && (
            <div className="flex flex-col h-full items-center justify-center text-[#8b9eb0] gap-4">
              <div className="text-lg">Fleet View</div>
              <button 
                onClick={() => setActiveTab('receipt')}
                className="bg-[#00a8ff] text-white px-4 py-2 rounded-lg"
              >
                View Trust Receipt
              </button>
            </div>
          )}
          {activeTab === 'settings' && <div className="flex h-full items-center justify-center text-[#8b9eb0]">Settings View</div>}
        </div>

        {/* Show bottom nav unless in specific full-screen flows */}
        {activeTab !== 'receipt' && activeTab !== 'new' && activeTab !== 'timeline' && (
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </div>
    </div>
  );
}
