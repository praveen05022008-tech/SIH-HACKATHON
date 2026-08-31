import React, { useState } from 'react';
import { User } from '../types';
import { Bell, UserCheck, LogOut, ShieldAlert, Cpu, ChevronDown } from 'lucide-react';

interface TopbarProps {
  user: User | null;
  onLogout: () => void;
  title: string;
  notifications: string[];
  clearNotifications: () => void;
  onSwitchPersona?: (email: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  user, 
  onLogout, 
  title, 
  notifications, 
  clearNotifications,
  onSwitchPersona
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const personas = [
    { label: '👷‍♂️ Field Employee / Worker', email: 'worker@refinery.safe', role: 'Field Worker' },
    { label: '🤖 AI Pipeline Viewer', email: 'pipeline@sifshield.ai', role: 'AI Pipeline Viewer' },
    { label: '🛡️ Safety Officer', email: 'officer@refinery.safe', role: 'Safety Officer' },
    { label: '📊 Safety Manager / HSE Lead', email: 'manager@refinery.safe', role: 'Safety Manager' },
    { label: '⚙️ System Admin', email: 'admin@refinery.safe', role: 'Admin' }
  ];

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'Safety Manager':
      case 'HSE Manager':
        return 'bg-emerald-105 text-emerald-805 border-emerald-200';
      case 'Field Worker':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Safety Officer':
      case 'Reviewer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'AI Pipeline Viewer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Admin':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-10">
      {/* Title */}
      <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
        {title}
      </h2>

      {/* Right widgets */}
      <div className="flex items-center gap-4">
        
        {/* Persona Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-bold hover:bg-slate-100 transition"
          >
            <span>Switch Persona</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showPersonaDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-30 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Quick Persona Navigator</span>
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
                    className={`w-full px-4 py-2 text-left text-xs font-semibold hover:bg-slate-50 flex items-center justify-between transition ${
                      user?.email === p.email ? 'text-blue-600 bg-blue-50/20 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${getRoleBadgeColor(p.role)}`}>
                      {p.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Engine Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SIF-SHIELD AI active</span>
        </div>

        {/* Notifications Panel */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg relative text-slate-500 hover:text-slate-700 transition"
          >
            <Bell className="h-4.5 w-4.5" />
            {(notifications.length > 0 || true) && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center border border-white">
                {notifications.length > 0 ? notifications.length : 2}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-30">
              <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Alerts Queue</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
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
                      <ShieldAlert className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-700 leading-normal">{notif}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        {user && (
          <div className="relative">
            <div 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 border-l border-slate-250 pl-4 cursor-pointer hover:opacity-80 transition"
            >
              <div className="text-right">
                <div className="text-xs font-extrabold text-slate-800">{user.name}</div>
                <div className="text-[10px] text-slate-400 font-bold">{user.role}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 animate-fadeIn">
                <button
                  onClick={onLogout}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50/50 transition flex items-center gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
