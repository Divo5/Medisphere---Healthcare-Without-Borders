import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import PaymentPortal from '../components/PaymentPortal';

const MedicineStore = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState(5000); // Max price filter
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [previousAddresses, setPreviousAddresses] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // Default to razorpay as requested
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isPaymentPortalOpen, setIsPaymentPortalOpen] = useState(false);
  const [currentOrderInfo, setCurrentOrderInfo] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const navigate = useNavigate();

  const categories = [
    { name: 'All', icon: '🏪' },
    { name: 'Antibiotics', icon: '💊' },
    { name: 'Vitamins', icon: '🍎' },
    { name: 'OTC', icon: '🧪' },
    { name: 'Ayurvedic', icon: '🌿' },
    { name: 'Diabetes', icon: '🩸' },
    { name: 'Pain Relief', icon: '🦴' },
    { name: 'Personal Care', icon: '🧴' },
    { name: 'Baby Care', icon: '👶' },
    { name: 'First Aid', icon: '🩹' },
    { name: 'Cardiac', icon: '🫀' },
    { name: 'Respiratory', icon: '🫁' },
    { name: 'Skin Care', icon: '✨' },
    { name: 'Supplements', icon: '💪' },
    { name: 'Eye & Ear', icon: '👁️' },
    { name: 'Surgical', icon: '✂️' }
  ];

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('medisphere_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('medisphere_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const fetchMedicines = async () => {
      setIsLoading(true);
      try {
        const params = {
          sort_by: sortBy,
          order: sortOrder,
          limit: 100 // Get more for client-side price filtering if needed, or we can add price to backend
        };
        if (activeCategory !== 'All') params.category = activeCategory;
        if (searchQuery) params.search = searchQuery;
        
        const response = await axios.get(`${API_URL}/medicines/`, { params });
        const data = response.data.data || response.data;
        // Filter by price client-side for immediate feedback
        const filtered = (Array.isArray(data) ? data : []).filter(m => m.price <= priceRange);
        setMedicines(filtered);
      } catch (error) {
        console.error("Error fetching medicines:", error);
        alert("Error fetching medicines: " + error.message);
        setMedicines([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchMedicines, 300);
    return () => clearTimeout(debounce);
  }, [activeCategory, searchQuery, priceRange, sortBy, sortOrder]);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (isCheckoutOpen) {
        setIsLoadingAddresses(true);
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/orders/addresses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPreviousAddresses(res.data.addresses || []);
        } catch (error) {
          console.error("Error fetching addresses:", error);
        } finally {
          setIsLoadingAddresses(false);
        }
      }
    };
    fetchAddresses();
  }, [isCheckoutOpen]);

  const handleAddToCart = (med) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to add items to cart.');
      navigate('/login');
      return;
    }

    if (med.requires_prescription) {
      alert(`${med.name} requires a valid prescription. Please upload it in your dashboard after ordering.`);
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === med.id);
      if (existing) {
        return prev.map(item => item.id === med.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...med, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (subtotal >= 2000) return Math.floor(subtotal * 0.15); // 15% off above 2000
    if (subtotal >= 1000) return Math.floor(subtotal * 0.10); // 10% off above 1000
    if (subtotal >= 500) return 50; // Flat 50 off above 500
    return 0;
  };
  const calculateDelivery = () => {
    const subtotal = calculateSubtotal();
    if (subtotal >= 1500) return 0; // Free delivery above 1500
    return 40;
  };
  const calculateTotal = () => calculateSubtotal() - calculateDiscount() + calculateDelivery();

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    const token = localStorage.getItem('token');
    if (!deliveryAddress || deliveryAddress.length < 10) {
      alert('Please enter a valid delivery address.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const payload = {
        items: cart.map(item => ({ medicine_id: item.id, quantity: item.quantity })),
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
      };

      const res = await axios.post(`${API_URL}/orders/place`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const orderId = res.data.order_id || res.data.id;
      const totalAmount = calculateTotal();

      if (paymentMethod !== 'cod') {
        // Store order info and open payment portal
        setCurrentOrderInfo({
          id: orderId,
          tracking_id: res.data.tracking_id,
          total: totalAmount,
          items: [...cart],
          address: deliveryAddress
        });
        setIsPaymentPortalOpen(true);
        setIsPlacingOrder(false);
      } else {
        // Cash on delivery - complete order immediately
        setOrderSuccess({
          id: orderId,
          tracking_id: res.data.tracking_id,
          date: new Date().toLocaleDateString(),
          items: [...cart],
          subtotal: calculateSubtotal(),
          discount: calculateDiscount(),
          delivery: calculateDelivery(),
          total: totalAmount,
          address: deliveryAddress
        });
        
        setCart([]);
        setIsCheckoutOpen(false);
        setIsPlacingOrder(false);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error.response?.data?.detail || 'Failed to place order.');
      setIsPlacingOrder(false);
    }
  };

  const handlePaymentSuccess = (transactionId) => {
    setOrderSuccess({
      ...currentOrderInfo,
      date: new Date().toLocaleDateString(),
      subtotal: calculateSubtotal(),
      discount: calculateDiscount(),
      delivery: calculateDelivery(),
      transactionId: transactionId
    });
    
    setCart([]);
    setIsCheckoutOpen(false);
    setIsPaymentPortalOpen(false);
    setCurrentOrderInfo(null);
  };

  return (
    <div className="flex-1 bg-slate-50/50 min-h-screen">
      {/* Hero Header - Matching other pages */}
      <div className="bg-gradient-to-r from-primary-dark to-primary py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-widest uppercase text-blue-100 mb-2">Authentic Pharmacy</div>
          <h1 className="font-outfit font-black text-3xl lg:text-4xl text-white" style={{fontWeight: 900}}>Elite Medicine Store</h1>
          <p className="text-blue-50 text-sm mt-2 max-w-lg">Verified medicines and healthcare products delivered securely to your doorstep with digital tracking.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Sidebar - Scrollable Categories */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Search in Sidebar */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white py-3 pl-12 pr-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-xs text-slate-700 shadow-sm"
                />
              </div>

              {/* Categories Sidebar */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                  <h3 className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Categories</h3>
                </div>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {categories.map(cat => (
                    <button 
                      key={cat.name}
                      onClick={() => setActiveCategory(cat.name)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeCategory === cat.name ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary-pale text-slate-600 hover:text-primary'}`}
                    >
                      <span className={`text-lg transition-transform group-hover:scale-110 ${activeCategory === cat.name ? 'opacity-100' : 'opacity-70'}`}>{cat.icon}</span>
                      <span className="text-[0.7rem] font-black uppercase tracking-widest truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter Sidebar */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Price Range</h3>
                  <span className="text-[0.7rem] font-black text-primary">₹{priceRange}</span>
                </div>
                <input 
                  type="range" min="100" max="5000" step="50"
                  value={priceRange}
                  onChange={(e) => setPriceRange(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[0.55rem] font-black text-slate-400 uppercase tracking-tighter">
                  <span>₹100</span>
                  <span>₹5000</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            {/* Top Bar - Sort & View Options */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-2">Displaying</span>
                <span className="text-[0.65rem] font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{medicines.length} Products</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 pr-10 text-[0.65rem] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/10 cursor-pointer"
                  >
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="sales_count">Popularity</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>

                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-500 hover:text-primary transition-colors"
                  title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                >
                  {sortOrder === 'asc' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="m3 16 4 4 4-4M7 20V4M13 4h8M13 9h5M13 14h2"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="m3 8 4-4 4 4M7 4v16M13 20h8M13 15h5M13 10h2"/></svg>
                  )}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <div className="text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Inventory</div>
              </div>
            ) : medicines.length > 0 ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {medicines.map((med, i) => (
                  <div key={i} className="bg-white rounded-[2rem] p-5 border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col group anim-fade-up" style={{animationDelay: `${i * 50}ms`}}>
                    <div className="aspect-square rounded-[1.5rem] bg-slate-50 mb-5 flex items-center justify-center text-4xl shadow-inner group-hover:scale-[1.02] transition-transform relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/40 pointer-events-none"></div>
                      <span className="relative z-10 group-hover:rotate-12 transition-transform duration-500">
                        {med.category === 'Antibiotics' ? '💊' : 
                         med.category === 'Vitamins' ? '🍎' : 
                         med.category === 'Cardiac' ? '🫀' : 
                         med.category === 'Ayurvedic' ? '🌿' : 
                         med.category === 'Respiratory' ? '🫁' : 
                         med.category === 'Eye & Ear' ? '👁️' : 
                         med.category === 'Skin Care' ? '✨' : 
                         med.category === 'Supplements' ? '💪' : 
                         med.category === 'Personal Care' ? '🧴' : 
                         med.category === 'Baby Care' ? '👶' : 
                         med.category === 'First Aid' ? '🩹' : 
                         med.category === 'Diabetes' ? '🩸' : 
                         med.category === 'Pain Relief' ? '🦴' : 
                         med.category === 'Surgical' ? '✂️' : 
                         '🧪'}
                      </span>
                      {med.requires_prescription && (
                        <div className="absolute top-3 right-3 bg-rose-500/90 backdrop-blur-md text-white text-[0.5rem] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest shadow-lg">Rx</div>
                      )}
                      {med.stock_quantity < 50 && med.stock_quantity > 0 && (
                        <div className="absolute bottom-3 left-3 bg-amber-500/90 backdrop-blur-md text-white text-[0.45rem] font-black px-2 py-1 rounded-md uppercase tracking-widest">Low Stock</div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[0.55rem] font-black uppercase tracking-widest text-primary bg-primary-pale px-2.5 py-1 rounded-md">{med.category}</span>
                        <div className="flex items-center gap-1 text-amber-400">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          <span className="text-[0.65rem] font-black text-slate-800">{med.rating || '4.5'}</span>
                        </div>
                      </div>
                      <h3 className="font-outfit font-black text-base text-slate-800 mb-2 leading-tight group-hover:text-primary transition-colors">{med.name}</h3>
                      <div className="text-[0.6rem] font-bold text-slate-400 mb-4 line-clamp-1">{med.brand} · {med.unit || '10 units'}</div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                      <div>
                        <div className="text-[0.55rem] font-black text-slate-400 uppercase tracking-tighter line-through opacity-50">₹{med.mrp || med.price + 20}</div>
                        <div className="text-xl font-black text-slate-900">₹{med.price}</div>
                      </div>
                      <button 
                        onClick={() => handleAddToCart(med)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg active:scale-90"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-50">🔍</div>
                <h3 className="font-outfit font-black text-xl text-slate-800 mb-2">No medicines found</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xs">Try adjusting your filters or search query to find what you're looking for.</p>
                <button 
                  onClick={() => { setActiveCategory('All'); setSearchQuery(''); setPriceRange(5000); }}
                  className="mt-8 text-primary font-black uppercase tracking-[0.2em] text-[0.65rem] border-b-2 border-primary/20 pb-1 hover:border-primary transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-10 right-10 z-50 w-16 h-16 rounded-[2rem] bg-slate-900 text-white shadow-2xl flex items-center justify-center hover:scale-110 hover:bg-primary transition-all duration-300 group"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span className="absolute -top-1 -right-1 min-w-[1.5rem] h-6 bg-rose-500 rounded-full border-2 border-white text-[10px] font-black flex items-center justify-center px-1 shadow-lg group-hover:animate-bounce">{cart.length}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md glass bg-white h-full shadow-2xl flex flex-col anim-slide-left">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-outfit font-black text-2xl text-slate-800">Your Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-600"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {cart.length > 0 ? cart.map(item => (
                <div key={item.id} className="flex gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="w-16 h-16 rounded-xl glass flex items-center justify-center text-3xl shrink-0">
                    {item.category === 'Antibiotics' ? '💊' : '🍎'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-slate-800 truncate">{item.name}</div>
                    <div className="text-[0.6rem] text-primary font-black uppercase tracking-widest mb-3">₹{item.price} / unit</div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-lg glass flex items-center justify-center text-xs font-black">-</button>
                      <span className="text-xs font-black">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-lg glass flex items-center justify-center text-xs font-black">+</button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-rose-400 hover:text-rose-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="text-6xl mb-4 opacity-20">🛒</div>
                  <div className="text-slate-400 font-black uppercase tracking-widest text-xs">Your cart is empty</div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                <div className="flex justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-black text-slate-800">₹{calculateSubtotal()}</span>
                </div>
                <button 
                  onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[0.7rem] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && cart.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCheckoutOpen(false)}></div>
          <div className="relative glass-card bg-white rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl anim max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            
            <h2 className="font-outfit font-black text-3xl text-slate-800 mb-8" style={{fontWeight: 900}}>Checkout</h2>
            
            <div className="space-y-3 mb-8">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg glass flex items-center justify-center text-xl shadow-inner">
                    {item.category === 'Antibiotics' ? '💊' : '🍎'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-800 truncate">{item.name}</div>
                    <div className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-widest">Qty: {item.quantity}</div>
                  </div>
                  <div className="text-sm font-black text-primary">₹{item.price * item.quantity}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-6">
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-2">Delivery Address</label>
                
                {previousAddresses.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest ml-1">Saved Addresses</p>
                    <div className="flex flex-wrap gap-2">
                      {previousAddresses.map((addr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDeliveryAddress(addr)}
                          className={`text-[0.6rem] font-bold px-4 py-2 rounded-xl border transition-all ${deliveryAddress === addr ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {addr.length > 30 ? addr.substring(0, 30) + '...' : addr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea 
                  required
                  placeholder="Enter your complete home or office address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full glass-card p-4 rounded-2xl border-white/60 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700 text-sm"
                  rows="3"
                ></textarea>
              </div>

              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-3">Payment Method</label>
                <div className="grid grid-cols-4 gap-3 lg:grid-cols-5">
                  {['cod', 'demo', 'razorpay', 'upi', 'card'].map(id => (
                    <button 
                      key={id} type="button" onClick={() => setPaymentMethod(id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${paymentMethod === id ? 'bg-primary-pale border-primary text-primary' : 'bg-white border-slate-100 text-slate-500'}`}
                    >
                      <span className="text-xl">{id === 'cod' ? '💵' : id === 'demo' ? '🚀' : id === 'razorpay' ? '💳' : id === 'upi' ? '⚡' : '💳'}</span>
                      <span className="text-[0.5rem] font-black uppercase tracking-widest">{id === 'razorpay' ? 'Razorpay' : id === 'demo' ? 'Demo' : id.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>₹{calculateSubtotal()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  <span>Discount</span>
                  <span>- ₹{calculateDiscount()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Delivery</span>
                  <span>{calculateDelivery() === 0 ? <span className="text-emerald-500">FREE</span> : `+ ₹${calculateDelivery()}`}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Total Payable</span>
                  <span className="text-2xl font-black text-primary">₹{calculateTotal()}</span>
                </div>
              </div>

              {calculateSubtotal() < 1500 && (
                <div className="text-[0.6rem] font-bold text-slate-400 text-center uppercase tracking-widest">
                  Add ₹{1500 - calculateSubtotal()} more for <span className="text-emerald-500">FREE DELIVERY</span>
                </div>
              )}

              <button 
                type="submit" disabled={isPlacingOrder}
                className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[0.7rem] shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50"
              >
                {isPlacingOrder ? 'Processing...' : 'Confirm Order & Pay'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setOrderSuccess(null)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden anim">
            <div className="bg-primary p-8 text-white flex justify-between items-start">
              <div>
                <div className="text-[0.6rem] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Order Confirmed</div>
                <h2 className="text-3xl font-black font-outfit">Digital Invoice</h2>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold">INV #{orderSuccess.id}</div>
                <div className="text-[0.6rem] opacity-80 uppercase font-black">{orderSuccess.date}</div>
              </div>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-10">
                <div>
                  <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2">Billed To</div>
                  <div className="text-sm font-black text-slate-800">Verified Patient</div>
                  <div className="text-xs text-slate-500 leading-relaxed mt-1">{orderSuccess.address}</div>
                </div>
                <div>
                  <div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-2">Ship From</div>
                  <div className="text-sm font-black text-slate-800">Medisphere Elite Pharmacy</div>
                  <div className="text-xs text-slate-500 leading-relaxed mt-1">Healthcare Tower, Tech Park, Mumbai - 400001</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Medicine Name</th>
                      <th className="px-6 py-4 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                      <th className="px-6 py-4 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orderSuccess.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700">{item.name}</td>
                        <td className="px-6 py-4 text-xs font-black text-slate-500 text-center">{item.quantity}</td>
                        <td className="px-6 py-4 text-xs font-black text-slate-800 text-right">₹{item.price * item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>₹{orderSuccess.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase tracking-widest">
                    <span>Discount Applied</span>
                    <span>- ₹{orderSuccess.discount}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>Delivery Charge</span>
                    <span>{orderSuccess.delivery === 0 ? 'FREE' : `+ ₹${orderSuccess.delivery}`}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-slate-100 flex justify-between">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Total Paid</span>
                    <span className="text-2xl font-black text-primary">₹{orderSuccess.total}</span>
                  </div>
                  {orderSuccess.tracking_id && (
                    <div className="pt-2 text-center">
                      <div className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">Tracking ID</div>
                      <div className="text-xs font-black text-primary">{orderSuccess.tracking_id}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex gap-4">
                <button onClick={() => window.print()} className="flex-1 glass py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border-slate-200">🖨️ Print Invoice</button>
                <button onClick={() => navigate('/dashboard')} className="flex-1 bg-primary text-white py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-xl shadow-primary/20">Go to Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Portal */}
      {isPaymentPortalOpen && (
        <PaymentPortal 
          amount={currentOrderInfo?.total || calculateTotal()}
          type="order"
          referenceId={currentOrderInfo?.id}
          onSuccess={handlePaymentSuccess}
          onClose={() => setIsPaymentPortalOpen(false)}
          initialMethod={paymentMethod}
        />
      )}
    </div>
  );
};

export default MedicineStore;
