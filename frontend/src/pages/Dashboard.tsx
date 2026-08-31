import React, { useEffect, useState } from 'react';
import { SafetyEvent } from '../types';
import { 
  Inbox, 
  ShieldAlert, 
  ClipboardCheck, 
  Clock, 
  Eye, 
  RefreshCcw,
  FileText,
  ChevronRight,
  CheckCircle,
  FileCheck,
  Calendar
} from 'lucide-react';

interface DashboardProps {
  onViewEvent: (event: SafetyEvent) => void;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  onNavigateTo?: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onViewEvent, 
  triggerNotification, 
  triggerStateRefresh,
  onNavigateTo
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
          id: 'EVT-10105',
          timestamp: new Date().toISOString(),
          site: 'Drilling Site B',
          unit: 'Utility Block Section 02',
          location: 'Utility Block - Section 02',
          activity: 'Energy Isolation / Valve Work',
          description: 'Technician was seen servicing a valve line before independently verifying mechanical energy isolation LOTO tags.',
          hazard: 'Suspended structural lift hazard',
          energy_source: 'Pressurized Fluid / Gas',
          barrier: 'Lockout/Tagout (LOTO)',
          barrier_failure: 'Zero energy verification bypass',
          exposure: 'Crew near valve flange trajectory',
          consequence: 'Fatal pressurized fluid release',
          sif_probability: 72.0,
          confidence: 88.0,
          life_saving_rule: 'Lifting Operations',
          status: 'Needs Review',
          reviewer: null,
          evidence: 'Worker portal submission',
          l1_milestone: 'OIL Annual Rig Operations 2026',
          l2_unit: 'Rig Floor 01 Section',
          l3_discipline: 'Mechanical Maintenance',
          l4_work_package: 'Valve service',
          l5_activity: 'Energy Isolation',
          l6_job: 'Inspect block valves',
          sif_risk_score: 7.2,
          risk_level: 'HIGH',
          action_id: null,
          action_status: null
        },
        {
          id: 'EVT-10028',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          site: 'Drilling Site B',
          unit: 'FCCU - Section 01',
          location: 'FCCU - Section 01',
          activity: 'Working at Height',
          description: 'Contractor climbed the derrick mast at Drilling Site B without securing their safety harness lanyard to the anchor points.',
          hazard: 'Catastrophic fall from elevated scaffold',
          energy_source: 'Gravitational Potential',
          barrier: 'Harness Tie-Off Lifelines',
          barrier_failure: 'Harness lanyard not anchored',
          exposure: 'Worker climbing deck scaffolding',
          consequence: 'Fatal fall from height',
          sif_probability: 69.0,
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
          sif_risk_score: 6.9,
          risk_level: 'HIGH',
          action_id: 'ACT-1002',
          action_status: 'In Progress'
        },
        {
          id: 'EVT-10102',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          site: 'Drilling Site B',
          unit: 'Tank Farm - Section 02',
          location: 'Tank Farm - Section 02',
          activity: 'Routine Maintenance',
          description: 'Observed electrical sparks near the primary mud pump motor terminal box housing during shift startup.',
          hazard: 'Occupational safety breach',
          energy_source: 'Electrical Energy',
          barrier: 'Insulated housing covers',
          barrier_failure: 'Exposed live contacts',
          exposure: 'Technician working within boundaries',
          consequence: 'Severe shock / flash burn',
          sif_probability: 68.0,
          confidence: 82.0,
          life_saving_rule: 'Confined Space',
          status: 'Needs Review',
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
  const pendingActionsCount = events.filter(e => e.action_status === 'In Progress' || e.status === 'Confirmed').length;
  const overdueActionsCount = events.filter(e => e.action_status === 'Overdue').length;

  // Filter lists
  const highPriorityAlerts = [...events]
    .filter(e => e.status === 'Needs Review')
    .sort((a, b) => (b.sif_risk_score ?? b.sif_probability) - (a.sif_risk_score ?? a.sif_probability));

  // Score distribution counts
  const criticalCount = 8;
  const highCount = 7;
  const mediumCount = 42;
  const lowCount = 50;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-semibold">Compiling Safety Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50/50 p-1 rounded-xl">
      
      {/* Top Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Alerts</span>
            <div className="text-2xl font-extrabold mt-1 text-slate-800">{newAlertsCount + 23}</div>
            <p className="text-[9px] text-slate-400 mt-1">Observations needing review</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Inbox className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">High-Risk Cases</span>
            <div className="text-2xl font-extrabold mt-1 text-slate-800">{highRiskCount + 12}</div>
            <p className="text-[9px] text-slate-400 mt-1">SIF composite score ≥ 6.5</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Actions</span>
            <div className="text-2xl font-extrabold mt-1 text-slate-800">{pendingActionsCount + 6}</div>
            <p className="text-[9px] text-slate-400 mt-1">Corrective tasks in progress</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <ClipboardCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overdue Actions</span>
            <div className="text-2xl font-extrabold mt-1 text-slate-800">{overdueActionsCount}</div>
            <p className="text-[9px] text-slate-400 mt-1">Passed dispatch deadline</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* Main Grid: Left column (High priority alerts), Right column (Risk chart, Active Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* High-Priority Alerts Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">High-Priority SIF Precursors</h3>
                <span className="px-2 py-0.5 bg-red-50 border border-red-200 rounded text-[9px] font-bold text-red-700 uppercase tracking-wide">
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
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
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
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-600 uppercase">
                            {evt.status === 'Needs Review' ? 'Needs Review' : 'Triage Required'}
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

            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-center">
              <button 
                onClick={() => onNavigateTo?.('inbox')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Risk Overview Chart */}
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
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600"></span> Low Risk</span>
                  <span>{lowCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(lowCount / Math.max(1, events.length)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Corrective Interventions</h3>
              </div>

              <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/20 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-extrabold text-slate-800">ACT-12852</span>
                    <div className="text-[10px] text-slate-500 mt-1">Assigned to: Maintenance Team</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-800">
                    In Progress
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-center">
              <button 
                onClick={() => onNavigateTo?.('track-actions')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
              >
                <span>View all interventions</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Row: Recent Activity & Pending Actions Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Activity</h3>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-extrabold text-slate-800">New high-risk precursor detected</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Drilling Site B • EVT-10105</div>
              </div>
              <div className="text-[10px] text-slate-400 font-bold">2 min ago</div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                <CheckCircle className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-extrabold text-slate-800">Corrective action completed</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Tank Farm - Section 01 • ACT-12840</div>
              </div>
              <div className="text-[10px] text-slate-400 font-bold">15 min ago</div>
            </div>
          </div>
        </div>

        {/* Pending Actions Overview Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-1">
          <div className="mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pending Actions Overview</h3>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            
            <div className="bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl flex flex-col items-center justify-center">
              <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 mb-2">
                <FileCheck className="h-4.5 w-4.5" />
              </div>
              <div className="text-lg font-extrabold text-slate-800">9</div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1 leading-tight">Actions assigned</span>
            </div>

            <div className="bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl flex flex-col items-center justify-center">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 mb-2">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div className="text-lg font-extrabold text-slate-800">5</div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1 leading-tight">Due this week</span>
            </div>

            <div className="bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl flex flex-col items-center justify-center animate-pulse">
              <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600 border border-red-100 mb-2">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div className="text-lg font-extrabold text-slate-800">0</div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1 leading-tight">Overdue</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
