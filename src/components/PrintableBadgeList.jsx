import React, { useEffect } from 'react';
import BadgeTemplate from './BadgeTemplate';

export default function PrintableBadgeList({ items, roleLabel, colorClass, onClose }) {
  
  // Auto-trigger print when component mounts (optional, but good UX)
  useEffect(() => {
    // A small delay to ensure images/QR are rendered
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-gray-200 overflow-y-auto">
      {/* Screen-only header */}
      <div className="sticky top-0 bg-white shadow-md p-4 flex justify-between items-center z-[101] print:hidden">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Vista Previa de Impresión</h2>
          <p className="text-secondary text-sm">Se imprimirán {items.length} gafetes.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant rounded-md text-secondary hover:bg-surface-variant transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary text-on-primary rounded-md shadow-sm hover:bg-primary/90 transition-colors"
          >
            Imprimir Ahora
          </button>
        </div>
      </div>

      {/* Printable Area - Centered for screen, normal for print */}
      <div className="max-w-5xl mx-auto py-8 print:p-0 print:m-0 flex flex-wrap justify-center print:justify-start">
        {items.map((item, index) => (
          <BadgeTemplate 
            key={item.id || index} 
            data={item} 
            roleLabel={item.roleLabel || roleLabel} 
            colorClass={item.colorClass || colorClass} 
          />
        ))}
      </div>

      {/* Global CSS for print */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0.z-\\[100\\] {
            position: absolute !important;
            left: 0;
            top: 0;
            background: white !important;
            overflow: visible !important;
          }
          .fixed.inset-0.z-\\[100\\], .fixed.inset-0.z-\\[100\\] * {
            visibility: visible;
          }
          /* Hide the header in print */
          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
