import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminQRViewModal({ isOpen, onClose, person, roleLabel = 'Participante', onPrintBadge }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !person) return null;

  const isPendingInvite = person.isInviteLink || person.status === 'pending';
  
  // Si es invitación pendiente, el QR debe ser la URL de registro. Si ya está registrado, el ID del documento para check-in.
  const qrValue = isPendingInvite 
    ? (person.inviteUrl || `${window.location.origin}/?invite=${encodeURIComponent(person.id)}`)
    : (person.registeredAttendeeId || person.id || '');

  const name = person.name || person.nombre || person.registeredName || 'Invitado Especial';
  const company = person.company || person.empresa || person.registeredCompany || 'Particular';
  const email = person.email || person.correo || person.registeredEmail || '';
  const phone = person.phone || person.telefono || person.registeredPhone || '';
  const sponsor = person.sponsorName || person.patrocinador || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    try {
      const svg = document.getElementById('qr-modal-svg');
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width + 40;
        canvas.height = img.height + 40;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        const prefix = isPendingInvite ? 'QR_Invitacion_' : 'QR_Acceso_';
        const safeName = (name || person.id).replace(/[^a-zA-Z0-9]/g, '_');
        downloadLink.download = `${prefix}${safeName}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      const qrFallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrValue)}&margin=15`;
      window.open(qrFallbackUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-slate-100">
        
        {/* Header con estilo ExpoFerre */}
        <div className={`p-5 text-white relative flex-shrink-0 ${
          isPendingInvite 
            ? 'bg-gradient-to-r from-amber-600 to-amber-700' 
            : 'bg-gradient-to-r from-[#0d47a1] to-[#1565c0]'
        }`}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-300 text-3xl">
              {isPendingInvite ? 'qr_code_scanner' : 'qr_code_2'}
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">
                {isPendingInvite ? 'QR de Invitación Directa' : 'Código QR Oficial de Acceso'}
              </h2>
              <p className="text-white/80 text-xs mt-0.5">
                {isPendingInvite ? 'Escanear para abrir Registro' : 'EXPO FERRE Nicaragua 2026'}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 overflow-y-auto space-y-4 text-center">
          
          {/* Tarjeta de Información */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className={`inline-block px-2.5 py-0.5 font-bold text-xs rounded-full uppercase tracking-wider ${
                isPendingInvite ? 'bg-amber-100 text-amber-800' : 'bg-[#f39200]/10 text-[#f39200]'
              }`}>
                {isPendingInvite ? 'Invitación Pendiente' : roleLabel}
              </span>
              {person.status && (
                <span className={`text-[11px] font-bold uppercase ${
                  person.status === 'approved' || person.status === 'used' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  ● {person.status === 'approved' ? 'Aprobado' : person.status === 'used' ? 'Registrado' : 'Disponible'}
                </span>
              )}
            </div>
            
            <h3 className="text-base font-bold text-slate-900 leading-tight pt-1">
              {name}
            </h3>
            
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-slate-400">business</span>
              {company}
            </p>

            {(email || phone) && (
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 mt-2 flex flex-wrap gap-x-3">
                {email && <span>✉️ {email}</span>}
                {phone && <span>📞 {phone}</span>}
              </div>
            )}

            {sponsor && (
              <div className="text-[11px] text-amber-700 bg-amber-50/80 p-1.5 rounded-lg font-semibold mt-1">
                ⭐ Patrocinador: {sponsor} {person.sponsorStands ? `(Stand ${person.sponsorStands})` : ''}
              </div>
            )}
          </div>

          {/* Renderizado del Código QR */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100">
              <QRCodeSVG 
                id="qr-modal-svg"
                value={qrValue} 
                size={210} 
                level="M" 
                includeMargin={true}
              />
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 max-w-full">
              <span className="font-mono text-[10.5px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 truncate max-w-[240px]" title={qrValue}>
                {isPendingInvite ? qrValue : `ID: ${qrValue}`}
              </span>
              <button
                onClick={handleCopy}
                className="text-primary hover:bg-primary/10 p-1 rounded-md transition-colors text-xs flex items-center gap-1 font-semibold shrink-0 cursor-pointer"
                title={isPendingInvite ? "Copiar Enlace" : "Copiar ID"}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied && <span className="text-[10px] text-green-600">¡Copiado!</span>}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              {isPendingInvite 
                ? '📱 Escanea con la cámara del celular para abrir el formulario de registro de este invitado.' 
                : '✅ Código QR oficial compatible con el escáner de Check-in en puerta.'}
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleDownloadPNG}
              className="px-4 py-2.5 bg-[#0d47a1] hover:bg-[#1565c0] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Descargar QR (PNG)
            </button>

            {isPendingInvite ? (
              <a
                href={qrValue}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Abrir Registro
              </a>
            ) : onPrintBadge ? (
              <button
                onClick={() => {
                  onClose();
                  onPrintBadge(person);
                }}
                className="px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Imprimir Gafete
              </button>
            ) : (
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Imprimir Pantalla
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
