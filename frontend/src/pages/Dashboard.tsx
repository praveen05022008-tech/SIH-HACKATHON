import React, { useEffect, useState } from 'react';
import { SafetyEvent } from '../types';
import { RiskBadge, TrendIndicator } from '../components/UIElements';
import { 
  Inbox, 
  ShieldAlert, 
  ClipboardCheck, 
  Clock, 
  Eye, 
  RefreshCcw,
  AlertTriangle,
  Play,
  FileText
} from 'lucide-react';

interface DashboardProps {
  onViewEvent: (event: SafetyEvent) => void;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onViewEvent, 
  triggerNotification, 
  triggerStateRefresh 
}) => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/events');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.warn("FastAPI offline, using mock dashboard events list.");
      setEvents([
        {
          id: 'EVT-10291',
          timestamp: new Date().toISOString(),
          site: 'Drilling Site A',
          unit: 'Rig Floor 01',
          location: 'CDU - Area 4',
          activity: 'Energy Isolation / Valve Work',
          description: 'Technician was seen servicing a valve line before independently verifying mechanical energy isolation LOTO tags.',
          hazard: 'Unexpected pressurized release',
          energy_source: 'Pressurized Fluid / Gas',
          barrier: 'Lockout/Tagout (LOTO)',
          barrier_failure: 'Zero energy verification bypass',
          exposure: 'Crew near valve flange trajectory',
          consequence: 'Fatal pressurized fluid release',
          sif_probability: 92.0,
          confidence: 88.0,
          life_saving_rule: 'Energy Isolation',
          status: 'Needs Review',
          reviewer: null,
          evidence: 'Worker portal submission',
          l1_milestone: 'OIL Annual Rig Operations 2026',
          l2_unit: 'Rig Floor 01 Section',
          l3_discipline: 'Mechanical Maintenance',
          l4_work_package: 'Valve service',
          l5_activity: 'Energy Isolation',
          l6_job: 'Inspect block valves',
          sif_risk_score: 9.2,
          risk_level: 'CRITICAL',
          action_id: null,
          action_status: null
        },
        {
          id: 'EVT-10292',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          site: 'Drilling Site B',
          unit: 'Derrick Mast',
          location: 'Mast Section 3',
          activity: 'Working at Height',
          description: 'Contractor climbed the derrick mast at Drilling Site B without securing their safety harness lanyard to the anchor points.',
          hazard: 'Catastrophic fall from elevated structure',
          energy_source: 'Gravitational Potential',
          barrier: 'Harness Tie-Off Lifelines',
          barrier_failure: 'Harness lanyard not anchored',
          exposure: 'Worker climbing deck scaffolding',
          consequence: 'Fatal fall from height',
          sif_probability: 88.0,
          confidence: 90.0,
          life_saving_rule: 'Working at Height',
          status: 'Needs Review',
          reviewer: null,
          evidence: 'CCTV detection feed',
          l1_milestone: 'OIL Annual Rig Operations 2026',
          l2_unit: 'Derrick Mast Scaffold',
          l3_discipline: 'Rig Operations',
          l4_work_package: 'Platform inspection',
          l5_activity: 'Working at Height',
          l6_job: 'Climb mast platform',
          sif_risk_score: 8.8,
          risk_level: 'CRITICAL',
          action_id: 'ACT-1002',
          action_status: 'In Progress'
        },
        {
          id: 'EVT-10293',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          site: 'Drilling Site C',
          unit: 'Mud Pump Area',
          location: 'Skid B',
          activity: 'Routine Maintenance',
          description: 'Observed electrical sparks near the primary mud pump motor terminal box housing during shift startup.',
          hazard: 'Arc flash / electrocution hazard',
          energy_source: 'Electrical Energy',
          barrier: 'Insulated housing covers',
          barrier_failure: 'Exposed live contacts',
          exposure: 'Technician working within boundaries',
          consequence: 'Severe shock / flash burn',
          sif_probability: 68.0,
          confidence: 82.0,
          life_saving_rule: 'Electrical Safety',
          status: 'Confirmed',
          reviewer: 'Safety Officer Lead',
          evidence: 'Observation form',
          l1_milestone: 'Standard Operations',
          l2_unit: 'Mud Pump Area Unit',
          l3_discipline: 'Electrical Maintenance',
          l4_work_package: 'Motor inspection',
          l5_activity: 'Routine Maintenance',
          l6_job: 'Check motor terminals',
          sif_risk_score: 6.8,
          risk_level: 'HIGH',
          action_id: 'ACT-1003',
          action_status: 'Overdue'
        },
        {
          id: 'EVT-10294',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          site: 'Refinery A',
          unit: 'Tank Farm',
          location: 'Vessel V-301 Entrance',
          activity: 'Confined Space Entry',
          description: 'Gas checks were unverified before entry into crude storage vessel V-301.',
          hazard: 'Toxic H2S gas inhalation',
          energy_source: 'Chemical / Toxic Atmosphere',
          barrier: 'Multi-gas test clearances',
          barrier_failure: 'Atmospheric test omitted before entry',
          exposure: 'Vessel cleaning crew',
          consequence: 'Immediate gas asphyxiation',
          sif_probability: 95.0,
          confidence: 86.0,
          life_saving_rule: 'Confined Space',
          status: 'Needs Review',
          reviewer: null,
          evidence: 'Worker portal entry',
          l1_milestone: 'Refinery Turnaround 2026',
          l2_unit: 'Tank Farm section',
          l3_discipline: 'Operations Safety',
          l4_work_package: 'Vessel cleaning',
          l5_activity: 'Confined Space Entry',
          l6_job: 'Enter and sweep crude drum V-301',
          sif_risk_score: 9.5,
          risk_level: 'CRITICAL',
          action_id: null,
          action_status: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [triggerStateRefresh]);

  // Derived metrics
  const newAlertsCount = events.filter(e => e.status === 'Needs Review').length;
  const highRiskCount = events.filter(e => (e.sif_risk_score ?? (e.sif_probability / 10)) >= 6.5).length;
  const pendingActionsCount = events.filter(e => e.action_status === 'In Progress').length;
  const overdueActionsCount = events.filter(e => e.action_status === 'Overdue' || (e.action_status === 'In Progress' && e.id === 'EVT-10293')).length; // mock one overdue

  // Filter lists
  const highPriorityAlerts = [...events]
    .filter(e => e.status === 'Needs Review')
    .sort((a, b) => (b.sif_risk_score ?? b.sif_probability) - (a.sif_risk_score ?? a.sif_probability));

  const recentReports = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const activeInterventions = events.filter(e => e.action_id && e.action_status);

  // Score distribution counts
  const criticalCount = events.filter(e => (e.sif_risk_score ?? 5.0) >= 8.5).length;
  const highCount = events.filter(e => (e.sif_risk_score ?? 5.0) >= 6.5 && (e.sif_risk_score ?? 5.0) < 8.5).length;
  const mediumCount = events.filter(e => (e.sif_risk_score ?? 5.0) >= 4.0 && (e.sif_risk_score ?? 5.0) < 6.5).length;
  const lowCount = events.filter(e => (e.sif_risk_score ?? 5.0) < 4.0).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Compiling Safety Officer Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 2. Top Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🚨 New Alerts</span>
            <div className="text-2xl font-extrabold mt-1 text-slate-800">{newAlertsCount}</div>
            <p className="text-[9px] text-slate-400 mt-1">Observations needing review</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-industrial-blue">
            <Inbox className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🔴 High-Risk Cases</span>
            <div className="text-2xl font-extrabold mt-1 text-red-600">{highRiskCount}</div>
            <p className="text-[9px] text-slate-400 mt-1">SIF composite score ≥ 6.5</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-industrial-red">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🛑 Pending Actions</span>
            <div className="text-2xl font-extrabold mt-1 text-orange-500">{pendingActionsCount}</div>
            <p className="text-[9px] text-slate-400 mt-1">Corrective tasks in progress</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-industrial-orange">
            <ClipboardCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border-2 border-red-200 rounded-xl p-5 shadow-xs flex items-center justify-between bg-red-50/10">
          <div>
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">⏰ Overdue Actions</span>
            <div className="text-2xl font-extrabold mt-1 text-red-700">{overdueActionsCount}</div>
            <p className="text-[9px] text-red-500 mt-1">Passed dispatch deadline</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-700">
            <Clock className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* Main Grid: Left column (High priority alerts, Recent reports), Right column (Risk chart, Active Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 3. High-Priority Alerts Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">High-Priority SIF Precursors</h3>
              <span className="px-2 py-0.5 bg-red-50 border border-red-200 rounded text-[9px] font-bold text-red-700 uppercase tracking-wide animate-pulse">
                Action Required
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">Hazard Issue</th>
                    <th className="px-4 py-2 text-center">SIF Risk</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-55 text-xs text-slate-700">
                  {highPriorityAlerts.slice(0, 3).map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{evt.id}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800">{evt.site}</div>
                        <div className="text-[9px] text-slate-400">{evt.location}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800 line-clamp-1">{evt.hazard}</div>
                        <div className="text-[9px] text-slate-400">Rule: {evt.life_saving_rule}</div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded font-bold text-[10px]">
                          {evt.sif_risk_score ?? (evt.sif_probability / 10).toFixed(1)} / 10
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[9px] font-bold text-industrial-orange uppercase">
                          {evt.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => onViewEvent(evt)}
                          className="px-2 py-1 bg-slate-100 hover:bg-[#0B2A56] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Recent Safety Reports */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Submitted Safety Reports</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Hazard</th>
                    <th className="px-4 py-2">Risk</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-55 text-xs text-slate-700">
                  {recentReports.slice(0, 4).map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold text-slate-800">{evt.id}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800 line-clamp-1">{evt.description}</div>
                        <div className="text-[9px] text-slate-400">{evt.site} • {evt.activity}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          (evt.sif_risk_score ?? 5.0) >= 8.5 
                            ? 'bg-red-50 text-red-700 border border-red-150' 
                            : (evt.sif_risk_score ?? 5.0) >= 6.5 
                              ? 'bg-orange-50 text-orange-700 border border-orange-150'
                              : 'bg-slate-50 text-slate-600 border border-slate-150'
                        }`}>
                          {evt.risk_level ?? 'MEDIUM'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          evt.status === 'Needs Review' 
                            ? 'bg-amber-50 text-industrial-orange border-amber-100'
                            : evt.status === 'Confirmed'
                              ? 'bg-emerald-50 text-industrial-green border-emerald-100'
                              : 'bg-indigo-50 text-industrial-purple border-indigo-100'
                        }`}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[10px] text-slate-400">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* 5. Risk Overview simple chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">SIF Risk Distribution</h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Triage load count by severity level</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-600"></span> Critical</span>
                  <span>{criticalCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full rounded-full" style={{ width: `${(criticalCount / Math.max(1, events.length)) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500"></span> High Risk</span>
                  <span>{highCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(highCount / Math.max(1, events.length)) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Medium Risk</span>
                  <span>{mediumCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(mediumCount / Math.max(1, events.length)) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400"></span> Low Risk</span>
                  <span>{lowCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${(lowCount / Math.max(1, events.length)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Active Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Corrective Interventions</h3>
            </div>

            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {activeInterventions.map((action) => {
                const isOverdue = action.action_status === 'Overdue' || action.id === 'EVT-10293';
                return (
                  <div 
                    key={action.id} 
                    className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                      isOverdue 
                        ? 'border-red-200 bg-red-50/20' 
                        : 'border-slate-200 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-extrabold text-slate-800">{action.action_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                        isOverdue 
                          ? 'bg-red-100 text-red-800 border-red-200 uppercase tracking-wider animate-pulse' 
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {isOverdue ? 'Overdue' : 'In Progress'}
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-slate-600">
                      <div className="font-semibold text-slate-800 line-clamp-1">Issue: {action.hazard}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Team: {action.assigned_team || 'Operations'}</div>
                    </div>
                    
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-150/40 pt-1.5">
                      Deadline: {isOverdue ? 'PASSED' : 'In 2 Days'}
                    </div>
                  </div>
                );
              })}
              {activeInterventions.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No active corrective tasks dispatched.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
