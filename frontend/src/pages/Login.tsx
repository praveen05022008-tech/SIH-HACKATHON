import React, { useState } from 'react';
import { User } from '../types';
import { 
  ShieldAlert, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Users, 
  HardHat, 
  Cpu, 
  Shield, 
  User as UserIcon, 
  Settings 
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('hello@gmail.com');
  const [password, setPassword] = useState('••••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { role: 'Field Worker', email: 'field.worker@sifdemo.com', name: 'Field Worker Demo', icon: HardHat },
    { role: 'AI Pipeline', email: 'ai.pipeline@sifdemo.com', name: 'AI Ingestion Pipeline', icon: Cpu },
    { role: 'Safety Officer', email: 'officer@sifdemo.com', name: 'Capt. Arvind Sen', icon: Shield },
    { role: 'Safety Manager', email: 'manager@sifdemo.com', name: 'Dr. Vikram Roy', icon: UserIcon },
    { role: 'System Admin', email: 'admin@sifdemo.com', name: 'System Administrator', icon: Settings }
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

    // Handle dummy default values from first load
    const payloadEmail = email;
    const payloadPassword = password === '••••••••••••••' ? 'password123' : password;

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payloadEmail, password: payloadPassword }),
      });

      if (!response.ok) {
        const errData = await response.json();
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
      const matchedDemo = demoAccounts.find(d => d.email === payloadEmail);
      if (matchedDemo && (payloadPassword === 'password123' || payloadPassword === '••••••••••••••')) {
        onLoginSuccess({
          email: matchedDemo.email,
          name: matchedDemo.name,
          role: matchedDemo.role as any,
          token: `mock-jwt-token-for-${matchedDemo.role.toLowerCase().replace(' ', '')}`
        });
      } else {
        setError('Invalid credentials. (Demo password is: password123)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 sm:p-10 max-w-md w-full mx-auto space-y-6">
        
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M8 12h3l1-3 2 6 1-3h2" />
              </svg>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">SIF-SHIELD AI</h1>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1.5">
                SIF Precursor Intelligence Engine
              </span>
            </div>
          </div>
          
          <div className="pt-4">
            <h2 className="text-lg font-extrabold text-slate-900">Refinery Safety Authentication</h2>
            <p className="text-xs text-slate-450 mt-1">Access safety dashboard and precursor warnings</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fadeIn">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Work Email
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@gmail.com"
                className="block w-full pl-10 pr-4 py-2 border border-slate-250 rounded-xl focus:ring-1 focus:ring-blue-600 focus:outline-none text-xs bg-slate-50/50 text-slate-800 placeholder-slate-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Secure Password
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-slate-250 rounded-xl focus:ring-1 focus:ring-blue-600 focus:outline-none text-xs bg-slate-50/50 text-slate-800"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex justify-center items-center text-xs shadow-xs"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex py-2 items-center text-slate-300">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-[9px] font-bold uppercase tracking-wider text-slate-400">or</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* 5. Demo Accounts Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 justify-center text-blue-600">
            <Users className="h-4 w-4" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Demo Accounts Selector</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {demoAccounts.map((account) => {
              const AccIcon = account.icon;
              return (
                <button
                  type="button"
                  key={account.role}
                  onClick={() => handleDemoClick(account)}
                  className="p-3 text-left bg-white hover:bg-blue-50/20 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center gap-3 transition shadow-3xs"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <AccIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-[10px] text-slate-800">{account.role}</div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{account.email}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-center text-[8px] text-slate-400 font-extrabold uppercase tracking-widest pt-2 border-t border-slate-100/50">
          Powered by GATI AI Calibration
        </div>

      </div>

    </div>
  );
};
