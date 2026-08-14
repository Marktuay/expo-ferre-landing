import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AdminSponsorDetails from './AdminSponsorDetails';
import PrintableBadgeList from './PrintableBadgeList';
import CreateSponsorModal from './CreateSponsorModal';
import { getEventBasePath } from '../config/eventConfig';

const OFFICIAL_SPONSORS = [
  { company: 'Sur', category: 'Diamante', logo: '/diamante/sur.png' },
  { company: 'Comasa', category: 'Diamante', logo: '/diamante/comasa.png' },
  { company: 'Sinsa', category: 'Diamante', logo: '/diamante/sinsa.png' },
  { company: 'Extel', category: 'Diamante', logo: '/diamante/extelpng.png' },
  { company: 'Importaciones Balladares', category: 'Diamante', logo: '/diamante/importacionesballadares.png' },
  { company: 'Megalines', category: 'Diamante', logo: '/diamante/megalines.png' },
  { company: 'Megalines 1', category: 'Diamante', logo: '/diamante/megalines1.png' },
  { company: 'Noelito', category: 'Diamante', logo: '/diamante/noelito%20.png' },
  { company: 'Plycem', category: 'Oro', logo: '/oro/plycem%20.png' },
  { company: 'Sicsa', category: 'Oro', logo: '/oro/sicsa.png' },
  { company: 'JP Technology', category: 'Oro', logo: '/oro/logo-jp-technology.png' },
  { company: 'Casco', category: 'Plata', logo: '/plata/casco.png' },
  { company: 'Fernández Sera', category: 'Plata', logo: '/plata/ferdandezsera.png' },
  { company: 'Midenesa', category: 'Plata', logo: '/plata/midenesa.png' }
];

export default function AdminSponsors({ onBack }) {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [printItems, setPrintItems] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const qUsers = query(collection(db, 'users'), where('role', '==', 'sponsor'));
    const qStands = query(collection(db, `${getEventBasePath()}/stands`), where('status', 'in', ['reserved', 'sold']));
    
    let userResults = [];
    let standResults = [];

    const updateCombined = () => {
      const combinedMap = new Map();

      userResults.forEach(u => {
        combinedMap.set(u.id, { ...u, standList: [] });
      });

      standResults.forEach(st => {
        let match = null;
        for (const [id, user] of combinedMap.entries()) {
          if (id === st.sponsorId || (st.sponsorEmail && (user.correo === st.sponsorEmail || user.email === st.sponsorEmail))) {
            match = user;
            break;
          }
        }
        if (match) {
          if (!match.standList) match.standList = [];
          if (!match.standList.includes(st.name)) match.standList.push(st.name);
          if (st.logo && !match.logo) match.logo = st.logo;
        } else if (st.company && st.company.trim().length > 0) {
          const fakeId = `stand-sponsor-${st.id}`;
          combinedMap.set(fakeId, {
            id: fakeId,
            nombre: st.company.trim(),
            apellido: '',
            empresa: st.company.trim(),
            correo: st.sponsorEmail || 'N/A',
            telefono: 'N/A',
            status: 'approved',
            createdAt: st.updatedAt?.toDate() || new Date(),
            standList: [st.name],
            logo: st.logo
          });
        }
      });

      // Incluir también los patrocinadores oficiales confirmados de la feria (Sur, Noelito, Comasa, etc.)
      OFFICIAL_SPONSORS.forEach(off => {
        let match = null;
        for (const [id, user] of combinedMap.entries()) {
          const comp = (user.empresa || user.company || user.nombre || '').toLowerCase();
          if (comp.includes(off.company.toLowerCase())) {
            match = user;
            break;
          }
        }
        if (!match) {
          const offId = `official-${off.company.toLowerCase().replace(/\s+/g, '-')}`;
          combinedMap.set(offId, {
            id: offId,
            nombre: off.company,
            apellido: '',
            empresa: off.company,
            correo: 'Patrocinador Oficial',
            telefono: 'N/A',
            status: 'approved',
            createdAt: new Date(2026, 0, 1),
            standList: [],
            logo: off.logo,
            isOfficial: true
          });
        }
      });

      const finalResults = Array.from(combinedMap.values());
      finalResults.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSponsors(finalResults);
      setLoading(false);
    };

    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      userResults = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      updateCombined();
    });

    const unsubStands = onSnapshot(qStands, (snapshot) => {
      standResults = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      updateCombined();
    });

    return () => {
      unsubUsers();
      unsubStands();
    };
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
      <div className="max-w-[95%] xl:max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Patrocinadores Registrados</h1>
            <p className="text-body-lg text-secondary">Empresas que han creado una cuenta de patrocinador.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2 bg-secondary text-white border border-secondary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined">person_add</span>
              Crear Patrocinador
            </button>
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
                  Nombre: (`${s.nombre || s.name || ''} ${s.apellido || ''}`).trim() || 'Sin Nombre',
                  Empresa: s.empresa || s.company || 'N/A',
                  Stand: s.standList && s.standList.length > 0 ? s.standList.join(', ') : 'Sin Stand',
                  Email: s.correo || s.email || 'N/A',
                  Teléfono: s.telefono || s.phone || 'N/A',
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
            <table className="w-full min-w-[1100px] text-left border-collapse">
              <thead>
                <tr className="bg-surface-variant/30 border-b border-outline-variant">
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Nombre</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Empresa</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Stand</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Email / Rol</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Teléfono</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Empleados</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Estado</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Fecha</th>
                  <th className="p-4 font-bold text-on-surface text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-secondary">
                      Cargando datos...
                    </td>
                  </tr>
                ) : sponsors.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-secondary">
                      No hay patrocinadores registrados.
                    </td>
                  </tr>
                ) : (
                  sponsors.map((sponsor) => (
                    <tr key={sponsor.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 text-on-surface font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {sponsor.lastActive && (Date.now() - sponsor.lastActive.toMillis() < 5 * 60 * 1000) ? (
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" title="En línea"></span>
                          ) : (
                            <span className="w-2.5 h-2.5 bg-gray-300 rounded-full shrink-0" title="Desconectado"></span>
                          )}
                          {(`${sponsor.nombre || sponsor.name || ''} ${sponsor.apellido || ''}`).trim() || 'Sin Nombre'}
                        </div>
                      </td>
                      <td className="p-4 text-secondary font-semibold whitespace-nowrap">{sponsor.empresa || sponsor.company || 'N/A'}</td>
                      <td className="p-4 text-secondary whitespace-nowrap">
                        {sponsor.standList && sponsor.standList.length > 0 ? (
                          sponsor.standList.length <= 2 ? (
                            <div className="flex flex-wrap gap-1">
                              {sponsor.standList.map(name => (
                                <span key={name} className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-300 whitespace-nowrap">{name}</span>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1" title={sponsor.standList.join(', ')}>
                              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-300 whitespace-nowrap">
                                {sponsor.standList[0]}
                              </span>
                              <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-gray-300 whitespace-nowrap">
                                +{sponsor.standList.length - 1} más ({sponsor.standList.length} total)
                              </span>
                            </div>
                          )
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gray-200 whitespace-nowrap">Sin Stand</span>
                        )}
                      </td>
                      <td className="p-4 text-secondary whitespace-nowrap">
                        {sponsor.isOfficial || sponsor.correo === 'Patrocinador Oficial' ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap">Patrocinador Oficial</span>
                        ) : (
                          sponsor.correo || sponsor.email || 'N/A'
                        )}
                      </td>
                      <td className="p-4 text-secondary whitespace-nowrap">{sponsor.telefono || sponsor.phone || 'N/A'}</td>
                      <td className="p-4 text-secondary whitespace-nowrap">{sponsor.empleados || 'N/A'}</td>
                      <td className="p-4 whitespace-nowrap">
                        {(!sponsor.status || sponsor.status === 'approved') ? (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-400">Aprobado</span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-400">Pendiente</span>
                        )}
                      </td>
                      <td className="p-4 text-secondary whitespace-nowrap">
                        {sponsor.isOfficial ? (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200 whitespace-nowrap">Confirmado</span>
                        ) : (
                          sponsor.createdAt.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        )}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex gap-2 justify-center items-center">
                        {(sponsor.status === 'pending' || sponsor.status === 'pendiente') && (
                          <button 
                            onClick={async () => {
                              if(window.confirm('¿Deseas aprobar a este patrocinador? Se habilitarán todas sus funcionalidades y se preparará un correo para avisarle.')){
                              try {
                                try {
                                  await updateDoc(doc(db, 'users', sponsor.id), { status: 'approved' });
                                } catch (e1) {
                                  console.error('Error in updateDoc:', e1);
                                  throw new Error('Fallo al actualizar el estado del usuario en Firestore. ' + e1.message);
                                }
                                
                                // Generar el correo automatizado a través de la colección mail
                                try {
                                  await setDoc(doc(collection(db, 'mail')), {
                                    to: sponsor.correo,
                                    bcc: 'admin@expoferrenicaragua.com', // Copia oculta al administrador
                                    message: {
                                      subject: '¡Tu cuenta de Patrocinador en Expo Ferre ha sido aprobada!',
                                      text: `Hola ${sponsor.nombre || 'Patrocinador'},\n\nNos complace informarte que tu cuenta para el Panel de Patrocinadores de Expo Ferre ha sido aprobada.\n\nYa puedes iniciar sesión en la plataforma para:\n- Reservar tu Stand en el Plano Interactivo.\n- Registrar a tu Staff y tus Invitados.\n- Utilizar el escáner de Gafetes (Leads).\n\nIngresa aquí: https://expoferrenicaragua.com/login\n\n¡Gracias por ser parte de Expo Ferre!`,
                                      html: `
                                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                          <!-- Header Image -->
                                          <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                                          
                                          <div style="padding: 30px;">
                                            <h2 style="color: #0d47a1; margin-top: 0;">¡Hola ${sponsor.nombre || 'Patrocinador'}!</h2>
                                            <p>Nos complace informarte que tu cuenta para el Panel de Patrocinadores de Expo Ferre ha sido <strong>aprobada</strong>.</p>
                                            
                                            <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0d47a1;">
                                              <p style="margin-top: 0; font-weight: bold; color: #0d47a1; font-size: 16px;">Ya puedes iniciar sesión en la plataforma para:</p>
                                              <ul style="padding-left: 20px; margin-bottom: 0;">
                                                <li style="margin-bottom: 10px;">Reservar tu Stand en el Plano Interactivo.</li>
                                                <li style="margin-bottom: 10px;">Registrar a tu Staff y tus Invitados.</li>
                                                <li>Utilizar el escáner de Gafetes (Leads).</li>
                                              </ul>
                                            </div>

                                            <div style="text-align: center; margin: 30px 0;">
                                              <a href="https://expoferrenicaragua.com/login" style="background-color: #f39200; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a la Plataforma</a>
                                            </div>
                                            
                                            <p>¡Gracias por ser parte de Expo Ferre!</p>
                                          </div>
                                          
                                          <!-- Footer Image -->
                                          <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                                        </div>
                                      `
                                    }
                                  });
                                } catch (e2) {
                                  console.error('Error in setDoc (mail):', e2);
                                  throw new Error('Fallo al crear el correo en la colección mail. ' + e2.message);
                                }
                                
                              } catch(e) {
                                console.error('Error approving sponsor:', e);
                                alert('Hubo un error al aprobar: ' + e.message);
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
      
      {showCreateModal && (
        <CreateSponsorModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
