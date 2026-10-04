import { db } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const ADMIN_NOTIFICATION_EMAIL = 'karen.torres@rinsa.red';

/**
 * Genera el template HTML corporativo para notificar a Karen Torres cuando un jurado envía sus votos.
 */
export const buildJuryNotificationEmailHtml = ({ judgeName, judgeCompany, submittedAtStr, evaluations }) => {
  const categoriesConfig = [
    { id: 'familiar', title: '01. Ferretería Familiar', color: '#f39200' },
    { id: 'oro', title: '02. Ferretería Oro (25+ Años)', color: '#d97706' },
    { id: 'promesa', title: '03. Ferretería Promesa (<5 Años)', color: '#2563eb' }
  ];

  const categoriesHtml = categoriesConfig.map(cat => {
    const slots = (evaluations?.[cat.id] || []).filter(s => s.nombreFerreteria?.trim());
    const slotsHtml = slots.length === 0
      ? '<p style="color: #9ca3af; font-style: italic; margin: 6px 0; font-size: 13px;">Sin ferreterías nominadas en esta categoría.</p>'
      : slots.map((s, idx) => `
        <div style="background-color: #ffffff; padding: 10px 14px; margin-bottom: 8px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="display: inline-block; background-color: #f3f4f6; color: #1f2937; font-weight: bold; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-right: 8px;">
              ${s.slot ? `${s.slot}º Lugar` : `${idx + 1}º Lugar`}
            </span>
            <strong style="color: #111827; font-size: 14px;">${s.nombreFerreteria}</strong>
          </div>
          ${s.ciudad ? `<span style="color: #6b7280; font-size: 12px; background-color: #f9fafb; padding: 2px 8px; border-radius: 4px; border: 1px solid #f3f4f6;">📍 ${s.ciudad}</span>` : ''}
        </div>
      `).join('');

    return `
      <div style="margin-bottom: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 15px; font-weight: bold; border-bottom: 2px solid ${cat.color}; padding-bottom: 6px;">
          ${cat.title}
        </h3>
        ${slotsHtml}
      </div>
    `;
  }).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <!-- Banner Header Oficial -->
      <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 650px; height: auto;" />
      
      <div style="padding: 32px 28px;">
        <!-- Badge Superior -->
        <div style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 5px 14px; border-radius: 20px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; border: 1px solid #fde68a;">
          🏆 Notificación · Premios a la Excelencia Ferretera
        </div>

        <h1 style="color: #0f172a; margin: 0 0 12px 0; font-size: 22px; font-weight: 900; line-height: 1.3;">
          ¡Nueva Evaluación de Jurado Recibida!
        </h1>
        
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
          Estimada <strong>Karen Torres</strong>, te informamos que un miembro del jurado calificador ha completado y enviado exitosamente su selección y votación para los <em>Premios a la Excelencia Ferretera ExpoFerre 2026</em>.
        </p>

        <!-- Ficha Resumen del Jurado -->
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%); border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px; margin-bottom: 26px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Jurado:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 800; font-size: 16px;">${judgeName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Empresa / Institución:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 700;">${judgeCompany || 'Comité Organizador / Sector Ferretero'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Fecha y Hora:</td>
              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">${submittedAtStr || 'Reciente'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Estado:</td>
              <td style="padding: 6px 0; color: #047857; font-weight: 700;">✅ Votos Registrados y Contabilizados en Vivo</td>
            </tr>
          </table>
        </div>

        <h2 style="color: #0f172a; font-size: 17px; font-weight: 800; margin: 0 0 14px 0; border-left: 4px solid #f39200; padding-left: 10px;">
          Ferreterías Seleccionadas por el Jurado
        </h2>

        <!-- Desglose de Categorías -->
        ${categoriesHtml}

        <!-- Botón de Acción -->
        <div style="text-align: center; margin: 32px 0 20px 0;">
          <a href="https://expoferrenicaragua.com/" style="background-color: #f39200; color: #000000; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 900; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(243, 146, 0, 0.3);">
            📊 Ingresar al Panel y Ver Ranking en Vivo
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 20px 0 0 0;">
          Este correo fue generado automáticamente por la plataforma Expo Ferre Nicaragua 2026.
        </p>
      </div>

      <!-- Footer Banner Oficial -->
      <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 650px; height: auto;" />
    </div>
  `;
};

/**
 * Despacha el correo de notificación a karen.torres@rinsa.red en la colección 'mail' de Firestore.
 */
export const notifyAdminJuryCompleted = async ({ judgeName, judgeCompany, submittedAtStr, evaluations, recipient = ADMIN_NOTIFICATION_EMAIL }) => {
  const html = buildJuryNotificationEmailHtml({ judgeName, judgeCompany, submittedAtStr, evaluations });
  const subject = `🏆 Jurado Completó Evaluación: ${judgeName.trim()} · Premios ExpoFerre 2026`;

  return addDoc(collection(db, 'mail'), {
    to: recipient,
    message: {
      subject,
      html
    },
    createdAt: serverTimestamp()
  });
};
