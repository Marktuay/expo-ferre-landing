import React, { useState, useEffect } from 'react';
import { Mic, Send, Upload, Trash2, CheckCircle2, FileText, Image as ImageIcon, Building2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getEventBasePath } from '../config/eventConfig';

const SpeakerForm = ({ onClose }) => {
  const [formState, setFormState] = useState('idle');
  const [registeredSpeakerId, setRegisteredSpeakerId] = useState(null);
  const [submitStatus, setSubmitStatus] = useState('');
  const [submitError, setSubmitError] = useState('');
  
  // File and preview states
  const [fotoData, setFotoData] = useState(null);
  const [fotoFileObj, setFotoFileObj] = useState(null);
  const [logoData, setLogoData] = useState(null);
  const [logoFileObj, setLogoFileObj] = useState(null);
  const [cvName, setCvName] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDraggingFoto, setIsDraggingFoto] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const urlSponsorId = urlParams.get('sponsorId') || null;
  const urlSponsorName = urlParams.get('sponsorName') || null;
  const urlSponsorEmail = urlParams.get('sponsorEmail') || null;

  useEffect(() => {
    window.scrollTo(0, 0);
    // Pre-autenticar de forma anónima en segundo plano para que la conexión esté lista al enviar
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(err => {
        console.warn("Pre-auth anónima omitida:", err.message);
      });
    }
  }, []);

  // Robust client-side image compression (Avatar: ~30-40KB, Logo: ~20-30KB)
  const processImageFile = async (file, maxDim = 450, quality = 0.78) => {
    if (!file) return null;
    
    // Si es SVG, devolver como dataURL directo
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

          // Fondo blanco para fotos para evitar transparencias oscuras en JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback a FileReader si ObjectURL falla
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
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
      };

      img.src = url;
    });
  };

  const handleFotoFile = async (file) => {
    if (!file) return;
    try {
      setUploadingFoto(true);
      setFotoFileObj(file);
      const base64 = await processImageFile(file, 450, 0.78);
      setFotoData(base64);
    } catch (err) {
      console.error('Error al procesar foto del speaker:', err);
      alert('No se pudo procesar la foto. Por favor intente con otra imagen JPG o PNG.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleFotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFotoFile(file);
  };

  const handleLogoFile = async (file) => {
    if (!file) return;
    try {
      setUploadingLogo(true);
      setLogoFileObj(file);
      const base64 = await processImageFile(file, 350, 0.80);
      setLogoData(base64);
    } catch (err) {
      console.error('Error al procesar logo:', err);
      alert('Hubo un problema al cargar el logo. Intente nuevamente.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleCvUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCvName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formState === 'submitting') return;
    setFormState('submitting');
    setSubmitError('');
    setSubmitStatus('Preparando información...');
    
    try {
      const formData = new FormData(e.target);
      
      // 1. Asegurar sesión activa (anónima si es invitado externo)
      setSubmitStatus('Conectando con el servidor...');
      let user = auth.currentUser;
      if (!user) {
        try {
          const anonCred = await signInAnonymously(auth);
          user = anonCred.user;
        } catch (anonErr) {
          console.warn("Anonymous auth not available or not required:", anonErr);
        }
      }
      
      const formatos = [];
      const checkboxes = e.target.querySelectorAll('input[name="formatos"]:checked');
      checkboxes.forEach(cb => formatos.push(cb.value));

      if (formatos.length === 0) {
        alert('Por favor selecciona al menos un formato de participación (Panel, Conferencia, etc.).');
        setFormState('idle');
        return;
      }

      const emailVal = formData.get('email')?.trim().toLowerCase() || '';
      const tituloVal = formData.get('titulo')?.trim() || '';
      const empresaVal = formData.get('empresa')?.trim() || 'Independiente';
      const tamanoEmpresaVal = formData.get('tamanoEmpresa') || 'independiente';
      const nombreVal = formData.get('nombre')?.trim() || '';
      const apellidoVal = formData.get('apellido')?.trim() || '';

      const data = {
        nombre: nombreVal,
        apellido: apellidoVal,
        cargo: formData.get('cargo')?.trim() || '',
        email: emailVal,
        correo: emailVal,
        empresa: empresaVal,
        tamanoEmpresa: tamanoEmpresaVal,
        telefono: formData.get('telefono')?.trim() || '',
        linkedin: formData.get('linkedin')?.trim() || '',
        facebook: formData.get('facebook')?.trim() || '',
        instagram: formData.get('instagram')?.trim() || '',
        formatos: formatos,
        formato: formatos.join(', '),
        titulo: tituloVal,
        tema: tituloVal,
        resumen: formData.get('resumen')?.trim() || '',
        autorizaCompartir: formData.get('auth') || 'si',
        foto: fotoData || null,
        logo: logoData || null,
        cvNombre: cvName || null,
        createdAt: serverTimestamp(),
        sponsorId: user ? user.uid : (urlSponsorId || null),
        sponsorEmail: user?.email || (urlSponsorEmail || null),
        sponsorCompany: urlSponsorName || (user?.email ? user.email : 'Conferencista Independiente / ExpoFerre 2026')
      };
      
      // 2. Guardar en Firestore
      setSubmitStatus('Guardando conferencia...');
      const docRef = await addDoc(collection(db, `${getEventBasePath()}/speakers`), data);
      
      // 3. Enviar correo de confirmación de forma asíncrona sin bloquear la pantalla de éxito
      if (emailVal) {
        addDoc(collection(db, 'mail'), {
          to: emailVal,
          message: {
            subject: 'Registro de Conferencia Confirmado - ExpoFerre 2026',
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                <div style="padding: 30px;">
                  <h2 style="color: #0d47a1; margin-top: 0;">¡Hola ${nombreVal} ${apellidoVal}!</h2>
                  <p>Tu registro como speaker para la conferencia <strong>"${tituloVal}"</strong> ha sido completado exitosamente.</p>
                  <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #f39200;">
                    <p style="margin: 4px 0;"><strong>Formato:</strong> ${formatos.join(', ')}</p>
                    <p style="margin: 4px 0;"><strong>Empresa / Entidad:</strong> ${empresaVal}</p>
                    <p style="margin: 4px 0;"><strong>Código de Registro:</strong> ${docRef.id}</p>
                  </div>
                  <p>Nos pondremos en contacto contigo para los detalles técnicos de la presentación.</p>
                </div>
                <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              </div>
            `
          }
        }).catch(err => console.warn('Email notification error:', err));
      }

      setRegisteredSpeakerId(docRef.id);
      setFormState('success');
    } catch (error) {
      console.error('Error saving speaker:', error);
      setFormState('idle');
      const msg = error.code ? `Error (${error.code}): ${error.message}` : (error.message || 'Error desconocido');
      setSubmitError(msg);
      alert('Hubo un inconveniente al guardar los datos:\n' + msg);
    }
  };

  return (
    <main className="pt-40 md:pt-48 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">
      <div className="max-w-3xl mx-auto">
        {onClose && (
          <button 
            onClick={onClose}
            className="mb-6 flex items-center gap-2 text-primary hover:text-primary-container font-bold transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span> Volver
          </button>
        )}
        <div className="text-center mb-10">
          <h1 className="font-headline-lg text-headline-lg text-primary mb-4 flex items-center justify-center gap-3">
            <Mic size={36} /> Alta de Conferencias
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Complete los datos del speaker y detalles de su participación para registrar la conferencia.
          </p>

          {urlSponsorName && (
            <div className="mt-4 bg-primary/10 border border-primary/20 rounded-md p-3 max-w-xl mx-auto flex items-center justify-center gap-2 text-primary font-bold text-sm">
              <span className="material-symbols-outlined text-base">handshake</span>
              Conferencia invitada por: <span className="underline">{urlSponsorName}</span>
            </div>
          )}
        </div>

        <div className="bg-white p-6 md:p-10 rounded-xl shadow-sm border border-outline-variant">
          {formState === 'success' ? (
            <div className="bg-white p-6 md:p-8 rounded-lg text-center flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-xs">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="font-bold text-2xl mb-2 text-primary">¡Registro completado con éxito!</h3>
                <p className="text-secondary mb-6 max-w-md mx-auto">
                  La información de la conferencia y del conferencista ha sido registrada satisfactoriamente.
                </p>
                
                <div className="bg-surface-variant p-6 rounded-xl inline-block border border-outline mb-6 shadow-xs">
                  <QRCodeSVG value={registeredSpeakerId || 'EXPOFERRE-SPEAKER'} size={180} level="M" />
                  <p className="mt-4 text-xs font-mono text-secondary font-bold">CÓDIGO: {registeredSpeakerId}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                  <button 
                    onClick={() => {
                      setFormState('idle');
                      setRegisteredSpeakerId(null);
                      setFotoData(null);
                      setFotoFileObj(null);
                      setLogoData(null);
                      setLogoFileObj(null);
                      setCvName('');
                    }}
                    className="px-6 py-3 bg-surface border border-outline-variant rounded-md text-primary font-bold hover:bg-surface-variant transition-colors"
                  >
                    Registrar Otro Conferencista
                  </button>
                  {onClose && (
                    <button 
                      onClick={onClose}
                      className="px-6 py-3 bg-primary text-on-primary rounded-md font-bold hover:bg-primary-container hover:text-on-primary-container transition-colors"
                    >
                      Volver al Panel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* DATOS PERSONALES Y PROFESIONALES */}
              <div className="space-y-4">
                <h3 className="font-headline-sm font-bold text-secondary border-b pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Datos del Conferencista
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">Nombre <span className="text-error">*</span></label>
                    <input name="nombre" required type="text" placeholder="Ej. Juan" className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">Apellido <span className="text-error">*</span></label>
                    <input name="apellido" required type="text" placeholder="Ej. Pérez" className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">Cargo / Especialidad <span className="text-error">*</span></label>
                    <input name="cargo" required type="text" placeholder="Ej. Director Técnico / Especialista" className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">Email <span className="text-error">*</span></label>
                    <input name="email" required type="email" placeholder="speaker@empresa.com" className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">
                      Empresa / Institución <span className="text-on-surface-variant font-normal normal-case">(o "Independiente")</span>
                    </label>
                    <input 
                      name="empresa" 
                      type="text" 
                      placeholder="Ej. Independiente / Consultor / Nombre Comercial" 
                      className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">Tamaño de empresa / Entorno</label>
                    <select name="tamanoEmpresa" className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface text-sm">
                      <option value="independiente">Profesional Independiente / N/A</option>
                      <option value="1-10">1 - 10 colaboradores</option>
                      <option value="11-50">11 - 50 colaboradores</option>
                      <option value="51-200">51 - 200 colaboradores</option>
                      <option value="201-500">201 - 500 colaboradores</option>
                      <option value="500+">Más de 500 colaboradores</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">Número Telefónico / WhatsApp <span className="text-error">*</span></label>
                    <input name="telefono" required type="tel" placeholder="+505 8888 8888" className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
                  </div>
                </div>

                {/* Redes Sociales */}
                <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">LinkedIn (Opcional)</label>
                    <input name="linkedin" type="url" placeholder="https://linkedin.com/in/..." className="w-full p-2.5 bg-surface-container rounded-lg border border-outline text-xs outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Facebook (Opcional)</label>
                    <input name="facebook" type="url" placeholder="https://facebook.com/..." className="w-full p-2.5 bg-surface-container rounded-lg border border-outline text-xs outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Instagram (Opcional)</label>
                    <input name="instagram" type="text" placeholder="@usuario" className="w-full p-2.5 bg-surface-container rounded-lg border border-outline text-xs outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* FOTO, LOGO Y CV (CARGA DE ARCHIVOS) */}
              <div className="space-y-4 pt-2">
                <h3 className="font-headline-sm font-bold text-secondary border-b pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">photo_camera</span>
                  Fotografía y Archivos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* FOTO DEL SPEAKER */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingFoto(true); }}
                    onDragLeave={() => setIsDraggingFoto(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFoto(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFotoFile(file);
                    }}
                    className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-between text-center ${
                      isDraggingFoto 
                        ? 'bg-primary/15 border-primary scale-102' 
                        : fotoData 
                          ? 'bg-primary/5 border-primary/40' 
                          : 'bg-surface-container border-outline hover:border-primary'
                    }`}
                  >
                    <div className="w-full flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full border-2 border-white shadow-sm overflow-hidden bg-surface-variant/40 flex items-center justify-center mb-2 shrink-0">
                        {uploadingFoto ? (
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : fotoData ? (
                          <img src={fotoData} alt="Foto Speaker" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-on-surface-variant/50" size={32} />
                        )}
                      </div>
                      <p className="font-bold text-xs text-secondary">Foto del Speaker</p>
                      <p className="text-[11px] text-on-surface-variant mb-3">JPG, PNG o WEBP</p>
                    </div>

                    <div className="w-full flex items-center justify-center gap-2">
                      <input 
                        type="file" 
                        id="speaker-foto-input" 
                        accept="image/*" 
                        onClick={(e) => { e.target.value = null; }}
                        onChange={handleFotoUpload} 
                        className="hidden" 
                      />
                      <label 
                        htmlFor="speaker-foto-input" 
                        className="cursor-pointer px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1 transition-all shadow-xs"
                      >
                        <Upload size={13} />
                        {fotoData ? 'Cambiar Foto' : 'Subir Foto'}
                      </label>
                      {fotoData && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setFotoData(null);
                            setFotoFileObj(null);
                          }}
                          className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" 
                          title="Eliminar foto"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LOGO DE LA EMPRESA */}
                  <div className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-between text-center ${logoData ? 'bg-primary/5 border-primary/40' : 'bg-surface-container border-outline hover:border-primary'}`}>
                    <div className="w-full flex flex-col items-center">
                      <div className="w-20 h-20 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-surface-variant/40 flex items-center justify-center mb-2 p-1 shrink-0">
                        {uploadingLogo ? (
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : logoData ? (
                          <img src={logoData} alt="Logo Empresa" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Building2 className="text-on-surface-variant/50" size={32} />
                        )}
                      </div>
                      <p className="font-bold text-xs text-secondary">Logo Empresa</p>
                      <p className="text-[11px] text-on-surface-variant mb-3">Opcional (PNG/JPG)</p>
                    </div>

                    <div className="w-full flex items-center justify-center gap-2">
                      <input 
                        type="file" 
                        id="speaker-logo-input" 
                        accept="image/*" 
                        onClick={(e) => { e.target.value = null; }}
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                      <label 
                        htmlFor="speaker-logo-input" 
                        className="cursor-pointer px-3 py-1.5 bg-secondary text-white rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1 transition-all shadow-xs"
                      >
                        <Upload size={13} />
                        {logoData ? 'Cambiar Logo' : 'Subir Logo'}
                      </label>
                      {logoData && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setLogoData(null);
                            setLogoFileObj(null);
                          }}
                          className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" 
                          title="Eliminar logo"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CURRÍCULUM / PERFIL */}
                  <div className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-between text-center ${cvName ? 'bg-primary/5 border-primary/40' : 'bg-surface-container border-outline hover:border-primary'}`}>
                    <div className="w-full flex flex-col items-center">
                      <div className="w-20 h-20 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-surface-variant/40 flex items-center justify-center mb-2 shrink-0">
                        <FileText className={cvName ? 'text-primary' : 'text-on-surface-variant/50'} size={32} />
                      </div>
                      <p className="font-bold text-xs text-secondary">Currículum / Bio</p>
                      <p className="text-[11px] text-on-surface-variant mb-3 line-clamp-1 max-w-[150px]" title={cvName || 'PDF o Documento'}>
                        {cvName || 'PDF o Documento (Opcional)'}
                      </p>
                    </div>

                    <div className="w-full flex items-center justify-center gap-2">
                      <input 
                        type="file" 
                        id="speaker-cv-input" 
                        accept=".pdf,.doc,.docx" 
                        onClick={(e) => { e.target.value = null; }}
                        onChange={handleCvUpload} 
                        className="hidden" 
                      />
                      <label 
                        htmlFor="speaker-cv-input" 
                        className="cursor-pointer px-3 py-1.5 bg-surface-variant text-secondary border border-outline-variant rounded-lg text-xs font-bold hover:bg-surface-variant/80 flex items-center gap-1 transition-all shadow-xs"
                      >
                        <Upload size={13} />
                        {cvName ? 'Cambiar' : 'Adjuntar'}
                      </label>
                      {cvName && (
                        <button 
                          type="button" 
                          onClick={() => setCvName('')}
                          className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" 
                          title="Eliminar archivo"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* DETALLES DE LA CONFERENCIA */}
              <div className="space-y-4 pt-2">
                <h3 className="font-headline-sm font-bold text-secondary border-b pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">campaign</span>
                  Detalles de la Ponencia
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">
                      Formato de participación <span className="text-error">* (Puede seleccionar varios)</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                      {['Panel', 'Conferencia', 'Entrevista', 'Caso de éxito'].map(fmt => (
                        <label key={fmt} className="flex items-center gap-2 bg-surface-container p-3 rounded-lg border border-outline hover:border-primary transition-colors cursor-pointer select-none">
                          <input name="formatos" type="checkbox" className="w-4 h-4 accent-primary" value={fmt} defaultChecked={fmt === 'Conferencia'} />
                          <span className="font-body-md text-sm text-on-surface font-medium">{fmt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">Título de la Conferencia / Ponencia <span className="text-error">*</span></label>
                    <input name="titulo" required type="text" placeholder="Ej. Innovación y Transformación en la Ferretería Moderna" className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="font-label-md text-on-surface font-bold text-xs uppercase tracking-wider">Resumen de la conferencia <span className="text-error">* (Máximo 100 palabras)</span></label>
                    <textarea name="resumen" required rows="3" placeholder="Describa brevemente los puntos clave y objetivo de la presentación..." className="w-full p-3 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm resize-none"></textarea>
                  </div>

                  <div className="space-y-2 pt-2 bg-surface-variant/30 p-4 rounded-xl border border-outline-variant">
                    <label className="font-label-md text-on-surface font-bold text-xs">
                      ¿Brinda autorización de compartir su presentación con los asistentes posterior al evento? <span className="text-error">*</span>
                    </label>
                    <div className="flex gap-6 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input required type="radio" name="auth" value="si" defaultChecked className="w-4 h-4 accent-primary" />
                        <span className="font-medium">Sí, autorizo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input required type="radio" name="auth" value="no" className="w-4 h-4 accent-primary" />
                        <span className="font-medium">No autorizo</span>
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              {/* MENSAJE DE ERROR SI OCURRE */}
              {submitError && (
                <div className="p-4 bg-error-container text-on-error-container border border-error/30 rounded-xl text-xs flex items-center gap-3">
                  <span className="material-symbols-outlined text-error text-lg shrink-0">error</span>
                  <div className="flex-1">
                    <p className="font-bold mb-0.5">No se pudo completar el registro:</p>
                    <p className="font-mono">{submitError}</p>
                  </div>
                </div>
              )}

              {/* BOTÓN DE ENVÍO */}
              <div className="pt-6 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-on-surface-variant">
                  {uploadingFoto || uploadingLogo ? '⏳ Procesando archivos adjuntos...' : 'Por favor verifique que los campos obligatorios (*) estén completos.'}
                </p>
                <button 
                  type="submit" 
                  disabled={formState === 'submitting' || uploadingFoto || uploadingLogo}
                  className="w-full sm:w-auto px-10 py-3.5 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-base shrink-0"
                >
                  {formState === 'submitting' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{submitStatus || 'Guardando conferencia...'}</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Enviar Registro
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
