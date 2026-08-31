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
  Activity,
  FileText
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  systemStatus: {
    aiEngine: string;
    gati: string;
    data: string;
  };
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, systemStatus, userRole }) => {
  const getMenuItems = () => {
    switch (userRole) {
      case 'Field Worker':
        return [
          { id: 'worker-portal', label: 'Worker Portal', icon: FileText }
        ];
      case 'Safety Officer':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'inbox', label: 'Safety Events', icon: Inbox },
          { id: 'review', label: 'Review Queue', icon: ClipboardCheck }
        ];
      case 'Safety Manager':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'sif', label: 'SIF Intelligence', icon: ShieldAlert },
          { id: 'precursors', label: 'Precursor Patterns', icon: Network },
          { id: 'sites', label: 'Sites & Activities', icon: MapPin },
          { id: 'reports', label: 'Compliance Reports', icon: FileBarChart2 }
        ];
      case 'Admin':
        return [
          { id: 'settings', label: 'System Admin Console', icon: SettingsIcon }
        ];
      default:
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'inbox', label: 'Safety Events', icon: Inbox },
          { id: 'sif', label: 'SIF Intelligence', icon: ShieldAlert },
          { id: 'lsr', label: 'Life-Saving Rules', icon: FileCheck2 },
          { id: 'precursors', label: 'Precursor Patterns', icon: Network },
          { id: 'sites', label: 'Sites & Activities', icon: MapPin },
          { id: 'review', label: 'Review Queue', icon: ClipboardCheck },
          { id: 'learning', label: 'Learning Centre', icon: GraduationCap },
          { id: 'reports', label: 'Reports', icon: FileBarChart2 },
          { id: 'settings', label: 'Settings', icon: SettingsIcon }
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-[#0F172A] text-slate-100 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-20 font-sans">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 bg-[#0B132B]">
        <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-white tracking-wide">
            RAKSHA AI
          </span>
        </h1>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold tracking-wider uppercase">
          SIF Intelligence Engine
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors duration-150 text-left font-medium ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status Panel */}
      <div className="p-4 border-t border-slate-800 bg-[#0B132B]">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1 flex items-center justify-between">
          <span>Engine Telemetry</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
        </div>
        <div className="space-y-1.5 px-1 text-[11px] font-mono-numbers">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-300 font-sans text-[11px]">
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              <span>NLP Classifier</span>
            </span>
            <span className="font-semibold text-emerald-400 text-[10px]">{systemStatus.aiEngine}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-300 font-sans text-[11px]">
              <BrainCircuit className="h-3.5 w-3.5 text-slate-400" />
              <span>GATI Weights</span>
            </span>
            <span className="font-semibold text-amber-400 text-[10px]">{systemStatus.gati}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-300 font-sans text-[11px]">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span>Telemetry Data</span>
            </span>
            <span className="font-semibold text-blue-400 text-[10px]">{systemStatus.data}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
