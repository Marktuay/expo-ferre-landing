import React, { useState, useEffect } from 'react';
import { UserCheck, Send } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

const StaffRegistration = ({ onBack }) => {
  const [formState, setFormState] = useState('idle');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('submitting');
    
    try {
      const formData = new FormData(e.target);
      const user = auth.currentUser;
      
      const data = {
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        empresa: formData.get('empresa'),
        tamanoEmpresa: formData.get('tamanoEmpresa'),
        sector: formData.get('sector'),
        tipoCargo: formData.get('tipoCargo'),
        cargo: formData.get('cargo'),
        createdAt: serverTimestamp(),
        sponsorId: user ? user.uid : null,
        sponsorEmail: user ? user.email : null
      };
      
      await addDoc(collection(db, `${getEventBasePath()}/staff`), data);
      
      setFormState('success');
      setTimeout(() => {
        setFormState('idle');
        onBack();
      }, 3000);
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
            Por favor, complete el siguiente formulario oficial para registrarse como parte del equipo de Staff de Expo Ferre 2026. Todos los campos son obligatorios.
          </p>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-lg shadow-sm border border-outline-variant">
          {formState === 'success' ? (
            <div className="bg-green-50 text-green-800 p-8 rounded-lg border border-green-200 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">¡Registro completado!</h3>
                <p>Sus datos han sido recibidos correctamente. Nos comunicaremos pronto.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="font-headline-sm text-secondary border-b pb-2">Datos Personales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Nombre <span className="text-error">*</span></label>
                    <input name="nombre" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Su nombre" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Apellido <span className="text-error">*</span></label>
                    <input name="apellido" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Su apellido" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Correo electrónico <span className="text-error">*</span></label>
                    <input name="email" required type="email" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="correo@ejemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Teléfono móvil</label>
                    <input name="telefono" type="tel" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="+505 8000 0000" />
                  </div>

                </div>
              </div>


              {/* Datos Empresariales */}
              <div className="space-y-4 pt-4">
                <h3 className="font-headline-sm text-secondary border-b pb-2">Datos Empresariales</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Empresa u Organización <span className="text-error">*</span></label>
                    <input name="empresa" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Nombre de la empresa u organización" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Tamaño de empresa</label>
                    <select name="tamanoEmpresa" defaultValue="" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface">
                      <option value="" disabled>Seleccione...</option>
                      <option value="1-10">1 a 10 empleados</option>
                      <option value="11-50">11 a 50 empleados</option>
                      <option value="51-200">51 a 200 empleados</option>
                      <option value="201+">Más de 200 empleados</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Sector</label>
                    <select name="sector" defaultValue="" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface">
                      <option value="" disabled>Seleccione...</option>
                      <option value="construccion">Construcción</option>
                      <option value="ferreteria">Ferretería</option>
                      <option value="manufactura">Manufactura</option>
                      <option value="importacion">Importación / Exportación</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Tipo de cargo</label>
                    <select name="tipoCargo" defaultValue="" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface">
                      <option value="" disabled>Seleccione...</option>
                      <option value="directivo">Directivo / Gerencial</option>
                      <option value="operativo">Operativo / Técnico</option>
                      <option value="ventas">Ventas / Comercial</option>
                      <option value="independiente">Independiente</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Cargo que desempeña <span className="text-error">*</span></label>
                    <input name="cargo" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Ej. Gerente de Ventas" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-outline-variant flex justify-end">
                <button 
                  type="submit" 
                  disabled={formState === 'submitting'}
                  className="w-full md:w-auto px-8 py-3 bg-primary text-on-primary font-bold rounded-md hover:bg-primary-fixed transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {formState === 'submitting' ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : (
                    <>
                      <Send size={20} /> Registrarse
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
