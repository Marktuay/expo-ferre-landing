import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminContact({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      setMessages(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching contacts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">Mensajes de Contacto</h1>
            <p className="text-secondary mt-1">Consultas y mensajes recibidos desde el formulario de contacto.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = messages.map(msg => ({
                  Fecha: msg.createdAt.toLocaleDateString() + ' ' + msg.createdAt.toLocaleTimeString(),
                  Nombre: msg.name || msg.nombre || '',
                  Empresa: msg.empresa || '',
                  Email: msg.email || msg.correo || '',
                  Teléfono: msg.telefono || '',
                  Asunto: msg.subject || msg.asunto || '',
                  Mensaje: msg.message || msg.mensaje || ''
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Contactos");
                XLSX.writeFile(workbook, "Mensajes_Contacto.xlsx");
              });
            }} className="px-4 py-2 bg-[#217346] text-white border border-[#217346] rounded-md hover:brightness-110 flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined">download</span>
              Exportar Excel
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-white text-secondary border border-outline-variant rounded-md hover:bg-surface-variant flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined">arrow_back</span>
              Volver al Menú
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-outline-variant overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h2 className="text-xl font-bold text-on-surface">Bandeja de Entrada</h2>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
              {messages.length} mensajes
            </span>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">mail</span>
                <p className="text-lg">No hay mensajes de contacto registrados.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-variant/30 text-on-surface-variant text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b border-outline-variant">Fecha</th>
                    <th className="p-4 font-semibold border-b border-outline-variant">Nombre</th>
                    <th className="p-4 font-semibold border-b border-outline-variant">Correo</th>
                    <th className="p-4 font-semibold border-b border-outline-variant">Asunto</th>
                    <th className="p-4 font-semibold border-b border-outline-variant">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {messages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 text-sm text-on-surface-variant whitespace-nowrap">
                        {msg.createdAt.toLocaleDateString()} {msg.createdAt.toLocaleTimeString()}
                      </td>
                      <td className="p-4 font-medium text-on-surface">
                        {msg.name || msg.nombre || '-'}
                      </td>
                      <td className="p-4 text-sm text-secondary">
                        {msg.email || msg.correo || '-'}
                      </td>
                      <td className="p-4 text-sm text-on-surface">
                        {msg.subject || msg.asunto || '-'}
                      </td>
                      <td className="p-4 text-sm text-on-surface max-w-xs truncate">
                        {msg.message || msg.mensaje || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
