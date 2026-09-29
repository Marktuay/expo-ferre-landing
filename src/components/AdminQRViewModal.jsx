import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminQRViewModal({ isOpen, onClose, person, roleLabel = 'Participante', onPrintBadge }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !person) return null;

  const id = person.registeredAttendeeId || person.id || '';
  const name = person.name || person.nombre || person.registeredName || 'Sin Nombre';
  const company = person.company || person.empresa || person.registeredCompany || 'Particular';
  const email = person.email || person.correo || person.registeredEmail || '';
  const phone = person.phone || person.telefono || person.registeredPhone || '';
  const sponsor = person.sponsorName || person.patrocinador || '';

  const handleCopyId = () => {
    navigator.clipboard.writeText(id);
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
        const safeName = (name || id).replace(/[^a-zA-Z0-9]/g, '_');
        downloadLink.download = `QR_Acceso_${safeName}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      // Fallback a servicio externo si el navegador bloquea canvas
      const qrFallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(id)}&margin=15`;
      window.open(qrFallbackUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-slate-100">
        
        {/* Header con estilo ExpoFerre */}
        <div className="bg-gradient-to-r from-[#0d47a1] to-[#1565c0] p-5 text-white relative flex-shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-2xl">qr_code_2</span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Código QR de Acceso Oficial</h2>
              <p className="text-white/80 text-xs mt-0.5">EXPO FERRE Nicaragua 2026</p>
            </div>
          </div>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 overflow-y-auto space-y-5 text-center">
          
          {/* Tarjeta de Información del Asistente */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-block px-2.5 py-0.5 bg-[#f39200]/10 text-[#f39200] font-bold text-xs rounded-full uppercase tracking-wider">
                {roleLabel}
              </span>
              {person.status && (
                <span className={`text-[11px] font-bold uppercase ${
                  person.status === 'approved' || person.status === 'used' ? 'text-green-600' : 'text-slate-500'
                }`}>
                  ● {person.status === 'approved' ? 'Aprobado' : person.status === 'used' ? 'Registrado' : person.status}
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
                ⭐ Patrocinador: {sponsor}
              </div>
            )}
          </div>

          {/* Renderizado del Código QR */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100">
              <QRCodeSVG 
                id="qr-modal-svg"
                value={id} 
                size={210} 
                level="M" 
                includeMargin={true}
              />
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 break-all max-w-[260px] truncate">
                ID: {id}
              </span>
              <button
                onClick={handleCopyId}
                className="text-primary hover:bg-primary/10 p-1 rounded-md transition-colors text-xs flex items-center gap-1 font-semibold"
                title="Copiar ID"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied && <span className="text-[10px] text-green-600">¡Copiado!</span>}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Código QR compatible con el lector de Check-in en puerta.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={handleDownloadPNG}
              className="px-4 py-2.5 bg-[#0d47a1] text-white rounded-xl hover:bg-[#1565c0] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Descargar QR (PNG)
            </button>

            {onPrintBadge ? (
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
