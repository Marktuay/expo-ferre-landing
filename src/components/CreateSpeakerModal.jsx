import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getEventBasePath } from '../config/eventConfig';
import { Mic, X, Save, Upload, Trash2, Edit3 } from 'lucide-react';

export default function CreateSpeakerModal({ isOpen, onClose, initialSponsor = null, speakerToEdit = null, onSuccess }) {
  const [sponsorsList, setSponsorsList] = useState([]);
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFileObj, setFotoFileObj] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [formData, setFormData] = useState({
    sponsorId: '',
    sponsorCompany: '',
    sponsorEmail: '',
    nombre: '',
    apellido: '',
    cargo: '',
    email: '',
    telefono: '',
    empresa: '',
    tamanoEmpresa: '51-200',
    linkedin: '',
    facebook: '',
    instagram: '',
    titulo: '',
    resumen: '',
    formatos: ['Conferencia'],
    autorizaCompartir: 'si',
    foto: null,
    cvNombre: ''
  });

  useEffect(() => {
    if (!isOpen) return;

    if (speakerToEdit) {
      setFormData({
        sponsorId: speakerToEdit.sponsorId || '',
        sponsorCompany: speakerToEdit.sponsorCompany || speakerToEdit.empresa || '',
        sponsorEmail: speakerToEdit.sponsorEmail || speakerToEdit.email || speakerToEdit.correo || '',
        nombre: speakerToEdit.nombre || '',
        apellido: speakerToEdit.apellido || '',
        cargo: speakerToEdit.cargo || '',
        email: speakerToEdit.email || speakerToEdit.correo || '',
        telefono: speakerToEdit.telefono || '',
        empresa: speakerToEdit.empresa || speakerToEdit.sponsorCompany || '',
        tamanoEmpresa: speakerToEdit.tamanoEmpresa || '51-200',
        linkedin: speakerToEdit.linkedin || '',
        facebook: speakerToEdit.facebook || '',
        instagram: speakerToEdit.instagram || '',
        titulo: speakerToEdit.titulo || speakerToEdit.tema || '',
        resumen: speakerToEdit.resumen || '',
        formatos: Array.isArray(speakerToEdit.formatos) ? speakerToEdit.formatos : (speakerToEdit.formato ? [speakerToEdit.formato] : ['Conferencia']),
        autorizaCompartir: speakerToEdit.autorizaCompartir || 'si',
        foto: speakerToEdit.foto || null,
        cvNombre: speakerToEdit.cvNombre || ''
      });
      setFotoPreview(speakerToEdit.foto || null);
      setFotoFileObj(null);
    } else if (initialSponsor) {
      setFormData(prev => ({
        ...prev,
        sponsorId: initialSponsor.id || '',
        sponsorCompany: initialSponsor.empresa || initialSponsor.company || initialSponsor.nombre || 'Patrocinador Oficial',
        sponsorEmail: initialSponsor.correo || initialSponsor.email || '',
        empresa: initialSponsor.empresa || initialSponsor.company || ''
      }));
      setFotoPreview(null);
      setFotoFileObj(null);
    } else {
      setFotoPreview(null);
      setFotoFileObj(null);
    }

    // Cargar lista de patrocinadores desde Firestore
    const fetchSponsors = async () => {
      try {
        setLoadingSponsors(true);
        const q = query(collection(db, 'users'), where('role', '==', 'sponsor'));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({
            id: d.id,
            empresa: data.empresa || data.company || data.nombre || 'Sin Empresa',
            contacto: `${data.nombre || ''} ${data.apellido || ''}`.trim(),
            correo: data.correo || data.email || ''
          });
        });

        list.sort((a, b) => a.empresa.localeCompare(b.empresa));
        setSponsorsList(list);

        if (!speakerToEdit && !initialSponsor && list.length > 0) {
          setFormData(prev => ({
            ...prev,
            sponsorId: prev.sponsorId || list[0].id,
            sponsorCompany: prev.sponsorCompany || list[0].empresa,
            sponsorEmail: prev.sponsorEmail || list[0].correo,
            empresa: prev.empresa || list[0].empresa
          }));
        }
      } catch (err) {
        console.error('Error cargando lista de patrocinadores:', err);
      } finally {
        setLoadingSponsors(false);
      }
    };

    fetchSponsors();
  }, [isOpen, initialSponsor, speakerToEdit]);

  if (!isOpen) return null;

  const handleSponsorChange = (e) => {
    const selectedId = e.target.value;
    const selected = sponsorsList.find(s => s.id === selectedId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        sponsorId: selected.id,
        sponsorCompany: selected.empresa,
        sponsorEmail: selected.correo,
        empresa: prev.empresa || selected.empresa
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        sponsorId: '',
        sponsorCompany: 'Organización ExpoFerre 2026',
        sponsorEmail: '',
        empresa: prev.empresa || 'Independiente'
      }));
    }
  };

  const handleFormatChange = (fmt) => {
    setFormData(prev => {
      const current = prev.formatos || [];
      if (current.includes(fmt)) {
        return { ...prev, formatos: current.filter(f => f !== fmt) };
      } else {
        return { ...prev, formatos: [...current, fmt] };
      }
    });
  };

  const processImageFile = async (file, maxDim = 450, quality = 0.78) => {
    if (!file) return null;
    
    if (file.type === 'image/svg+xml') {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = (event) => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            const canvas = document.createElement('canvas');
            let width = fallbackImg.width;
            let height = fallbackImg.height;
            if (width > maxDim || height > maxDim) {
              const ratio = Math.min(maxDim / width, maxDim / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(fallbackImg, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          fallbackImg.onerror = () => reject(new Error('Formato de imagen no soportado'));
          fallbackImg.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsDataURL(file);
      };
      img.src = url;
    });
  };

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFoto(true);
      setFotoFileObj(file);
      const base64 = await processImageFile(file);
      setFotoPreview(base64);
      setFormData(prev => ({ ...prev, foto: base64 }));
    } catch (err) {
      console.error('Error al procesar foto:', err);
      alert('No se pudo procesar la foto seleccionada. Intente con otra imagen JPG o PNG.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.formatos || formData.formatos.length === 0) {
      alert('Por favor selecciona al menos un formato de participación (Panel, Conferencia, etc.).');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      const emailVal = formData.email.trim().toLowerCase();
      const tituloVal = formData.titulo.trim();

      const speakerDoc = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        cargo: formData.cargo.trim(),
        email: emailVal,
        correo: emailVal,
        telefono: formData.telefono.trim(),
        empresa: formData.empresa.trim() || 'Independiente',
        tamanoEmpresa: formData.tamanoEmpresa || 'independiente',
        linkedin: formData.linkedin.trim(),
        facebook: formData.facebook.trim(),
        instagram: formData.instagram.trim(),
        titulo: tituloVal,
        tema: tituloVal,
        resumen: formData.resumen.trim(),
        formatos: formData.formatos,
        formato: formData.formatos.join(', '),
        autorizaCompartir: formData.autorizaCompartir,
        foto: formData.foto || null,
        cvNombre: formData.cvNombre || null,
        sponsorId: formData.sponsorId || (initialSponsor ? initialSponsor.id : null),
        sponsorCompany: formData.sponsorCompany || (initialSponsor ? initialSponsor.empresa : 'Organización ExpoFerre 2026'),
        sponsorEmail: formData.sponsorEmail || (initialSponsor ? (initialSponsor.correo || initialSponsor.email) : null)
      };

      if (speakerToEdit?.id) {
        await updateDoc(doc(db, `${getEventBasePath()}/speakers`, speakerToEdit.id), {
          ...speakerDoc,
          updatedAt: serverTimestamp(),
          updatedBy: user ? user.email : 'admin'
        });
        alert(`¡Conferencia "${formData.titulo}" actualizada exitosamente!`);
        if (onSuccess) onSuccess({ id: speakerToEdit.id, ...speakerDoc });
      } else {
        const docRef = await addDoc(collection(db, `${getEventBasePath()}/speakers`), {
          ...speakerDoc,
          createdAt: serverTimestamp(),
          registeredByAdmin: user ? user.email : 'admin'
        });
        alert(`¡Conferencia "${formData.titulo}" registrada exitosamente a nombre de ${formData.sponsorCompany}!`);
        if (onSuccess) onSuccess({ id: docRef.id, ...speakerDoc });
      }
      
      onClose();
    } catch (err) {
      console.error('Error guardando conferencia:', err);
      alert('Hubo un error al guardar la conferencia: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!speakerToEdit?.id;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-outline-variant max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-secondary text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">
              {isEditing ? <Edit3 size={22} /> : <Mic size={22} />}
            </div>
            <div>
              <h3 className="font-headline-sm font-bold text-lg leading-tight">
                {isEditing ? 'Editar Conferencia' : 'Registrar Nueva Conferencia'}
              </h3>
              <p className="text-xs text-white/80">
                {isEditing ? 'Actualiza los datos del conferencista y ponencia' : 'Alta administrativa de conferencistas y ponencias'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* SELECCIÓN DE PATROCINADOR U ORGANIZACIÓN */}
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
            <label className="block text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg">corporate_fare</span>
              Auspiciador / Entidad de la Conferencia
            </label>
            
            {loadingSponsors ? (
              <div className="text-xs text-secondary italic">Cargando lista de patrocinadores...</div>
            ) : (
              <select
                value={formData.sponsorId}
                onChange={handleSponsorChange}
                className="w-full p-2.5 bg-white border border-outline-variant rounded-md text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">-- Conferencista Independiente / Invitado por la Organización (ExpoFerre) --</option>
                {sponsorsList.map(s => (
                  <option key={s.id} value={s.id}>
                    Patrocinador: {s.empresa} ({s.contacto || s.correo || 'Patrocinador'})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-on-surface-variant">
              {formData.sponsorId 
                ? 'Esta conferencia quedará vinculada automáticamente al patrocinador seleccionado.' 
                : 'Esta conferencia se registrará como Conferencia Oficial / Speaker Independiente de la Organización.'}
            </p>
          </div>

          {/* DATOS PERSONALES DEL SPEAKER */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-secondary uppercase tracking-wider border-b pb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">badge</span>
              Datos del Conferencista
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Nombre *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.nombre} 
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Roberto"
                  className="w-full p-2.5 border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Apellido *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.apellido} 
                  onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Ej. González"
                  className="w-full p-2.5 border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Cargo / Especialidad *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.cargo} 
                  onChange={e => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ej. Especialista / Consultor / Director"
                  className="w-full p-2.5 border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Correo Electrónico *</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="speaker@empresa.com"
                  className="w-full p-2.5 border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Teléfono / Celular *</label>
                <input 
                  type="tel" 
                  required 
                  value={formData.telefono} 
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej. +505 8888 8888"
                  className="w-full p-2.5 border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Empresa / Institución <span className="font-normal text-on-surface-variant">(o "Independiente")</span>
                </label>
                <input 
                  type="text" 
                  value={formData.empresa} 
                  onChange={e => setFormData({ ...formData, empresa: e.target.value })}
                  placeholder="Ej. Independiente / Consultor / Marca"
                  className="w-full p-2.5 border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* FOTO DEL SPEAKER */}
            <div className="bg-surface-variant/20 p-4 rounded-xl border border-outline-variant/60 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-outline-variant bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {uploadingFoto ? (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : fotoPreview ? (
                  <img src={fotoPreview} alt="Foto Speaker" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-3xl">account_circle</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-secondary mb-1">Foto del Conferencista (JPG/PNG)</label>
                <input 
                  type="file" 
                  id="admin-speaker-foto"
                  accept="image/*"
                  onClick={(e) => { e.target.value = null; }}
                  onChange={handleFotoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <label 
                    htmlFor="admin-speaker-foto"
                    className="cursor-pointer px-3 py-1.5 bg-white hover:bg-surface-variant text-secondary border border-outline-variant rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Upload size={13} />
                    {fotoPreview ? 'Cambiar Foto' : 'Subir Foto'}
                  </label>
                  {fotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setFotoPreview(null);
                        setFotoFileObj(null);
                        setFormData(prev => ({ ...prev, foto: null }));
                      }}
                      className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 font-bold rounded flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={13} />
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* DATOS DE LA CONFERENCIA */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-bold text-secondary uppercase tracking-wider border-b pb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">campaign</span>
              Detalles de la Ponencia / Conferencia
            </h4>

            <div>
              <label className="block text-xs font-bold text-secondary mb-2">Formato de Participación * (Puedes marcar varios)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Panel', 'Conferencia', 'Entrevista', 'Caso de éxito'].map(fmt => {
                  const isChecked = formData.formatos?.includes(fmt);
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleFormatChange(fmt)}
                      className={`p-2 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isChecked 
                          ? 'bg-primary text-on-primary border-primary font-bold shadow-xs' 
                          : 'bg-white text-secondary border-outline-variant hover:bg-primary/5'
                      }`}
                    >
                      {isChecked && <span className="material-symbols-outlined text-xs">check</span>}
                      {fmt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Título de la Conferencia *</label>
              <input 
                type="text" 
                required 
                value={formData.titulo} 
                onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej. Nuevas Tendencias y Tecnologías en la Construcción Sostenible"
                className="w-full p-2.5 border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Resumen de la Conferencia * (Max 100 palabras)</label>
              <textarea 
                rows="3" 
                required 
                value={formData.resumen} 
                onChange={e => setFormData({ ...formData, resumen: e.target.value })}
                placeholder="Describe brevemente los puntos clave que se abordarán durante la ponencia..."
                className="w-full p-2.5 border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">
                ¿Autoriza compartir su presentación con los asistentes después del evento? *
              </label>
              <div className="flex gap-6 mt-1 text-sm">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input 
                    type="radio" 
                    name="modal-auth" 
                    value="si" 
                    checked={formData.autorizaCompartir === 'si'}
                    onChange={() => setFormData({ ...formData, autorizaCompartir: 'si' })}
                    className="accent-primary" 
                  />
                  Sí, autorizo
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input 
                    type="radio" 
                    name="modal-auth" 
                    value="no" 
                    checked={formData.autorizaCompartir === 'no'}
                    onChange={() => setFormData({ ...formData, autorizaCompartir: 'no' })}
                    className="accent-primary" 
                  />
                  No autorizo
                </label>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant font-bold rounded-md transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploadingFoto}
              className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 transition-all text-sm flex items-center gap-2 disabled:opacity-50 shadow-xs"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isEditing ? 'Actualizar Conferencia' : 'Guardar Conferencia'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
