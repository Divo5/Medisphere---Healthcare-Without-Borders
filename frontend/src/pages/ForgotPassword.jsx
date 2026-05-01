import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-pale flex items-center justify-center text-3xl mx-auto mb-4">🔐</div>
          <h2 className="font-outfit font-black text-2xl text-slate-800 mb-2">Forgot Password?</h2>
          <p className="text-slate-500 text-sm">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {message ? (
          <div className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-xl text-sm mb-6 flex items-center gap-3">
            <span>✅</span> {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            {error && <div className="text-rose-500 text-xs font-bold ml-1">⚠️ {error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm font-bold text-primary hover:underline flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
