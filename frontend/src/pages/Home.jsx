import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-5 -z-10"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10">
          <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-20 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="fade-up">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full border border-primary/20 mb-8 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping"></span>
              <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary-dark">Next-Gen Healthcare is Here</span>
            </div>
            <h1 className="font-outfit font-black text-6xl lg:text-7xl text-slate-900 leading-[1.1] mb-8" style={{ fontWeight: 900 }}>
              Your Health,<br/>
              <span className="text-primary">Evolved</span> with AI.
            </h1>
            <p className="text-slate-600 text-lg mb-10 leading-relaxed max-w-xl">
              Medisphere combines elite medical expertise with cutting-edge AI diagnostics to provide instant, accurate, and accessible healthcare for everyone, everywhere.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="bg-primary text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 hover:bg-primary-dark hover:-translate-y-1 transition-all active:scale-95">
                Get Started Free
              </Link>
              <Link to="/doctors" className="glass text-slate-700 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs border-white/60 hover:bg-white hover:-translate-y-1 transition-all active:scale-95">
                Book a Doctor
              </Link>
            </div>
            
            <div className="mt-16 flex items-center gap-8 border-t border-slate-100 pt-10">
              <div><div className="text-2xl font-black text-slate-800">10k+</div><div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Happy Users</div></div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div><div className="text-2xl font-black text-slate-800">250+</div><div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Elite Doctors</div></div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div><div className="text-2xl font-black text-slate-800">99.2%</div><div className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">AI Accuracy</div></div>
            </div>
          </div>

          <div className="relative hidden lg:block fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass-card rounded-[3rem] p-4 border-white/60 shadow-2xl relative z-10">
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1000" 
                alt="Healthcare AI" 
                className="rounded-[2.5rem] w-full h-[500px] object-cover shadow-inner"
              />
              <div className="absolute -left-10 bottom-20 glass p-6 rounded-3xl border-white shadow-xl max-w-[200px] anim-float">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-xl mb-3 shadow-lg">🛡️</div>
                <div className="text-xs font-black text-slate-800 mb-1">Secure Records</div>
                <div className="text-[0.6rem] text-slate-500 leading-relaxed font-bold">Your data is encrypted with military-grade protocols.</div>
              </div>
              <div className="absolute -right-10 top-20 glass p-6 rounded-3xl border-white shadow-xl max-w-[200px] anim-float" style={{ animationDelay: '1s' }}>
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white text-xl mb-3 shadow-lg">⚡</div>
                <div className="text-xs font-black text-slate-800 mb-1">Instant Results</div>
                <div className="text-[0.6rem] text-slate-500 leading-relaxed font-bold">AI diagnosis in under 60 seconds.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 fade-up">
            <h2 className="font-outfit font-black text-4xl text-slate-900 mb-4" style={{ fontWeight: 900 }}>Elite Medical Services</h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Everything you need for a healthier life</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Symptom Checker', desc: 'Instant AI-powered analysis of your symptoms with precision logic.', link: '/symptom-checker', icon: '🧠', color: 'bg-blue-50 text-blue-600' },
              { title: 'Doctor Consult', desc: 'Book video calls with world-class specialists in 30+ categories.', link: '/doctors', icon: '👨‍⚕️', color: 'bg-emerald-50 text-emerald-600' },
              { title: 'Medicine Store', desc: 'Order genuine medicines with 2-hour doorstep delivery.', link: '/medicine-store', icon: '💊', color: 'bg-amber-50 text-amber-600' },
              { title: 'Eye AI Scan', desc: 'Deep learning fundus analysis for early detection of eye diseases.', link: '/eye-ai', icon: '👁️', color: 'bg-rose-50 text-rose-600' },
              { title: 'Health Wallet', desc: 'Securely manage your prescriptions and medical history.', link: '/dashboard', icon: '📋', color: 'bg-violet-50 text-violet-600' },
              { title: 'Prescription Upload', desc: 'Upload and digitize your physical prescriptions with AI OCR.', link: '/prescription-upload', icon: '📄', color: 'bg-sky-50 text-sky-600' }
            ].map((service, i) => (
              <Link 
                key={i} 
                to={service.link}
                className="glass-card rounded-[2.5rem] p-10 border-slate-100 hover:scale-[1.02] transition-all group"
              >
                <div className={`w-16 h-16 rounded-2xl ${service.color} flex items-center justify-center text-3xl mb-8 shadow-inner group-hover:scale-110 transition-transform`}>
                  {service.icon}
                </div>
                <h3 className="font-outfit font-black text-xl text-slate-800 mb-4">{service.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium mb-8">
                  {service.desc}
                </p>
                <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  Explore Now <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
