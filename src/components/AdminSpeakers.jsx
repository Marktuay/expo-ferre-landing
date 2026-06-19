import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import PrintableBadgeList from './PrintableBadgeList';

export default function AdminSpeakers({ onBack }) {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printItems, setPrintItems] = useState(null);

  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/speakers`));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      // Sort in descending order by date
      results.sort((a, b) => b.createdAt - a.createdAt);
      
      setSpeakers(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching speakers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (printItems) {
    return (
      <PrintableBadgeList 
        items={printItems} 
        roleLabel="Conferencista"
        colorClass="border-purple-600 text-purple-600"
        onClose={() => setPrintItems(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Conferencias</h1>
            <p className="text-body-lg text-secondary">Registro de propuestas de conferencias.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setPrintItems(speakers)}
              disabled={speakers.length === 0}
              className="px-5 py-2 bg-primary text-on-primary border border-primary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">print</span>
              Imprimir Todos
            </button>
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = speakers.map(s => ({
                  Fecha: s.createdAt.toLocaleDateString() + ' ' + s.createdAt.toLocaleTimeString(),
                  Nombre: `${s.nombre || ''} ${s.apellido || ''}`.trim(),
                  Cargo: s.cargo || '',
                  Empresa: s.empresa || '',
                  Email: s.correo || '',
                  Teléfono: s.telefono || '',
                  Tema: s.tema || '',
                  Formato: s.formato || ''
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Conferencias");
                XLSX.writeFile(workbook, "Conferencias.xlsx");
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
                  <th className="p-4 font-bold text-on-surface">Tema</th>
                  <th className="p-4 font-bold text-on-surface">Formato</th>
                  <th className="p-4 font-bold text-on-surface">Email</th>
                  <th className="p-4 font-bold text-on-surface">Teléfono</th>
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
                ) : speakers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-secondary">
                      No hay conferencias registradas.
                    </td>
                  </tr>
                ) : (
                  speakers.map((speaker) => (
                    <tr key={speaker.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 text-on-surface font-medium">{`${speaker.nombre || ''} ${speaker.apellido || ''}`.trim()}</td>
                      <td className="p-4 text-secondary">{speaker.empresa}</td>
                      <td className="p-4 text-secondary">{speaker.tema}</td>
                      <td className="p-4 text-secondary">{speaker.formato}</td>
                      <td className="p-4 text-secondary">{speaker.correo}</td>
                      <td className="p-4 text-secondary">{speaker.telefono}</td>
                      <td className="p-4 text-secondary">{speaker.createdAt.toLocaleDateString()}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setPrintItems([speaker])}
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
