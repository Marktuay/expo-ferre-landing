import React, { useState, useEffect } from 'react';
import { Mic, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

const SpeakerForm = ({ onClose }) => {
  const [formState, setFormState] = useState('idle');
  const [registeredSpeakerId, setRegisteredSpeakerId] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('submitting');
    
    try {
      const formData = new FormData(e.target);
      const user = auth.currentUser;
      
      const formatos = [];
      const checkboxes = e.target.querySelectorAll('input[type="checkbox"]:checked');
      checkboxes.forEach(cb => formatos.push(cb.value));

      const data = {
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        cargo: formData.get('cargo'),
        email: formData.get('email'),
        empresa: formData.get('empresa'),
        tamanoEmpresa: formData.get('tamanoEmpresa'),
        telefono: formData.get('telefono'),
        linkedin: formData.get('linkedin'),
        facebook: formData.get('facebook'),
        formatos: formatos,
        titulo: formData.get('titulo'),
        resumen: formData.get('resumen'),
        autorizaCompartir: formData.get('auth'),
        createdAt: serverTimestamp(),
        sponsorId: user ? user.uid : null,
        sponsorEmail: user ? user.email : null
      };
      
      const docRef = await addDoc(collection(db, `${getEventBasePath()}/speakers`), data);
      
      setRegisteredSpeakerId(docRef.id);
      setFormState('success');
    } catch (error) {
      console.error('Error saving speaker:', error);
      setFormState('idle');
      alert('Hubo un error al guardar los datos. Intente nuevamente.');
    }
  };

  return (
    <main className="pt-40 md:pt-48 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onClose}
          className="mb-6 flex items-center gap-2 text-primary hover:text-primary-container font-bold transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span> Volver
        </button>
        <div className="text-center mb-10">
          <h1 className="font-headline-lg text-headline-lg text-primary mb-4 flex items-center justify-center gap-3">
            <Mic size={36} /> Alta de Conferencias
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Complete los datos del speaker y detalles de su participación para registrar la conferencia.
          </p>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-lg shadow-sm border border-outline-variant">
          {formState === 'success' ? (
            <div className="bg-white p-8 rounded-lg border border-outline-variant text-center flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h3 className="font-bold text-2xl mb-2 text-primary">¡Registro completado!</h3>
                <p className="text-secondary mb-6">El código QR para la acreditación del conferencista ha sido generado.</p>
                
                <div className="bg-surface-variant p-6 rounded-lg inline-block border border-outline mb-6">
                  <QRCodeSVG value={registeredSpeakerId} size={180} level="M" />
                  <p className="mt-4 text-sm font-mono text-secondary">ID: {registeredSpeakerId}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                  <button 
                    onClick={() => {
                      setFormState('idle');
                      setRegisteredSpeakerId(null);
                    }}
                    className="px-6 py-3 bg-surface border border-outline-variant rounded-md text-primary font-bold hover:bg-surface-variant transition-colors"
                  >
                    Registrar Otro Conferencista
                  </button>
                  <button 
                    onClick={onClose}
                    className="px-6 py-3 bg-primary text-on-primary rounded-md font-bold hover:bg-primary-container hover:text-on-primary-container transition-colors"
                  >
                    Volver al Panel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Datos Personales y Profesionales */}
              <div className="space-y-4">
                <h3 className="font-headline-sm text-secondary border-b pb-2">Datos Personales y Profesionales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Nombre <span className="text-error">*</span></label>
                    <input name="nombre" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Apellido <span className="text-error">*</span></label>
                    <input name="apellido" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Cargo <span className="text-error">*</span></label>
                    <input name="cargo" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Email <span className="text-error">*</span></label>
                    <input name="email" required type="email" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Empresa <span className="text-error">*</span></label>
                    <input name="empresa" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Tamaño de empresa <span className="text-error">*</span></label>
                    <select name="tamanoEmpresa" required className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface">
                      <option value="">Seleccione...</option>
                      <option value="1-10">1 - 10</option>
                      <option value="11-50">11 - 50</option>
                      <option value="51-200">51 - 200</option>
                      <option value="201-500">201 - 500</option>
                      <option value="500+">Más de 500</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Número telefónico <span className="text-error">*</span></label>
                    <input name="telefono" required type="tel" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">LinkedIn (Opcional)</label>
                    <input name="linkedin" type="url" placeholder="https://linkedin.com/in/..." className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-label-md text-on-surface font-bold">Facebook personal/empresa (Opcional)</label>
                    <input name="facebook" type="url" placeholder="https://facebook.com/..." className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                </div>
              </div>

              {/* Datos de la participación */}
              <div className="space-y-4 pt-4">
                <h3 className="font-headline-sm text-secondary border-b pb-2">Participación en Agenda</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Formato de participación * (Múltiple)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {['Panel', 'Conferencia', 'Entrevista', 'Caso de éxito'].map(fmt => (
                        <label key={fmt} className="flex items-center gap-2 bg-surface-container p-3 rounded-md border border-outline hover:border-primary transition-colors cursor-pointer">
                          <input name="formatos" type="checkbox" className="w-4 h-4 accent-primary" value={fmt} />
                          <span className="font-body-md text-on-surface">{fmt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Título de la Conferencia/Entrevista/Caso <span className="text-error">*</span></label>
                    <input name="titulo" required type="text" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold">Resumen de la conferencia * (Max 100 palabras)</label>
                    <textarea name="resumen" required rows="3" className="w-full p-3 bg-surface-container rounded-md border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"></textarea>
                  </div>
                  
                  {/* Archivos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="bg-surface-container border-2 border-dashed border-outline rounded-md p-6 text-center hover:border-primary transition-all">
                      <span className="material-symbols-outlined text-4xl text-primary mb-2">description</span>
                      <p className="font-label-sm font-bold text-secondary mb-2">Currículum <span className="text-error">*</span></p>
                      <input required type="file" className="text-xs text-on-surface-variant w-full" />
                    </div>
                    <div className="bg-surface-container border-2 border-dashed border-outline rounded-md p-6 text-center hover:border-primary transition-all">
                      <span className="material-symbols-outlined text-4xl text-primary mb-2">image</span>
                      <p className="font-label-sm font-bold text-secondary mb-2">Foto Conferencista <span className="text-error">*</span></p>
                      <input required type="file" accept="image/*" className="text-xs text-on-surface-variant w-full" />
                    </div>
                    <div className="bg-surface-container border-2 border-dashed border-outline rounded-md p-6 text-center hover:border-primary transition-all">
                      <span className="material-symbols-outlined text-4xl text-primary mb-2">business_center</span>
                      <p className="font-label-sm font-bold text-secondary mb-2">Logo Empresa</p>
                      <input type="file" accept="image/*" className="text-xs text-on-surface-variant w-full" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="font-label-md text-on-surface font-bold">¿Brinda autorización de compartir su presentación con los asistentes posterior al evento? <span className="text-error">*</span></label>
                    <div className="flex gap-6 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input required type="radio" name="auth" value="si" className="w-4 h-4 accent-primary" />
                        <span className="font-body-md">Sí, autorizo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input required type="radio" name="auth" value="no" className="w-4 h-4 accent-primary" />
                        <span className="font-body-md">No autorizo</span>
                      </label>
                    </div>
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
                      <Send size={20} /> Enviar Registro
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

export default SpeakerForm;
