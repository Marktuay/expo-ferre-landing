import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
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

  const handleApprove = async (reg) => {
    if (!window.confirm(`¿Estás seguro de que deseas aprobar el registro de ${reg.name}?`)) return;

    try {
      const ref = doc(db, `${getEventBasePath()}/preregistrations`, reg.id);
      await updateDoc(ref, { status: 'approved' });

      // Enviar correo de confirmación con código QR
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${reg.id}&margin=10`;
      
      await addDoc(collection(db, 'mail'), {
        to: reg.email,
        message: {
          subject: '¡Registro Aprobado! - ExpoFerre 2026',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">¡Felicidades ${reg.name}!</h2>
              <p>Tu preregistro para <strong>ExpoFerre 2026</strong> ha sido revisado y <strong>aprobado</strong> exitosamente.</p>
              
              <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
                <p style="margin-bottom: 15px; font-weight: bold; color: #0d47a1;">Tu Código de Acceso QR</p>
                <img src="${qrUrl}" alt="Código QR de Acceso" style="display: block; margin: 0 auto; width: 250px; height: 250px; border: 1px solid #e5e7eb; border-radius: 8px;"/>
                <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">Muestra este código desde tu celular en los kioscos de entrada para imprimir tu gafete.</p>
              </div>

              <p>Te esperamos con los brazos abiertos en el mejor evento ferretero del año.</p>
              <br/>
              <p>Saludos cordiales,</p>
              <p><strong>El equipo de ExpoFerre</strong></p>
            </div>
          `
        }
      });
      
      alert('Registro aprobado y correo enviado exitosamente.');
    } catch (error) {
      console.error('Error approving preregistration:', error);
      alert('Error al aprobar.');
    }
  const handleDelete = async (reg) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el registro de ${reg.name}?`)) return;

    try {
      const ref = doc(db, `${getEventBasePath()}/preregistrations`, reg.id);
      await deleteDoc(ref);
      alert('Registro eliminado exitosamente.');
    } catch (error) {
      console.error('Error deleting preregistration:', error);
      alert('Error al eliminar.');
    }
  };

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
                  Puesto: reg.position || '',
                  Estado: reg.status === 'approved' ? 'Aprobado' : 'Pendiente'
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
                  <th className="p-4 font-bold text-on-surface">Estado</th>
                  <th className="p-4 font-bold text-on-surface">Fecha</th>
                  <th className="p-4 font-bold text-on-surface text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-secondary">
                      Cargando datos...
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-secondary">
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
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${reg.status === 'approved' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#f39200]/10 text-[#f39200]'}`}>
                          {reg.status === 'approved' ? 'APROBADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-4 text-secondary">
                        {reg.createdAt.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {reg.status !== 'approved' && (
                            <button onClick={() => handleApprove(reg)} className="text-[#16a34a] hover:bg-[#16a34a]/10 p-2 rounded-full transition-colors" title="Aprobar">
                              <span className="material-symbols-outlined">check_circle</span>
                            </button>
                          )}
                          <button onClick={() => handleDelete(reg)} className="text-[#ef4444] hover:bg-[#ef4444]/10 p-2 rounded-full transition-colors" title="Eliminar">
                            <span className="material-symbols-outlined">delete</span>
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
    </div>
  );
}
