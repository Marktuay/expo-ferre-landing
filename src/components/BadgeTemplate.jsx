import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Plantilla térmica compacta optimizada para Brother QL-810Wc (Rollo DK-2205 continuo de 62 mm)
// Tamaño de etiqueta: 62 mm de ancho x 40 mm de alto
export default function BadgeTemplate({ data, roleLabel = 'STAFF' }) {
  const fullName = data.name || `${data.nombre || ''} ${data.apellido || ''}`.trim() || 'Participante';
  const company = data.company || data.empresa || data.sponsorName || '';
  const position = data.position || data.cargo || '';
  const id = data.id || data.registeredAttendeeId || 'N/A';
  const displayRole = (data.roleLabel || roleLabel || 'STAFF').toUpperCase();

  return (
    <div className="brother-thermal-badge w-[62mm] h-[40mm] max-w-[62mm] max-h-[40mm] bg-white text-black p-[2.5mm] flex flex-row items-center justify-between border border-black/30 print:border-0 rounded-md print:rounded-none shrink-0 m-2 print:m-0 overflow-hidden box-border font-sans select-none shadow-sm print:shadow-none">
      {/* Columna Izquierda: Identificación del participante */}
      <div className="flex-1 pr-2 flex flex-col justify-between h-full min-w-0">
        
        {/* Cabecera: Marca del evento y pastilla de rol */}
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[8.5px] font-black tracking-tight uppercase leading-none text-black">
              EXPO FERRE 2026
            </span>
            <span className="bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider leading-none">
              {displayRole}
            </span>
          </div>

          {/* Nombre Completo */}
          <h2 className="text-[12.5px] font-black uppercase text-black leading-[1.15] tracking-tight line-clamp-2 break-words mt-0.5">
            {fullName}
          </h2>
        </div>

        {/* Empresa y Cargo */}
        <div className="my-auto pt-0.5">
          {company && company.toLowerCase() !== 'particular' && company.toLowerCase() !== 'n/a' && (
            <p className="text-[10px] font-black text-black uppercase leading-tight line-clamp-1 truncate">
              {company}
            </p>
          )}
          {position && (
            <p className="text-[8.5px] font-medium text-black leading-tight line-clamp-1 truncate mt-0.5">
              {position}
            </p>
          )}
        </div>

        {/* Pie de etiqueta */}
        <div className="text-[7px] font-bold text-black/80 uppercase tracking-wider">
          17 OCT 2026 • CROWNE PLAZA
        </div>
      </div>

      {/* Columna Derecha: Código QR Térmico de Alta Nitidez */}
      <div className="w-[24mm] flex flex-col items-center justify-center shrink-0 h-full border-l border-black/20 pl-1.5">
        <div className="bg-white p-0.5 flex items-center justify-center">
          <QRCodeSVG 
            value={id} 
            size={84} 
            level="M" 
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <span className="text-[7.5px] font-mono font-bold text-black mt-1 leading-none text-center truncate max-w-full">
          {id}
        </span>
      </div>
    </div>
  );
}

