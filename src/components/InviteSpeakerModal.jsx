import React, { useState } from 'react';
import { Mail, Copy, Check, Send, X, ExternalLink } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function InviteSpeakerModal({ isOpen, onClose, sponsorData }) {
  const [speakerEmail, setSpeakerEmail] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const sponsorName = sponsorData?.empresa || sponsorData?.nombre || 'Patrocinador Oficial';
  const sponsorEmail = auth.currentUser?.email || sponsorData?.email || '';
  const sponsorUid = auth.currentUser?.uid || 'sponsor';

  // Base URL para el enlace
  const baseUrl = window.location.origin;
  const inviteLink = `${baseUrl}/?form=speaker&sponsorId=${encodeURIComponent(sponsorUid)}&sponsorName=${encodeURIComponent(sponsorName)}&sponsorEmail=${encodeURIComponent(sponsorEmail)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!speakerEmail.trim()) return;

    setIsSending(true);
    setSuccessMessage('');

    try {
      await addDoc(collection(db, 'mail'), {
        to: speakerEmail.trim(),
        message: {
          subject: `Invitación de ${sponsorName} a presentar tu Conferencia en ExpoFerre 2026`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <!-- Header Image -->
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 30px;">
                <h2 style="color: #0d47a1; margin-top: 0;">¡Hola ${speakerName.trim() || 'Estimado Conferencista'}!</h2>
                <p><strong>${sponsorName}</strong> te ha invitado cordialmente como <strong>Speaker / Conferencista Oficial</strong> para participar en <strong>ExpoFerre 2026</strong>.</p>
                
                <p>Para registrar el título de tu presentación, tu trayectoria profesional, datos de contacto y fotografía, por favor completa el formulario oficial ingresando en el siguiente enlace:</p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${inviteLink}" style="background-color: #f39200; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">🎙️ Registrar Mi Conferencia</a>
                </div>

                ${customNote.trim() ? `
                  <div style="margin: 25px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #f39200; border-radius: 4px; font-style: italic; color: #444;">
                    "${customNote.trim()}"
                  </div>
                ` : ''}

                <p style="font-size: 13px; color: #666; margin-top: 30px;">Si el botón no abre automáticamente, copia y pega el siguiente enlace en tu navegador:<br/>
                <a href="${inviteLink}" style="color: #0d47a1; word-break: break-all;">${inviteLink}</a></p>
              </div>
              
              <!-- Footer Image -->
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
      });

      setSuccessMessage(`¡Invitación enviada con éxito a ${speakerEmail.trim()}!`);
      setSpeakerEmail('');
      setSpeakerName('');
      setCustomNote('');
    } catch (error) {
      console.error('Error al enviar correo de invitación:', error);
      alert('Hubo un inconveniente al enviar la invitación por correo. Intenta copiar el enlace directo.');
    } finally {
      setIsSending(false);
    }
  };

  const whatsappMessage = encodeURIComponent(`Hola ${speakerName || ''}, te saluda ${sponsorName}. Te enviamos el enlace para registrar los datos de tu conferencia en ExpoFerre 2026: ${inviteLink}`);
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-surface-container p-5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-on-surface">Enviar Invitación a Conferencista</h3>
              <p className="text-xs text-secondary">El speaker podrá registrar su información directamente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full text-secondary transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm flex items-center gap-2">
              <Check className="text-green-600 shrink-0" size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                Correo Electrónico del Conferencista <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="conferencista@empresa.com"
                value={speakerEmail}
                onChange={(e) => setSpeakerEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                Nombre del Conferencista <span className="text-xs font-normal text-secondary">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Ing. Carlos Martínez"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                Mensaje Personalizado <span className="text-xs font-normal text-secondary">(Opcional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Mensaje adicional o nota para el conferencista..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSending || !speakerEmail.trim()}
              className="w-full bg-primary text-on-primary font-bold py-3 px-6 rounded-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-sm"
            >
              <Send size={18} />
              {isSending ? 'Enviando invitación...' : 'Enviar Invitación por Correo'}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-outline-variant"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-secondary uppercase tracking-wider">Otras formas de envío</span>
            <div className="flex-grow border-t border-outline-variant"></div>
          </div>

          {/* Copiar enlace y WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full bg-surface-container border border-outline-variant hover:bg-surface-variant text-on-surface font-bold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 text-xs"
            >
              {isCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {isCopied ? '¡Enlace Copiado!' : 'Copiar Enlace Directo'}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 text-xs text-center"
            >
              <ExternalLink size={16} />
              Enviar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
