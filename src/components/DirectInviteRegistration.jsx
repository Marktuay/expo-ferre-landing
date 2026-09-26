import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, AlertCircle, Building2, MapPin, Users, Mail, Phone, User, Send, Check } from 'lucide-react';

export default function DirectInviteRegistration({ token: propToken, onClose }) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = propToken || urlParams.get('invite') || urlParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [tokenStatus, setTokenStatus] = useState('valid'); // 'valid' | 'used' | 'invalid'
  
  // Form fields
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [personalEmpresa, setPersonalEmpresa] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [registeredData, setRegisteredData] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const validateToken = async () => {
      if (!token) {
        setTokenStatus('invalid');
        setLoading(false);
        return;
      }

      try {
        const inviteRef = doc(db, `${getEventBasePath()}/directInvites`, token);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          setTokenStatus('invalid');
        } else {
          const data = inviteSnap.data();
          if (data.status === 'used') {
            setTokenStatus('used');
            setInviteData(data);
          } else {
            setTokenStatus('valid');
            
            let mergedData = { ...data };
            if (data.sponsorId) {
              try {
                const spRef = doc(db, `${getEventBasePath()}/sponsorSettings`, data.sponsorId);
                const spSnap = await getDoc(spRef);
                if (spSnap.exists()) {
                  const spData = spSnap.data();
                  mergedData = {
                    ...mergedData,
                    headerBannerUrl: spData.headerBannerUrl || mergedData.headerBannerUrl,
                    footerBannerUrl: spData.footerBannerUrl || mergedData.footerBannerUrl,
                    sponsorStands: spData.stands || mergedData.sponsorStands
                  };
                }
              } catch (spErr) {
                console.warn("No se pudo cargar sponsorSettings dinámico:", spErr);
              }
            }

            setInviteData(mergedData);
            // Pre-llenar si el admin ingresó datos previos
            if (data.nombre) setNombre(data.nombre);
            if (data.apellido) setApellido(data.apellido);
            if (data.email) setEmail(data.email);
            if (data.empresa) setEmpresa(data.empresa);
            if (data.telefono) setCelular(data.telefono);
          }
        }
      } catch (err) {
        console.error('Error al validar token de invitación:', err);
        setTokenStatus('invalid');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!nombre.trim() || !apellido.trim() || !email.trim() || !celular.trim() || !ciudad.trim() || !empresa.trim() || !personalEmpresa) {
      setSubmitError('Por favor completa todos los campos requeridos.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Doble verificación del token antes de registrar
      const inviteRef = doc(db, `${getEventBasePath()}/directInvites`, token);
      const inviteCheck = await getDoc(inviteRef);

      if (!inviteCheck.exists() || inviteCheck.data().status === 'used') {
        setTokenStatus('used');
        setSubmitting(false);
        return;
      }

      const cleanNombre = nombre.trim();
      const cleanApellido = apellido.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanCelular = celular.trim();
      const cleanCiudad = ciudad.trim();
      const cleanEmpresa = empresa.trim();

      // 2. Guardar registro en la colección principal de preregistros (con estatus aprobado directamente)
      const attendeeDoc = {
        nombre: cleanNombre,
        apellido: cleanApellido,
        email: cleanEmail,
        telefono: cleanCelular,
        celular: cleanCelular,
        ciudad: cleanCiudad,
        empresa: cleanEmpresa,
        personalEmpresa: personalEmpresa,
        status: 'approved', // Aprobado automáticamente por ser invitación directa
        type: 'direct_invite',
        isDirectInvite: true,
        inviteToken: token,
        source: 'Invitación Directa',
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, `${getEventBasePath()}/preregistrations`), attendeeDoc);
      const attendeeId = docRef.id;

      // 3. Marcar el token como USADO (el enlace muere)
      await updateDoc(inviteRef, {
        status: 'used',
        usedAt: serverTimestamp(),
        registeredAttendeeId: attendeeId,
        registeredName: `${cleanNombre} ${cleanApellido}`,
        registeredEmail: cleanEmail,
        registeredPhone: cleanCelular,
        registeredCompany: cleanEmpresa
      });

      // 4. Enviar Correo de Confirmación con el Speech Oficial y Código QR
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(attendeeId)}`;
      
      try {
        await addDoc(collection(db, 'mail'), {
          to: cleanEmail,
          message: {
            subject: '¡Registro Confirmado! Tu Pase Oficial y Código QR para EXPO FERRE 2026',
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <img src="${inviteData?.headerBannerUrl || inviteData?.bannerUrl || 'https://expoferrenicaragua.com/email-header.png'}" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                
                <div style="padding: 32px 24px;">
                  <h2 style="color: #0d47a1; margin-top: 0; font-size: 22px;">¡Estimado(a) ${cleanNombre} ${cleanApellido}!</h2>
                  <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                    ¡Tu registro ha sido completado con éxito! Te damos la más cordial bienvenida a <strong>EXPO FERRE Nicaragua 2026</strong>.
                  </p>
                  <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                    Adjunto en este correo encontrarás tu <strong>Gafete Oficial y Código QR</strong> para ingresar directamente al evento sin filas:
                  </p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: left;">
                    <p style="margin: 6px 0; font-size: 14px;">🏢 <strong>Empresa:</strong> ${cleanEmpresa}</p>
                    <p style="margin: 6px 0; font-size: 14px;">📍 <strong>Ciudad:</strong> ${cleanCiudad}</p>
                    <p style="margin: 6px 0; font-size: 14px;">🏷️ <strong>Pase:</strong> Invitado Especial / Acceso Directo</p>
                    ${inviteData?.sponsorName ? `<p style="margin: 6px 0; font-size: 14px; color: #d97706;">⭐ <strong>Cortesía de:</strong> ${inviteData.sponsorName} ${inviteData.sponsorStands ? `(Stand ${inviteData.sponsorStands})` : ''}</p>` : ''}
                    <p style="margin: 6px 0; font-size: 14px; font-family: monospace;">🎟️ <strong>Código de Registro:</strong> <strong>${attendeeId}</strong></p>
                  </div>

                  <div style="text-align: center; margin: 28px 0; padding: 16px; background-color: #ffffff; display: inline-block; width: 100%; box-sizing: border-box;">
                    <img src="${qrImageUrl}" alt="Código QR de Acceso" style="width: 180px; height: 180px; border: 4px solid #f39200; border-radius: 8px; padding: 8px;" />
                    <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Presenta este código QR desde tu celular al llegar al evento.</p>
                  </div>

                  <div style="background-color: #eff6ff; border-left: 4px solid #0d47a1; padding: 14px; border-radius: 4px; margin-top: 20px; text-align: left;">
                    <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📅 <strong>Fecha:</strong> 16 y 17 de Octubre, 2026</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📍 <strong>Lugar:</strong> Centro de Convenciones Crowne Plaza, Managua.</p>
                  </div>

                  <p style="font-size: 14px; line-height: 1.6; color: #374151; margin-top: 28px;">
                    Si tienes alguna consulta, puedes responder directamente a este correo o contactarnos al canal oficial.
                  </p>
                  
                  <p style="font-size: 15px; font-weight: bold; color: #0d47a1; margin-top: 20px;">
                    ¡Nos vemos en el evento más grande del sector ferretero!<br/>
                    <span style="font-weight: normal; color: #6b7280; font-size: 13px;">Comité Organizador EXPO FERRE 2026</span>
                  </p>
                </div>
                
                <img src="${inviteData?.footerBannerUrl || 'https://expoferrenicaragua.com/email-footer.png'}" alt="Marcas y Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              </div>
            `
          }
        });
      } catch (mailErr) {
        console.warn('Registro guardado, notificación por correo secundaria omitida:', mailErr);
      }

      // 5. Guardar estado local para mostrar la pantalla de éxito
      setRegisteredData({
        id: attendeeId,
        nombre: `${cleanNombre} ${cleanApellido}`,
        empresa: cleanEmpresa,
        ciudad: cleanCiudad
      });

    } catch (err) {
      console.error('Error al completar registro directo:', err);
      setSubmitError('Hubo un inconveniente al guardar tu registro. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-outline-variant text-center max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-bold text-on-surface">Validando tu invitación exclusiva...</p>
          <p className="text-xs text-secondary mt-1">Conectando con Expo Ferre 2026</p>
        </div>
      </div>
    );
  }

  // PANTALLA: Enlace ya utilizado (El enlace murió)
  if (tokenStatus === 'used') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-outline-variant text-center max-w-md w-full animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <AlertCircle size={36} />
          </div>
          <h2 className="font-bold text-2xl text-on-surface mb-2">Enlace de Invitación No Disponible</h2>
          <p className="text-secondary text-sm mb-6 leading-relaxed">
            Este enlace de invitación exclusiva <strong>ya ha sido utilizado</strong> para completar un registro en el sistema.
          </p>
          <div className="bg-surface-variant/40 border border-outline-variant/60 rounded-xl p-4 text-xs text-secondary text-left mb-6 space-y-1.5">
            <p className="font-bold text-on-surface">📌 Información Importante:</p>
            <p>• Los enlaces de invitación son personales, intransferibles y de <strong>un solo uso</strong>.</p>
            <p>• Si ya te registraste, tu código QR fue enviado a tu correo electrónico.</p>
            <p>• Si necesitas asistencia o una nueva invitación, contacta al comité organizador.</p>
          </div>
          <a
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-on-primary py-3.5 px-6 rounded-xl font-bold hover:brightness-110 transition-all shadow-md text-sm"
          >
            <span className="material-symbols-outlined text-lg">home</span>
            Ir a la Página Principal
          </a>
        </div>
      </div>
    );
  }

  // PANTALLA: Enlace inválido o no existe
  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-outline-variant text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={36} />
          </div>
          <h2 className="font-bold text-2xl text-on-surface mb-2">Invitación Inválida</h2>
          <p className="text-secondary text-sm mb-6">
            El código o enlace de invitación no es válido o ha expirado.
          </p>
          <a
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-on-primary py-3 px-6 rounded-xl font-bold hover:brightness-110 transition-all text-sm"
          >
            Ir a la Página Principal
          </a>
        </div>
      </div>
    );
  }

  // PANTALLA: Registro exitoso con Gafete y Código QR
  if (registeredData) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 py-12">
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl border border-outline-variant max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 shadow-xs">
            <CheckCircle2 size={36} />
          </div>
          
          <h2 className="font-bold text-2xl text-primary mb-1">¡Registro Confirmado!</h2>
          <p className="text-secondary text-sm mb-6">
            Tu pase exclusivo para <strong>EXPO FERRE 2026</strong> ha sido emitido con éxito.
          </p>

          {/* GAFETE OFICIAL */}
          <div className="bg-gradient-to-b from-surface-container to-surface-variant/30 p-6 md:p-8 rounded-2xl border-2 border-primary/30 inline-block shadow-md w-full mx-auto text-center mb-6">
            
            {/* Badge de Rol: INVITADO ESPECIAL */}
            <div className="inline-flex items-center gap-1.5 bg-primary text-on-primary font-black text-xs px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest shadow-xs">
              <span className="material-symbols-outlined text-sm">verified</span>
              INVITADO ESPECIAL
            </div>

            {inviteData?.sponsorName && (
              <div className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-900 font-bold text-xs px-3.5 py-1 rounded-full mb-3 border border-amber-500/30">
                🤝 Invitado por: {inviteData.sponsorName} {inviteData.sponsorStands ? `(Stand ${inviteData.sponsorStands})` : ''}
              </div>
            )}

            {/* Nombre del Asistente */}
            <h3 className="font-black text-2xl text-primary mb-1 uppercase tracking-wide">
              {registeredData.nombre}
            </h3>

            {/* Empresa */}
            <div className="inline-block bg-primary/10 text-primary font-black text-xs px-3.5 py-1.5 rounded-full mb-2 border border-primary/20 uppercase tracking-wider">
              🏢 {registeredData.empresa}
            </div>

            {/* Ciudad */}
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-5">
              📍 {registeredData.ciudad}
            </p>

            {/* Código QR */}
            <div className="bg-white p-4 rounded-xl inline-block border border-outline/30 shadow-xs mb-3">
              <QRCodeSVG value={registeredData.id} size={180} level="M" />
            </div>

            <p className="text-xs text-secondary font-medium">
              Presenta este código en la entrada principal
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3.5 text-xs text-left mb-6 flex items-start gap-2.5">
            <Mail size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p>
              Hemos enviado una copia de tu confirmación con este código QR a tu correo electrónico: <strong>{email}</strong>
            </p>
          </div>

          <button
            onClick={() => {
              if (onClose) onClose();
              else window.location.href = '/';
            }}
            className="w-full py-3.5 px-6 bg-primary text-on-primary rounded-xl font-bold hover:brightness-110 transition-all shadow-md flex items-center justify-center gap-2 text-base cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">home</span>
            Finalizar y Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA: Formulario de Registro
  return (
    <div className="min-h-screen bg-[#F5F5F7] py-12 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-outline-variant overflow-hidden">
        
        {/* Header con estilo ExpoFerre o Banner del Patrocinador */}
        {inviteData?.headerBannerUrl ? (
          <div className="relative w-full bg-slate-950 overflow-hidden border-b border-outline-variant">
            <img 
              src={inviteData.headerBannerUrl} 
              alt={inviteData.sponsorName || "ExpoFerre 2026"} 
              className="w-full h-auto max-h-56 object-cover object-center"
            />
            <div className="bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white text-center">
              <div className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mx-auto mb-1">
                <span>⭐</span> Invitación Exclusiva {inviteData.sponsorName ? `• ${inviteData.sponsorName}` : ''}
              </div>
              <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-white drop-shadow-sm">
                {inviteData.sponsorName ? `Pase Oficial cortesía de ${inviteData.sponsorName}` : 'EXPO FERRE 2026'}
              </h1>
              {inviteData.sponsorStands && (
                <p className="text-amber-300 text-xs font-semibold mt-0.5">
                  📍 Stand Asignado: {inviteData.sponsorStands}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-primary to-primary-container p-6 md:p-8 text-on-primary text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-sm">stars</span>
              Invitación Exclusiva {inviteData?.sponsorName ? `• ${inviteData.sponsorName}` : ''}
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              EXPO FERRE 2026
            </h1>
            <p className="text-white/90 text-sm mt-1 max-w-md mx-auto">
              {inviteData?.sponsorName 
                ? `${inviteData.sponsorName} te invita cordialmente a registrarte para tu Pase Oficial con Código QR.`
                : 'Completa tus datos para activar tu Pase Oficial con Código QR de Acceso Directo.'}
            </p>
          </div>
        )}

        {/* Formulario */}
        <div className="p-6 md:p-8">
          
          <div className="bg-amber-50/80 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs mb-6 flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <p>
              Este enlace es personal y de <strong>un solo uso</strong>. Al guardar tu información quedará vinculado a tu nombre.
            </p>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs mb-6 flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-secondary" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-secondary" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mendoza"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-secondary" />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Número de Celular <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-3.5 text-secondary" />
                  <input
                    type="tel"
                    required
                    placeholder="Ej. +505 8888-8888"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Ciudad <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3.5 text-secondary" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Managua"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Empresa / Negocio <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3.5 top-3.5 text-secondary" />
                  <input
                    type="text"
                    required
                    placeholder="Nombre de tu empresa"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                Cantidad de Personal de la Empresa <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users size={16} className="absolute left-3.5 top-3.5 text-secondary" />
                <select
                  required
                  value={personalEmpresa}
                  onChange={(e) => setPersonalEmpresa(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium appearance-none"
                >
                  <option value="" disabled>Selecciona el rango de colaboradores</option>
                  <option value="1 a 10 colaboradores">1 a 10 colaboradores</option>
                  <option value="11 a 50 colaboradores">11 a 50 colaboradores</option>
                  <option value="51 a 100 colaboradores">51 a 100 colaboradores</option>
                  <option value="101 a 500 colaboradores">101 a 500 colaboradores</option>
                  <option value="Más de 500 colaboradores">Más de 500 colaboradores</option>
                </select>
                <span className="material-symbols-outlined absolute right-3.5 top-3 text-secondary pointer-events-none text-base">
                  expand_more
                </span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-on-primary font-bold py-3.5 px-6 rounded-xl hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md text-base disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Confirmando Registro y Generando QR...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Confirmar Registro y Obtener Gafete QR</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Banner de Marcas Representadas */}
        {inviteData?.footerBannerUrl && (
          <div className="border-t border-outline-variant bg-slate-50 p-4 text-center">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-2">
              Marcas Oficiales en Exhibición {inviteData.sponsorStands ? `• Stand ${inviteData.sponsorStands}` : ''}
            </p>
            <img 
              src={inviteData.footerBannerUrl} 
              alt="Marcas en Exhibición" 
              className="w-full h-auto max-h-24 object-contain mx-auto rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
