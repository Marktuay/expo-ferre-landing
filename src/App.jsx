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
import { collection, addDoc, setDoc, serverTimestamp, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getEventBasePath } from './config/eventConfig';
import { QRCodeSVG } from 'qrcode.react';
import ScannerModule from './components/ScannerModule';
import AdminHub from './components/AdminHub';
import AdminSponsorsHub from './components/AdminSponsorsHub';
import AdminGlobalLeads from './components/AdminGlobalLeads';
import AdminPreRegistrations from './components/AdminPreRegistrations';
import AdminSponsors from './components/AdminSponsors';
import AdminContact from './components/AdminContact';
import AdminSpeakers from './components/AdminSpeakers';
import AdminStaff from './components/AdminStaff';
import AdminGuests from './components/AdminGuests';
import AdminUsers from './components/AdminUsers';
import AdminCheckIn from './components/AdminCheckIn';
import AdminAttendanceReport from './components/AdminAttendanceReport';
import AdminMarketingReport from './components/AdminMarketingReport';
import AdminPushNotifications from './components/AdminPushNotifications';
import InteractiveMap from './components/InteractiveMap';
import SpeakerForm from './components/SpeakerForm';

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
  const [currentView, setCurrentView] = useState(() => {
    if (window.location.search.includes('form=speaker') || window.location.search.includes('speaker=register')) {
      return 'speakerRegistration';
    }
    if (window.location.hash) {
      return 'landing';
    }
    return localStorage.getItem('expoFerre_currentView') || 'landing';
  });

  useEffect(() => {
    localStorage.setItem('expoFerre_currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'landing' && window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [currentView]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedAward, setSelectedAward] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const [formState, setFormState] = useState('idle'); // 'idle', 'submitting', 'success'
  const [qrValue, setQrValue] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const savedAdmin = localStorage.getItem('expoFerre_adminUser');
      return savedAdmin ? JSON.parse(savedAdmin) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (adminUser) {
      localStorage.setItem('expoFerre_adminUser', JSON.stringify(adminUser));
    } else {
      localStorage.removeItem('expoFerre_adminUser');
    }
  }, [adminUser]);
  
  // TODO: ELIMINAR ESTO DESPUÉS. Placeholders iniciales apuntando a las carpetas locales.
  // IMPORTANTE: Como usas los nombres reales de las empresas, debes actualizar esta lista 
  // con el nombre exacto de tu archivo (ej. '/diamante/rotoplas.png').
  const initialPlaceholders = [
    { url: '/diamante/sur.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/logo-kermil.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/megalines1.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/pensilvania.jpg', category: 'Diamante', order: 1, scale: 1.35, bgWhite: true },
    { url: '/diamante/megalines.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/sinsa.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/comasa.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/extelpng.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/nitrotel.png?v=1', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/logo-bac.jpeg', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/balladares.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/sylvania.jpg', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/cemex.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/canal.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/construrama.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/noelito%20.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/lafise.jpg', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/indeninicsa.png', category: 'Diamante', order: 1, bgClass: 'bg-gray-100/90' },
    { url: '/diamante/LOGO-ARCELOR.png', category: 'Diamante', order: 1, scale: 1.1, bgWhite: true },
    { url: '/diamante/romax.jpeg', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/maximiza.jpeg', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/incasa.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/panelconsa.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/steelmax.png', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/diamante/eaton.jpeg', category: 'Diamante', order: 1, bgWhite: true },
    { url: '/oro/plycem%20.png', category: 'Oro', order: 2, bgWhite: true },
    { url: '/oro/sicsa.png', category: 'Oro', order: 2, bgWhite: true },
    { url: '/oro/up.png', category: 'Oro', order: 2, bgWhite: true },
    { url: '/oro/armoconsa.png', category: 'Oro', order: 2, bgWhite: true },
    { url: '/oro/holcim.jpeg', category: 'Oro', order: 2, bgWhite: true },
    { url: '/oro/disensa.jpeg', category: 'Oro', order: 2, bgWhite: true },
    { url: '/oro/tigo.png', category: 'Oro', order: 2, scale: 1.32, bgWhite: true },
    { url: '/oro/jp-studio-white.png', category: 'Oro', order: 2, bgWhite: true },
    { url: '/plata/ferdandezsera.png', category: 'Plata', order: 3, bgWhite: true },
    { url: '/plata/logo-sherwin-williams.jpg', category: 'Plata', order: 3, bgWhite: true },
    { url: '/plata/casco.png', category: 'Plata', order: 3, bgWhite: true },
    { url: '/plata/midesa.png', category: 'Plata', order: 3, bgWhite: true },
    { url: '/plata/madinisa.png', category: 'Plata', order: 3, bgWhite: true },
    { url: '/plata/sonax.jpg', category: 'Plata', order: 3, bgWhite: true },
    { url: '/plata/dataanalytics.jpg', category: 'Plata', order: 3, bgWhite: true },
  ];
  
  const sponsorLogos = initialPlaceholders;
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef(null);

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
            const nameFromEmail = (user.email || 'patrocinador').split('@')[0];
            const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
            const basicProfile = {
              email: user.email || '',
              nombre: formattedName,
              apellido: '',
              empresa: formattedName,
              role: 'sponsor',
              status: 'approved',
              createdAt: serverTimestamp()
            };
            setDoc(docRef, basicProfile, { merge: true }).catch(err => console.warn("Error auto-creating user doc:", err));
            setCurrentUserData(basicProfile);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setCurrentUserData(null);
        }
      } else {
        setCurrentUserData(null);
        setAdminUser(null);
        localStorage.removeItem('expoFerre_adminUser');
        localStorage.removeItem('expoFerre_currentView');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out of Firebase Auth:', error);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
        indexedDB.deleteDatabase('firebaseLocalStorageDb');
      } catch (e) {
        console.warn("IndexedDB delete warning:", e);
      }
      setCurrentView('landing');
      setIsMobileMenuOpen(false);
      setAdminUser(null);
      setSponsorUser(null);
      setCurrentUserData(null);
      setCurrentUser(null);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormState('submitting');
    
    const formData = new FormData(e.target);
    const position = formData.get('position');
    const employees = formData.get('employees');
    
    const status = 'pending';

    // Capturar UTMs
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source') || 'Organico';
    const utmMedium = urlParams.get('utm_medium') || '';
    const utmCampaign = urlParams.get('utm_campaign') || '';

    const data = {
      name: formData.get('name'),
      company: formData.get('company'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      employees,
      position,
      status,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      createdAt: serverTimestamp()
    };

    try {
      const userEmail = data.email.trim().toLowerCase();
      
      // Verificar si el correo ya existe usando el correo como ID del documento
      const docRef = doc(db, `${getEventBasePath()}/preregistrations`, userEmail);
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        showToast("Este correo ya está registrado. Te notificaremos pronto.");
        setFormState('idle');
        return;
      }

      await setDoc(docRef, data);

      
      // Enviar correo al usuario
      await addDoc(collection(db, 'mail'), {
        to: data.email,
        message: {
          subject: 'Registro a ExpoFerre 2026',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <!-- Header Image -->
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 30px;">
                <h2 style="color: #0d47a1; margin-top: 0;">¡Hola ${data.name}!</h2>
                <p>Hemos recibido tu solicitud de preregistro para <strong>ExpoFerre 2026</strong>.</p>
                <p><strong>Estatus:</strong> <span style="color: orange;">En revisión</span></p>
                <p>Te notificaremos pronto mediante un correo automático cuando la administración haya revisado y aprobado tu registro, incluyendo tu código QR de acceso.</p>
              </div>
              
              <!-- Footer Image -->
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
      });

      // Enviar copia al administrador
      await addDoc(collection(db, 'mail'), {
        to: ['karen.torres@rinsa.red', 'AdmonEventKT@gmail.com'],
        message: {
          subject: `Nuevo Preregistro: ${data.name} - ExpoFerre`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <!-- Header Image -->
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 30px;">
                <h2 style="color: #0d47a1; margin-top: 0;">Nuevo Preregistro en el Sistema</h2>
                <p>Se ha recibido un nuevo preregistro que espera ser revisado.</p>
                <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0d47a1;">
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 10px;"><strong>Nombre:</strong> ${data.name}</li>
                    <li style="margin-bottom: 10px;"><strong>Empresa:</strong> ${data.company}</li>
                    <li style="margin-bottom: 10px;"><strong>Puesto:</strong> ${data.position}</li>
                    <li style="margin-bottom: 10px;"><strong>Cantidad de Empleados:</strong> ${data.employees}</li>
                    <li><strong>Estatus Automático:</strong> Pendiente (Requiere aprobación)</li>
                  </ul>
                </div>
                <p>Por favor, ingresa al panel de administración para revisarlo.</p>
              </div>
              
              <!-- Footer Image -->
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
      });

      // Sincronizar con Google Sheets Webhook
      try {
        fetch('https://script.google.com/macros/s/AKfycbyfJKrTw_rfJr5nK6pn0Nr8_2B7GxaQLBD_3kCexYW7i0b7g7ha8si8bq9OOGEn7dCI/exec', {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(data)
        });
      } catch (e) {
        console.error("Error sincronizando con Google Sheets", e);
      }

      if (status === 'approved') {
        setQrValue(docRef.id);
        setFormState('success');
      } else {
        setFormState('pending_approval');
      }
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
            <button onClick={() => { setCurrentView('landing'); setTimeout(() => window.location.hash = 'plano-stands', 100); }} className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-md transition-all shadow-sm flex items-center gap-2 text-lg">
              <span className="material-symbols-outlined text-[22px]">map</span> Plano de Stands
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
            {adminUser ? (
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
                  onClick={() => { setAdminUser(null); handleLogout(); }}
                  className="bg-red-500/20 text-red-200 hover:bg-red-500 hover:text-white border border-red-500/50 font-bold py-2 px-4 rounded-md transition-all shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span> Salir
                </button>
              </div>
            ) : currentUser ? (
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
                <div className="relative">
                  <button 
                    onClick={() => showToast('¡Próximamente!')}
                    className="bg-[#f39200] text-white font-bold py-2.5 px-6 rounded-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 text-lg"
                  >
                    <span className="material-symbols-outlined text-[22px]">calendar_month</span> Agenda
                  </button>
                  {toastMessage && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white text-[#283474] px-4 py-2 rounded-md shadow-lg font-bold flex items-center gap-2 z-50 whitespace-nowrap animate-in fade-in zoom-in duration-200 border border-gray-200">
                      <span className="material-symbols-outlined text-sm">info</span> {toastMessage}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setCurrentView('sponsorDashboard')}
                  className="bg-[#f39200] text-white font-bold py-2.5 px-6 rounded-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined text-[22px]">handshake</span> Quiero patrocinar
                </button>
                <button 
                  onClick={() => { setCurrentView('landing'); setTimeout(() => document.getElementById('preregistro-form')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                  className="bg-[#f39200] text-white font-bold py-2.5 px-6 rounded-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined text-[22px]">confirmation_number</span> Quiero asistir
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-[#2a2f40]/95 backdrop-blur-md border-b border-white/10 shadow-lg py-4 px-6 flex flex-col gap-3 max-h-[calc(100vh-80px)] overflow-y-auto">
            <button onClick={() => { setCurrentView('landing'); setIsMobileMenuOpen(false); }} className="bg-white/5 hover:bg-white/10 text-white font-bold text-lg text-left flex items-center gap-3 py-3 px-4 rounded-md transition-colors">
              <span className="material-symbols-outlined text-[24px]">home</span> Inicio
            </button>
            <button onClick={() => { setCurrentView('landing'); setTimeout(() => window.location.hash = 'plano-stands', 100); setIsMobileMenuOpen(false); }} className="bg-white/5 hover:bg-white/10 text-white font-bold text-lg text-left flex items-center gap-3 py-3 px-4 rounded-md transition-colors">
              <span className="material-symbols-outlined text-[24px]">map</span> Plano de Stands
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
            {adminUser ? (
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
                  onClick={() => { setAdminUser(null); handleLogout(); setIsMobileMenuOpen(false); }}
                  className="bg-red-500/20 text-red-200 border border-red-500/50 font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined">logout</span> Salir
                </button>
              </div>
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
                <div className="relative w-full">
                  <button 
                    onClick={() => showToast('¡Próximamente!')}
                    className="bg-[#f39200] w-full text-white font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                  >
                    <span className="material-symbols-outlined">calendar_month</span> Agenda
                  </button>
                  {toastMessage && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white text-[#283474] px-4 py-2 rounded-md shadow-lg font-bold flex items-center gap-2 z-50 whitespace-nowrap animate-in fade-in zoom-in duration-200 border border-gray-200">
                      <span className="material-symbols-outlined text-sm">info</span> {toastMessage}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => { setCurrentView('sponsorDashboard'); setIsMobileMenuOpen(false); }}
                  className="bg-[#f39200] text-white font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
                >
                  <span className="material-symbols-outlined">handshake</span> Quiero patrocinar
                </button>
                <button 
                  onClick={() => { setCurrentView('landing'); setTimeout(() => document.getElementById('preregistro-form')?.scrollIntoView({ behavior: 'smooth' }), 100); setIsMobileMenuOpen(false); }}
                  className="bg-[#f39200] text-white font-bold py-3 px-4 rounded-md flex justify-center items-center gap-2 text-lg"
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

          {/* Superimposed Sponsors List */}
          {sponsorLogos.length > 0 && (
            <div className="w-full z-20 mb-8 md:mb-12 shrink-0 -mt-2">
              <div className="container mx-auto px-margin-mobile text-center">
                <FadeIn direction="up">
                  <h2 className="font-headline-xl text-2xl md:text-4xl text-white font-black tracking-widest mb-6 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Patrocinan</h2>
                  <div className="bg-black/20 py-6 md:py-8 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden relative w-full flex items-center">
                    <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-black/50 to-transparent z-10 pointer-events-none"></div>
                    
                    <div className="animate-scroll-logos flex items-stretch">
                      {[1, 2].map((set) => (
                        <div key={`set-${set}`} className="flex items-stretch pr-12 md:pr-24">
                          
                          {/* Espaciador para que el reel empiece desde el borde derecho y haya una pausa entre ciclos */}
                          <div className="w-[50vw] shrink-0"></div>

                          {sponsorLogos.filter(l => l.category === 'Diamante').length > 0 && (
                            <div className="flex items-stretch gap-4 md:gap-6 mx-6 md:mx-8">
                              <div className="flex items-start pt-2 border-r-2 border-white/30 pr-4 md:pr-6">
                                <span className="font-black uppercase tracking-widest text-sm md:text-base text-cyan-300 drop-shadow-md">Diamante</span>
                              </div>
                              <div className="flex items-center gap-4 md:gap-6">
                                {sponsorLogos.filter(l => l.category === 'Diamante').map((logo, index) => (
                                  <div key={`diamante-${set}-${index}`} className={`flex-shrink-0 flex items-center justify-center p-3 ${logo.bgClass ? logo.bgClass : (logo.bgWhite ? 'bg-white p-2' : 'bg-white/10')} rounded-xl border border-white/20 hover:scale-110 hover:bg-white/20 transition-all duration-300 cursor-pointer`}>
                                    <div className="w-32 md:w-44 aspect-video overflow-hidden flex items-center justify-center">
                                      <img 
                                        src={logo.url} 
                                        alt={`Sponsor Diamante ${index}`} 
                                        className="max-w-full max-h-full object-contain drop-shadow-lg" 
                                        style={logo.scale ? { transform: `scale(${logo.scale})` } : undefined}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sponsorLogos.filter(l => l.category === 'Oro').length > 0 && (
                            <div className="flex items-stretch gap-4 md:gap-6 mx-6 md:mx-8">
                              <div className="flex items-start pt-2 border-r-2 border-white/30 pr-4 md:pr-6">
                                <span className="font-black uppercase tracking-widest text-sm md:text-base text-yellow-400 drop-shadow-md">Oro</span>
                              </div>
                              <div className="flex items-center gap-4 md:gap-6">
                                {sponsorLogos.filter(l => l.category === 'Oro').map((logo, index) => (
                                  <div key={`oro-${set}-${index}`} className={`flex-shrink-0 flex items-center justify-center p-3 ${logo.bgClass ? logo.bgClass : (logo.bgWhite ? 'bg-white p-2' : 'bg-white/10')} rounded-xl border border-white/20 hover:scale-110 hover:bg-white/20 transition-all duration-300 cursor-pointer`}>
                                    <div className="w-32 md:w-44 aspect-video overflow-hidden flex items-center justify-center">
                                      <img 
                                        src={logo.url} 
                                        alt={`Sponsor Oro ${index}`} 
                                        className="max-w-full max-h-full object-contain drop-shadow-lg" 
                                        style={logo.scale ? { transform: `scale(${logo.scale})` } : undefined}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sponsorLogos.filter(l => l.category === 'Plata').length > 0 && (
                            <div className="flex items-stretch gap-4 md:gap-6 mx-6 md:mx-8">
                              <div className="flex items-start pt-2 border-r-2 border-white/30 pr-4 md:pr-6">
                                <span className="font-black uppercase tracking-widest text-sm md:text-base text-gray-300 drop-shadow-md">Plata</span>
                              </div>
                              <div className="flex items-center gap-4 md:gap-6">
                                {sponsorLogos.filter(l => l.category === 'Plata').map((logo, index) => (
                                  <div key={`plata-${set}-${index}`} className={`flex-shrink-0 flex items-center justify-center p-3 ${logo.bgClass ? logo.bgClass : (logo.bgWhite ? 'bg-white p-2' : 'bg-white/10')} rounded-xl border border-white/20 hover:scale-110 hover:bg-white/20 transition-all duration-300 cursor-pointer`}>
                                    <div className="w-28 md:w-36 aspect-video overflow-hidden flex items-center justify-center">
                                      <img 
                                        src={logo.url} 
                                        alt={`Sponsor Plata ${index}`} 
                                        className="max-w-full max-h-full object-contain drop-shadow-lg" 
                                        style={logo.scale ? { transform: `scale(${logo.scale})` } : undefined}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sponsorLogos.filter(l => l.category === 'Patrocinador').length > 0 && (
                            <div className="flex items-stretch gap-4 md:gap-6 mx-6 md:mx-8">
                              <div className="flex items-start pt-2 border-r-2 border-white/30 pr-4 md:pr-6">
                                <span className="font-black uppercase tracking-widest text-xs md:text-sm text-white/80 drop-shadow-md">Apoyan</span>
                              </div>
                              <div className="flex items-center gap-4 md:gap-6">
                                {sponsorLogos.filter(l => l.category === 'Patrocinador').map((logo, index) => (
                                  <div key={`patro-${set}-${index}`} className="flex-shrink-0 flex items-center justify-center p-2 bg-white/5 rounded-xl border border-white/10 hover:scale-110 hover:bg-white/20 transition-all duration-300 cursor-pointer">
                                    <div className="w-24 md:w-32 aspect-video overflow-hidden flex items-center justify-center">
                                      <img src={logo.url} alt={`Patrocinador ${index}`} className="max-w-full max-h-full object-contain drop-shadow-md" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>
          )}
          <div className="relative z-10 container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-stack-lg items-center mt-10">
            <div className="lg:col-span-7 text-white space-y-stack-sm">
              <FadeIn>
                <div className="bg-[#f39200] text-white inline-block px-4 py-1 font-label-sm text-label-sm uppercase tracking-widest clip-industrial mb-4">CONSTRUYENDO EL FUTURO</div>
                <h1 className="font-headline-xl text-headline-xl lg:text-7xl leading-tight text-white drop-shadow-lg">IMPULSANDO Y CONECTANDO LA INDUSTRIA FERRETERA</h1>
                <p className="font-body-lg text-body-lg max-w-xl opacity-90 mt-4 text-surface-container-lowest drop-shadow-md">Más que una feria, somos la plataforma que reúne a los principales actores del sector ferretero para fomentar la innovación, fortalecer relaciones comerciales y generar nuevas oportunidades de negocio que impulsan el crecimiento de la industria.</p>
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
            <div className="lg:col-span-5 flex justify-center items-center">
              <div className="relative border-4 border-[#f39200] hard-shadow-orange rounded-3xl overflow-hidden shadow-2xl bg-black w-[280px] sm:w-[340px] md:w-[380px] lg:w-[420px] aspect-[9/16]">
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover scale-[1.78] rounded-2xl" 
                  autoPlay 
                  loop 
                  muted={isVideoMuted}
                  playsInline
                >
                  <source src="/tallerexpoferre1.mp4" type="video/mp4" />
                </video>
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !videoRef.current.muted;
                      setIsVideoMuted(videoRef.current.muted);
                    }
                  }}
                  className="absolute bottom-4 right-4 bg-black/70 hover:bg-black text-white p-3 rounded-full transition-colors flex items-center justify-center z-20 shadow-lg border border-white/20"
                >
                  <span className="material-symbols-outlined text-lg">
                    {isVideoMuted ? 'volume_off' : 'volume_up'}
                  </span>
                </button>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6 text-lg text-[#283474] font-medium bg-white p-8 md:p-10 rounded-xl shadow-sm border border-gray-100 w-full flex flex-col justify-center">
                    <p className="leading-relaxed">
                      <strong className="font-black">EXPO FERRE</strong> nace como la primera plataforma especializada del sector ferretero en Nicaragua para crear negocios, fortalecer, conectar y modernizar la industria a través de un espacio de alto nivel enfocado en la innovación, el comercio y las relaciones estratégicas.
                    </p>
                    <p className="leading-relaxed">
                      El evento reunirá en un solo lugar a los principales tomadores de decisiones del canal ferretero: <strong className="font-black">propietarios de ferreterías, gerentes generales, gerentes de compras, distribuidores, importadores, cadenas ferreteras, marcas líderes y proveedores especializados</strong> de Nicaragua y Centroamérica.
                    </p>
                    <p className="leading-relaxed">
                      <strong className="font-black">EXPO FERRE</strong> impulsará oportunidades reales de posicionamiento, expansión comercial, generación de alianzas y conexión directa entre marcas y compradores estratégicos del sector.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-full overflow-hidden flex items-center justify-center p-2">
                    <img src="/map-expo-ferre-140826.svg" alt="Mapa de Expo Ferre" className="w-full h-auto object-contain max-h-[600px] hover:scale-105 transition-transform duration-300" />
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="up" delay={100}>
                <div className="w-full rounded-xl shadow-sm border border-outline-variant overflow-hidden flex flex-col relative">
                  <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
                    <div 
                      className="absolute inset-0 bg-cover bg-center brightness-[0.4]" 
                      style={{ 
                        backgroundImage: "url('/Gemini_Generated_Image_z9fv1yz9fv1yz9fv.png')"
                      }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/90 via-inverse-surface/50 to-transparent"></div>
                  </div>
                  
                  <div className="bg-[#f39200] text-white py-3 px-8 inline-block self-start mb-6 rounded-br-xl relative z-10">
                    <h3 className="font-headline-sm text-xl font-bold">Con enfoque en:</h3>
                  </div>
                  <ul className="px-8 md:px-10 pb-8 space-y-4 text-white font-medium text-lg flex-grow relative z-10 drop-shadow-md">
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">trending_up</span>
                      <span>Tendencias del sector</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">inventory_2</span>
                      <span>Nuevos productos</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">handshake</span>
                      <span>Networking B2B</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">school</span>
                      <span>Capacitación comercial y técnica</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">storefront</span>
                      <span>Generar negocios en la industria</span>
                    </li>
                  </ul>
                </div>
              </FadeIn>

              <FadeIn direction="up" delay={200}>
                <div className="w-full rounded-xl shadow-sm border border-outline-variant overflow-hidden flex flex-col relative">
                  <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
                    <div 
                      className="absolute inset-0 bg-cover bg-center brightness-[0.4]" 
                      style={{ 
                        backgroundImage: "url('/Gemini_Generated_Image_uj81j1uj81j1uj81.png')"
                      }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/90 via-inverse-surface/50 to-transparent"></div>
                  </div>
                  
                  <div className="bg-[#f39200] text-white py-3 px-8 inline-block self-start mb-6 rounded-br-xl relative z-10">
                    <h3 className="font-headline-lg text-2xl font-bold flex items-center gap-3">
                      <span className="material-symbols-outlined text-3xl">groups</span> Audiencia esperada: 300 personas
                    </h3>
                  </div>
                  <div className="p-8 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-base text-white font-medium flex-grow relative z-10 drop-shadow-md">
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Dueños / Propietarios</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Socios / fundadores</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Gerentes generales</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Gerentes comerciales</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Jefes de ventas</li>
                    </ul>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Gerentes / coordinador de compras</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Jefes de abastecimiento</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Responsables de inventario</li>
                      <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[#f39200] text-xl mt-0.5">check_circle</span> Gerentes de operaciones</li>
                    </ul>
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="up" delay={300}>
                <div className="w-full rounded-xl shadow-sm border border-outline-variant overflow-hidden flex flex-col relative">
                  <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
                    <div 
                      className="absolute inset-0 bg-cover bg-center brightness-[0.4]" 
                      style={{ 
                        backgroundImage: "url('/Gemini_Generated_Image_97vehf97vehf97ve.png')"
                      }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/90 via-inverse-surface/50 to-transparent"></div>
                  </div>

                  <div className="bg-[#f39200] text-white py-3 px-8 inline-block self-start mb-6 rounded-br-xl relative z-10">
                    <h3 className="font-headline-sm text-xl font-bold">Temas / Tracks Temáticos:</h3>
                  </div>
                  <ul className="px-8 md:px-10 pb-8 space-y-4 text-white font-medium text-lg flex-grow grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 relative z-10 drop-shadow-md">
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">lightbulb</span>
                      <span>Tendencias y Materiales Innovadores</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">devices</span>
                      <span>Transformación digital</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">psychology</span>
                      <span>Inteligencia artificial para negocios</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">campaign</span>
                      <span>Ventas y marketing</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">inventory</span>
                      <span>Manejo de Inventarios</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">store</span>
                      <span>Retail ferretero</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">support_agent</span>
                      <span>Servicio al cliente</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#f39200] text-2xl mt-0.5">payments</span>
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
        <section id="awards" className="py-16 px-margin-mobile container mx-auto my-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <h2 className="font-headline-lg text-3xl md:text-4xl font-black text-[#283474] tracking-wide uppercase">PREMIOS A LA EXCELENCIA</h2>
              <p className="font-body-lg text-base md:text-lg text-gray-600 mt-1">Reconocemos la trayectoria y calidad de los ferreteros de la región.</p>
            </div>
            <span className="font-label-sm text-[#8c4900] font-black tracking-[0.3em] uppercase text-sm">RECONOCIMIENTO 2026</span>
          </div>

          {(() => {
            const awardsData = [
              {
                id: '01',
                title: 'FERRETERÍA FAMILIAR',
                tagline: 'El negocio que se construye en familia.',
                summary: 'Reconocemos a las ferreterías que han logrado convertir un negocio familiar en un legado compartido, donde generaciones, valores y relaciones construyen juntos el futuro de la empresa.',
                details: {
                  intro: 'No importa únicamente cuántos años tenga la empresa, sino la historia familiar que existe detrás de ella y cómo esa familia ha logrado mantener, evolucionar y fortalecer el negocio.',
                  target: 'Ferreterías donde exista una participación activa de la familia en la dirección, gestión o desarrollo del negocio.',
                  criteria: [
                    { label: 'Participación familiar', text: 'presencia activa de padres, hijos, hermanos u otros miembros de la familia.' },
                    { label: 'Segunda generación', text: 'incorporación de nuevas generaciones al negocio.' },
                    { label: 'Continuidad empresarial', text: 'existencia de una visión de permanencia y futuro.' },
                    { label: 'Valores familiares', text: 'principios y cultura que forman parte de la manera de hacer negocios.' },
                    { label: 'Relación con la comunidad', text: 'vínculo, servicio y aporte a su entorno.' },
                    { label: 'Historia y legado', text: 'una trayectoria construida alrededor de la familia y el negocio.' }
                  ],
                  recognition: 'Una familia que no solamente heredó un negocio, sino que decidió hacerlo crecer.'
                }
              },
              {
                id: '02',
                title: 'FERRETERÍA ORO',
                tagline: '25+ años construyendo historia.',
                summary: 'Un reconocimiento a las ferreterías que han convertido la trayectoria, la confianza y la capacidad de evolucionar en parte de su legado. Celebramos 25 años o más de historia vigentes en el mercado.',
                details: {
                  intro: 'Porque permanecer no es simplemente resistir al paso del tiempo. Es evolucionar, reinventarse y seguir construyendo. 25 años no son solamente trayectoria: son confianza construida.',
                  target: 'Ferreterías con 25 años o más de operación, independientemente de su tamaño o modelo de negocio.',
                  criteria: [
                    { label: 'Trayectoria', text: '25+ años de existencia y operación continua.' },
                    { label: 'Permanencia', text: 'capacidad de mantenerse y consolidarse a través del tiempo.' },
                    { label: 'Evolución', text: 'adaptación a los cambios del mercado y las nuevas necesidades de los clientes.' },
                    { label: 'Reputación', text: 'reconocimiento y confianza construida dentro de su comunidad.' },
                    { label: 'Fidelidad de clientes', text: 'relaciones comerciales sostenidas a lo largo de los años.' },
                    { label: 'Aporte al sector', text: 'contribución al crecimiento y fortalecimiento de la industria ferretera.' }
                  ],
                  recognition: 'No solamente los años cumplidos, sino todo lo que una empresa ha construido durante esos años. Miles de clientes, relaciones, decisiones, desafíos y aprendizajes.'
                }
              },
              {
                id: '03',
                title: 'FERRETERÍA PROMESA',
                tagline: 'El futuro de la industria comienza con quienes se atreven a construirlo.',
                summary: 'Reconoce a aquellas ferreterías que están demostrando un potencial extraordinario para convertirse en referentes. Buscamos a la empresa que está haciendo las cosas diferente, creciendo e innovando.',
                details: {
                  intro: 'No buscamos solamente a la ferretería más nueva. Buscamos a esa empresa que está haciendo las cosas diferente, que está creciendo, innovando, profesionalizándose y marcando una nueva dirección.',
                  target: 'Ferreterías jóvenes o nuevos negocios en proceso de transformación que estén demostrando visión, crecimiento, innovación y potencial de liderazgo dentro del sector.',
                  criteria: [
                    { label: 'Antigüedad', text: 'menos de 5 años en el mercado nicaragüense.' },
                    { label: 'Crecimiento', text: 'crecimiento visible y sostenido año tras año.' },
                    { label: 'Expansión', text: 'aumento de puntos de venta, cobertura, productos o servicios.' },
                    { label: 'Reputación', text: 'percepción positiva y reconocimiento dentro del mercado.' },
                    { label: 'Posicionamiento', text: 'presencia y reconocimiento alcanzado en poco tiempo.' },
                    { label: 'Innovación', text: 'formas nuevas o diferentes de hacer negocio.' },
                    { label: 'Impacto', text: 'reconocimiento y valor que genera en clientes, proveedores y comunidad.' }
                  ],
                  recognition: 'Una ferretería que todavía está escribiendo su historia, pero que ya está demostrando que tiene todo para convertirse en referente. Hoy es una promesa. Mañana puede ser parte de la historia.'
                }
              }
            ];

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {awardsData.map((award) => (
                  <div 
                    key={award.id} 
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedAward(award)}
                  >
                    <div className="bg-white border border-gray-200/90 p-7 pt-11 rounded-2xl transition-all duration-300 group-hover:border-[#f39200] group-hover:shadow-2xl relative min-h-[260px] flex flex-col justify-between hover:-translate-y-1">
                      <div className="absolute -top-4 left-6 px-4 py-1.5 bg-[#8c4900] text-white font-black text-sm rounded-lg shadow-md group-hover:bg-[#f39200] transition-colors">
                        {award.id}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-[#1e293b] mb-1.5 group-hover:text-[#283474] transition-colors leading-snug">
                          {award.title}
                        </h3>
                        <p className="text-base font-extrabold text-[#8c4900] mb-3 group-hover:text-[#f39200] transition-colors">
                          {award.tagline}
                        </p>
                        <p className="text-base text-gray-700 leading-relaxed font-normal">
                          {award.summary}
                        </p>
                      </div>

                      <div className="mt-6 pt-3.5 border-t border-gray-100 flex items-center justify-between text-sm font-black text-[#8c4900] group-hover:text-[#f39200] transition-colors">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">info</span> Ver información completa
                        </span>
                        <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </div>
                    </div>

                    {/* Hover Tooltip Popup (Desktop Hover) */}
                    {award.details && (
                      <div className="hidden lg:block opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 absolute left-0 top-full mt-3 w-full z-50 pointer-events-none group-hover:pointer-events-auto">
                        <div className="bg-white text-slate-800 p-7 rounded-2xl shadow-2xl border border-gray-200 backdrop-blur-lg relative">
                          <div className="absolute -top-3 left-10 w-5 h-5 bg-white rotate-45 border-t border-l border-gray-200"></div>
                          
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="bg-[#8c4900] text-white text-sm font-black px-3 py-1 rounded-md">{award.id}</span>
                              <h4 className="font-black text-[#283474] text-lg">{award.title}</h4>
                            </div>
                            <span className="text-xs text-[#f39200] font-black">Haz clic para ver más</span>
                          </div>

                          <p className="text-sm text-gray-800 mb-3.5 italic font-medium bg-amber-50/90 p-3 rounded-xl border border-amber-100/90 leading-relaxed">
                            "{award.details.intro}"
                          </p>

                          <div className="text-sm space-y-1 mb-3.5">
                            <p className="font-black text-[#8c4900]">¿A quién está dirigido?</p>
                            <p className="text-gray-700 leading-relaxed">{award.details.target}</p>
                          </div>

                          {award.details.criteria && (
                            <div className="text-sm space-y-1">
                              <p className="font-black text-[#8c4900]">Criterios clave:</p>
                              <ul className="space-y-1.5 pl-1">
                                {award.details.criteria.slice(0, 3).map((c, i) => (
                                  <li key={i} className="flex items-start gap-2 text-gray-700 text-xs md:text-sm">
                                    <span className="text-[#f39200] font-bold text-base">•</span>
                                    <span><strong className="text-gray-900 font-bold">{c.label}:</strong> {c.text}</span>
                                  </li>
                                ))}
                                {award.details.criteria.length > 3 && (
                                  <li className="text-xs text-[#8c4900] font-black pt-1">
                                    + {award.details.criteria.length - 3} criterios más...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Modal Overlay for Full Details (Click / Mobile) */}
          {selectedAward && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white text-[#1e293b] rounded-2xl max-w-3xl w-full p-7 md:p-10 max-h-[90vh] overflow-y-auto shadow-2xl relative border border-gray-100">
                <button 
                  onClick={() => setSelectedAward(null)}
                  className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2.5 rounded-full transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>

                <div className="inline-block bg-[#8c4900] text-white font-black px-4 py-1.5 rounded-lg text-sm tracking-wider uppercase mb-3 shadow-sm">
                  Categoría {selectedAward.id}
                </div>

                <h3 className="text-3xl md:text-4xl font-black text-[#283474] mb-1.5">
                  {selectedAward.title}
                </h3>
                <p className="text-lg md:text-xl font-bold text-[#8c4900] mb-5 italic">
                  "{selectedAward.tagline}"
                </p>

                <div className="space-y-6 text-gray-700 leading-relaxed border-t border-gray-100 pt-5">
                  <p className="font-medium text-lg md:text-xl bg-amber-50/90 p-5 rounded-2xl border border-amber-100 text-amber-950 leading-relaxed">
                    {selectedAward.summary}
                  </p>

                  {selectedAward.details ? (
                    <>
                      <div>
                        <h4 className="font-black text-sm md:text-base uppercase tracking-wider text-[#8c4900] mb-1.5">Historia y Propósito</h4>
                        <p className="text-gray-700 text-base md:text-lg leading-relaxed">{selectedAward.details.intro}</p>
                      </div>

                      <div>
                        <h4 className="font-black text-sm md:text-base uppercase tracking-wider text-[#8c4900] mb-1.5">¿A quién está dirigido?</h4>
                        <p className="text-gray-700 text-base md:text-lg leading-relaxed">{selectedAward.details.target}</p>
                      </div>

                      <div>
                        <h4 className="font-black text-sm md:text-base uppercase tracking-wider text-[#8c4900] mb-3">Criterios de evaluación</h4>
                        <ul className="grid grid-cols-1 gap-3 text-base md:text-lg">
                          {selectedAward.details.criteria.map((c, idx) => (
                            <li key={idx} className="flex items-start gap-3.5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                              <span className="material-symbols-outlined text-[#8c4900] text-2xl mt-0.5 shrink-0">verified</span>
                              <div className="leading-relaxed">
                                <strong className="text-gray-900 font-bold">{c.label}:</strong> <span className="text-gray-700">{c.text}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-[#283474] text-white p-6 rounded-2xl shadow-sm flex items-start gap-4">
                        <span className="material-symbols-outlined text-[#f39200] text-4xl shrink-0 mt-0.5">emoji_events</span>
                        <div>
                          <h5 className="font-black text-sm uppercase tracking-wider text-[#f39200] mb-1">¿Qué queremos reconocer?</h5>
                          <p className="text-base md:text-lg font-bold text-white leading-relaxed">{selectedAward.details.recognition}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl">
                      <span className="material-symbols-outlined text-5xl text-gray-400 mb-2">pending</span>
                      <p className="font-medium text-base">Los criterios detallados de esta categoría serán publicados próximamente.</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-5 border-t border-gray-100 text-right">
                  <button
                    onClick={() => setSelectedAward(null)}
                    className="px-8 py-3 bg-[#283474] hover:bg-[#1e2756] text-white font-black text-base rounded-xl transition-colors shadow-md"
                  >
                    Entendido / Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
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
                    <p className="font-body-md text-surface-variant">Registro 7:30am | Inicia 8:00am a 5:00pm | Finalizando con Cóctel</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary-fixed text-3xl">meeting_room</span>
                  <div>
                    <p className="font-headline-md text-headline-md text-white">Centro de Convenciones Crowne Plaza</p>
                    <p className="font-body-md text-surface-variant">Managua, Nicaragua.</p>
                  </div>
                </div>
              </div>

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
              {formState === 'pending_approval' && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-center p-8 z-10 overflow-y-auto">
                  <span className="material-symbols-outlined text-6xl text-[#f39200] mb-2">hourglass_empty</span>
                  <h3 className="font-headline-lg text-2xl text-[#1e293b] font-bold mb-2">Preregistro Recibido</h3>
                  <p className="text-[#475569] mb-6">Tu solicitud está en revisión por la administración. Te notificaremos una vez sea aprobada para entregarte tu acceso.</p>
                  
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

      {currentView === 'adminCheckIn' && (
        <AdminCheckIn onBack={(view) => setCurrentView(view || 'adminHub')} />
      )}

      {currentView === 'adminAttendanceReport' && (
        <AdminAttendanceReport onBack={() => setCurrentView('adminHub')} />
      )}

      {currentView === 'adminMarketingReport' && (
        <AdminMarketingReport onBack={() => setCurrentView('adminHub')} />
      )}

      {currentView === 'adminSponsorsHub' && (
        <AdminSponsorsHub onBack={() => setCurrentView('adminHub')} onNavigate={(v) => setCurrentView(v)} adminUser={adminUser} />
      )}

      {currentView === 'adminPanel' && (
        <AdminPanel onBack={() => setCurrentView('adminSponsorsHub')} adminUser={adminUser} />
      )}


      {currentView === 'adminGlobalLeads' && (
        <AdminGlobalLeads onBack={() => setCurrentView('adminSponsorsHub')} />
      )}
      {currentView === 'adminPreRegistrations' && (
        <AdminPreRegistrations onBack={() => setCurrentView('adminHub')} adminUser={adminUser} />
      )}
      {currentView === 'adminPushNotifications' && (
        <AdminPushNotifications onBack={() => setCurrentView('adminHub')} />
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

      {currentView === 'speakerRegistration' && (
        <SpeakerForm onClose={() => setCurrentView('landing')} />
      )}

      {/* Footer */}
      <footer className="w-full bg-inverse-surface border-t-4 border-primary p-stack-lg relative z-10">
        <div className="container mx-auto relative flex flex-col md:flex-row items-center justify-center w-full">
          
          <div className="flex flex-col items-center space-y-stack-sm w-full">
            <div className="font-headline-md text-headline-md text-primary font-bold">EXPO FERRE</div>
            <div className="flex justify-center gap-8 mb-4 flex-wrap">
              <button onClick={() => setCurrentView('privacyPolicy')} className="text-surface-variant hover:text-primary transition-colors font-body-md">Políticas de Privacidad</button>
              <button onClick={() => setCurrentView('termsOfService')} className="text-surface-variant hover:text-primary transition-colors font-body-md">Términos de Servicio</button>
              <button onClick={() => setCurrentView('adminHub')} className="text-surface-variant hover:text-primary transition-colors font-body-md opacity-30 hover:opacity-100">Intranet</button>
            </div>
            <p className="font-body-md text-body-md text-surface-variant">© 2026 EXPO FERRE. TODOS LOS DERECHOS RESERVADOS.</p>
          </div>

          {/* Logo Right Side */}
          <div className="md:absolute right-0 top-1/2 md:-translate-y-1/2 flex flex-col items-center md:items-end mt-8 md:mt-0">
            <p className="text-surface-variant text-[10px] mb-2 uppercase tracking-widest font-bold">powered for</p>
            <img src="/logorinsa-v2.jpeg" alt="Powered for" className="h-16 object-contain rounded" />
          </div>

        </div>
      </footer>

    </>
  );
}
