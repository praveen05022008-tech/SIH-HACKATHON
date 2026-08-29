import React, { useState, useEffect } from 'react';
import { SafetyEvent } from '../types';
import { Search, Eye, Filter, RefreshCcw, X } from 'lucide-react';
import { RiskBadge } from '../components/UIElements';

interface InboxProps {
  onViewEvent: (event: SafetyEvent) => void;
  triggerStateRefresh: boolean;
}

export const Inbox: React.FC<InboxProps> = ({ onViewEvent, triggerStateRefresh }) => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [site, setSite] = useState('All Sites');
  const [status, setStatus] = useState('All Statuses');
  const [sifPotential, setSifPotential] = useState('All');
  const [lsr, setLsr] = useState('All Rules');

  const filterSites = ['All Sites', 'Refinery A', 'Refinery B', 'Refinery C', 'Refinery D', 'Refinery E'];
  const filterStatuses = ['All Statuses', 'Needs Review', 'Confirmed', 'Corrected'];
  const filterSifOpts = ['All', 'SIF Potential', 'Non-SIF'];
  const filterLsrs = [
    'All Rules',
    'Energy Isolation',
    'Line of Fire',
    'Hot Work',
    'Confined Space',
    'Working at Height',
    'Lifting Operations',
    'Vehicle Safety',
    'Electrical Safety'
  ];

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (site !== 'All Sites') queryParams.append('site', site);
      if (status !== 'All Statuses') queryParams.append('status', status);
      if (sifPotential !== 'All') queryParams.append('sif_potential', sifPotential);
      if (lsr !== 'All Rules') queryParams.append('life_saving_rule', lsr);
      if (search) queryParams.append('search', search);

      const res = await fetch(`http://localhost:8000/api/events?${queryParams.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.warn('Events fetch failed, loading synthetic safety records.');
      // Create high-fidelity mock list matching filters for offline demonstration
      const mockList: SafetyEvent[] = [
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
          evidence: 'Original observation record text.',
          l1_milestone: 'Refinery Turnaround 2026',
          l2_unit: 'CDU Unit Area',
          l3_discipline: 'Mechanical Maintenance',
          l4_work_package: 'CDU Turnaround Maintenance Package',
          l5_activity: 'Maintenance / Valve Work',
          l6_job: 'Isolate and replace manual block valve V-204'
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
          evidence: 'Original observation record text.',
          l1_milestone: 'Routine Maintenance Schedule',
          l2_unit: 'FCCU Unit Area',
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
          barrier: 'Work Permit System / Authorization & Fire blankets',
          barrier_failure: 'Gas clearance test omitted before entry',
          exposure: 'Personnel in close proximity to flammable area',
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
        },
        {
          id: 'EVT-10294',
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
          site: 'Refinery D',
          unit: 'VDU',
          location: 'VDU - Accumulator Drum',
          activity: 'Routine Maintenance',
          description: 'Rainwater puddle collected near the stairs of control room. Safety warning cone placed.',
          hazard: 'Minor slip hazard',
          energy_source: 'Gravity',
          barrier: 'Standard housekeeping',
          barrier_failure: 'None',
          exposure: 'Pedestrians',
          consequence: 'Minor strain',
          sif_probability: 12.0,
          confidence: 75.0,
          life_saving_rule: 'None',
          status: 'Confirmed',
          reviewer: 'Demo Reviewer',
          evidence: 'Original safety report.',
          l1_milestone: 'Standard Operations',
          l2_unit: 'VDU Area',
          l3_discipline: 'Facilities Maintenance',
          l4_work_package: 'Water clearing',
          l5_activity: 'Routine Maintenance',
          l6_job: 'Sweep puddle water and clear drain'
        }
      ];

      // Apply frontend filters for offline mode
      const filtered = mockList.filter(e => {
        if (site !== 'All Sites' && e.site !== site) return false;
        if (status !== 'All Statuses' && e.status !== status) return false;
        if (lsr !== 'All Rules' && e.life_saving_rule !== lsr) return false;
        if (sifPotential === 'SIF Potential' && e.sif_probability < 50.0) return false;
        if (sifPotential === 'Non-SIF' && e.sif_probability >= 50.0) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            e.id.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.activity.toLowerCase().includes(q)
          );
        }
        return true;
      });

      setEvents(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [site, status, sifPotential, lsr, search, triggerStateRefresh]);

  const clearFilters = () => {
    setSearch('');
    setSite('All Sites');
    setStatus('All Statuses');
    setSifPotential('All');
    setLsr('All Rules');
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        
        {/* Search Bar */}
        <div className="flex gap-4">
          <div className="relative flex-1 shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4.5 w-4.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Safety Events by ID, activity, or description keyword..."
              className="block w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-industrial-blue focus:border-industrial-blue text-xs placeholder-slate-400"
            />
          </div>
          <button 
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition"
          >
            <X className="h-4 w-4" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Site</label>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            >
              {filterSites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Life-Saving Rule</label>
            <select
              value={lsr}
              onChange={(e) => setLsr(e.target.value)}
              className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            >
              {filterLsrs.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SIF Category</label>
            <select
              value={sifPotential}
              onChange={(e) => setSifPotential(e.target.value)}
              className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            >
              {filterSifOpts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assurance Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            >
              {filterStatuses.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

        </div>

      </div>

      {/* Events Table List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
            <span className="text-xs font-semibold">Filtering safety logs...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-slate-300 text-4xl mb-3">📭</div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Safety Events Found</h4>
            <p className="text-[10px] text-slate-400 mt-1">Try modifying your search or filter values above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                <tr>
                  <th className="px-5 py-3">Event ID</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Refinery Location</th>
                  <th className="px-5 py-3">Activity Type</th>
                  <th className="px-5 py-3 text-center">SIF Potential</th>
                  <th className="px-5 py-3">Life-Saving Rule</th>
                  <th className="px-5 py-3 text-center">Confidence</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{evt.id}</td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(evt.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{evt.site}</div>
                      <div className="text-[10px] text-slate-400">{evt.location}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium">{evt.activity}</td>
                    <td className="px-5 py-3.5 text-center">
                      <RiskBadge probability={evt.sif_probability} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700">
                        {evt.life_saving_rule}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-600">
                      {evt.confidence}%
                    </td>
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onViewEvent(evt)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-industrial-blue hover:text-white border border-slate-200 rounded-lg text-[10px] font-semibold flex items-center gap-1 ml-auto transition"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};
