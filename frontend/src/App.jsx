import React from 'react';
import { Routes, Route, Navigate, NavLink, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DoctorConsultation from './pages/DoctorConsultation';
import PrescriptionUpload from './pages/PrescriptionUpload';
import SymptomChecker from './pages/SymptomChecker';
import EyePredictor from './pages/EyePredictor';
import MedicineStore from './pages/MedicineStore';
import UserDashboard from './pages/UserDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Simple Route Guard for Admin
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
  }
  
  if (!token || user?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

// User Auth Guard
const UserRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  const navigate = useNavigate();

  // Axios Interceptor for Auth Errors
  React.useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const detail = error.response.data?.detail;
          if (detail === "Invalid or expired token" || detail === "Could not validate credentials") {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-change'));
            navigate('/login');
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [navigate]);

  // Hidden Shortcut for Admin Panel (Ctrl+Shift+A)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/admin/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col font-jakarta bg-medical-bg">
      <Routes>
        {/* Admin Routes (No Navbar) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin/dashboard" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />

        {/* User Routes (With Navbar) */}
        <Route 
          path="/*" 
          element={
            <>
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/doctors" element={<DoctorConsultation />} />
                  <Route path="/prescription-upload" element={<PrescriptionUpload />} />
                  <Route path="/symptom-checker" element={<SymptomChecker />} />
                  <Route path="/eye-ai" element={<EyePredictor />} />
                  <Route path="/medicine-store" element={<MedicineStore />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <UserRoute>
                        <UserDashboard />
                      </UserRoute>
                    } 
                  />
                  
                  {/* Fallback for other routes */}
                  <Route path="*" element={<div className="p-20 text-center font-outfit text-2xl font-black text-primary-dark">Page Not Found</div>} />
                </Routes>
              </main>
              
              <footer className="glass-dark text-white py-20 mt-20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent"></div>
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 relative z-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shadow-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      </div>
                      <span className="font-outfit font-black text-2xl tracking-tighter">Medi<span className="text-primary">sphere</span></span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">
                      Revolutionizing healthcare with elite medical expertise and cutting-edge AI diagnostics.
                    </p>
                    <div className="flex gap-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-primary transition-colors cursor-pointer border-white/5">
                          <span className="text-white text-xs opacity-50">#</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-outfit font-black text-[0.65rem] uppercase tracking-[0.2em] text-primary mb-8">Platform</h4>
                    <ul className="space-y-4 text-sm font-bold text-slate-400">
                      <li><Link to="/doctors" className="hover:text-white transition-colors">Find Doctors</Link></li>
                      <li><Link to="/medicine-store" className="hover:text-white transition-colors">Medicine Store</Link></li>
                      <li><Link to="/symptom-checker" className="hover:text-white transition-colors">AI Symptom Check</Link></li>
                      <li><Link to="/eye-ai" className="hover:text-white transition-colors">Eye AI Scan</Link></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-outfit font-black text-[0.65rem] uppercase tracking-[0.2em] text-primary mb-8">Account</h4>
                    <ul className="space-y-4 text-sm font-bold text-slate-400">
                      <li><Link to="/dashboard" className="hover:text-white transition-colors">User Dashboard</Link></li>
                      <li><Link to="/register" className="hover:text-white transition-colors">Join as Patient</Link></li>
                      <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-outfit font-black text-[0.65rem] uppercase tracking-[0.2em] text-primary mb-8">Newsletter</h4>
                    <p className="text-slate-400 text-xs font-bold leading-relaxed mb-6">Get the latest medical insights and AI updates.</p>
                    <div className="flex gap-2 p-1.5 glass rounded-2xl border-white/5">
                      <input type="text" placeholder="email@site.com" className="bg-transparent border-none focus:ring-0 text-xs flex-1 px-3 text-white font-medium"/>
                      <button className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                  <p className="text-slate-500 text-[0.65rem] font-black uppercase tracking-widest">© 2026 Medisphere AI. All rights reserved.</p>
                  <div className="flex gap-8 text-[0.65rem] font-black uppercase tracking-widest text-slate-500">
                    <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
                    <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
                    <span className="hover:text-white cursor-pointer transition-colors">Cookies</span>
                  </div>
                </div>
              </footer>
            </>
          } 
        />
      </Routes>
    </div>
  );
};

export default App;
