import React from 'react';

export default function AdminSponsorsHub({ onBack, onNavigate }) {
  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Gestión de Patrocinadores</h1>
            <p className="text-body-lg text-secondary">Selecciona el panel al que deseas acceder.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={onBack} className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Volver al Hub
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button 
            onClick={() => onNavigate('adminSponsors')}
            className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group"
          >
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">handshake</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Directorio</h3>
              <p className="text-secondary text-sm">Directorio de empresas registradas.</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('adminPanel')}
            className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group"
          >
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">map</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Reservaciones</h3>
              <p className="text-secondary text-sm">Gestión de stands y ubicaciones.</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('adminSpeakers')}
            className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group"
          >
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">mic</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Conferencias</h3>
              <p className="text-secondary text-sm">Propuestas de charlas y paneles.</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('adminStaff')}
            className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group"
          >
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">badge</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Staff</h3>
              <p className="text-secondary text-sm">Personal acreditado para el evento.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
