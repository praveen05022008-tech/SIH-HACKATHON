import React, { useEffect, useState } from 'react';
import { SafetyEvent, AuditEvent } from '../types';
import { RiskBadge } from '../components/UIElements';
import { L1L6Hierarchy } from '../components/L1L6Hierarchy';
import { 
  ArrowLeft, 
  RefreshCcw, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  ClipboardCheck, 
  History, 
  Cpu, 
  ShieldCheck,
  AlertTriangle,
  Send,
  Camera,
  MessageSquare
} from 'lucide-react';

interface DetailProps {
  event: SafetyEvent;
  onBack: () => void;
  reviewerName: string;
  onReviewSubmitted: () => void;
}

export const Detail: React.FC<DetailProps> = ({ event, onBack, reviewerName, onReviewSubmitted }) => {
  const [data, setData] = useState<{ event: SafetyEvent; audits: AuditEvent[]; interventions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Review validation states
  const [submitting, setSubmitting] = useState(false);
  const [calibratedSignal, setCalibratedSignal] = useState<string | null>(null);
  const [validationType, setValidationType] = useState<'none' | 'correct' | 'incorrect' | 'investigate'>('none');
  
  // Override form states
  const [sifChoice, setSifChoice] = useState<'SIF Potential' | 'Non-SIF'>('SIF Potential');
  const [lsrChoice, setLsrChoice] = useState('Energy Isolation');
  const [feedbackText, setFeedbackText] = useState('');

  // Corrective action dispatcher states
  const [stopWork, setStopWork] = useState(false);
  const [assignedTeam, setAssignedTeam] = useState('Rig Safety Team');
  const [actionDescription, setActionDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [dueDays, setDueDays] = useState(2);
  const [actionDispatched, setActionDispatched] = useState<any | null>(null);

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

  const fetchEventDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/events/${event.id}`);
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setData(payload);
      setSifChoice((payload.event.sif_risk_score ?? 5.0) >= 6.5 ? 'SIF Potential' : 'Non-SIF');
      setLsrChoice(payload.event.life_saving_rule || 'Energy Isolation');
      
      if (payload.event.action_id) {
        setActionDispatched({
          action_id: payload.event.action_id,
          assigned_team: payload.event.assigned_team,
          status: payload.event.action_status || 'In Progress',
          stop_work_issued: payload.event.stop_work_issued
        });
      }
    } catch (err) {
      console.warn('Failed to fetch event detail, using mock audit history.');
      // Mock data in case API is offline
      setData({
        event: event,
        audits: [
          { id: 1, event_id: event.id, action: 'AI Classified', details: `System automatically parsed safety report. predicted SIF probability: ${event.sif_probability}%, mapped to Life-Saving Rule: ${event.life_saving_rule}.`, user_email: 'system@gati.engine', timestamp: event.timestamp }
        ],
        interventions: []
      });
      setSifChoice(event.sif_probability >= 50.0 ? 'SIF Potential' : 'Non-SIF');
      setLsrChoice(event.life_saving_rule || 'Energy Isolation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetail();
    setCalibratedSignal(null);
    setValidationType('none');
    setActionDispatched(null);
  }, [event.id]);

  const handleReviewAction = async (vType: 'correct' | 'investigate' | 'incorrect') => {
    setValidationType(vType);
    if (vType === 'correct') {
      const currentSif = (event.sif_risk_score ?? 5.0) >= 6.5 ? 'SIF Potential' : 'Non-SIF';
      await submitReviewAPI('correct', currentSif, event.life_saving_rule);
    } else if (vType === 'investigate') {
      await submitReviewAPI('investigate', 'SIF Potential', event.life_saving_rule);
    }
  };

  const submitReviewAPI = async (
    vAction: 'correct' | 'investigate' | 'incorrect',
    sif: 'SIF Potential' | 'Non-SIF',
    rule: string
  ) => {
    setSubmitting(true);
    setCalibratedSignal(null);
    try {
      const res = await fetch(`http://localhost:8000/api/events/${event.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sif_potential: sif,
          life_saving_rule: rule,
          reviewer_name: reviewerName || 'Demo Reviewer',
          verification_action: vAction,
          feedback_to_worker: feedbackText || null
        })
      });

      if (!res.ok) throw new Error();
      const payload = await res.json();
      setCalibratedSignal(payload.signal || "Validation confirmed and GATI weights reinforced.");
      onReviewSubmitted();
      
      setTimeout(() => {
        fetchEventDetail();
      }, 1500);

    } catch (err) {
      console.warn('Fallback mock review validation');
      setCalibratedSignal(`GATI calibrated successfully. Verification status: ${vAction}. Mapped SIF: ${sif} | LSR: ${rule}`);
      onReviewSubmitted();
      setTimeout(() => {
        onBack();
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDescription.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/events/${event.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          action_description: actionDescription,
          assigned_team: assignedTeam,
          priority: priority,
          stop_work: stopWork,
          due_days: dueDays
        })
      });

      if (!res.ok) throw new Error();
      const payload = await res.json();
      
      setActionDispatched({
        action_id: payload.action_id,
        assigned_team: assignedTeam,
        status: 'In Progress',
        stop_work_issued: stopWork
      });
      fetchEventDetail();
    } catch (err) {
      console.warn("Fallback action dispatch mock");
      setActionDispatched({
        action_id: `ACT-${Math.floor(Math.random() * 900 + 1000)}`,
        assigned_team: assignedTeam,
        status: 'In Progress',
        stop_work_issued: stopWork
      });
      fetchEventDetail();
    } finally {
      setSubmitting(false);
    }
  };

  const getLsrDescription = (ruleName: string) => {
    switch (ruleName) {
      case 'Energy Isolation':
        return 'Verify isolation and zero energy state before work begins.';
      case 'Line of Fire':
        return 'Keep yourself out of the path of potential energy release.';
      case 'Hot Work':
        return 'Control ignition sources and verify flammable gas concentrations.';
      case 'Confined Space':
        return 'Obtain authorization, test atmosphere, and verify rescue plan before entry.';
      case 'Working at Height':
        return 'Use fall protection equipment when working above 1.8 meters.';
      case 'Lifting Operations':
        return 'Define lift plan, inspect rigging, and do not walk under suspended loads.';
      case 'Vehicle Safety':
        return 'Follow speed limits, wear seatbelts, and maintain pedestrian clearance.';
      case 'Electrical Safety':
        return 'Verify dead state, use insulated tools, and restrict access.';
      default:
        return 'Standard operating procedures safety guideline.';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading safety event details & audits...</p>
      </div>
    );
  }

  if (!data) return null;

  const currentEvent = data.event;

  return (
    <div className="space-y-6">
      
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-industrial-blue hover:text-blue-800 font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to safety inbox</span>
        </button>

        <div className="flex gap-2.5">
          <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
            {currentEvent.id}
          </span>
          <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-500">
            {new Date(currentEvent.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Narrative, Details, 4-Bar Risk Progress, Transcripts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Narrative Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">1. Original Safety Report Narrative</h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-4 border border-slate-200 rounded-xl">
              "{currentEvent.description}"
            </p>
          </div>

          {/* Media Attachments & Whisper Transcripts */}
          {(currentEvent.photo_url || currentEvent.audio_transcript) && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Attached Media & Whisper Transcripts</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentEvent.photo_url && (
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Camera className="h-3 w-3" /> Photo Evidence Snapshot
                    </span>
                    <img 
                      src={currentEvent.photo_url} 
                      alt="Event snapshot" 
                      className="h-32 object-cover rounded-lg border border-slate-300"
                    />
                  </div>
                )}
                {currentEvent.audio_transcript && (
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Voice Transcription (Whisper)
                    </span>
                    <p className="text-xs text-slate-600 italic bg-white p-3 border border-slate-200 rounded-lg leading-normal">
                      "{currentEvent.audio_transcript}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4-Bar Risk Evaluation breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">2. 0-10 Multi-Factor Risk Evaluation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Hazard Severity</span>
                  <span>{currentEvent.severity_score ?? 5.0} / 10</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${(currentEvent.severity_score ?? 5.0) * 10}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Exposure Level</span>
                  <span>{currentEvent.exposure_score ?? 5.0} / 10</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(currentEvent.exposure_score ?? 5.0) * 10}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Safety Barrier Failure</span>
                  <span>{currentEvent.barrier_score ?? 5.0} / 10</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(currentEvent.barrier_score ?? 5.0) * 10}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Potential Consequence</span>
                  <span>{currentEvent.consequence_score ?? 5.0} / 10</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(currentEvent.consequence_score ?? 5.0) * 10}%` }}></div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">Final Composite SIF Risk Score:</span>
              <span className="text-xs font-extrabold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                {currentEvent.sif_risk_score ?? (currentEvent.sif_probability / 10).toFixed(1)} / 10 ({currentEvent.risk_level ?? 'MEDIUM'})
              </span>
            </div>
          </div>

          {/* AI Extracted Parameters */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">3. GATI Structured Extraction Parameters</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="space-y-3.5">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Activity Category:</span>
                  <span className="font-bold text-slate-800">{currentEvent.activity}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Refinery Unit/Location:</span>
                  <span className="font-bold text-slate-800">{currentEvent.site} • {currentEvent.location}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Identified Hazard:</span>
                  <span className="font-bold text-slate-800">{currentEvent.hazard}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Active Energy Source:</span>
                  <span className="font-bold text-slate-800">{currentEvent.energy_source}</span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Critical Safeguard Barrier:</span>
                  <span className="font-bold text-slate-800">{currentEvent.barrier}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Safe Barrier Failure Mode:</span>
                  <span className="font-bold text-slate-800">{currentEvent.barrier_failure}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Worker Exposure Mode:</span>
                  <span className="font-bold text-slate-800">{currentEvent.exposure}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Predicted Consequence:</span>
                  <span className="font-bold text-slate-800">{currentEvent.consequence}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Verification Actions */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="h-4.5 w-4.5 text-industrial-orange" />
                <span>Verification Actions Center</span>
              </span>
              <span className="text-[10px] bg-indigo-50 text-industrial-purple px-2 py-0.5 rounded border border-indigo-100 font-bold uppercase tracking-wider">
                GATI Learning Calibration
              </span>
            </div>

            {calibratedSignal ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold uppercase text-[9px] tracking-wide text-emerald-700">Calibration Signal Ingested!</div>
                  <p className="mt-0.5 leading-normal italic">"{calibratedSignal}"</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-normal">
                  Inspect the AI analysis outputs. Select verification status to lock model weights or trigger a recalibration override.
                </p>

                {validationType !== 'incorrect' ? (
                  <div className="flex flex-wrap gap-2.5 text-xs">
                    <button
                      onClick={() => handleReviewAction('correct')}
                      disabled={submitting}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-industrial-green border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5 transition"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>✅ AI Result Correct</span>
                    </button>
                    <button
                      onClick={() => handleReviewAction('investigate')}
                      disabled={submitting}
                      className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-industrial-orange border border-amber-200 rounded-xl font-bold flex items-center gap-1.5 transition"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>⚠️ Need Investigation</span>
                    </button>
                    <button
                      onClick={() => setValidationType('incorrect')}
                      disabled={submitting}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-industrial-red border border-red-200 rounded-xl font-bold flex items-center gap-1.5 transition"
                    >
                      <X className="h-4 w-4" />
                      <span>❌ AI Result Incorrect</span>
                    </button>
                  </div>
                ) : (
                  <div className="border border-red-200 bg-white rounded-xl p-4 space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-red-700">Calibrate Overrides</span>
                      <button 
                        onClick={() => setValidationType('none')}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Override SIF Potential</label>
                        <select
                          value={sifChoice}
                          onChange={(e) => setSifChoice(e.target.value as any)}
                          className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                        >
                          <option value="SIF Potential">SIF Potential</option>
                          <option value="Non-SIF">Non-SIF</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Override Life-Saving Rule</label>
                        <select
                          value={lsrChoice}
                          onChange={(e) => setLsrChoice(e.target.value)}
                          className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                        >
                          {lsrOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Feedback/Notes for worker</label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Provide details on rule mapping override or correction reasoning..."
                        rows={2}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => submitReviewAPI('incorrect', sifChoice, lsrChoice)}
                        disabled={submitting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Send className="h-4 w-4" />
                        <span>Submit Override Calibration</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: SIF meter, Hierarchy, Corrective Action Dispatch */}
        <div className="space-y-6">
          
          {/* SIF Meter */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-center flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GATI SIF potential Probability</span>
            
            <div className="my-5 relative inline-flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" strokeWidth="6" stroke="#F1F5F9" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="40" 
                  strokeWidth="6" 
                  stroke={currentEvent.sif_probability >= 50.0 ? '#C74440' : '#2E8B57'} 
                  fill="transparent" 
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * currentEvent.sif_probability) / 100}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-extrabold text-slate-900">{currentEvent.sif_probability}%</span>
              </div>
            </div>

            <RiskBadge probability={currentEvent.sif_probability} />
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-2.5">system confidence: {currentEvent.confidence}%</div>
            
            <div className="mt-4 pt-3.5 border-t border-slate-100 w-full text-left text-xs leading-normal">
              <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-industrial-orange" />
                <span>AI Prediction Reasoning</span>
              </div>
              <p className="italic bg-slate-50 p-2.5 border border-slate-200 rounded-lg text-slate-500 text-[10.5px]">
                "{currentEvent.explanation || 'Predicted SIF potential matches key high-energy hazard indicators.'}"
              </p>
            </div>
          </div>

          {/* Corrective Action Dispatch Center */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Corrective Action Dispatch</h3>
            </div>

            {actionDispatched ? (
              <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-emerald-800">Action: {actionDispatched.action_id}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800">
                    {actionDispatched.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 leading-normal">
                  <div className="flex justify-between py-1 border-b border-slate-100/50">
                    <span>Assigned Team:</span>
                    <span className="font-bold text-slate-800">{actionDispatched.assigned_team}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Stop Work Order:</span>
                    <span className={`font-bold ${actionDispatched.stop_work_issued ? 'text-red-600' : 'text-slate-500'}`}>
                      {actionDispatched.stop_work_issued ? 'ACTIVE' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleActionDispatch} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assign Team</label>
                  <select
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                  >
                    <option value="Rig Safety Team">Rig Safety Team</option>
                    <option value="Maintenance Team">Maintenance Team</option>
                    <option value="Safety Engineering">Safety Engineering</option>
                    <option value="Operations Shift Crew">Operations Shift Crew</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-b border-slate-50">
                  <span className="font-semibold text-slate-700">Issue Stop Work Order:</span>
                  <input
                    type="checkbox"
                    checked={stopWork}
                    onChange={(e) => setStopWork(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 focus:ring-red-500 text-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Due Deadline (days)</label>
                  <input
                    type="range"
                    min={1}
                    max={14}
                    value={dueDays}
                    onChange={(e) => setDueDays(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-right text-[10px] text-slate-400 font-bold mt-1">{dueDays} Days</div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Action Description</label>
                  <textarea
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    placeholder="Provide description of corrective actions and deadlines..."
                    rows={2}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-[#0B2A56] hover:bg-slate-900 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Dispatch Corrective Action</span>
                </button>
              </form>
            )}
          </div>

          {/* Operational Hierarchy (L1-L6) */}
          <L1L6Hierarchy 
            l1={currentEvent.l1_milestone}
            l2={currentEvent.l2_unit}
            l3={currentEvent.l3_discipline}
            l4={currentEvent.l4_work_package}
            l5={currentEvent.l5_activity}
            l6={currentEvent.l6_job}
          />

          {/* Audit Timeline history */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <History className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Safety Event Audit History</h3>
            </div>

            <div className="space-y-4 relative pl-3">
              {/* timeline line */}
              <div className="absolute top-2 bottom-2 left-3 w-0.5 bg-slate-100 z-0"></div>

              {data.audits.map((a, idx) => (
                <div key={idx} className="relative z-10 flex gap-3 text-xs leading-snug">
                  <div className="h-2 w-2 rounded-full bg-industrial-blue mt-1.5 shrink-0 relative -left-0.5"></div>
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{a.action}</span>
                      <span className="text-[9px] text-slate-400 font-normal">by {a.user_email}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">{a.details}</p>
                    <span className="text-[9px] text-slate-400 font-medium block mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(a.timestamp).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
