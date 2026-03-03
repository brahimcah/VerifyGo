import { useState } from 'react';
import { FLOW_STEPS, FLOW_DESCRIPTIONS, FLOW_OUTPUTS } from '../lib/constants';

export default function NokiaFlows() {
  const [activeFlow, setActiveFlow] = useState('FLOW 1');
  const steps  = FLOW_STEPS[activeFlow];
  const output = FLOW_OUTPUTS[activeFlow];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-white font-bold text-xl">Nokia NaC Flows</div>
        <div className="text-gray-500 text-sm">Real MCP tools and Gemini 2.5 Flash decisions</div>
      </div>

      {/* Flow selector */}
      <div className="flex gap-2">
        {Object.keys(FLOW_STEPS).map(f => (
          <button
            key={f}
            onClick={() => setActiveFlow(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFlow === f
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'bg-gray-900 text-gray-500 border border-gray-800 hover:text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Steps */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Goal</div>
          <div className="text-gray-300 text-sm mb-5">{FLOW_DESCRIPTIONS[activeFlow]}</div>

          <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Nokia NaC tools → Gemini</div>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-800/40 rounded-lg px-3 py-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step.status === 'ok'
                    ? 'bg-green-400/20 text-green-400'
                    : 'bg-amber-400/20 text-amber-400'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 text-xs font-medium">{step.label}</div>
                  <div className="text-gray-600 text-xs font-mono truncate">{step.tool}</div>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${step.status === 'ok' ? 'bg-green-400' : 'bg-amber-400'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Output + architecture */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">JSON Output — Gemini 2.5 Flash</div>
            <pre className="text-xs text-green-400 font-mono overflow-auto bg-gray-950 rounded-lg p-3 leading-relaxed">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Flow architecture</div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              {['React (Vite)', '→', 'server.py (Flask)', '→', 'ai_agent.py', '→', 'nokia_mcp.py', '→', 'Nokia NaC', '→', 'Gemini 2.5'].map((item, i) => (
                <span key={i} className={item === '→' ? 'text-gray-700' : 'px-2 py-1 bg-gray-800 rounded text-gray-300'}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Key modules</div>
            <div className="space-y-2 text-xs">
              {[
                { file: 'nokia_mcp.py',       desc: 'Streamable HTTP MCP client → Nokia NaC RapidAPI' },
                { file: 'ai_agent.py',         desc: 'Orchestrator — 4 async flows + thread launcher' },
                { file: 'route_monitor.py',    desc: 'Background loop (60s) — detects deviations + alerts' },
                { file: 'incident_manager.py', desc: 'In-memory incident store with CRUD' },
                { file: 'gemini_agent.py',     desc: 'Gemini 2.5 Flash — structured JSON evaluation' },
              ].map(m => (
                <div key={m.file} className="flex gap-3 bg-gray-800/40 rounded-lg px-3 py-2">
                  <span className="font-mono text-blue-400 shrink-0">{m.file}</span>
                  <span className="text-gray-500">{m.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
