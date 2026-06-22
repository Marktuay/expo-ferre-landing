import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import { initialStandsList } from './InteractiveMap';

export default function AdminSponsorsHub({ onBack, onNavigate, adminUser }) {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [reservedStandsCount, setReservedStandsCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);

  useEffect(() => {
    // Solo suscribirse a estas métricas si es admin
    if (adminUser?.role !== 'admin') return;

    const standsQ = query(collection(db, `${getEventBasePath()}/stands`));
    const unsubStands = onSnapshot(standsQ, (snapshot) => {
      let reserved = 0;
      let revenue = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'reserved' || data.status === 'sold') {
          reserved++;
          // Find price from initialStandsList based on id
          const standConfig = initialStandsList.find(s => s.id === doc.id);
          if (standConfig && standConfig.price) {
            // Remove non-numeric characters except dots and commas
            const priceStr = standConfig.price.replace(/[^0-9.-]+/g, "");
            const priceVal = parseFloat(priceStr);
            if (!isNaN(priceVal)) revenue += priceVal;
          }
        }
      });
      
      setReservedStandsCount(reserved);
      setTotalRevenue(revenue);
    });

    const staffQ = query(collection(db, `${getEventBasePath()}/staff`));
    const unsubStaff = onSnapshot(staffQ, (snapshot) => {
      setStaffCount(snapshot.size);
    });

    return () => {
      unsubStands();
      unsubStaff();
    };
  }, [adminUser]);

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

        {/* Dashboards Financieros y de Recursos */}
        {adminUser?.role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">payments</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Ingresos Proyectados</p>
                <p className="text-2xl font-black text-gray-800">${totalRevenue.toLocaleString()} USD</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Stands Reservados</p>
                <p className="text-2xl font-black text-gray-800">{reservedStandsCount} / {initialStandsList.length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">badge</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Staff Registrado</p>
                <p className="text-2xl font-black text-gray-800">{staffCount} personas</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          <button 
            onClick={() => onNavigate('adminGuests')}
            className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group"
          >
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">groups</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Invitados</h3>
              <p className="text-secondary text-sm">Lista de invitados VIP de patrocinadores.</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('adminGlobalLeads')}
            className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group md:col-span-1 lg:col-span-2"
          >
            <div className="w-16 h-16 bg-[#217346]/10 text-[#217346] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">assignment_ind</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Reporte Global de Leads</h3>
              <p className="text-secondary text-sm">Consolidado de todos los prospectos capturados por los patrocinadores.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
