import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const PaymentPortal = ({ onClose, amount, referenceId, type, onSuccess, initialMethod = 'razorpay' }) => {
  const [paymentMethod, setPaymentMethod] = useState(initialMethod); // Default to razorpay as requested
  const [step, setStep] = useState('input'); // input, processing, success
  const [processing, setProcessing] = useState(false);
  
  const isDummyKey = !import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY_ID.includes('rzp_test_SiaZ3XEeJmW0HJ'); // Example dummy key check
  // Razorpay integration
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    }
  }, []);

  const handleDemoPayment = async () => {
    setStep('processing');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Session expired. Please login again.");
        onClose();
        return;
      }

      // 1. Create mock order
      const orderRes = await axios.post(`${API_URL}/payments/create-razorpay-order`, {
        amount: parseFloat(amount),
        currency: "INR",
        is_demo: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Verify immediately (mock)
      const verifyRes = await axios.post(`${API_URL}/payments/verify-razorpay-payment`, {
        razorpay_order_id: orderRes.data.id,
        razorpay_payment_id: "pay_demo_" + Math.random().toString(36).substr(2, 9),
        razorpay_signature: "demo_signature",
        reference_id: referenceId,
        type: type
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStep('success');
      setTimeout(() => {
        onSuccess(verifyRes.data.transaction_id);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Demo payment failed:', error);
      const detail = error.response?.data?.detail;
      if (detail === "Invalid or expired token") {
        alert("Your session has expired. Please log in again.");
      } else {
        alert('Demo payment failed: ' + (detail || error.message));
      }
      setStep('input');
    }
  };

  const handleRazorpayPayment = async () => {
    setStep('processing');
    try {
      const token = localStorage.getItem('token');
      
      // 1. Create order on backend
      const orderRes = await axios.post(`${API_URL}/payments/create-razorpay-order`, {
        amount: parseFloat(amount),
        currency: "INR"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Handle mock order from backend (fallback when keys are missing)
      if (orderRes.data.demo_mode) {
        console.log("Backend returned mock order, switching to demo verification");
        const verifyRes = await axios.post(`${API_URL}/payments/verify-razorpay-payment`, {
          razorpay_order_id: orderRes.data.id,
          razorpay_payment_id: "pay_fallback_" + Math.random().toString(36).substr(2, 9),
          razorpay_signature: "fallback_signature",
          reference_id: referenceId,
          type: type
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setStep('success');
        setTimeout(() => {
          onSuccess(verifyRes.data.transaction_id);
          onClose();
        }, 2000);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "Medisphere",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} Payment`,
        order_id: orderRes.data.id,
        handler: async function (response) {
          // 2. Verify payment on backend
          try {
            setStep('processing');
            const verifyRes = await axios.post(`${API_URL}/payments/verify-razorpay-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              reference_id: referenceId,
              type: type
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            setStep('success');
            setTimeout(() => {
              onSuccess(verifyRes.data.transaction_id);
              onClose();
            }, 2500);
          } catch (err) {
            console.error("Verification failed", err);
            alert("Payment verification failed!");
            setStep('input');
          }
        },
        prefill: {
          name: "", // Can be filled from user profile if available
          email: "",
          contact: ""
        },
        theme: {
          color: "#0F172A"
        },
        modal: {
          ondismiss: function() {
            setStep('input');
          }
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (error) {
      console.error('Razorpay initialization failed:', error);
      alert('Failed to initialize payment gateway.');
      setStep('input');
    }
  };

  const [otp, setOtp] = useState('');
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });
  const [upiId, setUpiId] = useState('');

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    if (name === 'number') {
      const formatted = value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
      if (formatted.length <= 19) setCardData({ ...cardData, [name]: formatted });
    } else if (name === 'expiry') {
      const formatted = value.replace(/\D/g, '').replace(/(\d{2})/, '$1/').trim();
      if (formatted.length <= 5) setCardData({ ...cardData, [name]: formatted });
    } else if (name === 'cvv') {
      const formatted = value.replace(/\D/g, '');
      if (formatted.length <= 3) setCardData({ ...cardData, [name]: formatted });
    } else {
      setCardData({ ...cardData, [name]: value });
    }
  };

  const startPayment = (e) => {
    e.preventDefault();
    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else if (paymentMethod === 'demo') {
      handleDemoPayment();
    } else {
      setStep('processing');
      setTimeout(() => {
        if (paymentMethod === 'card' || paymentMethod === 'net_banking') {
          setStep('otp');
        } else {
          handleFinalizePayment();
        }
      }, 2000);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otp === '123456' || otp === '000000') {
      handleFinalizePayment();
    } else {
      alert('Invalid OTP for demo. Use 123456 or 000000');
    }
  };

  const handleFinalizePayment = async () => {
    setStep('processing');
    try {
      const token = localStorage.getItem('token');
      const transactionId = 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      const payload = {
        reference_id: referenceId,
        type: type,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        transaction_id: transactionId,
        status: 'completed'
      };

      await axios.post(`${API_URL}/payments/process`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStep('success');
      setTimeout(() => {
        onSuccess(transactionId);
        onClose();
      }, 2500);

    } catch (error) {
      console.error('Payment processing failed:', error);
      alert('Payment failed. Please try again.');
      setStep('input');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden anim border border-white/20">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        {step === 'success' ? (
          <div className="p-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-5xl animate-bounce shadow-inner">
              ✅
            </div>
            <h2 className="font-outfit font-black text-3xl text-slate-800">Payment Successful</h2>
            <div className="space-y-2">
              <p className="text-slate-500 font-medium">Your transaction has been processed securely.</p>
              <div className="text-[0.6rem] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 py-2 px-4 rounded-full inline-block">Order Verified & Paid</div>
            </div>
          </div>
        ) : step === 'processing' ? (
          <div className="p-16 text-center space-y-8">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-3">
              <h3 className="font-outfit font-black text-xl text-slate-800 uppercase tracking-widest">Processing</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Communicating with Secure Servers...</p>
            </div>
          </div>
        ) : step === 'otp' ? (
          <div className="p-10 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="w-12 h-12 bg-primary-pale rounded-xl flex items-center justify-center text-2xl">🏛️</div>
              <div>
                <h2 className="font-outfit font-black text-xl text-slate-800">Bank Verification</h2>
                <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">One-Time Password Required</p>
              </div>
            </div>

            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="space-y-4">
                <p className="text-[0.65rem] text-slate-500 font-medium leading-relaxed">
                  A verification code has been sent to your registered mobile number. Please enter the 6-digit code to authorize the payment of <span className="font-black text-slate-800">₹{amount}</span>.
                </p>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-black text-center text-2xl tracking-[0.5em] text-slate-800"
                  />
                </div>
                
                <div className="flex justify-between items-center px-1">
                  <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Demo Code: 123456</span>
                  <button type="button" className="text-[0.6rem] font-black uppercase tracking-widest text-primary hover:underline">Resend OTP</button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[0.7rem] shadow-xl shadow-slate-200 hover:bg-primary transition-all active:scale-95"
              >
                Verify & Authorize
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="bg-slate-50 p-8 border-b border-slate-100 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <div className="bg-primary/10 text-primary text-[0.5rem] font-black px-2 py-1 rounded uppercase tracking-widest border border-primary/20">Official Gateway</div>
              </div>
              <div>
                <h2 className="font-outfit font-black text-2xl text-slate-800">Secure Checkout</h2>
                <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Medisphere Payment Gateway</p>
              </div>
              <div className="text-right">
                <div className="text-[0.6rem] font-black uppercase tracking-widest text-primary mb-1">Total Amount</div>
                <div className="text-2xl font-black text-slate-800">₹{amount}</div>
              </div>
            </div>

            <div className="p-8">
              <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl mb-8">
                {['demo', 'razorpay', 'card', 'upi'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 min-w-[80px] py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${paymentMethod === method ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {method === 'demo' ? '🚀 Demo' : method === 'razorpay' ? '💳 Razorpay' : method.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <form onSubmit={startPayment} className="space-y-5">
                {paymentMethod === 'razorpay' && (
                  <div className={`p-6 rounded-3xl border border-dashed text-center space-y-4 ${isDummyKey ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-center gap-4">
                      <img src="https://razorpay.com/favicon.png" alt="Razorpay" className="w-8 h-8 object-contain" />
                      <div className="text-left">
                        <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-800">Razorpay Gateway</p>
                        <p className="text-[0.55rem] font-medium text-slate-400">{isDummyKey ? 'Using Test Keys' : 'Official Mode'}</p>
                      </div>
                    </div>
                    {isDummyKey && (
                      <p className="text-[0.55rem] font-bold text-amber-600 uppercase tracking-widest leading-relaxed">
                        ⚠️ Note: Real gateway may fail without valid production keys. Use Demo Mode for instant testing.
                      </p>
                    )}
                  </div>
                )}

                {paymentMethod === 'demo' && (
                  <div className="bg-amber-50/50 p-6 rounded-3xl border border-dashed border-amber-200 text-center space-y-4">
                    <div className="flex justify-center gap-4">
                      <div className="text-2xl">🛠️</div>
                      <div className="text-left">
                        <p className="text-[0.65rem] font-black uppercase tracking-widest text-amber-800">Developer Demo Mode</p>
                        <p className="text-[0.55rem] font-medium text-amber-600">Simulate Success Instantly</p>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Card Number</label>
                      <input
                        type="text"
                        name="number"
                        placeholder="4242 4242 4242 4242"
                        required
                        value={cardData.number}
                        onChange={handleCardChange}
                        className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-700 tracking-[0.1em]"
                      />
                      <div className="absolute right-4 bottom-4 text-2xl opacity-30">💳</div>
                    </div>
                    <div>
                      <label className="block text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Card Holder Name</label>
                      <input
                        type="text"
                        name="name"
                        placeholder="John Doe"
                        required
                        value={cardData.name}
                        onChange={handleCardChange}
                        className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Expiry Date</label>
                        <input
                          type="text"
                          name="expiry"
                          placeholder="MM/YY"
                          required
                          value={cardData.expiry}
                          onChange={handleCardChange}
                          className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">CVV</label>
                        <input
                          type="password"
                          name="cvv"
                          placeholder="***"
                          required
                          value={cardData.cvv}
                          onChange={handleCardChange}
                          className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'upi' && (
                  <div>
                    <label className="block text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">UPI ID</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="username@upi"
                        required
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-700"
                      />
                      <div className="absolute right-4 bottom-4 text-2xl opacity-30">📱</div>
                    </div>
                    <p className="text-[0.6rem] text-slate-400 mt-3 font-medium px-1 italic">Enter any UPI ID to proceed in Demo Mode.</p>
                  </div>
                )}

                {paymentMethod === 'net_banking' && (
                  <div>
                    <label className="block text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Select Bank</label>
                    <select className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-700 cursor-pointer">
                      <option>State Bank of India</option>
                      <option>HDFC Bank</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                      <option>Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                <div className="pt-6">
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[0.7rem] shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    Pay ₹{amount} Securely
                  </button>
                  <p className="text-[0.55rem] text-slate-400 text-center mt-4 flex items-center justify-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    256-bit SSL Encrypted Transaction
                  </p>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentPortal;
