import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Get token from URL
  const token = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-6">🎉</div>
          <h2 className="font-outfit font-black text-2xl text-slate-800 mb-2">Password Reset!</h2>
          <p className="text-slate-500 text-sm mb-6">Your password has been successfully updated. Redirecting you to login...</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-green-500 h-full animate-progress-fast"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary-pale flex items-center justify-center text-3xl mx-auto mb-4">🆕</div>
          <h2 className="font-outfit font-black text-2xl text-slate-800 mb-2">New Password</h2>
          <p className="text-slate-500 text-sm">Please enter a strong new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all"
            />
          </div>

          {error && <div className="text-rose-500 text-xs font-bold ml-1">⚠️ {error}</div>}

          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
