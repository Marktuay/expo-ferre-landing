import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, firebaseConfig } from '../firebase';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getEventBasePath } from '../config/eventConfig';
import AdminFollowUpModal from './AdminFollowUpModal';
import AdminQRViewModal from './AdminQRViewModal';
import PrintableBadgeList from './PrintableBadgeList';

export default function AdminPreRegistrations({ onBack, adminUser }) {
  const [registrations, setRegistrations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'no_show' | 'migrated'
  const [loading, setLoading] = useState(true);
  const [printItems, setPrintItems] = useState(null);
  
  // On-Site / Door Registration States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAttendee, setNewAttendee] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    position: 'Propietario',
    employees: '1 a 10 colaboradores',
    ciudad: 'Managua',
    checkedInNow: true
  });

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

  const handleCreateAttendee = async (e) => {
    e.preventDefault();
    const cleanName = (newAttendee.name || '').trim();
    const cleanPhone = (newAttendee.phone || '').trim();
    const cleanCompany = (newAttendee.company || '').trim() || 'Particular';
    const cleanEmail = (newAttendee.email || '').trim().toLowerCase();
    const cleanPosition = newAttendee.position || 'Propietario';
    const cleanEmployees = newAttendee.employees || '1 a 10 colaboradores';
    const cleanCity = (newAttendee.ciudad || '').trim() || 'Managua';
    const checkInNow = !!newAttendee.checkedInNow;

    if (!cleanName) {
      alert('Por favor ingresa el nombre del asistente.');
      return;
    }
    if (!cleanPhone) {
      alert('Por favor ingresa un número de teléfono o celular.');
      return;
    }

    setIsCreating(true);
    try {
      const newDocData = {
        name: cleanName,
        nombre: cleanName,
        company: cleanCompany,
        empresa: cleanCompany,
        email: cleanEmail,
        correo: cleanEmail,
        phone: cleanPhone,
        telefono: cleanPhone,
        celular: cleanPhone,
        position: cleanPosition,
        cargo: cleanPosition,
        puesto: cleanPosition,
        employees: cleanEmployees,
        personalEmpresa: cleanEmployees,
        ciudad: cleanCity,
        status: 'approved',
        source: 'Registro en Puerta (Admin)',
        type: 'on_site',
        isDirectInvite: false,
        checkedIn: checkInNow,
        checkInTime: checkInNow ? new Date() : null,
        createdAt: new Date(),
        approvedAt: new Date()
      };

      let attendeeId = '';
      if (cleanEmail) {
        const docRef = doc(db, `${getEventBasePath()}/preregistrations`, cleanEmail);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const overwrite = window.confirm(`El correo ${cleanEmail} ya existe en el sistema. ¿Deseas actualizar sus datos y asignarle acceso aprobado?`);
          if (!overwrite) {
            setIsCreating(false);
            return;
          }
        }
        await setDoc(docRef, newDocData, { merge: true });
        attendeeId = cleanEmail;
      } else {
        const docRef = await addDoc(collection(db, `${getEventBasePath()}/preregistrations`), newDocData);
        attendeeId = docRef.id;
      }

      // Si proporcionó correo, enviar confirmación con QR por correo
      if (cleanEmail) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(attendeeId)}&margin=10`;
        try {
          await addDoc(collection(db, 'mail'), {
            to: cleanEmail,
            message: {
              subject: '¡Registro Confirmado! Tu Acceso a EXPO FERRE 2026',
              html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                  <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                  <div style="padding: 30px;">
                    <h2 style="color: #16a34a; margin-top: 0;">¡Bienvenido(a), ${cleanName}!</h2>
                    <p>Tu registro en recepción para <strong>EXPO FERRE Nicaragua 2026</strong> ha sido completado con éxito.</p>
                    <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                      <p style="margin-top: 0; margin-bottom: 15px; font-weight: bold; color: #0d47a1;">Tu Código de Acceso QR</p>
                      <img src="${qrUrl}" alt="Código QR de Acceso" style="display: block; margin: 0 auto; width: 250px; height: 250px; border: 1px solid #e5e7eb; border-radius: 8px;"/>
                      <p style="margin-top: 15px; font-size: 14px; color: #6b7280; margin-bottom: 0;">Código: ${attendeeId}</p>
                    </div>
                  </div>
                  <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                </div>
              `
            }
          });
        } catch (mailErr) {
          console.warn('Error enviando correo de confirmación:', mailErr);
        }
      }

      const createdAttendee = {
        id: attendeeId,
        ...newDocData
      };

      setCreateModalOpen(false);
      setNewAttendee({
        name: '',
        company: '',
        email: '',
        phone: '',
        position: 'Propietario',
        employees: '1 a 10 colaboradores',
        ciudad: 'Managua',
        checkedInNow: true
      });

      // Abrir modal con QR para visualización / descarga inmediata
      setSelectedPersonForQR(createdAttendee);
      setQrModalOpen(true);
      alert('¡Asistente registrado exitosamente! Su código QR ha sido generado.');
    } catch (err) {
      console.error('Error registrando nuevo asistente:', err);
      alert('Error al registrar asistente: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

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

  if (printItems) {
    const target = printItems[0] || {};
    const role = target.position === 'Invitado Especial' || target.isDirectInvite ? 'Invitado Especial' : 'Asistente';
    return (
      <PrintableBadgeList
        items={printItems}
        roleLabel={role}
        onClose={() => setPrintItems(null)}
      />
    );
  }

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

          <div className="flex flex-wrap items-center flex-shrink-0 gap-2.5">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 bg-[#0d47a1] hover:bg-[#0a3880] text-white rounded-xl transition-all font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-blue-900/20 active:scale-95 cursor-pointer"
              title="Registrar asistente directamente en puerta"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Nuevo Registro (Puerta)</span>
            </button>

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
            <table className="w-full text-left border-collapse min-w-[1140px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600 font-bold">
                  <th className="py-3 px-3.5 min-w-[170px]">Nombre</th>
                  <th className="py-3 px-3 min-w-[130px] max-w-[160px]">Empresa</th>
                  <th className="py-3 px-3 min-w-[180px] max-w-[210px]">Email</th>
                  <th className="py-3 px-3 min-w-[115px] whitespace-nowrap">Teléfono</th>
                  <th className="py-3 px-2 min-w-[85px] whitespace-nowrap text-center">Empleados</th>
                  <th className="py-3 px-3 min-w-[110px] max-w-[130px] whitespace-nowrap">Puesto</th>
                  <th className="py-3 px-2 min-w-[100px] whitespace-nowrap text-center">Estado</th>
                  <th className="py-3 px-2 min-w-[90px] whitespace-nowrap text-center">Fecha</th>
                  <th className="py-3 px-3 min-w-[160px] whitespace-nowrap text-center sticky right-0 bg-slate-100/95 backdrop-blur z-20 shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)]">
                    Acciones
                  </th>
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
                    <tr key={reg.id} className="hover:bg-slate-50/90 transition-colors group">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 text-xs leading-snug">{reg.name || 'Sin Nombre'}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {reg.isDirectInvite && (
                            <span className="inline-block px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[9px] font-bold rounded-full border border-blue-200">
                              Pase Directo
                            </span>
                          )}
                          {reg.type === 'on_site' && (
                            <span className="inline-block px-1.5 py-0.2 bg-purple-50 text-purple-700 text-[9px] font-bold rounded-full border border-purple-200">
                              En Puerta
                            </span>
                          )}
                          {reg.checkedIn && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full border border-emerald-200">
                              <span className="material-symbols-outlined text-[10px]">check</span>
                              Ingresó
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium text-xs truncate max-w-[160px]" title={reg.company}>
                        {reg.company || <span className="text-slate-400 italic">N/D</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-xs truncate max-w-[210px]" title={reg.email}>
                        {reg.email || <span className="text-slate-400 italic">N/D</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-mono text-xs font-semibold">
                        {reg.phone || <span className="text-slate-400 italic font-sans font-normal">N/D</span>}
                      </td>
                      <td className="py-3 px-2 text-slate-600 whitespace-nowrap text-center text-xs">
                        {reg.employees || <span className="text-slate-400">N/D</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs truncate max-w-[130px]" title={reg.position}>
                        {reg.position || <span className="text-slate-400">N/D</span>}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
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
                      <td className="py-3 px-2 text-slate-500 whitespace-nowrap text-center text-xs">
                        {reg.createdAt.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                        {reg.needsFollowUp && (
                          <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[#f39200] text-[9px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">notification_important</span>
                            Seguimiento
                          </div>
                        )}
                        {reg.followUps && reg.followUps.length > 0 && (
                          <div className="text-[9px] text-slate-400">
                            {reg.followUps.length} nota(s)
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur z-10 shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] group-hover:bg-slate-50/95 transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          {/* Ver Código QR */}
                          <button 
                            onClick={() => {
                              setSelectedPersonForQR(reg);
                              setQrModalOpen(true);
                            }} 
                            className="text-[#0d47a1] hover:bg-blue-50 p-1.5 rounded-lg transition-colors" 
                            title="Visualizar y Descargar Código QR"
                          >
                            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                          </button>

                          <button 
                            onClick={() => {
                              setSelectedPersonForFollowUp(reg);
                              setFollowUpModalOpen(true);
                            }} 
                            className="text-[#f39200] hover:bg-amber-50 p-1.5 rounded-lg transition-colors relative" 
                            title="Añadir Seguimiento (CRM)"
                          >
                            <span className="material-symbols-outlined text-[18px]">support_agent</span>
                            {reg.followUps && reg.followUps.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold">
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
                              className="text-[#9c27b0] hover:bg-purple-50 p-1.5 rounded-lg transition-colors" 
                              title="Migrar a Patrocinador"
                            >
                              <span className="material-symbols-outlined text-[18px]">business_center</span>
                            </button>
                          )}
                          {reg.status !== 'approved' && reg.status !== 'no_show' && reg.status !== 'migrated' && (
                            <button onClick={() => handleApprove(reg)} className="text-[#16a34a] hover:bg-emerald-50 p-1.5 rounded-lg transition-colors" title="Aprobar">
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                          )}
                          {reg.status === 'approved' && (
                            <>
                              <button onClick={() => setPrintItems([reg])} className="text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Imprimir Etiqueta Térmica (Brother QL)">
                                <span className="material-symbols-outlined text-[18px]">print</span>
                              </button>
                              <button onClick={() => handleResendQR(reg)} className="text-[#0d47a1] hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="Reenviar Código QR">
                                <span className="material-symbols-outlined text-[18px]">mail</span>
                              </button>
                              <button onClick={() => handleNoShow(reg)} className="text-[#4b5563] hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Marcar como No Asistió">
                                <span className="material-symbols-outlined text-[18px]">person_off</span>
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDelete(reg)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Eliminar">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
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

      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#0d47a1] p-5 md:p-6 text-white relative flex-shrink-0">
              <button 
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                disabled={isCreating}
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <span className="material-symbols-outlined text-[14px]">how_to_reg</span>
                Recepción • Día del Evento
              </div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px]">person_add</span>
                Nuevo Registro en Puerta
              </h2>
              <p className="text-blue-100 text-xs mt-1">
                Registra y acredita a personas que se presentan al evento sin preregistro previo.
              </p>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleCreateAttendee} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 md:p-6 overflow-y-auto space-y-4 flex-1">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos Mendoza"
                      value={newAttendee.name}
                      onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0d47a1] focus:bg-white focus:ring-1 focus:ring-[#0d47a1] outline-none text-xs text-slate-900 transition-all font-medium"
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Empresa / Ferretería <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Ferretería El Progreso"
                      value={newAttendee.company}
                      onChange={(e) => setNewAttendee({ ...newAttendee, company: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0d47a1] focus:bg-white focus:ring-1 focus:ring-[#0d47a1] outline-none text-xs text-slate-900 transition-all font-medium"
                      disabled={isCreating}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Número de Celular <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. +505 8888-8888"
                      value={newAttendee.phone}
                      onChange={(e) => setNewAttendee({ ...newAttendee, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0d47a1] focus:bg-white focus:ring-1 focus:ring-[#0d47a1] outline-none text-xs text-slate-900 font-mono transition-all font-medium"
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Correo Electrónico</span>
                      <span className="text-slate-400 font-normal text-[10px] normal-case">(Opcional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="cliente@correo.com (opcional)"
                      value={newAttendee.email}
                      onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0d47a1] focus:bg-white focus:ring-1 focus:ring-[#0d47a1] outline-none text-xs text-slate-900 transition-all font-medium"
                      disabled={isCreating}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Puesto / Cargo
                    </label>
                    <select
                      value={newAttendee.position}
                      onChange={(e) => setNewAttendee({ ...newAttendee, position: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0d47a1] focus:bg-white focus:ring-1 focus:ring-[#0d47a1] outline-none text-xs text-slate-900 transition-all font-medium"
                      disabled={isCreating}
                    >
                      <option value="Propietario">Propietario</option>
                      <option value="Gerente General">Gerente General</option>
                      <option value="Administración y Finanzas">Administración y Finanzas</option>
                      <option value="Compras">Compras</option>
                      <option value="Ventas">Ventas</option>
                      <option value="Bodega e Inventario">Bodega e Inventario</option>
                      <option value="Logística">Logística</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Colaboradores
                    </label>
                    <select
                      value={newAttendee.employees}
                      onChange={(e) => setNewAttendee({ ...newAttendee, employees: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0d47a1] focus:bg-white focus:ring-1 focus:ring-[#0d47a1] outline-none text-xs text-slate-900 transition-all font-medium"
                      disabled={isCreating}
                    >
                      <option value="1 a 10 colaboradores">1 a 10 colaboradores</option>
                      <option value="11 a 50 colaboradores">11 a 50 colaboradores</option>
                      <option value="51 a 100 colaboradores">51 a 100 colaboradores</option>
                      <option value="101 a 500 colaboradores">101 a 500 colaboradores</option>
                      <option value="Más de 500 colaboradores">Más de 500 colaboradores</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ciudad / Municipio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Managua"
                    value={newAttendee.ciudad}
                    onChange={(e) => setNewAttendee({ ...newAttendee, ciudad: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0d47a1] focus:bg-white focus:ring-1 focus:ring-[#0d47a1] outline-none text-xs text-slate-900 transition-all font-medium"
                    disabled={isCreating}
                  />
                </div>

                {/* Switch de Check-in Inmediato */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[22px] mt-0.5">check_circle</span>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        Marcar Asistencia (Check-in) Inmediato
                      </p>
                      <p className="text-[11px] text-emerald-800 leading-tight">
                        La persona ingresa directamente al salón sin necesidad de volver a escanear su QR.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={newAttendee.checkedInNow}
                      onChange={(e) => setNewAttendee({ ...newAttendee, checkedInNow: e.target.checked })}
                      className="sr-only peer"
                      disabled={isCreating}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 md:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors"
                  disabled={isCreating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 bg-[#0d47a1] hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Registrar y Emitir Pase</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
          roleLabel={selectedPersonForQR.position === 'Invitado Especial' || selectedPersonForQR.isDirectInvite ? 'Invitado Especial' : 'Asistente'}
          onPrintBadge={(p) => setPrintItems([p])}
        />
      )}
    </div>
  );
}
