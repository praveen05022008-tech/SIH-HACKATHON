import React, { useState } from 'react';
import { User } from '../types';
import { Bell, UserCheck, LogOut, ShieldAlert, Cpu } from 'lucide-react';

interface TopbarProps {
  user: User | null;
  onLogout: () => void;
  title: string;
  notifications: string[];
  clearNotifications: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ user, onLogout, title, notifications, clearNotifications }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'HSE Manager':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'HSE Analyst':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Reviewer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-10 shadow-sm">
      {/* Title */}
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        {title}
      </h2>

      {/* Right widgets */}
      <div className="flex items-center gap-6">
        
        {/* Active Engine Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-600 font-medium">
          <Cpu className="h-3.5 w-3.5 text-industrial-blue" />
          <span>GATI active</span>
        </div>

        {/* Notifications Panel */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-slate-100 rounded-full relative text-slate-500 hover:text-slate-800 transition"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-industrial-red border-2 border-white rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-30">
              <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Alerts Queue</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-[10px] text-industrial-blue font-bold hover:underline"
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
                      <ShieldAlert className="h-4 w-4 text-industrial-orange mt-0.5 shrink-0" />
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
          <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900">{user.name}</div>
              <div className="flex justify-end gap-1 mt-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 hover:bg-red-50 text-slate-400 hover:text-industrial-red border border-slate-200 rounded-lg transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
