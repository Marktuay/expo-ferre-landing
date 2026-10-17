import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Plantilla térmica para Brother QL-810Wc (Rollo DK-2205 continuo de 62 mm)
// Soporta:
// - Formato Horizontal (100 mm de ancho x 62 mm de alto): Orientación apaisada, 100% centrado, texto gigante y máxima legibilidad
// - Formato Vertical (62 mm de ancho x 100 mm de alto): Orientación vertical
export default function BadgeTemplate({ data, roleLabel = 'STAFF', showQr = false, orientation = 'horizontal' }) {
  const fullName = data.name || `${data.nombre || ''} ${data.apellido || ''}`.trim() || 'Participante';
  const company = data.company || data.empresa || data.sponsorName || '';
  const position = data.position || data.cargo || data.puesto || '';
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

  // Cálculo de tamaño dinámico de texto para que TODO QUEPA perfectamente sin desbordar
  const nameLen = fullName.length;
  const nameFontSizeClass = nameLen > 36 
    ? 'text-[16px]' 
    : nameLen > 24 
      ? 'text-[18.5px]' 
      : 'text-[21px]';

  const compLen = company.length;
  const compFontSizeClass = compLen > 36 
    ? 'text-[12px]' 
    : compLen > 22 
      ? 'text-[13.5px]' 
      : 'text-[15px]';

  // ========================================================
  // 1. MODO HORIZONTAL (100 mm de ancho × 62 mm de alto)
  // ========================================================
  if (orientation === 'horizontal') {
    return (
      <div className="brother-thermal-badge w-[100mm] h-[62mm] max-w-[100mm] max-h-[62mm] bg-white text-black p-[2mm] px-[4mm] flex flex-col items-center justify-between border-2 border-black/30 print:border-0 rounded-md print:rounded-none shrink-0 m-2 print:m-0 overflow-hidden box-border font-sans select-none shadow-md print:shadow-none">
        
        {!showQr ? (
          /* ========================================================
             MODO HORIZONTAL SIN QR (100% CENTRADO, MÁXIMA LEGIBILIDAD)
             ======================================================== */
          <>
            {/* 1. Cabecera y Rol Centrados */}
            <div className="w-full flex flex-col items-center text-center pt-0.5">
              <h3 className="text-[10px] font-black tracking-[0.24em] uppercase text-black leading-none mb-1">
                EXPO FERRE 2026
              </h3>
              <div className={`inline-block font-black py-0.5 px-4 tracking-[0.16em] uppercase rounded-xs ${
                isVip ? 'bg-black text-white border border-black text-[11px]' : 'bg-slate-900 text-white text-[10.5px]'
              }`}>
                {displayRole}
              </div>
            </div>

            {/* 2. Área Central (Nombre, Cargo debajo del Nombre, y Empresa) Centrados */}
            <div className="w-full flex-1 flex flex-col justify-center items-center text-center my-auto gap-1 px-1">
              {/* Nombre del Asistente */}
              <div className="w-full">
                <h2 className={`${nameFontSizeClass} font-black uppercase text-black leading-tight line-clamp-2 break-words`}>
                  {fullName}
                </h2>
                {/* Cargo ubicado justo debajo del nombre */}
                {position && position.toUpperCase() !== displayRole && (
                  <p className="text-[11px] font-bold text-black/85 uppercase tracking-tight line-clamp-1 mt-0.5">
                    {position}
                  </p>
                )}
              </div>

              {/* Nombre de la Empresa / Patrocinador */}
              {company && company.toLowerCase() !== 'particular' && company.toLowerCase() !== 'n/a' && (
                <div className="w-full max-w-[95%] bg-slate-100 border-y border-black/70 py-0.5 px-2 text-center rounded-xs mt-0.5">
                  <p className={`${compFontSizeClass} font-black uppercase tracking-tight text-black leading-tight line-clamp-2 break-words`}>
                    {company}
                  </p>
                </div>
              )}
            </div>

            {/* 3. Pie de Gafete Oficial Centrado */}
            <div className="w-full border-t border-black/30 pt-0.5 text-center mt-auto flex items-center justify-between px-1">
              <span className="text-[8px] font-black text-black/90 uppercase tracking-wider leading-none">
                17 OCTUBRE 2026 • HOTEL CROWNE PLAZA
              </span>
              <span className="text-[7.5px] font-mono font-bold text-black/75 tracking-wider uppercase">
                ID: {displayId}
              </span>
            </div>
          </>
        ) : (
          /* ========================================================
             MODO HORIZONTAL CON QR (DISTRIBUCIÓN EN 2 COLUMNAS)
             ======================================================== */
          <>
            <div className="w-full flex-1 flex items-center justify-between gap-2">
              {/* Columna Izquierda: Información */}
              <div className="flex-1 flex flex-col justify-between h-full text-left py-0.5">
                <div>
                  <h3 className="text-[9px] font-black tracking-[0.2em] uppercase text-black leading-none mb-1">
                    EXPO FERRE 2026
                  </h3>
                  <div className={`inline-block font-black py-0.5 px-2.5 tracking-[0.14em] uppercase rounded-xs ${
                    isVip ? 'bg-black text-white text-[10px]' : 'bg-slate-900 text-white text-[9.5px]'
                  }`}>
                    {displayRole}
                  </div>
                </div>

                <div className="my-1">
                  <h2 className="text-[17px] font-black uppercase text-black leading-tight line-clamp-2 break-words">
                    {fullName}
                  </h2>
                  {/* Cargo ubicado justo debajo del nombre */}
                  {position && position.toUpperCase() !== displayRole && (
                    <p className="text-[10px] font-bold text-black/80 uppercase line-clamp-1 mt-0.5">
                      {position}
                    </p>
                  )}
                  {company && company.toLowerCase() !== 'particular' && company.toLowerCase() !== 'n/a' && (
                    <p className="text-[12.5px] font-black uppercase text-black/90 mt-0.5 line-clamp-1 break-words">
                      {company}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[7.5px] font-black text-black/80 uppercase tracking-tight">
                    17 OCT 2026 • CROWNE PLAZA
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Código QR */}
              <div className="shrink-0 flex flex-col items-center justify-center p-1 border-l border-black/20 pl-2">
                <div className="bg-white p-0.5 border border-black/30 rounded-xs">
                  <QRCodeSVG 
                    value={qrValue} 
                    size={80} 
                    level="M" 
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <span className="text-[8px] font-mono font-black mt-1 text-center tracking-wider text-black">
                  {displayId}
                </span>
              </div>
            </div>
          </>
        )}

      </div>
    );
  }

  // ========================================================
  // 2. MODO VERTICAL ORIGINAL (62 mm x 100 mm)
  // ========================================================
  return (
    <div className="brother-thermal-badge w-[62mm] h-[100mm] max-w-[62mm] max-h-[100mm] bg-white text-black p-[3.5mm] flex flex-col items-center justify-between border-2 border-black/30 print:border-0 rounded-md print:rounded-none shrink-0 m-2 print:m-0 overflow-hidden box-border font-sans select-none shadow-md print:shadow-none">
      
      {/* 1. Cabecera del Evento */}
      <div className="w-full text-center pt-0.5">
        <h3 className="text-[12px] font-black tracking-[0.24em] uppercase text-black leading-none">
          EXPO FERRE 2026
        </h3>
      </div>

      {/* 2. Franja de Rol Distintiva */}
      <div className={`w-full text-center font-black py-2 px-1 tracking-[0.16em] uppercase my-1.5 rounded-xs ${
        isVip ? 'bg-black text-white border-2 border-black text-[13.5px]' : 'bg-slate-900 text-white text-[12.5px]'
      }`}>
        {displayRole}
      </div>

      {/* 3. Área Central (Nombre, Cargo y Empresa) */}
      <div className={`w-full flex-1 flex flex-col justify-center items-center px-1 text-center ${showQr ? 'my-1 gap-1' : 'my-auto gap-2'}`}>
        
        {/* Nombre del Asistente */}
        <div className="w-full">
          <h2 className={`${showQr ? 'text-[17px]' : 'text-[22px]'} font-black uppercase text-black leading-tight line-clamp-3 break-words`}>
            {fullName}
          </h2>
          {/* Cargo ubicado justo debajo del nombre */}
          {position && position.toUpperCase() !== displayRole && (
            <p className={`${showQr ? 'text-[10px]' : 'text-[12px]'} font-bold text-black/90 uppercase tracking-tight line-clamp-2 mt-1`}>
              {position}
            </p>
          )}
        </div>

        {/* Nombre de la Empresa / Patrocinador */}
        {company && company.toLowerCase() !== 'particular' && company.toLowerCase() !== 'n/a' && (
          <div className={`w-full bg-slate-100 border-y-2 border-black/80 ${showQr ? 'py-1.5 text-[15px]' : 'py-2.5 text-[17px]'} px-1 text-center rounded-xs mt-1`}>
            <p className="font-black uppercase tracking-tight text-black leading-tight line-clamp-3 break-words">
              {company}
            </p>
          </div>
        )}

      </div>

      {/* 4. Si showQr es true: Código QR */}
      {showQr ? (
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="bg-white p-1 border border-black/30 rounded-xs flex items-center justify-center">
            <QRCodeSVG 
              value={qrValue} 
              size={120} 
              level="M" 
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <span className="text-[10px] font-mono font-black mt-1 leading-none text-center tracking-wider text-black">
            {displayId}
          </span>
        </div>
      ) : (
        /* Si showQr es false: Código de Respaldo discreto */
        <div className="w-full text-center py-1 mt-auto">
          <span className="text-[9px] font-mono font-bold text-black/75 tracking-wider uppercase">
            ID: {displayId}
          </span>
        </div>
      )}

      {/* 5. Pie de Gafete Oficial */}
      <div className="w-full border-t border-black/30 pt-1.5 text-center mt-auto pb-0.5">
        <p className="text-[8.5px] font-black text-black/90 uppercase tracking-widest leading-none">
          17 OCTUBRE 2026 • HOTEL CROWNE PLAZA
        </p>
      </div>

    </div>
  );
}
