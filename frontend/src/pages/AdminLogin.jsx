import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const AdminLogin = () => {
  const [email, setEmail] = useState('Divyesh@medisphere.com');
  const [password, setPassword] = useState('Divyesh@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: email,
        password: password
      });

      const { access_token, user } = response.data;
      
      if (user.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('admin_token', access_token);
      
      setSuccess(true);
      window.dispatchEvent(new Event('auth-change'));
      
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans']">
      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-sky-100 bg-white border border-sky-50">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-sky-600 shadow-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
          </div>
          <h1 className="font-outfit font-black text-3xl text-slate-900 tracking-tight">Medisphere</h1>
          <div className="mt-2 px-3 py-1 bg-sky-50 text-sky-700 text-[0.65rem] font-black uppercase tracking-[0.2em] rounded-full border border-sky-100">
            Admin Central Control
          </div>
        </div>

        {/* Card */}
        <div className="rounded-[2.5rem] p-10 bg-white shadow-2xl shadow-slate-200 border border-slate-100">
          <div className="mb-8">
            <h2 className="font-outfit font-black text-2xl text-slate-900">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1 font-medium">Authorized medical personnel only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="Divyesh@medisphere.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 pl-12 pr-14 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all placeholder:text-slate-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 text-[0.65rem] font-black uppercase tracking-tighter transition-colors"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-200 text-sky-500 focus:ring-sky-500/20 cursor-pointer" />
                <span className="text-[0.75rem] text-slate-500 font-bold group-hover:text-slate-700 transition-colors">Remember session</span>
              </label>
              <button type="button" className="text-[0.75rem] text-sky-600 font-black hover:text-sky-700 transition-colors uppercase tracking-tight">Need Help?</button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl font-black text-xs text-white uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mt-4 shadow-xl shadow-sky-200 bg-gradient-to-br from-sky-500 to-sky-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
              )}
              {isLoading ? 'Authenticating...' : 'Enter Admin Terminal'}
            </button>
          </form>

          {error && (
            <div className="mt-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-4 text-xs text-center font-bold animate-shake flex items-center justify-center gap-2">
              <span className="text-base">⚠️</span> {error}
            </div>
          )}

          {success && (
            <div className="mt-6 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl p-4 text-xs text-center font-bold flex items-center justify-center gap-2">
              <span className="text-base">✨</span> Access granted. Welcome back.
            </div>
          )}
        </div>

        {/* Security Footer */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-[0.65rem] text-slate-400 font-black uppercase tracking-widest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Encrypted Admin Session
          </div>
          <div className="h-px w-12 bg-slate-200"></div>
          <p className="text-[0.6rem] text-slate-300 font-bold text-center leading-relaxed px-10 uppercase tracking-tighter">
            Unauthorized access attempts are logged and reported to the system security team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
