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
  FileText,
  Zap,
  Activity,
  LogOut,
  Sparkles,
  Users,
  X
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
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  setCurrentPage, 
  systemStatus, 
  userRole,
  onLogout,
  isOpen = false,
  onClose
}) => {
  const getMenuItems = () => {
    switch (userRole) {
      case 'Employee':
      case 'Field Worker':
        return [
          { id: 'worker-portal', label: 'Worker Safety Portal', icon: FileText }
        ];
      case 'Officer':
      case 'Safety Officer':
        return [
          { id: 'dashboard', label: 'Tactical Dashboard', icon: LayoutDashboard },
          { id: 'review', label: 'Assurance & Field Audits', icon: ClipboardCheck },
          { id: 'inbox', label: 'Safety Alert Ingest', icon: Inbox },
          { id: 'take-action', label: 'Execute Action', icon: Zap },
          { id: 'track-actions', label: 'Track Remediations', icon: Activity },
          { id: 'sif', label: 'SIF Intelligence', icon: ShieldAlert },
          { id: 'lsr', label: 'Life-Saving Rules', icon: FileCheck2 },
          { id: 'precursors', label: 'Precursor Patterns', icon: Network },
          { id: 'sites', label: 'Sites & Units', icon: MapPin },
          { id: 'learning', label: 'GATI Learning Hub', icon: GraduationCap },
          { id: 'reports', label: 'Compliance Reports', icon: FileBarChart2 }
        ];
      case 'Manager':
      case 'Safety Manager':
        return [
          { id: 'manager', label: 'HSE Command Center', icon: Users },
          { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
          { id: 'sif', label: 'Strategic SIF Intelligence', icon: ShieldAlert },
          { id: 'precursors', label: 'Precursor Analytics', icon: Network },
          { id: 'sites', label: 'Operational Sites & Fleet', icon: MapPin },
          { id: 'track-actions', label: 'Track Remediations', icon: Activity },
          { id: 'reports', label: 'Compliance Reports', icon: FileBarChart2 }
        ];
      case 'Admin':
        return [
          { id: 'settings', label: 'Admin Master Console', icon: SettingsIcon }
        ];
      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inbox', label: 'Safety Alerts', icon: Inbox },
          { id: 'sif', label: 'SIF Intelligence', icon: ShieldAlert },
          { id: 'lsr', label: 'Life-Saving Rules', icon: FileCheck2 },
          { id: 'precursors', label: 'Precursors', icon: Network },
          { id: 'sites', label: 'Sites & Units', icon: MapPin },
          { id: 'review', label: 'Review Queue', icon: ClipboardCheck },
          { id: 'learning', label: 'Learning Hub', icon: GraduationCap },
          { id: 'reports', label: 'Reports', icon: FileBarChart2 },
          { id: 'settings', label: 'Settings', icon: SettingsIcon }
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`w-64 bg-white text-slate-800 flex flex-col h-screen fixed left-0 top-0 border-r border-[#E6ECEB] z-40 font-sans shadow-xl md:shadow-sm transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#008779] flex items-center justify-center text-white shadow-md shadow-[#008779]/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
                <span>RAK<span className="text-[#008779] font-black">SHA</span></span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Precursor Engine
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  onClose?.();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-[#008779] text-white shadow-lg shadow-[#008779]/25 font-bold scale-[1.02]'
                    : 'text-slate-600 hover:bg-[#E8F6F4]/60 hover:text-[#008779]'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                onClose?.();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 text-left mt-2"
            >
              <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-400" />
              <span>Logout</span>
            </button>
          )}
        </nav>

      {/* Bottom Promo / Telemetry Card (Matching Reference Card at bottom left) */}
      <div className="p-4">
        <div className="border-2 border-[#008779]/25 bg-[#EBF7F5] rounded-2xl p-4 text-center relative overflow-hidden">
          <div className="mx-auto h-9 w-9 rounded-xl bg-white border border-[#008779]/20 flex items-center justify-center text-[#008779] shadow-xs mb-2">
            <Cpu className="h-4.5 w-4.5 animate-pulse text-[#008779]" />
          </div>
          <div className="text-[11px] font-extrabold text-slate-900">
            GATI AI Calibrated
          </div>
          <p className="text-[9px] text-slate-500 mt-0.5 leading-tight font-medium">
            Status: <span className="font-bold text-[#008779]">{systemStatus.aiEngine}</span>
          </p>
          <div className="mt-3">
            <button 
              onClick={() => setCurrentPage('learning')}
              className="w-full py-2 px-3 bg-[#008779] hover:bg-[#007064] text-white text-[10px] font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              <span>Calibrate Engine</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
