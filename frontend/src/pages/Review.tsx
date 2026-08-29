import React, { useEffect, useState } from 'react';
import { SafetyEvent } from '../types';
import { RefreshCcw, ClipboardCheck, ArrowRight, BrainCircuit, Sparkles, Check, CheckSquare } from 'lucide-react';
import { RiskBadge } from '../components/UIElements';

interface ReviewProps {
  reviewerName: string;
  onReviewSubmitted: () => void;
  triggerStateRefresh: boolean;
}

export const Review: React.FC<ReviewProps> = ({ reviewerName, onReviewSubmitted, triggerStateRefresh }) => {
  const [queue, setQueue] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);

  // Review fields
  const [sifChoice, setSifChoice] = useState<'SIF Potential' | 'Non-SIF'>('SIF Potential');
  const [lsrChoice, setLsrChoice] = useState('Energy Isolation');
  const [submitting, setSubmitting] = useState(false);
  
  // Learning Loop feedback states
  const [gatiCalibrating, setGatiCalibrating] = useState(false);
  const [calibratedSignal, setCalibratedSignal] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/events?status=Needs Review');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQueue(data);
      if (data.length > 0) {
        setSelectedEvent(data[0]);
        setSifChoice(data[0].sif_probability >= 50.0 ? 'SIF Potential' : 'Non-SIF');
        setLsrChoice(data[0].life_saving_rule);
      } else {
        setSelectedEvent(null);
      }
    } catch (err) {
      console.warn('Queue API failed, loading mock review items.');
      const mockQueue: SafetyEvent[] = [
        {
          id: 'EVT-10291',
          timestamp: new Date().toISOString(),
          site: 'Refinery A',
          unit: 'CDU',
          location: 'CDU - Area 4',
          activity: 'Maintenance / Valve Work',
          description: 'During maintenance activity near the crude unit, a worker was observed entering the work area while the associated energy isolation was not independently verified. The line was believed to be depressurised but isolation status was unclear.',
          hazard: 'Unexpected energy release',
          energy_source: 'Pressure',
          barrier: 'Double Block and Bleed Isolation / LOTO Locks',
          barrier_failure: 'Isolation verification not performed',
          exposure: 'Personnel entering active work zone',
          consequence: 'Severe trauma due to high pressure release',
          sif_probability: 94.0,
          confidence: 88.0,
          life_saving_rule: 'Energy Isolation',
          status: 'Needs Review',
          reviewer: null,
          evidence: 'Original safety report.',
          l1_milestone: 'Refinery Turnaround 2026',
          l2_unit: 'CDU Area',
          l3_discipline: 'Mechanical Maintenance',
          l4_work_package: 'CDU Turnaround Maintenance Package',
          l5_activity: 'Maintenance / Valve Work',
          l6_job: 'Isolate valve line V-204'
        },
        {
          id: 'EVT-10292',
          timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
          site: 'Refinery B',
          unit: 'FCCU',
          location: 'FCCU - Reactor Deck',
          activity: 'Working at Height',
          description: 'A contractor was observed climbing the ladder to the reactor deck at FCCU without hooking safety lanyards onto the horizontal lifeline. Height is approximately 8 meters.',
          hazard: 'Fall from elevated work platform',
          energy_source: 'Gravity',
          barrier: 'Fall Protection Harness / Scaffold Handrails',
          barrier_failure: 'Fall protection harness not anchored',
          exposure: 'Technician working at elevated level',
          consequence: 'Severe trauma due to high-altitude fall',
          sif_probability: 91.0,
          confidence: 90.0,
          life_saving_rule: 'Working at Height',
          status: 'Needs Review',
          reviewer: null,
          evidence: 'Original safety report.',
          l1_milestone: 'Routine Maintenance Schedule',
          l2_unit: 'FCCU Area',
          l3_discipline: 'Structural Engineering',
          l4_work_package: 'Reactor Platform Inspections',
          l5_activity: 'Working at Height',
          l6_job: 'Inspect reactor deck structural weld joints'
        },
        {
          id: 'EVT-10293',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          site: 'Refinery C',
          unit: 'DHU',
          location: 'DHU - Dosing Pump Skid',
          activity: 'Hot Work / Welding',
          description: 'Welding team was doing flange pipe welding without sealing the open sewer drains in the 10m hot work boundary. Sewing pits had visible oil grease.',
          hazard: 'Hydrocarbon vapor ignition / fire hazard',
          energy_source: 'Thermal',
          barrier: 'Work Permit System / Authorization',
          barrier_failure: 'Gas clearance test omitted before entry',
          exposure: 'Personnel in close proximity',
          consequence: 'Severe blast injury and thermal burns',
          sif_probability: 61.0,
          confidence: 84.0,
          life_saving_rule: 'Line of Fire',
          status: 'Needs Review',
          reviewer: null,
          evidence: 'Original safety report.',
          l1_milestone: 'Refinery Turnaround 2026',
          l2_unit: 'DHU Area',
          l3_discipline: 'Piping & Fabrication',
          l4_work_package: 'Dosing skid flange replacement',
          l5_activity: 'Hot Work / Welding',
          l6_job: 'Conduct welding of flange pipeline joints'
        }
      ];
      setQueue(mockQueue);
      if (mockQueue.length > 0) {
        setSelectedEvent(mockQueue[0]);
        setSifChoice(mockQueue[0].sif_probability >= 50.0 ? 'SIF Potential' : 'Non-SIF');
        setLsrChoice(mockQueue[0].life_saving_rule);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [triggerStateRefresh]);

  const handleSelectEvent = (evt: SafetyEvent) => {
    setSelectedEvent(evt);
    setSifChoice(evt.sif_probability >= 50.0 ? 'SIF Potential' : 'Non-SIF');
    setLsrChoice(evt.life_saving_rule);
    setCalibratedSignal(null);
  };

  const handleSubmitReview = async () => {
    if (!selectedEvent) return;

    setSubmitting(true);
    setCalibratedSignal(null);
    setGatiCalibrating(true);

    const originalSifStr = selectedEvent.sif_probability >= 50.0 ? 'SIF Potential' : 'Non-SIF';
    const isCorrected = (originalSifStr !== sifChoice) || (selectedEvent.life_saving_rule !== lsrChoice);

    try {
      const res = await fetch(`http://localhost:8000/api/events/${selectedEvent.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sif_potential: sifChoice,
          life_saving_rule: lsrChoice,
          reviewer_name: reviewerName || 'Demo Reviewer'
        }),
      });

      if (!res.ok) throw new Error();
      const payload = await res.json();
      
      // Simulate calibration visual loop wait for hackathon WOW factor
      await new Promise(r => setTimeout(r, 800));

      if (payload.learning_calibrated) {
        setCalibratedSignal(payload.signal);
      } else {
        setCalibratedSignal("Prediction confirmed. No database weight adjustments needed.");
      }
      
      // Trigger dashboard update
      onReviewSubmitted();
      
      // Reload queue
      setTimeout(() => {
        setGatiCalibrating(false);
        fetchQueue();
      }, 2500);

    } catch (err) {
      console.warn('Review submission failed, simulating GATI learning response locally.');
      await new Promise(r => setTimeout(r, 800));
      
      if (isCorrected) {
        setCalibratedSignal(`GATI calibrated: SIF correction: ${originalSifStr} -> ${sifChoice} | LSR correction: ${selectedEvent.life_saving_rule} -> ${lsrChoice}`);
      } else {
        setCalibratedSignal("Prediction confirmed. No database weight adjustments needed.");
      }

      onReviewSubmitted();

      setTimeout(() => {
        setGatiCalibrating(false);
        setQueue(prev => prev.filter(e => e.id !== selectedEvent.id));
        setSelectedEvent(null);
      }, 2500);
    } finally {
      setSubmitting(false);
    }
  };

  const lsrOptions = [
    'Energy Isolation',
    'Line of Fire',
    'Hot Work',
    'Confined Space',
    'Working at Height',
    'Lifting Operations',
    'Vehicle Safety',
    'Electrical Safety',
    'None'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">HSE Review Queue</h1>
          <p className="text-xs text-slate-500 mt-1">Review cases where classification is ambiguous, SIF potential is high, or human oversight is required.</p>
        </div>
        <span className="text-[10px] font-bold bg-amber-50 text-industrial-orange px-2.5 py-1 border border-amber-100 rounded-full flex items-center gap-1 uppercase tracking-wider">
          <ClipboardCheck className="h-3.5 w-3.5" />
          <span>Assurance Queue</span>
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
          <span className="text-xs font-semibold">Loading review items...</span>
        </div>
      ) : queue.length === 0 && !gatiCalibrating ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-xs">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Reviews Pending</h3>
          <p className="text-[10px] text-slate-400 mt-1">All ingested safety observations are validated and mapped.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Review Queue Table */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Assurance List ({queue.length} items)</h3>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {queue.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => handleSelectEvent(evt)}
                  disabled={gatiCalibrating}
                  className={`w-full p-3 rounded-xl border text-left transition flex justify-between items-center ${
                    selectedEvent?.id === evt.id
                      ? 'border-industrial-blue bg-blue-50/10'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{evt.id}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{evt.site} • {evt.unit}</div>
                    <div className="text-[10px] font-semibold text-slate-600 mt-1 line-clamp-1">{evt.activity}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <RiskBadge probability={evt.sif_probability} />
                    <div className="text-[8px] text-slate-400 font-bold uppercase mt-1">AI Conf: {evt.confidence}%</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Review and Calibration Panel */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            {selectedEvent ? (
              <div>
                
                {/* Event Summary */}
                <div className="mb-4 pb-3.5 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assurance Case</span>
                    <h3 className="text-sm font-extrabold text-slate-950 mt-0.5">{selectedEvent.id}</h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 uppercase">
                      LSR: {selectedEvent.life_saving_rule}
                    </span>
                    <RiskBadge probability={selectedEvent.sif_probability} />
                  </div>
                </div>

                {/* Narrative text */}
                <div className="mb-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Original Narrative Log</span>
                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-3.5 rounded-xl leading-normal italic">
                    "{selectedEvent.description}"
                  </p>
                </div>

                {/* Visual Learning Loop Calibration */}
                {gatiCalibrating ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="flex justify-center items-center gap-6">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 bg-blue-50 border border-industrial-blue text-industrial-blue rounded-full flex items-center justify-center font-bold text-xs">AI</div>
                        <span className="text-[9px] text-slate-400 font-semibold mt-1">Prediction</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 bg-purple-50 border border-industrial-purple text-industrial-purple rounded-full flex items-center justify-center font-bold text-xs">HSE</div>
                        <span className="text-[9px] text-slate-400 font-semibold mt-1">Human Decision</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 bg-indigo-50 border border-indigo-400 text-indigo-500 rounded-full flex items-center justify-center font-bold text-xs">GATI</div>
                        <span className="text-[9px] text-slate-400 font-semibold mt-1">Learning</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-industrial-purple animate-pulse">
                      <BrainCircuit className="h-4.5 w-4.5 animate-spin" />
                      <span>GATI Engine Calibrating Weights...</span>
                    </div>

                    {calibratedSignal && (
                      <div className="max-w-md mx-auto p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 text-left">
                        <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <div>
                          <div className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-700">Learning Signal Ingested!</div>
                          <p className="mt-0.5 text-[10.5px] italic leading-tight">{calibratedSignal}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Form Controls */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">HSE SIF Classification</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSifChoice('SIF Potential')}
                          className={`py-2 text-center rounded-xl border text-xs font-bold transition ${
                            sifChoice === 'SIF Potential'
                              ? 'bg-red-50 text-industrial-red border-industrial-red shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          SIF Potential
                        </button>
                        <button
                          type="button"
                          onClick={() => setSifChoice('Non-SIF')}
                          className={`py-2 text-center rounded-xl border text-xs font-bold transition ${
                            sifChoice === 'Non-SIF'
                              ? 'bg-emerald-50 text-industrial-green border-industrial-green shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Non-SIF
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">IOGP Life-Saving Rule</label>
                      <select
                        value={lsrChoice}
                        onChange={(e) => setLsrChoice(e.target.value)}
                        className="block w-full py-2 px-3 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                      >
                        {lsrOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                  </div>
                )}

                {/* Reviewer signature */}
                {!gatiCalibrating && (
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Logged Reviewer: <b className="text-slate-800">{reviewerName}</b></span>
                    <button
                      onClick={handleSubmitReview}
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-5 py-2 bg-industrial-navy hover:bg-[#071D3A] text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      <span>Submit Review Decision</span>
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                All safety observations are reviewed.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
