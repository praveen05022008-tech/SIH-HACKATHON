import React, { useState } from 'react';
import { User } from '../types';
import { Activity, ShieldAlert, KeyRound, Mail, Sparkles } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { role: 'HSE Manager', email: 'manager@refinery.safe', name: 'Demo HSE Manager' },
    { role: 'HSE Analyst', email: 'analyst@refinery.safe', name: 'Demo Analyst' },
    { role: 'Reviewer', email: 'reviewer@refinery.safe', name: 'Demo Reviewer' }
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

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
      // Fallback in case backend is offline
      console.warn('Backend connection failed, using local mock auth:', err.message);
      const matchedDemo = demoAccounts.find(d => d.email === email);
      if (matchedDemo && password === 'password123') {
        onLoginSuccess({
          email: matchedDemo.email,
          name: matchedDemo.name,
          role: matchedDemo.role as any,
          token: `mock-jwt-token-${matchedDemo.role.toLowerCase().replace(' ', '')}`
        });
      } else {
        setError('Invalid credentials. (Demo password is: password123)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-industrial-navy flex items-center justify-center shadow-md">
            <Activity className="h-7 w-7 text-industrial-orange" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-industrial-navy tracking-tight">MAYAN-SAFE</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">SIF Precursor Intelligence</p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-xl rounded-2xl sm:px-10">
          
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-950">Refinery Safety Authentication</h2>
            <p className="text-xs text-slate-400 mt-1">Access safety dashboards and precursor warnings</p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-industrial-red text-xs font-semibold rounded-lg flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@refinery.safe"
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-industrial-blue focus:border-industrial-blue text-sm placeholder-slate-400 bg-slate-50/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Secure Password
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-industrial-blue focus:border-industrial-blue text-sm placeholder-slate-400 bg-slate-50/50"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-industrial-navy hover:bg-[#071D3A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-industrial-blue transition-colors disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Quick Demo Login Selector */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-1.5 justify-center mb-3">
              <Sparkles className="h-3.5 w-3.5 text-industrial-purple" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demo Accounts Selector</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  onClick={() => handleDemoClick(account)}
                  className="py-2 px-1 text-center bg-slate-50 hover:bg-industrial-blue/5 border border-slate-200 hover:border-industrial-blue rounded-xl text-[10px] font-bold text-slate-700 transition"
                >
                  <div>{account.role}</div>
                  <div className="text-[8px] text-slate-400 font-normal mt-0.5 truncate">{account.email}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            Powered by GATI Intelligence Engine
          </div>

        </div>
      </div>
    </div>
  );
};
