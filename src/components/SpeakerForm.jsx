import React, { useState } from 'react';

const SpeakerForm = ({ onClose }) => {
  const [formState, setFormState] = useState('idle');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormState('submitting');
    setTimeout(() => {
      setFormState('success');
      setTimeout(() => {
        setFormState('idle');
        onClose();
      }, 2000);
    }, 1500);
  };

  const inputStyle = "w-full bg-surface-container-lowest border-b-2 border-secondary focus:border-primary-container focus:outline-none transition-all p-3 rounded-5px text-on-surface";
  const labelStyle = "block font-label-sm text-on-surface-variant mb-1 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-inverse-surface/80 backdrop-blur-sm p-4 md:p-8 flex items-start justify-center">
      <div className="max-w-3xl w-full mx-auto bg-surface border-t-8 border-primary rounded-5px p-6 md:p-10 shadow-2xl my-8 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>

        <div className="mb-8">
          <h2 className="font-headline-lg text-headline-lg text-secondary mb-2">ALTA DE CONFERENCIAS</h2>
          <p className="font-body-md text-on-surface-variant">Complete los datos del speaker y detalles de su participación.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Datos Personales */}
          <div className="bg-surface-container-lowest p-6 rounded-5px border border-outline-variant">
            <h3 className="font-headline-md text-headline-md text-primary mb-6">Datos Personales y Profesionales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Nombre *</label>
                <input required type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Apellido *</label>
                <input required type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Cargo *</label>
                <input required type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Email *</label>
                <input required type="email" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Empresa *</label>
                <input required type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Tamaño empresa *</label>
                <select required className={inputStyle}>
                  <option value="">Seleccione cantidad de trabajadores</option>
                  <option value="1-10">1 - 10</option>
                  <option value="11-50">11 - 50</option>
                  <option value="51-200">51 - 200</option>
                  <option value="201-500">201 - 500</option>
                  <option value="500+">Más de 500</option>
                </select>
              </div>
              <div>
                <label className={labelStyle}>Número telefónico *</label>
                <input required type="tel" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>LinkedIn (Opcional)</label>
                <input type="url" placeholder="https://linkedin.com/in/..." className={inputStyle} />
              </div>
              <div className="md:col-span-2">
                <label className={labelStyle}>Facebook personal/empresa (Opcional)</label>
                <input type="url" placeholder="https://facebook.com/..." className={inputStyle} />
              </div>
            </div>
          </div>

          {/* Datos de la participación */}
          <div className="bg-surface-container-lowest p-6 rounded-5px border border-outline-variant">
            <h3 className="font-headline-md text-headline-md text-secondary mb-6">Participación en Agenda</h3>
            <div className="space-y-6">
              <div>
                <label className={labelStyle}>Formato de participación * (Múltiple)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {['Panel', 'Conferencia', 'Entrevista', 'Caso de éxito'].map(fmt => (
                    <label key={fmt} className="flex items-center gap-2 bg-surface p-3 rounded-5px border border-outline-variant cursor-pointer hover:border-primary transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-primary" value={fmt} />
                      <span className="font-body-md text-on-surface">{fmt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelStyle}>Título de la Conferencia/Entrevista/Caso *</label>
                <input required type="text" className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Resumen de la conferencia * (Max 100 palabras)</label>
                <textarea required rows="3" className={`${inputStyle} resize-none`}></textarea>
              </div>
              
              {/* Archivos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="bg-surface border-2 border-dashed border-outline-variant rounded-5px p-6 text-center hover:border-primary hover:bg-primary-container/5 transition-all">
                  <span className="material-symbols-outlined text-4xl text-primary mb-2">description</span>
                  <p className="font-label-sm font-bold text-secondary mb-2">Currículum *</p>
                  <input required type="file" className="text-xs text-on-surface-variant w-full" />
                </div>
                <div className="bg-surface border-2 border-dashed border-outline-variant rounded-5px p-6 text-center hover:border-primary hover:bg-primary-container/5 transition-all">
                  <span className="material-symbols-outlined text-4xl text-primary mb-2">image</span>
                  <p className="font-label-sm font-bold text-secondary mb-2">Foto Conferencista *</p>
                  <input required type="file" accept="image/*" className="text-xs text-on-surface-variant w-full" />
                </div>
                <div className="bg-surface border-2 border-dashed border-outline-variant rounded-5px p-6 text-center hover:border-primary hover:bg-primary-container/5 transition-all">
                  <span className="material-symbols-outlined text-4xl text-primary mb-2">business_center</span>
                  <p className="font-label-sm font-bold text-secondary mb-2">Logo Empresa</p>
                  <input type="file" accept="image/*" className="text-xs text-on-surface-variant w-full" />
                </div>
              </div>

              <div className="pt-6 border-t border-outline-variant mt-6">
                <label className={labelStyle}>¿Brinda autorización de compartir su presentación con los asistentes posterior al evento? *</label>
                <div className="flex gap-6 mt-3">
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

          <div className="pt-4">
            <button
              type="submit"
              disabled={formState !== 'idle'}
              className={`w-full py-4 font-headline-md text-headline-md font-bold uppercase tracking-tight hover:brightness-110 active:scale-[0.98] transition-all rounded-5px flex items-center justify-center gap-2 ${
                formState === 'success' ? 'bg-green-600 text-white' : 'bg-primary-container text-on-primary-container'
              } disabled:opacity-50`}
            >
              {formState === 'idle' ? 'ENVIAR REGISTRO' : formState === 'submitting' ? 'PROCESANDO...' : '¡REGISTRO EXITOSO!'}
              {formState === 'idle' && <span className="material-symbols-outlined">send</span>}
              {formState === 'success' && <span className="material-symbols-outlined">check_circle</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpeakerForm;
