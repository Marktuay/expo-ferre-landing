import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Users, Building2, UserCheck, LineChart, Target, Tag, ShoppingCart, Truck, ClipboardList, Archive, Plane, Cog } from 'lucide-react';
import './index.css';
import SponsorDashboard from './components/SponsorDashboard';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import ContactPage from './components/ContactPage';
import StaffRegistration from './components/StaffRegistration';
import AuthPage from './components/AuthPage';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getEventBasePath } from './config/eventConfig';
import { QRCodeSVG } from 'qrcode.react';
import ScannerModule from './components/ScannerModule';
import AdminHub from './components/AdminHub';
import AdminSponsorsHub from './components/AdminSponsorsHub';
import AdminPreRegistrations from './components/AdminPreRegistrations';
import AdminSponsors from './components/AdminSponsors';
import AdminContact from './components/AdminContact';
import AdminSpeakers from './components/AdminSpeakers';
import AdminStaff from './components/AdminStaff';
import AdminGuests from './components/AdminGuests';
import AdminUsers from './components/AdminUsers';
import InteractiveMap from './components/InteractiveMap';
const FadeIn = ({ children, delay = 0, direction = 'up' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      });
    }, { threshold: 0.1 });
    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); };
  }, []);

  const directionClass = direction === 'up' ? 'translate-y-10' : direction === 'left' ? 'translate-x-10' : direction === 'right' ? '-translate-x-10' : '';

  return (
    <div
      ref={domRef}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 translate-x-0' : `opacity-0 ${directionClass}`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [formState, setFormState] = useState('idle'); // 'idle', 'submitting', 'success'
  const [qrValue, setQrValue] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [sponsorLogos, setSponsorLogos] = useState([]);

  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/stands`), where('status', '==', 'reserved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogos = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.logo) {
          fetchedLogos.push(data.logo);
        }
      });
      
      let finalLogos = [];
      // Start with the actual logos
      finalLogos = [...fetchedLogos];
      
      // If we have less than 8, pad the rest with placeholders (represented by null)
      while (finalLogos.length < 8) {
        finalLogos.push(null);
      }
      
      // If we somehow fetched more than 8 logos, that's fine, the reel will just be longer.
      setSponsorLogos(finalLogos);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCurrentUserData(docSnap.data());
          } else {
            setCurrentUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setCurrentUserData(null);
        }
      } else {
        setCurrentUserData(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('landing');
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormState('submitting');
    
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      company: formData.get('company'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      employees: formData.get('employees'),
      position: formData.get('position'),
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, `${getEventBasePath()}/preregistrations`), data);
      setQrValue(docRef.id);
      setFormState('success');
      e.target.reset();
    } catch (error) {
      console.error('Error saving preregistration:', error);
      setFormState('idle');
      alert('Hubo un error al registrar. Intenta de nuevo.');
    }
  };


  return (
    <>
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg bg-[#2a2f40]/95 backdrop-blur-md border-b border-white/10 py-2' : 'bg-[#2a2f40] py-4'} flex justify-between items-center px-margin-mobile md:px-margin-desktop`}>
        <div className="flex items-center gap-12">
          <div className="flex items-center cursor-pointer bg-white p-2 rounded-md shadow-md transition-transform hover:scale-105" onClick={() => setCurrentView('landing')}>
            <img src="/logo.svg" alt="Expo Ferre Logo" className="w-[220px] h-[110px] object-contain" />
          </div>
          <nav className="hidden lg:flex items-center gap-4">
            <button onClick={() => setCurrentView('landing')} className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-md transition-all shadow-sm flex items-center gap-2 text-lg">
              <span className="material-symbols-outlined text-[22px]">home</span> Inicio
            </button>
            <button onClick={() => { setCurrentView('landing'); setTimeout(() => window.location.hash = 'awards', 100); }} className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-md transition-all shadow-sm flex items-center gap-2 text-lg">
              <span className="material-symbols-outlined text-[22px]">emoji_events</span> Premios
            </button>
            <button onClick={() => setCurrentView('contactPage')} className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-md transition-all shadow-sm flex items-center gap-2 text-lg">
              <span className="material-symbols-outlined text-[22px]">mail</span> Contacto
            </button>
            <div className="w-px h-8 bg-white/20 mx-2"></div>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white hover:bg-white/10 p-2 rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-[32px]">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
          
          {/* Desktop Buttons (Right Side) */}
          <div className="hidden lg:flex items-center gap-4">
            {currentView.startsWith('admin') ? (
              adminUser ? (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400">Administrador</span>
                    <span className="text-sm font-bold text-white">{adminUser.username}</span>
                  </div>
                  <button 
                    onClick={() => setCurrentView('adminHub')}
                    className="bg-[#f39200] text-white font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">dashboard</span> Mi Panel
                  </button>
                  <button 
                    onClick={() => { setAdminUser(null); setCurrentView('landing'); }}
                    className="bg-red-500/20 text-red-200 hover:bg-red-500 hover:text-white border border-red-500/50 font-bold py-2 px-4 rounded-md transition-all shadow-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span> Salir
                  </button>
                </div>
              ) : null
            ) : (
              currentUser ? (
                <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-400">Patrocinador</span>
                  {currentUserData ? (
                    <>
                      <span className="text-sm font-bold text-white leading-tight">{currentUserData.empresa}</span>
                      <span className="text-[11px] text-gray-300 leading-tight">{currentUserData.nombre} {currentUserData.apellido}</span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-white">{currentUser.email}</span>
                  )}
                </div>
                <button 
                  onClick={() => setCurrentView('sponsorDashboard')}
                  className="bg-[#f39200] text-white font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">dashboard</span> Mi Panel
                </button>
                <button 
                  onClick={handleLogout}
                  className="bg-red-500/20 text-red-200 hover:bg-red-500 hover:text-white border border-red-500/50 font-bold py-2 px-4 rounded-md transition-all shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span> Salir
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setCurrentView('sponsorDashboard')}
                  className="bg-[#f39200] text-white font-bold py-2.5 px-6 rounded-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined text-[22px]">handshake</span> Quiero patrocinar
                </button>
                <button 
                  onClick={() => { setCurrentView('landing'); setTimeout(() => document.getElementById('preregistro-form')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                  className="bg-[#283474] text-white font-bold py-2.5 px-6 rounded-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined text-[22px]">confirmation_number</span> Quiero asistir
                </button>
              </>
            ))}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-[#2a2f40]/95 backdrop-blur-md border-b border-white/10 shadow-lg py-4 px-6 flex flex-col gap-3 max-h-[calc(100vh-80px)] overflow-y-auto">
            <button onClick={() => { setCurrentView('landing'); setIsMobileMenuOpen(false); }} className="bg-white/5 hover:bg-white/10 text-white font-bold text-lg text-left flex items-center gap-3 py-3 px-4 rounded-md transition-colors">
              <span className="material-symbols-outlined text-[24px]">home</span> Inicio
            </button>
            <button onClick={() => { setCurrentView('sponsorDashboard'); setIsMobileMenuOpen(false); }} className="bg-white/5 hover:bg-white/10 text-white font-bold text-lg text-left flex items-center gap-3 py-3 px-4 rounded-md transition-colors">
              <span className="material-symbols-outlined text-[24px]">military_tech</span> Patrocinadores
            </button>
            <button onClick={() => { setCurrentView('landing'); setTimeout(() => window.location.hash = 'awards', 100); setIsMobileMenuOpen(false); }} className="bg-white/5 hover:bg-white/10 text-white font-bold text-lg text-left flex items-center gap-3 py-3 px-4 rounded-md transition-colors">
              <span className="material-symbols-outlined text-[24px]">emoji_events</span> Premios
            </button>
            <button onClick={() => { setCurrentView('contactPage'); setIsMobileMenuOpen(false); }} className="bg-white/5 hover:bg-white/10 text-white font-bold text-lg text-left flex items-center gap-3 py-3 px-4 rounded-md transition-colors">
              <span className="material-symbols-outlined text-[24px]">mail</span> Contacto
            </button>
            <hr className="border-white/10 my-2" />
            {currentView.startsWith('admin') ? (
              adminUser ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-white/5 py-2 px-4 rounded-md text-center">
                    <span className="block text-xs text-gray-400">Sesión iniciada como</span>
                    <span className="block text-sm font-bold text-white truncate">{adminUser.username}</span>
                  </div>
                  <button 
                    onClick={() => { setCurrentView('adminHub'); setIsMobileMenuOpen(false); }}
                    className="bg-[#f39200] text-white font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                  >
                    <span className="material-symbols-outlined">dashboard</span> Mi Panel
                  </button>
                  <button 
                    onClick={() => { setAdminUser(null); setCurrentView('landing'); setIsMobileMenuOpen(false); }}
                    className="bg-red-500/20 text-red-200 border border-red-500/50 font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                  >
                    <span className="material-symbols-outlined">logout</span> Salir
                  </button>
                </div>
              ) : null
            ) : (
              currentUser ? (
                <div className="flex flex-col gap-3">
                <div className="bg-white/5 py-2 px-4 rounded-md text-center">
                  <span className="block text-[10px] text-gray-400">Patrocinador</span>
                  {currentUserData ? (
                    <>
                      <span className="block text-sm font-bold text-white truncate leading-tight">{currentUserData.empresa}</span>
                      <span className="block text-[11px] text-gray-300 truncate leading-tight">{currentUserData.nombre} {currentUserData.apellido}</span>
                    </>
                  ) : (
                    <span className="block text-sm font-bold text-white truncate">{currentUser.email}</span>
                  )}
                </div>
                <button 
                  onClick={() => { setCurrentView('sponsorDashboard'); setIsMobileMenuOpen(false); }}
                  className="bg-[#f39200] text-white font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined">dashboard</span> Mi Panel
                </button>
                <button 
                  onClick={handleLogout}
                  className="bg-red-500/20 text-red-200 border border-red-500/50 font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined">logout</span> Cerrar Sesión
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => { setCurrentView('sponsorDashboard'); setIsMobileMenuOpen(false); }}
                  className="bg-[#f39200] text-white font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined">handshake</span> Quiero patrocinar
                </button>
                <button 
                  onClick={() => { setCurrentView('landing'); setTimeout(() => document.getElementById('preregistro-form')?.scrollIntoView({ behavior: 'smooth' }), 100); setIsMobileMenuOpen(false); }}
                  className="bg-[#283474] text-white font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined">confirmation_number</span> Quiero asistir
                </button>
              </>
            ))}
          </div>
        )}
      </header>

      {currentView === 'landing' && (
        <main className="pt-36">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center py-stack-lg px-margin-mobile overflow-hidden rounded-5px">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img 
              src="/background-hero.jpeg"
              alt="Hero Background"
              className="w-full h-[150%] -top-[25%] absolute object-cover brightness-[0.4] will-change-transform" 
              style={{ transform: `translateY(${scrollY * 0.7}px)` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/90 via-inverse-surface/50 to-transparent"></div>
          </div>

          {/* Superimposed Sponsors Reel */}
          <div className="w-full z-20 mb-8 md:mb-12 shrink-0 mt-8">
            <div className="container mx-auto px-margin-mobile text-center">
              <FadeIn direction="up">
                <h2 className="font-headline-xl text-2xl md:text-4xl text-white font-black tracking-widest mb-4 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Patrocinan</h2>
                <div className="overflow-hidden relative w-full flex items-center py-2">
                  <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-black/20 to-transparent z-10 pointer-events-none"></div>
                  <div className="animate-scroll-logos flex">
                    <div className="flex gap-8 md:gap-16 pr-8 md:pr-16">
                      {sponsorLogos.map((logoUrl, index) => (
                        logoUrl ? (
                          <div key={`first-${index}`} className="flex-shrink-0 flex items-center justify-center w-36 h-16 md:w-48 md:h-20 bg-white/10 backdrop-blur-md border border-white/30 rounded-md transition-all hover:bg-white/20 shadow-lg overflow-hidden p-2">
                            <img src={logoUrl} alt={`Sponsor ${index}`} className="max-w-full max-h-full object-contain drop-shadow-md" />
                          </div>
                        ) : (
                          <div key={`first-placeholder-${index}`} className="flex-shrink-0 flex items-center justify-center w-36 h-16 md:w-48 md:h-20 bg-white/10 backdrop-blur-md border border-white/30 rounded-md transition-all hover:bg-white/20 cursor-default shadow-lg">
                            <span className="font-headline-sm text-white font-bold tracking-widest text-lg drop-shadow-md">LOGO {index + 1}</span>
                          </div>
                        )
                      ))}
                    </div>
                    <div className="flex gap-8 md:gap-16 pr-8 md:pr-16">
                      {sponsorLogos.map((logoUrl, index) => (
                        logoUrl ? (
                          <div key={`second-${index}`} className="flex-shrink-0 flex items-center justify-center w-36 h-16 md:w-48 md:h-20 bg-white/10 backdrop-blur-md border border-white/30 rounded-md transition-all hover:bg-white/20 shadow-lg overflow-hidden p-2">
                            <img src={logoUrl} alt={`Sponsor ${index}`} className="max-w-full max-h-full object-contain drop-shadow-md" />
                          </div>
                        ) : (
                          <div key={`second-placeholder-${index}`} className="flex-shrink-0 flex items-center justify-center w-36 h-16 md:w-48 md:h-20 bg-white/10 backdrop-blur-md border border-white/30 rounded-md transition-all hover:bg-white/20 cursor-default shadow-lg">
                            <span className="font-headline-sm text-white font-bold tracking-widest text-lg drop-shadow-md">LOGO {index + 1}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
          <div className="relative z-10 container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-stack-lg items-center mt-10">
            <div className="lg:col-span-7 text-white space-y-stack-sm">
              <FadeIn>
                <div className="bg-[#f39200] text-white inline-block px-4 py-1 font-label-sm text-label-sm uppercase tracking-widest clip-industrial mb-4">CONSTRUYENDO EL FUTURO</div>
                <h1 className="font-headline-xl text-headline-xl lg:text-7xl leading-tight text-white drop-shadow-lg">IMPULSANDO Y CONECTANDO LA INDUSTRIA FERRETERA</h1>
                <p className="font-body-lg text-body-lg max-w-xl opacity-90 mt-4 text-surface-container-lowest drop-shadow-md">Únete al evento líder de hardware y construcción en la región. Innovación, networking y negocios en un solo lugar.</p>
              </FadeIn>
              <div className="flex gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-fixed-dim">calendar_today</span>
                  <span className="font-label-sm">17 de Octubre, 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-fixed-dim">location_on</span>
                  <span className="font-label-sm">Centro de Convenciones Crowne Plaza</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="bg-[#d9d9d9]/80 backdrop-blur-sm border border-outline-variant hard-shadow-orange rounded-5px overflow-hidden aspect-video relative flex items-center justify-center shadow-2xl">
                <video 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                >
                  <source src="/hero-video.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </section>



        {/* What is Expo Ferre */}
        <section className="relative py-stack-lg px-margin-mobile overflow-hidden my-12 bg-gray-50 border-y border-gray-200">
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-12">
              <h2 className="font-headline-xl text-4xl md:text-5xl text-[#283474] font-black tracking-widest mb-4 uppercase">
                ¿Qué es <span className="text-[#f39200]">EXPO FERRE</span>?
              </h2>
            </div>

            <div className="flex flex-col gap-8 mb-8">
              <FadeIn direction="up">
                <div className="space-y-6 text-lg text-gray-700 bg-white p-8 md:p-10 rounded-xl shadow-sm border border-gray-100 w-full">
                  <p className="font-medium text-xl text-[#283474] leading-relaxed">
                    <strong className="font-black">EXPO FERRE</strong> nace como la primera plataforma especializada del sector ferretero en Nicaragua, para crear Negocios, fortalecer, conectar y modernizar la industria a través de un espacio de alto nivel enfocado en negocios, innovación y relaciones estratégicas.
                  </p>
                  <p className="leading-relaxed">
                    El evento reunirá en un solo lugar a los principales tomadores de decisión del canal ferretero: <strong className="text-gray-900 font-bold">propietarios de ferreterías, gerentes generales, gerentes de compras, distribuidores, importadores, cadenas ferreteras, marcas líderes y proveedores especializados</strong> de Nicaragua y Centroamérica.
                  </p>
                  <p className="leading-relaxed">
                    <strong className="font-black text-[#283474]">EXPO FERRE</strong> impulsará oportunidades reales de posicionamiento, expansión comercial, generación de alianzas y conexión directa entre marcas y compradores estratégicos del sector.
                  </p>
                </div>
              </FadeIn>

              <FadeIn direction="up" delay={100}>
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="bg-[#f39200] text-white py-3 px-8 inline-block self-start mb-6 rounded-br-xl">
                    <h3 className="font-headline-sm text-xl font-bold">Con enfoque en:</h3>
                  </div>
                  <ul className="px-8 md:px-10 pb-8 space-y-4 text-gray-700 font-medium text-lg flex-grow">
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">trending_up</span>
                      <span>Tendencias del sector</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">inventory_2</span>
                      <span>Nuevos productos</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">handshake</span>
                      <span>Networking B2B</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">school</span>
                      <span>Capacitación comercial y técnica</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">storefront</span>
                      <span>Generar negocios en la industria</span>
                    </li>
                  </ul>
                </div>
              </FadeIn>

              <FadeIn direction="up" delay={200}>
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col">
                  <div className="bg-[#f39200] text-white py-4 px-8">
                    <h3 className="font-headline-lg text-2xl font-bold flex items-center gap-3">
                      <span className="material-symbols-outlined text-3xl">groups</span> Audiencia esperada: 300 personas
                    </h3>
                  </div>
                  <div className="p-8 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-base text-gray-700 font-medium flex-grow bg-gradient-to-br from-white to-gray-50">
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Dueños / Propietarios</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Socios fundadores</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Directores generales</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Gerentes generales</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Gerentes comerciales</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Directores comerciales</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Jefes de ventas</li>
                    </ul>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Gerentes de compras</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Jefes de abastecimiento</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Coordinadores de compras</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Responsables de inventario</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Encargados de importaciones</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Gerentes de operaciones</li>
                    </ul>
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="up" delay={300}>
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="bg-[#f39200] text-white py-3 px-8 inline-block self-start mb-6 rounded-br-xl">
                    <h3 className="font-headline-sm text-xl font-bold">Temas / Tracks Temáticos:</h3>
                  </div>
                  <ul className="px-8 md:px-10 pb-8 space-y-4 text-gray-700 font-medium text-lg flex-grow grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">lightbulb</span>
                      <span>Tendencias y Materiales Innovadores</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">devices</span>
                      <span>Transformación digital</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">psychology</span>
                      <span>Inteligencia artificial para negocios</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">campaign</span>
                      <span>Ventas y marketing</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">inventory</span>
                      <span>Manejo de Inventarios</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">store</span>
                      <span>Retail ferretero</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">support_agent</span>
                      <span>Servicio al cliente</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#283474] text-2xl mt-0.5">payments</span>
                      <span>Financiamiento</span>
                    </li>
                  </ul>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Sponsorships */}
        <section className="py-stack-lg bg-inverse-surface text-surface px-margin-mobile rounded-5px hidden">
          <div className="container mx-auto">
            <div className="text-center mb-stack-lg">
              <h2 className="font-headline-lg text-headline-lg text-primary-fixed-dim mb-4">PATROCINIOS 2026</h2>
              <p className="font-body-lg text-body-lg opacity-80 max-w-2xl mx-auto">Posicione su marca frente a los líderes del mercado ferretero.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-md">
              <div className="relative bg-surface-container-lowest text-on-surface p-base overflow-hidden rounded-5px">
                <div className="h-2 w-full bg-[#E5E4E2] absolute top-0 left-0"></div>
                <div className="p-8 pt-10 text-center">
                  <span className="font-label-sm text-secondary font-bold tracking-widest uppercase">Diamante</span>
                  <h3 className="font-headline-md text-headline-md my-4">MAIN SPONSOR</h3>
                  <ul className="text-left space-y-3 font-body-md mb-8">
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> Stand Premium 12x12m</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> Logo en Keynote Principal</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> 5 Min. Presentación Tarima</li>
                  </ul>
                  <button className="w-full py-3 border-2 border-secondary font-bold hover:bg-secondary hover:text-white transition-all rounded-5px">CONSULTAR</button>
                </div>
              </div>
              <div className="relative bg-surface-container-lowest text-on-surface p-base border-2 border-primary-container shadow-2xl scale-105 z-10 rounded-5px">
                <div className="h-2 w-full bg-[#FFD700] absolute top-0 left-0"></div>
                <div className="p-8 pt-10 text-center">
                  <span className="font-label-sm text-primary font-bold tracking-widest uppercase">ORO</span>
                  <h3 className="font-headline-md text-headline-md my-4">PLATINUM LEVEL</h3>
                  <ul className="text-left space-y-3 font-body-md mb-8">
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> Stand Central 8x8m</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> Branding en Credenciales</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> 3 Menciones en Social Media</li>
                  </ul>
                  <button className="w-full py-3 bg-primary-container text-on-primary-container font-bold hover:brightness-110 transition-all rounded-5px">MÁS POPULAR</button>
                </div>
              </div>
              <div className="relative bg-surface-container-lowest text-on-surface p-base overflow-hidden rounded-5px">
                <div className="h-2 w-full bg-[#C0C0C0] absolute top-0 left-0"></div>
                <div className="p-8 pt-10 text-center">
                  <span className="font-label-sm text-secondary font-bold tracking-widest uppercase">PLATA</span>
                  <h3 className="font-headline-md text-headline-md my-4">SILVER PARTNER</h3>
                  <ul className="text-left space-y-3 font-body-md mb-8">
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> Stand Estándar 4x4m</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> Logo en Directorio Feria</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> 1 Mención en Web App</li>
                  </ul>
                  <button className="w-full py-3 border-2 border-secondary font-bold hover:bg-secondary hover:text-white transition-all rounded-5px">VER DETALLES</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Awards */}
        <section className="py-stack-lg px-margin-mobile container mx-auto overflow-hidden rounded-5px">
          <div className="flex flex-col md:flex-row justify-between items-end mb-stack-lg gap-4">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-secondary">PREMIOS A LA EXCELENCIA</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Reconocemos la trayectoria y calidad de los ferreteros de la región.</p>
            </div>
            <span className="font-label-sm text-primary font-bold tracking-[0.3em]">RECONOCIMIENTO 2026</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter-sm">
            <div className="relative group">
              <div className="bg-surface border border-outline-variant p-6 pt-12 transition-all group-hover:bg-primary-container/10 rounded-5px">
                <div className="absolute -top-4 left-6 w-12 h-12 bg-primary flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform rounded-5px">01</div>
                <h4 className="font-headline-md text-headline-md text-on-background mb-2">Ferretero del Año</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">Al negocio con mayor crecimiento e impacto comunitario.</p>
              </div>
            </div>
            <div className="relative group">
              <div className="bg-surface border border-outline-variant p-6 pt-12 transition-all group-hover:bg-primary-container/10 rounded-5px">
                <div className="absolute -top-4 left-6 w-12 h-12 bg-primary flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform rounded-5px">02</div>
                <h4 className="font-headline-md text-headline-md text-on-background mb-2">Innovación Digital</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">Mejor implementación de e-commerce y pagos digitales.</p>
              </div>
            </div>
            <div className="relative group">
              <div className="bg-surface border border-outline-variant p-6 pt-12 transition-all group-hover:bg-primary-container/10 rounded-5px">
                <div className="absolute -top-4 left-6 w-12 h-12 bg-primary flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform rounded-5px">03</div>
                <h4 className="font-headline-md text-headline-md text-on-background mb-2">Trayectoria Oro</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">Premio a ferreterías con más de 25 años en el mercado.</p>
              </div>
            </div>
            <div className="relative group">
              <div className="bg-surface border border-outline-variant p-6 pt-12 transition-all group-hover:bg-primary-container/10 rounded-5px">
                <div className="absolute -top-4 left-6 w-12 h-12 bg-primary flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform rounded-5px">04</div>
                <h4 className="font-headline-md text-headline-md text-on-background mb-2">Sostenibilidad</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">Mejores prácticas de manejo de residuos y eficiencia.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Location & Footer Info */}
        <section className="bg-inverse-surface py-stack-lg px-margin-mobile rounded-5px">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-stack-lg items-center">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary mb-6">UBICACIÓN Y FECHA</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary-fixed text-3xl">event</span>
                  <div>
                    <p className="font-headline-md text-headline-md text-white">Sábado 17 de Octubre, 2026</p>
                    <p className="font-body-md text-surface-variant">08:00 AM - 06:00 PM (Horario corrido)</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary-fixed text-3xl">meeting_room</span>
                  <div>
                    <p className="font-headline-md text-headline-md text-white">Centro de Convenciones Crowne Plaza</p>
                    <p className="font-body-md text-surface-variant">Managua, Nicaragua. Salones Bristol y Lieden.</p>
                  </div>
                </div>
              </div>
              <button className="mt-8 px-8 py-3 bg-white text-inverse-surface font-bold hover:bg-primary-fixed transition-all flex items-center gap-2 rounded-5px">
                <span className="material-symbols-outlined">directions</span> COMO LLEGAR
              </button>
            </div>
            <div id="preregistro-form" className="bg-[#d9d9d9]/80 backdrop-blur-sm p-8 border border-outline-variant hard-shadow-orange rounded-5px relative overflow-hidden shadow-2xl">
              {formState === 'success' && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-center p-8 z-10 overflow-y-auto">
                  <span className="material-symbols-outlined text-6xl text-[#16a34a] mb-2">check_circle</span>
                  <h3 className="font-headline-lg text-2xl text-[#1e293b] font-bold mb-2">¡Preregistro Exitoso!</h3>
                  <p className="text-[#475569] mb-6">Guarda este código QR para tu acceso al evento.</p>
                  
                  {qrValue && (
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
                      <QRCodeSVG value={qrValue} size={150} level="M" />
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      setFormState('idle');
                      setQrValue(null);
                    }}
                    className="px-6 py-2 bg-[#f39200] hover:bg-[#d88000] text-white font-bold rounded-md shadow-md transition-all active:scale-95"
                  >
                    Cerrar
                  </button>
                </div>
              )}
              <h2 className="font-headline-md text-headline-md text-[#1e293b] mb-6 font-bold">PREREGISTRO</h2>
              <form onSubmit={handleRegister} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-1">Nombre Completo</label>
                  <input required name="name" type="text" className="w-full px-4 py-3 rounded-md border border-[#cbd5e1] focus:ring-2 focus:ring-[#f39200] focus:border-[#f39200] transition-colors bg-white/90 text-gray-800" placeholder="Ej. Juan Pérez" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-1">Empresa</label>
                  <input required name="company" type="text" className="w-full px-4 py-3 rounded-md border border-[#cbd5e1] focus:ring-2 focus:ring-[#f39200] focus:border-[#f39200] transition-colors bg-white/90 text-gray-800" placeholder="Nombre de tu empresa" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#475569] mb-1">Email</label>
                    <input required name="email" type="email" className="w-full px-4 py-3 rounded-md border border-[#cbd5e1] focus:ring-2 focus:ring-[#f39200] focus:border-[#f39200] transition-colors bg-white/90 text-gray-800" placeholder="correo@ejemplo.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#475569] mb-1">Teléfono</label>
                    <input required name="phone" type="tel" className="w-full px-4 py-3 rounded-md border border-[#cbd5e1] focus:ring-2 focus:ring-[#f39200] focus:border-[#f39200] transition-colors bg-white/90 text-gray-800" placeholder="+505 0000 0000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#475569] mb-1">Cantidad de empleados</label>
                    <select required name="employees" className="w-full px-4 py-3 rounded-md border border-[#cbd5e1] focus:ring-2 focus:ring-[#f39200] focus:border-[#f39200] transition-colors bg-white/90 text-gray-800">
                      <option value="">Selecciona una opción</option>
                      <option value="1 a 10">1 a 10</option>
                      <option value="11 a 20">11 a 20</option>
                      <option value="21 a 50">21 a 50</option>
                      <option value="51 a 100">51 a 100</option>
                      <option value="101 a 200">101 a 200</option>
                      <option value="201 a 300">201 a 300</option>
                      <option value="Más de 300">Más de 300</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#475569] mb-1">Puesto</label>
                    <select required name="position" className="w-full px-4 py-3 rounded-md border border-[#cbd5e1] focus:ring-2 focus:ring-[#f39200] focus:border-[#f39200] transition-colors bg-white/90 text-gray-800">
                      <option value="">Selecciona tu puesto</option>
                      <option value="Propietario">Propietario</option>
                      <option value="Gerente General">Gerente General</option>
                      <option value="Administración y Finanzas">Administración y Finanzas</option>
                      <option value="Compras">Compras</option>
                      <option value="Ventas">Ventas</option>
                      <option value="Bodega e Inventario">Bodega e Inventario</option>
                      <option value="Logística">Logística</option>
                    </select>
                  </div>
                </div>
                <button 
                  disabled={formState === 'submitting'}
                  type="submit" 
                  className="w-full mt-6 bg-[#f39200] hover:bg-[#d88000] text-white font-bold py-4 rounded-md shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {formState === 'submitting' ? (
                    <><span className="material-symbols-outlined animate-spin">refresh</span> PROCESANDO...</>
                  ) : (
                    <><span className="material-symbols-outlined">send</span> REGISTRARME AHORA</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
        </main>
      )}


      {currentView === 'adminHub' && (
        <AdminHub 
          onBack={() => setCurrentView('landing')} 
          onNavigate={(view) => setCurrentView(view)} 
          adminUser={adminUser}
          setAdminUser={setAdminUser}
        />
      )}

      {currentView === 'adminSponsorsHub' && (
        <AdminSponsorsHub onBack={() => setCurrentView('adminHub')} onNavigate={(v) => setCurrentView(v)} />
      )}

      {currentView === 'adminPanel' && (
        <AdminPanel onBack={() => setCurrentView('adminSponsorsHub')} />
      )}

      {currentView === 'adminPreRegistrations' && (
        <AdminPreRegistrations onBack={() => setCurrentView('adminHub')} />
      )}

      {currentView === 'adminContact' && (
        <AdminContact onBack={() => setCurrentView('adminHub')} />
      )}

      {currentView === 'adminSponsors' && (
        <AdminSponsors onBack={() => setCurrentView('adminSponsorsHub')} />
      )}

      {currentView === 'adminSpeakers' && (
        <AdminSpeakers onBack={() => setCurrentView('adminSponsorsHub')} />
      )}

      {currentView === 'adminStaff' && (
        <AdminStaff onBack={() => setCurrentView('adminSponsorsHub')} />
      )}

      {currentView === 'adminGuests' && (
        <AdminGuests onBack={() => setCurrentView('adminSponsorsHub')} />
      )}

      {currentView === 'adminUsers' && (
        <AdminUsers onBack={() => setCurrentView('adminHub')} />
      )}

      {currentView === 'escaner' && (
        adminUser ? (
          <ScannerModule onBack={() => setCurrentView('adminHub')} />
        ) : (
          <AdminHub 
            onBack={() => setCurrentView('landing')} 
            onNavigate={(view) => setCurrentView(view)} 
            adminUser={adminUser}
            setAdminUser={setAdminUser}
          />
        )
      )}

      {currentView === 'sponsorDashboard' && (
        authLoading ? (
          <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#283474] border-t-transparent rounded-full animate-spin"></div></div>
        ) : currentUser ? (
          <SponsorDashboard 
            userData={currentUserData}
            onBack={() => setCurrentView('landing')}
            onStaffRegistration={() => setCurrentView('staffRegistration')}
            onContact={() => setCurrentView('contactPage')}
          />
        ) : (
          <AuthPage onBack={() => setCurrentView('landing')} />
        )
      )}

      {currentView === 'privacyPolicy' && (
        <PrivacyPolicy />
      )}

      {currentView === 'termsOfService' && (
        <TermsOfService />
      )}

      {currentView === 'contactPage' && (
        <ContactPage />
      )}

      {currentView === 'staffRegistration' && (
        authLoading ? (
          <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#283474] border-t-transparent rounded-full animate-spin"></div></div>
        ) : currentUser ? (
          <StaffRegistration onBack={() => setCurrentView(currentUser ? 'sponsorDashboard' : 'landing')} />
        ) : (
          <AuthPage onBack={() => setCurrentView('landing')} />
        )
      )}

      {/* Footer */}
      <footer className="w-full bg-inverse-surface border-t-4 border-primary p-stack-lg space-y-stack-sm text-center relative z-10">
          <div className="font-headline-md text-headline-md text-primary font-bold">EXPO FERRE</div>
          <div className="flex justify-center gap-8 mb-4 flex-wrap">
            <button onClick={() => setCurrentView('privacyPolicy')} className="text-surface-variant hover:text-primary transition-colors font-body-md">Políticas de Privacidad</button>
            <button onClick={() => setCurrentView('termsOfService')} className="text-surface-variant hover:text-primary transition-colors font-body-md">Términos de Servicio</button>
            <a className="text-surface-variant hover:text-primary transition-colors font-body-md" href="#">Press Kit</a>
            <button onClick={() => setCurrentView('adminHub')} className="text-surface-variant hover:text-primary transition-colors font-body-md opacity-30 hover:opacity-100">Intranet</button>
          </div>
          <p className="font-body-md text-body-md text-surface-variant">© 2026 EXPO FERRE. TODOS LOS DERECHOS RESERVADOS.</p>
        </footer>


    </>
  );
}
