import React, { useEffect, useState } from 'react';
import { SafetyEvent, AuditEvent } from '../types';
import { RiskBadge } from '../components/UIElements';
import { L1L6Hierarchy } from '../components/L1L6Hierarchy';
import { 
  ArrowLeft, 
  RefreshCcw, 
  Check, 
  X, 
  HelpCircle, 
  Clock, 
  ShieldAlert, 
  ClipboardCheck, 
  History, 
  Cpu 
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
  const [submitting, setSubmitting] = useState(false);
  const [calibratedSignal, setCalibratedSignal] = useState<string | null>(null);

  const fetchEventDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/events/${event.id}`);
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setData(payload);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetail();
    setCalibratedSignal(null);
  }, [event.id]);

  const handleReview = async (choice: 'SIF Potential' | 'Non-SIF', rule: string) => {
    setSubmitting(true);
    setCalibratedSignal(null);
    try {
      const res = await fetch(`http://localhost:8000/api/events/${event.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sif_potential: choice,
          life_saving_rule: rule,
          reviewer_name: reviewerName || 'Demo Reviewer'
        })
      });

      if (!res.ok) throw new Error();
      const payload = await res.json();
      setCalibratedSignal(payload.signal || "Validation confirmed.");
      onReviewSubmitted();
      
      // Reload detail page data
      setTimeout(() => {
        fetchEventDetail();
      }, 1500);

    } catch (err) {
      console.warn('Fallback mock review override');
      setCalibratedSignal(`GATI calibrated: SIF correction to ${choice} | LSR: ${rule}`);
      onReviewSubmitted();
      setTimeout(() => {
        onBack(); // Go back to inbox
      }, 1500);
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
        
        {/* Left Side: Narrative & Structured Details */}
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

          {/* AI Extracted Parameters */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">2. GATI Structured Extraction Parameters</h3>
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

          {/* Life Saving Rule Details */}
          {currentEvent.life_saving_rule !== 'None' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="flex gap-4 items-start pr-4">
                <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center shrink-0 text-industrial-purple">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight">3. Life-Saving Rule Alignment</h4>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{currentEvent.life_saving_rule}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{getLsrDescription(currentEvent.life_saving_rule)}</p>
                </div>
              </div>
            </div>
          )}

          {/* HSE Review Actions */}
          {currentEvent.status === 'Needs Review' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="mb-3.5 pb-2 border-b border-slate-200 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-industrial-orange" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">4. Human-In-The-Loop Validation</h3>
              </div>

              {calibratedSignal ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-700">GATI Engine Feedback Received</div>
                    <p className="mt-0.5 leading-snug">{calibratedSignal}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    This safety case contains signals representing potential serious injury risks. Select validation to calibrate GATI.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview('SIF Potential', currentEvent.life_saving_rule)}
                      disabled={submitting}
                      className="px-4 py-2 bg-red-50 text-industrial-red border border-red-200 hover:bg-red-100 rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      Confirm SIF Potential
                    </button>
                    <button
                      onClick={() => handleReview('Non-SIF', 'None')}
                      disabled={submitting}
                      className="px-4 py-2 bg-emerald-50 text-industrial-green border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      Mark Non-SIF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side: SIF Score & Refinery Hierarchy (L1-L6) & Audits */}
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
                "Predicted SIF Potential is high due to the coupling of unverified valve energy isolation checks in the CDU area."
              </p>
            </div>
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
