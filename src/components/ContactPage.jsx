import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ContactPage = () => {
  const [formState, setFormState] = useState('idle');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('submitting');
    
    const formData = new FormData(e.target);
    const data = {
      nombre: formData.get('nombre'),
      empresa: formData.get('empresa'),
      email: formData.get('email'),
      telefono: formData.get('telefono'),
      asunto: formData.get('asunto'),
      mensaje: formData.get('mensaje'),
      createdAt: serverTimestamp(),
      status: 'pending'
    };

    try {
      await addDoc(collection(db, 'contacts'), data);
      setFormState('success');
      setTimeout(() => {
        setFormState('idle');
        e.target.reset();
      }, 3000);
    } catch (error) {
      console.error('Error enviando contacto:', error);
      setFormState('idle');
      alert('Hubo un error al enviar el mensaje. Intente de nuevo más tarde.');
    }
  };

  return (
    <main className="pt-40 md:pt-48 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-headline-lg text-headline-lg text-primary mb-4">Contáctenos</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            ¿Tienes dudas sobre Expo Ferre 2026? Nuestro equipo está listo para ayudarte con información sobre patrocinios, espacios comerciales y asistencia general.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-secondary mb-1">Ubicación</h3>
                <p className="font-body-md text-on-surface-variant">Centro de Convenciones Crowne Plaza<br/>Managua, Nicaragua</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-secondary mb-1">Correo Electrónico</h3>
                <p className="font-body-md text-on-surface-variant">info@expoferre.com<br/>ventas@expoferre.com</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-secondary mb-1">Teléfonos</h3>
                <p className="font-body-md text-on-surface-variant">+505 2222-0000<br/>+505 8888-0000</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white p-8 rounded-lg shadow-sm border border-outline-variant">
            <h2 className="font-headline-md text-headline-md text-secondary mb-6 border-b-2 border-primary/20 pb-2">Envíanos un mensaje</h2>
            
            {formState === 'success' ? (
              <div className="bg-green-50 text-green-800 p-6 rounded-lg border border-green-200 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">¡Mensaje enviado con éxito!</h3>
                  <p>Nuestro equipo se pondrá en contacto contigo muy pronto.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-label-md text-on-surface">Nombre Completo</label>
                    <input required name="nombre" type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Ej. Juan Pérez" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-on-surface">Empresa</label>
                    <input required name="empresa" type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Ej. Ferretería El Constructor" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-label-md text-on-surface">Correo Electrónico</label>
                    <input required name="email" type="email" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="juan@ejemplo.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-on-surface">Teléfono</label>
                    <input required name="telefono" type="tel" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="+505 8888-8888" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-label-md text-on-surface">Asunto</label>
                  <select name="asunto" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface">
                    <option>Información sobre Patrocinios</option>
                    <option>Reserva de Stands</option>
                    <option>Asistencia General</option>
                    <option>Prensa y Medios</option>
                    <option>Otro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-label-md text-on-surface">Mensaje</label>
                  <textarea required name="mensaje" rows="4" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" placeholder="Escribe tu consulta aquí..."></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={formState === 'submitting'}
                  className="w-full md:w-auto px-8 py-3 bg-primary text-on-primary font-bold rounded-md hover:bg-primary-fixed transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {formState === 'submitting' ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : (
                    <>
                      <Send size={20} /> Enviar Mensaje
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
