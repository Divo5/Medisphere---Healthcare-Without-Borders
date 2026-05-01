import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { access_token, user } = response.data;
      
      // Store auth data
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Notify other components (like Navbar) about the auth change
      window.dispatchEvent(new Event('auth-change'));

      setShowSuccess(true);
      
      setTimeout(() => {
        // Redirect based on role
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (err) {
      console.error('Login error details:', err.response?.data);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join('; ');
        setError(messages);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5"></div>
        <div className="absolute bottom-20 right-10 w-52 h-52 rounded-full bg-white/5"></div>
        <div className="absolute top-1/3 -right-10 w-36 h-36 rounded-full bg-white/5"></div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="font-outfit font-black text-2xl tracking-tight" style={{fontWeight: 900}}>Medisphere</span>
          </Link>
          <h1 className="font-outfit font-black text-4xl leading-tight mb-4" style={{fontWeight: 900}}>Welcome<br/>Back to<br/>Healthcare</h1>
          <p className="text-sky-200 text-base leading-relaxed max-w-xs">Log in to access your consultations, prescriptions, orders, and AI health tools.</p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-3">
            <span className="text-xl">👨‍⚕️</span>
            <div><div className="font-semibold text-sm">500+ Verified Doctors</div><div className="text-sky-300 text-xs">Consult anytime, anywhere</div></div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-3">
            <span className="text-xl">🤖</span>
            <div><div className="font-semibold text-sm">AI-Powered Diagnosis</div><div className="text-sky-300 text-xs">98% symptom accuracy</div></div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-3">
            <span className="text-xl">💊</span>
            <div><div className="font-semibold text-sm">4,000+ Medicines</div><div className="text-sky-300 text-xs">Delivered to your door</div></div>
          </div>
        </div>
      </div>

      {/* Right Panel – Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-slate-50 anim">
        <div className="max-w-md w-full mx-auto">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="font-outfit font-black text-xl text-primary-dark" style={{fontWeight: 900}}>Medisphere</span>
          </div>

          <div className="mb-8">
            <h2 className="font-outfit font-black text-3xl text-slate-800 mb-1" style={{fontWeight: 800}}>Sign In</h2>
            <p className="text-slate-500 text-sm">Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline">Register Free</Link></p>
          </div>

          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm font-semibold text-center anim">
              ⚠️ {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="flex items-center justify-center gap-2 border border-slate-200 bg-white rounded-xl py-2.5 text-sm font-semibold text-slate-700 hover:border-primary-light hover:bg-primary-pale transition">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google"/>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 border border-slate-200 bg-white rounded-xl py-2.5 text-sm font-semibold text-slate-700 hover:border-primary-light hover:bg-primary-pale transition">
              <span className="text-base">📱</span>
              OTP Login
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Or sign in with email</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" 
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" title="Forgot Password" className="text-xs text-primary font-semibold hover:underline">Forgot Password?</Link>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full pl-10 pr-12 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-4 h-4 accent-primary rounded"/>
              <label htmlFor="remember" className="text-sm text-slate-600">Remember me for 30 days</label>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                </svg>
              )}
              {isLoading ? 'Signing In...' : 'Sign In to Medisphere'}
            </button>
          </form>

          {showSuccess && (
            <div className="mt-4 bg-secondary-pale border border-secondary-light text-secondary-dark rounded-xl p-4 text-sm font-semibold text-center anim">
              ✅ Login successful! Redirecting to your dashboard...
            </div>
          )}

          <p className="text-center text-xs text-slate-400 mt-6">By logging in, you agree to our <span className="text-primary cursor-pointer hover:underline">Terms of Service</span> & <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
