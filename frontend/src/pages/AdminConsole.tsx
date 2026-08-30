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
  Shield
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
  description: string;
  route: string;
  capabilities: string[];
  stats: { label: string; value: string }[];
}

const PORTALS: PortalDef[] = [
  {
    id: 'worker-portal',
    name: 'Field Worker Portal',
    persona: 'Persona 1',
    icon: HardHat,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
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
    persona: 'Persona 2',
    icon: BrainCircuit,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
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
    persona: 'Persona 3',
    icon: ClipboardCheck,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Safety Officers review AI-scored reports, verify SIF precursor classification, issue Stop Work Orders, dispatch corrective actions (ACT-XXXX), and provide worker feedback.',
    route: 'review',
    capabilities: ['Review AI-scored reports', 'Issue Stop Work Orders', 'Dispatch corrective actions', 'Override AI classification', 'Provide worker feedback'],
    stats: [
      { label: 'Pending Review', value: '12' },
      { label: 'Actioned Today', value: '6' },
      { label: 'SIF Confirmed', value: '3' }
    ]
  },
  {
    id: 'dashboard',
    name: 'Safety Manager Dashboard',
    persona: 'Persona 4',
    icon: BarChart3,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Executive intelligence dashboard with live KPIs (120/5/15/30/70 dataset), drilling site precursor density heatmaps, Life-Saving Rule breakdown, and compliance report generation.',
    route: 'dashboard',
    capabilities: ['Live KPI monitoring', 'Site risk heatmaps', 'LSR compliance tracking', 'Trend analysis', 'PDF/CSV report export'],
    stats: [
      { label: 'Total Reports', value: '120' },
      { label: 'SIF Critical', value: '5' },
      { label: 'Open Actions', value: '18' }
    ]
  }
];

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onResetDb, triggerNotification, onNavigateTo }) => {
  const [activeTab, setActiveTab] = useState<'portals' | 'users' | 'ai' | 'audit' | 'data'>('portals');

  // Portal states
  const [portalStates, setPortalStates] = useState<Record<string, { enabled: boolean; maintenance: boolean; accessLevel: string }>>({
    'worker-portal': { enabled: true, maintenance: false, accessLevel: 'All Field Workers' },
    'ai-engine': { enabled: true, maintenance: false, accessLevel: 'Automatic (System)' },
    'review': { enabled: true, maintenance: false, accessLevel: 'Safety Officers Only' },
    'dashboard': { enabled: true, maintenance: false, accessLevel: 'Safety Managers + Admin' }
  });
  const [expandedPortal, setExpandedPortal] = useState<string | null>(null);
  const [savedNotif, setSavedNotif] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<User[]>([
    { email: 'worker@refinery.safe', name: 'Field Employee (Worker)', role: 'Field Worker' },
    { email: 'officer@refinery.safe', name: 'Safety Officer', role: 'Safety Officer' },
    { email: 'manager@refinery.safe', name: 'Safety Manager (HSE Lead)', role: 'Safety Manager' },
    { email: 'admin@refinery.safe', name: 'System Administrator', role: 'Admin' }
  ]);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  // AI Thresholds
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
    setSaveSuccess('AI thresholds saved successfully.');
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
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="bg-[#0B2A56] rounded-2xl p-6 text-white shadow-lg border border-blue-500/20">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-purple-500/30">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Persona 5 — System Administrator</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Portal Management & Control Center</h1>
        <p className="text-slate-300 text-sm mt-1 max-w-2xl">
          Oversee, configure, enable/disable, and navigate all SIF-SHIELD AI portals. Manage roles, AI thresholds, and system health from one governance hub.
        </p>

        {/* System Health Strip */}
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { label: 'AI Engine', status: 'Online', color: 'bg-emerald-400' },
            { label: 'GATI Model', status: 'v1.3 Active', color: 'bg-purple-400' },
            { label: 'Database', status: 'Healthy', color: 'bg-blue-400' },
            { label: 'All Portals', status: `${Object.values(portalStates).filter(s => s.enabled).length}/4 Online`, color: 'bg-amber-400' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${item.color} animate-pulse`} />
              <span className="text-slate-300">{item.label}:</span>
              <span className="text-white">{item.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Notification Toast */}
      {savedNotif && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          {savedNotif}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                active
                  ? 'bg-[#0B2A56] text-white border-transparent shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: PORTAL MANAGEMENT ── */}
      {activeTab === 'portals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" />
              All SIF-SHIELD AI Portals
            </h2>
            <p className="text-xs text-slate-500">
              Control access, maintenance mode, and navigate into each portal. Changes are reflected immediately for all users.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {PORTALS.map(portal => {
              const Icon = portal.icon;
              const state = portalStates[portal.id];
              const isExpanded = expandedPortal === portal.id;

              return (
                <div
                  key={portal.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    state.enabled ? portal.borderColor : 'border-slate-200 opacity-70'
                  }`}
                >
                  {/* Portal Card Header */}
                  <div className={`p-5 ${state.enabled ? portal.bgColor : 'bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${state.enabled ? portal.bgColor : 'bg-slate-100'} border ${portal.borderColor}`}>
                          <Icon className={`h-5 w-5 ${state.enabled ? portal.color : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{portal.persona}</div>
                          <div className={`text-sm font-extrabold ${state.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{portal.name}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {state.maintenance ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-300 flex items-center gap-1">
                            <Wrench className="h-3 w-3" /> Maintenance
                          </span>
                        ) : state.enabled ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black border border-red-300 flex items-center gap-1">
                            <Power className="h-3 w-3" /> Disabled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-3 mt-3">
                      {portal.stats.map(s => (
                        <div key={s.label} className="text-center">
                          <div className={`text-sm font-black ${state.enabled ? portal.color : 'text-slate-400'}`}>{s.value}</div>
                          <div className="text-[9px] text-slate-400 font-semibold uppercase">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Portal Controls */}
                  <div className="px-5 py-3 bg-white border-t border-slate-100 flex flex-wrap items-center gap-2">
                    {/* Enable / Disable Toggle */}
                    <button
                      onClick={() => togglePortalEnabled(portal.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                        state.enabled
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {state.enabled ? 'Disable Portal' : 'Enable Portal'}
                    </button>

                    {/* Maintenance Mode */}
                    <button
                      onClick={() => togglePortalMaintenance(portal.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                        state.maintenance
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      {state.maintenance ? 'Exit Maintenance' : 'Maintenance Mode'}
                    </button>

                    {/* Navigate To */}
                    <button
                      onClick={() => { if (onNavigateTo) onNavigateTo(portal.route); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition ml-auto"
                    >
                      Open Portal
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    {/* Expand Details */}
                    <button
                      onClick={() => setExpandedPortal(isExpanded ? null : portal.id)}
                      className="text-slate-400 hover:text-slate-700 transition"
                      title="Toggle details"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 text-xs space-y-3 animate-fadeIn">
                      <p className="text-slate-600 leading-relaxed">{portal.description}</p>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Capabilities</div>
                        <div className="flex flex-wrap gap-1.5">
                          {portal.capabilities.map(cap => (
                            <span key={cap} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 font-medium">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Access Level</div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Shield className="h-3.5 w-3.5 text-blue-500" />
                          {state.maintenance ? (
                            <span className="text-amber-700">⚠ Restricted — Admin Only During Maintenance</span>
                          ) : state.enabled ? (
                            <span>{portalStates[portal.id].accessLevel}</span>
                          ) : (
                            <span className="text-red-600">🔒 Portal Disabled — No Access</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Portal Status Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PORTALS.map(p => {
                const state = portalStates[p.id];
                const Icon = p.icon;
                return (
                  <div key={p.id} className={`p-3 rounded-xl border text-center ${state.enabled && !state.maintenance ? p.bgColor + ' ' + p.borderColor : 'bg-slate-50 border-slate-200'}`}>
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${state.enabled ? p.color : 'text-slate-400'}`} />
                    <div className="text-[11px] font-bold text-slate-800 leading-tight">{p.name}</div>
                    <div className={`text-[10px] font-black mt-1 ${state.maintenance ? 'text-amber-600' : state.enabled ? 'text-emerald-600' : 'text-red-600'}`}>
                      {state.maintenance ? '⚠ Maintenance' : state.enabled ? '● Online' : '○ Disabled'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: USERS ── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Active Users & Roles</h3>
              <p className="text-xs text-slate-500 mt-0.5">Control access rights across all 5 personas</p>
            </div>
            <button
              onClick={() => alert('New user registration modal')}
              className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              + Add User
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.email} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center text-sm shrink-0">
                    {u.name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-[11px] font-bold">
                    {u.role}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: AI THRESHOLDS ── */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <form onSubmit={handleSaveAIConfig} className="space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">AI Engine & Multi-Factor Scoring Thresholds</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tune the SIF risk scoring boundaries that trigger alerts, Stop Work orders, and escalations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-800">Critical SIF Threshold</label>
                  <span className="text-xs font-black text-red-600">{criticalThreshold.toFixed(1)} / 10</span>
                </div>
                <input type="range" min="7.0" max="9.5" step="0.1" value={criticalThreshold}
                  onChange={e => setCriticalThreshold(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <p className="text-[11px] text-slate-500">Reports above this automatically trigger a Stop Work suggestion and Critical Alert push.</p>
              </div>

              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-800">High Risk Threshold</label>
                  <span className="text-xs font-black text-amber-600">{highThreshold.toFixed(1)} / 10</span>
                </div>
                <input type="range" min="5.0" max="7.5" step="0.1" value={highThreshold}
                  onChange={e => setHighThreshold(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[11px] text-slate-500">Dispatches a priority alert to the Safety Officer review queue.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <input type="checkbox" id="autoStopWork" checked={autoStopWork}
                onChange={e => setAutoStopWork(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
              />
              <label htmlFor="autoStopWork" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Automatically suggest Stop Work Order when report crosses Critical SIF threshold
              </label>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {saveSuccess}
              </div>
            )}

            <button type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Save className="h-4 w-4" />
              Save AI Configurations
            </button>
          </form>
        </div>
      )}

      {/* ── TAB: AUDIT LOGS ── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Tamper-Proof System Audit Logs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Chronological record of all submissions, AI scores, and officer verifications</p>
            </div>
            <span className="text-xs text-slate-400 font-semibold bg-slate-100 px-2 py-1 rounded-lg">{auditLogs.length} Records</span>
          </div>

          {loadingAudits ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading audit records...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">No audit records found.</div>
          ) : (
            <div className="max-h-[450px] overflow-y-auto divide-y divide-slate-100 text-xs">
              {auditLogs.map(log => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-slate-50 px-2 rounded transition">
                  <div>
                    <div className="font-bold text-slate-900">{log.action}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{log.event_id}</div>
                    {log.details && <p className="text-slate-500 mt-0.5 text-[11px] leading-snug">{log.details}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className="text-[11px] text-blue-600 font-semibold">{log.user_email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: DATA & BACKUP ── */}
      {activeTab === 'data' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Database Integrity & Maintenance</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automated backups and reset functions for the SIF-SHIELD dataset</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { label: 'Total Safety Events', value: '106', color: 'text-blue-700' },
              { label: 'Active Users', value: '5', color: 'text-purple-700' },
              { label: 'Audit Records', value: `${auditLogs.length || '—'}`, color: 'text-emerald-700' }
            ].map(s => (
              <div key={s.label} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">Reset Demo Database</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Purges and recreates the standard 120-report SIF-SHIELD dataset with all 5 user personas.</div>
            </div>
            <button
              type="button"
              onClick={onResetDb}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow transition shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Database
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
