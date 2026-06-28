import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import InteractiveMap from './InteractiveMap';

export default function AdminPanel({ onBack }) {
  const [reservedStands, setReservedStands] = useState([]);
  const [sponsors, setSponsors] = useState({});
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        const sponsorsMap = {};
        snapshot.forEach(doc => {
          if (doc.data().empresa) {
            sponsorsMap[doc.id] = doc.data().empresa;
          }
        });
        setSponsors(sponsorsMap);
      } catch (err) {
        console.error('Error fetching sponsors:', err);
      }
    };
    fetchSponsors();
  }, []);

  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/stands`), where('status', '==', 'reserved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const standsData = snapshot.docs.map(doc => doc.data());
      // Ordenar por número de stand
      standsData.sort((a, b) => {
        const numA = parseInt(a.id.split('-')[1]);
        const numB = parseInt(b.id.split('-')[1]);
        return numA - numB;
      });
      setReservedStands(standsData);
    });

    return () => unsubscribe();
  }, []);

  const handleRelease = async (standId) => {
    if (window.confirm(`¿Estás seguro de que deseas liberar el stand ${standId}? Esta acción no se puede deshacer.`)) {
      try {
        const standRef = doc(db, `${getEventBasePath()}/stands`, standId);
        await updateDoc(standRef, {
          status: 'available',
          logo: null,
          reservationDetails: null
        });
      } catch (err) {
        console.error("Error al liberar:", err);
        alert('Hubo un error al intentar liberar el stand.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-7xl mx-auto">
        {/* Header del Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Panel de Reservaciones</h1>
            <p className="text-body-lg text-secondary">Tienes {reservedStands.length} stands reservados actualmente.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = reservedStands.map(stand => ({
                  Stand: stand.name || stand.id,
                  Tamaño: stand.size || '',
                  Empresa: sponsors[stand.sponsorId] || stand.reservationDetails?.empresa || 'Sin empresa',
                  Contacto: stand.reservationDetails?.contacto || '',
                  Email: stand.reservationDetails?.email || '',
                  Teléfono: stand.reservationDetails?.telefono || ''
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Reservaciones");
                XLSX.writeFile(workbook, "Reservaciones_Stands.xlsx");
              });
            }} className="px-5 py-2 bg-[#217346] text-white border border-[#217346] rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">download</span>
              Exportar Excel
            </button>
            <button onClick={onBack} className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">home</span>
              Volver al menú
            </button>
            <button onClick={() => setIsAuthenticated(false)} className="px-5 py-2 bg-error text-on-error rounded-md hover:bg-error/90 transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">logout</span>
              Salir
            </button>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="flex gap-4 mb-6 border-b border-outline-variant">
          <button 
            onClick={() => setActiveTab('list')} 
            className={`pb-2 px-4 font-bold text-label-lg transition-colors ${activeTab === 'list' ? 'border-b-2 border-primary text-primary' : 'text-secondary hover:text-on-surface'}`}
          >
            Lista de Stands
          </button>
          <button 
            onClick={() => setActiveTab('map')} 
            className={`pb-2 px-4 font-bold text-label-lg transition-colors ${activeTab === 'map' ? 'border-b-2 border-primary text-primary' : 'text-secondary hover:text-on-surface'}`}
          >
            Mapa Interactivo
          </button>
        </div>

        {activeTab === 'list' ? (
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant text-label-md text-secondary">
                  <th className="p-4 font-medium">Stand</th>
                  <th className="p-4 font-medium">Logo</th>
                  <th className="p-4 font-medium">Empresa</th>
                  <th className="p-4 font-medium">Contacto</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
                {reservedStands.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-secondary">
                      No hay stands reservados en este momento.
                    </td>
                  </tr>
                ) : (
                  reservedStands.map((stand) => (
                    <tr key={stand.id} className="hover:bg-surface-variant/30 transition-colors">
                      <td className="p-4 font-bold text-primary">
                        {stand.name}
                        <div className="text-label-sm text-secondary font-normal">{stand.size}</div>
                      </td>
                      <td className="p-4">
                        {stand.logo ? (
                          <img src={stand.logo} alt="Logo" className="w-12 h-12 rounded-full object-cover border border-outline-variant" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">image_not_supported</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-medium">
                        {sponsors[stand.sponsorId] || stand.reservationDetails?.empresa || 'Sin empresa'}
                      </td>
                      <td className="p-4">
                        <div>{stand.reservationDetails?.nombre} {stand.reservationDetails?.apellido}</div>
                        <div className="text-label-sm text-secondary">{stand.reservationDetails?.correo}</div>
                        <div className="text-label-sm text-secondary">{stand.reservationDetails?.telefono}</div>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleRelease(stand.id)}
                          className="px-4 py-2 bg-error/10 text-error hover:bg-error/20 rounded-md transition-colors font-label-md flex items-center gap-1 inline-flex"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Liberar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <div className="h-[90vh] min-h-[700px] w-full bg-surface rounded-xl shadow-sm overflow-hidden border border-outline-variant">
            <InteractiveMap onBack={() => setActiveTab('list')} isAdminMode={true} />
          </div>
        )}
      </div>
    </div>
  );
}
