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

  // --- KPI & Heatmap Calculations ---
  const totalRegistered = data.length;
  const totalCheckedIn = data.filter(d => d.checkedIn).length;
  const noShowRate = totalRegistered > 0 ? (((totalRegistered - totalCheckedIn) / totalRegistered) * 100).toFixed(1) : 0;

  const checkInHours = new Array(24).fill(0);
  data.forEach(d => {
    if (d.checkedIn && d.checkInTime) {
      checkInHours[d.checkInTime.getHours()]++;
    }
  });

  let startHour = 24;
  let endHour = 0;
  checkInHours.forEach((count, i) => {
    if (count > 0) {
      if (i < startHour) startHour = i;
      if (i > endHour) endHour = i;
    }
  });
  if (startHour > endHour) { startHour = 8; endHour = 18; }

  const activeHours = [];
  const maxCount = Math.max(...checkInHours, 1);

  for (let i = startHour; i <= endHour; i++) {
    activeHours.push({
      hourStr: `${i.toString().padStart(2, '0')}:00`,
      count: checkInHours[i],
      heightPct: (checkInHours[i] / maxCount) * 100
    });
  }

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

        {/* Dashboard KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Funnel Card */}
          <div className="bg-white rounded-lg shadow-sm border border-outline-variant p-6 flex flex-col justify-center">
            <h3 className="text-secondary font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined">filter_alt</span> Embudo de Asistencia</h3>
            <div className="flex justify-between items-center mb-4">
              <div className="text-center">
                <p className="text-4xl font-black text-[#283474]">{totalRegistered}</p>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Registros Totales</p>
              </div>
              <span className="material-symbols-outlined text-gray-300 text-4xl">arrow_right_alt</span>
              <div className="text-center">
                <p className="text-4xl font-black text-green-600">{totalCheckedIn}</p>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Asistencia Real</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-md p-3 flex justify-between items-center">
              <span className="text-red-800 font-medium text-sm">Tasa de Abandono (No-Show):</span>
              <span className="text-red-600 font-bold text-lg">{noShowRate}%</span>
            </div>
          </div>

          {/* Heatmap Card */}
          <div className="bg-white rounded-lg shadow-sm border border-outline-variant p-6 lg:col-span-2">
            <h3 className="text-secondary font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined">bar_chart</span> Picos de Tráfico (Check-ins por Hora)</h3>
            <div className="flex items-end gap-2 h-32 mt-4 px-2 overflow-x-auto pb-2">
              {activeHours.map((hr, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 min-w-[40px] group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                    {hr.count} accesos
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full bg-[#f39200] rounded-t-sm transition-all duration-500 hover:bg-[#d68000]"
                    style={{ height: `${Math.max(hr.heightPct, 2)}%` }} // At least 2% to show a tiny bar
                  ></div>
                  {/* Label */}
                  <span className="text-[10px] text-gray-500 mt-2">{hr.hourStr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-outline-variant overflow-hidden flex flex-col h-[calc(100vh-450px)] min-h-[500px]">
          
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
