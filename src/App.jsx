import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import SponsorDashboard from './components/SponsorDashboard';
import AdminPanel from './components/AdminPanel';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [formState, setFormState] = useState('idle'); // 'idle', 'submitting', 'success'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    setFormState('submitting');
    setTimeout(() => {
      setFormState('success');
      setTimeout(() => {
        setFormState('idle');
        e.target.reset();
      }, 3000);
    }, 1500);
  };


  return (
    <>
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg bg-background/90 backdrop-blur-md border-b border-outline-variant py-2' : 'bg-background py-4'} flex justify-between items-center px-margin-mobile md:px-margin-desktop`}>
        <div className="flex items-center">
          <img src="/Expoferre.png" alt="Expo Ferre Logo" className="h-16 w-auto object-contain" />
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => setCurrentView('landing')} className="flex items-center gap-1 font-bold font-body-md transition-colors text-primary hover:text-primary-container active:text-primary">
            <span className="material-symbols-outlined text-[20px]">home</span> Inicio
          </button>
          <button onClick={() => setCurrentView('sponsorDashboard')} className="flex items-center gap-1 transition-colors font-body-md text-on-background hover:text-primary active:text-primary">
            <span className="material-symbols-outlined text-[20px]">military_tech</span> Sponsors
          </button>
          <button onClick={() => { setCurrentView('landing'); setTimeout(() => window.location.hash = 'awards', 100); }} className="flex items-center gap-1 transition-colors font-body-md text-on-background hover:text-primary active:text-primary">
            <span className="material-symbols-outlined text-[20px]">emoji_events</span> Premios
          </button>
          <button onClick={() => { setCurrentView('landing'); setTimeout(() => window.location.hash = 'contact', 100); }} className="flex items-center gap-1 transition-colors font-body-md text-on-background hover:text-primary active:text-primary">
            <span className="material-symbols-outlined text-[20px]">mail</span> Contacto
          </button>
        </nav>
      </header>

      {currentView === 'landing' && (
        <main className="pt-16 pb-20 md:pb-0">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center py-stack-lg px-margin-mobile overflow-hidden rounded-5px">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img 
              className="w-full h-[130%] -top-[15%] absolute object-cover brightness-[0.4] will-change-transform" 
              style={{ transform: `translateY(${scrollY * 0.3}px)` }}
              alt="Warehouse" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqYETC7cHNrtvt8G3DA13OzmlhOVAc6LA_Jh-YrbPZPy6mnVjZFTCIw_lA2svz8Sl6FGD1leRoT8Zu9D17u9IY-QPHqBLq34ZN8Ae-qAQEBSrs-eNwUWfecw7bPDrsGPlOmvvu3wNICXZkP6vJTy3api5h6kyoAjRv0iA9JjYCxYQJ-rQB3-8I8Svo7Yv-Z6WASoXiYUqpPZAWZ1DDxkUdld4GfZZtr37TCrcd0AmYSNQN2-oqSjDgjERjgikZL0YbwyM3tE4F8Zct" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/90 via-inverse-surface/50 to-transparent"></div>
          </div>
          <div className="relative z-10 container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-stack-lg items-center mt-10">
            <div className="lg:col-span-7 text-white space-y-stack-sm">
              <FadeIn>
                <div className="bg-primary text-on-primary inline-block px-4 py-1 font-label-sm text-label-sm uppercase tracking-widest clip-industrial mb-4">CONSTRUYENDO EL FUTURO</div>
                <h1 className="font-headline-xl text-headline-xl lg:text-7xl leading-tight text-white drop-shadow-lg">IMPULSANDO LA INDUSTRIA FERRETERA</h1>
                <p className="font-body-lg text-body-lg max-w-xl opacity-90 mt-4 text-surface-container-lowest drop-shadow-md">Únete al evento líder de hardware y construcción en la región. Innovación, networking y negocios en un solo lugar.</p>
              </FadeIn>
              <div className="flex gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-fixed-dim">calendar_today</span>
                  <span className="font-label-sm">17 de Octubre, 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-fixed-dim">location_on</span>
                  <span className="font-label-sm">Crowne Plaza, Managua</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="bg-surface-container-lowest bg-opacity-50 backdrop-blur-md p-8 border border-outline-variant hard-shadow-orange rounded-5px">
                <h2 className="font-headline-md text-headline-md text-on-background mb-6">REGISTRARSE</h2>
                <form className="space-y-4" onSubmit={handleRegister}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group relative">
                      <label className="block font-label-sm text-on-surface-variant mb-1 transition-colors group-focus-within:text-primary">Nombre Completo</label>
                      <input className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all p-3 rounded-md shadow-inner" placeholder="Ej: Juan Pérez" type="text" required />
                    </div>
                    <div className="group relative">
                      <label className="block font-label-sm text-on-surface-variant mb-1 transition-colors group-focus-within:text-primary">Empresa</label>
                      <input className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all p-3 rounded-md shadow-inner" placeholder="Nombre de su negocio" type="text" required />
                    </div>
                    <div className="group relative">
                      <label className="block font-label-sm text-on-surface-variant mb-1 transition-colors group-focus-within:text-primary">Correo Electrónico</label>
                      <input className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all p-3 rounded-md shadow-inner" placeholder="correo@ejemplo.com" type="email" required />
                    </div>
                    <div className="group relative">
                      <label className="block font-label-sm text-on-surface-variant mb-1 transition-colors group-focus-within:text-primary">Teléfono</label>
                      <input className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all p-3 rounded-md shadow-inner" placeholder="+505 8000 0000" type="tel" required />
                    </div>
                  </div>
                  <button 
                    className={`relative overflow-hidden w-full py-4 font-headline-md text-headline-md font-bold uppercase tracking-tight hover:brightness-110 active:scale-[0.98] transition-all mt-4 rounded-5px flex items-center justify-center gap-2 ${
                      formState === 'success' ? 'bg-green-600 text-white' : 'bg-primary-container text-on-primary-container'
                    }`} 
                    type="submit"
                    disabled={formState !== 'idle'}
                  >
                    {formState === 'idle' && 'REGISTRARSE AHORA'}
                    {formState === 'submitting' && (
                      <>
                        <span className="material-symbols-outlined animate-spin">refresh</span> PROCESANDO...
                      </>
                    )}
                    {formState === 'success' && (
                      <>
                        <span className="material-symbols-outlined animate-bounce">check_circle</span> ¡REGISTRADO CON ÉXITO!
                      </>
                    )}
                  </button>
                  <p className="text-center font-label-sm text-on-surface-variant opacity-70 mt-2">Acceso exclusivo para profesionales del sector.</p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* What is Expo Ferre */}
        <section className="py-stack-lg px-margin-mobile container mx-auto rounded-5px overflow-hidden">
          <FadeIn direction="up">
            <div className="max-w-3xl mb-stack-lg">
              <h2 className="font-headline-lg text-headline-lg text-secondary border-l-4 border-primary pl-4 mb-4">¿QUÉ ES EXPO FERRE?</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Expo Ferre 2026 es el epicentro de la industria ferretera, donde los principales proveedores, fabricantes y compradores se reúnen para forjar las alianzas que moverán el mercado el próximo año.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-md">
            <FadeIn delay={100} direction="up">
              <div className="p-8 bg-surface border border-outline-variant hover:hard-shadow transition-all group rounded-5px h-full">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 group-hover:scale-110 transition-transform">hub</span>
                <h3 className="font-headline-md text-headline-md text-secondary mb-2">NETWORKING</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Conecte directamente con tomadores de decisiones y amplíe su red de contactos estratégicos en el sector.</p>
              </div>
            </FadeIn>
            <FadeIn delay={200} direction="up">
              <div className="p-8 bg-surface border border-outline-variant hover:hard-shadow transition-all group rounded-5px h-full">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 group-hover:scale-110 transition-transform">lightbulb</span>
                <h3 className="font-headline-md text-headline-md text-secondary mb-2">INNOVACIÓN</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Descubra las últimas herramientas, materiales y tecnologías que están transformando la construcción moderna.</p>
              </div>
            </FadeIn>
            <FadeIn delay={300} direction="up">
              <div className="p-8 bg-surface border border-outline-variant hover:hard-shadow transition-all group rounded-5px h-full">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 group-hover:scale-110 transition-transform">trending_up</span>
                <h3 className="font-headline-md text-headline-md text-secondary mb-2">NEGOCIOS</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Acceda a ofertas exclusivas de feria y cierre contratos de suministro con precios preferenciales.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Sponsorships */}
        <section className="py-stack-lg bg-inverse-surface text-surface px-margin-mobile rounded-5px">
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
            <div className="h-64 md:h-96 bg-surface-container-highest border border-outline relative overflow-hidden rounded-5px">
              <iframe 
                className="w-full h-full grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                src="https://www.google.com/maps?q=4PVG+69+Managua&output=embed"
                frameBorder="0"
                style={{ border: 0 }}
                allowFullScreen=""
                aria-hidden="false"
                tabIndex="0"
              ></iframe>
            </div>
          </div>
        </section>
        </main>
      )}

      {currentView === 'sponsorDashboard' && (
        <SponsorDashboard onBack={() => setCurrentView('landing')} />
      )}

      {currentView === 'adminPanel' && (
        <AdminPanel onBack={() => setCurrentView('landing')} />
      )}

      {/* Footer */}
      <footer className="w-full bg-inverse-surface border-t-4 border-primary p-stack-lg space-y-stack-sm text-center relative z-10">
          <div className="font-headline-md text-headline-md text-primary font-bold">EXPO FERRE</div>
          <div className="flex justify-center gap-8 mb-4">
            <a className="text-surface-variant hover:text-primary transition-colors font-body-md" href="#">Privacy Policy</a>
            <a className="text-surface-variant hover:text-primary transition-colors font-body-md" href="#">Terms of Service</a>
            <a className="text-surface-variant hover:text-primary transition-colors font-body-md" href="#">Press Kit</a>
            <button onClick={() => setCurrentView('adminPanel')} className="text-surface-variant hover:text-primary transition-colors font-body-md opacity-30 hover:opacity-100">Intranet</button>
          </div>
          <p className="font-body-md text-body-md text-surface-variant">© 2026 EXPO FERRE. ALL RIGHTS RESERVED.</p>
        </footer>

      {/* BottomNavBar (Mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-secondary/90 backdrop-blur-md flex justify-around items-center h-[72px] px-2 shadow-[0_-4px_0_0_rgba(138,81,0,0.8)] border-t border-white/10 pb-safe">
        <button onClick={() => setCurrentView('landing')} className={`group flex flex-col items-center justify-center transition-all active:scale-95 px-3 py-1 ${currentView === 'landing' ? 'text-primary' : 'text-on-secondary/70 hover:text-primary'}`}>
          <span className="material-symbols-outlined transition-transform group-active:scale-110 group-hover:-translate-y-1">home</span>
          <span className="font-label-sm text-[10px] mt-1 font-bold">Inicio</span>
        </button>
        <button onClick={() => setCurrentView('sponsorDashboard')} className={`group flex flex-col items-center justify-center transition-all active:scale-95 px-3 py-1 ${currentView === 'sponsorDashboard' ? 'text-primary' : 'text-on-secondary/70 hover:text-primary'}`}>
          <span className="material-symbols-outlined transition-transform group-active:scale-110 group-hover:-translate-y-1">military_tech</span>
          <span className="font-label-sm text-[10px] mt-1">Sponsors</span>
        </button>
        <button onClick={() => { setCurrentView('landing'); setTimeout(() => window.location.hash = 'awards', 100); }} className="group flex flex-col items-center justify-center text-on-secondary/70 hover:text-primary transition-all active:scale-95 px-3 py-1">
          <span className="material-symbols-outlined transition-transform group-active:scale-110 group-hover:-translate-y-1">emoji_events</span>
          <span className="font-label-sm text-[10px] mt-1">Premios</span>
        </button>
        <button onClick={() => { setCurrentView('landing'); setTimeout(() => window.location.hash = 'contact', 100); }} className="group flex flex-col items-center justify-center text-on-secondary/70 hover:text-primary transition-all active:scale-95 px-3 py-1">
          <span className="material-symbols-outlined transition-transform group-active:scale-110 group-hover:-translate-y-1">mail</span>
          <span className="font-label-sm text-[10px] mt-1">Contacto</span>
        </button>
      </nav>
    </>
  );
}
