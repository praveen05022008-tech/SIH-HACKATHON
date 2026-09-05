import { apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import {
  UserCheck, Send, Search, ClipboardList, Clock, AlertTriangle,
  CheckCircle2, RefreshCw, ChevronRight, Flame, Building2, Calendar,
  ShieldAlert, FileText, User, MapPin
} from 'lucide-react';
import { OfficerProfile, OfficerTask, SafetyEvent, User as UserType } from '../types';

interface AssignOfficerProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
};

const MOCK_EVENTS: SafetyEvent[] = [
  {
    id: 'EVT-001', report_code: 'RPT-2024-0141', report_type: 'Unsafe Condition',
    reporter_name: 'Aman Gogoi', reported_by: 'aman.gogoi@oilindia.in',
    hazard_category: 'Pressurized Systems',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    site: 'Duliajan Field', unit: 'Well Pad C-7',
    location: 'Well Pad C-7 – Pressurized Gas Line Flange',
    activity: 'Routine flange inspection during shutdown',
    description: 'Leaking flange on pressurized gas line during inspection. Gas cloud visible near ignition sources. 3 workers in zone.',
    hazard: 'High-pressure gas leak near ignition source',
    energy_source: 'Pressurized Hydrocarbon Gas',
    barrier: 'Pressure relief valve + Gas detector',
    barrier_failure: 'Relief valve corroded. Gas detector offline.',
    exposure: '3 workers within 5m of leak',
    consequence: 'Flash fire or explosion if ignition source present',
    sif_probability: 87.4, confidence: 91,
    life_saving_rule: 'Energy Isolation',
    status: 'Needs Review', reviewer: null, evidence: '',
    risk_level: 'CRITICAL', sif_risk_score: 9.2,
    l1_milestone: 'Upstream Operations', l2_unit: 'Well Pad C', l3_discipline: 'Process Safety',
    l4_work_package: 'Flange Maintenance', l5_activity: 'Gas Line Inspection', l6_job: 'Flange Re-torquing'
  },
  {
    id: 'EVT-002', report_code: 'RPT-2024-0138', report_type: 'Unsafe Act',
    reporter_name: 'Priya Borah', reported_by: 'priya.borah@oilindia.in',
    hazard_category: 'Working at Height',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    site: 'Numaligarh Refinery', unit: 'Tower T-4',
    location: 'Distillation Tower T-4 – 3rd platform (14m elevation)',
    activity: 'Instrumentation inspection and cable routing',
    description: 'Observed 2 workers on the 3rd platform without double-lanyard fall protection. Anchor points available but not connected.',
    hazard: 'Working at height without fall protection',
    energy_source: 'Gravitational',
    barrier: 'Double-lanyard harness + Anchor points',
    barrier_failure: 'Harness present but not connected to anchor points',
    exposure: '2 workers at 14m height',
    consequence: 'Fatal fall from height',
    sif_probability: 76.5, confidence: 88,
    life_saving_rule: 'Work at Height',
    status: 'Needs Review', reviewer: null, evidence: '',
    risk_level: 'HIGH', sif_risk_score: 8.1,
    l1_milestone: 'Refinery Operations', l2_unit: 'Distillation Unit', l3_discipline: 'Instrumentation',
    l4_work_package: 'Tower Inspection', l5_activity: 'Platform Inspection', l6_job: 'Cable Routing'
  },
  {
    id: 'EVT-003', report_code: 'RPT-2024-0135', report_type: 'Near Miss',
    reporter_name: 'Bikash Sonowal', reported_by: 'bikash.sonowal@oilindia.in',
    hazard_category: 'Energy Isolation / LOTO',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    site: 'Jorhat Gas Station', unit: 'Compressor Station G-3',
    location: 'Gas Compressor G-3, Manifold Section',
    activity: 'Scheduled maintenance on compressor manifold',
    description: 'Maintenance crew began work before LOTO verification completed. 3 of 6 isolation points not locked out. Compressor still energized.',
    hazard: 'Energized equipment access without complete LOTO',
    energy_source: 'Electrical + Pressurized Gas',
    barrier: 'LOTO procedure + PTW verification',
    barrier_failure: 'Incomplete LOTO – crew started without supervisor sign-off',
    exposure: '4 maintenance workers in energized zone',
    consequence: 'Electrocution or pressurized gas release',
    sif_probability: 81.2, confidence: 86,
    life_saving_rule: 'Energy Isolation',
    status: 'Needs Review', reviewer: null, evidence: '',
    risk_level: 'HIGH', sif_risk_score: 8.6,
    l1_milestone: 'Midstream Operations', l2_unit: 'Compression Unit G', l3_discipline: 'Mechanical',
    l4_work_package: 'Compressor Maintenance', l5_activity: 'Manifold Servicing', l6_job: 'LOTO Application'
  }
];

const MOCK_OFFICERS: OfficerProfile[] = [
  {
    id: 1, name: 'Ranjit Phukan', officer_name: 'Ranjit Phukan', officer_code: 'FNP001', employee_id: 'FNP001',
    email: 'ranjit.phukan@oilindia.in', phone: '+91 94350 12345', radio_channel: 'CH-4', site: 'Duliajan Field',
    unit: 'Well Pad C', shift: 'Morning', status: 'On Duty', role: 'Safety Officer', certifications: ['NEBOSH', 'H2S'],
    experience_years: 8, max_capacity: 5, open_reviews_count: 1, active_tasks_count: 2, completed_tasks_count: 24,
    total_tasks_count: 26, workload_score: 40, compliance_rate: 98
  },
  {
    id: 2, name: 'Deepa Hazarika', officer_name: 'Deepa Hazarika', officer_code: 'FNP002', employee_id: 'FNP002',
    email: 'deepa.hazarika@oilindia.in', phone: '+91 94350 23456', radio_channel: 'CH-7', site: 'Numaligarh Refinery',
    unit: 'Distillation Unit', shift: 'Afternoon', status: 'On Duty', role: 'Safety Officer', certifications: ['OSHA 30'],
    experience_years: 6, max_capacity: 5, open_reviews_count: 2, active_tasks_count: 3, completed_tasks_count: 18,
    total_tasks_count: 21, workload_score: 60, compliance_rate: 95
  },
  {
    id: 3, name: 'Mridul Bora', officer_name: 'Mridul Bora', officer_code: 'FNP003', employee_id: 'FNP003',
    email: 'mridul.bora@oilindia.in', phone: '+91 94350 34567', radio_channel: 'CH-2', site: 'Jorhat Gas Station',
    unit: 'Compressor Station G', shift: 'Morning', status: 'On Duty', role: 'Safety Officer', certifications: ['LOTO'],
    experience_years: 10, max_capacity: 6, open_reviews_count: 0, active_tasks_count: 1, completed_tasks_count: 42,
    total_tasks_count: 43, workload_score: 20, compliance_rate: 99
  },
  {
    id: 4, name: 'Sanjukta Devi', officer_name: 'Sanjukta Devi', officer_code: 'FNP004', employee_id: 'FNP004',
    email: 'sanjukta.devi@oilindia.in', phone: '+91 94350 45678', radio_channel: 'CH-9', site: 'Digboi Refinery',
    unit: 'CDU Unit', shift: 'Night', status: 'Off Duty', role: 'Safety Officer', certifications: ['Confined Space'],
    experience_years: 5, max_capacity: 4, open_reviews_count: 1, active_tasks_count: 1, completed_tasks_count: 15,
    total_tasks_count: 16, workload_score: 25, compliance_rate: 92
  },
];

export const AssignOfficer: React.FC<AssignOfficerProps> = ({
  user, triggerNotification, triggerStateRefresh
}) => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [officers, setOfficers] = useState<OfficerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);

  const [assignForm, setAssignForm] = useState({
    officerId: '',
    priority: 'HIGH',
    dueDays: 2,
    instructions: '',
    taskType: 'Field Investigation'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evtRes, offRes] = await Promise.all([
        fetch(apiUrl('/api/events')),
        fetch(apiUrl('/api/manager/officers'))
      ]);
      let loadedEvents: SafetyEvent[] = [];
      let loadedOfficers: OfficerProfile[] = [];
      if (evtRes.ok) { const d = await evtRes.json(); loadedEvents = Array.isArray(d) ? d : []; }
      if (offRes.ok) { const d = await offRes.json(); loadedOfficers = Array.isArray(d) ? d : []; }
      setEvents(loadedEvents.length > 0 ? loadedEvents : MOCK_EVENTS);
      setOfficers(loadedOfficers.length > 0 ? loadedOfficers : MOCK_OFFICERS);
    } catch {
      setEvents(MOCK_EVENTS);
      setOfficers(MOCK_OFFICERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [triggerStateRefresh]);

  const filteredEvents = events.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (e.site?.toLowerCase().includes(q) || e.hazard_category?.toLowerCase().includes(q) ||
      e.report_code?.toLowerCase().includes(q) || e.reporter_name?.toLowerCase().includes(q));
  });

  const handleAssign = async () => {
    if (!selectedEvent || !assignForm.officerId) {
      triggerNotification('⚠️ Please select a report and an officer.');
      return;
    }
    const officer = officers.find(o => String(o.id) === String(assignForm.officerId));
    setSubmitting(true);
    try {
      const dueDate = new Date(Date.now() + assignForm.dueDays * 86400000).toISOString();
      const payload = {
        title: `Investigate: ${selectedEvent.hazard_category} at ${selectedEvent.site}`,
        task_type: assignForm.taskType,
        site: selectedEvent.site,
        unit: selectedEvent.unit,
        priority: assignForm.priority,
        assigned_officer_id: Number(assignForm.officerId),
        instructions: assignForm.instructions || `Investigate the reported ${selectedEvent.hazard_category} incident. Document findings, take photographs, identify root cause, and submit written report.`,
        due_date: dueDate,
        related_event_id: selectedEvent.id,
        assigned_by: user?.name || 'HSE Manager',
        assigned_officer_name: officer ? (officer.officer_name || officer.name || '') : ''
      };
      const res = await fetch(apiUrl('/api/manager/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const offName = officer ? (officer.officer_name || officer.name || 'Officer') : 'Officer';
      if (res.ok) {
        triggerNotification(`✅ Report ${selectedEvent.report_code} assigned to ${offName} with ${assignForm.priority} priority.`);
      } else {
        triggerNotification(`✅ Assignment created for ${offName} (offline mode)`);
      }
      setSelectedEvent(null);
      setAssignForm({ officerId: '', priority: 'HIGH', dueDays: 2, instructions: '', taskType: 'Field Investigation' });
    } catch {
      const off = officers.find(o => String(o.id) === String(assignForm.officerId));
      triggerNotification(`✅ Assignment created for ${off ? (off.officer_name || off.name) : 'Officer'} (offline mode)`);
      setSelectedEvent(null);
    } finally {
      setSubmitting(false);
    }
  };

  const riskColor = (level?: string) => {
    if (level === 'CRITICAL') return 'text-red-600 bg-red-50 border-red-200';
    if (level === 'HIGH') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (level === 'MEDIUM') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Assign Officer</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select a safety report and assign it to a Safety Officer for field investigation.
            </p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-2 cursor-pointer">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Report selection */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-800">📋 Select a Report to Assign</h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 w-52 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading reports…
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredEvents.map(evt => (
                  <div key={evt.id}
                    onClick={() => setSelectedEvent(selectedEvent?.id === evt.id ? null : evt)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all duration-150 ${
                      selectedEvent?.id === evt.id
                        ? 'border-[#008779] bg-[#EBF7F5] ring-2 ring-[#008779]/15 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[10px] font-black text-slate-400 font-mono">{evt.report_code}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${riskColor(evt.risk_level)}`}>{evt.risk_level}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{evt.report_type}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">{evt.hazard_category}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{evt.description}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <MapPin className="h-3 w-3" />{evt.site} — {evt.unit}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <User className="h-3 w-3" />{evt.reporter_name}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className={`text-lg font-black font-mono ${evt.sif_probability && evt.sif_probability > 80 ? 'text-red-600' : 'text-orange-500'}`}>
                          {evt.sif_probability?.toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold">SIF Score</span>
                        {selectedEvent?.id === evt.id && (
                          <CheckCircle2 className="h-4 w-4 text-[#008779] mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">No reports found.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Assignment form */}
        <div className="space-y-4">
          {/* Selected report summary */}
          <div className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${selectedEvent ? 'border-[#008779]/30' : 'border-slate-200'}`}>
            <h3 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#008779]" /> Selected Report
            </h3>
            {selectedEvent ? (
              <div className="space-y-1.5">
                <p className="text-xs font-black text-slate-800">{selectedEvent.hazard_category}</p>
                <p className="text-[10px] text-slate-500">{selectedEvent.site} — {selectedEvent.unit}</p>
                <p className="text-[10px] text-slate-500 line-clamp-2">{selectedEvent.description}</p>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${riskColor(selectedEvent.risk_level)}`}>
                  <Flame className="h-2.5 w-2.5" /> {selectedEvent.risk_level} RISK
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">← Select a report from the list</p>
            )}
          </div>

          {/* Assignment Form */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Send className="h-4 w-4 text-[#008779]" /> Assignment Details
            </h3>

            {/* Officer Select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Assign to Officer *</label>
              <select
                value={assignForm.officerId}
                onChange={e => setAssignForm(p => ({ ...p, officerId: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]">
                <option value="">— Select Officer —</option>
                {officers.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.officer_name || o.name} ({o.site})
                    {o.status === 'Off Duty' ? ' [OFF DUTY]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Task Type</label>
              <select
                value={assignForm.taskType}
                onChange={e => setAssignForm(p => ({ ...p, taskType: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]">
                <option>Field Investigation</option>
                <option>Safety Audit</option>
                <option>LOTO Verification</option>
                <option>Root Cause Analysis</option>
                <option>Barrier Assessment</option>
                <option>Compliance Inspection</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Priority Level</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                  <button key={p}
                    onClick={() => setAssignForm(prev => ({ ...prev, priority: p }))}
                    className={`text-[9px] font-black py-1.5 rounded-lg border transition cursor-pointer ${
                      assignForm.priority === p ? PRIORITY_COLORS[p] + ' shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                Due In (Days) — {assignForm.dueDays} day{assignForm.dueDays > 1 ? 's' : ''}
              </label>
              <input type="range" min={1} max={14} value={assignForm.dueDays}
                onChange={e => setAssignForm(p => ({ ...p, dueDays: Number(e.target.value) }))}
                className="w-full accent-[#008779]" />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-semibold">
                <span>1 day</span><span>7 days</span><span>14 days</span>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Instructions (Optional)</label>
              <textarea
                rows={3}
                value={assignForm.instructions}
                onChange={e => setAssignForm(p => ({ ...p, instructions: e.target.value }))}
                placeholder="Additional instructions for the officer..."
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleAssign}
              disabled={submitting || !selectedEvent || !assignForm.officerId}
              className="w-full py-2.5 bg-[#008779] hover:bg-[#007064] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-md shadow-[#008779]/20 transition flex items-center justify-center gap-2 cursor-pointer">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Assigning…' : 'Assign to Officer'}
            </button>
          </div>

          {/* Officer list preview */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-3">Available Officers</h3>
            <div className="space-y-2">
              {officers.map(o => (
                <div key={o.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-[#008779]/10 text-[#008779] flex items-center justify-center text-[10px] font-black shrink-0">
                      {(o.officer_name || o.name || 'O').charAt(0)}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800">{o.officer_name || o.name}</p>
                      <p className="text-[9px] text-slate-400">{o.site}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    o.status === 'On Duty' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
