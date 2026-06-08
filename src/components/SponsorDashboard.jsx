import React, { useState } from 'react';
import SpeakerForm from './SpeakerForm';
import InteractiveMap from './InteractiveMap';

const SponsorDashboard = ({ onBack, onStaffRegistration }) => {
  const [activeForm, setActiveForm] = useState(null);

  const cardStyle = "bg-surface border border-outline-variant hover:hard-shadow transition-all p-6 rounded-5px flex flex-col md:flex-row justify-between items-center gap-4 group";
  const btnStyle = "bg-primary-container text-on-primary-container font-bold py-3 px-8 rounded-5px hover:brightness-110 active:scale-95 transition-all whitespace-nowrap";

  return (
    <div className="min-h-screen bg-background text-on-background relative overflow-x-hidden pt-24 pb-20">
      <div className="relative z-10 container mx-auto px-margin-mobile md:px-margin-desktop max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <div className="bg-primary text-on-primary inline-block px-4 py-1 font-label-sm text-label-sm uppercase tracking-widest clip-industrial mb-4">ÁREA PRIVADA</div>
            <h1 className="font-headline-xl text-headline-xl md:text-5xl text-secondary">PANEL DE PATROCINADORES</h1>
          </div>
          <button onClick={onBack} className="text-on-surface-variant hover:text-primary flex items-center gap-2 border-2 border-outline-variant hover:border-primary px-6 py-2 rounded-5px transition-colors cursor-pointer font-bold bg-surface">
            <span className="material-symbols-outlined">arrow_back</span>
            Volver al Inicio
          </button>
        </div>

        <div className="space-y-16">
          {/* PRESENCIAL SECTION */}
          <section>
            <h2 className="font-headline-lg text-headline-lg text-primary border-l-4 border-secondary pl-4 mb-8">FORMATO PRESENCIAL</h2>
            
            <div className="space-y-4">
              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary">Selección de espacio corporativo</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Reserva tu espacio en el mapa interactivo del evento.</p>
                </div>
                <button onClick={() => setActiveForm('map')} className={btnStyle}>SELECCIONAR</button>
              </div>

              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary">Descargar formato de invitados</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Descarga el documento y compártelo con el ejecutivo a cargo de tu cuenta.</p>
                </div>
                <button className={btnStyle}>DESCARGAR</button>
              </div>

              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary">Alta de conferencias</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Gestiona tus conferencias presenciales y virtuales.</p>
                </div>
                <button onClick={() => setActiveForm('speaker')} className={btnStyle}>COMPLETAR</button>
              </div>

              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary">Registro de staff</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Con este registro llegarán las entradas al evento y los accesos a la app virtual.</p>
                </div>
                <button onClick={onStaffRegistration} className={btnStyle}>COMPLETAR</button>
              </div>
            </div>
          </section>

          {/* VIRTUAL SECTION */}
          <section>
            <h2 className="font-headline-lg text-headline-lg text-secondary border-l-4 border-primary pl-4 mb-8">FORMATO VIRTUAL</h2>
            
            <div className="space-y-4">
              <div className={cardStyle}>
                <div>
                  <h3 className="font-headline-md text-headline-md text-secondary">Alta de Stand Virtual</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Configura la información y recursos de tu stand en la plataforma digital.</p>
                </div>
                <button className="bg-secondary text-white font-bold py-3 px-8 rounded-5px hover:brightness-110 active:scale-95 transition-all whitespace-nowrap">CONFIGURAR</button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {activeForm === 'speaker' && (
        <SpeakerForm onClose={() => setActiveForm(null)} />
      )}

      {activeForm === 'map' && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-4 md:p-8 overflow-hidden flex flex-col animate-in fade-in duration-300">
          <InteractiveMap onBack={() => setActiveForm(null)} />
        </div>
      )}
    </div>
  );
};

export default SponsorDashboard;
