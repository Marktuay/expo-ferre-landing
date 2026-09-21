import React, { useState } from 'react';
import { Mail, Copy, Check, Send, X, ExternalLink, Award } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

export default function InviteJudgeModal({ isOpen, onClose, onJudgeCreated }) {
  const [judgeName, setJudgeName] = useState('');
  const [judgeEmail, setJudgeEmail] = useState('');
  const [judgePhone, setJudgePhone] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const baseUrl = window.location.origin;
  const inviteLink = `${baseUrl}/?form=jurado&judge=${encodeURIComponent(judgeName.trim() || 'Jurado')}`;

  const cleanPhone = judgePhone.replace(/[^0-9]/g, '');

  const fullInvitationText = `Estimado(a) ${judgeName.trim() || 'Miembro del Comité'}, te saludamos de parte del Comité Organizador de EXPO FERRE Nicaragua 2026.

Es un honor invitarte a formar parte del Jurado Calificador Oficial para los Premios a la Excelencia Ferretera 2026.

Para registrar tus nominaciones y evaluaciones en las categorías (Ferretería Familiar, Ferretería Oro y Ferretería Promesa), ingresa en el siguiente enlace confidencial:
${inviteLink}

¡Agradecemos tu valiosa contribución y experiencia en el sector ferretero! 🏆`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullInvitationText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!judgeEmail.trim()) {
      alert('Por favor, ingresa el correo electrónico del jurado.');
      return;
    }

    setIsSending(true);
    setSuccessMessage('');

    try {
      await addDoc(collection(db, 'mail'), {
        to: judgeEmail.trim(),
        message: {
          subject: 'Invitación a Jurado Calificador · Premios a la Excelencia ExpoFerre 2026',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <!-- Header Image -->
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 30px;">
                <div style="background-color: #f39200; color: #000; display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 15px;">
                  🏆 Comité Calificador Oficial
                </div>

                <h2 style="color: #0d47a1; margin-top: 0;">¡Estimado(a) ${judgeName.trim() || 'Miembro del Jurado'}!</h2>
                <p style="font-size: 15px; line-height: 1.6;">Le saludamos cordialmente del Comité Organizador de <strong>EXPO FERRE Nicaragua 2026</strong>.</p>
                <p style="font-size: 15px; line-height: 1.6;">Para nosotros es un honor contar con su trayectoria y criterio experto como parte del <strong>Jurado Calificador</strong> de los <em>Premios a la Excelencia Ferretera</em> (Ferretería Familiar, Ferretería Oro y Ferretería Promesa).</p>
                <p style="font-size: 15px; line-height: 1.6;">Para ingresar al portal privado y realizar sus nominaciones y asignación de puntuaciones, por favor haga clic en el botón a continuación:</p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${inviteLink}" style="background-color: #f39200; color: #000000; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🏆 Ingresar al Portal de Evaluación</a>
                </div>

                ${customNote.trim() ? `
                  <div style="margin: 25px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #f39200; border-radius: 4px; font-style: italic; color: #444;">
                    "${customNote.trim()}"
                  </div>
                ` : ''}

                <div style="background-color: #f0f4f8; padding: 15px; border-radius: 6px; margin: 25px 0; font-size: 13px; color: #4b5563;">
                  <strong>Metodología:</strong> Nominación de hasta 5 ferreterías por categoría y evaluación con escala del 1 al 5 en base a su percepción y trayectoria en el mercado.
                </div>

                <p style="font-size: 15px; font-weight: bold; color: #0d47a1; margin-top: 25px;">¡Gracias por ser parte fundamental de la industria ferretera! 🚀</p>

                <p style="font-size: 13px; color: #666; margin-top: 30px;">Si el botón no abre automáticamente, copie y pegue este enlace en su navegador:<br/>
                <a href="${inviteLink}" style="color: #0d47a1; word-break: break-all;">${inviteLink}</a></p>
              </div>
              
              <!-- Footer Image -->
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
      });

      // Guardar también registro del jurado invitado en Firestore
      await addDoc(collection(db, `${getEventBasePath()}/invitedJudges`), {
        name: judgeName.trim(),
        email: judgeEmail.trim(),
        phone: judgePhone.trim(),
        inviteLink: inviteLink,
        status: 'invited',
        sentVia: 'email',
        createdAt: serverTimestamp()
      });

      setSuccessMessage(`¡Invitación enviada por correo a ${judgeEmail.trim()}!`);
      if (onJudgeCreated) onJudgeCreated();
      setJudgeEmail('');
      setJudgeName('');
      setJudgePhone('');
      setCustomNote('');
    } catch (error) {
      console.error('Error al enviar correo de invitación a jurado:', error);
      alert('Hubo un inconveniente al enviar por correo. Puedes copiar el enlace directo.');
    } finally {
      setIsSending(false);
    }
  };

  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullInvitationText)}`
    : `https://wa.me/?text=${encodeURIComponent(fullInvitationText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-[#283474] text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 text-[#f39200] font-bold text-xs uppercase tracking-wider mb-1">
            <Award size={16} /> Premios a la Excelencia 2026
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            Generar Enlace / Invitar Jurado
          </h2>
          <p className="text-gray-300 text-xs mt-1">
            Crea el enlace personalizado para que el jurado evalúe las 3 categorías.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check size={16} className="text-emerald-600 shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Campo Nombre del Jurado */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Nombre del Jurado <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={judgeName}
              onChange={(e) => setJudgeName(e.target.value)}
              placeholder="Ej. Ing. Roberto Morales / Lic. Carlos Mendoza"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f39200]"
              required
            />
          </div>

          {/* Enlace Generado y Botones de Copiar / WhatsApp */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block text-[11px] font-bold text-gray-500 uppercase">
              Enlace Privado de Evaluación
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={inviteLink}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 select-all truncate"
              />
              <button 
                onClick={handleCopyLink}
                className="shrink-0 bg-gray-900 hover:bg-black text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                {isCopied ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Botón de WhatsApp */}
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              Enviar Invitación por WhatsApp
            </a>
          </div>

          {/* Opción de Envío por Correo Electrónico */}
          <div className="border-t border-gray-100 pt-4">
            <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              O enviar invitación por correo electrónico
            </span>
            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-500 font-medium mb-1">
                  Correo Electrónico del Jurado
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="email" 
                    value={judgeEmail}
                    onChange={(e) => setJudgeEmail(e.target.value)}
                    placeholder="jurado@empresa.com"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f39200]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-medium mb-1">
                  WhatsApp / Teléfono (Opcional)
                </label>
                <input 
                  type="tel" 
                  value={judgePhone}
                  onChange={(e) => setJudgePhone(e.target.value)}
                  placeholder="+505 8888-8888"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f39200]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-medium mb-1">
                  Nota personalizada (Opcional)
                </label>
                <textarea 
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Mensaje o saludo adicional..."
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f39200] resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isSending || !judgeEmail.trim() || !judgeName.trim()}
                className="w-full bg-[#f39200] hover:bg-[#d98200] disabled:opacity-50 text-black font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Send size={14} />
                {isSending ? 'Enviando Correo...' : 'Enviar Invitación Formal por Correo'}
              </button>
            </form>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
