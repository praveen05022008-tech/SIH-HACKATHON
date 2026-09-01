import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Users,
  ShieldCheck,
  Cpu,
  Database,
  FileText,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  HardHat,
  ClipboardCheck,
  BarChart3,
  Power,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Globe,
  Activity,
  BrainCircuit,
  ChevronRight,
  Info,
  Wrench,
  Shield,
  Award,
  Sparkles,
  Search,
  Sliders,
  Check,
  Server,
  KeyRound,
  UserPlus
} from 'lucide-react';
import { User, AuditEvent } from '../types';

interface AdminConsoleProps {
  onResetDb?: () => void;
  triggerNotification?: (msg: string) => void;
  onNavigateTo?: (page: string) => void;
}

// ── Portal Definitions ────────────────────────────────────────────────────────
interface PortalDef {
  id: string;
  name: string;
  persona: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  description: string;
  route: string;
  capabilities: string[];
  stats: { label: string; value: string }[];
}

const PORTALS: PortalDef[] = [
  {
    id: 'worker-portal',
    name: 'Field Worker Portal',
    persona: 'Persona 1 — Field Operations',
    icon: HardHat,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    description: 'Allows field employees to submit safety observations (Unsafe Act, Unsafe Condition, Near-Miss) via text, voice dictation, or photo evidence. Reports are immediately queued for AI analysis.',
    route: 'worker-portal',
    capabilities: ['Submit safety reports', 'Voice transcription', 'Photo attachment', 'Track own submissions', 'Receive feedback'],
    stats: [
      { label: 'Active Users', value: '24' },
      { label: 'Reports Today', value: '8' },
      { label: 'Avg. Submit Time', value: '2.3 min' }
    ]
  },
  {
    id: 'ai-engine',
    name: 'AI Engine & Analysis',
    persona: 'Persona 2 — AI Processing',
    icon: BrainCircuit,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50/70',
    borderColor: 'border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-800',
    description: 'Automated 6-step NLP pipeline (M1–M6) processes every report. Extracts hazards, energy sources, barrier failures, assigns 0–10 multi-factor SIF risk scores, and classifies LSR violations.',
    route: 'analysis',
    capabilities: ['NLP entity extraction', 'Multi-factor risk scoring (0–10)', 'LSR classification', 'SIF precursor detection', 'GATI learning feedback'],
    stats: [
      { label: 'Model', value: 'GATI v1.3' },
      { label: 'Accuracy', value: '94.8%' },
      { label: 'Avg. Process', value: '1.4 sec' }
    ]
  },
  {
    id: 'review',
    name: 'Safety Officer Center',
    persona: 'Persona 3 — Safety Lead',
    icon: ClipboardCheck,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50/70',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
    description: 'Safety Officers review AI-scored reports, verify SIF precursor classification, issue Stop Work Orders, dispatch corrective actions (ACT-XXXX), and provide worker feedback.',
    route: 'dashboard',
    capabilities: ['Review AI-scored reports', 'Issue Stop Work Orders', 'Dispatch corrective actions', 'Override AI classification', 'Provide worker feedback'],
    stats: [
      { label: 'Pending Review', value: '12' },
      { label: 'Actions Active', value: '6' },
      { label: 'Avg. SLA Turnaround', value: '4.2 hrs' }
    ]
  },
  {
    id: 'manager',
    name: 'HSE Manager Suite',
    persona: 'Persona 4 — HSE Leadership',
    icon: BarChart3,
    color: 'text-[#008779]',
    bgColor: 'bg-[#E8F6F4]/70',
    borderColor: 'border-teal-200',
    badgeColor: 'bg-teal-100 text-[#008779]',
    description: 'Executive dashboards, SIF precursor intelligence heatmaps, Life-Saving Rules compliance analytics, and continuous learning feedback monitoring for operational leadership.',
    route: 'dashboard',
    capabilities: ['Executive KPI telemetry', 'Precursor bubble clusters', 'LSR compliance matrix', 'Export regulatory reports', 'Continuous model fine-tuning'],
    stats: [
      { label: 'Monitored Sites', value: '5' },
      { label: 'LSR Rules Active', value: '10' },
      { label: 'SIF Prevention Rate', value: '94.2%' }
    ]
  }
];

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  onResetDb,
  triggerNotification,
  onNavigateTo
}) => {
  const [activeTab, setActiveTab] = useState<'portals' | 'users' | 'ai' | 'audit' | 'data'>('portals');
  const [portalStates, setPortalStates] = useState<Record<string, { enabled: boolean; maintenance: boolean; accessLevel: string }>>({
    'worker-portal': { enabled: true, maintenance: false, accessLevel: 'Field Worker, All Authenticated' },
    'ai-engine':     { enabled: true, maintenance: false, accessLevel: 'All Roles (Background Pipeline)' },
    'review':        { enabled: true, maintenance: false, accessLevel: 'Safety Officer, Safety Manager, Admin' },
    'manager':       { enabled: true, maintenance: false, accessLevel: 'Safety Manager, Admin' }
  });

  const [expandedPortal, setExpandedPortal] = useState<string | null>(null);
  const [savedNotif, setSavedNotif] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  // Users state
  const [users, setUsers] = useState<User[]>([
    { email: 'worker@refinery.safe',  name: 'Ramesh Kumar (Drilling Tech)',     role: 'Field Worker' },
    { email: 'officer@refinery.safe', name: 'Capt. Arvind Sen (Safety Lead)',    role: 'Safety Officer' },
    { email: 'reviewer@refinery.safe',name: 'Priya Sharma (HSE Inspector)',     role: 'Safety Officer' },
    { email: 'manager@refinery.safe', name: 'Dr. Vikram Roy (Head of HSE)',     role: 'Safety Manager' },
    { email: 'admin@refinery.safe',   name: 'DevOps System Admin',              role: 'Admin' },
  ]);

  // AI Threshold State
  const [criticalThreshold, setCriticalThreshold] = useState(8.0);
  const [highThreshold, setHighThreshold] = useState(6.0);
  const [autoStopWork, setAutoStopWork] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'audit') {
      setLoadingAudits(true);
      fetch('http://localhost:8000/api/audit')
        .then(r => r.ok ? r.json() : [])
        .then(d => setAuditLogs(d))
        .catch(() => {})
        .finally(() => setLoadingAudits(false));
    }
  }, [activeTab]);

  const togglePortalEnabled = (id: string) => {
    setPortalStates(prev => {
      const next = { ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } };
      const portal = PORTALS.find(p => p.id === id)!;
      const state = next[id].enabled ? 'ENABLED' : 'DISABLED';
      if (triggerNotification) triggerNotification(`Admin: ${portal.name} portal ${state}.`);
      setSavedNotif(`${portal.name} portal is now ${state}.`);
      setTimeout(() => setSavedNotif(null), 3000);
      return next;
    });
  };

  const togglePortalMaintenance = (id: string) => {
    setPortalStates(prev => {
      const next = { ...prev, [id]: { ...prev[id], maintenance: !prev[id].maintenance } };
      const portal = PORTALS.find(p => p.id === id)!;
      const mode = next[id].maintenance ? 'MAINTENANCE MODE' : 'NORMAL OPERATION';
      if (triggerNotification) triggerNotification(`Admin: ${portal.name} set to ${mode}.`);
      setSavedNotif(`${portal.name} switched to ${mode}.`);
      setTimeout(() => setSavedNotif(null), 3000);
      return next;
    });
  };

  const handleSaveAIConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess('AI thresholds and neural parameters saved successfully.');
    if (triggerNotification) triggerNotification(`⚙️ AI weights updated. Critical threshold: ${criticalThreshold}/10, High: ${highThreshold}/10.`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const tabs = [
    { id: 'portals', label: 'Portal Management', icon: Globe },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'ai', label: 'AI Thresholds', icon: Cpu },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'data', label: 'Data & Backup', icon: Database },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">

      {/* 1. HERO HEADER BANNER (Consistent with RAKSHA Design System) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#007A78] via-[#008779] to-[#00A389] text-white p-7 shadow-lg shadow-[#008779]/20">
        
        {/* Background Watermark Icon */}
        <div className="absolute right-6 -bottom-6 opacity-15 pointer-events-none">
          <Award className="h-48 w-48 text-white stroke-1" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-bold text-emerald-100 mb-2 border border-white/20">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
            <span>Persona 5 — System Administrator & Governance</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Portal Management & Control Center
          </h1>
          <p className="text-sm text-emerald-50/90 italic mt-1 font-medium leading-relaxed">
            Oversee, configure, and govern all RAKSHA AI enterprise portals, roles, AI thresholds, and system health.
          </p>

          {/* System Health Status Badges */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {[
              { label: 'AI Engine', status: 'Online', color: 'bg-emerald-400' },
              { label: 'GATI Model', status: 'v1.3 Active', color: 'bg-teal-300' },
              { label: 'Database', status: 'Healthy', color: 'bg-emerald-400' },
              { label: 'All Portals', status: `${Object.values(portalStates).filter(s => s.enabled).length}/4 Online`, color: 'bg-amber-300' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 bg-white/15 backdrop-blur-xs border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-2xs">
                <span className={`h-2 w-2 rounded-full ${item.color} animate-pulse`} />
                <span className="text-emerald-100 font-semibold">{item.label}:</span>
                <span>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Saved Notification Toast */}
      {savedNotif && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold shadow-xs animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedNotif}</span>
        </div>
      )}

      {/* 2. TAB NAVIGATION PILLS */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-[#E6ECEB] shadow-2xs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-[#008779] text-white shadow-md shadow-[#008779]/25 scale-[1.01]'
                  : 'bg-transparent text-slate-600 hover:bg-[#E8F6F4]/60 hover:text-[#008779]'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: PORTAL MANAGEMENT ── */}
      {activeTab === 'portals' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#E6ECEB] shadow-sm">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-8 w-8 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  All RAKSHA AI Portals
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Control access permissions, toggle maintenance modes, and navigate into each operational portal.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {PORTALS.map(portal => {
              const Icon = portal.icon;
              const state = portalStates[portal.id];
              const isExpanded = expandedPortal === portal.id;

              return (
                <div
                  key={portal.id}
                  className={`bg-white rounded-3xl border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden ${
                    state.enabled ? portal.borderColor : 'border-slate-200 opacity-75'
                  }`}
                >
                  {/* Portal Card Header */}
                  <div className={`p-6 ${state.enabled ? portal.bgColor : 'bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${state.enabled ? 'bg-white shadow-xs' : 'bg-slate-100'} border ${portal.borderColor}`}>
                          <Icon className={`h-6 w-6 ${state.enabled ? portal.color : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{portal.persona}</div>
                          <div className={`text-base font-extrabold mt-0.5 ${state.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{portal.name}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {state.maintenance ? (
                          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <Wrench className="h-3 w-3" /> Maintenance
                          </span>
                        ) : state.enabled ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 flex items-center gap-1 shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-300 flex items-center gap-1 shadow-2xs">
                            <Power className="h-3 w-3" /> Disabled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats Strip */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/60 bg-white/60 p-3 rounded-2xl">
                      {portal.stats.map(s => (
                        <div key={s.label} className="text-center">
                          <div className={`text-sm font-black font-mono-numbers ${state.enabled ? portal.color : 'text-slate-400'}`}>{s.value}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Portal Action Bar */}
                  <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex flex-wrap items-center gap-2">
                    {/* Enable / Disable Toggle */}
                    <button
                      onClick={() => togglePortalEnabled(portal.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                        state.enabled
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{state.enabled ? 'Disable' : 'Enable'}</span>
                    </button>

                    {/* Maintenance Mode */}
                    <button
                      onClick={() => togglePortalMaintenance(portal.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                        state.maintenance
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>{state.maintenance ? 'Exit Maint.' : 'Maintenance'}</span>
                    </button>

                    {/* Open Portal Button */}
                    <button
                      onClick={() => { if (onNavigateTo) onNavigateTo(portal.route); }}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold bg-[#008779] text-white hover:bg-[#007064] transition shadow-2xs ml-auto cursor-pointer"
                    >
                      <span>Open Portal</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    {/* Expand Details */}
                    <button
                      onClick={() => setExpandedPortal(isExpanded ? null : portal.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      title="Toggle details"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs space-y-3 animate-fadeIn">
                      <p className="text-slate-600 leading-relaxed font-normal">{portal.description}</p>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Capabilities</div>
                        <div className="flex flex-wrap gap-1.5">
                          {portal.capabilities.map(cap => (
                            <span key={cap} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 font-semibold shadow-2xs">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Access Authorization Level</div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                          <Shield className="h-3.5 w-3.5 text-[#008779]" />
                          {state.maintenance ? (
                            <span className="text-amber-700 font-bold">⚠ Restricted — System Administrators Only</span>
                          ) : state.enabled ? (
                            <span>{portalStates[portal.id].accessLevel}</span>
                          ) : (
                            <span className="text-rose-600 font-bold">🔒 Portal Offline — Access Blocked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Portal Health Overview Summary */}
          <div className="bg-white rounded-3xl border border-[#E6ECEB] p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#008779]" />
              <span>Real-Time Portal Status Matrix</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {PORTALS.map(p => {
                const state = portalStates[p.id];
                const Icon = p.icon;
                return (
                  <div key={p.id} className={`p-4 rounded-2xl border text-center transition-all ${state.enabled && !state.maintenance ? p.bgColor + ' ' + p.borderColor : 'bg-slate-50 border-slate-200'}`}>
                    <Icon className={`h-6 w-6 mx-auto mb-1.5 ${state.enabled ? p.color : 'text-slate-400'}`} />
                    <div className="text-xs font-extrabold text-slate-800 leading-tight">{p.name}</div>
                    <div className={`text-[10px] font-black mt-1.5 ${state.maintenance ? 'text-amber-600' : state.enabled ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {state.maintenance ? '⚠ Maintenance' : state.enabled ? '● Online' : '○ Disabled'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: USERS & ROLES ── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECEB] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Active Users & Role Governance</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Control access rights, role permissions, and user accounts across all 5 operational personas.</p>
            </div>
            <button
              onClick={() => alert('Add User Modal')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#008779] text-white rounded-xl text-xs font-extrabold hover:bg-[#007064] transition shadow-2xs cursor-pointer shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add New User</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((u) => (
                  <tr key={u.email} className="hover:bg-[#E8F6F4]/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-[#E8F6F4] text-[#008779] font-black rounded-full flex items-center justify-center text-sm shrink-0 border border-teal-200">
                          {u.name[0]}
                        </div>
                        <div className="font-bold text-slate-900">{u.name}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        u.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        u.role === 'Safety Manager' ? 'bg-teal-50 text-[#008779] border-teal-200' :
                        u.role === 'Safety Officer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button className="text-xs font-bold text-[#008779] hover:underline cursor-pointer">
                        Edit Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: AI THRESHOLDS ── */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECEB] shadow-sm">
          <form onSubmit={handleSaveAIConfig} className="space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">AI Multi-Factor Risk Scoring Calibration</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Tune the SIF precursor scoring sensitivity boundaries that trigger immediate alerts, Stop Work recommendations, and management escalations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Critical Threshold Slider */}
              <div className="p-5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-800">Critical SIF Threshold</label>
                  <span className="text-xs font-black text-rose-600 font-mono-numbers bg-white px-2 py-0.5 rounded-md border border-rose-200">{criticalThreshold.toFixed(1)} / 10</span>
                </div>
                <input type="range" min="7.0" max="9.5" step="0.1" value={criticalThreshold}
                  onChange={e => setCriticalThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Observations scoring above this automatically flag as CRITICAL, suggest Stop Work Orders, and push emergency notifications.</p>
              </div>

              {/* High Risk Threshold Slider */}
              <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-800">High SIF Risk Threshold</label>
                  <span className="text-xs font-black text-amber-600 font-mono-numbers bg-white px-2 py-0.5 rounded-md border border-amber-200">{highThreshold.toFixed(1)} / 10</span>
                </div>
                <input type="range" min="5.0" max="7.5" step="0.1" value={highThreshold}
                  onChange={e => setHighThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Dispatches priority alert flags directly to the Safety Officer triage queue.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <input type="checkbox" id="autoStopWork" checked={autoStopWork}
                onChange={e => setAutoStopWork(e.target.checked)}
                className="h-4 w-4 rounded accent-[#008779] cursor-pointer"
              />
              <label htmlFor="autoStopWork" className="text-xs font-bold text-slate-700 cursor-pointer">
                Automatically suggest Stop Work Authority invocation when report crosses Critical SIF threshold
              </label>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 animate-fadeIn">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <button type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save AI Thresholds</span>
            </button>
          </form>
        </div>
      )}

      {/* ── TAB 4: AUDIT LOGS ── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECEB] shadow-sm space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Tamper-Proof System Audit Logs</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Chronological immutable record of all safety submissions, AI scores, and officer verifications.</p>
            </div>
            <span className="text-xs text-[#008779] font-extrabold bg-[#E8F6F4] px-3 py-1 rounded-full border border-teal-100">{auditLogs.length} Records</span>
          </div>

          {loadingAudits ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading audit records...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No audit records found.</div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100 text-xs">
              {auditLogs.map(log => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-slate-50/80 px-3 rounded-2xl transition">
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{log.action}</span>
                      <span className="text-[10px] font-mono text-[#008779] bg-[#E8F6F4] px-2 py-0.5 rounded-md">{log.event_id}</span>
                    </div>
                    {log.details && <p className="text-slate-500 text-[11px] leading-snug">{log.details}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className="text-[11px] text-[#008779] font-bold">{log.user_email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: DATA & BACKUP ── */}
      {activeTab === 'data' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECEB] shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Database Integrity & Maintenance</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Automated backups, database health metrics, and seed reset functions for the RAKSHA AI platform.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {[
              { label: 'Total Safety Records', value: '106+', color: 'text-[#008779]', bg: 'bg-[#E8F6F4]' },
              { label: 'Active User Personas', value: '5', color: 'text-purple-700', bg: 'bg-purple-50' },
              { label: 'Audit Log Entries', value: `${auditLogs.length || '12'}`, color: 'text-blue-700', bg: 'bg-blue-50' }
            ].map(s => (
              <div key={s.label} className={`p-4 ${s.bg} border border-slate-200/70 rounded-2xl text-center`}>
                <div className={`text-2xl font-black font-mono-numbers ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="p-5 bg-rose-50/70 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold text-slate-900">Purge & Re-Seed Demo Safety Dataset</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Replaces database with the comprehensive baseline RAKSHA AI dataset including all 5 personas and reference Life-Saving Rules catalog.</div>
            </div>
            <button
              type="button"
              onClick={onResetDb}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition shrink-0 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset Database</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
