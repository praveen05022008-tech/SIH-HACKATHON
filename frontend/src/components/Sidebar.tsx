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
  FileText,
  Zap,
  Users
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
          { id: 'inbox', label: 'Safety Alerts', icon: Inbox },
          { id: 'review', label: 'Review & Validate', icon: ClipboardCheck },
          { id: 'take-action', label: 'Take Action', icon: Zap },
          { id: 'track-actions', label: 'Track Actions', icon: Activity }
        ];
      case 'Safety Manager':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'manager', label: 'Manager Command Center', icon: Users },
          { id: 'sif', label: 'SIF Intelligence', icon: ShieldAlert },
          { id: 'precursors', label: 'Precursor Patterns', icon: Network },
          { id: 'sites', label: 'Sites & Activities', icon: MapPin },
          { id: 'track-actions', label: 'Track Actions', icon: Activity },
          { id: 'reports', label: 'Compliance Reports', icon: FileBarChart2 }
        ];
      case 'Admin':
        return [
          { id: 'settings', label: 'System Admin Console', icon: SettingsIcon },
          { id: 'manager', label: 'Workforce Allotment', icon: Users }
        ];
      default:
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'manager', label: 'Manager Center', icon: Users },
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
    <aside className="w-64 bg-white text-slate-800 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-200 shadow-2xs z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-650 border border-blue-100">
          <ShieldAlert className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
            <span>SIF-SHIELD AI</span>
          </h1>
          <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">
            SIF Precursor Engine
          </p>
        </div>
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
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 text-left ${
                isActive
                  ? 'bg-blue-50/70 text-blue-600 border-l-2 border-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status Panel */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
          System Status
        </div>
        <div className="space-y-2 px-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              <span>AI Engine</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-emerald-600">{systemStatus.aiEngine}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="h-3.5 w-3.5 text-slate-400" />
              <span>GATI Calib</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="font-bold text-blue-600">{systemStatus.gati}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span>Data Stream</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-emerald-600">{systemStatus.data}</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
