// src/services/watiService.js
// Servicio de integración con la API oficial de WhatsApp Business a través de WATI (Wati.io)

export const DEFAULT_WATI_CONFIG = {
  endpoint: 'https://live-mt-server.wati.io/10262044',
  token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6Im1hcmt0dWF5QGdtYWlsLmNvbSIsIm5hbWVpZCI6Im1hcmt0dWF5QGdtYWlsLmNvbSIsImVtYWlsIjoibWFya3R1YXlAZ21haWwuY29tIiwiYXV0aF90aW1lIjoiMTAvMDEvMjAyNiAyMzo0NDowNCIsInRlbmFudF9pZCI6IjEwMjYyMDQ0IiwiZGJfbmFtZSI6Im10LXByb2QtVGVuYW50cyIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFETUlOSVNUUkFUT1IiLCJleHAiOjI1MzQwMjMwMDgwMCwiaXNzIjoiQ2xhcmVfQUkiLCJhdWQiOiJDbGFyZV9BSSJ9.TPPSPtWfRnQhrER55s2zCR6DsjLJFDK6yINBsz0qPKo',
  templateName: 'invitacion_expoferre',
  broadcastName: 'ExpoFerre_Invitaciones_Directas'
};

/**
 * Normaliza un número telefónico para formato internacional de WhatsApp (Nicaragua: 505)
 * @param {string} rawPhone 
 * @returns {{ phone: string, isValid: boolean, original: string }}
 */
export const cleanPhoneNumber = (rawPhone) => {
  if (!rawPhone) return { phone: '', isValid: false, original: '' };
  
  let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
  
  // Si tiene 8 dígitos (celular típico de Nicaragua: 8xxx-xxxx o 7xxx-xxxx o 5xxx-xxxx)
  if (cleaned.length === 8) {
    cleaned = '505' + cleaned;
  }
  
  // Si empieza con 00505
  if (cleaned.startsWith('00505')) {
    cleaned = cleaned.substring(2);
  }

  const isValid = cleaned.length >= 10 && cleaned.length <= 15;
  return {
    phone: cleaned,
    isValid,
    original: String(rawPhone)
  };
};

/**
 * Obtiene las plantillas de mensajes de WATI y su estado en Meta
 */
export const getWatiMessageTemplates = async (config = DEFAULT_WATI_CONFIG) => {
  try {
    const res = await fetch(`${config.endpoint}/api/v1/getMessageTemplates`, {
      method: 'GET',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Error de servidor Wati (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    return {
      success: true,
      templates: data.messageTemplates || [],
      raw: data
    };
  } catch (err) {
    console.error('Error al consultar plantillas de Wati:', err);
    return {
      success: false,
      error: err.message,
      templates: []
    };
  }
};

/**
 * Verifica el estado de una plantilla específica en WATI
 * @param {string} templateName 
 * @param {object} config 
 * @returns {Promise<{ found: boolean, status: string, template: object|null }>}
 */
export const checkTemplateStatus = async (templateName = DEFAULT_WATI_CONFIG.templateName, config = DEFAULT_WATI_CONFIG) => {
  const result = await getWatiMessageTemplates(config);
  if (!result.success) {
    return { found: false, status: 'ERROR', error: result.error, template: null };
  }

  const tmpl = result.templates.find(t => t.elementName === templateName);
  if (!tmpl) {
    return { found: false, status: 'NOT_FOUND', template: null };
  }

  return {
    found: true,
    status: tmpl.status, // 'APPROVED', 'PENDING', 'REJECTED'
    template: tmpl
  };
};

/**
 * Envía un mensaje de plantilla a través de WATI
 */
export const sendWatiTemplateMessage = async ({
  phone,
  templateName = DEFAULT_WATI_CONFIG.templateName,
  broadcastName = DEFAULT_WATI_CONFIG.broadcastName,
  parameters = [],
  config = DEFAULT_WATI_CONFIG
}) => {
  const phoneInfo = cleanPhoneNumber(phone);
  if (!phoneInfo.isValid) {
    return {
      success: false,
      error: `Número de teléfono inválido: "${phone}". Debe contener al menos 8 dígitos.`
    };
  }

  try {
    const url = `${config.endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${phoneInfo.phone}`;
    
    const payload = {
      template_name: templateName,
      broadcast_name: broadcastName || 'ExpoFerre_Broadcast',
      parameters: parameters.map(p => ({
        name: String(p.name),
        value: String(p.value || '')
      }))
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    // Wati retorna { result: true/false, info: "...", validWhatsAppNumber: true/false }
    // o a veces { result: "success" }
    const isSuccess = data.result === true || data.result === 'success' || (res.ok && !data.items && data.validWhatsAppNumber !== false);

    if (!res.ok || (data.result === false && !isSuccess)) {
      const errorMsg = data.info || (data.items ? data.items.map(i => i.description).join(', ') : `Error HTTP ${res.status}`);
      return {
        success: false,
        error: errorMsg,
        data,
        phone: phoneInfo.phone
      };
    }

    return {
      success: true,
      data,
      phone: phoneInfo.phone
    };
  } catch (err) {
    console.error('Error de red al enviar mensaje con WATI:', err);
    return {
      success: false,
      error: err.message || 'Error de conexión con el servidor de Wati',
      phone: phoneInfo.phone
    };
  }
};

/**
 * Helper para despachar una invitación directa individual a través de WATI
 */
export const sendDirectInviteViaWati = async ({
  invite,
  sponsorName,
  inviteUrl,
  templateName = DEFAULT_WATI_CONFIG.templateName,
  config = DEFAULT_WATI_CONFIG
}) => {
  if (!invite.telefono) {
    return {
      success: false,
      error: 'El invitado no tiene número de teléfono registrado.'
    };
  }

  const guestName = (invite.nombre || '').trim() || 'Estimado(a) Invitado(a)';
  const sponsorClean = (sponsorName && sponsorName !== 'general' && sponsorName.toLowerCase() !== 'invitacion general')
    ? sponsorName
    : 'El Comité Organizador de EXPO FERRE';

  // Parámetros para la plantilla 'invitacion_expoferre':
  // {{1}} = Nombre del invitado
  // {{2}} = Nombre del patrocinador o Comité Organizador
  // {{3}} = Enlace de invitación único
  const parameters = [
    { name: '1', value: guestName },
    { name: '2', value: sponsorClean },
    { name: '3', value: inviteUrl }
  ];

  return await sendWatiTemplateMessage({
    phone: invite.telefono,
    templateName,
    broadcastName: `Inv_${sponsorClean.replace(/\s+/g, '_')}_${invite.id}`,
    parameters,
    config
  });
};

/**
 * Helper para despachar la confirmación de registro oficial y pase con QR a través de WATI
 */
export const sendRegistrationConfirmationViaWati = async ({
  phone,
  guestName,
  companyName,
  attendeeId,
  passUrl,
  sponsorName = 'Comité Organizador EXPO FERRE',
  templateName = 'confirmacion_registro_qr',
  config = DEFAULT_WATI_CONFIG
}) => {
  if (!phone) {
    return {
      success: false,
      error: 'No se proporcionó número de teléfono para enviar la confirmación.'
    };
  }

  const phoneInfo = cleanPhoneNumber(phone);
  if (!phoneInfo.isValid) {
    return {
      success: false,
      error: `Número de teléfono inválido: "${phone}"`
    };
  }

  const cleanName = (guestName || 'Estimado(a) Asistente').trim();
  const cleanCompany = (companyName || 'General').trim();
  const sponsorClean = (sponsorName && sponsorName !== 'general') ? sponsorName : 'Comité Organizador EXPO FERRE';

  // Parámetros para la plantilla de confirmación 'confirmacion_registro_qr':
  // {{1}} = Nombre del asistente
  // {{2}} = Empresa
  // {{3}} = Código de Registro / ID
  // {{4}} = Enlace al Gafete Digital con Código QR
  const parameters = [
    { name: '1', value: cleanName },
    { name: '2', value: cleanCompany },
    { name: '3', value: String(attendeeId || '') },
    { name: '4', value: passUrl || 'https://expoferrenicaragua.com' }
  ];

  return await sendWatiTemplateMessage({
    phone: phoneInfo.phone,
    templateName,
    broadcastName: `PaseQR_${cleanName.replace(/\s+/g, '_').substring(0, 15)}_${attendeeId || Date.now()}`,
    parameters,
    config
  });
};

