import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import PaymentPortal from '../components/PaymentPortal';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ consultations: 0, prescriptions: 0, orders: 0, ai_reports: 0 });
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    blood_group: '',
    height_cm: '',
    weight_kg: '',
    address: ''
  });
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [token, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [profileRes, consultsRes, ordersRes, symptomsRes, eyeRes] = await Promise.all([
        axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/doctors/user/appointments`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { total: 0 } })),
        axios.get(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { total: 0 } })),
        axios.get(`${API_URL}/symptoms/history`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { total: 0 } })),
        axios.get(`${API_URL}/eye/history`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { total: 0 } }))
      ]);

      const profile = profileRes.data;
      setUserData(profile);
      setEditForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        blood_group: profile.blood_group || '',
        height_cm: profile.height_cm || '',
        weight_kg: profile.weight_kg || '',
        address: profile.address || ''
      });
      setStats({
        consultations: consultsRes.data.total || consultsRes.data.data?.length || 0,
        prescriptions: profileRes.data.prescriptions_count || 0,
        orders: ordersRes.data.total || ordersRes.data.data?.length || 0,
        ai_reports: (symptomsRes.data.total || symptomsRes.data.data?.length || 0) + (eyeRes.data.total || eyeRes.data.data?.length || 0)
      });

      // Extract upcoming booked call
      const allAppointments = consultsRes.data.data || consultsRes.data.items || [];
      const upcoming = allAppointments
        .filter(app => app.payment_status === 'paid' && new Date(app.date) >= new Date().setHours(0,0,0,0))
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      
      // If no real upcoming appointment, show a mock one for display as requested
       setUpcomingAppointment(upcoming || {
         id: 'mock_demo_call',
         doctor_name: 'Dr. Priya Sharma',
         specialty: 'Senior Cardiologist',
         date: '2026-05-10', // Set to a future date relative to today (2026-04-28)
         time: '10:30 AM',
         status: 'confirmed',
         payment_status: 'paid',
         meeting_link: 'https://meet.google.com/new'
       });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`${API_URL}/auth/profile`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditing(false);
      fetchDashboardData();
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async (tab) => {
    setLoading(true);
    setActiveTab(tab);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let endpoint = '';
      switch(tab) {
        case 'consultations': endpoint = `${API_URL}/doctors/user/appointments`; break;
        case 'orders': endpoint = `${API_URL}/orders/my`; break;
        case 'reports': 
          const [symptomRes, eyeRes] = await Promise.all([
            axios.get(`${API_URL}/symptoms/history`, { headers }),
            axios.get(`${API_URL}/eye/history`, { headers })
          ]);
          const combined = [
            ...(symptomRes.data.data || []).map(r => ({ ...r, report_type: 'symptom' })),
            ...(eyeRes.data.data || []).map(r => ({ ...r, report_type: 'eye' }))
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setDataList(combined);
          setLoading(false);
          return;
        default: return;
      }
      const res = await axios.get(endpoint, { headers });
      setDataList(res.data.data || res.data.items || []);
    } catch (err) {
      console.error(`Error fetching ${tab}:`, err);
      // Fallback mock data for history when DB is disconnected
      if (tab === 'consultations') {
        setDataList([{
          id: 'mock_c1', doctor_name: 'Dr. Priya Sharma', specialty: 'Cardiologist', 
          date: '2025-03-20', status: 'confirmed', created_at: new Date().toISOString()
        }]);
      } else if (tab === 'orders') {
        setDataList([{
          id: 'mock_o1', items: ['Paracetamol'], total_amount: 145, 
          status: 'delivered', created_at: new Date().toISOString()
        }]);
      } else if (tab === 'reports') {
        setDataList([{
          id: 'mock_r1', predicted_condition: 'Common Cold', 
          result: { risk_level: 'Low' }, created_at: new Date().toISOString()
        }]);
      } else {
        setDataList([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const handleViewDetails = async (item) => {
    if (activeTab === 'orders') {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/orders/${item.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedItem(res.data);
        setIsModalOpen(true);
      } catch (err) {
        console.error('Error fetching order details:', err);
        setSelectedItem(item);
        setIsModalOpen(true);
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  const handlePaymentSuccess = (transactionId) => {
    // Refresh list to update status
    setTimeout(() => {
      setIsPaymentModalOpen(false);
      if (activeTab === 'orders' || activeTab === 'consultations') {
        fetchTabData(activeTab);
      }
    }, 2500);
  };

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const handleDownloadReceipt = (order) => {
    setSelectedReceipt(order);
    setIsReceiptModalOpen(true);
  };

  const triggerReceiptPrint = () => {
    const content = document.querySelector('.printable-receipt');
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt – Medisphere</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #1e293b; padding: 40px; }
    .border-2 { border: 2px solid #e2e8f0; border-radius: 1.5rem; padding: 2rem; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-start { align-items: flex-start; }
    .mb-8 { margin-bottom: 2rem; }
    .pb-6 { padding-bottom: 1.5rem; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: 1fr 1fr; }
    .gap-4 { gap: 1rem; }
    .bg-slate-50 { background: #f8fafc; }
    .rounded-2xl { border-radius: 1rem; }
    .p-5 { padding: 1.25rem; }
    .border { border: 1px solid #e2e8f0; }
    .text-xs { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem; }
    .text-base { font-size: 1rem; font-weight: 900; color: #1e293b; }
    .text-sm { font-size: 0.875rem; }
    .font-bold { font-weight: 700; color: #64748b; margin-top: 0.25rem; font-size: 0.7rem; }
    .text-primary { color: #0ea5e9; }
    .text-2xl { font-size: 1.5rem; font-weight: 900; color: #0ea5e9; }
    .font-black { font-weight: 900; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; }
    th { background: #f8fafc; padding: 1rem 1.5rem; text-align: left; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
    td { padding: 1rem 1.5rem; font-size: 0.8rem; font-weight: 700; color: #475569; border-top: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .justify-end { justify-content: flex-end; }
    .w-64 { width: 16rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .pt-3 { padding-top: 0.75rem; }
    .border-t-2 { border-top: 2px solid #e2e8f0; }
    .pt-6 { padding-top: 1.5rem; }
    .mt-6 { margin-top: 1.5rem; }
    .border-t { border-top: 1px solid #e2e8f0; }
    .italic { font-style: italic; }
    .text-emerald-600 { color: #059669; }
    .uppercase { text-transform: uppercase; }
    .tracking-widest { letter-spacing: 0.2em; }
  </style>
</head>
<body>${content.outerHTML}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    setIsReceiptModalOpen(false);
  };

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const handleDownloadReport = (item) => {
    setSelectedReport(item);
    setIsReportModalOpen(true);
  };

  const triggerPrint = () => {
    const content = document.querySelector('.printable-report');
    if (!content) return;
    const isEye = selectedReport?.report_type === 'eye';
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${isEye ? 'Eye' : 'Symptom'} Report – Medisphere</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #1e293b; padding: 40px; }
    .border-2 { border: 2px solid #e2e8f0; border-radius: 1.5rem; padding: 2rem; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-start { align-items: flex-start; }
    .mb-8 { margin-bottom: 2rem; }
    .pb-6 { padding-bottom: 1.5rem; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: 1fr 1fr; }
    .gap-4 { gap: 1rem; }
    .bg-slate-50 { background: #f8fafc; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .p-5 { padding: 1.25rem; }
    .p-4 { padding: 1rem; }
    .p-5 { padding: 1.25rem; }
    .border { border: 1px solid #e2e8f0; }
    .text-xs-label { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem; }
    .text-base { font-size: 1rem; font-weight: 900; color: #1e293b; }
    .text-2xl { font-size: 1.5rem; font-weight: 900; }
    .text-primary { color: #0ea5e9; }
    .text-rose-600 { color: #e11d48; }
    .font-black { font-weight: 900; }
    .font-bold { font-weight: 700; }
    .font-medium { font-weight: 500; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-600 { color: #475569; }
    .text-slate-500 { color: #64748b; }
    .text-slate-400 { color: #94a3b8; }
    .bg-violet-50 { background: #f5f3ff; }
    .bg-rose-50 { background: #fff1f2; }
    .border-violet-100 { border-color: #ede9fe; }
    .border-rose-100 { border-color: #fecdd3; }
    .text-violet-400 { color: #a78bfa; }
    .text-rose-400 { color: #fb7185; }
    .leading-relaxed { line-height: 1.625; }
    .flex-wrap { flex-wrap: wrap; }
    .gap-2 { gap: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .tracking-tighter { letter-spacing: -0.05em; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .pt-6 { padding-top: 1.5rem; }
    .mt-6 { margin-top: 1.5rem; }
    .border-t { border-top: 1px solid #e2e8f0; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    li { display: flex; gap: 0.75rem; font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 0.5rem; }
    span.dot { color: #0ea5e9; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.65rem; font-weight: 700; color: #475569; }
  </style>
</head>
<body>${content.outerHTML}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    setIsReportModalOpen(false);
  };

  const sidebarLinks = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'consultations', label: 'Consultations', icon: '👨‍⚕️' },
    { id: 'orders', label: 'My Orders', icon: '📦' },
    { id: 'reports', label: 'AI Reports', icon: '🤖' },
    { id: 'profile', label: 'Profile', icon: '⚙️' }
  ];

  if (loading && !userData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-8 fade-up">
      {/* Welcome Banner */}
      <div className="hero-gradient rounded-[2rem] p-10 text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-[0.2em] w-fit mb-4 border border-white/20">
              Personal Health Profile
            </div>
            <h2 className="font-outfit font-black text-4xl mb-2" style={{ fontWeight: 900 }}>Welcome Back, {userData?.first_name} 👋</h2>
            <p className="text-sky-100 text-sm opacity-90 font-medium">Monitoring your health records since {new Date(userData?.created_at).getFullYear()}.</p>
          </div>
          <div className="glass-dark rounded-3xl px-8 py-6 border border-white/10 text-center min-w-[140px]">
            <div className="text-4xl font-black mb-1">92</div>
            <div className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-sky-300">Health Score</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Consultations', val: stats.consultations, icon: '👨‍⚕️', color: 'text-primary', bg: 'bg-primary-pale' },
          { label: 'Prescriptions', val: stats.prescriptions, icon: '📋', color: 'text-secondary', bg: 'bg-secondary-pale' },
          { label: 'Medicine Orders', val: stats.orders, icon: '📦', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'AI Reports', val: stats.ai_reports, icon: '🤖', color: 'text-violet-600', bg: 'bg-violet-50' }
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-3xl p-6 border border-white/40 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center text-2xl mb-4 shadow-inner`}>{stat.icon}</div>
            <div className={`font-outfit font-black text-3xl ${stat.color}`} style={{ fontWeight: 900 }}>{stat.val}</div>
            <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming & Recent */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="glass-card rounded-3xl p-8 border border-white/40">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-outfit font-black text-slate-800 text-xl">Upcoming Appointment</h3>
            <Link to="/doctors" className="text-[0.65rem] font-black text-primary uppercase tracking-widest hover:underline">Book New →</Link>
          </div>
          {upcomingAppointment ? (
            <div className="bg-primary-pale/30 border border-primary/10 rounded-3xl p-6 relative overflow-hidden group">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-4xl shadow-md group-hover:scale-110 transition-transform">👩‍⚕️</div>
                <div>
                  <div className="font-black text-slate-800 text-lg">{upcomingAppointment.doctor_name}</div>
                  <div className="text-[0.65rem] text-primary font-black uppercase tracking-[0.1em] mb-1">{upcomingAppointment.specialty}</div>
                  <div className="text-[0.7rem] text-slate-500 font-bold flex items-center gap-2">
                    <span className="opacity-50">📅</span> {new Date(upcomingAppointment.date).toLocaleDateString()} · {upcomingAppointment.time}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <a 
                  href={upcomingAppointment.meeting_link || "https://meet.google.com/new"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 bg-primary text-white font-black py-3.5 rounded-2xl text-[0.7rem] uppercase tracking-widest hover:bg-primary-dark transition shadow-lg shadow-primary/20 active:scale-95 text-center flex items-center justify-center"
                >
                  Join Video Call
                </a>
                <button 
                  onClick={() => navigate('/doctors')}
                  className="flex-1 glass text-slate-600 font-black py-3.5 rounded-2xl text-[0.7rem] uppercase tracking-widest hover:bg-white transition active:scale-95 border-slate-200"
                >
                  Reschedule
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 text-center">
              <div className="text-4xl mb-4 opacity-20">📅</div>
              <div className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-2">No Upcoming Calls</div>
              <p className="text-xs text-slate-400 font-medium mb-6">Book a consultation with our expert doctors today.</p>
              <Link to="/doctors" className="inline-block bg-primary text-white font-black px-8 py-3 rounded-xl text-[0.65rem] uppercase tracking-widest hover:bg-primary-dark transition shadow-lg shadow-primary/20 active:scale-95">
                Book Appointment
              </Link>
            </div>
          )}
        </div>

        <div className="glass-card rounded-3xl p-8 border border-white/40">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-outfit font-black text-slate-800 text-xl">Recent Activity</h3>
            <button onClick={() => fetchTabData('orders')} className="text-[0.65rem] font-black text-primary uppercase tracking-widest hover:underline">View All →</button>
          </div>
          <div className="space-y-4">
            {[
              { item: 'Paracetamol + Vit D3', date: '17 Mar 2025', price: '₹145', status: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-600' },
              { item: 'Amoxicillin 250mg × 2', date: '10 Mar 2025', price: '₹170', status: 'In Transit', bg: 'bg-primary-pale', text: 'text-primary' }
            ].map((order, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl glass flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📦</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-slate-800 truncate">{order.item}</div>
                  <div className="text-[0.65rem] text-slate-500 font-bold uppercase tracking-wider">{order.date} · {order.price}</div>
                </div>
                <span className={`${order.bg} ${order.text} text-[0.55rem] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border border-current/10 shrink-0`}>{order.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === 'profile') {
      return (
        <div className="glass-card rounded-[2rem] p-10 border border-white/40 anim">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-outfit font-black text-slate-800 text-2xl">Profile Settings</h3>
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`px-6 py-2.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-slate-100 text-slate-600' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
            >
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </button>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">First Name</label>
                  <input 
                    type="text" 
                    value={editForm.first_name} 
                    disabled={!isEditing}
                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                    className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 transition-all font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Last Name</label>
                  <input 
                    type="text" 
                    value={editForm.last_name} 
                    disabled={!isEditing}
                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                    className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 transition-all font-bold text-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    value={editForm.phone} 
                    disabled={!isEditing}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 transition-all font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Blood Group</label>
                  <select 
                    value={editForm.blood_group} 
                    disabled={!isEditing}
                    onChange={(e) => setEditForm({...editForm, blood_group: e.target.value})}
                    className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 transition-all font-bold text-slate-700"
                  >
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Height (cm)</label>
                <input 
                  type="number" 
                  value={editForm.height_cm} 
                  disabled={!isEditing}
                  onChange={(e) => setEditForm({...editForm, height_cm: e.target.value})}
                  className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 transition-all font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Weight (kg)</label>
                <input 
                  type="number" 
                  value={editForm.weight_kg} 
                  disabled={!isEditing}
                  onChange={(e) => setEditForm({...editForm, weight_kg: e.target.value})}
                  className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 transition-all font-bold text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Home Address</label>
              <textarea 
                value={editForm.address} 
                disabled={!isEditing}
                rows="3"
                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 transition-all font-bold text-slate-700"
              ></textarea>
            </div>

            {isEditing && (
              <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-10 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest glass text-slate-600 hover:bg-slate-50 transition-all active:scale-95 border-slate-200"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  className="px-10 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      );
    }

    return (
      <div className="glass-card rounded-[2rem] p-10 border border-white/40 anim">
        <div className="flex items-center justify-between mb-10">
          <h3 className="font-outfit font-black text-slate-800 text-2xl capitalize">{activeTab}</h3>
          <button onClick={fetchDashboardData} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">🔄</button>
        </div>
        
        {loading ? (
          <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div></div>
        ) : dataList.length > 0 ? (
          <div className="grid gap-4">
            {dataList.map((item, i) => (
              <div key={i} className="p-6 bg-white/50 rounded-3xl border border-white/60 flex items-center justify-between hover:bg-white transition-all shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-3xl shadow-inner">
                    {activeTab === 'consultations' ? '👨‍⚕️' : 
                     activeTab === 'orders' ? '📦' : 
                     (item.report_type === 'eye' ? '👁️' : '🧠')}
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-800">
                      {activeTab === 'orders' ? (
                        item.items?.length > 0 
                          ? `${item.items[0].name}${item.items.length > 1 ? ` + ${item.items.length - 1} more` : ''}`
                          : `Order #${item.id?.slice(-6)}`
                      ) : (
                        item.doctor_name || 
                        (item.report_type === 'eye' ? item.predicted_class : (item.result?.conditions?.[0]?.name || 'Symptom Check'))
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {new Date(item.created_at).toLocaleDateString()} · 
                      {item.specialty || item.status || 
                       (item.report_type === 'eye' ? `${item.risk_level} Risk` : `${item.result?.risk_level || 'Medium'} Risk`)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewDetails(item)}
                    className="bg-primary-pale text-primary px-4 py-2.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-95"
                  >
                    View Details
                  </button>
                  {item.status === 'delivered' || item.payment_status === 'paid' ? (
                    <button 
                      onClick={() => handleDownloadReceipt(item)}
                      className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95 border border-emerald-100 flex items-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      Receipt
                    </button>
                  ) : activeTab !== 'reports' && item.payment_method !== 'cod' && (
                    <button 
                      onClick={() => { setSelectedItem(item); setIsPaymentModalOpen(true); }}
                      className="bg-amber-50 text-amber-600 px-4 py-2.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all active:scale-95 border border-amber-100"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="text-5xl mb-6 opacity-20">📂</div>
            <h4 className="text-lg font-black text-slate-400 uppercase tracking-[0.2em]">No Records Yet</h4>
            <p className="text-slate-400 text-sm mt-2 font-medium">Your {activeTab} will appear here once you start using the platform.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* =====================================================
          PRINT FIX: This style block ensures that when
          window.print() is called from a new print window,
          the content renders correctly. The main dashboard
          print path now uses a separate window approach
          (triggerPrint / triggerReceiptPrint) so this is
          a safety net only.
      ===================================================== */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body > * { visibility: hidden; }
          .printable-report,
          .printable-report *,
          .printable-receipt,
          .printable-receipt * { visibility: visible; }
          .printable-report,
          .printable-receipt {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 40px !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 shrink-0">
          <div className="glass rounded-[2.5rem] border border-white/40 p-8 sticky top-28 shadow-2xl shadow-slate-200/50">
            <div className="flex flex-col items-center py-8 mb-8 border-b border-slate-100">
              <div className="w-24 h-24 rounded-[2rem] hero-gradient flex items-center justify-center text-white text-4xl font-black mb-5 shadow-xl shadow-primary/30 relative">
                {userData?.first_name?.charAt(0)}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center text-[10px]">✓</div>
              </div>
              <div className="font-outfit font-black text-slate-800 text-2xl" style={{ fontWeight: 900 }}>{userData?.first_name} {userData?.last_name}</div>
              <div className="text-xs text-slate-400 font-black uppercase tracking-[0.15em] mt-1">{userData?.email}</div>
            </div>
            
            <nav className="space-y-2">
              {sidebarLinks.map(link => (
                <button 
                  key={link.id}
                  onClick={() => link.id === 'overview' ? setActiveTab('overview') : (link.id === 'profile' ? setActiveTab('profile') : fetchTabData(link.id))}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[0.8rem] font-black uppercase tracking-widest transition-all ${activeTab === link.id ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'text-slate-500 hover:bg-primary-pale hover:text-primary'}`}
                >
                  <span className="text-xl">{link.icon}</span>
                  {link.label}
                </button>
              ))}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[0.8rem] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <span className="text-xl">🚪</span>
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' ? renderOverview() : renderTabContent()}
        </main>

        {/* Item Details Modal */}
        {isModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative glass-card bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl anim max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center text-3xl shadow-lg">
                  {activeTab === 'orders' ? '📦' : activeTab === 'consultations' ? '👨‍⚕️' : '🤖'}
                </div>
                <div>
                  <h2 className="font-outfit font-black text-2xl text-slate-800" style={{ fontWeight: 900 }}>
                    {activeTab === 'orders' ? `Order Details #${selectedItem.id?.slice(-6)}` : 
                     activeTab === 'consultations' ? 'Consultation Record' : 'AI Diagnostic Report'}
                  </h2>
                  <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mt-1">
                    Reference ID: {selectedItem.id}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {activeTab === 'orders' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[0.6rem] text-slate-400 font-black uppercase tracking-widest mb-1">Status</div>
                        <div className="text-sm font-black text-primary uppercase">{selectedItem.status}</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[0.6rem] text-slate-400 font-black uppercase tracking-widest mb-1">Placed On</div>
                        <div className="text-sm font-black text-slate-800">{new Date(selectedItem.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mb-3">Order Items</div>
                      <div className="space-y-2">
                        {(selectedItem.items || []).map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg glass flex items-center justify-center text-lg">💊</div>
                              <div className="text-sm font-bold text-slate-700">{item.name}</div>
                            </div>
                            <div className="text-sm font-black text-slate-800">
                              {item.quantity} × ₹{item.unit_price || (selectedItem.total_amount / (item.quantity || 1))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-primary-pale/30 border border-primary/10 rounded-[1.5rem]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest">Payment Method</span>
                        <span className="text-sm font-black text-slate-800 uppercase">{selectedItem.payment_method}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.7rem] font-black text-slate-800 uppercase tracking-widest">Total Amount</span>
                        <span className="text-2xl font-black text-primary">₹{selectedItem.total_amount}</span>
                      </div>
                    </div>

                    {selectedItem.status === 'placed' && selectedItem.payment_method !== 'cod' && selectedItem.payment_status !== 'paid' && (
                      <button 
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[0.7rem] shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95 mt-4"
                      >
                        Complete Payment
                      </button>
                    )}
                  </>
                ) : activeTab === 'consultations' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[0.6rem] text-slate-400 font-black uppercase tracking-widest mb-1">Doctor</div>
                      <div className="text-base font-black text-slate-800">{selectedItem.doctor_name}</div>
                      <div className="text-xs text-primary font-bold">{selectedItem.specialty}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[0.6rem] text-slate-400 font-black uppercase tracking-widest mb-1">Schedule</div>
                      <div className="text-sm font-bold text-slate-700">{new Date(selectedItem.created_at).toLocaleString()}</div>
                    </div>
                    <div className="p-6 bg-white border border-slate-100 rounded-2xl">
                      <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mb-2">Notes / Status</div>
                      <div className="text-sm text-slate-600 leading-relaxed capitalize">{selectedItem.status}</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[0.6rem] text-slate-400 font-black uppercase tracking-widest mb-1">
                        {selectedItem.report_type === 'eye' ? 'Predicted Class' : 'Probable Condition'}
                      </div>
                      <div className="text-base font-black text-slate-800">
                        {selectedItem.report_type === 'eye' ? selectedItem.predicted_class : (selectedItem.result?.conditions?.[0]?.name || 'Symptom Check')}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[0.6rem] text-slate-400 font-black uppercase tracking-widest mb-1">Risk Assessment</div>
                      <div className="text-sm font-black text-rose-600 uppercase">
                        {selectedItem.report_type === 'eye' ? selectedItem.risk_level : (selectedItem.result?.risk_level || 'Medium')}
                      </div>
                    </div>
                    <div className="p-6 bg-white border border-slate-100 rounded-2xl">
                      <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mb-2">AI Summary & Advice</div>
                      <div className="text-sm text-slate-600 leading-relaxed">
                        {selectedItem.report_type === 'eye' ? selectedItem.advice : (selectedItem.result?.conditions?.[0]?.description || 'This diagnostic was generated by our AI. Please consult with a specialist for a definitive clinical diagnosis.')}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 flex gap-3">
                  <button 
                    onClick={() => handleDownloadReport(selectedItem)}
                    className="flex-1 glass text-slate-600 font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 border-slate-200"
                  >
                    Download Report
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
                  >
                    Close View
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Portal */}
        {isPaymentModalOpen && selectedItem && (
          <PaymentPortal 
            amount={selectedItem.total_amount || selectedItem.amount}
            type={activeTab === 'orders' ? 'order' : 'appointment'}
            referenceId={selectedItem.id}
            onSuccess={handlePaymentSuccess}
            onClose={() => setIsPaymentModalOpen(false)}
          />
        )}

        {/* Report Modal */}
        {isReportModalOpen && selectedReport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md no-print" onClick={() => setIsReportModalOpen(false)}></div>
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 no-print">
                <h3 className="font-outfit font-black text-xl text-slate-800">Print or Save Report</h3>
                <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 bg-white">
                <div className="border-2 border-slate-100 rounded-3xl p-8 printable-report shadow-sm bg-white">
                  <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                    <div>
                      <div className={`${selectedReport.report_type === 'eye' ? 'text-rose-600' : 'text-primary'} font-black text-2xl tracking-tighter mb-1`}>
                        MEDISPHERE AI
                      </div>
                      <div className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">
                        {selectedReport.report_type === 'eye' ? 'Eye Diagnostic Report' : 'Symptom Analysis Report'}
                      </div>
                    </div>
                    <div className="text-right text-[0.65rem] font-bold text-slate-500">
                      <div>Date: {new Date(selectedReport.created_at).toLocaleDateString()}</div>
                      <div>Ref: {selectedReport.report_type?.toUpperCase()}-{selectedReport.id?.slice(-6).toUpperCase()}</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2">Patient Name</div>
                        <div className="text-base font-black text-slate-800">
                          {userData?.first_name || 'Valued Patient'} {userData?.last_name || ''}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2">Contact Info</div>
                        <div className="text-[0.7rem] font-bold text-slate-600">
                          {userData?.email}
                          {userData?.phone && <div>{userData.phone}</div>}
                        </div>
                      </div>
                    </div>

                    {selectedReport.report_type !== 'eye' && selectedReport.symptoms && (
                      <div>
                        <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-3">Symptoms Analyzed</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedReport.symptoms.map((s, i) => (
                            <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[0.65rem] font-bold text-slate-600">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className={`text-[0.6rem] font-black uppercase tracking-widest ${selectedReport.report_type === 'eye' ? 'text-rose-600' : 'text-primary'} mb-3`}>
                        AI Analysis Findings
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`p-4 ${selectedReport.report_type === 'eye' ? 'bg-rose-50 border-rose-100' : 'bg-violet-50 border-violet-100'} border rounded-xl`}>
                            <div className={`text-[0.55rem] font-black uppercase tracking-widest ${selectedReport.report_type === 'eye' ? 'text-rose-400' : 'text-violet-400'} mb-1`}>
                              {selectedReport.report_type === 'eye' ? 'Primary Diagnosis' : 'Likely Condition'}
                            </div>
                            <div className="text-sm font-black text-slate-800">
                              {selectedReport.report_type === 'eye' ? selectedReport.predicted_class : (selectedReport.result?.conditions?.[0]?.name || 'Symptom Check')}
                            </div>
                          </div>
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-1">Risk Level</div>
                            <div className={`text-sm font-black uppercase ${selectedReport.report_type === 'eye' ? 'text-rose-600' : 'text-primary'}`}>
                              {selectedReport.report_type === 'eye' ? selectedReport.risk_level : (selectedReport.result?.risk_level || 'Medium')} Risk
                            </div>
                          </div>
                        </div>
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-2">Clinical Summary</div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {selectedReport.report_type === 'eye' ? selectedReport.advice : (selectedReport.result?.conditions?.[0]?.description || 'AI-generated analysis based on symptoms.')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedReport.report_type !== 'eye' && (
                      <div>
                        <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-3">Clinical Recommendations</div>
                        <ul className="space-y-2">
                          {(selectedReport.result?.recommendations || []).map((r, i) => (
                            <li key={i} className="flex gap-3 text-xs font-bold text-slate-600">
                              <span className="text-primary">•</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-6 mt-6 border-t border-slate-100 text-center">
                      <p className="text-[0.55rem] text-slate-400 leading-relaxed italic">
                        DISCLAIMER: This report is generated by Medisphere's AI models for informational purposes. 
                        It does not constitute a definitive medical diagnosis. Always consult a certified healthcare professional.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50 no-print">
                <button 
                  onClick={triggerPrint}
                  className={`flex-1 ${selectedReport.report_type === 'eye' ? 'bg-rose-600 shadow-rose-200' : 'bg-primary shadow-primary/20'} text-white font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
                  Print or Save as PDF
                </button>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md no-print" onClick={() => setIsReceiptModalOpen(false)}></div>
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 no-print">
                <h3 className="font-outfit font-black text-xl text-slate-800">Digital Receipt</h3>
                <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 bg-white">
                <div className="border-2 border-slate-100 rounded-3xl p-8 printable-receipt shadow-sm bg-white">
                  <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                    <div>
                      <div className="text-primary font-black text-2xl tracking-tighter mb-1">
                        MEDISPHERE ELITE
                      </div>
                      <div className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">
                        Official Payment Receipt
                      </div>
                    </div>
                    <div className="text-right text-[0.65rem] font-bold text-slate-500">
                      <div>Date: {new Date(selectedReceipt.created_at).toLocaleDateString()}</div>
                      <div>Order ID: {selectedReceipt.id?.slice(-8).toUpperCase()}</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2">Customer Details</div>
                        <div className="text-base font-black text-slate-800">
                          {userData?.first_name} {userData?.last_name}
                        </div>
                        <div className="text-[0.7rem] font-bold text-slate-500 mt-1">{userData?.email}</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2">Merchant Details</div>
                        <div className="text-sm font-black text-slate-800">Medisphere Elite Pharmacy</div>
                        <div className="text-[0.65rem] font-bold text-slate-500 mt-1">Healthcare Tower, Mumbai</div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Description</th>
                            <th className="px-6 py-4 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                            <th className="px-6 py-4 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(selectedReceipt.items || []).map((item, i) => (
                            <tr key={i}>
                              <td className="px-6 py-4 text-xs font-bold text-slate-700">{item.name}</td>
                              <td className="px-6 py-4 text-xs font-black text-slate-500 text-center">{item.quantity}</td>
                              <td className="px-6 py-4 text-xs font-black text-slate-800 text-right">₹{item.total_price || (item.unit_price * item.quantity) || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-4">
                      <div className="w-64 space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                          <span>Payment Status</span>
                          <span className="text-emerald-600">PAID</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                          <span>Method</span>
                          <span className="uppercase">{selectedReceipt.payment_method}</span>
                        </div>
                        <div className="pt-3 border-t-2 border-slate-100 flex justify-between">
                          <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Total Amount</span>
                          <span className="text-2xl font-black text-primary">₹{selectedReceipt.total_amount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 text-center">
                      <p className="text-[0.55rem] text-slate-400 leading-relaxed font-bold uppercase tracking-widest">
                        Thank you for choosing Medisphere Elite Pharmacy
                      </p>
                      <p className="text-[0.5rem] text-slate-300 mt-1 italic">This is a computer-generated receipt.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50 no-print">
                <button 
                  onClick={triggerReceiptPrint}
                  className="flex-1 bg-primary shadow-primary/20 text-white font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
                  Print or Save PDF
                </button>
                <button 
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserDashboard;