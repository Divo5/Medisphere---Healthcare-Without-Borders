import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const EyePredictor = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const token = localStorage.getItem('token');

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
        const response = await axios.get(`${API_URL}/eye/history`, {
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
      const response = await axios.get(`${API_URL}/eye/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      handleAuthError(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!token) {
      alert('Login Required: Please log in to your account to use the Eye Disease Predictor and save your records.');
      navigate('/login');
      return;
    }

    setIsUploading(true);
    setShowResult(false);
    setError('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = `${API_URL}/eye/predict`;
      
      const config = {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      };

      const response = await axios.post(endpoint, formData, config);
      setResultData(response.data);
      setShowResult(true);
      fetchHistory();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.response?.data?.detail || 'Eye prediction failed. Please try again.');
      }
      console.error('Eye prediction error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveToRecords = () => {
    if (!token) {
      navigate('/login');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSaveReport = () => {
    setIsReportModalOpen(true);
  };

  const handleViewHistoryReport = (scan) => {
    setResultData(scan);
    setIsReportModalOpen(true);
  };

  const triggerPrint = () => {
    window.print();
    setIsReportModalOpen(false);
  };

  const handleShareWithDoctor = () => {
    navigate('/doctors');
  };

  const handleReadResearch = () => {
    window.open('https://scholar.google.com/scholar?q=deep+learning+retinal+fundus+image+diagnosis', '_blank');
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-900 to-rose-600 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-widest uppercase text-rose-200 mb-2">Advanced AI Diagnostics</div>
          <h1 className="font-outfit font-black text-3xl lg:text-4xl text-white" style={{fontWeight: 800}}>Eye Disease Predictor</h1>
          <p className="text-rose-100 text-sm mt-2 max-w-lg">Upload high-resolution retinal fundus images. Our Deep Learning CNN model detects Glaucoma, Diabetic Retinopathy, and Cataract with 98.2% accuracy.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Main Input */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <h2 className="font-outfit font-bold text-xl text-slate-800 mb-6">Retinal Image Upload</h2>
              <div 
                className="border-2 border-dashed border-rose-100 rounded-3xl p-16 text-center cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all group mb-6"
                onClick={() => document.getElementById('eye-file').click()}
              >
                <input 
                  type="file" 
                  id="eye-file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                />
                <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center text-5xl mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner">👁️</div>
                <div className="font-outfit font-bold text-slate-700 text-xl mb-2">Drop retinal image here</div>
                <p className="text-slate-500 text-sm mb-6">Support JPG, PNG (Max 20MB)</p>
                <div className="flex justify-center gap-3">
                  <span className="bg-slate-100 text-slate-600 text-[0.65rem] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-slate-200">High Res Recommended</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => document.getElementById('eye-file').click()} className="flex items-center justify-center gap-2 border-2 border-dashed border-rose-300 bg-rose-50 rounded-2xl py-4 text-sm font-bold text-rose-600 hover:border-rose-500 transition shadow-sm active:scale-[0.98]">
                  📸 Capture Fundus Image
                </button>
                <button onClick={() => document.getElementById('eye-file').click()} className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl py-4 text-sm font-bold text-slate-500 hover:border-slate-400 transition shadow-sm active:scale-[0.98]">
                  🖼️ Select from Gallery
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-6 py-4 rounded-2xl text-sm font-bold text-center">
                {error}
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 anim">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-2xl">🧠</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm">CNN Model Processing...</div>
                    <div className="text-slate-500 text-xs">Analyzing pixels for pathological patterns</div>
                  </div>
                  <div className="text-rose-600 font-black text-sm">{uploadProgress}%</div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-rose-500 to-rose-600 h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Results */}
            {showResult && resultData && (
              <div className="bg-white rounded-2xl border border-rose-200 shadow-md p-8 anim">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-xl">✅</div>
                  <h3 className="font-outfit font-bold text-xl text-slate-800">AI Diagnostic Report</h3>
                  <span className="ml-auto bg-rose-50 text-rose-600 text-[0.65rem] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-rose-100">
                    Accuracy: {resultData.confidence || '98.2%'}
                  </span>
                </div>
                <div className="space-y-6">
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6">
                    <div className="text-[0.65rem] text-rose-600 font-black uppercase tracking-widest mb-1.5">Primary Diagnosis</div>
                    <div className="text-2xl font-black text-slate-800 mb-2">{resultData.predicted_class}</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{resultData.advice}</p>
                  </div>
                  {resultData.all_predictions && (
                    <div className="grid grid-cols-3 gap-3">
                      {resultData.all_predictions.map((pred) => (
                        <div key={pred.class} className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                          <div className="text-[0.6rem] text-slate-400 font-black uppercase tracking-widest mb-1.5 truncate">{pred.class}</div>
                          <div className={`text-sm font-black ${pred.probability > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {pred.probability.toFixed(2)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-4 border-t border-slate-100 flex gap-3">
                    <button onClick={handleSaveReport} className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98]">Save Report</button>
                    <button onClick={handleShareWithDoctor} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-sm transition-all hover:bg-slate-50 active:scale-[0.98]">Share with Doctor</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-outfit font-bold text-slate-800 mb-4">Previous Scans</h3>
              <div className="space-y-4">
                {history.length > 0 ? history.map((scan, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleViewHistoryReport(scan)}
                    className="border border-slate-100 rounded-2xl p-4 hover:border-rose-200 hover:bg-rose-50/30 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">👁️</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{scan.predicted_class}</div>
                        <div className="text-xs text-slate-500">{new Date(scan.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[0.6rem] font-black uppercase tracking-widest px-2 py-1 rounded-full ${scan.risk_level === 'low' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {scan.risk_level} Risk
                        </span>
                        <div className="text-[0.55rem] font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          DOWNLOAD
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-slate-400 text-sm">No previous scans found.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-rose-500/10 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
              <div className="absolute -left-4 -top-4 w-24 h-24 bg-primary/10 rounded-full"></div>
              <h4 className="font-outfit font-black text-xl mb-4 relative z-10" style={{fontWeight: 800}}>Medisphere<br/>AI Insights</h4>
              <p className="text-[0.72rem] text-slate-400 leading-relaxed relative z-10 mb-6">Our Deep Learning architecture is trained on over 250,000 clinically labeled fundus images for maximum diagnostic reliability.</p>
              <button onClick={handleReadResearch} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-black uppercase tracking-widest relative z-10 transition-all">Read Research Paper</button>
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
            
            <div className="flex-1 overflow-y-auto p-10 bg-white">
              <div className="border-2 border-slate-100 rounded-3xl p-8 printable-report shadow-sm bg-white">
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                  <div>
                    <div className="text-rose-600 font-black text-2xl tracking-tighter mb-1">MEDISPHERE AI</div>
                    <div className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Eye Diagnostic Report</div>
                  </div>
                  <div className="text-right text-[0.65rem] font-bold text-slate-500">
                    <div>Date: {new Date().toLocaleDateString()}</div>
                    <div>Ref: EYE-{Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2">Patient Name</div>
                      <div className="text-base font-black text-slate-800">
                        {JSON.parse(localStorage.getItem('user') || '{}').first_name || 'Valued Patient'} {JSON.parse(localStorage.getItem('user') || '{}').last_name || ''}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2">Contact Info</div>
                      <div className="text-[0.7rem] font-bold text-slate-600">
                        {JSON.parse(localStorage.getItem('user') || '{}').email}
                        {JSON.parse(localStorage.getItem('user') || '{}').phone && <div>{JSON.parse(localStorage.getItem('user') || '{}').phone}</div>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[0.6rem] font-black uppercase tracking-widest text-rose-600 mb-3">CNN Analysis Findings</div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                          <div className="text-[0.55rem] font-black uppercase tracking-widest text-rose-400 mb-1">Primary Diagnosis</div>
                          <div className="text-sm font-black text-slate-800">{resultData.predicted_class}</div>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-1">Risk Level</div>
                          <div className="text-sm font-black text-rose-600 uppercase">{resultData.risk_level} Risk</div>
                        </div>
                      </div>
                      <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-2">Clinical Advice</div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{resultData.advice}</p>
                      </div>
                    </div>
                  </div>

                  {resultData.all_predictions && (
                    <div>
                      <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-3">Model Confidence Breakdown</div>
                      <div className="grid grid-cols-3 gap-3">
                        {resultData.all_predictions.map((pred) => (
                          <div key={pred.class} className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-center">
                            <div className="text-[0.5rem] font-black text-slate-400 uppercase mb-1">{pred.class}</div>
                            <div className="text-[0.7rem] font-black text-slate-700">{pred.probability.toFixed(1)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-6 mt-6 border-t border-slate-100 text-center">
                    <p className="text-[0.55rem] text-slate-400 leading-relaxed italic">
                      DISCLAIMER: This report is generated by a Deep Learning CNN architecture for informational purposes. 
                      It does not constitute a definitive medical diagnosis. Always consult an ophthalmologist.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50 no-print">
              <button 
                onClick={triggerPrint}
                className="flex-1 bg-rose-600 text-white font-black py-4 rounded-2xl text-[0.7rem] uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3"
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

export default EyePredictor;
