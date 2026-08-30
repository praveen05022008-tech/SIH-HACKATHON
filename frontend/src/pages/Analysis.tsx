import React, { useState } from 'react';
import { MayanPipeline } from '../components/MayanPipeline';
import { SafetyEvent } from '../types';
import { 
  FileText, 
  Send, 
  Trash2, 
  ShieldAlert, 
  Activity, 
  HelpCircle,
  Play,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

interface AnalysisProps {
  onEventCreated: () => void;
  onViewEvent: (event: SafetyEvent) => void;
  triggerNotification: (msg: string) => void;
}

export const Analysis: React.FC<AnalysisProps> = ({ onEventCreated, onViewEvent, triggerNotification }) => {
  const [text, setText] = useState('');
  const [stage, setStage] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const demoPresets = [
    {
      title: 'Energy Isolation DBB',
      text: 'During maintenance activity near the crude unit, a worker was observed entering the work area while the associated energy isolation was not independently verified. The line was believed to be depressurised but isolation status was unclear.'
    },
    {
      title: 'Working at Height Platforms',
      text: 'Scaffolding team was seen performing pipe adjustments at Refinery D VDU column on scaffolding level 3 without securing safety harness hooks to lifelines. Scaffolding tag was green but planks were loose.'
    },
    {
      title: 'Confined Space Atmosphere',
      text: 'Technician entered reactor separator vessel V-305 at Refinery B FCCU area today to inspect internal tray cracks. Blower ventilation was running, but no gas monitoring test had been performed or validated in the permit.'
    },
    {
      title: 'Line-of-Fire Heavy Lift',
      text: 'Rigger walked inside the barricaded zone directly underneath a 15-ton piping load suspended by the crane at the utility block. The load was swaying in strong wind gusts. Rigging supervisor did not stop work.'
    }
  ];

  const handlePresetSelect = (presetText: string) => {
    setText(presetText);
    setResult(null);
    setStage(0);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setProcessing(true);
    setResult(null);
    
    // Simulate pipeline stage animations step-by-step for hackathon high fidelity
    const stepDuration = 500;
    
    setStage(1); // M1
    await new Promise(r => setTimeout(r, stepDuration));
    
    setStage(2); // M2
    await new Promise(r => setTimeout(r, stepDuration));
    
    setStage(3); // M3
    await new Promise(r => setTimeout(r, stepDuration));
    
    setStage(4); // M4
    await new Promise(r => setTimeout(r, stepDuration));
    
    setStage(5); // M5
    await new Promise(r => setTimeout(r, stepDuration));
    
    setStage(6); // M6
    await new Promise(r => setTimeout(r, stepDuration));

    try {
      const res = await fetch('http://localhost:8000/api/events/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text }),
      });

      if (!res.ok) throw new Error();
      const payload = await res.json();
      
      setResult(payload.analysis);
      setResult((prev: any) => ({ ...prev, id: payload.event_id }));
      
      triggerNotification(`New safety event analyzed: ${payload.event_id}`);
      onEventCreated(); // Refresh dashboard data in parent state
    } catch (err) {
      console.warn('Analysis API failed, falling back to local deterministic model');
      // Offline fallback: Run client-side analyze mock matching the backend logic
      const words = text.toLowerCase();
      
      let mappedRule = 'Line of Fire';
      if (words.includes('isolation') || words.includes('valve') || words.includes('loto')) mappedRule = 'Energy Isolation';
      else if (words.includes('scaffold') || words.includes('height') || words.includes('ladder')) mappedRule = 'Working at Height';
      else if (words.includes('confined') || words.includes('vessel') || words.includes('gas test')) mappedRule = 'Confined Space';
      
      const prob = words.includes('isolation') || words.includes('height') || words.includes('confined') ? 94.0 : 15.0;

      const fallbackAnalysis = {
        id: `EVT-MOCK-${Math.floor(Math.random() * 9000 + 1000)}`,
        site: 'Refinery A',
        unit: 'CDU',
        location: 'CDU - Area 4',
        activity: words.includes('isolation') ? 'Maintenance / Valve Work' : words.includes('height') ? 'Working at Height' : 'Routine Maintenance',
        description: text,
        hazard: 'Unexpected energy release or physical fall',
        energy_source: 'Mechanical / Gravity',
        barrier: 'LOTO Locks & Permits',
        barrier_failure: 'Isolation verification omitted',
        exposure: 'Personnel in active work zone',
        consequence: 'Serious injury or fatality potential',
        sif_probability: prob,
        confidence: 85.0,
        life_saving_rule: mappedRule,
        explanation: 'Observation reveals unverified hazards in the work area during operations.',
        recommended_action: 'Verify isolation and work permit controls before work proceeds.',
        l1_milestone: 'Refinery Turnaround 2026',
        l2_unit: 'CDU Area',
        l3_discipline: 'Mechanical Maintenance',
        l4_work_package: 'CDU Turnaround Maintenance Package',
        l5_activity: 'Valve Maintenance',
        l6_job: 'Isolate valve line V-204'
      };
      
      setResult(fallbackAnalysis);
      triggerNotification(`Demo safety event created locally: ${fallbackAnalysis.id}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setText('');
    setStage(0);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Simulation & Presets */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Report Assessment Engine</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Enter free-text safety observations to extract SIF potential</p>
          </div>
          <div className="flex gap-2">
            {demoPresets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetSelect(p.text)}
                className="px-2.5 py-1.5 border border-slate-200 hover:border-industrial-blue hover:bg-industrial-blue/5 rounded-lg text-[10px] font-bold text-slate-700 transition"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="space-y-4">
          <div className="relative shadow-2xs">
            <textarea
              rows={5}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (result) setResult(null);
                if (stage > 0) setStage(0);
              }}
              placeholder="Paste raw safety observation text, near-miss report, or field narrative here..."
              className="block w-full p-4 border border-slate-300 rounded-xl focus:ring-1 focus:ring-industrial-blue focus:border-industrial-blue text-xs placeholder-slate-400 bg-slate-50/50"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear</span>
            </button>
            <button
              onClick={handleAnalyze}
              disabled={processing || !text.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-industrial-navy hover:bg-[#071D3A] text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>Analyze Report</span>
            </button>
          </div>
        </div>

      </div>

      {/* SIF-SHIELD AI M1-M6 Pipeline visualization */}
      {(processing || stage > 0) && (
        <MayanPipeline activeStage={stage} isProcessing={processing} />
      )}

      {/* AI Assessment results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Main SIF parameters card */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">safety event generated</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">{result.id}</h4>
                </div>
                <span className="text-[10px] font-bold bg-amber-50 text-industrial-orange px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wider">
                  AI-generated assessment — HSE review required.
                </span>
              </div>

              {/* Extraction Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Mapped Rule:</span>
                    <span className="font-bold text-slate-800">{result.life_saving_rule}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Refinery Unit:</span>
                    <span className="font-bold text-slate-800">{result.site} / {result.unit}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Activity:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]" title={result.activity}>{result.activity}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Hazard Category:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]" title={result.hazard}>{result.hazard}</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Energy Source:</span>
                    <span className="font-bold text-slate-800">{result.energy_source}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Barrier Failure:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]" title={result.barrier_failure}>{result.barrier_failure}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Personnel Exposure:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]" title={result.exposure}>{result.exposure}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Potential Consequence:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]" title={result.consequence}>{result.consequence}</span>
                  </div>
                </div>

              </div>

              {/* Recommended Intervention */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 mt-6">
                <div className="text-[10px] font-bold text-industrial-blue uppercase tracking-wider">Recommended Action</div>
                <p className="text-xs text-slate-700 font-semibold mt-1">{result.recommended_action}</p>
              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => onViewEvent({
                  id: result.id,
                  timestamp: new Date().toISOString(),
                  site: result.site,
                  unit: result.unit,
                  location: result.location,
                  activity: result.activity,
                  description: text,
                  hazard: result.hazard,
                  energy_source: result.energy_source,
                  barrier: result.barrier,
                  barrier_failure: result.barrier_failure,
                  exposure: result.exposure,
                  consequence: result.consequence,
                  sif_probability: result.sif_probability,
                  confidence: result.confidence,
                  life_saving_rule: result.life_saving_rule,
                  status: 'Needs Review',
                  reviewer: null,
                  evidence: text,
                  l1_milestone: result.l1_milestone,
                  l2_unit: result.l2_unit,
                  l3_discipline: result.l3_discipline,
                  l4_work_package: result.l4_work_package,
                  l5_activity: result.l5_activity,
                  l6_job: result.l6_job
                })}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <span>Inspect Full Event Detail</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>

          {/* SIF Assessment & Reasoning card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">SIF Assessment Score</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">GATI semantic evaluation metrics</p>
              </div>

              {/* SIF Meter */}
              <div className="text-center py-6">
                <div className="relative inline-flex items-center justify-center">
                  {/* Circle background */}
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" strokeWidth="8" stroke="#F1F5F9" fill="transparent" />
                    <circle 
                      cx="56" 
                      cy="56" 
                      r="48" 
                      strokeWidth="8" 
                      stroke={result.sif_probability >= 50.0 ? '#C74440' : '#2E8B57'} 
                      fill="transparent" 
                      strokeDasharray="301.6"
                      strokeDashoffset={301.6 - (301.6 * result.sif_probability) / 100}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-extrabold text-slate-900">{result.sif_probability}%</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">sif probability</span>
                  </div>
                </div>

                <div className="mt-4">
                  <span className={`inline-block px-3 py-1 text-xs font-bold border rounded-full ${
                    result.sif_probability >= 50.0 
                      ? 'bg-red-50 text-industrial-red border-red-200' 
                      : 'bg-emerald-50 text-industrial-green border-emerald-200'
                  }`}>
                    {result.sif_probability >= 50.0 ? 'HIGH SIF POTENTIAL' : 'NON-SIF INCIDENT'}
                  </span>
                </div>
              </div>

              {/* Confidence factor */}
              <div className="flex justify-between items-center text-xs px-2 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 font-medium">System Classifier Confidence:</span>
                <span className="font-extrabold text-slate-800">{result.confidence}%</span>
              </div>

              {/* Reasoning summary */}
              <div className="mt-5 text-xs text-slate-600 leading-normal">
                <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>AI Reasoning Summary</span>
                </div>
                <p className="italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">{result.explanation}</p>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
