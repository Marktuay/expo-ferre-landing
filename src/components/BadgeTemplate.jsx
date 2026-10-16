import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Plantilla térmica vertical para Brother QL-810Wc (Rollo DK-2205 continuo de 62 mm)
// Formato Opción A: 62 mm de ancho x 100 mm de largo (corte automático a 10 cm)
export default function BadgeTemplate({ data, roleLabel = 'STAFF' }) {
  const fullName = data.name || `${data.nombre || ''} ${data.apellido || ''}`.trim() || 'Participante';
  const company = data.company || data.empresa || data.sponsorName || '';
  const position = data.position || data.cargo || '';
  const rawId = data.id || data.registeredAttendeeId || 'N/A';

  // Identificar si es Invitado VIP (con derecho a comida) vs Asistente general de preregistro
  const isVip = Boolean(
    data.isVip ||
    data.isDirectInvite ||
    data.type === 'direct_invite' ||
    data.source === 'Invitación Directa' ||
    (data.roleLabel && data.roleLabel.toUpperCase().includes('VIP')) ||
    (roleLabel && roleLabel.toUpperCase().includes('VIP')) ||
    (data.position && data.position.toLowerCase().includes('invitado'))
  );

  const displayRole = isVip ? '★ INVITADO VIP ★' : (data.roleLabel || roleLabel || 'ASISTENTE').toUpperCase();
  const cleanId = String(rawId).replace(/^VIP[-_:\s]+/i, '').trim();
  const qrValue = isVip ? `VIP-${cleanId}` : cleanId;
  const displayId = isVip ? `VIP - ${cleanId}` : cleanId;

  return (
    <div className="brother-thermal-badge w-[62mm] h-[100mm] max-w-[62mm] max-h-[100mm] bg-white text-black p-[3mm] flex flex-col items-center justify-between border-2 border-black/30 print:border-0 rounded-md print:rounded-none shrink-0 m-2 print:m-0 overflow-hidden box-border font-sans select-none shadow-md print:shadow-none">
      
      {/* 1. Cabecera del Evento */}
      <div className="w-full text-center pt-0.5">
        <h3 className="text-[11.5px] font-black tracking-[0.22em] uppercase text-black leading-none">
          EXPO FERRE 2026
        </h3>
      </div>

      {/* 2. Franja de Rol Distintiva */}
      <div className={`w-full text-center font-black text-[12.5px] py-1.5 px-1 tracking-[0.16em] uppercase my-1 rounded-xs ${
        isVip ? 'bg-black text-white border-2 border-black' : 'bg-slate-900 text-white'
      }`}>
        {displayRole}
      </div>

      {/* 3. Nombre del Asistente */}
      <div className="w-full text-center px-1 my-1">
        <h2 className="text-[17px] font-black uppercase text-black leading-tight line-clamp-2 break-words">
          {fullName}
        </h2>
      </div>

      {/* 4. Nombre de la Empresa / Patrocinador (DESTACADO EN GRANDE) */}
      {company && company.toLowerCase() !== 'particular' && company.toLowerCase() !== 'n/a' && (
        <div className="w-full bg-slate-100 border-y-2 border-black/80 py-1.5 px-1 text-center my-1 rounded-xs">
          <p className="text-[15px] font-black uppercase tracking-tight text-black leading-tight line-clamp-2 break-words">
            {company}
          </p>
        </div>
      )}

      {/* 5. Cargo o Stand (si está disponible y no repite el rol ni es genérico de invitado) */}
      {position && 
       position.toUpperCase() !== displayRole && 
       !position.toLowerCase().includes('invitado') && (
        <div className="w-full text-center px-1 -mt-0.5 mb-1">
          <p className="text-[10px] font-bold text-black/90 uppercase tracking-tight line-clamp-1 truncate">
            {position}
          </p>
        </div>
      )}

      {/* 6. Código QR de Acceso en Alta Nitidez Térmica con Distinción VIP */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="bg-white p-1 border border-black/30 rounded-xs flex items-center justify-center">
          <QRCodeSVG 
            value={qrValue} 
            size={125} 
            level="M" 
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <span className="text-[10px] font-mono font-black mt-1 leading-none text-center tracking-wider text-black">
          {displayId}
        </span>
      </div>

      {/* 7. Pie de Gafete Oficial */}
      <div className="w-full border-t border-black/30 pt-1.5 text-center mt-auto pb-0.5">
        <p className="text-[8.5px] font-black text-black/90 uppercase tracking-widest leading-none">
          17 OCTUBRE 2026 • HOTEL CROWNE PLAZA
        </p>
      </div>

    </div>
  );
}


