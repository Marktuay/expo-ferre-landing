import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AdminSponsorDetails from './AdminSponsorDetails';
import PrintableBadgeList from './PrintableBadgeList';

export default function AdminSponsors({ onBack }) {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [printItems, setPrintItems] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'sponsor'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      // Sort in descending order by date locally since we filter by role
      results.sort((a, b) => b.createdAt - a.createdAt);
      
      setSponsors(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sponsors:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (selectedSponsor) {
    return <AdminSponsorDetails sponsor={selectedSponsor} onBack={() => setSelectedSponsor(null)} />;
  }

  if (printItems) {
    return (
      <PrintableBadgeList 
        items={printItems} 
        roleLabel="Patrocinador"
        colorClass="border-primary text-primary"
        onClose={() => setPrintItems(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Patrocinadores Registrados</h1>
            <p className="text-body-lg text-secondary">Empresas que han creado una cuenta de patrocinador.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setPrintItems(sponsors)}
              disabled={sponsors.length === 0}
              className="px-5 py-2 bg-primary text-on-primary border border-primary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">print</span>
              Imprimir Todos
            </button>
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = sponsors.map(s => ({
                  Fecha: s.createdAt.toLocaleDateString() + ' ' + s.createdAt.toLocaleTimeString(),
                  Nombre: `${s.nombre || ''} ${s.apellido || ''}`.trim(),
                  Empresa: s.empresa || '',
                  Email: s.correo || '',
                  Teléfono: s.telefono || '',
                  Empleados: s.empleados || 'N/A'
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Patrocinadores");
                XLSX.writeFile(workbook, "Patrocinadores.xlsx");
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
                  <th className="p-4 font-bold text-on-surface">Empresa</th>
                  <th className="p-4 font-bold text-on-surface">Email</th>
                  <th className="p-4 font-bold text-on-surface">Teléfono</th>
                  <th className="p-4 font-bold text-on-surface">Empleados</th>
                  <th className="p-4 font-bold text-on-surface">Estado</th>
                  <th className="p-4 font-bold text-on-surface">Fecha</th>
                  <th className="p-4 font-bold text-on-surface text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-secondary">
                      Cargando datos...
                    </td>
                  </tr>
                ) : sponsors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-secondary">
                      No hay patrocinadores registrados.
                    </td>
                  </tr>
                ) : (
                  sponsors.map((sponsor) => (
                    <tr key={sponsor.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 text-on-surface font-medium">{`${sponsor.nombre || ''} ${sponsor.apellido || ''}`.trim()}</td>
                      <td className="p-4 text-secondary">{sponsor.empresa}</td>
                      <td className="p-4 text-secondary">{sponsor.correo}</td>
                      <td className="p-4 text-secondary">{sponsor.telefono}</td>
                      <td className="p-4 text-secondary">{sponsor.empleados || 'N/A'}</td>
                      <td className="p-4">
                        {(!sponsor.status || sponsor.status === 'approved') ? (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-400">Aprobado</span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-400">Pendiente</span>
                        )}
                      </td>
                      <td className="p-4 text-secondary">
                        {sponsor.createdAt.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 flex gap-2 justify-center">
                        {sponsor.status === 'pending' && (
                          <button 
                            onClick={async () => {
                              if(window.confirm('¿Deseas aprobar a este patrocinador? Se habilitarán todas sus funcionalidades.')){
                                try {
                                  await updateDoc(doc(db, 'users', sponsor.id), { status: 'approved' });
                                } catch(e) {
                                  console.error('Error approving sponsor:', e);
                                  alert('Hubo un error al aprobar.');
                                }
                              }
                            }}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                            title="Aprobar Patrocinador"
                          >
                            <span className="material-symbols-outlined">check_circle</span>
                          </button>
                        )}
                        <button 
                          onClick={() => setPrintItems([sponsor])}
                          className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                          title="Imprimir Gafete"
                        >
                          <span className="material-symbols-outlined">print</span>
                        </button>
                        <button 
                          onClick={() => setSelectedSponsor(sponsor)}
                          className="px-3 py-1 bg-surface-variant text-secondary border border-outline-variant rounded-md hover:bg-outline-variant transition-colors text-sm font-medium"
                          title="Ver Detalles"
                        >
                          Detalles
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
