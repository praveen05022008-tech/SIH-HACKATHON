import React from 'react';
import { 
  LayoutDashboard, 
  Inbox, 
  ShieldAlert, 
  FileCheck2, 
  Network, 
  MapPin, 
  ClipboardCheck, 
  GraduationCap, 
  FileBarChart2, 
  Settings as SettingsIcon,
  Cpu,
  BrainCircuit,
  Database,
  Activity
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  systemStatus: {
    aiEngine: string;
    gati: string;
    data: string;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, systemStatus }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'inbox', label: 'Safety Events', icon: Inbox },
    { id: 'sif', label: 'SIF Intelligence', icon: ShieldAlert },
    { id: 'lsr', label: 'Life-Saving Rules', icon: FileCheck2 },
    { id: 'precursors', label: 'Precursor Patterns', icon: Network },
    { id: 'sites', label: 'Sites & Activities', icon: MapPin },
    { id: 'review', label: 'Review Queue', icon: ClipboardCheck },
    { id: 'learning', label: 'Learning Centre', icon: GraduationCap },
    { id: 'reports', label: 'Reports', icon: FileBarChart2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-[#0B2A56] text-white flex flex-col h-screen fixed left-0 top-0 border-r border-[#1F5EAA]/30 shadow-lg z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#1F5EAA]/20">
        <h1 className="text-xl font-bold tracking-wider text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-[#E57A20]" />
          <span>MAYAN-SAFE</span>
        </h1>
        <p className="text-xs text-slate-300 mt-1 font-medium tracking-tight">
          SIF Precursor Intelligence Platform
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-[#1F5EAA] text-white shadow-md'
                  : 'text-slate-300 hover:bg-[#1F5EAA]/20 hover:text-white'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status Panel */}
      <div className="p-4 border-t border-[#1F5EAA]/20 bg-[#092144]/60">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-2">
          System Status
        </div>
        <div className="space-y-2 px-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              <span>AI Engine</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-emerald-400">{systemStatus.aiEngine}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="h-3.5 w-3.5 text-slate-400" />
              <span>GATI Engine</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <span className="font-semibold text-indigo-300">{systemStatus.gati}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span>Data Stream</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-emerald-400">{systemStatus.data}</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
