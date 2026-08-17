import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import PrintableBadgeList from './PrintableBadgeList';
import AdminFollowUpModal from './AdminFollowUpModal';

export default function AdminGuests({ onBack }) {
  const [guestsList, setGuestsList] = useState([]);
  const [sponsorsMap, setSponsorsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [printItems, setPrintItems] = useState(null);
  
  // CRM States
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedPersonForFollowUp, setSelectedPersonForFollowUp] = useState(null);
  const [needsFollowUpOnly, setNeedsFollowUpOnly] = useState(false);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const qSponsors = query(collection(db, 'users'), where('role', '==', 'sponsor'));
        const snap = await getDocs(qSponsors);
        const map = {};
        snap.forEach(doc => {
          map[doc.id] = doc.data().empresa || doc.data().nombre || 'Patrocinador Desconocido';
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

  const filteredGuests = needsFollowUpOnly 
    ? guestsList.filter(g => g.needsFollowUp === true)
    : guestsList;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Lista de Invitados VIP</h1>
            <p className="text-body-lg text-secondary">Invitados registrados por los patrocinadores.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={needsFollowUpOnly}
                onChange={(e) => setNeedsFollowUpOnly(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary focus:ring-2 border-outline-variant"
              />
              <span className="text-sm text-on-surface font-medium">Mostrar solo "Requiere Seguimiento"</span>
            </label>
            <button 
              onClick={() => setPrintItems(filteredGuests)}
              disabled={filteredGuests.length === 0}
              className="px-5 py-2 bg-primary text-on-primary border border-primary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">print</span>
              Imprimir Todos
            </button>
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = filteredGuests.map(g => ({
                  Fecha: g.createdAt.toLocaleDateString() + ' ' + g.createdAt.toLocaleTimeString(),
                  Nombre: g.nombre || '',
                  Email: g.email || '',
                  Teléfono: g.telefono || '',
                  Empresa: g.empresa || '',
                  Cargo: g.cargo || '',
                  Ciudad: g.ciudad || 'N/A',
                  'Cantidad de Empleados': g.empleados || '',
                  'Patrocinador (Nombre)': sponsorsMap[g.sponsorId] || 'Desconocido',
                  'Patrocinador (Email)': g.sponsorEmail || 'Desconocido',
                  SponsorID: g.sponsorId || '',
                  'Requiere Seguimiento': g.needsFollowUp ? 'Sí' : 'No',
                  'Cant. Seguimientos': g.followUps ? g.followUps.length : 0,
                  'Último Seguimiento': g.followUps && g.followUps.length > 0 ? new Date(g.followUps[0].date).toLocaleDateString() : 'N/A'
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
                  <th className="p-4 font-bold text-on-surface">Ciudad</th>
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
                    <td colSpan="11" className="p-8 text-center text-secondary">
                      Cargando datos...
                    </td>
                  </tr>
                ) : guestsList.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="p-8 text-center text-secondary">
                      No hay invitados registrados.
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((guest) => (
                    <tr key={guest.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 text-on-surface font-medium">{guest.nombre}</td>
                      <td className="p-4 text-secondary">{guest.email}</td>
                      <td className="p-4 text-secondary">{guest.telefono}</td>
                      <td className="p-4 text-secondary">{guest.empresa}</td>
                      <td className="p-4 text-secondary">{guest.cargo}</td>
                      <td className="p-4 text-secondary font-medium">{guest.ciudad || 'N/A'}</td>
                      <td className="p-4 text-secondary">{guest.empleados}</td>
                      <td className="p-4 text-secondary font-bold text-sm text-primary">{sponsorsMap[guest.sponsorId] || 'Desconocido'}</td>
                      <td className="p-4 text-secondary text-sm font-bold">{guest.sponsorEmail || 'N/A'}</td>
                      <td className="p-4 text-secondary">
                        {guest.createdAt.toLocaleDateString()}
                        {guest.needsFollowUp && (
                          <div className="mt-1 flex items-center gap-1 text-[#f39200] text-xs font-bold">
                            <span className="material-symbols-outlined text-[14px]">notification_important</span>
                            Requiere seguimiento
                          </div>
                        )}
                        {guest.followUps && guest.followUps.length > 0 && (
                          <div className="mt-1 text-xs text-secondary">
                            {guest.followUps.length} seguimiento(s)
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => {
                              setSelectedPersonForFollowUp({ ...guest, name: guest.nombre, company: guest.empresa, phone: guest.telefono });
                              setFollowUpModalOpen(true);
                            }} 
                            className="text-[#f39200] hover:bg-[#f39200]/10 p-2 rounded-full transition-colors relative" 
                            title="Añadir Seguimiento (CRM)"
                          >
                            <span className="material-symbols-outlined">support_agent</span>
                            {guest.followUps && guest.followUps.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                {guest.followUps.length}
                              </span>
                            )}
                          </button>
                          <button 
                            onClick={() => setPrintItems([guest])}
                            className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                            title="Imprimir Gafete"
                          >
                            <span className="material-symbols-outlined">print</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {followUpModalOpen && selectedPersonForFollowUp && (
        <AdminFollowUpModal
          isOpen={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            setSelectedPersonForFollowUp(null);
          }}
          person={selectedPersonForFollowUp}
          collectionName="guests"
          adminUser={{ username: auth.currentUser?.email || 'Staff' }}
        />
      )}
    </div>
  );
}
