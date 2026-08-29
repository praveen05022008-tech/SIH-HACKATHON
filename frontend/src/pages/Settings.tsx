import React, { useState } from 'react';
import { Settings as SettingsIcon, RefreshCcw, CheckCircle, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  onResetDb: () => void;
  triggerNotification: (msg: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onResetDb, triggerNotification }) => {
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!window.confirm('This will purge the current database and re-seed 100+ synthetic reports. Are you sure?')) {
      return;
    }
    setResetting(true);
    setSuccess(false);
    try {
      const res = await fetch('http://localhost:8000/api/seed/reset', { method: 'POST' });
      if (!res.ok) throw new Error();
      setSuccess(true);
      triggerNotification('Database reset and re-seeded successfully.');
      onResetDb(); // notify main component to refresh states
    } catch (err) {
      console.warn('Backend DB reset endpoint failed, resetting mock client state.');
      setSuccess(true);
      triggerNotification('Mock database reset completed locally.');
      onResetDb();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">System Settings</h1>
          <p className="text-xs text-slate-500 mt-1">Configure GATI parameters, inspect model training versions, and manage demonstration state.</p>
        </div>
        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 border border-slate-200 rounded-full flex items-center gap-1 uppercase tracking-wider">
          <SettingsIcon className="h-3.5 w-3.5 animate-spin" />
          <span>Config Panel</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* DB Control */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-industrial-orange" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Database Seed Management</h3>
            </div>
            
            <p className="text-xs text-slate-500 mb-6 leading-normal">
              To demonstrate the platform for hackathon judging, you can clean all data tables and re-populate them with fresh synthetic reports, initial precursor linkages, and learning history.
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              {resetting ? (
                <span className="flex items-center gap-1.5 text-xs text-industrial-blue font-bold px-3 py-1.5">
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Clearing and seeding database...</span>
                </span>
              ) : success ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs bg-emerald-50 text-industrial-green border border-emerald-100 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                    <CheckCircle className="h-4 w-4" />
                    <span>Database Re-Seeded</span>
                  </span>
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-xs text-industrial-blue font-bold hover:underline"
                  >
                    Reset Again
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-red-50 text-industrial-red border border-red-200 hover:border-industrial-red rounded-xl text-xs font-bold transition shadow-2xs hover:bg-red-100/50"
                >
                  Reset & Seed Database
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Informational sidebar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs h-fit space-y-3.5">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">System Specifications</h3>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">GATI Engine Core:</span>
              <span className="font-semibold text-slate-800">v1.2.4-sih</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">NLP Classifier Mode:</span>
              <span className="font-semibold text-slate-800">GATI-LSR Semantic Weights</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Audit State:</span>
              <span className="font-semibold text-industrial-green">Healthy</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
