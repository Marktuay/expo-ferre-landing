import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
export default function AdminMarketingReport({ onBack }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [sourceStats, setSourceStats] = useState({});

  const basePath = getEventBasePath();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const leads = [];
      const stats = {};

      try {
        const preregSnap = await getDocs(query(collection(db, `${basePath}/preregistrations`)));
        preregSnap.forEach(doc => {
          const d = doc.data();
          const source = d.utm_source || 'Orgánico';
          const medium = d.utm_medium || '-';
          const campaign = d.utm_campaign || '-';

          leads.push({
            id: doc.id,
            name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Sin Nombre',
            email: d.email || 'N/A',
            phone: d.phone || '-',
            source,
            medium,
            campaign,
            createdAt: d.createdAt ? d.createdAt.toDate() : new Date()
          });

          // Contar por fuente
          if (stats[source]) {
            stats[source]++;
          } else {
            stats[source] = 1;
          }
        });

        // Ordenar por fecha de creación (más recientes primero)
        leads.sort((a, b) => b.createdAt - a.createdAt);

        setData(leads);
        setSourceStats(stats);
      } catch (err) {
        console.error('Error fetching marketing data:', err);
        alert('Hubo un error al cargar el reporte de marketing.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [basePath]);

  const exportToExcel = () => {
    const exportData = data.map(item => ({
      Nombre: item.name,
      Email: item.email,
      Teléfono: item.phone,
      Origen: item.source,
      Medio: item.medium,
      Campaña: item.campaign,
      'Fecha Registro': item.createdAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })
    }));
    import('xlsx').then(XLSX => {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Marketing_Leads");
      XLSX.writeFile(workbook, "Reporte_Marketing_ExpoFerre.xlsx");
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0066CC] text-3xl">campaign</span>
              Reporte de Marketing (Leads)
            </h1>
            <p className="text-body-lg text-secondary">
              Monitorea el origen de tus registros y el rendimiento de tus campañas.
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={exportToExcel}
              className="px-5 py-2 bg-[#217346] text-white rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined">download</span>
              Exportar CSV
            </button>
            <button 
              onClick={onBack} 
              className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Volver
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Tarjetas de Resumen (Stats) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant">
                <h3 className="text-label-lg text-secondary mb-2">Total de Leads</h3>
                <p className="text-display-sm font-bold text-primary">{data.length}</p>
              </div>
              
              {/* Tarjetas Dinámicas por Origen */}
              {Object.entries(sourceStats)
                .sort((a, b) => b[1] - a[1]) // Ordenar de mayor a menor
                .map(([source, count]) => (
                <div key={source} className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant">
                  <h3 className="text-label-lg text-secondary mb-2 truncate" title={source}>
                    Origen: {source}
                  </h3>
                  <p className="text-display-sm font-bold text-on-surface">{count}</p>
                </div>
              ))}
            </div>

            {/* Tabla Detallada */}
            <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-variant border-b border-outline-variant">
                      <th className="p-4 font-label-lg text-on-surface">Nombre</th>
                      <th className="p-4 font-label-lg text-on-surface">Email</th>
                      <th className="p-4 font-label-lg text-on-surface">Teléfono</th>
                      <th className="p-4 font-label-lg text-on-surface">Origen (Source)</th>
                      <th className="p-4 font-label-lg text-on-surface">Medio (Medium)</th>
                      <th className="p-4 font-label-lg text-on-surface">Campaña</th>
                      <th className="p-4 font-label-lg text-on-surface">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-secondary">
                          No hay leads registrados todavía.
                        </td>
                      </tr>
                    ) : (
                      data.map((item) => (
                        <tr key={item.id} className="border-b border-outline-variant hover:bg-[#F5F5F7]/50 transition-colors">
                          <td className="p-4 font-body-md text-on-surface">{item.name}</td>
                          <td className="p-4 font-body-md text-secondary">{item.email}</td>
                          <td className="p-4 font-body-md text-secondary">{item.phone}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.source.toLowerCase().includes('instagram') ? 'bg-pink-100 text-pink-800' :
                              item.source.toLowerCase().includes('facebook') ? 'bg-blue-100 text-blue-800' :
                              item.source.toLowerCase().includes('linkedin') ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.source}
                            </span>
                          </td>
                          <td className="p-4 font-body-md text-secondary">{item.medium}</td>
                          <td className="p-4 font-body-md text-secondary">{item.campaign}</td>
                          <td className="p-4 font-body-md text-secondary">
                            {item.createdAt.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
