import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const PrescriptionUpload = () => {
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [myRecords, setMyRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [filePreview, setFilePreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState('choice'); // 'choice' or 'selection'
  const [availableMeds, setAvailableMeds] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const getAuthToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to continue.');
      navigate('/login');
      return null;
    }
    return token;
  };

  const formatFileUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    // For local storage relative paths (e.g., /storage/...)
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${url}`;
  };

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

  const fetchMyRecords = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setIsLoadingRecords(true);
    try {
      const response = await axios.get(`${API_URL}/prescriptions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyRecords(response.data.data || []);
    } catch (err) {
      console.error('Error fetching records:', err);
      handleAuthError(err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleEditResult = (field, value, index = null, subfield = null) => {
    const newData = { ...resultData };
    if (index !== null && subfield !== null) {
      newData.ocr_result.medicines[index][subfield] = value;
    } else {
      newData.ocr_result[field] = value;
    }
    setResultData(newData);
  };

  const addMedicine = () => {
    const newData = { ...resultData };
    if (!newData.ocr_result.medicines) newData.ocr_result.medicines = [];
    newData.ocr_result.medicines.push({ name: '', dosage: '', form: 'tablet', instructions: '' });
    setResultData(newData);
  };

  const removeMedicine = (index) => {
    const newData = { ...resultData };
    newData.ocr_result.medicines.splice(index, 1);
    setResultData(newData);
  };

  const handleSaveToRecords = async () => {
    if (!resultData?.prescription_id) return;
    
    const token = getAuthToken();
    if (!token) return;

    setIsUploading(true);
    try {
      await axios.put(`${API_URL}/prescriptions/${resultData.prescription_id}/verify`, 
        {
          doctor_name: resultData.ocr_result.doctor_name,
          date: resultData.ocr_result.date,
          medicines: resultData.ocr_result.medicines
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowResult(false);
      setFilePreview(null);
      setIsEditing(false);
      fetchMyRecords(); // Refresh list
    } catch (err) {
      if (!handleAuthError(err)) {
        setError('Failed to save records. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    
    const token = getAuthToken();
    if (!token) return;

    try {
      await axios.delete(`${API_URL}/prescriptions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMyRecords();
      if (resultData?.prescription_id === id) {
        setShowResult(false);
        setResultData(null);
      }
    } catch (err) {
      if (!handleAuthError(err)) {
        alert('Failed to delete record');
      }
    }
  };

  const handleViewRecord = (rx) => {
    setResultData({
      prescription_id: rx.id,
      ocr_result: {
        doctor_name: rx.doctor_name,
        date: rx.prescription_date,
        medicines: rx.medicines,
        confidence: rx.ocr_confidence || 1.0,
        is_demo: false
      }
    });
    setFileName(rx.file_name || 'prescription.jpg');
    setFilePreview(formatFileUrl(rx.file_url));
    setShowResult(true);
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const simulateUpload = (name) => {
    setIsUploading(true);
    setShowResult(false);
    setFileName(name || 'prescription_captured.jpg');
    // Use a placeholder for simulated uploads
    setFilePreview('https://img.freepik.com/free-vector/hand-drawn-medical-prescription-template_23-2149097725.jpg');
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          setShowResult(true);
          // Set some dummy data for simulation
          setResultData({
            ocr_result: {
              doctor_name: "Dr. Priya Sharma",
              date: "15 Jan 2025",
              confidence: 0.98,
              medicines: [
                { name: "Paracetamol 500mg", dosage: "3 times daily · 5 days" },
                { name: "Vitamin D3 1000 IU", dosage: "Once daily · 30 days" }
              ]
            }
          });
        }, 400);
      }
      setUploadProgress(Math.round(Math.min(p, 100)));
    }, 200);
  };

  const handleFileUpload = async (file) => {
    const token = getAuthToken();
    if (!token) return;
    
    setIsUploading(true);
    setShowResult(false);
    setFileName(file.name);
    setError('');
    setUploadProgress(10);

    // Create a local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(30);
      const response = await axios.post(`${API_URL}/prescriptions/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.max(30, percentCompleted));
        }
      });

      setResultData(response.data);
      if (response.data.file_url) {
        setFilePreview(formatFileUrl(response.data.file_url));
      }
      setShowResult(true);
      fetchMyRecords(); // Refresh sidebar
    } catch (err) {
      console.error('Upload error:', err);
      if (!handleAuthError(err)) {
        setError(err.response?.data?.detail || 'Failed to process prescription. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0]);
  };

  const handleBuyClick = (medicines) => {
    if (!medicines || medicines.length === 0) {
      alert("No medicines found in this prescription.");
      return;
    }
    
    // Normalize medicines to objects if they are strings
    const normalized = medicines.map(m => typeof m === 'string' ? { name: m } : m);
    setAvailableMeds(normalized);
    
    // Default all selected
    const initialSelected = {};
    normalized.forEach((_, i) => initialSelected[i] = true);
    setSelectedMeds(initialSelected);
    
    setPurchaseStep('choice');
    setIsPurchaseModalOpen(true);
  };

  const processAddToCart = async (toAdd) => {
    setIsAddingToCart(true);
    try {
      const currentCart = JSON.parse(localStorage.getItem('medisphere_cart') || '[]');
      let addedCount = 0;
      let notFound = [];

      for (const med of toAdd) {
        try {
          // Search for the medicine in our store
          const response = await axios.get(`${API_URL}/medicines/?search=${encodeURIComponent(med.name)}`);
          const results = response.data.data || [];
          
          if (results.length > 0) {
            // Find best match or use first
            const matchedMed = results[0];
            
            // Check if already in cart
            const existingIdx = currentCart.findIndex(item => item.id === matchedMed.id);
            if (existingIdx > -1) {
              currentCart[existingIdx].quantity += 1;
            } else {
              currentCart.push({ ...matchedMed, quantity: 1 });
            }
            addedCount++;
          } else {
            notFound.push(med.name);
          }
        } catch (err) {
          console.error(`Error finding medicine ${med.name}:`, err);
          notFound.push(med.name);
        }
      }

      localStorage.setItem('medisphere_cart', JSON.stringify(currentCart));
      
      if (addedCount > 0) {
        alert(`Successfully added ${addedCount} medicine(s) to your cart! ${notFound.length > 0 ? `\n\nCould not find: ${notFound.join(', ')}` : ''}`);
        setIsPurchaseModalOpen(false);
      } else if (notFound.length > 0) {
        alert(`Could not find these medicines in our store: ${notFound.join(', ')}`);
      }
    } catch (err) {
      console.error("Cart processing error:", err);
      alert("Failed to add items to cart.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyAll = () => {
    processAddToCart(availableMeds);
  };

  const handleBuySelected = () => {
    const toAdd = availableMeds.filter((_, i) => selectedMeds[i]);
    if (toAdd.length === 0) {
      alert("Please select at least one medicine.");
      return;
    }
    processAddToCart(toAdd);
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary-dark to-secondary py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-widest uppercase text-green-200 mb-2">Healthcare Records</div>
          <h1 className="font-outfit font-black text-3xl lg:text-4xl text-white" style={{fontWeight: 800}}>Upload Prescription</h1>
          <p className="text-green-100 text-sm mt-2 max-w-lg">Securely digitize your physical prescriptions. OCR extracts medicine details automatically for easy ordering.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-3 space-y-6">
            {!showResult && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                <h2 className="font-outfit font-bold text-xl text-slate-800 mb-6">New Upload</h2>
                <div 
                  className="border-2 border-dashed border-sky-100 rounded-2xl p-12 text-center cursor-pointer hover:border-primary-light hover:bg-primary-pale transition-all group"
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <input 
                    type="file" 
                    id="file-input" 
                    className="hidden" 
                    accept="image/*,.pdf" 
                    onChange={handleFileChange}
                  />
                  <div className="w-20 h-20 rounded-2xl bg-secondary-pale flex items-center justify-center text-4xl mx-auto mb-6 group-hover:scale-110 transition-transform">📋</div>
                  <div className="font-outfit font-bold text-slate-700 text-lg mb-2">Drop your prescription here</div>
                  <p className="text-slate-500 text-sm mb-6">or click to browse your local files</p>
                  <div className="flex justify-center gap-3">
                    <span className="bg-slate-100 text-slate-600 text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">JPG / PNG</span>
                    <span className="bg-slate-100 text-slate-600 text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">PDF</span>
                    <span className="bg-slate-100 text-slate-600 text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">Max 10 MB</span>
                  </div>
                </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <button onClick={() => document.getElementById('file-input').click()} className="flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 bg-primary-pale rounded-xl py-4 text-sm font-bold text-primary hover:border-primary transition shadow-sm active:scale-[0.98]">
                  📷 Use Camera
                </button>
                <button onClick={() => document.getElementById('file-input').click()} className="flex items-center justify-center gap-2 border-2 border-dashed border-secondary/30 bg-secondary-pale rounded-xl py-4 text-sm font-bold text-secondary hover:border-secondary transition shadow-sm active:scale-[0.98]">
                  🖼️ From Gallery
                </button>
              </div>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 anim">
                <div className="flex items-center gap-4 mb-4">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-secondary-pale flex items-center justify-center text-2xl">📄</div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm">{fileName}</div>
                    <div className="text-slate-500 text-xs">Processing image with AI OCR...</div>
                  </div>
                  <div className="text-secondary font-black text-sm">{uploadProgress}%</div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-secondary to-secondary-light h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* OCR Results */}
            {showResult && resultData && (
              <div className="bg-white rounded-2xl border border-secondary/20 shadow-md p-0 overflow-hidden anim">
                <div className="flex flex-col md:flex-row">
                  {/* File Preview in Result */}
                  <div className="md:w-1/3 bg-slate-100 relative min-h-[200px] flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
                    {filePreview ? (
                      <img src={filePreview} alt="Prescription" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-slate-400 text-4xl">📄</div>
                    )}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[0.6rem] font-black uppercase text-slate-500 shadow-sm">Uploaded File</div>
                  </div>

                  <div className="md:w-2/3 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-secondary-pale flex items-center justify-center text-xl shadow-inner">✅</div>
                      <div>
                        <h3 className="font-outfit font-bold text-xl text-slate-800">Review Prescription Details</h3>
                        <div className="text-[0.6rem] font-bold text-slate-400 mt-1 uppercase tracking-widest">Verify and edit details before saving</div>
                      </div>
                      <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`ml-auto px-4 py-1.5 rounded-full text-[0.65rem] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {isEditing ? '✓ Done Editing' : '✎ Edit Details'}
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mb-1">Doctor Name</div>
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={resultData.ocr_result?.doctor_name} 
                              onChange={(e) => handleEditResult('doctor_name', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary"
                            />
                          ) : (
                            <div className="text-sm font-bold text-slate-800">{resultData.ocr_result?.doctor_name || 'Not detected'}</div>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest mb-1">Issue Date</div>
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={resultData.ocr_result?.date} 
                              onChange={(e) => handleEditResult('date', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary"
                            />
                          ) : (
                            <div className="text-sm font-bold text-slate-800">{resultData.ocr_result?.date || 'Not detected'}</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[0.65rem] text-slate-400 font-black uppercase tracking-widest">Medicines Detected</div>
                          {isEditing && (
                            <button onClick={addMedicine} className="text-[0.6rem] font-black text-primary uppercase tracking-widest hover:underline">+ Add Medicine</button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {(resultData.ocr_result?.medicines || []).length > 0 ? resultData.ocr_result.medicines.map((med, i) => (
                            <div key={i} className="flex items-center gap-4 bg-primary-pale/50 rounded-xl px-4 py-3 border border-primary/10 group relative">
                              <span className="text-2xl group-hover:scale-110 transition-transform">💊</span>
                              <div className="flex-1">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input 
                                      type="text" 
                                      value={typeof med === 'string' ? med : med.name} 
                                      placeholder="Medicine Name"
                                      onChange={(e) => handleEditResult('medicines', e.target.value, i, 'name')}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary"
                                    />
                                    <input 
                                      type="text" 
                                      value={typeof med === 'string' ? '' : med.dosage} 
                                      placeholder="Dosage (e.g. 1 tab TID)"
                                      onChange={(e) => handleEditResult('medicines', e.target.value, i, 'dosage')}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-500 focus:outline-none focus:border-primary"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm font-bold text-slate-800">{typeof med === 'string' ? med : med.name}</div>
                                    <div className="text-xs text-slate-500 font-medium">{typeof med === 'string' ? '' : med.dosage}</div>
                                  </>
                                )}
                              </div>
                              {isEditing ? (
                                <button onClick={() => removeMedicine(i)} className="text-rose-400 hover:text-rose-600 p-1">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleBuyClick([med])}
                                  className="bg-primary text-white text-[0.7rem] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-primary-dark transition shadow-sm"
                                >
                                  Buy
                                </button>
                              )}
                            </div>
                          )) : (
                            <div className="text-center py-4 text-slate-400 text-xs italic">No medicines detected. Click Edit to add manually.</div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button onClick={handleSaveToRecords} className="flex-1 bg-secondary hover:bg-secondary-dark text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98]">Confirm & Save to Records</button>
                        <button 
                          onClick={() => handleBuyClick(resultData.ocr_result.medicines)}
                          className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98]"
                        >
                          Buy Medicines
                        </button>
                        <button onClick={() => { setShowResult(false); setFilePreview(null); setIsEditing(false); }} className="px-6 border border-slate-200 text-slate-500 font-bold py-3.5 rounded-xl text-sm hover:bg-slate-50 transition active:scale-[0.98]">Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 text-sm font-medium flex items-center gap-3 anim">
                <span className="text-xl">⚠️</span>
                {error}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-outfit font-bold text-slate-800">My Records</h3>
                <span className="bg-primary-pale text-primary text-[0.65rem] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full">{myRecords.length} Files</span>
              </div>
              <div className="space-y-4">
                {isLoadingRecords ? (
                  <div className="text-center py-10 text-slate-400 text-xs italic anim-pulse">Loading records...</div>
                ) : myRecords.length > 0 ? myRecords.map((rx, i) => (
                  <div key={rx.id || i} className="border border-slate-100 rounded-2xl p-4 hover:border-primary/30 hover:bg-primary-pale/30 transition cursor-pointer group">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">📋</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{rx.doctor_name || 'Prescription'}</div>
                        <div className="text-xs text-slate-500">{rx.prescription_date} · {rx.medicines?.length || 0} meds</div>
                      </div>
                      <span className={`text-[0.6rem] font-black uppercase tracking-widest px-2 py-1 rounded-full ${rx.is_verified ? 'bg-secondary-pale text-secondary' : 'bg-amber-100 text-amber-600'}`}>
                        {rx.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleViewRecord(rx)}
                        className="flex-1 text-[0.65rem] font-black border border-slate-200 rounded-lg py-2 hover:bg-white transition uppercase tracking-widest"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleBuyClick(rx.medicines)}
                        className="flex-1 text-center text-[0.65rem] font-black border border-primary/20 text-primary rounded-lg py-2 hover:bg-primary-pale transition uppercase tracking-widest"
                      >
                        Buy
                      </button>
                      <button 
                        onClick={() => deleteRecord(rx.id)} 
                        className="px-3 text-[0.65rem] font-black border border-rose-100 text-rose-400 rounded-lg py-2 hover:bg-rose-50 transition uppercase tracking-widest"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 text-slate-400 text-xs italic">No prescriptions saved yet.</div>
                )}
              </div>
            </div>

            <div className="bg-primary-dark rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full"></div>
              <div className="font-outfit font-bold text-primary-light text-sm mb-3 uppercase tracking-widest">🔒 Secure & Private</div>
              <ul className="space-y-3">
                <li className="flex gap-2 text-[0.7rem] leading-relaxed text-sky-100/80">
                  <span className="text-sky-300">✓</span>
                  AES-256 encrypted storage for all records
                </li>
                <li className="flex gap-2 text-[0.7rem] leading-relaxed text-sky-100/80">
                  <span className="text-sky-300">✓</span>
                  Only you and authorized doctors can view
                </li>
                <li className="flex gap-2 text-[0.7rem] leading-relaxed text-sky-100/80">
                  <span className="text-sky-300">✓</span>
                  Direct medicine integration for quick checkout
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isAddingToCart && setIsPurchaseModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl anim overflow-hidden">
            <button 
              onClick={() => setIsPurchaseModalOpen(false)} 
              disabled={isAddingToCart}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>

            {purchaseStep === 'choice' ? (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary-pale flex items-center justify-center text-4xl mx-auto mb-6">🛒</div>
                <h2 className="font-outfit font-black text-2xl text-slate-800 mb-2">Purchase Options</h2>
                <p className="text-slate-500 text-sm mb-8">How would you like to add these medicines to your cart?</p>
                
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={handleBuyAll}
                    disabled={isAddingToCart}
                    className="flex items-center justify-between p-6 rounded-2xl border-2 border-primary/10 hover:border-primary hover:bg-primary-pale transition-all group"
                  >
                    <div className="text-left">
                      <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">Buy All Medicines</div>
                      <div className="text-xs text-slate-500">Add all {availableMeds.length} items to cart instantly</div>
                    </div>
                    <span className="text-2xl group-hover:scale-110 transition-transform">📦</span>
                  </button>

                  <button 
                    onClick={() => setPurchaseStep('selection')}
                    disabled={isAddingToCart}
                    className="flex items-center justify-between p-6 rounded-2xl border-2 border-slate-100 hover:border-secondary hover:bg-secondary-pale transition-all group"
                  >
                    <div className="text-left">
                      <div className="font-bold text-slate-800 group-hover:text-secondary transition-colors">Select Medicines</div>
                      <div className="text-xs text-slate-500">Choose specific items from the list</div>
                    </div>
                    <span className="text-2xl group-hover:scale-110 transition-transform">🔍</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setPurchaseStep('choice')} className="text-slate-400 hover:text-primary transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                  <h2 className="font-outfit font-black text-xl text-slate-800">Select Medicines</h2>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-3 mb-8 pr-2 custom-scrollbar">
                  {availableMeds.map((med, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedMeds(prev => ({ ...prev, [i]: !prev[i] }))}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${selectedMeds[i] ? 'bg-primary-pale border-primary/30' : 'bg-slate-50 border-slate-100'}`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${selectedMeds[i] ? 'bg-primary text-white' : 'bg-white border-2 border-slate-200'}`}>
                        {selectedMeds[i] && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-800">{med.name}</div>
                        {med.dosage && <div className="text-[0.65rem] text-slate-500 font-medium">{med.dosage}</div>}
                      </div>
                      <span className="text-xl">💊</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleBuySelected}
                  disabled={isAddingToCart || Object.values(selectedMeds).filter(Boolean).length === 0}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[0.7rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isAddingToCart ? 'bg-slate-100 text-slate-400' : 'bg-primary text-white shadow-primary/20 hover:bg-primary-dark'}`}
                >
                  {isAddingToCart ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      Adding to Cart...
                    </>
                  ) : (
                    <>Add Selected ({Object.values(selectedMeds).filter(Boolean).length}) to Cart</>
                  )}
                </button>
              </div>
            )}
            
            {isAddingToCart && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-100">
                  <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-sm font-black text-slate-800 uppercase tracking-widest">Searching Store...</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionUpload;
