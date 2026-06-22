import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import PrintableBadgeList from './PrintableBadgeList';

export default function AdminGuests({ onBack }) {
  const [guestsList, setGuestsList] = useState([]);
  const [sponsorsMap, setSponsorsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [printItems, setPrintItems] = useState(null);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const qSponsors = query(collection(db, 'users'), where('role', '==', 'sponsor'));
        const snap = await getDocs(qSponsors);
        const map = {};
        snap.forEach(doc => {
          map[doc.id] = doc.data().companyName || doc.data().name || 'Patrocinador Desconocido';
        });
        setSponsorsMap(map);
      } catch (err) {
        console.error("Error fetching sponsors", err);
      }
    };
    fetchSponsors();

    const q = query(collection(db, `${getEventBasePath()}/guests`));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      results.sort((a, b) => b.createdAt - a.createdAt);
      
      setGuestsList(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching guests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (printItems) {
    return (
      <PrintableBadgeList 
        items={printItems} 
        roleLabel="Invitado VIP"
        colorClass="border-blue-500 text-blue-500"
        onClose={() => setPrintItems(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Lista de Invitados VIP</h1>
            <p className="text-body-lg text-secondary">Invitados registrados por los patrocinadores.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setPrintItems(guestsList)}
              disabled={guestsList.length === 0}
              className="px-5 py-2 bg-primary text-on-primary border border-primary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">print</span>
              Imprimir Todos
            </button>
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = guestsList.map(g => ({
                  Fecha: g.createdAt.toLocaleDateString() + ' ' + g.createdAt.toLocaleTimeString(),
                  Nombre: g.nombre || '',
                  Email: g.email || '',
                  Teléfono: g.telefono || '',
                  Empresa: g.empresa || '',
                  Cargo: g.cargo || '',
                  'Cantidad de Empleados': g.empleados || '',
                  'Patrocinador (Nombre)': sponsorsMap[g.sponsorId] || 'Desconocido',
                  'Patrocinador (Email)': g.sponsorEmail || 'Desconocido',
                  SponsorID: g.sponsorId || ''
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Invitados");
                XLSX.writeFile(workbook, "Lista_Invitados.xlsx");
              });
            }} className="px-5 py-2 bg-[#217346] text-white border border-[#217346] rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">download</span>
              Exportar Excel
            </button>
            <button onClick={onBack} className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Volver al Menú
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-variant/30 border-b border-outline-variant">
                  <th className="p-4 font-bold text-on-surface">Nombre</th>
                  <th className="p-4 font-bold text-on-surface">Email</th>
                  <th className="p-4 font-bold text-on-surface">Teléfono</th>
                  <th className="p-4 font-bold text-on-surface">Empresa</th>
                  <th className="p-4 font-bold text-on-surface">Cargo</th>
                  <th className="p-4 font-bold text-on-surface">Empleados</th>
                  <th className="p-4 font-bold text-on-surface">Patrocinador</th>
                  <th className="p-4 font-bold text-on-surface">Registrado Por</th>
                  <th className="p-4 font-bold text-on-surface">Fecha</th>
                  <th className="p-4 font-bold text-on-surface text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="p-8 text-center text-secondary">
                      Cargando datos...
                    </td>
                  </tr>
                ) : guestsList.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-8 text-center text-secondary">
                      No hay invitados registrados.
                    </td>
                  </tr>
                ) : (
                  guestsList.map((guest) => (
                    <tr key={guest.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 text-on-surface font-medium">{guest.nombre}</td>
                      <td className="p-4 text-secondary">{guest.email}</td>
                      <td className="p-4 text-secondary">{guest.telefono}</td>
                      <td className="p-4 text-secondary">{guest.empresa}</td>
                      <td className="p-4 text-secondary">{guest.cargo}</td>
                      <td className="p-4 text-secondary">{guest.empleados}</td>
                      <td className="p-4 text-secondary font-bold text-sm text-primary">{sponsorsMap[guest.sponsorId] || 'Desconocido'}</td>
                      <td className="p-4 text-secondary text-sm font-bold">{guest.sponsorEmail || 'N/A'}</td>
                      <td className="p-4 text-secondary">{guest.createdAt.toLocaleDateString()}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setPrintItems([guest])}
                          className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                          title="Imprimir Gafete"
                        >
                          <span className="material-symbols-outlined">print</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
