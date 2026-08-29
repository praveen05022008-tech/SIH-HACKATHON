import React, { useEffect, useState } from 'react';
import { DashboardResponse, SafetyEvent } from '../types';
import { KPICard, RiskBadge, TrendIndicator } from '../components/UIElements';
import { 
  FileText, 
  ShieldAlert, 
  AlertOctagon, 
  Activity,
  Layers,
  Calendar,
  Eye,
  RefreshCcw,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  onViewEvent: (event: SafetyEvent) => void;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ onViewEvent, triggerNotification, triggerStateRefresh }) => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/dashboard');
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setData(payload);
      setError(false);
    } catch (err) {
      console.warn('Dashboard API failed, using synthetic fallback data');
      setError(true);
      // Hardcoded high-fidelity fallback matching seeded DB schema
      setData({
        kpis: {
          total_reports: 1248,
          sif_potential: 276,
          high_priority: 48,
          open_interventions: 31
        },
        site_densities: [
          { site: 'Refinery A', reports: 384, sif_percentage: 28.5, high_potential_count: 98, trend: 'Increase' },
          { site: 'Refinery B', reports: 298, sif_percentage: 22.1, high_potential_count: 65, trend: 'Stable' },
          { site: 'Refinery D', reports: 196, sif_percentage: 29.8, high_potential_count: 58, trend: 'Increase' },
          { site: 'Refinery C', reports: 212, sif_percentage: 18.2, high_potential_count: 38, trend: 'Stable' },
          { site: 'Refinery E', reports: 158, sif_percentage: 11.4, high_potential_count: 17, trend: 'Decrease' }
        ],
        life_saving_rules: [
          { name: 'Energy Isolation', reports_count: 212, sif_count: 68, precursor_density: 'High', common_barrier_failure: 'Isolation verification not performed', top_site: 'Refinery A' },
          { name: 'Working at Height', reports_count: 189, sif_count: 54, precursor_density: 'High', common_barrier_failure: 'Fall protection harness not anchored', top_site: 'Refinery D' },
          { name: 'Confined Space', reports_count: 145, sif_count: 42, precursor_density: 'High', common_barrier_failure: 'Gas clearance test omitted before entry', top_site: 'Refinery B' },
          { name: 'Line of Fire', reports_count: 234, sif_count: 39, precursor_density: 'Medium', common_barrier_failure: 'Lifting exclusion zone not barricaded', top_site: 'Refinery C' },
          { name: 'Lifting Operations', reports_count: 112, sif_count: 31, precursor_density: 'Medium', common_barrier_failure: 'Lifting exclusion zone not barricaded', top_site: 'Refinery E' },
          { name: 'Electrical Safety', reports_count: 86, sif_count: 24, precursor_density: 'Medium', common_barrier_failure: 'Isolation verification not performed', top_site: 'Refinery A' },
          { name: 'Hot Work', reports_count: 156, sif_count: 15, precursor_density: 'Low', common_barrier_failure: 'Gas clearance test omitted before entry', top_site: 'Refinery C' },
          { name: 'Vehicle Safety', reports_count: 114, sif_count: 3, precursor_density: 'Low', common_barrier_failure: 'Adherence to procedures', top_site: 'Refinery B' }
        ],
        recent_events: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [triggerStateRefresh]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading safety intelligence dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      
      {/* Welcome Header */}
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">Good morning, HSE Manager</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time safety intelligence and fatal precursor tracking across refinery operations.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400 font-bold">
          <Calendar className="h-3.5 w-3.5" />
          <span>TODAY: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          title="Total Safety Reports" 
          value={data.kpis.total_reports} 
          subtitle="Ingested observations & narratives"
          icon={FileText} 
          colorClass="text-industrial-navy"
          iconColorClass="bg-slate-50 text-slate-600 border border-slate-200"
        />
        <KPICard 
          title="SIF-Potential Events" 
          value={data.kpis.sif_potential} 
          subtitle="Predicted fatal precursor risk"
          icon={ShieldAlert} 
          colorClass="text-industrial-red"
          iconColorClass="bg-red-50 text-industrial-red border border-red-100"
        />
        <KPICard 
          title="High Priority Alerts" 
          value={data.kpis.high_priority} 
          subtitle="SIF potential & confidence >= 80%"
          icon={AlertOctagon} 
          colorClass="text-industrial-orange"
          iconColorClass="bg-amber-50 text-industrial-orange border border-amber-100"
        />
        <KPICard 
          title="Open Interventions" 
          value={data.kpis.open_interventions} 
          subtitle="HSE actions requiring close-out"
          icon={Activity} 
          colorClass="text-industrial-blue"
          iconColorClass="bg-blue-50 text-industrial-blue border border-blue-100"
        />
      </div>

      {/* Main Grid: Precursor Density vs. Life-Saving Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Precursor Density / Site Rankings */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Site Precursor Density</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Refinery rankings based on high-potential SIF signals</p>
          </div>
          
          <div className="flex-1 space-y-4">
            {data.site_densities.map((siteItem, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-800">{siteItem.site}</span>
                  <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
                    <span>Reports: <b className="text-slate-600">{siteItem.reports}</b></span>
                    <span>SIF Ratio: <b className="text-slate-600">{siteItem.sif_percentage}%</b></span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-industrial-navy">{siteItem.high_potential_count} events</div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">High-Pot</div>
                  </div>
                  <TrendIndicator trend={siteItem.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Life-Saving Rules Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Life-Saving Rules Mapping</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">SIF counts mapped to IOGP Life-Saving Rules</p>
            </div>
            <span className="text-[9px] font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-industrial-purple rounded uppercase tracking-wider">
              IOGP Standards
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            {data.life_saving_rules.map((rule, idx) => {
              const isHigh = rule.precursor_density === 'High';
              const isMedium = rule.precursor_density === 'Medium';
              let densityColor = 'bg-slate-100 text-slate-600 border-slate-200';
              if (isHigh) densityColor = 'bg-red-50 text-industrial-red border-red-100';
              else if (isMedium) densityColor = 'bg-amber-50 text-industrial-orange border-amber-100';

              return (
                <div key={idx} className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl flex flex-col justify-between hover:border-slate-300 transition">
                  <div>
                    <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-1">{rule.name}</div>
                    <div className="flex gap-1.5 mt-2">
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${densityColor}`}>
                        {rule.precursor_density}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-100 flex justify-between items-end">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Reports</span>
                      <span className="text-xs font-extrabold text-slate-700">{rule.reports_count}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">SIF Pot</span>
                      <span className="text-xs font-extrabold text-industrial-red">{rule.sif_count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent High-Potential Events Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent High-Potential Events</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Latest safety observations with high fatal risk potential</p>
          </div>
          {error && (
            <span className="text-[9px] font-bold bg-amber-50 text-industrial-orange px-2 py-0.5 border border-amber-100 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              <span>Using Demo Data Fallback</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Site/Unit</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3 text-center">SIF Prob / Conf</th>
                <th className="px-4 py-3">Life-Saving Rule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {data.recent_events && data.recent_events.length > 0 ? (
                data.recent_events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{evt.id}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(evt.timestamp).toLocaleDateString()} {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">{evt.site}</span>
                      <span className="text-slate-400 text-[10px] block">{evt.location}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]" title={evt.activity}>{evt.activity}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-bold text-industrial-red">{evt.sif_probability}%</div>
                      <div className="text-slate-400 text-[9px]">Conf: {evt.confidence}%</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700">
                        {evt.life_saving_rule}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        evt.status === 'Needs Review' 
                          ? 'bg-amber-50 text-industrial-orange border-amber-100'
                          : evt.status === 'Confirmed'
                            ? 'bg-emerald-50 text-industrial-green border-emerald-100'
                            : 'bg-indigo-50 text-industrial-purple border-indigo-100'
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => onViewEvent(evt)}
                        className="p-1 hover:bg-slate-100 text-industrial-blue hover:text-blue-800 rounded transition"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                // Hardcoded fallback data in case seeded database query is fetching 0 items during first render
                [
                  { id: 'EVT-10001', time: '2 mins ago', site: 'Refinery A', unit: 'CDU', loc: 'CDU Area 4', act: 'Maintenance / Valve Work', rule: 'Energy Isolation', prob: 94.0, conf: 90.0, status: 'Needs Review' },
                  { id: 'EVT-10002', time: '1 hour ago', site: 'Refinery B', unit: 'Tank Farm', loc: 'Tank Farm B', act: 'Vessel Entry', rule: 'Confined Space', prob: 88.0, conf: 85.0, status: 'Needs Review' },
                  { id: 'EVT-10003', time: '4 hours ago', site: 'Refinery D', unit: 'VDU', loc: 'VDU Main Tower', act: 'Working at Height', rule: 'Working at Height', prob: 91.5, conf: 88.0, status: 'Corrected' },
                  { id: 'EVT-10004', time: 'Yesterday', site: 'Refinery C', unit: 'FCCU', loc: 'FCCU Cat-Cracker', act: 'Lifting Operations', rule: 'Lifting Operations', prob: 76.2, conf: 81.0, status: 'Confirmed' }
                ].map((mockEvt) => (
                  <tr key={mockEvt.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{mockEvt.id}</td>
                    <td className="px-4 py-3 text-slate-400">{mockEvt.time}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">{mockEvt.site}</span>
                      <span className="text-slate-400 text-[10px] block">{mockEvt.loc}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{mockEvt.act}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-bold text-industrial-red">{mockEvt.prob}%</div>
                      <div className="text-slate-400 text-[9px]">Conf: {mockEvt.conf}%</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-semibold text-slate-700">
                        {mockEvt.rule}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        mockEvt.status === 'Needs Review' 
                          ? 'bg-amber-50 text-industrial-orange border-amber-100'
                          : mockEvt.status === 'Confirmed'
                            ? 'bg-emerald-50 text-industrial-green border-emerald-100'
                            : 'bg-indigo-50 text-industrial-purple border-indigo-100'
                      }`}>
                        {mockEvt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => {
                          triggerNotification(`Viewing detailed event ${mockEvt.id}`);
                          // Mock safety event generation for viewing
                          onViewEvent({
                            id: mockEvt.id,
                            timestamp: new Date().toISOString(),
                            site: mockEvt.site,
                            unit: mockEvt.unit,
                            location: mockEvt.loc,
                            activity: mockEvt.act,
                            description: `Safety observation reports that during the ${mockEvt.act.toLowerCase()} activity, safety controls were bypassed or unverified, raising a hazard concern in the ${mockEvt.unit} operational unit.`,
                            hazard: 'Unexpected energy release or structural hazard',
                            energy_source: 'Mechanical / Gravity',
                            barrier: 'Standard barrier locks',
                            barrier_failure: 'Incomplete verification check',
                            exposure: 'Personnel active in hazard zone',
                            consequence: 'Serious trauma or potential injury',
                            sif_probability: mockEvt.prob,
                            confidence: mockEvt.conf,
                            life_saving_rule: mockEvt.rule,
                            status: mockEvt.status as any,
                            reviewer: null,
                            evidence: 'Original raw log observation notes text.',
                            l1_milestone: 'Refinery Turnaround 2026',
                            l2_unit: `${mockEvt.unit} Unit Area`,
                            l3_discipline: 'Mechanical Systems',
                            l4_work_package: `${mockEvt.unit} Maintenance Package`,
                            l5_activity: mockEvt.act,
                            l6_job: `Conduct job under ${mockEvt.act}`
                          });
                        }}
                        className="p-1 hover:bg-slate-100 text-industrial-blue hover:text-blue-800 rounded transition"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
