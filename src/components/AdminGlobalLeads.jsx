import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import * as XLSX from 'xlsx';

export default function AdminGlobalLeads({ onBack }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalLeads = async () => {
      try {
        const usersRef = collection(db, 'users');
        const qSponsors = query(usersRef, where('role', '==', 'sponsor'));
        const sponsorsSnap = await getDocs(qSponsors);

        const allLeads = [];
        
        for (const sponsorDoc of sponsorsSnap.docs) {
          const sponsorId = sponsorDoc.id;
          const sponsorData = sponsorDoc.data();
          const sponsorName = sponsorData.empresa || sponsorData.nombre || 'Desconocido';

          const leadsRef = collection(db, `${getEventBasePath()}/sponsors/${sponsorId}/leads`);
          // We can't orderBy timestamp efficiently without an index if we did collectionGroup, but here it's fine per collection, 
          // or we just fetch all and sort in memory.
          const qLeads = query(leadsRef);
          const leadsSnap = await getDocs(qLeads);

          leadsSnap.forEach((leadDoc) => {
            const data = leadDoc.data();
            allLeads.push({
              id: leadDoc.id,
              sponsorName: sponsorName,
              sponsorId: sponsorId,
              ...data,
              scannedAt: data.timestamp?.toDate() || new Date()
            });
          });
        }

        // Sort all leads globally by scan time descending
        allLeads.sort((a, b) => b.scannedAt - a.scannedAt);
        setLeads(allLeads);
      } catch (error) {
        console.error("Error fetching global leads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalLeads();
  }, []);

  const exportToExcel = () => {
    const dataToExport = leads.map(l => ({
      Fecha: l.scannedAt.toLocaleDateString() + ' ' + l.scannedAt.toLocaleTimeString(),
      Patrocinador: l.sponsorName,
      Nombre: `${l.nombre || ''} ${l.apellido || ''}`.trim(),
      Email: l.email || '',
      Teléfono: l.telefono || '',
      Empresa: l.empresa || '',
      Cargo: l.cargo || '',
      Notas: l.notes || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads Globales");
    XLSX.writeFile(workbook, "LeadsGlobales.xlsx");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Reporte Global de Leads</h1>
            <p className="text-body-lg text-secondary">Visualiza todos los leads capturados por los patrocinadores.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={exportToExcel} disabled={leads.length === 0} className="px-5 py-2 bg-[#217346] text-white border border-[#217346] rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 disabled:opacity-50">
              <span className="material-symbols-outlined">download</span>
              Exportar Excel
            </button>
            <button onClick={onBack} className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Volver
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-outline-variant overflow-hidden">
            <div className="p-4 bg-surface-variant/20 border-b border-outline-variant flex justify-between items-center">
              <h2 className="font-bold text-on-surface">Total de Leads Capturados: {leads.length}</h2>
            </div>
            {leads.length === 0 ? (
              <div className="p-12 text-center text-secondary">
                <span className="material-symbols-outlined text-5xl mb-4 opacity-50">assignment_ind</span>
                <p>Aún no se han capturado leads.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-variant/30 border-b border-outline-variant">
                      <th className="p-4 font-bold text-on-surface">Fecha/Hora</th>
                      <th className="p-4 font-bold text-on-surface">Patrocinador</th>
                      <th className="p-4 font-bold text-on-surface">Lead</th>
                      <th className="p-4 font-bold text-on-surface">Email</th>
                      <th className="p-4 font-bold text-on-surface">Teléfono</th>
                      <th className="p-4 font-bold text-on-surface">Empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                        <td className="p-4 text-secondary whitespace-nowrap">
                          {lead.scannedAt.toLocaleDateString()} {lead.scannedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-bold">
                            {lead.sponsorName}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-on-surface">{lead.nombre} {lead.apellido}</div>
                          <div className="text-sm text-secondary">{lead.cargo}</div>
                        </td>
                        <td className="p-4 text-secondary">{lead.email}</td>
                        <td className="p-4 text-secondary">{lead.telefono}</td>
                        <td className="p-4 text-secondary">{lead.empresa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
