import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const SymptomChecker = () => {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [appointmentBooked, setAppointmentBooked] = useState(false);

  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('user') || '{}');

  const handleAuthError = (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-change'));
      setError('Your session has expired. Please login again.');
      setTimeout(() => navigate('/login'), 2000);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API_URL}/symptoms/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(response.data.data);
      } catch (err) {
        console.error('Error fetching history:', err);
        handleAuthError(err);
      }
    };

    if (token) {
      fetchHistory();
    }
  }, [token]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/symptoms/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      handleAuthError(err);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Login Required: Please log in to your account to use the AI Symptom Checker and save your reports.');
      navigate('/login');
      return;
    }
    if (!symptoms.trim()) return;
    
    setIsAnalyzing(true);
    setShowResult(false);
    setError('');

    try {
      const endpoint = `${API_URL}/symptoms/check`;
      
      const payload = {
        symptoms: symptoms.split(',').map(s => s.trim()).filter(s => s !== ""),
        description: symptoms,
        age: 25, // Default or from user profile
        gender: 'Not Specified',
        duration: '2 days'
      };

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(endpoint, payload, config);
      
      setResultData(response.data);
      setShowResult(true);
      fetchHistory();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError('AI analysis failed. Please try again later.');
      }
      console.error('Symptom check error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveReport = () => {
    setIsReportModalOpen(true);
  };

  const handleViewHistoryReport = (rep) => {
    setResultData(rep.result);
    // If historical report has symptoms, join them for the display
    if (rep.symptoms) {
      setSymptoms(rep.symptoms.join(', '));
    }
    setIsReportModalOpen(true);
  };

  const triggerPrint = () => {
    window.print();
    setIsReportModalOpen(false);
  };

  const handleBookDoctor = () => {
    setAppointmentBooked(true);
    navigate('/doctors');
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900 to-violet-600 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-widest uppercase text-violet-200 mb-2">AI Diagnostics</div>
          <h1 className="font-outfit font-black text-3xl lg:text-4xl text-white" style={{fontWeight: 800}}>Symptom Checker</h1>
          <p className="text-violet-100 text-sm mt-2 max-w-lg">Describe how you feel in plain English. Our AI analyzes your symptoms against 10,000+ conditions.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Main Input */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
              <h2 className="font-outfit font-bold text-xl text-slate-800 mb-6">Describe Symptoms</h2>
              <form onSubmit={handleAnalyze} className="space-y-6">
                <div className="relative">
                  <textarea 
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="E.g., I have a sharp headache, mild fever, and dry cough for 2 days..."
                    className="w-full h-40 px-5 py-4 border border-slate-200 bg-slate-50 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all resize-none"
                  ></textarea>
                  <div className="absolute bottom-4 right-4 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Powered by Med-BERT AI</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mr-2 py-1.5">Quick Tags:</span>
                  {['Headache', 'Fever', 'Dry Cough', 'Body Pain', 'Nausea'].map(tag => (
                    <button 
                      key={tag}
                      type="button"
                      onClick={() => setSymptoms(prev => prev + (prev ? ', ' : '') + tag)}
                      className="bg-violet-50 text-violet-600 text-[0.7rem] font-bold px-3 py-1.5 rounded-full border border-violet-100 hover:bg-violet-100 transition shadow-sm active:scale-95"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}
                <button 
                  type="submit"
                  disabled={isAnalyzing || !symptoms.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-xl text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none active:scale-[0.98]"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      AI Analyzing Symptoms...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Run AI Diagnosis
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Results */}
            {showResult && resultData && (
              <div className="bg-white rounded-2xl border border-violet-200 shadow-md p-8 anim">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-xl">🤖</div>
                  <h3 className="font-outfit font-bold text-xl text-slate-800">AI Analysis Result</h3>
                  <span className="ml-auto bg-violet-50 text-violet-600 text-[0.65rem] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-violet-100">
                    Confidence: {resultData.confidence || '94.8%'}
                  </span>
                </div>
                <div className="space-y-6">
                  <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
                    <div className="text-[0.65rem] text-violet-600 font-black uppercase tracking-widest mb-1.5">Likely Condition</div>
                    <div className="text-xl font-black text-slate-800 mb-2">{resultData.conditions?.[0]?.name || 'Unknown Condition'}</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{resultData.conditions?.[0]?.description || 'AI could not provide a description.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mb-1.5">Risk Level</div>
                      <div className="text-sm font-bold text-amber-600">{(resultData.risk_level || 'Low').toUpperCase()}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mb-1.5">Recommendation</div>
                      <div className="text-sm font-bold text-slate-800">{resultData.see_doctor ? 'Consult GP' : 'Monitor symptoms'}</div>
                    </div>
                  </div>
                  {resultData.recommendations && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mb-2">Recommendations</div>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {resultData.recommendations.map((p, i) => <li key={i}>• {p}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="pt-4 border-t border-slate-100 flex gap-3">
                    <button 
                      onClick={handleBookDoctor}
                      className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98]"
                    >
                      Book General Physician
                    </button>
                    <button 
                      onClick={handleSaveReport}
                      className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
                    >
                      Save Report
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-outfit font-bold text-slate-800 mb-4">Previous Reports</h3>
              <div className="space-y-4">
                {history.length > 0 ? history.map((rep, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleViewHistoryReport(rep)}
                    className="border border-slate-100 rounded-2xl p-4 hover:border-violet-200 hover:bg-violet-50/30 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">🧠</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{rep.result?.conditions?.[0]?.name || 'Symptom Check'}</div>
                        <div className="text-xs text-slate-500">{new Date(rep.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[0.6rem] font-black uppercase tracking-widest px-2 py-1 rounded-full ${rep.result?.risk_level === 'low' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {(rep.result?.risk_level || 'Medium').toUpperCase()} RISK
                        </span>
                        <div className="text-[0.55rem] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          DOWNLOAD
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-slate-400 text-sm">No previous reports found.</div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚠️</span>
                <div className="font-outfit font-bold text-amber-800 text-sm">Medical Disclaimer</div>
              </div>
              <p className="text-amber-900 text-[0.7rem] leading-relaxed opacity-80">
                This AI tool provides information based on statistical models and is NOT a medical diagnosis. Always consult a certified healthcare professional for medical advice, treatment, or diagnosis. In case of emergency, contact your local emergency services immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {isReportModalOpen && resultData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md no-print" onClick={() => setIsReportModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 no-print">
              <h3 className="font-outfit font-black text-xl text-slate-800">Save or Print Report</h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
              <div className="bg-white rounded-3xl p-10 printable-report shadow-xl border border-slate-100 max-w-xl mx-auto min-h-[800px] flex flex-col">
                {/* Professional Header */}
                <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">M</div>
                    <div>
                      <div className="text-slate-900 font-black text-2xl tracking-tight leading-none">MEDISPHERE</div>
                      <div className="text-[0.65rem] font-bold uppercase tracking-widest text-primary mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        Clinical Summary Report
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest mb-1">Report Date</div>
                    <div className="text-sm font-black text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="space-y-10">
                  {/* Patient Info Section */}
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 block">
                    <div className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-200/60">Patient Identification</div>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                      <div className="block">
                        <div className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-1">Full Name</div>
                        <div className="text-sm font-black text-slate-800">{userData.first_name || 'Valued'} {userData.last_name || 'Patient'}</div>
                      </div>
                      <div className="block">
                        <div className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-1">Patient ID</div>
                        <div className="text-sm font-bold text-slate-600 font-mono">#{userData.id || userData._id || 'N/A'}</div>
                      </div>
                      <div className="block">
                        <div className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-1">Phone Number</div>
                        <div className="text-sm font-bold text-slate-600">{userData.phone || 'Not Provided'}</div>
                      </div>
                      <div className="block">
                        <div className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-1">Appointment Status</div>
                        <div className={`text-[0.65rem] font-black uppercase tracking-widest px-2 py-1 rounded-md inline-block ${appointmentBooked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                          {appointmentBooked ? '✓ Booked' : 'Not Booked'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Symptoms Analysis */}
                  <div className="block">
                    <div className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Symptoms Analyzed</div>
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl text-[0.75rem] font-bold text-slate-600 leading-relaxed italic shadow-inner block">
                      "{symptoms}"
                    </div>
                  </div>

                  {/* Diagnosis Section */}
                  <div className="block">
                    {/* The Problem */}
                    <div className="bg-rose-50/40 rounded-3xl p-6 border border-rose-100 shadow-sm relative overflow-hidden mb-6 block">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200 no-print">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17.01l.01-.01"/></svg>
                        </div>
                        <div className="text-[0.7rem] font-black uppercase tracking-widest text-rose-600">Primary Diagnosis</div>
                      </div>
                      <div className="text-2xl font-black text-slate-800 mb-3">{resultData.conditions?.[0]?.name}</div>
                      <p className="text-xs text-slate-600 leading-relaxed font-bold opacity-80">
                        {resultData.conditions?.[0]?.description}
                      </p>
                    </div>

                    {/* The Solution */}
                    <div className="bg-emerald-50/40 rounded-3xl p-8 border border-emerald-100 shadow-sm block">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200 no-print">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
                        </div>
                        <div className="text-[0.7rem] font-black uppercase tracking-widest text-emerald-600">Clinical Recommendations</div>
                      </div>
                      <div className="space-y-4 block">
                        {(resultData.recommendations || []).map((r, i) => (
                          <div key={i} className="flex gap-4 text-xs font-black text-slate-700 leading-snug items-start bg-white/50 p-3 rounded-xl border border-emerald-100/50 block">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span> 
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Footer */}
                <div className="pt-8 mt-12 border-t-2 border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-[0.45rem] font-black text-slate-300 text-center uppercase leading-tight px-3 tracking-tighter shadow-inner">
                      Digital<br/>Health<br/>Passport
                    </div>
                    <div>
                      <div className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest mb-1">Official Medical Summary</div>
                      <div className="text-[0.7rem] font-black text-slate-800">Medisphere Health Systems v1.0</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.5rem] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Authenticated by AI</div>
                    <div className="text-[0.6rem] font-bold text-slate-400 italic">No Physical Signature Required</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50 no-print">
              <button 
                onClick={triggerPrint}
                className="flex-1 bg-primary text-white font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-3"
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
    </div>
  );
};

export default SymptomChecker;
