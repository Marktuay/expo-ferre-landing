import React, { useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';

export default function CreateSponsorModal({ onClose }) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    empresa: '',
    telefono: '',
    correo: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create a secondary Firebase app to avoid logging out the admin
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        // 2. Create the user in Auth
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          formData.correo, 
          formData.password
        );
        const user = userCredential.user;

        // 3. Save the sponsor data to Firestore
        await setDoc(doc(db, "users", user.uid), {
          nombre: formData.nombre,
          apellido: formData.apellido,
          empresa: formData.empresa,
          telefono: formData.telefono,
          correo: formData.correo,
          role: 'sponsor',
          status: 'pending', // Automatically set to pending based on user request
          createdAt: serverTimestamp()
        });
        setSuccess(true);
        
        // Agregar documento a la colección 'mail' para que la extensión "Trigger Email" envíe el correo
        await setDoc(doc(collection(db, 'mail')), {
          to: [formData.correo, 'karen.torres@rinsa.red', 'AdmonEventKT@gmail.com'],
          message: {
            subject: 'Bienvenido a Expo Ferre - Cuenta de Patrocinador Creada',
            text: `Hola ${formData.nombre},\n\nTu cuenta para el Panel de Patrocinadores de Expo Ferre ha sido creada exitosamente.\n\nPor los momentos, tu cuenta se encuentra en estado "Pendiente de Aprobación". Te notificaremos por este medio una vez que tu cuenta haya sido aprobada para que puedas ingresar.\n\nTus credenciales de acceso serán:\nCorreo: ${formData.correo}\nContraseña: ${formData.password}\n\n¡Gracias por ser parte de Expo Ferre!`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <!-- Header Image -->
                <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                
                <div style="padding: 30px;">
                  <h2 style="color: #0d47a1; margin-top: 0;">¡Hola ${formData.nombre}!</h2>
                  <p>Tu cuenta para el Panel de Patrocinadores de Expo Ferre ha sido creada exitosamente por la administración.</p>
                  
                  <div style="margin: 30px 0; padding: 20px; background-color: #fff3e0; border-radius: 8px; border-left: 4px solid #f39200;">
                    <p style="margin-top: 0; font-weight: bold; color: #e65100;">Estado: Pendiente de Aprobación</p>
                    <p style="margin-bottom: 0;">Te notificaremos por este medio una vez que tu cuenta haya sido aprobada para que puedas ingresar a la plataforma.</p>
                  </div>

                  <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0d47a1;">
                    <p style="margin-top: 0; font-weight: bold; color: #0d47a1; font-size: 16px;">Tus credenciales de acceso serán:</p>
                    <ul style="list-style: none; padding: 0; margin-bottom: 0;">
                      <li style="margin-bottom: 10px;"><strong>Correo:</strong> ${formData.correo}</li>
                      <li><strong>Contraseña:</strong> ${formData.password}</li>
                    </ul>
                  </div>
                  
                  <p>¡Gracias por ser parte de Expo Ferre!</p>
                </div>
                
                <!-- Footer Image -->
                <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              </div>
            `
          }
        });

        setTimeout(() => {
          onClose();
        }, 2000);
      } finally {
        // Always clean up the secondary app
        await deleteApp(secondaryApp);
      }
    } catch (err) {
      console.error("Error creating sponsor:", err);
      let errorMsg = "Error al crear el patrocinador.";
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = "Este correo ya está registrado.";
      } else if (err.code === 'auth/weak-password') {
        errorMsg = "La contraseña debe tener al menos 6 caracteres.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
        
        <div className="flex justify-between items-center p-6 border-b border-outline-variant">
          <h2 className="text-xl font-bold text-on-surface">Crear Patrocinador Manual</h2>
          <button 
            onClick={onClose}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors text-secondary"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-6xl text-[#4CAF50] mb-4">check_circle</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">¡Patrocinador Creado!</h3>
              <p className="text-secondary">El patrocinador ha sido registrado con estado Pendiente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-[20px]">error</span>
                  <p>{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-on-surface">Nombre</label>
                  <input 
                    type="text" 
                    name="nombre" 
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-on-surface">Apellido</label>
                  <input 
                    type="text" 
                    name="apellido" 
                    value={formData.apellido}
                    onChange={handleChange}
                    required
                    className="px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface">Empresa</label>
                <input 
                  type="text" 
                  name="empresa" 
                  value={formData.empresa}
                  onChange={handleChange}
                  required
                  className="px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface">Teléfono</label>
                <input 
                  type="tel" 
                  name="telefono" 
                  value={formData.telefono}
                  onChange={handleChange}
                  required
                  className="px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface">Correo Electrónico</label>
                <input 
                  type="email" 
                  name="correo" 
                  value={formData.correo}
                  onChange={handleChange}
                  required
                  className="px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface">Contraseña Temporal</label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                <p className="text-xs text-secondary mt-1">El cliente deberá usar esta contraseña para ingresar.</p>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
                <button 
                  type="button" 
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-2 border border-outline-variant text-secondary rounded-md hover:bg-surface-variant transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-on-primary rounded-md hover:brightness-110 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creando...
                    </>
                  ) : (
                    'Crear Patrocinador'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
