import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    total_users: 0,
    active_doctors: 0,
    pending_doctors: 0,
    total_orders: 0,
    month_orders: 0,
    monthly_revenue: 0,
    ai_symptom_checks: 0,
    ai_eye_scans: 0
  });
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiStats, setAiStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [adminProfile, setAdminProfile] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : {
      first_name: '', last_name: '', email: '', phone: '', password: ''
    };
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Modal States
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null);

  const [medicineForm, setMedicineForm] = useState({
    name: '', brand: '', category: 'OTC', price: 0, mrp: 0, unit: '', 
    stock_quantity: 0, description: '', requires_prescription: false
  });

  const [userForm, setUserForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', address: '', is_active: true
  });

  const [doctorForm, setDoctorForm] = useState({
    first_name: '', last_name: '', email: '', specialty: '', qualification: '', is_verified: false
  });

  const token = localStorage.getItem('token');

  const fetchDashboardStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const statsRes = await axios.get(`${API_URL}/admin/dashboard`, { headers });
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchData = async (tab) => {
    setIsLoading(true);
    setActiveTab(tab);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (tab === 'ai-stats') {
        try {
          const res = await axios.get(`${API_URL}/admin/ai-stats`, { headers });
          setAiStats(res.data);
        } catch (error) {
          console.error("Error fetching AI stats:", error);
          setAiStats({}); // Set to empty object to stop loading spinner
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (tab === 'analytics') {
        try {
          const res = await axios.get(`${API_URL}/admin/analytics`, { headers });
          setAnalytics(res.data);
        } catch (error) {
          console.error("Error fetching analytics:", error);
          setAnalytics({}); // Set to empty object to stop loading spinner
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (tab === 'profile') {
        const res = await axios.get(`${API_URL}/admin/profile`, { headers });
        const profileData = {
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          password: res.data.password || ''
        };
        setAdminProfile(profileData);

        // Sync to local storage
        const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...savedUser, ...profileData };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        setIsLoading(false);
        return;
      }

      let endpoint = '';
      switch(tab) {
        case 'dashboard':
        case 'users': endpoint = `${API_URL}/admin/users`; break;
        case 'doctors': endpoint = `${API_URL}/admin/doctors`; break;
        case 'medicines': endpoint = `${API_URL}/medicines`; break;
        case 'orders': endpoint = `${API_URL}/admin/orders`; break;
        default: endpoint = `${API_URL}/admin/users`;
      }

      const res = await axios.get(endpoint, { 
        params: { limit: tab === 'dashboard' ? 5 : 20 },
        headers 
      });
      setDataList(res.data.data || []);
    } catch (error) {
      console.error(`Error fetching ${tab}:`, error);
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchDashboardStats();
    fetchData('dashboard');
    
    // Also fetch profile for the sidebar
    const fetchSidebarProfile = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API_URL}/admin/profile`, { headers });
        const profileData = {
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          password: res.data.password || ''
        };
        setAdminProfile(profileData);

        // Sync to local storage
        const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...savedUser, ...profileData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (e) {}
    };
    fetchSidebarProfile();
  }, [token, navigate]);

  const handleAction = async (type, id, action, data = {}) => {
    if (!window.confirm(`Are you sure you want to ${action} this ${type}?`)) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let endpoint = '';
      let method = 'put';

      if (type === 'user') {
        endpoint = `${API_URL}/admin/users/${id}`;
      } else if (type === 'doctor') {
        endpoint = `${API_URL}/admin/doctors/${id}/${action}`;
      } else if (type === 'medicine') {
        if (action === 'delete') {
          endpoint = `${API_URL}/medicines/${id}`;
          method = 'delete';
        } else {
          endpoint = `${API_URL}/medicines/${id}`;
        }
      } else if (type === 'order') {
        endpoint = `${API_URL}/admin/orders/${id}/status`;
      }

      await axios({ method, url: endpoint, data, headers });
      alert(`${type} ${action} successfully!`);
      fetchData(activeTab);
      if (activeTab === 'dashboard') fetchDashboardStats();
    } catch (error) {
      console.error(`Error performing ${action} on ${type}:`, error);
      alert(error.response?.data?.detail || `Failed to ${action} ${type}`);
    }
  };

  const handleMedicineSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const method = editingMedicine ? 'put' : 'post';
      const url = editingMedicine 
        ? `${API_URL}/medicines/${editingMedicine.id}` 
        : `${API_URL}/medicines/`;

      await axios({ method, url, data: medicineForm, headers });
      
      alert(`Medicine ${editingMedicine ? 'updated' : 'added'} successfully!`);
      setShowMedicineModal(false);
      setEditingMedicine(null);
      setMedicineForm({
        name: '', brand: '', category: 'OTC', price: 0, mrp: 0, unit: '', 
        stock_quantity: 0, description: '', requires_prescription: false
      });
      fetchData('medicines');
    } catch (error) {
      console.error("Error saving medicine:", error);
      alert(error.response?.data?.detail || "Failed to save medicine");
    }
  };

  const openMedicineModal = (medicine = null) => {
    if (medicine) {
      setEditingMedicine(medicine);
      setMedicineForm({
        name: medicine.name,
        brand: medicine.brand,
        category: medicine.category,
        price: medicine.price,
        mrp: medicine.mrp,
        unit: medicine.unit,
        stock_quantity: medicine.stock_quantity,
        description: medicine.description || '',
        requires_prescription: medicine.requires_prescription
      });
    } else {
      setEditingMedicine(null);
      setMedicineForm({
        name: '', brand: '', category: 'OTC', price: 0, mrp: 0, unit: '', 
        stock_quantity: 0, description: '', requires_prescription: false
      });
    }
    setShowMedicineModal(true);
  };

  const openUserModal = (user) => {
    setEditingUser(user);
    setUserForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      is_active: user.is_active ?? true
    });
    setShowUserModal(true);
  };

  const openDoctorModal = (doctor) => {
    setEditingDoctor(doctor);
    setDoctorForm({
      first_name: doctor.first_name || '',
      last_name: doctor.last_name || '',
      email: doctor.email || '',
      specialty: doctor.specialty || '',
      qualification: doctor.qualification || '',
      is_verified: doctor.is_verified ?? false
    });
    setShowDoctorModal(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/admin/users/${editingUser.id}`, userForm, { headers });
      alert("User updated successfully!");
      setShowUserModal(false);
      fetchData('users');
    } catch (error) {
      console.error("Error updating user:", error);
      alert(error.response?.data?.detail || "Failed to update user");
    }
  };

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/admin/doctors/${editingDoctor.id}`, doctorForm, { headers });
      alert("Doctor updated successfully!");
      setShowDoctorModal(false);
      fetchData('doctors');
    } catch (error) {
      console.error("Error updating doctor:", error);
      alert(error.response?.data?.detail || "Failed to update doctor");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin_token');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/admin/login');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${API_URL}/admin/profile`, adminProfile, { headers });
      
      const updatedProfile = {
        first_name: res.data.user?.first_name || adminProfile.first_name,
        last_name: res.data.user?.last_name || adminProfile.last_name,
        email: res.data.user?.email || adminProfile.email,
        phone: res.data.user?.phone || adminProfile.phone,
        password: res.data.user?.password || adminProfile.password
      };
      
      setAdminProfile(updatedProfile);
      
      // Update local storage
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...existingUser, ...updatedProfile };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMsg = error.response?.data?.detail || error.message || "Failed to update profile";
      alert(`Update Failed: ${errorMsg}`);
    } finally {
      setIsLoading(false);
      setIsSavingProfile(false);
    }
  };

  const renderProfile = () => {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-rose-100">
              {adminProfile.first_name?.[0] || 'A'}
            </div>
            <div>
              <h3 className="font-outfit font-black text-3xl text-slate-900">Admin Profile</h3>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Manage your administrative identity</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="max-w-2xl space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-6 text-sm font-semibold focus:outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
                  value={adminProfile.first_name}
                  onChange={(e) => setAdminProfile({...adminProfile, first_name: e.target.value})}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-6 text-sm font-semibold focus:outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
                  value={adminProfile.last_name}
                  onChange={(e) => setAdminProfile({...adminProfile, last_name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-6 text-sm font-semibold focus:outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
                value={adminProfile.email}
                onChange={(e) => setAdminProfile({...adminProfile, email: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-6 text-sm font-semibold focus:outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
                value={adminProfile.phone}
                onChange={(e) => setAdminProfile({...adminProfile, phone: e.target.value})}
              />
            </div>

            <div className="pt-6 border-t border-slate-50">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white font-black uppercase tracking-[0.2em] text-[0.7rem] shadow-xl shadow-rose-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isSavingProfile ? 'Saving Changes...' : 'Update Admin Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Credentials Table Card */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 overflow-hidden">
          <div className="mb-8">
            <h3 className="font-outfit font-black text-2xl text-slate-900">Admin Credentials</h3>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Direct system access records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Admin Identity</th>
                  <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Username / Email</th>
                  <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Contact Number</th>
                  <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">System Password</th>
                  <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-sm">
                        {adminProfile.first_name?.[0] || 'A'}
                      </div>
                      <div className="text-[0.9rem] font-bold text-slate-800">{adminProfile.first_name} {adminProfile.last_name}</div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-[0.85rem] font-bold text-slate-600">{adminProfile.email}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-[0.85rem] font-bold text-slate-600">{adminProfile.phone || 'N/A'}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="text-[0.85rem] font-mono font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                        {adminProfile.password || '••••••••'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[0.6rem] font-black uppercase tracking-widest">
                      Super Admin
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Patients', value: stats.total_users, trend: '+12%', color: 'sky', icon: '👥' },
          { label: 'Active Doctors', value: stats.active_doctors, trend: `+${stats.pending_doctors} pending`, color: 'emerald', icon: '👨‍⚕️' },
          { label: 'Monthly Revenue', value: `₹${stats.monthly_revenue}`, trend: `${stats.month_orders} orders`, color: 'amber', icon: '💰' },
          { label: 'AI Diagnoses', value: stats.ai_symptom_checks + stats.ai_eye_scans, trend: 'Live', color: 'indigo', icon: '🤖' }
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center text-xl shadow-inner`}>
                {card.icon}
              </div>
              <span className={`bg-${card.color}-50 text-${card.color}-700 px-3 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-wider border border-${card.color}-100`}>
                {card.trend}
              </span>
            </div>
            <div className="font-outfit font-black text-3xl text-slate-900 tracking-tight">{card.value}</div>
            <div className="text-slate-400 text-[0.7rem] font-bold uppercase tracking-widest mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-outfit font-black text-xl text-slate-900">Recent Registrations</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Newly joined patients</p>
            </div>
            <button onClick={() => fetchData('users')} className="px-4 py-2 rounded-xl bg-slate-50 text-sky-600 text-[0.7rem] font-black uppercase tracking-widest hover:bg-sky-50 transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {dataList.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                  {user.first_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.9rem] font-bold text-slate-800">{user.first_name} {user.last_name}</div>
                  <div className="text-[0.75rem] text-slate-400 font-medium truncate">{user.email}</div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-[0.6rem] font-black uppercase tracking-tighter ${user.is_verified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {user.is_verified ? 'Verified' : 'Pending'}
                  </span>
                  <div className="text-[0.65rem] text-slate-300 font-bold mt-1">Patient</div>
                </div>
              </div>
            ))}
            {dataList.length === 0 && <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs">No recent users</p>}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h3 className="font-outfit font-black text-xl text-slate-900 mb-8">System Integrity</h3>
          <div className="space-y-4">
            {[
              { name: 'Symptom AI', status: 'Optimal', color: 'emerald', icon: '🧠' },
              { name: 'Eye Scan AI', status: 'Optimal', color: 'emerald', icon: '👁️' },
              { name: 'Cloud Database', status: 'Syncing', color: 'sky', icon: '☁️' },
              { name: 'Pharmacy Engine', status: 'Active', color: 'emerald', icon: '💊' }
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-white transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xl group-hover:scale-110 transition-transform">{s.icon}</span>
                  <span className="text-[0.8rem] font-bold text-slate-700">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full bg-${s.color}-500 animate-pulse`}></span>
                  <span className={`text-[0.65rem] font-black uppercase tracking-widest text-${s.color}-600`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-200">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Security Protocol</div>
            <div className="text-sm font-bold leading-relaxed mb-4">All systems are operating under encrypted medical standards.</div>
            <button className="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-black uppercase tracking-widest transition-all">Run Diagnostic</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAiStats = () => {
    if (!aiStats) return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading AI intelligence...</div>;
    
    // Check if data is empty or missing
    if (Object.keys(aiStats).length === 0) {
      return (
        <div className="text-center py-20 animate-fade-in">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-slate-900 font-black text-xl mb-2">AI Data Unavailable</div>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">The intelligent diagnostic engine is currently offline</p>
          <button onClick={() => fetchData('ai-stats')} className="mt-8 px-8 py-3 rounded-2xl bg-indigo-500 text-white font-black uppercase tracking-widest text-[0.7rem] shadow-lg shadow-indigo-100 hover:bg-indigo-600 transition-all">Retry Connection</button>
        </div>
      );
    }

    const { symptom_checker, eye_predictor, ocr_engine, accuracy } = aiStats;

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">🧠</div>
              <div>
                <div className="text-slate-400 text-[0.6rem] font-black uppercase tracking-[0.2em]">Symptom Checker</div>
                <div className="text-2xl font-black text-slate-900">{symptom_checker?.total || 0} Queries</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Model Accuracy</span>
                <span className="text-indigo-600 font-black text-sm">{accuracy?.symptom_ai || 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${accuracy?.symptom_ai || 0}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">👁️</div>
              <div>
                <div className="text-slate-400 text-[0.6rem] font-black uppercase tracking-[0.2em]">Eye Predictor</div>
                <div className="text-2xl font-black text-slate-900">{eye_predictor?.total || 0} Scans</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Model Accuracy</span>
                <span className="text-emerald-600 font-black text-sm">{accuracy?.eye_cnn || 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${accuracy?.eye_cnn || 0}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">📄</div>
              <div>
                <div className="text-slate-400 text-[0.6rem] font-black uppercase tracking-[0.2em]">OCR Engine</div>
                <div className="text-2xl font-black text-slate-900">{ocr_engine?.total || 0} Extractions</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Model Accuracy</span>
                <span className="text-amber-600 font-black text-sm">{accuracy?.ocr_engine || 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${accuracy?.ocr_engine || 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Eye Scan Distribution */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="font-outfit font-black text-xl text-slate-900 mb-8">Retinal Disease Distribution</h3>
            <div className="space-y-6">
              {eye_predictor?.class_distribution && Object.entries(eye_predictor.class_distribution).map(([label, count]) => {
                const percentage = ((count / (eye_predictor.total || 1)) * 100).toFixed(1);
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-[0.7rem] font-black uppercase tracking-widest">
                      <span className="text-slate-700">{label}</span>
                      <span className="text-slate-400">{count} cases ({percentage}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {(!eye_predictor?.class_distribution || Object.keys(eye_predictor.class_distribution).length === 0) && (
                <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs">No scan data recorded yet</p>
              )}
            </div>
          </div>

          {/* Symptom Risk Distribution */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="font-outfit font-black text-xl text-slate-900 mb-8">Symptom Risk Analysis</h3>
            <div className="space-y-6">
              {symptom_checker?.risk_distribution && Object.entries(symptom_checker.risk_distribution).map(([label, count]) => {
                const percentage = ((count / (symptom_checker.total || 1)) * 100).toFixed(1);
                const colors = {
                  'high': 'rose',
                  'medium': 'amber',
                  'low': 'emerald'
                };
                const color = colors[label.toLowerCase()] || 'sky';
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-[0.7rem] font-black uppercase tracking-widest">
                      <span className={`text-${color}-600`}>{label} Risk</span>
                      <span className="text-slate-400">{count} reports ({percentage}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden">
                      <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {(!symptom_checker?.risk_distribution || Object.keys(symptom_checker.risk_distribution).length === 0) && (
                <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs">No symptom data recorded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading market intelligence...</div>;

    // Check if data is empty or missing
    if (Object.keys(analytics).length === 0) {
      return (
        <div className="text-center py-20 animate-fade-in">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-slate-900 font-black text-xl mb-2">Analytics Offline</div>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Market intelligence data is currently unavailable</p>
          <button onClick={() => fetchData('analytics')} className="mt-8 px-8 py-3 rounded-2xl bg-sky-500 text-white font-black uppercase tracking-widest text-[0.7rem] shadow-lg shadow-sky-100 hover:bg-sky-600 transition-all">Retry Analysis</button>
        </div>
      );
    }

    const monthly_revenue = analytics.monthly_revenue || [];
    const top_medicines = analytics.top_medicines || [];
    const maxRev = monthly_revenue.length > 0 ? Math.max(...monthly_revenue.map(item => item.revenue), 1000) : 1000;

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Revenue Chart (CSS Based) */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="font-outfit font-black text-2xl text-slate-900">Revenue Stream</h3>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Monthly financial performance</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
              </div>
            </div>
          </div>
          
          <div className="h-[300px] flex items-end gap-4 md:gap-8 px-4">
            {monthly_revenue.map((m, i) => {
              const height = (m.revenue / maxRev) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="relative w-full">
                    <div 
                      className="w-full bg-sky-500/10 group-hover:bg-sky-500/20 rounded-t-2xl transition-all duration-500 relative"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[0.65rem] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ₹{m.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[0.6rem] font-black text-slate-400 uppercase tracking-tighter">{m.month.split(' ')[0]}</div>
                    <div className="text-[0.5rem] font-bold text-slate-300">{m.month.split(' ')[1]}</div>
                  </div>
                </div>
              );
            })}
            {monthly_revenue.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-xs">No revenue data available</div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="font-outfit font-black text-xl text-slate-900 mb-8">Top Selling Medicines</h3>
            <div className="space-y-4">
              {top_medicines.map((med, i) => (
                <div key={i} className="flex items-center gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-white transition-all">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-slate-400 shadow-sm group-hover:text-sky-600 transition-colors">
                    0{i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-[0.9rem] font-bold text-slate-800">{med.name}</div>
                    <div className="text-[0.7rem] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Pharmaceutical</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.9rem] font-black text-slate-900">{med.sales} Sales</div>
                    <div className="text-[0.6rem] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Trending 🔥</div>
                  </div>
                </div>
              ))}
              {top_medicines.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs">No sales data available</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="font-outfit font-black text-xl text-slate-900 mb-8">Market Insights</h3>
            <div className="space-y-6">
              {[
                { label: 'Patient Growth', value: '14.2%', trend: 'up', color: 'emerald' },
                { label: 'Avg Order Value', value: '₹1,240', trend: 'up', color: 'sky' },
                { label: 'Refund Rate', value: '0.8%', trend: 'down', color: 'rose' },
                { label: 'System Uptime', value: '99.9%', trend: 'up', color: 'emerald' }
              ].map((insight, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest">{insight.label}</div>
                  <div className={`text-[0.9rem] font-black text-${insight.color}-600 flex items-center gap-2`}>
                    {insight.value}
                    <span className="text-[0.6rem]">{insight.trend === 'up' ? '▲' : '▼'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 p-6 rounded-3xl bg-slate-900 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <div className="text-[0.6rem] font-black uppercase tracking-[0.2em] mb-2 text-sky-400">Market Forecast</div>
                <div className="text-sm font-bold leading-relaxed">Demand for chronic medicines is expected to rise by 22% next quarter.</div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = (type) => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
      <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-outfit font-black text-2xl text-slate-900 capitalize">{type} Management</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Control and monitor all {type}</p>
        </div>
        {type === 'medicines' && (
          <button 
            onClick={() => openMedicineModal()}
            className="bg-sky-500 text-white px-6 py-3 rounded-2xl text-[0.7rem] font-black uppercase tracking-[0.15em] shadow-lg shadow-sky-200 hover:bg-sky-600 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add New Medicine
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Identity</th>
              <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Specifications</th>
              <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-8 py-5 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {dataList.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-lg group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                      {item.first_name?.[0] || item.name?.[0] || 'M'}
                    </div>
                    <div>
                      <div className="text-[0.9rem] font-bold text-slate-800 group-hover:text-sky-700 transition-colors">{item.first_name ? `${item.first_name} ${item.last_name}` : item.name}</div>
                      <div className="text-[0.7rem] text-slate-400 font-semibold mt-0.5">{item.email || item.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="text-[0.8rem] font-bold text-slate-600">{item.phone || item.specialty || (item.stock_quantity !== undefined ? `Stock: ${item.stock_quantity} units` : `Amount: ₹${item.total_amount}`)}</div>
                  <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-tighter mt-1">{item.address || item.qualification || (item.price ? `MRP: ₹${item.mrp}` : `Via: ${item.payment_method?.toUpperCase()}`)}</div>
                  {activeTab === 'orders' && item.created_at && (
                    <div className="text-[0.6rem] text-sky-600 font-black uppercase tracking-tighter mt-1.5 flex items-center gap-1.5">
                      <span className="opacity-50">🕒</span>
                      {new Date(item.created_at).toLocaleString('en-US', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </div>
                  )}
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[0.6rem] font-black uppercase tracking-widest border ${
                    item.is_verified || item.is_active || item.in_stock || item.status === 'delivered' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {type === 'users' ? (item.is_active ? 'Active' : 'Blocked') : 
                     type === 'doctors' ? (item.is_verified ? 'Verified' : 'Pending') : 
                     type === 'medicines' ? (item.in_stock ? 'In Stock' : 'Out of Stock') : 
                     item.status}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center justify-end gap-2">
                    {type === 'users' && (
                      <button 
                        onClick={() => handleAction('user', item.id, item.is_active ? 'block' : 'unblock', { is_active: !item.is_active })}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${item.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} 
                        title={item.is_active ? 'Block' : 'Unblock'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      </button>
                    )}
                    {type === 'doctors' && !item.is_verified && (
                      <button 
                        onClick={() => handleAction('doctor', item.id, 'verify')}
                        className="w-9 h-9 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-all" title="Approve"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    )}
                    {type === 'doctors' && item.is_verified && (
                      <button 
                        onClick={() => handleAction('doctor', item.id, 'suspend')}
                        className="w-9 h-9 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl flex items-center justify-center transition-all" title="Suspend"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                      </button>
                    )}
                    {type === 'orders' && item.status !== 'delivered' && item.status !== 'cancelled' && (
                      <select 
                        className="text-[0.65rem] font-black uppercase tracking-tighter bg-slate-50 border-none text-slate-600 rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                        onChange={(e) => handleAction('order', item.id, 'update status', { status: e.target.value })}
                        value={item.status}
                      >
                        <option value="placed">Placed</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="packed">Packed</option>
                        <option value="in_transit">Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancel</option>
                      </select>
                    )}
                    <button 
                      onClick={() => {
                        if (type === 'medicines') openMedicineModal(item);
                        else if (type === 'users') openUserModal(item);
                        else if (type === 'doctors') openDoctorModal(item);
                        else alert('Extended view coming soon!');
                      }}
                      className="w-9 h-9 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl flex items-center justify-center transition-all" title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    {type === 'medicines' && (
                      <button 
                        onClick={() => handleAction('medicine', item.id, 'delete')}
                        className="w-9 h-9 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl flex items-center justify-center transition-all" title="Remove"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dataList.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl opacity-20">📂</span>
            </div>
            <div className="text-slate-400 font-black uppercase tracking-[0.2em] text-[0.7rem]">No clinical records found</div>
            <p className="text-slate-300 text-xs mt-2 font-medium">Database query returned zero results.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-600 font-['Plus_Jakarta_Sans']">
      {/* SIDEBAR */}
      <aside className="w-[280px] bg-white border-r border-slate-100 flex flex-col fixed top-0 left-0 h-full z-40 shadow-sm">
        <div className="p-8 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div>
              <div className="font-outfit font-black text-slate-900 text-xl tracking-tight">Medisphere</div>
              <div className="text-[0.65rem] text-sky-600 font-black uppercase tracking-[0.2em] mt-0.5">Control Terminal</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <div className="text-[0.65rem] font-black text-slate-300 uppercase tracking-[0.25em] ml-4 mb-4">Core Management</div>
            {[
              { id: 'dashboard', label: 'Overview', icon: '📊' },
              { id: 'users', label: 'Patients', icon: '👥' },
              { id: 'doctors', label: 'Medical Staff', icon: '👨‍⚕️' },
              { id: 'medicines', label: 'Pharmacy Store', icon: '💊' },
              { id: 'orders', label: 'Order Pipeline', icon: '📦' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => fetchData(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.2rem] text-[0.85rem] font-bold transition-all ${activeTab === item.id ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-50">
            <div className="text-[0.65rem] font-black text-slate-300 uppercase tracking-[0.25em] ml-4 mb-4">Intelligence</div>
            {[
              { id: 'ai-stats', label: 'AI Performance', icon: '🧠' },
              { id: 'analytics', label: 'Market Analytics', icon: '📈' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => fetchData(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.2rem] text-[0.85rem] font-bold transition-all ${activeTab === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-6 border-t border-slate-50 bg-slate-50/50">
          <button 
            onClick={() => fetchData('profile')}
            className={`w-full flex items-center gap-4 p-3 rounded-2xl bg-white border transition-all mb-3 ${activeTab === 'profile' ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-slate-100 hover:border-rose-200'}`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              {adminProfile.first_name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-slate-900 text-[0.8rem] font-black truncate">{adminProfile.first_name || 'Super Admin'}</div>
              <div className="text-slate-400 text-[0.65rem] font-bold truncate uppercase tracking-tighter">Edit Profile</div>
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-600 text-[0.7rem] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-[280px] flex-1 flex flex-col min-h-screen">
        {/* TOPBAR */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="font-outfit font-black text-slate-900 text-xl capitalize tracking-tight">{activeTab}</h2>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
            <span className="text-slate-400 text-[0.7rem] font-black uppercase tracking-widest">Medical Hub Dashboard</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[0.7rem] font-black uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <div className="w-px h-3 bg-slate-200"></div>
              <span className="text-slate-900 text-[0.7rem] font-black">10:45 AM</span>
            </div>
            <Link to="/" className="text-[0.7rem] font-black uppercase tracking-[0.15em] text-sky-600 hover:text-sky-700 flex items-center gap-2 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to site
            </Link>
          </div>
        </header>

        <div className="p-10 flex-1 max-w-[1600px] mx-auto w-full">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin mb-6"></div>
              <div className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Synchronizing Clinical Data...</div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {['users', 'doctors', 'medicines', 'orders'].includes(activeTab) && renderTable(activeTab)}
              {activeTab === 'ai-stats' && renderAiStats()}
              {activeTab === 'analytics' && renderAnalytics()}
              {activeTab === 'profile' && renderProfile()}
            </>
          )}
        </div>
      </main>

      {/* MEDICINE MODAL */}
      {showMedicineModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-outfit font-black text-2xl text-slate-900">{editingMedicine ? 'Modify Medicine' : 'Add New Entry'}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Inventory Management System</p>
              </div>
              <button onClick={() => setShowMedicineModal(false)} className="w-10 h-10 rounded-xl bg-white text-slate-400 hover:text-rose-500 transition-colors shadow-sm flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleMedicineSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Medicine Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                    value={medicineForm.name}
                    onChange={(e) => setMedicineForm({...medicineForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Brand/Manufacturer</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                    value={medicineForm.brand}
                    onChange={(e) => setMedicineForm({...medicineForm, brand: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                    value={medicineForm.price}
                    onChange={(e) => setMedicineForm({...medicineForm, price: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">MRP (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                    value={medicineForm.mrp}
                    onChange={(e) => setMedicineForm({...medicineForm, mrp: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                    value={medicineForm.stock_quantity}
                    onChange={(e) => setMedicineForm({...medicineForm, stock_quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Unit (e.g. Strip of 10)</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                    value={medicineForm.unit}
                    onChange={(e) => setMedicineForm({...medicineForm, unit: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-2xl border border-sky-100">
                <input
                  type="checkbox"
                  id="rx_req"
                  className="w-5 h-5 rounded border-sky-200 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
                  checked={medicineForm.requires_prescription}
                  onChange={(e) => setMedicineForm({...medicineForm, requires_prescription: e.target.checked})}
                />
                <label htmlFor="rx_req" className="text-xs font-black text-sky-700 uppercase tracking-widest cursor-pointer">Requires Prescription (Rx)</label>
              </div>
              <button
                type="submit"
                className="w-full py-5 rounded-[1.5rem] bg-gradient-to-br from-sky-500 to-sky-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-sky-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {editingMedicine ? 'Update Inventory' : 'Finalize Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-outfit font-black text-2xl text-slate-900">Edit Patient Profile</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Patient Management System</p>
              </div>
              <button onClick={() => setShowUserModal(false)} className="w-10 h-10 rounded-xl bg-white text-slate-400 hover:text-rose-500 transition-colors shadow-sm flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                    value={userForm.first_name}
                    onChange={(e) => setUserForm({...userForm, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                    value={userForm.last_name}
                    onChange={(e) => setUserForm({...userForm, last_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all min-h-[100px]"
                  value={userForm.address}
                  onChange={(e) => setUserForm({...userForm, address: e.target.value})}
                />
              </div>
              <button
                type="submit"
                className="w-full py-5 rounded-[1.5rem] bg-gradient-to-br from-sky-500 to-sky-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-sky-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Update Patient Data
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR MODAL */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-outfit font-black text-2xl text-slate-900">Edit Medical Staff</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Staff Management System</p>
              </div>
              <button onClick={() => setShowDoctorModal(false)} className="w-10 h-10 rounded-xl bg-white text-slate-400 hover:text-rose-500 transition-colors shadow-sm flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleDoctorSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                    value={doctorForm.first_name}
                    onChange={(e) => setDoctorForm({...doctorForm, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                    value={doctorForm.last_name}
                    onChange={(e) => setDoctorForm({...doctorForm, last_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({...doctorForm, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Specialty</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                    value={doctorForm.specialty}
                    onChange={(e) => setDoctorForm({...doctorForm, specialty: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">Qualification</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                    value={doctorForm.qualification}
                    onChange={(e) => setDoctorForm({...doctorForm, qualification: e.target.value})}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-5 rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Update Staff Records
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
