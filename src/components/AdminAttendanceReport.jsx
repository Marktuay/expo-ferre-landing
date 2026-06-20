import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import * as XLSX from 'xlsx';

export default function AdminAttendanceReport({ onBack }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const basePath = getEventBasePath();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const consolidated = [];

      try {
        // 1. Preregistrations
        const preregSnap = await getDocs(query(collection(db, `${basePath}/preregistrations`)));
        preregSnap.forEach(doc => {
          const d = doc.data();
          consolidated.push({
            id: doc.id,
            name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Sin Nombre',
            category: 'Preregistro (General)',
            contact: d.email || d.phone || 'N/A',
            company: d.company || 'N/A',
            checkedIn: !!d.checkedIn,
            checkInTime: d.checkInTime ? d.checkInTime.toDate() : null
          });
        });

        // 2. Sponsors (Users)
        const usersSnap = await getDocs(query(collection(db, `users`)));
        usersSnap.forEach(doc => {
          const d = doc.data();
          if (d.role === 'sponsor') {
            consolidated.push({
              id: doc.id,
              name: d.empresa || d.nombre || 'Patrocinador',
              category: 'Patrocinador',
              contact: d.correo || d.telefono || 'N/A',
              company: d.empresa || 'N/A',
              checkedIn: !!d.checkedIn,
              checkInTime: d.checkInTime ? d.checkInTime.toDate() : null
            });
          }
        });

        // 3. Staff
        const staffSnap = await getDocs(query(collection(db, `${basePath}/staff`)));
        staffSnap.forEach(doc => {
          const d = doc.data();
          consolidated.push({
            id: doc.id,
            name: d.name || 'Staff',
            category: 'Staff Técnico',
            contact: d.email || d.phone || 'N/A',
            company: d.company || 'ExpoFerre',
            checkedIn: !!d.checkedIn,
            checkInTime: d.checkInTime ? d.checkInTime.toDate() : null
          });
        });

        // 4. Speakers
        const speakersSnap = await getDocs(query(collection(db, `${basePath}/speakers`)));
        speakersSnap.forEach(doc => {
          const d = doc.data();
          consolidated.push({
            id: doc.id,
            name: d.name || 'Conferencista',
            category: 'Conferencista',
            contact: d.email || d.phone || 'N/A',
            company: d.company || 'N/A',
            checkedIn: !!d.checkedIn,
            checkInTime: d.checkInTime ? d.checkInTime.toDate() : null
          });
        });

        // 5. Guests
        const guestsSnap = await getDocs(query(collection(db, `${basePath}/guests`)));
        guestsSnap.forEach(doc => {
          const d = doc.data();
          consolidated.push({
            id: doc.id,
            name: d.name || 'Invitado',
            category: 'Invitado Especial',
            contact: d.email || d.phone || 'N/A',
            company: d.company || 'N/A',
            checkedIn: !!d.checkedIn,
            checkInTime: d.checkInTime ? d.checkInTime.toDate() : null
          });
        });

        // Sort by check-in time (most recent first) and then by name
        consolidated.sort((a, b) => {
          if (a.checkedIn && b.checkedIn) {
            return b.checkInTime - a.checkInTime;
          }
          if (a.checkedIn) return -1;
          if (b.checkedIn) return 1;
          return a.name.localeCompare(b.name);
        });

        setData(consolidated);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [basePath]);

  // Filtered data
  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    
    const matchesStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'CHECKED_IN' && item.checkedIn) || 
                          (statusFilter === 'PENDING' && !item.checkedIn);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const exportToExcel = () => {
    const wsData = filteredData.map(item => ({
      'Nombre': item.name,
      'Empresa': item.company,
      'Categoría': item.category,
      'Contacto': item.contact,
      'Estado': item.checkedIn ? 'Asistió' : 'Pendiente',
      'Hora de Check-in': item.checkInTime ? item.checkInTime.toLocaleString('es-ES') : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, "Reporte_Asistencia_ExpoFerre.xlsx");
  };

  const categories = ['ALL', 'Preregistro (General)', 'Patrocinador', 'Staff Técnico', 'Conferencista', 'Invitado Especial'];

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Reporte de Asistencia</h1>
            <p className="text-body-lg text-secondary">Vista detallada de registros y confirmaciones en puerta.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={exportToExcel}
              className="px-5 py-2 bg-[#16a34a] text-white rounded-md hover:bg-[#15803d] transition-colors font-label-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined">download</span>
              Exportar a Excel
            </button>
            <button onClick={onBack} className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Volver
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-outline-variant overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-[500px]">
          
          {/* Controls Bar */}
          <div className="p-4 border-b border-outline-variant bg-surface-variant/20 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, empresa o contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-outline-variant rounded-md bg-white outline-none focus:border-primary w-full md:w-auto"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'ALL' ? 'Todas las Categorías' : cat}</option>
              ))}
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-outline-variant rounded-md bg-white outline-none focus:border-primary w-full md:w-auto"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="CHECKED_IN">Ya ingresaron (Asistió)</option>
              <option value="PENDING">Pendientes (No asistió)</option>
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-surface-variant/30 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Nombre</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Empresa</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Categoría</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Contacto</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Estado</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Hora Check-in</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-secondary">
                      <span className="material-symbols-outlined animate-spin text-4xl mb-2">refresh</span>
                      <p>Cargando datos...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-secondary">
                      No se encontraron resultados que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={index} className="border-b border-outline-variant hover:bg-surface-variant/20 transition-colors">
                      <td className="p-4 font-medium text-on-surface">{item.name}</td>
                      <td className="p-4 text-secondary">{item.company}</td>
                      <td className="p-4">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-secondary text-sm">{item.contact}</td>
                      <td className="p-4">
                        {item.checkedIn ? (
                          <span className="flex items-center gap-1 text-[#16a34a] font-bold text-sm">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            Asistió
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-secondary font-medium text-sm">
                            <span className="material-symbols-outlined text-[18px]">pending</span>
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-secondary text-sm">
                        {item.checkInTime ? item.checkInTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-outline-variant bg-surface-variant/10 text-sm text-secondary flex justify-between">
            <span>Total de registros listados: <strong className="text-on-surface">{filteredData.length}</strong></span>
            <span>Asistieron: <strong className="text-[#16a34a]">{filteredData.filter(d => d.checkedIn).length}</strong></span>
          </div>

        </div>
      </div>
    </div>
  );
}
