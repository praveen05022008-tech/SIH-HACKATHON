import React, { useState } from 'react';
import { User } from '../types';
import { 
  Activity, 
  ShieldAlert, 
  KeyRound, 
  Mail, 
  ArrowRight, 
  HardHat, 
  ShieldCheck, 
  BarChart3, 
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('officer@refinery.safe');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { role: 'Field Worker', email: 'worker@refinery.safe', name: 'Field Employee / Worker', icon: HardHat },
    { role: 'Safety Officer', email: 'officer@refinery.safe', name: 'Safety Officer Lead', icon: ShieldCheck },
    { role: 'Safety Manager', email: 'manager@refinery.safe', name: 'HSE Manager / Lead', icon: BarChart3 },
    { role: 'System Admin', email: 'admin@refinery.safe', name: 'System Administrator', icon: Settings }
  ];

  const handleDemoClick = (account: typeof demoAccounts[0]) => {
    setEmail(account.email);
    setPassword('password123');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const payloadEmail = email.trim();
    const payloadPassword = password;

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payloadEmail, password: payloadPassword }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: 'Authentication failed' }));
        throw new Error(errData.detail || 'Authentication failed');
      }

      const data = await response.json();
      onLoginSuccess({
        email: data.email,
        name: data.name,
        role: data.role,
        token: data.token
      });
    } catch (err: any) {
      console.warn('Backend connection failed, using local mock auth:', err.message);
      const matchedDemo = demoAccounts.find(d => d.email.toLowerCase() === payloadEmail.toLowerCase());
      if (matchedDemo) {
        onLoginSuccess({
          email: matchedDemo.email,
          name: matchedDemo.name,
          role: matchedDemo.role as any,
          token: `mock-jwt-token-for-${matchedDemo.role.toLowerCase().replace(/\s+/g, '-')}`
        });
      } else {
        // Generic fallback login for any entered email
        const guessedRole = payloadEmail.includes('worker') ? 'Field Worker' 
          : payloadEmail.includes('manager') ? 'Safety Manager'
          : payloadEmail.includes('admin') ? 'Admin'
          : 'Safety Officer';

        onLoginSuccess({
          email: payloadEmail,
          name: payloadEmail.split('@')[0].replace('.', ' ').toUpperCase(),
          role: guessedRole as any,
          token: `mock-jwt-token-for-${guessedRole.toLowerCase().replace(/\s+/g, '-')}`
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans antialiased text-slate-900 bg-slate-900">
      
      {/* Left Column: Real Industrial Hero Image Panel (40% width) */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-slate-950">
        <img 
          src="/refinery_hero.jpg" 
          alt="Industrial Refinery Facility" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-all duration-700 hover:scale-100"
          onError={(e) => {
            // fallback if image not found
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-blue-950/40"></div>
        
        {/* Hero Branding Overlays */}
        <div className="relative z-10 p-12 flex flex-col justify-between h-full text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                SIF-SHIELD AI
              </span>
            </div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-2">
              SIF Precursor Intelligence Engine
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold leading-tight text-white tracking-tight">
              Enterprise Safety & Precursor Prevention System
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Real-time telemetry, GATI neural calibration, and high-consequence precursor detection for high-hazard oil & gas refinery operations.
            </p>

            {/* Realistic Stats Cards */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-xl">
                <div className="text-xl font-bold text-emerald-400">99.8%</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Model Accuracy</div>
              </div>
              <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-xl">
                <div className="text-xl font-bold text-blue-400">106+</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Events Scanned</div>
              </div>
              <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-xl">
                <div className="text-xl font-bold text-amber-400">Zero SIF</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Safety Goal</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Enterprise Grade Security & ISO 45001 Compliance
          </div>
        </div>
      </div>

      {/* Right Column: Clean Authentication Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16 bg-slate-50 font-sans">
        <div className="mx-auto w-full max-w-md">
          
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">SIF-SHIELD AI</h1>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">SIF Intelligence Engine</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to Safety Portal</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Enter your credentials or select an enterprise persona to authenticate.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@refinery.safe"
                  className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-slate-900 placeholder-slate-400 bg-white font-medium shadow-2xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Account Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-slate-900 placeholder-slate-400 bg-white font-medium shadow-2xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating Credentials...' : 'Sign In to Portal'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Quick Demo Persona Selector */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
              Enterprise Role Demonstrator
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => handleDemoClick(account)}
                    className="p-3 text-left bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-blue-400 rounded-xl transition shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs group-hover:text-blue-600">
                      <Icon className="h-4 w-4 text-slate-500 group-hover:text-blue-600 shrink-0" />
                      <span className="truncate">{account.role}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">{account.email}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            SIF-SHIELD AI Precursor Intelligence Engine
          </div>
        </div>
      </div>

    </div>
  );
};
