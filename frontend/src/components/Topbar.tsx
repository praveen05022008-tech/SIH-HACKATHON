import React, { useState } from 'react';
import { User } from '../types';
import { Bell, UserCheck, LogOut, ShieldAlert, Cpu } from 'lucide-react';

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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
    <>
      {/* Backdrop overlay to close dropdowns when clicking anywhere outside */}
      {(showPersonaDropdown || showNotifications) && (
        <div 
          className="fixed inset-0 z-40 bg-black/5" 
          onClick={() => {
            setShowPersonaDropdown(false);
            setShowNotifications(false);
          }} 
        />
      )}

      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-50 font-sans shadow-2xs">
        {/* Title */}
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-900 font-extrabold">{title}</span>
        </h2>

        {/* Right widgets */}
        <div className="flex items-center gap-3 relative z-50">
          
          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPersonaDropdown(!showPersonaDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 rounded-lg text-xs text-slate-800 font-bold transition shadow-2xs"
            >
              <UserCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Switch Persona</span>
              <span className="text-[10px] text-slate-500 font-mono">▼</span>
            </button>

            {showPersonaDropdown && (
              <div className="absolute right-0 mt-2 w-68 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Persona Switcher</span>
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
                      className={`w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 flex items-center justify-between transition ${
                        user?.email === p.email ? 'text-blue-700 bg-blue-50/60 font-bold border-l-2 border-blue-600' : 'text-slate-700'
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold ${getRoleBadgeColor(p.role)}`}>
                        {p.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Engine Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] text-emerald-800 font-bold shadow-2xs">
            <Cpu className="h-3.5 w-3.5 text-emerald-600" />
            <span>RAKSHA AI active</span>
          </div>

          {/* Notifications Panel */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowPersonaDropdown(false);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg relative text-slate-600 transition border border-transparent"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-amber-500 border-2 border-white rounded-full"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Alerts Feed</span>
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
                        <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{notif}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Card */}
          {user && (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">{user.name}</div>
                <div className="flex justify-end gap-1 mt-0.5">
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
