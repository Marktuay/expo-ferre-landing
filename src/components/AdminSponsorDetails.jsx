import React, { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

export default function AdminSponsorDetails({ sponsor, onBack }) {
  const [currentSponsor, setCurrentSponsor] = useState(sponsor);
  const [guests, setGuests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para modal de edición
  const [isEditingSponsor, setIsEditingSponsor] = useState(false);
  const [savingSponsor, setSavingSponsor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    empresa: '',
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    password: ''
  });

  useEffect(() => {
    setCurrentSponsor(sponsor);
  }, [sponsor]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!currentSponsor) return;

    // Use sponsor.id (which is their uid) or their email as fallback for legacy records
    const sponsorId = currentSponsor.id;
    const sponsorEmail = (currentSponsor.correo || currentSponsor.email || '').toLowerCase().trim();
    const sponsorCompany = (currentSponsor.empresa || currentSponsor.company || currentSponsor.nombre || '').toLowerCase().trim();

    // Escuchar invitados
    const qGuests = query(collection(db, `${getEventBasePath()}/guests`));
    const unsubGuests = onSnapshot(qGuests, (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(g => {
          const gEmail = (g.sponsorEmail || g.email || '').toLowerCase().trim();
          return g.sponsorId === sponsorId || (sponsorEmail && gEmail === sponsorEmail);
        });
      setGuests(list);
    });

    // Escuchar staff
    const qStaff = query(collection(db, `${getEventBasePath()}/staff`));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => {
          const sEmail = (s.sponsorEmail || s.email || '').toLowerCase().trim();
          return s.sponsorId === sponsorId || (sponsorEmail && sEmail === sponsorEmail);
        });
      setStaff(list);
    });

    // Escuchar conferencistas
    const qSpeakers = query(collection(db, `${getEventBasePath()}/speakers`));
    const unsubSpeakers = onSnapshot(qSpeakers, (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(sp => {
          const spEmail = (sp.sponsorEmail || sp.email || '').toLowerCase().trim();
          return sp.sponsorId === sponsorId || (sponsorEmail && spEmail === sponsorEmail);
        });
      setSpeakers(list);
    });

    // Escuchar stands
    const qStands = query(collection(db, `${getEventBasePath()}/stands`));
    const unsubStands = onSnapshot(qStands, (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(st => {
          // Filtrar únicamente stands que estén reservados
          const isReserved = st.status === 'reserved' || st.status === 'reserved_official' || st.status === 'sold';
          if (!isReserved) return false;

          const stEmail = (st.reservationDetails?.correo || st.sponsorEmail || st.email || '').toLowerCase().trim();
          const stComp = (st.reservationDetails?.empresa || st.company || st.empresa || '').toLowerCase().trim();
          
          const idMatch = Boolean(sponsorId && st.sponsorId && st.sponsorId === sponsorId);
          const emailMatch = Boolean(sponsorEmail && stEmail && stEmail === sponsorEmail);
          const compMatch = Boolean(
            sponsorCompany.length > 0 && 
            stComp.length > 0 && 
            (stComp === sponsorCompany || stComp.includes(sponsorCompany) || sponsorCompany.includes(stComp))
          );
          const nameMatch = Boolean(st.name && currentSponsor.standList && Array.isArray(currentSponsor.standList) && currentSponsor.standList.includes(st.name));

          return idMatch || emailMatch || compMatch || nameMatch;
        });
      setStands(list);
    });

    // Set loading false after a small delay
    const timer = setTimeout(() => setLoading(false), 600);

    return () => {
      unsubGuests();
      unsubStaff();
      unsubSpeakers();
      unsubStands();
      clearTimeout(timer);
    };
  }, [currentSponsor]);

  const handleOpenEdit = () => {
    setEditForm({
      empresa: currentSponsor.empresa || currentSponsor.company || '',
      nombre: currentSponsor.nombre || '',
      apellido: currentSponsor.apellido || '',
      correo: currentSponsor.correo || currentSponsor.email || '',
      telefono: currentSponsor.telefono || currentSponsor.phone || '',
      password: currentSponsor.password || ''
    });
    setShowPassword(false);
    setIsEditingSponsor(true);
  };

  const handleSaveSponsor = async (e) => {
    e.preventDefault();
    setSavingSponsor(true);
    try {
      const newEmail = editForm.correo.trim();
      const newPassword = editForm.password.trim();
      const oldPassword = currentSponsor.password || '';
      const oldEmail = currentSponsor.correo || currentSponsor.email || '';

      const updatedData = {
        empresa: editForm.empresa.trim(),
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
        correo: newEmail,
        email: newEmail,
        telefono: editForm.telefono.trim(),
        phone: editForm.telefono.trim(),
        password: newPassword,
        role: 'sponsor',
        status: 'approved'
      };

      // 1. Sincronizar / Actualizar la contraseña en Firebase Auth mediante una app secundaria
      if (newEmail && newPassword) {
        try {
          const secondaryApp = initializeApp(firebaseConfig, `SecApp_Edit_${Date.now()}`);
          const secondaryAuth = getAuth(secondaryApp);
          let syncedInAuth = false;

          // Intento A: Si teníamos contraseña anterior registrada en Firestore y cambió, intentar ingresar y actualizar
          if (oldPassword && oldPassword !== newPassword) {
            try {
              const cred = await signInWithEmailAndPassword(secondaryAuth, oldEmail || newEmail, oldPassword);
              await updatePassword(cred.user, newPassword);
              syncedInAuth = true;
            } catch (errOldAuth) {
              console.warn('No se pudo autenticar en Firebase Auth con clave previa:', errOldAuth);
            }
          }

          // Intento B: Si ya tenía la clave nueva en Auth, probar loguear con clave nueva
          if (!syncedInAuth) {
            try {
              await signInWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
              syncedInAuth = true;
            } catch (errNewAuth) {
              // No estaba en Auth con la clave nueva
            }
          }

          // Intento C: Si el usuario NO existe en Firebase Auth, crearlo en Auth de una vez con la nueva clave
          if (!syncedInAuth) {
            try {
              const userCred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
              if (userCred.user) {
                // Guardar también con la llave UID de Auth en la colección 'users'
                await setDoc(doc(db, 'users', userCred.user.uid), updatedData, { merge: true });
                syncedInAuth = true;
              }
            } catch (errCreate) {
              console.warn('No se pudo crear usuario en Auth:', errCreate);
            }
          }

          deleteApp(secondaryApp);
        } catch (secErr) {
          console.error('Error gestionando autenticación secundaria:', secErr);
        }
      }

      // 2. Actualizar usuario en Firestore si posee ID de documento
      if (currentSponsor.id) {
        await setDoc(doc(db, 'users', currentSponsor.id), updatedData, { merge: true });
      }

      // 3. Sincronizar reservationDetails en todos los stands reservados por el cliente
      if (stands && stands.length > 0) {
        for (const stand of stands) {
          if (stand.id) {
            const standRef = doc(db, `${getEventBasePath()}/stands`, stand.id);
            await setDoc(standRef, {
              reservationDetails: {
                ...(stand.reservationDetails || {}),
                empresa: editForm.empresa.trim(),
                nombre: editForm.nombre.trim(),
                apellido: editForm.apellido.trim(),
                correo: editForm.correo.trim(),
                telefono: editForm.telefono.trim()
              }
            }, { merge: true });
          }
        }
      }

      // 3. Enviar notificación por correo al usuario con sus datos y credenciales
      if (editForm.correo.trim()) {
        await addDoc(collection(db, 'mail'), {
          to: [editForm.correo.trim(), 'karen.torres@rinsa.red', 'AdmonEventKT@gmail.com'],
          message: {
            subject: `Expo Ferre 2026 - Actualización de Datos de Acceso (${editForm.empresa.trim()})`,
            text: `Hola ${editForm.nombre.trim()},\n\nTe notificamos que la información de contacto para la cuenta de patrocinador de "${editForm.empresa.trim()}" ha sido actualizada en la plataforma de Expo Ferre 2026.\n\nTus credenciales de acceso son:\nUsuario / Correo: ${editForm.correo.trim()}\nContraseña: ${editForm.password.trim() || '(Sin cambios)'}\n\nPuedes ingresar al portal en: https://expoferrenicaragua.com\n\n¡Gracias por formar parte de Expo Ferre 2026!`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                
                <div style="padding: 30px;">
                  <h2 style="color: #0d47a1; margin-top: 0;">¡Hola ${editForm.nombre.trim()}!</h2>
                  <p>Te notificamos que los datos de contacto y credenciales de acceso para la empresa <strong>${editForm.empresa.trim()}</strong> han sido actualizados por la administración de Expo Ferre 2026.</p>
                  
                  <div style="margin: 25px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0d47a1;">
                    <p style="margin-top: 0; font-weight: bold; color: #0d47a1; font-size: 16px;">Tus datos y credenciales de acceso:</p>
                    <ul style="list-style: none; padding: 0; margin-bottom: 0;">
                      <li style="margin-bottom: 10px;"><strong>Empresa:</strong> ${editForm.empresa.trim()}</li>
                      <li style="margin-bottom: 10px;"><strong>Contacto:</strong> ${editForm.nombre.trim()} ${editForm.apellido.trim()}</li>
                      <li style="margin-bottom: 10px;"><strong>Usuario / Correo:</strong> ${editForm.correo.trim()}</li>
                      <li style="margin-bottom: 10px;"><strong>Teléfono:</strong> ${editForm.telefono.trim()}</li>
                      <li style="margin-bottom: 10px;"><strong>Contraseña:</strong> ${editForm.password.trim() || '<em>(Sin cambios o previamente asignada)</em>'}</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://expoferrenicaragua.com" style="background-color: #f39200; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ingresar al Portal de Patrocinadores</a>
                  </div>
                  
                  <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta o inquietud, puedes comunicarte con el equipo organizador del evento.</p>
                </div>
                
                <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              </div>
            `
          }
        });
      }

      // 4. Actualizar estado local para refresco inmediato de UI
      setCurrentSponsor(prev => ({
        ...prev,
        ...updatedData
      }));

      setIsEditingSponsor(false);
      alert('Información del patrocinador actualizada y correo de notificación enviado al nuevo usuario.');
    } catch (error) {
      console.error('Error actualizando patrocinador:', error);
      alert('Hubo un error al guardar los cambios: ' + error.message);
    } finally {
      setSavingSponsor(false);
    }
  };

  if (loading) {
    return (
      <main className="pt-40 md:pt-48 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-secondary font-bold">Cargando detalles del patrocinador...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-40 md:pt-48 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-primary hover:text-primary-container font-bold transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span> Volver a Patrocinadores
        </button>
        
        <div className="mb-10 bg-white p-6 rounded-lg shadow-sm border border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex-1">
            <div className="bg-primary text-on-primary inline-block px-3 py-1 font-label-sm text-label-xs uppercase tracking-widest clip-industrial mb-2">VISTA 360 DEL PATROCINADOR</div>
            <h1 className="font-headline-md text-headline-md text-secondary flex items-center gap-2 flex-wrap">
              {currentSponsor.empresa}
              {currentSponsor.status === 'pending' ? (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-400 align-middle ml-2">Pendiente</span>
              ) : (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-400 align-middle ml-2">Aprobado</span>
              )}
            </h1>
            <p className="text-on-surface-variant mt-1">
              <strong>Contacto:</strong> {currentSponsor.nombre} {currentSponsor.apellido} | <strong>Email:</strong> {currentSponsor.correo} | <strong>Teléfono:</strong> {currentSponsor.telefono}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleOpenEdit}
              className="px-4 py-2 bg-secondary text-white border border-secondary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              Editar Información
            </button>

            {currentSponsor.status === 'pending' && (
              <button 
                onClick={async () => {
                  if(window.confirm('¿Deseas aprobar a este patrocinador? Se habilitarán todas sus funcionalidades.')){
                    try {
                      await updateDoc(doc(db, 'users', currentSponsor.id), { status: 'approved' });
                      setCurrentSponsor(prev => ({ ...prev, status: 'approved' }));
                      alert('Patrocinador aprobado exitosamente.');
                    } catch(e) {
                      console.error('Error approving:', e);
                      alert('Hubo un error.');
                    }
                  }
                }}
                className="px-5 py-2 bg-green-600 text-white border border-green-700 rounded-md hover:bg-green-700 transition-colors font-label-lg flex items-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Aprobar Cuenta
              </button>
            )}
          </div>
        </div>

        <div className="space-y-12">
          {/* STANDS */}
          <section className="bg-surface rounded-lg shadow-sm border border-outline-variant overflow-hidden">
            <div className="bg-surface-variant px-6 py-4 border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">map</span>
              <h2 className="font-headline-sm font-bold text-secondary">Stands Reservados ({stands.length})</h2>
            </div>
            <div className="p-6">
              {stands.length === 0 ? (
                <p className="text-on-surface-variant italic">No tiene stands reservados.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stands.map(stand => (
                    <div key={stand.id} className="border border-outline-variant rounded-md p-4 flex flex-col gap-2 relative bg-white shadow-2xs">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg">{stand.name || (stand.id ? `Stand ${stand.id.replace('stand-', '')}` : 'Stand')}</h3>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold uppercase">{stand.status}</span>
                      </div>
                      <p className="text-sm text-secondary"><strong>Tamaño:</strong> {stand.size || stand.reservationDetails?.categoria || ''}</p>
                      <p className="text-sm text-secondary"><strong>Precio:</strong> {stand.price}</p>

                      {stand.logo && (
                        <div className="mt-2 w-12 h-12 rounded-full overflow-hidden border-2 border-primary absolute bottom-4 right-4 bg-white">
                          <img src={stand.logo} alt="Logo stand" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* INVITADOS */}
          <section className="bg-surface rounded-lg shadow-sm border border-outline-variant overflow-hidden">
            <div className="bg-surface-variant px-6 py-4 border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">groups</span>
              <h2 className="font-headline-sm font-bold text-secondary">Invitados ({guests.length})</h2>
            </div>
            <div className="overflow-x-auto p-4">
              {guests.length === 0 ? (
                <p className="text-on-surface-variant italic px-2">No tiene invitados registrados.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-secondary">
                      <th className="p-3 font-bold">Nombre</th>
                      <th className="p-3 font-bold">Empresa</th>
                      <th className="p-3 font-bold">Cargo</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map(guest => (
                      <tr key={guest.id} className="border-b border-outline-variant hover:bg-surface-variant/30">
                        <td className="p-3">{guest.nombre} {guest.apellido}</td>
                        <td className="p-3">{guest.empresa}</td>
                        <td className="p-3">{guest.cargo}</td>
                        <td className="p-3">{guest.email}</td>
                        <td className="p-3">{guest.celular}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* STAFF */}
          <section className="bg-surface rounded-lg shadow-sm border border-outline-variant overflow-hidden">
            <div className="bg-surface-variant px-6 py-4 border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">badge</span>
              <h2 className="font-headline-sm font-bold text-secondary">Staff ({staff.length})</h2>
            </div>
            <div className="overflow-x-auto p-4">
              {staff.length === 0 ? (
                <p className="text-on-surface-variant italic px-2">No tiene staff registrado.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-secondary">
                      <th className="p-3 font-bold">Nombre</th>
                      <th className="p-3 font-bold">Cargo</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s.id} className="border-b border-outline-variant hover:bg-surface-variant/30">
                        <td className="p-3">{s.nombre} {s.apellido}</td>
                        <td className="p-3">{s.cargo || s.tipoCargo}</td>
                        <td className="p-3">{s.email}</td>
                        <td className="p-3">{s.telefono}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* CONFERENCIAS */}
          <section className="bg-surface rounded-lg shadow-sm border border-outline-variant overflow-hidden">
            <div className="bg-surface-variant px-6 py-4 border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">mic</span>
              <h2 className="font-headline-sm font-bold text-secondary">Conferencias ({speakers.length})</h2>
            </div>
            <div className="overflow-x-auto p-4">
              {speakers.length === 0 ? (
                <p className="text-on-surface-variant italic px-2">No tiene conferencias registradas.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-secondary">
                      <th className="p-3 font-bold">Speaker</th>
                      <th className="p-3 font-bold">Título</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Formatos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {speakers.map(s => (
                      <tr key={s.id} className="border-b border-outline-variant hover:bg-surface-variant/30">
                        <td className="p-3">{s.nombre} {s.apellido}</td>
                        <td className="p-3 font-bold">{s.titulo}</td>
                        <td className="p-3">{s.email}</td>
                        <td className="p-3">{s.formatos?.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE PATROCINADOR */}
      {isEditingSponsor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-outline-variant animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant">
              <h3 className="font-headline-sm text-xl font-bold text-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit</span>
                Editar Información del Patrocinador
              </h3>
              <button 
                onClick={() => setIsEditingSponsor(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveSponsor} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Nombre de la Empresa</label>
                <input 
                  type="text"
                  required
                  value={editForm.empresa}
                  onChange={(e) => setEditForm({ ...editForm, empresa: e.target.value })}
                  className="w-full p-2.5 border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Ej. Sinsa"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-secondary mb-1">Nombre del Contacto</label>
                  <input 
                    type="text"
                    required
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    className="w-full p-2.5 border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Ej. Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary mb-1">Apellido del Contacto</label>
                  <input 
                    type="text"
                    value={editForm.apellido}
                    onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })}
                    className="w-full p-2.5 border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Ej. Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Correo Electrónico (Usuario de Acceso)</label>
                <input 
                  type="email"
                  required
                  value={editForm.correo}
                  onChange={(e) => setEditForm({ ...editForm, correo: e.target.value })}
                  className="w-full p-2.5 border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="correo@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Teléfono de Contacto</label>
                <input 
                  type="tel"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                  className="w-full p-2.5 border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Ej. 505 8888 8888"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Contraseña de Acceso (Password)</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full p-2.5 pr-10 border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm"
                    placeholder="Escribe o asigna una contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">El usuario utilizará su correo como nombre de usuario y esta contraseña para ingresar al portal.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsEditingSponsor(false)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant font-bold rounded-md transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSponsor}
                  className="px-5 py-2 bg-primary text-on-primary font-bold rounded-md hover:brightness-110 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {savingSponsor ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">save</span>
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

