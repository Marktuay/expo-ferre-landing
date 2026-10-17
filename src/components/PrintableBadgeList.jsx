import React, { useEffect, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import BadgeTemplate from './BadgeTemplate';

export default function PrintableBadgeList({ items = [], roleLabel = 'Staff', colorClass, onClose, onPrinted }) {
  const [includeQr, setIncludeQr] = useState(false);
  const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' (100x62mm) | 'vertical' (62x100mm)
  
  // Detonador de impresión y registro de Check-In automático al montar
  useEffect(() => {
    // 1. Marcar check-in en Firestore para todos los asistentes cuyo gafete se imprime
    const markCheckedIn = async () => {
      if (!items || items.length === 0) return;
      const basePath = getEventBasePath();

      for (const item of items) {
        try {
          const itemId = item.id || item.registeredAttendeeId;
          if (!itemId) continue;

          const updatePayload = {
            checkedIn: true,
            checkInTime: serverTimestamp(),
            badgePrinted: true,
            badgePrintedAt: serverTimestamp(),
            attended: true,
            attendedAt: serverTimestamp()
          };

          // A) Si el item tiene colección explícita
          if (item.collection) {
            const colPath = item.collection.includes('/') 
              ? item.collection 
              : (item.collection === 'users' ? 'users' : `${basePath}/${item.collection}`);
            try {
              await updateDoc(doc(db, colPath, itemId), updatePayload);
            } catch (colErr) {
              console.warn(`Error al actualizar colección ${colPath}:`, colErr);
            }
          } else {
            // B) Detección por rol y propiedades del item
            const role = (item.roleLabel || roleLabel || '').toUpperCase();
            
            if (role.includes('STAFF')) {
              await updateDoc(doc(db, `${basePath}/staff`, itemId), updatePayload);
            } else if (role.includes('CONFERENCISTA') || role.includes('SPEAKER')) {
              await updateDoc(doc(db, `${basePath}/speakers`, itemId), updatePayload);
            } else if (role.includes('PATROCINADOR') || role.includes('SPONSOR')) {
              await updateDoc(doc(db, 'users', itemId), updatePayload);
            } else if (role.includes('VIP') || item.isDirectInvite || item.type === 'direct_invite') {
              // Intentar en directInvites primero
              let updatedInDirect = false;
              try {
                await updateDoc(doc(db, `${basePath}/directInvites`, itemId), {
                  ...updatePayload,
                  status: 'used'
                });
                updatedInDirect = true;
              } catch (_) {}

              if (item.registeredAttendeeId) {
                try {
                  await updateDoc(doc(db, `${basePath}/preregistrations`, item.registeredAttendeeId), updatePayload);
                } catch (_) {}
              }

              if (!updatedInDirect) {
                try {
                  await updateDoc(doc(db, `${basePath}/guests`, itemId), updatePayload);
                } catch (_) {
                  await updateDoc(doc(db, `${basePath}/preregistrations`, itemId), updatePayload);
                }
              }
            } else {
              // Asistente General
              await updateDoc(doc(db, `${basePath}/preregistrations`, itemId), updatePayload);
            }
          }
        } catch (err) {
          console.warn("Auto check-in al imprimir gafete:", err);
        }
      }

      if (onPrinted) {
        onPrinted(items);
      }
    };

    markCheckedIn();

    // 2. Detonar el cuadro de diálogo del navegador
    const timer = setTimeout(() => {
      window.print();
    }, 400);

    // 3. Al terminar la impresión (o cancelarla en el teléfono), cerrar el modal automáticamente
    // para volver de inmediato a la cámara y poder escanear al siguiente asistente en fila
    const handleAfterPrint = () => {
      if (onClose) {
        onClose();
      }
    };
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [items, roleLabel, onPrinted, onClose]);

  const isHorizontal = orientation === 'horizontal';

  return (
    <div className="print-thermal-modal-wrapper fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      {/* Barra superior de control (oculta en impresión) */}
      <div className="print-thermal-toolbar sticky top-0 bg-white border-b border-slate-200 shadow-sm p-4 px-6 flex flex-wrap justify-between items-center z-[101] print:hidden gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0d47a1] text-2xl">print</span>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Impresión Térmica Brother QL-810Wc
            </h2>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Rollo <strong>DK-2205 Continuo (62 mm)</strong> • Formato: <strong>{isHorizontal ? 'Horizontal (100 mm × 62 mm)' : 'Vertical (62 mm × 100 mm)'}</strong> • {items.length} gafete(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Orientación: Horizontal vs Vertical */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isHorizontal
                  ? 'bg-[#0d47a1] text-white shadow-xs'
                  : 'text-slate-700 hover:text-black'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">crop_landscape</span>
              Horizontal (100×62 mm)
            </button>
            <button
              type="button"
              onClick={() => setOrientation('vertical')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                !isHorizontal
                  ? 'bg-[#0d47a1] text-white shadow-xs'
                  : 'text-slate-700 hover:text-black'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">crop_portrait</span>
              Vertical (62×100 mm)
            </button>
          </div>

          {/* Toggle de Código QR */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300 transition-colors select-none text-xs font-bold text-slate-800">
            <input 
              type="checkbox"
              checked={includeQr}
              onChange={(e) => setIncludeQr(e.target.checked)}
              className="w-4 h-4 text-[#0d47a1] rounded cursor-pointer accent-[#0d47a1]"
            />
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-600">qr_code_2</span>
              {includeQr ? 'Con Código QR' : 'Sin QR (Texto Grande)'}
            </span>
          </label>

          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar / Volver
          </button>
          <button 
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-[#0d47a1] hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-900/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Imprimir Ahora
          </button>
        </div>
      </div>

      {/* Área de Visualización y Contenedor de Impresión */}
      <div className="max-w-5xl mx-auto py-8 print:p-0 print:m-0 flex flex-wrap justify-center print:justify-start gap-4 print:gap-0 print-thermal-container">
        {items.map((item, index) => (
          <BadgeTemplate 
            key={item.id || index} 
            data={item} 
            roleLabel={item.roleLabel || roleLabel} 
            colorClass={item.colorClass || colorClass} 
            showQr={includeQr}
            orientation={orientation}
          />
        ))}
      </div>

      {/* Reglas CSS para la impresora térmica Brother QL-810Wc */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: ${isHorizontal ? '100mm 62mm landscape' : '62mm 100mm portrait'} !important;
          margin: 0mm !important;
        }

        @media print {
          html, body {
            width: ${isHorizontal ? '100mm' : '62mm'} !important;
            height: ${isHorizontal ? '62mm' : '100mm'} !important;
            min-height: ${isHorizontal ? '62mm' : '100mm'} !important;
            max-height: ${isHorizontal ? '62mm' : '100mm'} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-thermal-modal-wrapper,
          .print-thermal-modal-wrapper * {
            visibility: visible !important;
          }

          .print-thermal-toolbar {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-thermal-modal-wrapper {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: ${isHorizontal ? '100mm' : '62mm'} !important;
            height: ${isHorizontal ? '62mm' : '100mm'} !important;
            max-height: ${isHorizontal ? '62mm' : '100mm'} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
            z-index: 999999 !important;
          }

          .print-thermal-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: ${isHorizontal ? '100mm' : '62mm'} !important;
            height: ${isHorizontal ? '62mm' : '100mm'} !important;
            max-height: ${isHorizontal ? '62mm' : '100mm'} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
            display: block !important;
          }

          .brother-thermal-badge {
            width: ${isHorizontal ? '100mm' : '62mm'} !important;
            height: ${isHorizontal ? '62mm' : '100mm'} !important;
            min-height: ${isHorizontal ? '62mm' : '100mm'} !important;
            max-height: ${isHorizontal ? '62mm' : '100mm'} !important;
            max-width: ${isHorizontal ? '100mm' : '62mm'} !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: ${isHorizontal ? '2mm 3.5mm' : '2.5mm 3mm'} !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
