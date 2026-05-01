import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Sync user state with localStorage
    const syncAuth = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };

    syncAuth();
    // Listen for storage changes (for cross-tab sync or manual updates)
    window.addEventListener('storage', syncAuth);
    // Custom event listener for same-tab updates
    window.addEventListener('auth-change', syncAuth);

    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-change', syncAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin_token');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-[0.9rem] hero-gradient flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <span className="font-outfit font-black text-2xl text-slate-800 tracking-tighter" style={{fontWeight: 900}}>
                Medi<span className="text-primary">sphere</span>
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[0.7rem] font-black uppercase tracking-[0.15em] text-slate-500">
            <NavLink to="/" className={({ isActive }) => `hover:text-primary transition-colors ${isActive ? 'text-primary' : ''}`}>Home</NavLink>
            <NavLink to="/doctors" className={({ isActive }) => `hover:text-primary transition-colors ${isActive ? 'text-primary' : ''}`}>Doctors</NavLink>
            <NavLink to="/symptom-checker" className={({ isActive }) => `hover:text-primary transition-colors ${isActive ? 'text-primary' : ''}`}>AI Check</NavLink>
            <NavLink to="/eye-ai" className={({ isActive }) => `hover:text-primary transition-colors ${isActive ? 'text-primary' : ''}`}>Eye AI</NavLink>
            <NavLink to="/medicine-store" className={({ isActive }) => `hover:text-primary transition-colors ${isActive ? 'text-primary' : ''}`}>Store</NavLink>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 bg-slate-50/50 p-1.5 pl-4 rounded-2xl border border-slate-100">
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-2 group"
                >
                  <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center text-white text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                    {user.first_name?.[0]}
                  </div>
                  <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-700 group-hover:text-primary transition">
                    {user.first_name}
                  </span>
                </Link>
                <div className="w-[1px] h-4 bg-slate-200"></div>
                <button 
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-xl bg-white text-rose-500 flex items-center justify-center shadow-sm hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-slate-100"
                  title="Logout"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-[0.65rem] font-black uppercase tracking-widest text-primary px-5 py-2.5 rounded-xl hover:bg-primary-pale transition">Login</Link>
                <Link to="/register" className="text-[0.65rem] font-black uppercase tracking-widest bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary-dark transition shadow-lg shadow-primary/20">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
