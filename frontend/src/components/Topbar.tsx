import React, { useState } from 'react';
import { User } from '../types';
import { 
  Bell, 
  LogOut, 
  ShieldAlert, 
  Search, 
  Mail, 
  ChevronDown, 
  Sparkles,
  User as UserIcon
} from 'lucide-react';

interface TopbarProps {
  user: User | null;
  onLogout: () => void;
  title: string;
  notifications: string[];
  clearNotifications: () => void;
  onSwitchPersona?: (email: string) => void;
  onSearch?: (term: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  user, 
  onLogout, 
  title, 
  notifications, 
  clearNotifications,
  onSwitchPersona,
  onSearch
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const personas = [
    { label: 'Field Employee / Worker', email: 'worker@refinery.safe', role: 'Field Worker' },
    { label: 'Safety Officer Lead', email: 'officer@refinery.safe', role: 'Safety Officer' },
    { label: 'Safety Manager / HSE Lead', email: 'manager@refinery.safe', role: 'Safety Manager' },
    { label: 'System Administrator', email: 'admin@refinery.safe', role: 'Admin' }
  ];

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'Safety Manager':
      case 'HSE Manager':
        return 'bg-[#E8F6F4] text-[#008779] border-[#008779]/20';
      case 'Field Worker':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Safety Officer':
      case 'Reviewer':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Admin':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="h-16 bg-[#F7F9FC]/95 backdrop-blur-md flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-20 border-b border-[#E6ECEB]/80 shadow-2xs">
      
      {/* Pill Search Bar (Matching Reference Design) */}
      <div className="relative w-80 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onSearch?.(e.target.value);
          }}
          placeholder="Search safety events, rules, sites..."
          className="w-full bg-white border border-[#E6ECEB] rounded-full pl-11 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008779]/30 focus:border-[#008779] shadow-xs font-medium"
        />
      </div>

      {/* Right Action Icons & User Pill */}
      <div className="flex items-center gap-3.5">
        
        {/* Persona Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E6ECEB] rounded-full text-xs text-slate-700 font-bold hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#008779]" />
            <span>Switch Role</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showPersonaDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E6ECEB] rounded-2xl shadow-xl py-2 z-30 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100 bg-[#E8F6F4]/30">
                <span className="text-[10px] font-bold text-[#008779] uppercase tracking-wider">Quick Persona Navigator</span>
              </div>
              <div className="py-1">
                {personas.map((p) => (
                  <button
                    key={p.email}
                    onClick={() => {
                      if (onSwitchPersona) {
                        onSwitchPersona(p.email);
                      }
                      setShowPersonaDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 flex items-center justify-between transition cursor-pointer ${
                      user?.email === p.email ? 'text-[#008779] bg-[#E8F6F4]/50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${getRoleBadgeColor(p.role)}`}>
                      {p.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Circular Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="h-10 w-10 rounded-full bg-white border border-[#E6ECEB] flex items-center justify-center text-slate-600 hover:text-[#008779] hover:border-[#008779]/40 transition shadow-xs relative cursor-pointer"
          >
            <Bell className="h-4.5 w-4.5" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-[#FF7A1A] border-2 border-white rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-[#E6ECEB] rounded-2xl shadow-xl py-2 z-30">
              <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center bg-[#E8F6F4]/30">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Alerts Queue</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-[10px] text-[#008779] font-bold hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div key={idx} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-2.5 items-start">
                      <ShieldAlert className="h-4 w-4 text-[#FF7A1A] mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-700 leading-normal">{notif}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Circular Mail / Message Icon (Matching Reference Design) */}
        <div className="h-10 w-10 rounded-full bg-white border border-[#E6ECEB] flex items-center justify-center text-slate-600 hover:text-[#008779] hover:border-[#008779]/40 transition shadow-xs cursor-pointer">
          <Mail className="h-4.5 w-4.5" />
        </div>

        {/* User Profile Pill (Matching Reference Design) */}
        {user && (
          <div className="flex items-center gap-3 bg-white border border-[#E6ECEB] rounded-full py-1.5 pl-2 pr-4 shadow-xs">
            <div className="h-8 w-8 rounded-full bg-[#E8F6F4] text-[#008779] font-bold flex items-center justify-center text-xs border border-[#008779]/20">
              {user.name.charAt(0)}
            </div>
            <div className="text-left">
              <div className="text-xs font-extrabold text-slate-900 leading-tight">{user.name}</div>
              <div className="text-[10px] font-semibold text-slate-400">{user.role}</div>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="ml-2 text-slate-400 hover:text-red-500 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
