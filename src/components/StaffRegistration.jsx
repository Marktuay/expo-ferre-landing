import React, { useState, useEffect } from 'react';
import { UserCheck, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

const StaffRegistration = ({ onBack }) => {
  const [formState, setFormState] = useState('idle');
  const [registeredStaffId, setRegisteredStaffId] = useState(null);
  const [staffCount, setStaffCount] = useState(0);
  const [maxStaff, setMaxStaff] = useState(0);
  const [sponsorCompany, setSponsorCompany] = useState('');
  const [loadingLimit, setLoadingLimit] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchLimitData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoadingLimit(false);
        return;
      }
      
      try {
        let calculatedMax = 0;

        // 1. Obtener datos de la empresa y categoría desde el documento de usuario en Firestore (users/${user.uid})
        try {
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));
          if (userDocSnap.exists()) {
            const uData = userDocSnap.data();
            const companyName = uData.empresa || uData.company || uData.nombre || uData.name || '';
            setSponsorCompany(companyName);
            
            const cat = (uData.category || uData.sponsorCategory || uData.type || '').toLowerCase();
            if (cat.includes('diamante')) calculatedMax = 10;
            else if (cat.includes('oro')) calculatedMax = 6;
            else if (cat.includes('plata')) calculatedMax = 4;
          }
        } catch (e) {
          console.warn("No se pudo obtener el perfil de usuario:", e);
        }

        // 2. Si no hay categoría definida en el perfil, buscar en los stands reservados
        if (calculatedMax === 0) {
          const qStands = query(collection(db, `${getEventBasePath()}/stands`), where('sponsorId', '==', user.uid));
          const standsSnapshot = await getDocs(qStands);
          
          standsSnapshot.forEach(d => {
            const standData = d.data();
            const size = (standData.size || standData.category || standData.type || '').toLowerCase();
            if (size.includes('diamante')) {
              calculatedMax = Math.max(calculatedMax, 10);
            } else if (size.includes('oro')) {
              calculatedMax = Math.max(calculatedMax, 6);
            } else if (size.includes('plata')) {
              calculatedMax = Math.max(calculatedMax, 4);
            }
          });
        }
        
        // 3. Fallback seguro: Si no se encuentra categoría explícita ni stand aún, asignar 4 acreditaciones por defecto (Categoría Plata) para no bloquear al usuario
        if (calculatedMax === 0) {
          calculatedMax = 4;
        }

        setMaxStaff(calculatedMax);

        // Contar staff actual ya registrado por este patrocinador
        const qStaff = query(collection(db, `${getEventBasePath()}/staff`), where('sponsorId', '==', user.uid));
        const staffSnapshot = await getDocs(qStaff);
        setStaffCount(staffSnapshot.size);
        
      } catch (error) {
        console.error("Error fetching limit data:", error);
        setMaxStaff(prev => (prev > 0 ? prev : 4));
      } finally {
        setLoadingLimit(false);
      }
    };
    
    fetchLimitData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (staffCount >= maxStaff) {
      alert(`Has alcanzado el límite de staff permitido para tu categoría (${maxStaff} personas).`);
      return;
    }

    setFormState('submitting');
    
    try {
      const formData = new FormData(e.target);
      const user = auth.currentUser;
      
      const data = {
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        email: formData.get('email'),
        telefono: formData.get('telefono') || '',
        empresa: formData.get('empresa') || sponsorCompany || '',
        cargo: formData.get('cargo') || 'Staff de Stand',
        sector: formData.get('sector') || 'Comercial',
        createdAt: serverTimestamp(),
        sponsorId: user ? user.uid : null,
        sponsorEmail: user ? user.email : null
      };
      
      const docRef = await addDoc(collection(db, `${getEventBasePath()}/staff`), data);
      
      setRegisteredStaffId(docRef.id);
      setStaffCount(prev => prev + 1);
      setFormState('success');
    } catch (error) {
      console.error('Error saving staff:', error);
      setFormState('idle');
      alert('Hubo un error al guardar los datos. Intente nuevamente.');
    }
  };

  return (
    <main className="pt-40 md:pt-48 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-primary hover:text-primary-container font-bold transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span> Volver
        </button>
        <div className="text-center mb-10">
          <h1 className="font-headline-lg text-headline-lg text-primary mb-4 flex items-center justify-center gap-3">
            <UserCheck size={36} /> Registro de Staff
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Complete el formulario para acreditar al personal de equipo en Expo Ferre 2026.
          </p>
          
          {!loadingLimit && (
            <div className={`mt-4 inline-block px-4 py-2 rounded-full font-bold text-sm ${staffCount >= maxStaff ? 'bg-error text-on-error' : 'bg-primary-container text-on-primary-container'}`}>
              Staff registrado: {staffCount} / {maxStaff}
            </div>
          )}
        </div>

        <div className="bg-white p-8 md:p-12 rounded-lg shadow-sm border border-outline-variant">
          {formState === 'success' ? (
            <div className="bg-white p-8 rounded-lg border border-outline-variant text-center flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h3 className="font-bold text-2xl mb-2 text-primary">¡Registro completado!</h3>
                <p className="text-secondary mb-6">El código QR para la acreditación de su staff ha sido generado con éxito.</p>
                
                <div className="bg-surface-variant p-6 rounded-lg inline-block border border-outline mb-6">
                  <QRCodeSVG value={registeredStaffId || 'loading'} size={180} level="M" />
                  <p className="mt-4 text-sm font-mono text-secondary">ID: {registeredStaffId}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                  <button 
                    onClick={() => {
                      setFormState('idle');
                      setRegisteredStaffId(null);
                    }}
                    className="px-6 py-3 bg-surface border border-outline-variant rounded-md text-primary font-bold hover:bg-surface-variant transition-colors"
                  >
                    Registrar Otro Staff
                  </button>
                  <button 
                    onClick={onBack}
                    className="px-6 py-3 bg-primary text-on-primary rounded-md font-bold hover:bg-primary-container hover:text-on-primary-container transition-colors"
                  >
                    Volver al Panel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="font-headline-sm text-secondary border-b pb-2">Datos Personales del Staff</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Nombre <span className="text-error">*</span></label>
                    <input name="nombre" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Nombre" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Apellido <span className="text-error">*</span></label>
                    <input name="apellido" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Apellido" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Correo electrónico <span className="text-error">*</span></label>
                    <input name="email" required type="email" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="correo@ejemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Teléfono móvil</label>
                    <input name="telefono" type="tel" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="+505 8000 0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Empresa / Patrocinador</label>
                    <input name="empresa" type="text" defaultValue={sponsorCompany} className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Nombre de la empresa" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Cargo / Rol en el Stand</label>
                    <input name="cargo" type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Ej: Asesor Comercial, Técnico, etc." />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-4">
                {staffCount >= maxStaff && !loadingLimit ? (
                  <p className="text-error font-bold text-sm">
                    Has alcanzado el límite máximo de staff ({maxStaff}).
                  </p>
                ) : (
                  <p className="text-secondary text-sm">
                    Todos los campos con <span className="text-error">*</span> son obligatorios.
                  </p>
                )}
                
                <button 
                  type="submit" 
                  disabled={formState === 'submitting' || staffCount >= maxStaff || loadingLimit}
                  className="w-full md:w-auto px-8 py-3 bg-primary text-on-primary font-bold rounded-md hover:bg-primary-fixed transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {formState === 'submitting' ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : (
                    <>
                      <Send size={20} /> Registrar Staff
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
};

export default StaffRegistration;
