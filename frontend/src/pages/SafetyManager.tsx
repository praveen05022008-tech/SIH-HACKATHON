import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Radio, 
  Send, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  Building2, 
  RefreshCcw, 
  ChevronRight, 
  Sparkles, 
  Check, 
  X, 
  Search, 
  SlidersHorizontal,
  Flame,
  Award,
  Bell,
  ArrowRightLeft,
  FileCheck2,
  AlertOctagon,
  Calendar,
  Layers
} from 'lucide-react';
import { OfficerProfile, OfficerTask, SafetyDirective, SafetyEvent } from '../types';

interface SafetyManagerProps {
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  onNavigateTo?: (page: string) => void;
}

export const SafetyManager: React.FC<SafetyManagerProps> = ({
  triggerNotification,
  triggerStateRefresh,
  onNavigateTo
}) => {
  const [officers, setOfficers] = useState<OfficerProfile[]>([]);
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [directives, setDirectives] = useState<SafetyDirective[]>([]);
  const [highRiskEvents, setHighRiskEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'workforce' | 'tasks' | 'directives' | 'reassign'>('workforce');

  // Modals state
  const [allotModalOfficer, setAllotModalOfficer] = useState<OfficerProfile | null>(null);
  const [allotForm, setAllotForm] = useState({
    site: '',
    unit: '',
    shift: '',
    status: 'On Duty',
    radio_channel: ''
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    task_type: 'SIF Precursor Audit',
    site: 'Digboi Refinery D',
    unit: 'CDU Unit',
    priority: 'HIGH',
    assigned_officer_id: 1,
    instructions: '',
    due_days: 2
  });

  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [directiveForm, setDirectiveForm] = useState({
    title: '',
    message: '',
    priority: 'HIGH',
    target_sites: 'All Operational Sites'
  });

  const [reassignModalEvent, setReassignModalEvent] = useState<SafetyEvent | null>(null);
  const [reassignOfficerName, setReassignOfficerName] = useState('');
  const [reassignManagerNote, setReassignManagerNote] = useState('');

  // Fetch all Manager Data
  const fetchManagerData = async () => {
    setLoading(true);
    try {
      const [offRes, taskRes, dirRes, evtRes] = await Promise.all([
        fetch('http://localhost:8000/api/manager/officers'),
        fetch('http://localhost:8000/api/manager/tasks'),
        fetch('http://localhost:8000/api/manager/directives'),
        fetch('http://localhost:8000/api/events?status=Needs%20Review')
      ]);

      if (offRes.ok) {
        const offData = await offRes.json();
        setOfficers(offData);
        if (offData.length > 0 && !allotForm.site) {
          setTaskForm(prev => ({ ...prev, assigned_officer_id: offData[0].id }));
        }
      }
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData);
      }
      if (dirRes.ok) {
        const dirData = await dirRes.json();
        setDirectives(dirData);
      }
      if (evtRes.ok) {
        const evtData: SafetyEvent[] = await evtRes.json();
        setHighRiskEvents(evtData.filter(e => (e.sif_risk_score ?? 5.0) >= 6.5 || e.sif_probability >= 50));
      }
    } catch (err) {
      console.warn('Backend API manager fetch failed, using built-in mock manager state.', err);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const mockOfficers: OfficerProfile[] = [
      {
        id: 1,
        officer_name: 'Capt. Arvind Sen',
        officer_code: 'OFF-101',
        email: 'officer@refinery.safe',
        phone: '+91 98450 11001',
        radio_channel: 'Ch 1 (VHF Command)',
        site: 'Digboi Refinery D',
        unit: 'FCCU',
        shift: 'Shift A (06:00 - 14:00)',
        status: 'On Duty',
        certifications: ['LOTO Auditor', 'Heavy Lift Supervisor', 'NEBOSH IGC', 'High-Pressure Gas Specialist'],
        experience_years: 12,
        max_capacity: 8,
        open_reviews_count: 4,
        active_tasks_count: 2,
        completed_tasks_count: 15,
        total_tasks_count: 17,
        workload_score: 75,
        compliance_rate: 98.4
      },
      {
        id: 2,
        officer_name: 'Priya Sharma',
        officer_code: 'OFF-102',
        email: 'reviewer@refinery.safe',
        phone: '+91 98450 11002',
        radio_channel: 'Ch 2 (VHF Refinery)',
        site: 'Digboi Refinery D',
        unit: 'CDU',
        shift: 'Shift B (14:00 - 22:00)',
        status: 'In Field',
        certifications: ['Confined Space Entry Lead', 'Gas Tester Certified', 'Working at Height Auditor'],
        experience_years: 8,
        max_capacity: 6,
        open_reviews_count: 2,
        active_tasks_count: 1,
        completed_tasks_count: 11,
        total_tasks_count: 12,
        workload_score: 50,
        compliance_rate: 97.2
      },
      {
        id: 3,
        officer_name: 'Rajesh Verma',
        officer_code: 'OFF-103',
        email: 'r.verma@refinery.safe',
        phone: '+91 98450 11003',
        radio_channel: 'Ch 6 (Offshore KG)',
        site: 'Offshore Rig 04',
        unit: 'Substructure & BOP',
        shift: 'Night Vigil (22:00 - 06:00)',
        status: 'On Duty',
        certifications: ['BOSIET Offshore', 'Well-Control Barrier Certified', 'Emergency Response Commander'],
        experience_years: 10,
        max_capacity: 7,
        open_reviews_count: 3,
        active_tasks_count: 2,
        completed_tasks_count: 9,
        total_tasks_count: 11,
        workload_score: 71,
        compliance_rate: 99.0
      },
      {
        id: 4,
        officer_name: 'Ananya Das',
        officer_code: 'OFF-104',
        email: 'a.das@refinery.safe',
        phone: '+91 98450 11004',
        radio_channel: 'Ch 3 (Process Safety)',
        site: 'Drilling Site B',
        unit: 'Mud Pump Area',
        shift: 'Shift A (06:00 - 14:00)',
        status: 'In Field',
        certifications: ['Energy Isolation Master', 'Hot Work Permit Issuer', 'Incident Investigator'],
        experience_years: 7,
        max_capacity: 6,
        open_reviews_count: 2,
        active_tasks_count: 1,
        completed_tasks_count: 8,
        total_tasks_count: 9,
        workload_score: 50,
        compliance_rate: 96.5
      },
      {
        id: 5,
        officer_name: 'Vikramjit Singh',
        officer_code: 'OFF-105',
        email: 'v.singh@refinery.safe',
        phone: '+91 98450 11005',
        radio_channel: 'Ch 4 (Drill Floor)',
        site: 'Drilling Site A',
        unit: 'Derrick & Mast',
        shift: 'Shift B (14:00 - 22:00)',
        status: 'Standby',
        certifications: ['Rigging & Slinging Lead', 'Dropping Objects Preventer', 'Scaffolding Inspector'],
        experience_years: 9,
        max_capacity: 7,
        open_reviews_count: 1,
        active_tasks_count: 0,
        completed_tasks_count: 14,
        total_tasks_count: 14,
        workload_score: 14,
        compliance_rate: 100.0
      },
      {
        id: 6,
        officer_name: 'Debojit Borah',
        officer_code: 'OFF-106',
        email: 'd.borah@refinery.safe',
        phone: '+91 98450 11006',
        radio_channel: 'Ch 5 (Storage Terminal)',
        site: 'Numaligarh Terminal',
        unit: 'Tank Farm 03',
        shift: 'Shift A (06:00 - 14:00)',
        status: 'On Duty',
        certifications: ['Hydrocarbon Leak Detector', 'Atmospheric Monitoring', 'Fire Safety Expert'],
        experience_years: 6,
        max_capacity: 5,
        open_reviews_count: 1,
        active_tasks_count: 1,
        completed_tasks_count: 6,
        total_tasks_count: 7,
        workload_score: 40,
        compliance_rate: 94.8
      }
    ];

    setOfficers(mockOfficers);
    setTasks([
      {
        id: 1,
        task_id: 'TSK-101',
        title: 'Priority Verification of LOTO Isolation on CDU High-Pressure Header',
        task_type: 'SIF Precursor Audit',
        site: 'Digboi Refinery D',
        unit: 'CDU Area',
        priority: 'CRITICAL',
        assigned_officer_id: 1,
        assigned_officer_name: 'Capt. Arvind Sen',
        assigned_by: 'Dr. Vikram Roy (Head of HSE)',
        instructions: 'Spot-check all 14 isolation padlock tags at valve rack V-204 to verify physical bleed-off.',
        status: 'In Progress',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: 2,
        task_id: 'TSK-102',
        title: 'Mast Scaffold Safety Hook & Dual Lanyard Verification',
        task_type: 'Stop Work Verification',
        site: 'Drilling Site A',
        unit: 'Derrick Substructure',
        priority: 'HIGH',
        assigned_officer_id: 5,
        assigned_officer_name: 'Vikramjit Singh',
        assigned_by: 'Dr. Vikram Roy (Head of HSE)',
        instructions: 'Confirm contractor technicians on 12m work platform have secured inertia reel self-retracting lifelines.',
        status: 'Assigned',
        due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 8).toISOString()
      }
    ]);

    setDirectives([
      {
        id: 1,
        directive_id: 'DIR-501',
        title: 'Mandatory Double Block & Bleed Verification for All Valve Disconnects',
        message: 'Effective immediately across all drilling and refinery sites: Single-valve isolations on lines >150 PSI are strictly prohibited without written HSE Lead exemption.',
        priority: 'URGENT',
        target_sites: 'All Operational Sites',
        issued_by: 'Dr. Vikram Roy (Head of HSE)',
        acknowledge_count: 5,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  };

  useEffect(() => {
    fetchManagerData();
  }, [triggerStateRefresh]);

  // Open Allotment Modal
  const handleOpenAllotModal = (officer: OfficerProfile) => {
    setAllotModalOfficer(officer);
    setAllotForm({
      site: officer.site,
      unit: officer.unit,
      shift: officer.shift,
      status: officer.status,
      radio_channel: officer.radio_channel
    });
  };

  // Submit Allotment
  const handleSubmitAllotment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allotModalOfficer) return;

    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/manager/officers/allot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officer_id: allotModalOfficer.id,
          site: allotForm.site,
          unit: allotForm.unit,
          shift: allotForm.shift,
          status: allotForm.status,
          radio_channel: allotForm.radio_channel
        })
      });

      if (!res.ok) throw new Error('Failed to update allotment');
      
      triggerNotification(`✅ Successfully updated field allotment for ${allotModalOfficer.officer_name}`);
      setAllotModalOfficer(null);
      fetchManagerData();
    } catch (err) {
      console.warn('Allotment API failed, updating local state:', err);
      setOfficers(prev => prev.map(o => o.id === allotModalOfficer.id ? {
        ...o,
        site: allotForm.site,
        unit: allotForm.unit,
        shift: allotForm.shift,
        status: allotForm.status,
        radio_channel: allotForm.radio_channel
      } : o));
      triggerNotification(`✅ Field allotment updated for ${allotModalOfficer.officer_name}`);
      setAllotModalOfficer(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assigned_officer_id) return;

    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/manager/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm)
      });

      if (!res.ok) throw new Error('Failed to create task');
      const data = await res.json();
      
      triggerNotification(`📋 Dispatched Inspection Task ${data.task_id} to assigned officer`);
      setShowTaskModal(false);
      setTaskForm({
        title: '',
        task_type: 'SIF Precursor Audit',
        site: 'Digboi Refinery D',
        unit: 'CDU Unit',
        priority: 'HIGH',
        assigned_officer_id: officers[0]?.id || 1,
        instructions: '',
        due_days: 2
      });
      fetchManagerData();
    } catch (err) {
      console.warn('Create task API failed, adding locally:', err);
      const assignedOff = officers.find(o => o.id === Number(taskForm.assigned_officer_id));
      const newTask: OfficerTask = {
        id: Date.now(),
        task_id: `TSK-${Math.floor(Math.random() * 900) + 100}`,
        title: taskForm.title,
        task_type: taskForm.task_type,
        site: taskForm.site,
        unit: taskForm.unit,
        priority: taskForm.priority,
        assigned_officer_id: taskForm.assigned_officer_id,
        assigned_officer_name: assignedOff ? assignedOff.officer_name : 'Safety Officer',
        assigned_by: 'Dr. Vikram Roy (Head of HSE)',
        instructions: taskForm.instructions,
        status: 'Assigned',
        due_date: new Date(Date.now() + taskForm.due_days * 86400000).toISOString(),
        created_at: new Date().toISOString()
      };
      setTasks(prev => [newTask, ...prev]);
      triggerNotification(`📋 Inspection Task ${newTask.task_id} dispatched!`);
      setShowTaskModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Broadcast Directive
  const handleBroadcastDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveForm.title || !directiveForm.message) return;

    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/manager/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directiveForm)
      });

      if (!res.ok) throw new Error('Failed to broadcast directive');
      const data = await res.json();
      
      triggerNotification(`📢 Broadcasted Safety Directive ${data.directive_id} to ${directiveForm.target_sites}`);
      setShowDirectiveModal(false);
      setDirectiveForm({
        title: '',
        message: '',
        priority: 'HIGH',
        target_sites: 'All Operational Sites'
      });
      fetchManagerData();
    } catch (err) {
      console.warn('Broadcast API failed, adding locally:', err);
      const newDir: SafetyDirective = {
        id: Date.now(),
        directive_id: `DIR-${Math.floor(Math.random() * 900) + 500}`,
        title: directiveForm.title,
        message: directiveForm.message,
        priority: directiveForm.priority,
        target_sites: directiveForm.target_sites,
        issued_by: 'Dr. Vikram Roy (Head of HSE)',
        acknowledge_count: 0,
        created_at: new Date().toISOString()
      };
      setDirectives(prev => [newDir, ...prev]);
      triggerNotification(`📢 Safety Directive ${newDir.directive_id} broadcasted!`);
      setShowDirectiveModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Reassign High-Risk Event
  const handleReassignEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalEvent || !reassignOfficerName) return;

    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/manager/reassign-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: reassignModalEvent.id,
          officer_name: reassignOfficerName,
          manager_note: reassignManagerNote
        })
      });

      if (!res.ok) throw new Error('Failed to reassign event');
      
      triggerNotification(`🔄 Reassigned SIF Case ${reassignModalEvent.id} to ${reassignOfficerName}`);
      setReassignModalEvent(null);
      setReassignManagerNote('');
      fetchManagerData();
    } catch (err) {
      console.warn('Reassign event API failed, updating locally:', err);
      setHighRiskEvents(prev => prev.map(ev => ev.id === reassignModalEvent.id ? { ...ev, reviewer: reassignOfficerName } : ev));
      triggerNotification(`🔄 SIF Case ${reassignModalEvent.id} reassigned to ${reassignOfficerName}`);
      setReassignModalEvent(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter officers
  const filteredOfficers = officers.filter(off => {
    const matchesSite = siteFilter === 'ALL' || off.site === siteFilter;
    const matchesShift = shiftFilter === 'ALL' || off.shift.includes(shiftFilter);
    const matchesSearch = searchQuery === '' || 
      off.officer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      off.officer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      off.unit.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSite && matchesShift && matchesSearch;
  });

  const onDutyCount = officers.filter(o => o.status === 'On Duty' || o.status === 'In Field').length;
  const activeTasksCount = tasks.filter(t => t.status === 'Assigned' || t.status === 'In Progress').length;
  const criticalTasksCount = tasks.filter(t => t.priority === 'CRITICAL').length;
  const totalDirectivesCount = directives.length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#071D3A] via-[#0A2540] to-[#1E3A8A] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Safety Management & Governance
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Workforce Active</span>
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1">HSE Manager Command Center</h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              Workforce allotment, safety officer coverage, proactive SIF precursor inspections, and company-wide safety directives dispatch.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setShowDirectiveModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md hover:shadow-red-600/30"
            >
              <Send className="h-4 w-4" />
              <span>Broadcast Safety Directive</span>
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md hover:shadow-blue-500/30"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Dispatch SIF Audit Task</span>
            </button>
            <button
              onClick={fetchManagerData}
              disabled={loading}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition"
              title="Refresh Manager Data"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Manager KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-blue-800/60">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-300" />
              <span>Field Officers Active</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {onDutyCount} <span className="text-xs text-blue-300 font-normal">/ {officers.length} Deployed</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
              <span>Active SIF Audit Tasks</span>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {activeTasksCount} <span className="text-xs text-blue-300 font-normal">({criticalTasksCount} Critical)</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-red-300" />
              <span>Safety Directives</span>
            </div>
            <div className="text-2xl font-black text-red-400 mt-1">
              {totalDirectivesCount} <span className="text-xs text-blue-300 font-normal">Broadcasted</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-emerald-300" />
              <span>Workforce Compliance</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              98.2% <span className="text-xs text-blue-300 font-normal">Avg Conformance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setActiveTab('workforce')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'workforce'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Workforce & Allotments ({officers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'tasks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Dispatched Inspections ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('directives')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'directives'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="h-4 w-4" />
          <span>Emergency Directives ({directives.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reassign')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'reassign'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>SIF Review Reassignment ({highRiskEvents.length})</span>
        </button>
      </div>

      {/* TAB 1: WORKFORCE & ALLOTMENTS */}
      {activeTab === 'workforce' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search officer name, code, or unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="py-1.5 px-2.5 border border-slate-250 rounded-lg text-xs bg-white text-slate-800 focus:outline-none"
                >
                  <option value="ALL">All Operational Sites</option>
                  <option value="Digboi Refinery D">Digboi Refinery D</option>
                  <option value="Offshore Rig 04">Offshore Rig 04</option>
                  <option value="Drilling Site A">Drilling Site A</option>
                  <option value="Drilling Site B">Drilling Site B</option>
                  <option value="Numaligarh Terminal">Numaligarh Terminal</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="py-1.5 px-2.5 border border-slate-250 rounded-lg text-xs bg-white text-slate-800 focus:outline-none"
                >
                  <option value="ALL">All Shifts</option>
                  <option value="Shift A">Shift A (Morning 06-14)</option>
                  <option value="Shift B">Shift B (Evening 14-22)</option>
                  <option value="Night Vigil">Night Vigil (22-06)</option>
                </select>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Showing {filteredOfficers.length} Officers
            </span>
          </div>

          {/* Officers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOfficers.map((off) => {
              const isWorkloadHigh = off.workload_score >= 80;
              const isWorkloadMedium = off.workload_score >= 50 && off.workload_score < 80;

              return (
                <div 
                  key={off.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-black text-sm">
                          {off.officer_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-sm">{off.officer_name}</h3>
                            <span className="text-[9px] font-bold text-slate-400">{off.officer_code}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{off.phone}</div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                        off.status === 'On Duty' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : off.status === 'In Field'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {off.status}
                      </span>
                    </div>

                    {/* Site, Unit, Shift, Radio Channel */}
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Site & Unit</span>
                        <span className="font-bold text-slate-800">{off.site} • {off.unit}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Coverage Shift</span>
                        <span className="font-semibold text-slate-700">{off.shift}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Radio Comms</span>
                        <span className="font-mono text-[11px] font-bold text-blue-700 flex items-center gap-1">
                          <Radio className="h-3 w-3" />
                          {off.radio_channel}
                        </span>
                      </div>
                    </div>

                    {/* Workload Metric */}
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-slate-400">Workload Capacity</span>
                        <span className={isWorkloadHigh ? 'text-red-600' : isWorkloadMedium ? 'text-amber-600' : 'text-emerald-600'}>
                          {off.workload_score}% ({off.active_tasks_count} Tasks • {off.open_reviews_count} Reviews)
                        </span>
                      </div>
                      <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isWorkloadHigh ? 'bg-red-500' : isWorkloadMedium ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, off.workload_score)}%` }}
                        />
                      </div>
                    </div>

                    {/* Certifications tags */}
                    <div className="mt-4 flex flex-wrap gap-1">
                      {off.certifications.slice(0, 3).map((cert, idx) => (
                        <span key={idx} className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                          {cert}
                        </span>
                      ))}
                      {off.certifications.length > 3 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                          +{off.certifications.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-semibold">Exp: {off.experience_years} yrs</span>
                    <button
                      onClick={() => handleOpenAllotModal(off)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition border border-blue-200"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Reallocate Shift & Site</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DISPATCHED SIF INSPECTIONS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Targeted SIF Inspections & Precursor Patrols</h2>
              <p className="text-xs text-slate-500 mt-0.5">Dispatched safety audits assigned to specific field officers with live status tracking.</p>
            </div>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create New Inspection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {task.task_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        task.priority === 'CRITICAL' 
                          ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                          : task.priority === 'HIGH'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {task.priority} Priority
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      task.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : task.status === 'In Progress'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{task.title}</h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">{task.site} • {task.unit}</div>

                  <div className="mt-3 p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-700 italic">
                    "{task.instructions}"
                  </div>

                  {task.findings && (
                    <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                      <b>Field Findings:</b> {task.findings}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-slate-800">{task.assigned_officer_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY DIRECTIVES */}
      {activeTab === 'directives' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Active HSE Directives & Stand-Down Notices</h2>
              <p className="text-xs text-slate-500 mt-0.5">High-priority compliance mandates broadcasted to all operational field radios and portals.</p>
            </div>
            <button
              onClick={() => setShowDirectiveModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
            >
              <Send className="h-4 w-4" />
              <span>Broadcast New Directive</span>
            </button>
          </div>

          <div className="space-y-3">
            {directives.map((dir) => (
              <div 
                key={dir.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between gap-4 items-start md:items-center"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      {dir.directive_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      dir.priority === 'URGENT' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {dir.priority}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Target: <b className="text-slate-800">{dir.target_sites}</b>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm">{dir.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-150">
                    {dir.message}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-emerald-700 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{dir.acknowledge_count} Acknowledged</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Issued by {dir.issued_by}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(dir.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SIF REASSIGNMENT QUEUE */}
      {activeTab === 'reassign' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900">High-Risk Precursor Escalation & Senior Officer Allotment</h2>
            <p className="text-xs text-slate-500 mt-0.5">Reassign critical SIF reports to designated safety auditors and process leads.</p>
          </div>

          <div className="space-y-3">
            {highRiskEvents.map((evt) => (
              <div 
                key={evt.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-slate-900">{evt.id}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-700 border border-red-200">
                      SIF Score: {evt.sif_risk_score ?? 7.5}/10 ({evt.risk_level ?? 'HIGH'})
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">{evt.site} • {evt.unit}</span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-xs line-clamp-1">{evt.description}</h3>
                  <div className="text-[11px] text-slate-500">
                    <b>Identified Rule:</b> {evt.life_saving_rule} • <b>Hazard:</b> {evt.hazard}
                  </div>
                  <div className="text-[11px] text-blue-700 font-semibold">
                    Current Reviewer: {evt.reviewer || 'Unassigned (General Queue)'}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setReassignModalEvent(evt);
                      setReassignOfficerName(officers[0]?.officer_name || '');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span>Reassign to Officer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALLOTMENT MODAL */}
      {allotModalOfficer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Reallocate Field Officer</h3>
                <p className="text-xs text-slate-500 mt-0.5">{allotModalOfficer.officer_name} ({allotModalOfficer.officer_code})</p>
              </div>
              <button onClick={() => setAllotModalOfficer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAllotment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Operational Site</label>
                <select
                  value={allotForm.site}
                  onChange={(e) => setAllotForm({ ...allotForm, site: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                >
                  <option value="Digboi Refinery D">Digboi Refinery D</option>
                  <option value="Offshore Rig 04">Offshore Rig 04</option>
                  <option value="Drilling Site A">Drilling Site A</option>
                  <option value="Drilling Site B">Drilling Site B</option>
                  <option value="Numaligarh Terminal">Numaligarh Terminal</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Section / Unit</label>
                <input
                  type="text"
                  value={allotForm.unit}
                  onChange={(e) => setAllotForm({ ...allotForm, unit: e.target.value })}
                  placeholder="e.g. CDU Area, Mud Pump Area, BOP Stack"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-semibold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Shift Coverage</label>
                  <select
                    value={allotForm.shift}
                    onChange={(e) => setAllotForm({ ...allotForm, shift: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="Shift A (06:00 - 14:00)">Shift A (06:00 - 14:00)</option>
                    <option value="Shift B (14:00 - 22:00)">Shift B (14:00 - 22:00)</option>
                    <option value="Night Vigil (22:00 - 06:00)">Night Vigil (22:00 - 06:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Duty Status</label>
                  <select
                    value={allotForm.status}
                    onChange={(e) => setAllotForm({ ...allotForm, status: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800 font-semibold"
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="In Field">In Field</option>
                    <option value="Standby">Standby</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Radio Comms Channel</label>
                <input
                  type="text"
                  value={allotForm.radio_channel}
                  onChange={(e) => setAllotForm({ ...allotForm, radio_channel: e.target.value })}
                  placeholder="e.g. Ch 1 (VHF Command)"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800 font-mono font-semibold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAllotModalOfficer(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {actionLoading ? 'Updating...' : 'Confirm Allotment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Dispatch SIF Precursor Inspection</h3>
                <p className="text-xs text-slate-500 mt-0.5">Assign targeted safety audit to a field officer</p>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inspection Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Priority Verification of LOTO Isolation on CDU Header"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Task Type</label>
                  <select
                    value={taskForm.task_type}
                    onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-semibold text-slate-800"
                  >
                    <option value="SIF Precursor Audit">SIF Precursor Audit</option>
                    <option value="Surprise LOTO Inspection">Surprise LOTO Inspection</option>
                    <option value="Stop Work Verification">Stop Work Verification</option>
                    <option value="Zone Safety Patrol">Zone Safety Patrol</option>
                    <option value="Action Follow-Up">Action Follow-Up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Site</label>
                  <select
                    value={taskForm.site}
                    onChange={(e) => setTaskForm({ ...taskForm, site: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-semibold text-slate-800"
                  >
                    <option value="Digboi Refinery D">Digboi Refinery D</option>
                    <option value="Offshore Rig 04">Offshore Rig 04</option>
                    <option value="Drilling Site A">Drilling Site A</option>
                    <option value="Drilling Site B">Drilling Site B</option>
                    <option value="Numaligarh Terminal">Numaligarh Terminal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Officer</label>
                  <select
                    value={taskForm.assigned_officer_id}
                    onChange={(e) => setTaskForm({ ...taskForm, assigned_officer_id: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                  >
                    {officers.map(o => (
                      <option key={o.id} value={o.id}>{o.officer_name} ({o.site})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Specific Instructions / Protocol</label>
                <textarea
                  rows={3}
                  value={taskForm.instructions}
                  onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
                  placeholder="Detail exact checkpoints, barrier verification procedures, or isolation points..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {actionLoading ? 'Dispatching...' : 'Dispatch Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BROADCAST DIRECTIVE MODAL */}
      {showDirectiveModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Broadcast HSE Safety Directive</h3>
                <p className="text-xs text-slate-500 mt-0.5">Issue high-priority safety stand-down or operational order</p>
              </div>
              <button onClick={() => setShowDirectiveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcastDirective} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Directive Title</label>
                <input
                  type="text"
                  value={directiveForm.title}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, title: e.target.value })}
                  placeholder="e.g. Mandatory Double Block & Bleed Verification"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Directive Priority</label>
                  <select
                    value={directiveForm.priority}
                    onChange={(e) => setDirectiveForm({ ...directiveForm, priority: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="URGENT">URGENT (Immediate Stand-Down)</option>
                    <option value="HIGH">HIGH Priority</option>
                    <option value="STANDARD">STANDARD Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Sites</label>
                  <input
                    type="text"
                    value={directiveForm.target_sites}
                    onChange={(e) => setDirectiveForm({ ...directiveForm, target_sites: e.target.value })}
                    placeholder="e.g. All Operational Sites"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-semibold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Directive Mandate & Rules</label>
                <textarea
                  rows={4}
                  value={directiveForm.message}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, message: e.target.value })}
                  placeholder="Enter full safety mandate text and instructions for all field teams..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDirectiveModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {actionLoading ? 'Broadcasting...' : 'Broadcast to All Teams'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN EVENT MODAL */}
      {reassignModalEvent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Reassign SIF Assurance Review</h3>
                <p className="text-xs text-slate-500 mt-0.5">{reassignModalEvent.id} • {reassignModalEvent.site}</p>
              </div>
              <button onClick={() => setReassignModalEvent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReassignEvent} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                <b>Observation:</b> {reassignModalEvent.description}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Lead Safety Officer</label>
                <select
                  value={reassignOfficerName}
                  onChange={(e) => setReassignOfficerName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                  required
                >
                  {officers.map(o => (
                    <option key={o.id} value={o.officer_name}>
                      {o.officer_name} ({o.site} • {o.shift})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Manager Note / Instructions</label>
                <input
                  type="text"
                  value={reassignManagerNote}
                  onChange={(e) => setReassignManagerNote(e.target.value)}
                  placeholder="e.g. Conduct urgent on-site LOTO physical verification"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReassignModalEvent(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {actionLoading ? 'Reassigning...' : 'Assign to Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
