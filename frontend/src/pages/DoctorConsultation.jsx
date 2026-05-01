import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import PaymentPortal from '../components/PaymentPortal';

const DoctorConsultation = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All Specialists');
  const [loading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingData, setBookingForm] = useState({
    date: '',
    slot: '10:30 AM',
    mode: 'video',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [isPaymentPortalOpen, setIsPaymentPortalOpen] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoading(true);
      try {
        const params = {};
        if (selectedCategory !== 'All Specialists') params.specialty = selectedCategory;
        const response = await axios.get(`${API_URL}/doctors/`, { params });
        const data = response.data.data || response.data;
        setDoctors(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setDoctors([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, [selectedCategory]);

  const handleBook = (doctor) => {
    if (!token) {
      alert('Please login to book a consultation.');
      navigate('/login');
      return;
    }
    setSelectedDoc(doctor);
    setIsBookingOpen(true);
  };

  const confirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingData.date) {
      alert('Please select a preferred date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        doctor_id: selectedDoc.id,
        date: bookingData.date,
        slot: bookingData.slot,
        mode: bookingData.mode,
        reason: bookingData.reason
      };

      const res = await axios.post(`${API_URL}/doctors/book`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const appointmentId = res.data.appointment_id || res.data.id;
      
      // Close booking modal and open payment portal
      setIsBookingOpen(false);
      setCurrentAppointmentId(appointmentId);
      setIsPaymentPortalOpen(true);
      
    } catch (error) {
      console.error('Booking error:', error);
      const msg = error.response?.data?.detail || error.message || 'Failed to book appointment. Please try again.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (transactionId) => {
    alert('Appointment booked and payment successful! Our team will contact you for confirmation.');
    setBookingForm({ date: '', slot: '10:30 AM', mode: 'video', reason: '' });
    setIsPaymentPortalOpen(false);
    setCurrentAppointmentId(null);
    navigate('/dashboard');
  };

  return (
    <div className="flex-1 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="font-outfit font-black text-4xl text-slate-900 mb-4" style={{ fontWeight: 900 }}>Elite Medical Specialists</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Book video consultations with top-rated doctors</p>
        </div>

        {/* Filter Section */}
        <div className="glass p-6 rounded-3xl border border-white/40 mb-12 flex flex-wrap gap-4 items-center justify-center">
          {['All Specialists', 'Cardiologist', 'Neurologist', 'Dermatologist', 'Pediatrician', 'General Physician'].map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'glass text-slate-500 hover:text-primary hover:bg-white border-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {doctors.map((doc, i) => (
              <div key={i} className="glass-card rounded-[2.5rem] p-8 border-white/60 group">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-20 h-20 rounded-[1.5rem] glass flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                    {doc.gender === 'Female' ? '👩‍⚕️' : '👨‍⚕️'}
                  </div>
                  <div>
                    <h3 className="font-outfit font-black text-xl text-slate-800">{doc.name}</h3>
                    <div className="text-[0.6rem] font-black uppercase tracking-widest text-primary mb-1">{doc.specialty}</div>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      ★ 4.9 <span className="text-slate-400 font-medium ml-1">(120+ reviews)</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-2">📍 {doc.location || 'Mumbai, India'}</span>
                    <span className="flex items-center gap-2">🕒 10 AM - 5 PM</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-2">🎓 {doc.qualification || 'MBBS, MD'}</span>
                    <span className="flex items-center gap-2 text-emerald-600">Available Today</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-4 border-y border-slate-100 mb-8">
                  <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Consultation Fee</div>
                  <div className="text-2xl font-black text-slate-800">₹{doc.consultation_fee || doc.fee || '800'}</div>
                </div>

                <button 
                  onClick={() => handleBook(doc)}
                  className="w-full bg-primary text-white font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98]"
                >
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {isBookingOpen && selectedDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBookingOpen(false)}></div>
          <div className="relative glass-card bg-white rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl anim">
            <button onClick={() => setIsBookingOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            
            <h2 className="font-outfit font-black text-3xl text-slate-800 mb-8" style={{fontWeight: 900}}>Book Specialist</h2>
            
            <div className="flex items-center gap-4 p-4 bg-primary-pale/30 border border-primary/10 rounded-2xl mb-8">
              <div className="w-16 h-16 rounded-xl glass flex items-center justify-center text-3xl shadow-inner">
                {selectedDoc.gender === 'Female' ? '👩‍⚕️' : '👨‍⚕️'}
              </div>
              <div className="flex-1">
                <div className="text-lg font-black text-slate-800">{selectedDoc.name}</div>
                <div className="text-[0.65rem] text-primary font-black uppercase tracking-widest">{selectedDoc.specialty} · Fee: ₹{selectedDoc.consultation_fee || selectedDoc.fee}</div>
              </div>
            </div>

            <form onSubmit={confirmBooking} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Consultation Date</label>
                  <input 
                    type="date" 
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingData.date}
                    onChange={(e) => setBookingForm({...bookingData, date: e.target.value})}
                    className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Available Slot</label>
                  <select 
                    value={bookingData.slot}
                    onChange={(e) => setBookingForm({...bookingData, slot: e.target.value})}
                    className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700 text-sm"
                  >
                    {['10:30 AM', '11:30 AM', '02:00 PM', '04:00 PM', '05:30 PM'].map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Consultation Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'video', label: 'Video Call', icon: '📹' },
                    { id: 'chat', label: 'Live Chat', icon: '💬' },
                    { id: 'in_clinic', label: 'In Clinic', icon: '🏥' }
                  ].map(m => (
                    <button 
                      key={m.id}
                      type="button"
                      onClick={() => setBookingForm({...bookingData, mode: m.id})}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${bookingData.mode === m.id ? 'bg-primary-pale border-primary text-primary' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-[0.55rem] font-black uppercase tracking-widest">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Reason for Visit (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Regular checkup, headache, fever..."
                  value={bookingData.reason}
                  onChange={(e) => setBookingForm({...bookingData, reason: e.target.value})}
                  className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-3">Payment Method</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {['demo', 'razorpay', 'upi', 'card'].map(id => (
                    <button 
                      key={id} type="button" onClick={() => setPaymentMethod(id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${paymentMethod === id ? 'bg-primary-pale border-primary text-primary' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <span className="text-xl">{id === 'demo' ? '🚀' : id === 'razorpay' ? '💳' : id === 'upi' ? '⚡' : '💳'}</span>
                      <span className="text-[0.5rem] font-black uppercase tracking-widest">{id === 'razorpay' ? 'Razorpay' : id === 'demo' ? 'Demo' : id.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Consultation Fee</div>
                  <div className="text-3xl font-black text-slate-800">₹{selectedDoc.consultation_fee || selectedDoc.fee}</div>
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[0.7rem] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Portal */}
      {isPaymentPortalOpen && (
        <PaymentPortal 
          amount={selectedDoc?.consultation_fee || selectedDoc?.fee || 800}
          type="appointment"
          referenceId={currentAppointmentId}
          onSuccess={handlePaymentSuccess}
          onClose={() => setIsPaymentPortalOpen(false)}
          initialMethod={paymentMethod}
        />
      )}
    </div>
  );
};

export default DoctorConsultation;
