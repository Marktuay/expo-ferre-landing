import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// A generic badge template
export default function BadgeTemplate({ data, roleLabel, colorClass }) {
  // data should contain: id, name (or nombre/apellido), company (or empresa), position (or cargo)
  const fullName = data.name || `${data.nombre || ''} ${data.apellido || ''}`.trim();
  const company = data.company || data.empresa || '';
  const position = data.position || data.cargo || '';
  const id = data.id || 'N/A';

  // Extract color name from colorClass (e.g., 'border-blue-500' -> 'bg-blue-500')
  const bgClass = colorClass ? colorClass.replace('border-', 'bg-').replace('text-', 'bg-') : 'bg-primary';

  return (
    <div className={`w-[3in] h-[4.5in] flex flex-col border-2 ${colorClass || 'border-primary'} rounded-xl overflow-hidden bg-white shadow-sm relative shrink-0 m-4 print:m-1 print:break-inside-avoid print:shadow-none`}>
      {/* Header */}
      <div className="bg-surface-variant p-4 flex justify-center items-center border-b border-outline-variant h-24">
        <div className="text-xl font-bold text-primary tracking-tight text-center leading-tight">
          EXPO<br/>FERRE 2026
        </div>
      </div>

      {/* Role Banner */}
      <div className={`py-2 text-center font-bold text-white uppercase tracking-widest text-sm ${bgClass}`}>
        {roleLabel}
      </div>

      {/* User Info */}
      <div className="flex-1 flex flex-col items-center justify-start p-6 text-center">
        <h2 className="text-2xl font-bold text-on-surface leading-tight mb-2 uppercase break-words w-full line-clamp-2">
          {fullName}
        </h2>
        
        {company && (
          <div className="text-lg font-semibold text-secondary mb-1 line-clamp-1 w-full">
            {company}
          </div>
        )}
        
        {position && (
          <div className="text-sm text-on-surface-variant line-clamp-1 w-full">
            {position}
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center justify-center p-4 pt-0 mb-2">
        <div className="bg-white p-2 rounded-lg shadow-sm border border-outline-variant">
          <QRCodeSVG value={id} size={110} level="M" />
        </div>
        <span className="text-[10px] text-outline mt-2 font-mono">{id}</span>
      </div>

      {/* Footer Pattern */}
      <div className={`h-4 w-full ${bgClass}`}></div>
    </div>
  );
}
