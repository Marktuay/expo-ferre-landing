import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getDocs, where, doc, deleteDoc } from 'firebase/firestore';
import { QrCode, Printer, Trash2, Search, Download, ArrowLeft, Users } from 'lucide-react';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import PrintableBadgeList from './PrintableBadgeList';
import AdminQRViewModal from './AdminQRViewModal';
import { formatPrintTime, formatPrintDateTimeFull } from '../utils/formatPrintTime';

export default function AdminStaff({ onBack }) {
  const [staffList, setStaffList] = useState([]);
  const [sponsorsMap, setSponsorsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [printItems, setPrintItems] = useState(null);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [sponsorFilter, setSponsorFilter] = useState('all');

  // Modal de Código QR
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedPersonForQR, setSelectedPersonForQR] = useState(null);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const qSponsors = query(collection(db, 'users'), where('role', '==', 'sponsor'));
        const snap = await getDocs(qSponsors);
        const map = {};
        snap.forEach(d => {
          map[d.id] = d.data().empresa || d.data().nombre || 'Patrocinador Desconocido';
        });
        setSponsorsMap(map);
      } catch (err) {
        console.error("Error fetching sponsors", err);
      }
    };
    fetchSponsors();

    const q = query(collection(db, `${getEventBasePath()}/staff`));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((d) => {
        results.push({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date()
        });
      });
      results.sort((a, b) => b.createdAt - a.createdAt);

      setStaffList(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching staff:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const fullName = `${s.nombre || ''} ${s.apellido || ''}`.toLowerCase();
      const sponsorName = (sponsorsMap[s.sponsorId] || s.sponsorName || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const company = (s.empresa || '').toLowerCase();
      const phone = (s.telefono || '').toLowerCase();
      const q = searchTerm.trim().toLowerCase();

      const matchesSearch = !q ||
        fullName.includes(q) ||
        sponsorName.includes(q) ||
        email.includes(q) ||
        company.includes(q) ||
        phone.includes(q);

      const matchesSponsor = sponsorFilter === 'all' || s.sponsorId === sponsorFilter;
      return matchesSearch && matchesSponsor;
    });
  }, [staffList, sponsorsMap, searchTerm, sponsorFilter]);

  const uniqueSponsorsInStaff = useMemo(() => {
    const ids = new Set();
    staffList.forEach(s => {
      if (s.sponsorId) ids.add(s.sponsorId);
    });
    return Array.from(ids).map(id => ({
      id,
      name: sponsorsMap[id] || staffList.find(s => s.sponsorId === id)?.sponsorName || 'No asignado'
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [staffList, sponsorsMap]);

  const handleDeleteStaff = async (staff) => {
    const fullName = `${staff.nombre || ''} ${staff.apellido || ''}`.trim() || 'este registro';
    if (!window.confirm(`¿Estás seguro de eliminar la acreditación de staff de "${fullName}"?`)) return;
    try {
      await deleteDoc(doc(db, `${getEventBasePath()}/staff`, staff.id));
    } catch (err) {
      console.error('Error al eliminar staff:', err);
      alert('No se pudo eliminar el registro: ' + err.message);
    }
  };

  const mapStaffForPrint = (s) => ({
    ...s,
    nombre: `${s.nombre || ''} ${s.apellido || ''}`.trim() || s.name || 'Staff',
    empresa: s.empresa || sponsorsMap[s.sponsorId] || s.sponsorName || '',
    cargo: s.cargo || 'Staff',
    roleLabel: 'STAFF',
    isVip: false,
    isDirectInvite: false,
    collection: 'staff'
  });

  if (printItems) {
    return (
      <PrintableBadgeList
        items={printItems}
        roleLabel="STAFF"
        colorClass="border-green-600 text-green-600"
        onClose={() => setPrintItems(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-headline-md font-bold text-on-surface">Acreditación Staff</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary flex items-center gap-1">
                <Users size={13} />
                {filteredStaff.length} {filteredStaff.length === 1 ? 'acreditado' : 'acreditados'}
              </span>
            </div>
            <p className="text-body-lg text-secondary">Registro de personal staff y acreditaciones.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                import('xlsx').then(XLSX => {
                  const dataToExport = filteredStaff.map(s => ({
                    Fecha: s.createdAt.toLocaleDateString() + ' ' + s.createdAt.toLocaleTimeString(),
                    Patrocinador: sponsorsMap[s.sponsorId] || s.sponsorName || 'No asignado',
                    Nombre: `${s.nombre || ''} ${s.apellido || ''}`.trim(),
                    Asistencia: (s.checkedIn || s.attended || s.badgePrinted) ? 'ASISTIÓ (IMPRESO)' : 'No asistió',
                    'Hora de Impresión': formatPrintDateTimeFull(s) || 'No impreso',
                    Email: s.email || '',
                    Teléfono: s.telefono || '',
                    Empresa: s.empresa || '',
                    Cargo: s.cargo || '',
                    Sector: s.sector || '',
                    País: s.pais || ''
                  }));
                  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
                  XLSX.writeFile(workbook, "AcreditacionStaff.xlsx");
                });
              }}
              className="px-4 py-2 bg-[#217346] text-white border border-[#217346] rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 cursor-pointer text-sm"
            >
              <Download size={16} />
              Exportar Excel
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2 cursor-pointer text-sm"
            >
              <ArrowLeft size={16} />
              Volver al Menú
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtro por Patrocinador */}
        <div className="bg-white p-4 rounded-lg shadow-xs border border-outline-variant flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Buscar por nombre, patrocinador, correo o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant rounded-md focus:outline-none focus:border-primary"
            />
          </div>
          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="text-xs font-bold text-secondary whitespace-nowrap">Patrocinador:</span>
            <select
              value={sponsorFilter}
              onChange={(e) => setSponsorFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 text-sm border border-outline-variant rounded-md bg-white focus:outline-none focus:border-primary"
            >
              <option value="all">Todos los patrocinadores ({staffList.length})</option>
              {uniqueSponsorsInStaff.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla con Columna de Acciones Fija (Sticky) Siempre Visible */}
        <div className="bg-white rounded-lg shadow-md border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-variant/30 border-b border-outline-variant">
                  <th className="py-3.5 px-3 font-bold text-on-surface">Nombre</th>
                  <th className="py-3.5 px-3 font-bold text-on-surface">Patrocinador</th>
                  <th className="py-3.5 px-3 font-bold text-on-surface">Email</th>
                  <th className="py-3.5 px-3 font-bold text-on-surface">Teléfono</th>
                  <th className="py-3.5 px-3 font-bold text-on-surface">Empresa</th>
                  <th className="py-3.5 px-3 font-bold text-on-surface">Cargo</th>
                  <th className="py-3.5 px-3 font-bold text-on-surface">Sector</th>
                  <th className="py-3.5 px-3 font-bold text-on-surface">Fecha</th>
                  <th className="py-3.5 px-4 font-bold text-on-surface text-center sticky right-0 bg-[#F3F4F6] border-l border-outline-variant shadow-[-4px_0_8px_rgba(0,0,0,0.04)] z-10">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-secondary">
                      Cargando datos...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-secondary">
                      No hay staff registrado que coincida con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const fullName = `${staff.nombre || ''} ${staff.apellido || ''}`.trim();
                    return (
                      <tr key={staff.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors group">
                        <td className="py-3 px-3 text-on-surface font-semibold max-w-[160px] break-words">
                          <div>{fullName}</div>
                          {(staff.checkedIn || staff.attended || staff.badgePrinted) && (
                            <div className="mt-1 flex flex-col items-start gap-0.5">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white shadow-2xs" title={formatPrintDateTimeFull(staff)}>
                                ✅ ASISTIÓ (IMPRESO)
                              </span>
                              {formatPrintTime(staff) && (
                                <span className="text-[9px] font-bold text-emerald-700">
                                  🖨️ {formatPrintTime(staff)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-secondary font-medium max-w-[140px] break-words">
                          {sponsorsMap[staff.sponsorId] || staff.sponsorName || 'No asignado'}
                        </td>
                        <td className="py-3 px-3 text-secondary max-w-[200px] break-all text-xs">
                          {staff.email || '—'}
                        </td>
                        <td className="py-3 px-3 text-secondary whitespace-nowrap text-xs">
                          {staff.telefono || '—'}
                        </td>
                        <td className="py-3 px-3 text-secondary max-w-[150px] break-words text-xs">
                          {staff.empresa || '—'}
                        </td>
                        <td className="py-3 px-3 text-secondary max-w-[160px] break-words text-xs">
                          {staff.cargo || '—'}
                        </td>
                        <td className="py-3 px-3 text-secondary whitespace-nowrap text-xs">
                          {staff.sector || '—'}
                        </td>
                        <td className="py-3 px-3 text-secondary whitespace-nowrap text-xs">
                          {staff.createdAt?.toLocaleDateString ? staff.createdAt.toLocaleDateString() : 'Reciente'}
                        </td>
                        <td className="py-3 px-3 text-center sticky right-0 bg-white group-hover:bg-[#FAF9F8] border-l border-outline-variant shadow-[-4px_0_8px_rgba(0,0,0,0.04)] z-10">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Ver / Descargar Código QR */}
                            <button
                              onClick={() => {
                                setSelectedPersonForQR(mapStaffForPrint(staff));
                                setQrModalOpen(true);
                              }}
                              className="p-2 text-[#0d47a1] bg-[#0d47a1]/5 hover:bg-[#0d47a1]/15 rounded-lg transition-colors cursor-pointer"
                              title="Ver / Descargar Código QR"
                            >
                              <QrCode size={17} />
                            </button>

                            {/* Imprimir Gafete */}
                            <button
                              onClick={() => setPrintItems([mapStaffForPrint(staff)])}
                              className="p-2 text-primary bg-primary/5 hover:bg-primary/15 rounded-lg transition-colors cursor-pointer"
                              title="Imprimir Gafete de Staff"
                            >
                              <Printer size={17} />
                            </button>

                            {/* Eliminar Acreditación */}
                            <button
                              onClick={() => handleDeleteStaff(staff)}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar Acreditación"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para visualizar y descargar el QR del Staff */}
      {qrModalOpen && selectedPersonForQR && (
        <AdminQRViewModal
          isOpen={qrModalOpen}
          onClose={() => {
            setQrModalOpen(false);
            setSelectedPersonForQR(null);
          }}
          person={selectedPersonForQR}
          roleLabel="STAFF"
          onPrintBadge={(s) => setPrintItems([mapStaffForPrint(s)])}
        />
      )}
    </div>
  );
}
