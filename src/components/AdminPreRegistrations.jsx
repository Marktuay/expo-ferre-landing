import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

export default function AdminPreRegistrations({ onBack }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/preregistrations`), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      setRegistrations(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching preregistrations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Preregistros</h1>
            <p className="text-body-lg text-secondary">Personas que han completado el formulario de preregistro.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = registrations.map(reg => ({
                  Fecha: reg.createdAt.toLocaleDateString() + ' ' + reg.createdAt.toLocaleTimeString(),
                  Nombre: reg.name || '',
                  Empresa: reg.company || '',
                  Email: reg.email || '',
                  Teléfono: reg.phone || '',
                  Empleados: reg.employees || '',
                  Puesto: reg.position || ''
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Preregistros");
                XLSX.writeFile(workbook, "Preregistros_Asistentes.xlsx");
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
                  <th className="p-4 font-bold text-on-surface">Puesto</th>
                  <th className="p-4 font-bold text-on-surface">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-secondary">
                      Cargando datos...
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-secondary">
                      No hay preregistros todavía.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 text-on-surface font-medium">{reg.name}</td>
                      <td className="p-4 text-secondary">{reg.company}</td>
                      <td className="p-4 text-secondary">{reg.email}</td>
                      <td className="p-4 text-secondary">{reg.phone}</td>
                      <td className="p-4 text-secondary">{reg.employees || 'N/A'}</td>
                      <td className="p-4 text-secondary">{reg.position || 'N/A'}</td>
                      <td className="p-4 text-secondary">
                        {reg.createdAt.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
