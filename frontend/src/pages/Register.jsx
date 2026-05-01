import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || "+91 00000 00000",
        gender: "",
        dob: "",
        blood_group: "",
        height_cm: 0,
        weight_kg: 0,
        allergies: "",
        medical_conditions: [],
        address: ""
      });

      const { access_token, user } = response.data;
      
      // Store auth data so they are logged in after registration
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      window.dispatchEvent(new Event('auth-change'));

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Registration error details:', err.response?.data);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        // Handle FastAPI validation error list
        const messages = detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join('; ');
        setError(messages);
      } else {
        setError('Registration failed. Please check your inputs.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5"></div>
        <div className="absolute bottom-20 right-10 w-52 h-52 rounded-full bg-white/5"></div>
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="font-outfit font-black text-2xl tracking-tight" style={{fontWeight: 900}}>Medisphere</span>
          </Link>
          <h1 className="font-outfit font-black text-4xl leading-tight mb-4" style={{fontWeight: 900}}>Join the<br/>Future of<br/>Healthcare</h1>
          <p className="text-sky-200 text-base leading-relaxed max-w-xs">Create a free account to book doctors, use AI diagnostic tools, and manage your medical records securely.</p>
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-3">
            <span className="text-xl">🛡️</span>
            <div><div className="font-semibold text-sm">Secure & Private</div><div className="text-sky-300 text-xs">End-to-end encrypted records</div></div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-3">
            <span className="text-xl">💳</span>
            <div><div className="font-semibold text-sm">Easy Payments</div><div className="text-sky-300 text-xs">Secure UPI & Card checkout</div></div>
          </div>
        </div>
      </div>

      {/* Right Panel – Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-slate-50 anim">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="font-outfit font-black text-3xl text-slate-800 mb-1" style={{fontWeight: 800}}>Create Account</h2>
            <p className="text-slate-500 text-sm">Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link></p>
          </div>

          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm font-semibold text-center anim">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John" 
                  required
                  className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe" 
                  required
                  className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com" 
                  required
                  className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210" 
                  required
                  className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Create Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••" 
                  required
                  className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/10 transition-all"
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

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <input 
                type={showPassword ? "text" : "password"} 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••" 
                required
                className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 py-1">
              <input type="checkbox" id="terms" required className="w-4 h-4 accent-primary rounded"/>
              <label htmlFor="terms" className="text-sm text-slate-600">I agree to the <span className="text-primary cursor-pointer hover:underline">Terms of Service</span> & <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span></label>
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>
                </svg>
              )}
              {isLoading ? 'Creating Account...' : 'Create Free Account'}
            </button>
          </form>

          {showSuccess && (
            <div className="mt-4 bg-secondary-pale border border-secondary-light text-secondary-dark rounded-xl p-4 text-sm font-semibold text-center anim">
              ✅ Account created! Redirecting to login...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
