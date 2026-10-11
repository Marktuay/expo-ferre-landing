import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth, firebaseConfig } from '../firebase';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getEventBasePath } from '../config/eventConfig';
import AdminFollowUpModal from './AdminFollowUpModal';
import AdminQRViewModal from './AdminQRViewModal';

export default function AdminPreRegistrations({ onBack, adminUser }) {
  const [registrations, setRegistrations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'no_show' | 'migrated'
  const [loading, setLoading] = useState(true);
  
  // CRM States
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedPersonForFollowUp, setSelectedPersonForFollowUp] = useState(null);
  const [needsFollowUpOnly, setNeedsFollowUpOnly] = useState(false);

  // QR Modal States
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedPersonForQR, setSelectedPersonForQR] = useState(null);

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
        const d = doc.data();
        const fullName = d.name || (d.nombre ? `${d.nombre} ${d.apellido || ''}`.trim() : '') || '';
        const companyName = d.company || d.empresa || '';
        const emailAddr = d.email || d.correo || '';
        const phoneNum = d.phone || d.telefono || d.celular || '';
        const employeesVal = d.employees || d.empleados || (d.personalEmpresa ? `${d.personalEmpresa} pers.` : '');
        const positionVal = d.position || d.cargo || d.puesto || (d.isDirectInvite ? 'Invitado Especial' : '');

        results.push({
          id: doc.id,
          ...d,
          name: fullName,
          company: companyName,
          email: emailAddr,
          phone: phoneNum,
          employees: employeesVal,
          position: positionVal,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : new Date())
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
                    <li>📅 <strong>Fecha:</strong> 16 y 17 de Octubre de 2026</li>
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
    const nameMatch = (reg.name || '').toLowerCase().includes(term);
    const emailMatch = (reg.email || '').toLowerCase().includes(term);
    const phoneMatch = (reg.phone || '').toLowerCase().includes(term);
    const companyMatch = (reg.company || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || emailMatch || phoneMatch || companyMatch;
    
    if (needsFollowUpOnly && !reg.needsFollowUp) {
      return false;
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        const isPending = reg.status !== 'approved' && reg.status !== 'no_show' && reg.status !== 'migrated';
        if (!isPending) return false;
      } else if (reg.status !== statusFilter) {
        return false;
      }
    }

    return matchesSearch;
  });

  const totalCount = registrations.length;
  const approvedCount = registrations.filter(reg => reg.status === 'approved').length;
  const pendingCount = registrations.filter(reg => reg.status !== 'approved' && reg.status !== 'no_show' && reg.status !== 'migrated').length;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="w-full max-w-[1450px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div className="flex-shrink-0">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">Preregistros</h1>
            <p className="text-sm text-slate-500 mt-0.5">Personas que han completado el formulario de preregistro y pases directos.</p>
            
            {!loading && (
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2.5 rounded-xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg flex items-center justify-center ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    <span className="material-symbols-outlined text-[18px]">group</span>
                  </span>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'all' ? 'text-white/80' : 'text-slate-400'}`}>Todos</p>
                    <p className="text-xl font-black leading-tight">{totalCount}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('approved')}
                  className={`px-4 py-2.5 rounded-xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                    statusFilter === 'approved'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg flex items-center justify-center ${statusFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  </span>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'approved' ? 'text-white/80' : 'text-slate-400'}`}>Aprobados</p>
                    <p className="text-xl font-black leading-tight">{approvedCount}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-4 py-2.5 rounded-xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg flex items-center justify-center ${statusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>
                    <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                  </span>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'pending' ? 'text-white/80' : 'text-slate-400'}`}>Pendientes</p>
                    <p className="text-xl font-black leading-tight">{pendingCount}</p>
                  </div>
                </button>
              </div>
            )}
          </div>
          
          <div className="w-full lg:max-w-md flex flex-col gap-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, correo, teléfono o empresa..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-[#0d47a1] focus:ring-2 focus:ring-[#0d47a1]/20 outline-none text-sm text-slate-800 transition-all shadow-sm"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer ml-1 w-fit">
              <input
                type="checkbox"
                checked={needsFollowUpOnly}
                onChange={(e) => setNeedsFollowUpOnly(e.target.checked)}
                className="w-4 h-4 text-[#0d47a1] rounded border-slate-300 focus:ring-[#0d47a1]"
              />
              <span className="text-xs text-slate-700 font-semibold">Mostrar solo "Requiere Seguimiento"</span>
            </label>
          </div>

          <div className="flex flex-shrink-0 gap-3">
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
            }} className="px-4 py-2.5 bg-[#217346] hover:bg-[#1a5c37] text-white rounded-xl transition-all font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exportar Excel
            </button>
            <button onClick={onBack} className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Volver
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600 font-bold">
                  <th className="py-3.5 px-4 min-w-[210px]">Nombre</th>
                  <th className="py-3.5 px-4 min-w-[190px]">Empresa</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Email</th>
                  <th className="py-3.5 px-4 min-w-[140px] whitespace-nowrap">Teléfono</th>
                  <th className="py-3.5 px-4 min-w-[110px] whitespace-nowrap text-center">Empleados</th>
                  <th className="py-3.5 px-4 min-w-[140px] whitespace-nowrap">Puesto</th>
                  <th className="py-3.5 px-4 min-w-[120px] whitespace-nowrap text-center">Estado</th>
                  <th className="py-3.5 px-4 min-w-[110px] whitespace-nowrap text-center">Fecha</th>
                  <th className="py-3.5 px-4 min-w-[180px] whitespace-nowrap text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-12 text-center text-slate-400">
                      Cargando datos...
                    </td>
                  </tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-12 text-center text-slate-400">
                      No se encontraron resultados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{reg.name || 'Sin Nombre'}</div>
                        {reg.isDirectInvite && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                            Pase Directo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {reg.company || <span className="text-slate-400 italic text-xs">N/D</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                        {reg.email || <span className="text-slate-400 italic">N/D</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-mono text-xs font-semibold">
                        {reg.phone || <span className="text-slate-400 italic font-sans font-normal">N/D</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-center text-xs">
                        {reg.employees || <span className="text-slate-400">N/D</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {reg.position || <span className="text-slate-400">N/D</span>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider ${
                          reg.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                          reg.status === 'no_show' ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                          reg.status === 'migrated' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {reg.status === 'approved' ? 'APROBADO' : 
                           reg.status === 'no_show' ? 'NO ASISTIÓ' : 
                           reg.status === 'migrated' ? 'MIGRADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-center text-xs">
                        {reg.createdAt.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                        {reg.needsFollowUp && (
                          <div className="mt-1 flex items-center justify-center gap-1 text-[#f39200] text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[13px]">notification_important</span>
                            Seguimiento
                          </div>
                        )}
                        {reg.followUps && reg.followUps.length > 0 && (
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {reg.followUps.length} nota(s)
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ver Código QR */}
                          <button 
                            onClick={() => {
                              setSelectedPersonForQR(reg);
                              setQrModalOpen(true);
                            }} 
                            className="text-[#0d47a1] hover:bg-blue-50 p-2 rounded-xl transition-colors" 
                            title="Visualizar y Descargar Código QR"
                          >
                            <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                          </button>

                          <button 
                            onClick={() => {
                              setSelectedPersonForFollowUp(reg);
                              setFollowUpModalOpen(true);
                            }} 
                            className="text-[#f39200] hover:bg-amber-50 p-2 rounded-xl transition-colors relative" 
                            title="Añadir Seguimiento (CRM)"
                          >
                            <span className="material-symbols-outlined text-[20px]">support_agent</span>
                            {reg.followUps && reg.followUps.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
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
                              className="text-[#9c27b0] hover:bg-purple-50 p-2 rounded-xl transition-colors" 
                              title="Migrar a Patrocinador"
                            >
                              <span className="material-symbols-outlined text-[20px]">business_center</span>
                            </button>
                          )}
                          {reg.status !== 'approved' && reg.status !== 'no_show' && reg.status !== 'migrated' && (
                            <button onClick={() => handleApprove(reg)} className="text-[#16a34a] hover:bg-emerald-50 p-2 rounded-xl transition-colors" title="Aprobar">
                              <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            </button>
                          )}
                          {reg.status === 'approved' && (
                            <>
                              <button onClick={() => handleResendQR(reg)} className="text-[#0d47a1] hover:bg-blue-50 p-2 rounded-xl transition-colors" title="Reenviar Código QR">
                                <span className="material-symbols-outlined text-[20px]">mail</span>
                              </button>
                              <button onClick={() => handleNoShow(reg)} className="text-[#4b5563] hover:bg-slate-100 p-2 rounded-xl transition-colors" title="Marcar como No Asistió">
                                <span className="material-symbols-outlined text-[20px]">person_off</span>
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDelete(reg)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors" title="Eliminar">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
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

      {qrModalOpen && selectedPersonForQR && (
        <AdminQRViewModal
          isOpen={qrModalOpen}
          onClose={() => {
            setQrModalOpen(false);
            setSelectedPersonForQR(null);
          }}
          person={selectedPersonForQR}
          roleLabel="Asistente Registrado"
        />
      )}
    </div>
  );
}
