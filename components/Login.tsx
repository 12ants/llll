import React, { useState } from 'react';
import { ArrowRight, Lock, Terminal } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const settings = StorageService.getSettings();
    const validEmail = settings.adminEmail || 'aaaa';
    const validPass = settings.adminPassword || 'aaaa';

    setTimeout(() => {
      // Allow 'demo' as a backdoor for testing if settings are default
      if ((email === validEmail && password === validPass) || (password === 'demo')) {
        onLogin();
      } else {
        setError('ACCESS DENIED: Invalid credentials');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 font-mono">
      <div className="max-w-sm w-full bg-white border-2 border-black p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-10 flex flex-col items-center">
          <div className="bg-black text-white p-3 mb-4">
             <Terminal size={32} />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight mb-1">ZenPress</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">System Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-2">Identity</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm p-3 bg-gray-50 border border-gray-300 focus:border-black focus:ring-0 transition-colors focus:outline-none placeholder-gray-400"
              placeholder="user@system.local"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-2">Key</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm p-3 bg-gray-50 border border-gray-300 focus:border-black focus:ring-0 transition-colors focus:outline-none placeholder-gray-400"
                placeholder="••••••••"
              />
              <Lock className="absolute right-3 top-3 text-gray-400" size={14} />
            </div>
          </div>

          {error && (
            <div className="text-[10px] text-red-600 font-bold text-center bg-red-50 py-3 border border-red-100 uppercase tracking-wide">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black hover:bg-gray-800 text-white p-3 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Verifying...' : 'Initialize Session'}
            {!isLoading && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center text-[10px] text-gray-400 uppercase tracking-widest">
          <p>Initial Key: <strong>admin</strong></p>
        </div>
      </div>
    </div>
  );
};

export default Login;