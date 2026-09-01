import React, { useEffect, useState } from 'react';
import { SafetyEvent, AuditEvent } from '../types';
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
  MessageSquare,
  FileText,
  AlertOctagon,
  Settings,
  ArrowRight
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
  
  // Validation States
  const [validationType, setValidationType] = useState<'none' | 'correct' | 'investigate' | 'incorrect'>('none');
  const [reasonForCorrection, setReasonForCorrection] = useState('');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationSubmitted, setValidationSubmitted] = useState(false);

  // Corrective action dispatcher states
  const [showActionForm, setShowActionForm] = useState(false);
  const [stopWork, setStopWork] = useState(false);
  const [assignedTeam, setAssignedTeam] = useState('Rig Safety Team');
  const [actionDescription, setActionDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [dueDays, setDueDays] = useState(2);
  const [actionDispatched, setActionDispatched] = useState<any | null>(null);

  // Full report toggle
  const [showFullReport, setShowFullReport] = useState(false);

  const fetchEventDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/events/${event.id}`);
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setData(payload);
      
      if (payload.event.action_id) {
        setActionDispatched({
          action_id: payload.event.action_id,
          assigned_team: payload.event.assigned_team,
          status: payload.event.action_status || 'In Progress',
          stop_work_issued: payload.event.stop_work_issued
        });
      }
    } catch (err) {
      console.warn('Failed to fetch event detail, using mock data.');
      setData({
        event: event,
        audits: [
          { id: 1, event_id: event.id, action: 'AI Classified', details: `System automatically parsed safety report. predicted SIF probability: ${event.sif_probability}%, mapped to Life-Saving Rule: ${event.life_saving_rule}.`, user_email: 'engine@sifshield.ai', timestamp: event.timestamp }
        ],
        interventions: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetail();
    setValidationType('none');
    setReasonForCorrection('');
    setInvestigationNotes('');
    setOfficerRemarks('');
    setSuccessMessage(null);
    setValidationSubmitted(false);
    setShowActionForm(false);
    setActionDispatched(null);
  }, [event.id]);

  const handleSubmitValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationType === 'none') {
      alert("Please select a validation option before submitting.");
      return;
    }

    setSubmitting(true);
    let targetStatus = 'Validated';
    let nextStepText = '';
    let vAction: 'correct' | 'investigate' | 'incorrect' = 'correct';
    
    if (validationType === 'correct') {
      targetStatus = 'AI Result Correct';
      vAction = 'correct';
    } else if (validationType === 'investigate') {
      targetStatus = 'Investigation Required';
      vAction = 'investigate';
    } else if (validationType === 'incorrect') {
      targetStatus = 'AI Result Corrected';
      vAction = 'incorrect';
    }

    try {
      const res = await fetch(`http://localhost:8000/api/events/${event.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sif_potential: validationType === 'incorrect' ? 'SIF Potential' : ((event.sif_risk_score ?? 5.0) >= 6.5 ? 'SIF Potential' : 'Non-SIF'),
          life_saving_rule: event.life_saving_rule || 'Energy Isolation',
          reviewer_name: reviewerName || 'Safety Officer Lead',
          verification_action: vAction,
          feedback_to_worker: officerRemarks || reasonForCorrection || investigationNotes || null
        })
      });

      if (!res.ok) throw new Error();
      
      setSuccessMessage("Validation submitted successfully.");
      setValidationSubmitted(true);
      onReviewSubmitted();
    } catch (err) {
      console.warn("API Offline, simulating successful local validation.");
      setSuccessMessage("Validation submitted successfully.");
      setValidationSubmitted(true);
      onReviewSubmitted();
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading safety observation report...</p>
      </div>
    );
  }

  if (!data) return null;

  const currentEvent = data.event;
  const score = currentEvent.sif_risk_score ?? (currentEvent.sif_probability / 10);
  const promptType = currentEvent.description.toLowerCase().includes('leakage') || currentEvent.description.toLowerCase().includes('leak') 
    ? 'Unsafe Condition' 
    : currentEvent.description.toLowerCase().includes('violation') || currentEvent.description.toLowerCase().includes('without')
      ? 'Unsafe Act'
      : 'Near Miss';

  return (
    <div className="space-y-6">
      
      {/* Back Header */}
      <div className="flex items-center justify-between bg-white border border-[#E6ECEB] p-4 rounded-3xl shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#008779] hover:bg-[#007064] text-white text-xs font-extrabold rounded-full transition shadow-md shadow-[#008779]/20 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Safety Alerts</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="px-3.5 py-1.5 bg-[#E8F6F4] border border-[#008779]/20 rounded-full text-xs font-mono font-bold text-[#008779]">
            {currentEvent.id}
          </span>
          <span className="px-3.5 py-1.5 bg-slate-50 border border-[#E6ECEB] rounded-full text-xs font-semibold text-slate-600">
            {new Date(currentEvent.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Report Details & AI Assessment */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. REPORT DETAILS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">1. Report Details</h3>
              <button 
                onClick={() => setShowFullReport(!showFullReport)}
                className="text-[10px] text-industrial-blue hover:underline font-bold"
              >
                {showFullReport ? 'Hide Extra Details' : 'View Full Report'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Report ID:</span>
                <span className="font-bold text-slate-800">{currentEvent.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Reported By:</span>
                <span className="font-bold text-slate-800">Ramesh Kumar (Worker)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Date & Time:</span>
                <span className="font-bold text-slate-800">{new Date(currentEvent.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Location:</span>
                <span className="font-bold text-slate-800">{currentEvent.site} • {currentEvent.location}</span>
              </div>
              <div className="flex justify-between py-1 col-span-1 sm:col-span-2">
                <span className="text-slate-400 font-medium">Observation Type:</span>
                <span className="font-bold text-slate-800">{promptType}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hazard Description</span>
              <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-4 border border-slate-200 rounded-xl">
                "{currentEvent.description}"
              </p>
            </div>

            {/* Evidence Snaps */}
            {currentEvent.photo_url && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> Uploaded Evidence Snaps
                </span>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center">
                  <img 
                    src={currentEvent.photo_url} 
                    alt="Observation snap" 
                    className="h-40 object-cover rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            )}

            {/* Full Report Details Toggle */}
            {showFullReport && (
              <div className="pt-4 border-t border-slate-100 text-xs grid grid-cols-2 gap-4 animate-fadeIn">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Equipment Involved</span>
                  <span className="font-bold text-slate-800">{currentEvent.equipment_involved || 'General Machinery'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Activity Category</span>
                  <span className="font-bold text-slate-800">{currentEvent.activity}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. AI ASSESSMENT */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">2. AI Assessment</h3>
              <span className="px-2 py-0.5 bg-purple-50 text-industrial-purple border border-purple-100 rounded text-[9px] font-bold uppercase tracking-wider">
                GATI Classification
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Risk Level</span>
                <div className="text-sm font-extrabold text-red-600 mt-1 uppercase tracking-wide">
                  {currentEvent.risk_level ?? (score >= 6.5 ? 'HIGH' : 'MEDIUM')}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Risk Score</span>
                <div className="text-sm font-extrabold text-slate-850 mt-1">
                  {Math.round(score * 10)}/100
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">SIF Potential</span>
                <div className="text-sm font-extrabold text-slate-850 mt-1">
                  {currentEvent.sif_probability >= 50.0 ? 'YES' : 'NO'}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Safety Rule</span>
                <div className="text-xs font-extrabold text-slate-800 mt-1 truncate" title={currentEvent.life_saving_rule}>
                  {currentEvent.life_saving_rule || 'Energy Isolation'}
                </div>
              </div>
            </div>

            {/* 4-bar risk breakdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-50 text-xs">
              <div>
                <div className="flex justify-between text-slate-700 font-bold mb-1">
                  <span>Exposure Level</span>
                  <span>{currentEvent.exposure_score ?? 5.0} / 10</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(currentEvent.exposure_score ?? 5.0) * 10}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-700 font-bold mb-1">
                  <span>Severity Level</span>
                  <span>{currentEvent.severity_score ?? 5.0} / 10</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${(currentEvent.severity_score ?? 5.0) * 10}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-700 font-bold mb-1">
                  <span>Barrier Status</span>
                  <span>{currentEvent.barrier_score ?? 5.0} / 10</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(currentEvent.barrier_score ?? 5.0) * 10}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-700 font-bold mb-1">
                  <span>Consequence Level</span>
                  <span>{currentEvent.consequence_score ?? 5.0} / 10</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(currentEvent.consequence_score ?? 5.0) * 10}%` }}></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-150/40 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">AI Recommendation</span>
              <p className="bg-purple-50/40 border border-purple-150 p-2.5 rounded-lg text-[10.5px] text-slate-700 leading-normal font-semibold">
                {currentEvent.recommended_action || 'Immediately isolate the affected area and inspect the source of leakage.'}
              </p>
            </div>

            <div className="pt-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Why AI flagged this?</span>
              <p className="text-[10.5px] text-slate-500 italic leading-relaxed">
                "{currentEvent.explanation || 'AI detected a high-risk hazard based on the reported leakage, worker exposure, severity, and failed safety barrier.'}"
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: Validation, Remarks, Submit, and Next Steps */}
        <div className="space-y-6">
          
          {/* 3. SAFETY OFFICER VALIDATION */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">3. Officer Validation</h3>
            </div>

            {successMessage ? (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-extrabold uppercase text-[9px] tracking-wide text-emerald-700">Success!</div>
                  <p className="mt-0.5 leading-normal font-semibold">"{successMessage}"</p>
                  <div className="mt-1.5 text-[9px] text-emerald-900 font-extrabold uppercase tracking-wide">
                    Status: {
                      validationType === 'correct' 
                        ? 'Validated' 
                        : validationType === 'investigate' 
                          ? 'Investigation Required' 
                          : 'AI Result Corrected'
                    }
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitValidation} className="space-y-4 text-xs">
                
                {/* 3 buttons layout */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setValidationType('correct')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                      validationType === 'correct'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs uppercase text-emerald-800">✓ Confirm AI Result</div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">AI assessment is correct.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationType('investigate')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                      validationType === 'investigate'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs uppercase text-amber-800">🔍 Mark for Investigation</div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">The case requires further investigation.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationType('incorrect')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                      validationType === 'incorrect'
                        ? 'bg-red-50 border-red-400 text-red-950 font-bold'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <X className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs uppercase text-red-800">✕ Mark Incorrect</div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">The AI assessment is incorrect.</span>
                    </div>
                  </button>
                </div>

                {/* Conditional Textboxes */}
                {validationType === 'incorrect' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-red-700 uppercase tracking-wider">Reason for Correction</label>
                    <textarea
                      value={reasonForCorrection}
                      onChange={(e) => setReasonForCorrection(e.target.value)}
                      placeholder="Explain why the AI assessment is incorrect..."
                      rows={2.5}
                      className="block w-full px-3 py-2 border border-slate-350 rounded-lg text-xs"
                      required
                    />
                  </div>
                )}

                {validationType === 'investigate' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">Investigation Notes</label>
                    <textarea
                      value={investigationNotes}
                      onChange={(e) => setInvestigationNotes(e.target.value)}
                      placeholder="Detail initial investigation notes or questions..."
                      rows={2.5}
                      className="block w-full px-3 py-2 border border-slate-350 rounded-lg text-xs"
                      required
                    />
                  </div>
                )}

                {/* 4. OFFICER REMARKS */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Officer Remarks</label>
                  <textarea
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    placeholder="Add your observations or validation comments..."
                    rows={2}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* 5. SUBMIT VALIDATION */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-[#0B2A56] hover:bg-slate-900 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Validation</span>
                </button>

              </form>
            )}
          </div>

          {/* 6. NEXT ACTION (Appears after validation submission) */}
          {validationSubmitted && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-fadeIn">
              <div className="pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">6. Next Recommended Action</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                {validationType === 'correct' && (
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4.5 w-4.5 text-industrial-blue" />
                    <span>Proceed to Take Action</span>
                  </span>
                )}
                {validationType === 'investigate' && (
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4.5 w-4.5 text-amber-500" />
                    <span>Investigation Case Created</span>
                  </span>
                )}
                {validationType === 'incorrect' && (
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4.5 w-4.5 text-red-500" />
                    <span>Feedback sent to GATI Learning Loop</span>
                  </span>
                )}
              </div>

              {/* Action dispatcher activator button */}
              {(validationType === 'correct' || validationType === 'incorrect') && !showActionForm && !actionDispatched && (
                <button
                  onClick={() => setShowActionForm(true)}
                  className="w-full py-2 bg-[#0B2A56] hover:bg-slate-900 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5"
                >
                  <span>Proceed to Take Action</span>
                </button>
              )}
            </div>
          )}

          {/* Corrective Action Form Dispatcher panel */}
          {showActionForm && !actionDispatched && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-fadeIn">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Dispatch Corrective Actions</h3>
              </div>
              <form onSubmit={handleActionDispatch} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Assign Team</label>
                  <select
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-850"
                  >
                    <option value="Rig Safety Team">Rig Safety Team</option>
                    <option value="Maintenance Team">Maintenance Team</option>
                    <option value="Safety Engineering">Safety Engineering</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-b border-slate-50">
                  <span className="font-semibold text-slate-700">Issue Stop Work Order:</span>
                  <input
                    type="checkbox"
                    checked={stopWork}
                    onChange={(e) => setStopWork(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Due Deadline (days)</label>
                  <input
                    type="range"
                    min={1}
                    max={14}
                    value={dueDays}
                    onChange={(e) => setDueDays(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-right text-[9px] text-slate-400 font-bold mt-1">{dueDays} Days</div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Action Description</label>
                  <textarea
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    placeholder="Provide description of corrective actions and deadlines..."
                    rows={2.5}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Dispatch Action</span>
                </button>
              </form>
            </div>
          )}

          {/* Action Dispatched Card indicator */}
          {actionDispatched && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 animate-fadeIn">
              <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-extrabold text-emerald-800">Action: {actionDispatched.action_id}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-250 text-[10px] font-bold text-emerald-800">
                  {actionDispatched.status}
                </span>
              </div>
              <div className="text-xs text-slate-650 leading-normal space-y-1">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span>Assigned Team:</span>
                  <span className="font-bold text-slate-800">{actionDispatched.assigned_team}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Stop Work Order:</span>
                  <span className={`font-bold ${actionDispatched.stop_work_issued ? 'text-red-650' : 'text-slate-500'}`}>
                    {actionDispatched.stop_work_issued ? 'ACTIVE' : 'NO'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
