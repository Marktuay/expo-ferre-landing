import React, { useState } from 'react';
import SpeakerForm from './SpeakerForm';
import GuestForm from './GuestForm';
import InteractiveMap from './InteractiveMap';
import SponsorActivity from './SponsorActivity';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';

const SponsorDashboard = ({ onBack, onStaffRegistration, onContact }) => {
  const [activeForm, setActiveForm] = useState(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onBack(); // Return to landing after logout
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const cardStyle = "bg-surface border border-outline-variant hover:hard-shadow transition-all p-6 md:p-8 rounded-5px flex flex-col justify-between gap-6 group h-full";
  const btnStyle = "w-full bg-primary-container text-on-primary-container font-bold py-3 px-8 rounded-5px hover:brightness-110 active:scale-95 transition-all text-center";

  if (activeForm === 'speaker') {
    return <SpeakerForm onClose={() => setActiveForm(null)} />;
  }

  if (activeForm === 'guest') {
    return <GuestForm onBack={() => setActiveForm(null)} />;
  }

  if (activeForm === 'activity') {
    return <SponsorActivity onBack={() => setActiveForm(null)} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-background relative overflow-x-hidden pt-40 md:pt-48 pb-20">
      <div className="relative z-10 container mx-auto px-margin-mobile md:px-margin-desktop max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <div className="bg-primary text-on-primary inline-block px-4 py-1 font-label-sm text-label-sm uppercase tracking-widest clip-industrial mb-4">ÁREA PRIVADA</div>
            <h1 className="font-headline-xl text-headline-xl md:text-5xl text-secondary">PANEL DE PATROCINADORES</h1>
          </div>
          
          {auth.currentUser && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-outline-variant flex flex-col items-center gap-2">
              <QRCodeSVG value={auth.currentUser.uid} size={100} level="M" />
              <span className="font-label-sm text-on-surface-variant">Mi Código QR</span>
            </div>
          )}
        </div>

        <div className="space-y-16">
          {/* MI ACTIVIDAD */}
          <section>
            <div className="bg-surface border-2 border-primary hover:hard-shadow transition-all p-6 md:p-8 rounded-5px flex flex-col md:flex-row justify-between items-center gap-6 group mb-8">
              <div>
                <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2"><span className="material-symbols-outlined text-3xl">dashboard</span> MI ACTIVIDAD Y REGISTROS</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">Revisa todos los invitados, staff, conferencias y stands que has registrado como patrocinador.</p>
              </div>
              <button onClick={() => setActiveForm('activity')} className="bg-primary text-on-primary font-bold py-3 px-8 rounded-5px hover:brightness-110 active:scale-95 transition-all whitespace-nowrap">
                VER MI ACTIVIDAD
              </button>
            </div>
          </section>

          {/* PRESENCIAL SECTION */}
          <section>
            <h2 className="font-headline-lg text-headline-lg text-primary border-l-4 border-secondary pl-4 mb-8">GESTIÓN DE PARTICIPACIÓN</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">map</span> SELECCIONA TU UBICACIÓN</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Reserva tu espacio en el mapa interactivo del evento.</p>
                </div>
                <button onClick={() => setActiveForm('map')} className={btnStyle}>SELECCIONAR</button>
              </div>

              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">groups</span> LISTA DE INVITADOS</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Completa el registro de tus invitados VIP para el evento.</p>
                </div>
                <button onClick={() => setActiveForm('guest')} className={btnStyle}>COMPLETAR</button>
              </div>

              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">mic</span> INFORMACIÓN DE CONFERENCIAS</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Gestiona tus conferencias presenciales y virtuales.</p>
                </div>
                <button onClick={() => setActiveForm('speaker')} className={btnStyle}>COMPLETAR</button>
              </div>

              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">badge</span> ACREDITACIÓN STAFF</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Con este registro llegarán las entradas al evento y los accesos a la app virtual.</p>
                </div>
                <button onClick={onStaffRegistration} className={btnStyle}>COMPLETAR</button>
              </div>
            </div>
          </section>


        </div>
      </div>

      {activeForm === 'map' && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-4 md:p-8 overflow-hidden flex flex-col animate-in fade-in duration-300">
          <InteractiveMap onBack={() => setActiveForm(null)} />
        </div>
      )}
    </div>
  );
};

export default SponsorDashboard;
