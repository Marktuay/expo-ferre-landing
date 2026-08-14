import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth, firebaseConfig } from '../firebase';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getEventBasePath } from '../config/eventConfig';
import AdminFollowUpModal from './AdminFollowUpModal';

export default function AdminPreRegistrations({ onBack, adminUser }) {
  const [registrations, setRegistrations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // CRM States
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedPersonForFollowUp, setSelectedPersonForFollowUp] = useState(null);
  const [needsFollowUpOnly, setNeedsFollowUpOnly] = useState(false);

  // Migration States
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [selectedPersonForMigration, setSelectedPersonForMigration] = useState(null);
  const [migrationPassword, setMigrationPassword] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

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

  const handleMigrateConfirm = async () => {
    if (!migrationPassword || migrationPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    
    setIsMigrating(true);
    try {
      // 1. Initialize secondary app to avoid logging out admin
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      
      // 2. Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, selectedPersonForMigration.email, migrationPassword);
      const newUserId = userCredential.user.uid;
      
      // 3. Save to users collection
      const userRef = doc(db, 'users', newUserId);
      await setDoc(userRef, {
        name: selectedPersonForMigration.name || '',
        nombre: selectedPersonForMigration.name || '',
        email: selectedPersonForMigration.email || '',
        correo: selectedPersonForMigration.email || '',
        phone: selectedPersonForMigration.phone || '',
        telefono: selectedPersonForMigration.phone || '',
        company: selectedPersonForMigration.company || '',
        empresa: selectedPersonForMigration.company || '',
        role: 'sponsor',
        status: 'approved',
        createdAt: new Date()
      });

      // 4. Update original preregistration status
      const preregRef = doc(db, `${getEventBasePath()}/preregistrations`, selectedPersonForMigration.id);
      await updateDoc(preregRef, { status: 'migrated' });

      // 5. Enviar correo de bienvenida usando Firebase Trigger Email
      await addDoc(collection(db, 'mail'), {
        to: selectedPersonForMigration.email,
        message: {
          subject: '¡Bienvenido como Patrocinador Oficial! - ExpoFerre 2026',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <!-- Header Image -->
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 30px;">
                <h2 style="color: #0d47a1; margin-top: 0;">¡Hola ${selectedPersonForMigration.name}!</h2>
                <p>Es un gusto saludarte. Confirmamos tu acceso como <strong>Patrocinador Oficial para Expo Ferre 2026</strong>.</p>
                
                <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0d47a1;">
                  <p style="margin-top: 0; font-weight: bold; color: #0d47a1; font-size: 16px;">Tus Credenciales de Acceso:</p>
                  <p style="margin: 10px 0;"><strong>Correo Electrónico:</strong> ${selectedPersonForMigration.email}</p>
                  <p style="margin: 10px 0;"><strong>Contraseña Provisional:</strong> ${migrationPassword}</p>
                </div>

                <p>Te recomendamos cambiar tu contraseña por motivos de seguridad una vez que inicies sesión en la plataforma usando la opción de "¿Olvidaste tu contraseña?".</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://expoferrenicaragua.com/login" style="background-color: #f39200; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a la Plataforma</a>
                </div>
              </div>
              
              <!-- Footer Image -->
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
      });

      alert('¡Preregistro migrado a Patrocinador exitosamente y correo enviado!');
      setMigrationModalOpen(false);
      setMigrationPassword('');
      setSelectedPersonForMigration(null);
    } catch (error) {
      console.error('Error migrating to sponsor:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Error: Este correo ya tiene una cuenta registrada.');
      } else {
        alert('Error al migrar a patrocinador.');
      }
    } finally {
      setIsMigrating(false);
    }
  };

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
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <!-- Header Image -->
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 30px;">
                <h2 style="color: #16a34a; margin-top: 0;">¡Excelentes noticias, ${reg.name}!</h2>
                <p>Su preregistro ha sido <strong>aprobado</strong> por el Comité Organizador de EXPO FERRE Nicaragua 2026.</p>
                
                <p>En los próximos días recibirá su invitación oficial para formar parte del encuentro más importante de la industria ferretera y de la construcción en Nicaragua.</p>
                
                <p>Prepárese para vivir una jornada de alto nivel, donde podrá descubrir las últimas tendencias del sector, conocer soluciones innovadoras, acceder a contenidos sobre ventas, financiamiento, transformación digital y estrategias de crecimiento, además de conectar con fabricantes, distribuidores, mayoristas y los principales tomadores de decisión del mercado.</p>

                <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                  <p style="margin-top: 0; margin-bottom: 15px; font-weight: bold; color: #0d47a1;">Su Código de Acceso QR</p>
                  <img src="${qrUrl}" alt="Código QR de Acceso" style="display: block; margin: 0 auto; width: 250px; height: 250px; border: 1px solid #e5e7eb; border-radius: 8px;"/>
                  <p style="margin-top: 15px; font-size: 14px; color: #6b7280; margin-bottom: 0;">Muestre este código desde su celular en los kioscos de entrada para imprimir su gafete.</p>
                </div>

                <div style="margin: 25px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #f39200;">
                  <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.6;">
                    <li>📅 <strong>Fecha:</strong> Sábado 17 de octubre de 2026</li>
                    <li>📍 <strong>Lugar:</strong> Hotel Crowne Plaza – Salón Gran Darío</li>
                    <li>🕢 <strong>Registro:</strong> 7:30 a. m.</li>
                    <li>🕗 <strong>Evento:</strong> 8:00 a. m. – 5:00 p. m.</li>
                    <li>🍽️ <strong>Incluye:</strong> Coffee break, almuerzo y cóctel de cierre.</li>
                  </ul>
                </div>
                
                <p>Gracias por su interés. Será un honor contar con su participación en EXPO FERRE Nicaragua 2026, donde se construyen las conexiones que impulsan los negocios.</p>
                
                <p style="margin-bottom: 0;">Cordialmente,<br/><strong>Equipo Organizador</strong></p>
              </div>
              
              <!-- Footer Image -->
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
      });
      
      alert('Registro aprobado y correo enviado exitosamente.');
    } catch (error) {
      console.error('Error approving preregistration:', error);
      alert('Error al aprobar.');
    }
  };

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

  const handleResendQR = async (reg) => {
    if (!window.confirm(`¿Deseas reenviar el código QR al correo de ${reg.name} (${reg.email})?`)) return;

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${reg.id}&margin=10`;
      
      await addDoc(collection(db, 'mail'), {
        to: reg.email,
        message: {
          subject: 'Recuperación de Acceso - ExpoFerre 2026',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <!-- Header Image -->
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 30px;">
                <h2 style="color: #0d47a1; margin-top: 0;">¡Hola ${reg.name}!</h2>
                <p>Te enviamos nuevamente tu código de acceso para <strong>ExpoFerre 2026</strong> a petición tuya o de la administración.</p>
                
                <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                  <p style="margin-top: 0; margin-bottom: 15px; font-weight: bold; color: #0d47a1;">Tu Código de Acceso QR</p>
                  <img src="${qrUrl}" alt="Código QR de Acceso" style="display: block; margin: 0 auto; width: 250px; height: 250px; border: 1px solid #e5e7eb; border-radius: 8px;"/>
                  <p style="margin-top: 15px; font-size: 14px; color: #6b7280; margin-bottom: 0;">Muestra este código desde tu celular en los kioscos de entrada para imprimir tu gafete.</p>
                </div>

                <p>Te esperamos con los brazos abiertos en el mejor evento ferretero del año.</p>
              </div>
              
              <!-- Footer Image -->
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
      });
      
      alert('Código QR reenviado exitosamente al correo.');
    } catch (error) {
      console.error('Error resending QR:', error);
      alert('Error al reenviar el correo.');
    }
  };

  const handleNoShow = async (reg) => {
    if (!window.confirm(`¿Estás seguro de marcar a ${reg.name} como "No Asistió"? Esto invalidará su QR.`)) return;

    try {
      const ref = doc(db, `${getEventBasePath()}/preregistrations`, reg.id);
      await updateDoc(ref, { status: 'no_show' });
      alert('Registro marcado como No Asistió.');
    } catch (error) {
      console.error('Error marking as no show:', error);
      alert('Error al actualizar el estado.');
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const term = searchTerm.toLowerCase();
    const nameMatch = reg.name?.toLowerCase().includes(term);
    const emailMatch = reg.email?.toLowerCase().includes(term);
    const phoneMatch = reg.phone?.toLowerCase().includes(term);
    const companyMatch = reg.company?.toLowerCase().includes(term);
    const matchesSearch = nameMatch || emailMatch || phoneMatch || companyMatch;
    
    if (needsFollowUpOnly) {
      return matchesSearch && reg.needsFollowUp === true;
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="w-full max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex-shrink-0">
            <h1 className="text-headline-md font-bold text-on-surface">Preregistros</h1>
            <p className="text-body-lg text-secondary">Personas que han completado el formulario de preregistro.</p>
            
            {!loading && (
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="bg-white px-4 py-3 rounded-lg border border-outline-variant shadow-sm flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">group</span>
                  </div>
                  <div>
                    <p className="text-xs text-secondary font-medium uppercase tracking-wider">Total Preregistros</p>
                    <p className="text-2xl font-bold text-on-surface leading-tight">{registrations.length}</p>
                  </div>
                </div>
                <div className="bg-white px-4 py-3 rounded-lg border border-outline-variant shadow-sm flex items-center gap-3">
                  <div className="bg-[#16a34a]/10 p-2 rounded-full text-[#16a34a] flex items-center justify-center">
                    <span className="material-symbols-outlined">how_to_reg</span>
                  </div>
                  <div>
                    <p className="text-xs text-secondary font-medium uppercase tracking-wider">Aprobados</p>
                    <p className="text-2xl font-bold text-on-surface leading-tight">{registrations.filter(reg => reg.status === 'approved').length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full md:flex-1 md:max-w-md flex flex-col gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, correo, teléfono o empresa..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-full border border-outline-variant focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1] outline-none transition-shadow shadow-sm"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer ml-1 w-fit">
              <input
                type="checkbox"
                checked={needsFollowUpOnly}
                onChange={(e) => setNeedsFollowUpOnly(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary focus:ring-2 border-outline-variant"
              />
              <span className="text-sm text-on-surface font-medium">Mostrar solo "Requiere Seguimiento"</span>
            </label>
          </div>

          <div className="flex flex-shrink-0 gap-4">
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = filteredRegistrations.map(reg => ({
                  Fecha: reg.createdAt.toLocaleDateString() + ' ' + reg.createdAt.toLocaleTimeString(),
                  Nombre: reg.name || '',
                  Empresa: reg.company || '',
                  Email: reg.email || '',
                  Teléfono: reg.phone || '',
                  Empleados: reg.employees || '',
                  Puesto: reg.position || '',
                  Estado: reg.status === 'approved' ? 'Aprobado' : reg.status === 'no_show' ? 'No Asistió' : reg.status === 'migrated' ? 'Migrado' : 'Pendiente',
                  'Requiere Seguimiento': reg.needsFollowUp ? 'Sí' : 'No',
                  'Cant. Seguimientos': reg.followUps ? reg.followUps.length : 0,
                  'Último Seguimiento': reg.followUps && reg.followUps.length > 0 ? new Date(reg.followUps[0].date).toLocaleDateString() : 'N/A'
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
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Teléfono</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Empleados</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Puesto</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap text-center">Estado</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap">Fecha</th>
                  <th className="p-4 font-bold text-on-surface whitespace-nowrap text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-secondary">
                      Cargando datos...
                    </td>
                  </tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-secondary">
                      No se encontraron resultados para "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4 text-on-surface font-medium">{reg.name}</td>
                      <td className="p-4 text-secondary">{reg.company}</td>
                      <td className="p-4 text-secondary break-all">{reg.email}</td>
                      <td className="p-4 text-secondary whitespace-nowrap">{reg.phone}</td>
                      <td className="p-4 text-secondary whitespace-nowrap">{reg.employees || 'N/A'}</td>
                      <td className="p-4 text-secondary whitespace-nowrap">{reg.position || 'N/A'}</td>
                      <td className="p-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          reg.status === 'approved' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 
                          reg.status === 'no_show' ? 'bg-[#4b5563]/10 text-[#4b5563]' :
                          reg.status === 'migrated' ? 'bg-[#0d47a1]/10 text-[#0d47a1]' :
                          'bg-[#f39200]/10 text-[#f39200]'
                        }`}>
                          {reg.status === 'approved' ? 'APROBADO' : 
                           reg.status === 'no_show' ? 'NO ASISTIÓ' : 
                           reg.status === 'migrated' ? 'MIGRADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-4 text-secondary whitespace-nowrap">
                        {reg.createdAt.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                        {reg.needsFollowUp && (
                          <div className="mt-1 flex items-center gap-1 text-[#f39200] text-xs font-bold">
                            <span className="material-symbols-outlined text-[14px]">notification_important</span>
                            Requiere seguimiento
                          </div>
                        )}
                        {reg.followUps && reg.followUps.length > 0 && (
                          <div className="mt-1 text-xs text-secondary">
                            {reg.followUps.length} seguimiento(s)
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => {
                              setSelectedPersonForFollowUp(reg);
                              setFollowUpModalOpen(true);
                            }} 
                            className="text-[#f39200] hover:bg-[#f39200]/10 p-2 rounded-full transition-colors relative" 
                            title="Añadir Seguimiento (CRM)"
                          >
                            <span className="material-symbols-outlined">support_agent</span>
                            {reg.followUps && reg.followUps.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                {reg.followUps.length}
                              </span>
                            )}
                          </button>
                          {reg.status !== 'migrated' && adminUser?.role === 'admin' && (
                            <button 
                              onClick={() => {
                                setSelectedPersonForMigration(reg);
                                setMigrationPassword('');
                                setMigrationModalOpen(true);
                              }} 
                              className="text-[#9c27b0] hover:bg-[#9c27b0]/10 p-2 rounded-full transition-colors" 
                              title="Migrar a Patrocinador"
                            >
                              <span className="material-symbols-outlined">business_center</span>
                            </button>
                          )}
                          {reg.status !== 'approved' && reg.status !== 'no_show' && reg.status !== 'migrated' && (
                            <button onClick={() => handleApprove(reg)} className="text-[#16a34a] hover:bg-[#16a34a]/10 p-2 rounded-full transition-colors" title="Aprobar">
                              <span className="material-symbols-outlined">check_circle</span>
                            </button>
                          )}
                          {reg.status === 'approved' && (
                            <>
                              <button onClick={() => handleResendQR(reg)} className="text-[#0d47a1] hover:bg-[#0d47a1]/10 p-2 rounded-full transition-colors" title="Reenviar Código QR">
                                <span className="material-symbols-outlined">mail</span>
                              </button>
                              <button onClick={() => handleNoShow(reg)} className="text-[#4b5563] hover:bg-[#4b5563]/10 p-2 rounded-full transition-colors" title="Marcar como No Asistió">
                                <span className="material-symbols-outlined">person_off</span>
                              </button>
                            </>
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

      {followUpModalOpen && selectedPersonForFollowUp && (
        <AdminFollowUpModal
          isOpen={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            setSelectedPersonForFollowUp(null);
          }}
          person={selectedPersonForFollowUp}
          collectionName="preregistrations"
          adminUser={{ username: auth.currentUser?.email || 'Staff' }}
        />
      )}

      {migrationModalOpen && selectedPersonForMigration && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#0d47a1] p-6 text-white relative flex-shrink-0">
              <button 
                onClick={() => setMigrationModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                disabled={isMigrating}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">business_center</span>
                Migrar a Patrocinador
              </h2>
              <p className="text-white/80 text-sm mt-2">
                Convertir a <strong>{selectedPersonForMigration.name}</strong> en Patrocinador oficial.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-[#f39200]/10 border border-[#f39200]/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-[#f39200] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  <span>
                    El usuario usará su correo <strong>{selectedPersonForMigration.email}</strong> para acceder. 
                    Por favor, asígnale una contraseña inicial y compártesela.
                  </span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    Contraseña Inicial (mín. 6 caracteres)
                  </label>
                  <input
                    type="text"
                    value={migrationPassword}
                    onChange={(e) => setMigrationPassword(e.target.value)}
                    placeholder="Ej. Expo2026-Ferreteria"
                    className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                    disabled={isMigrating}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-outline-variant bg-surface-variant/30 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setMigrationModalOpen(false)}
                className="px-4 py-2 text-secondary hover:bg-black/5 rounded-lg font-medium transition-colors"
                disabled={isMigrating}
              >
                Cancelar
              </button>
              <button
                onClick={handleMigrateConfirm}
                disabled={isMigrating || migrationPassword.length < 6}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all flex items-center gap-2"
              >
                {isMigrating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                    Migrando...
                  </>
                ) : (
                  <>
                    Confirmar Migración
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
