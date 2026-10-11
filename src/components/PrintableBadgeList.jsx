import React, { useEffect } from 'react';
import BadgeTemplate from './BadgeTemplate';

export default function PrintableBadgeList({ items, roleLabel = 'Staff', colorClass, onClose }) {
  
  // Detonador de impresión al montar
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      {/* Barra superior de control (oculta en impresión) */}
      <div className="sticky top-0 bg-white border-b border-slate-200 shadow-sm p-4 px-6 flex flex-wrap justify-between items-center z-[101] print:hidden gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0d47a1] text-2xl">print</span>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Impresión Térmica Brother QL-810Wc
            </h2>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Rollo <strong>DK-2205 Continuo (62 mm × 40 mm)</strong> • {items.length} etiqueta(s) lista(s) para corte automático.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
      <div className="max-w-4xl mx-auto py-8 print:p-0 print:m-0 flex flex-wrap justify-center print:justify-start gap-4 print:gap-0 print-thermal-container">
        {items.map((item, index) => (
          <BadgeTemplate 
            key={item.id || index} 
            data={item} 
            roleLabel={item.roleLabel || roleLabel} 
            colorClass={item.colorClass || colorClass} 
          />
        ))}
      </div>

      {/* Reglas CSS para la impresora térmica Brother QL-810Wc */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: 62mm 40mm;
          margin: 0mm;
        }

        @media print {
          html, body {
            width: 62mm !important;
            height: 40mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-thermal-container, .print-thermal-container * {
            visibility: visible !important;
          }

          .print-thermal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 62mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .brother-thermal-badge {
            width: 62mm !important;
            height: 40mm !important;
            max-width: 62mm !important;
            max-height: 40mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 2mm 2.5mm !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}

