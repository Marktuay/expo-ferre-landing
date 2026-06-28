import React, { useState } from 'react';
import SpeakerForm from './SpeakerForm';
import GuestForm from './GuestForm';
import InteractiveMap from './InteractiveMap';
import SponsorActivity from './SponsorActivity';
import SponsorScanner from './SponsorScanner';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';

const SponsorDashboard = ({ userData, onBack, onStaffRegistration, onContact }) => {
  const [activeForm, setActiveForm] = useState(null);
  
  const isApproved = userData?.status === 'approved' || !userData?.status; // Fallback to approved if no status field (old accounts)

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
  const disabledBtnStyle = "w-full bg-surface-variant text-on-surface-variant font-bold py-3 px-8 rounded-5px cursor-not-allowed opacity-60 text-center";

  if (activeForm === 'speaker') {
    return <SpeakerForm onClose={() => setActiveForm(null)} />;
  }

  if (activeForm === 'guest') {
    return <GuestForm onBack={() => setActiveForm(null)} />;
  }

  if (activeForm === 'activity') {
    return <SponsorActivity onBack={() => setActiveForm(null)} />;
  }

  if (activeForm === 'scanner') {
    return <SponsorScanner onBack={() => setActiveForm(null)} />;
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
        </div>

        {!isApproved ? (
          <div className="bg-[#FFF3CD] border-l-4 border-[#FFC107] p-8 mt-12 text-[#856404] rounded-r-md shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-4xl">pending_actions</span>
              <h4 className="font-bold text-2xl">Cuenta en Revisión</h4>
            </div>
            <p className="text-lg mb-6">
              Tu cuenta de patrocinador está pendiente de validación administrativa. Deberás esperar a que un administrador confirme tu participación o pago para poder acceder a las herramientas (Reserva de stand, gafetes, escáner, etc.).
            </p>
            <button onClick={handleLogout} className="bg-[#856404] text-white px-6 py-2 rounded-md hover:bg-[#664d03] transition-colors font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">logout</span>
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div className="space-y-16 mt-8">
          {/* MI ACTIVIDAD Y LEADS */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-surface border-2 border-primary hover:hard-shadow transition-all p-6 md:p-8 rounded-5px flex flex-col justify-between items-start gap-6 group">
                <div>
                  <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2"><span className="material-symbols-outlined text-3xl">dashboard</span> MI ACTIVIDAD</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-2">Revisa todos los invitados, staff y stands que has registrado, y visualiza tus leads.</p>
                </div>
                <button onClick={() => setActiveForm('activity')} className="bg-primary text-on-primary font-bold py-3 px-8 rounded-5px hover:brightness-110 active:scale-95 transition-all w-full md:w-auto">
                  VER MI ACTIVIDAD
                </button>
              </div>

              <div className="bg-[#f39200]/10 border-2 border-[#f39200] hover:hard-shadow transition-all p-6 md:p-8 rounded-5px flex flex-col justify-between items-start gap-6 group">
                <div>
                  <h3 className="font-headline-md text-headline-md text-[#f39200] flex items-center gap-2"><span className="material-symbols-outlined text-3xl">qr_code_scanner</span> CAPTURA DE LEADS</h3>
                  <p className="font-body-md text-body-md text-[#f39200]/80 mt-2">Escanea el gafete de los visitantes en tu stand para obtener sus datos de contacto al instante.</p>
                </div>
                <button onClick={() => setActiveForm('scanner')} className="bg-[#f39200] text-white font-bold py-3 px-8 rounded-5px hover:brightness-110 active:scale-95 transition-all w-full md:w-auto">
                  ABRIR ESCÁNER
                </button>
              </div>
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
                <button onClick={() => isApproved && setActiveForm('guest')} className={isApproved ? btnStyle : disabledBtnStyle} disabled={!isApproved}>COMPLETAR</button>
              </div>

              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">mic</span> INFORMACIÓN DE CONFERENCIAS</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Gestiona tus conferencias presenciales y virtuales.</p>
                </div>
                <button onClick={() => isApproved && setActiveForm('speaker')} className={isApproved ? btnStyle : disabledBtnStyle} disabled={!isApproved}>COMPLETAR</button>
              </div>

              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary flex items-center gap-2"><span className="material-symbols-outlined text-primary text-3xl">badge</span> ACREDITACIÓN STAFF</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Con este registro llegarán las entradas al evento y los accesos a la app virtual.</p>
                </div>
                <button onClick={(e) => { if(!isApproved){ e.preventDefault(); } else { onStaffRegistration(); } }} className={isApproved ? btnStyle : disabledBtnStyle} disabled={!isApproved}>COMPLETAR</button>
              </div>
            </div>
          </section>
        </div>
        )}
      </div>

      {activeForm === 'map' && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-4 md:p-8 overflow-hidden flex flex-col animate-in fade-in duration-300">
          <InteractiveMap onBack={() => setActiveForm(null)} sponsorData={userData} />
        </div>
      )}
    </div>
  );
};

export default SponsorDashboard;
