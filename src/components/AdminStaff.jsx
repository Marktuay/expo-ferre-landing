import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getDocs, where, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { QrCode, Printer, Trash2, Search, Download, ArrowLeft, Users, Plus, Edit2, X, UserCheck } from 'lucide-react';
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

  // Modal de Crear / Editar Staff en puerta
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    sponsorId: 'org_expoferre',
    empresa: 'Organización Expo Ferre',
    cargo: 'Staff de Stand',
    telefono: '',
    email: '',
    sector: 'Comercial',
    printNow: true
  });

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

  const normalizeSponsorLabel = (str) => {
    const clean = (str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(s\.?a\.?|de\s+c\.?v\.?|nicaragua|corp\.?|corporacion)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return '';
    if (clean.includes('expo ferre') || clean.includes('expoferre')) return 'organizacion_expo_ferre';
    if (clean.includes('sur')) return 'grupo_sur';
    if (clean.includes('fernandez') || clean.includes('sera')) return 'fernandez_sera';
    if (clean.includes('balladares')) return 'importaciones_balladares';
    if (clean.includes('sicsa') || clean.includes('siccsa')) return 'sicsa';
    if (clean.includes('sinsa')) return 'sinsa';
    if (clean.includes('cemex')) return 'cemex';
    if (clean.includes('lafise')) return 'lafise';
    if (clean.includes('bac')) return 'bac';
    if (clean.includes('indenicsa')) return 'indenicsa';
    if (clean.includes('plycem')) return 'plycem';
    if (clean.includes('casco')) return 'casco';
    if (clean.includes('midesa')) return 'midesa';
    if (clean.includes('noelito')) return 'noelito';
    if (clean.includes('sherwin')) return 'sherwin_williams';
    if (clean.includes('armoconsa') || clean.includes('armaconsa')) return 'armoconsa';
    if (clean.includes('extel')) return 'extel';
    if (clean.includes('megalina') || clean.includes('megalinea')) return 'megalineas';
    if (clean.includes('amanco') || clean.includes('wavin')) return 'amanco_wavin';
    if (clean.includes('holcim') || clean.includes('disensa')) return 'holcim_disensa';
    if (clean.includes('monolit') || clean.includes('precom')) return 'monolit';
    if (clean.includes('futec')) return 'futec';
    if (clean.includes('madinisa') || clean.includes('sonax')) return 'madinisa';
    if (clean.includes('incasa') || clean.includes('ipsm')) return 'incasa';
    if (clean.includes('eaton')) return 'eaton';
    if (clean.includes('tigo')) return 'tigo';
    if (clean.includes('parque') || clean.includes('zaratoga') || clean.includes('saratoga') || clean.includes('baratogo') || clean.includes('tucasa')) return 'parques_industriales';
    if (clean.includes('romax') || clean.includes('maximiza')) return 'romax';
    if (clean.includes('jp') || clean.includes('studio') || clean.includes('technology')) return 'jp_technology_studio';
    if (clean.includes('artik') || clean.includes('cargo')) return 'artik_cargo';
    if (clean.includes('perno')) return 'la_casa_del_perno';
    if (clean.includes('mobius')) return 'mobius';
    if (clean.includes('pbs')) return 'pbs';
    if (clean.includes('kouture')) return 'kouture';
    if (clean.includes('chevrolet') || clean.includes('grupo q') || clean.includes('grupo_q') || clean.includes('grupoq')) return 'grupo_q';
    if (clean.includes('durman')) return 'durman';
    if (clean.includes('orion')) return 'orion';
    if (clean.includes('flor') || clean.includes('cana')) return 'flor_de_cana';
    if (clean.includes('cafe') || clean.includes('flores')) return 'cafe_las_flores';
    return clean;
  };

  const allSponsorOptions = useMemo(() => {
    const seenKeys = new Set(['organizacion_expo_ferre']);
    const entries = [];
    Object.entries(sponsorsMap).forEach(([id, rawName]) => {
      const name = (rawName || '').trim();
      if (!name || name === 'Patrocinador Desconocido') return;
      const normKey = normalizeSponsorLabel(name);
      if (!normKey || seenKeys.has(normKey)) return;
      seenKeys.add(normKey);
      entries.push({ id, name });
    });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }, [sponsorsMap]);

  const openCreateStaffModal = () => {
    setEditingStaff(null);
    setStaffForm({
      fullName: '',
      sponsorId: 'org_expoferre',
      empresa: 'Organización Expo Ferre',
      cargo: 'Staff de Stand',
      telefono: '',
      email: '',
      sector: 'Comercial',
      printNow: false
    });
    setStaffModalOpen(true);
  };

  const openEditStaffModal = (staff) => {
    const fullName = `${staff.nombre || ''} ${staff.apellido || ''}`.trim() || staff.name || '';
    const spName = sponsorsMap[staff.sponsorId] || staff.sponsorName || staff.empresa || '';
    const normSp = normalizeSponsorLabel(spName);
    const matchedOption = allSponsorOptions.find(
      opt => opt.id === staff.sponsorId || normalizeSponsorLabel(opt.name) === normSp
    );
    const resolvedSponsorId =
      staff.sponsorId === 'org_expoferre' || normSp === 'organizacion_expo_ferre'
        ? 'org_expoferre'
        : matchedOption
          ? matchedOption.id
          : 'custom';

    setEditingStaff(staff);
    setStaffForm({
      fullName,
      sponsorId: resolvedSponsorId,
      empresa: staff.empresa || spName || '',
      cargo: staff.cargo || 'Staff de Stand',
      telefono: staff.telefono || '',
      email: staff.email || '',
      sector: staff.sector || 'Comercial',
      printNow: false
    });
    setStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const cleanFullName = (staffForm.fullName || '').trim();
    if (!cleanFullName) {
      alert('Por favor ingresa el nombre de la persona de staff.');
      return;
    }

    const parts = cleanFullName.split(/\s+/);
    const nombre = parts[0] || cleanFullName;
    const apellido = parts.slice(1).join(' ');

    const selectedSponsorName =
      staffForm.sponsorId === 'org_expoferre'
        ? 'Organización Expo Ferre'
        : staffForm.sponsorId === 'custom'
          ? (staffForm.empresa || '').trim()
          : (sponsorsMap[staffForm.sponsorId] || (staffForm.empresa || '').trim());

    const finalCompany = (staffForm.empresa || '').trim() || selectedSponsorName || 'Expo Ferre 2026';
    const finalCargo = (staffForm.cargo || '').trim() || 'Staff';

    setIsSavingStaff(true);
    try {
      const payload = {
        nombre,
        apellido,
        name: cleanFullName,
        empresa: finalCompany,
        sponsorId: staffForm.sponsorId === 'custom' ? null : staffForm.sponsorId,
        sponsorName: selectedSponsorName || finalCompany,
        cargo: finalCargo,
        telefono: (staffForm.telefono || '').trim(),
        email: (staffForm.email || '').trim().toLowerCase(),
        sector: staffForm.sector || 'Comercial'
      };

      if (editingStaff) {
        await updateDoc(doc(db, `${getEventBasePath()}/staff`, editingStaff.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
        setStaffModalOpen(false);
        if (staffForm.printNow) {
          setPrintItems([
            mapStaffForPrint({
              ...editingStaff,
              ...payload,
              id: editingStaff.id
            })
          ]);
        }
      } else {
        const shouldPrint = Boolean(staffForm.printNow);
        const docRef = await addDoc(collection(db, `${getEventBasePath()}/staff`), {
          ...payload,
          createdAt: serverTimestamp(),
          ...(shouldPrint
            ? {
                checkedIn: true,
                checkInTime: serverTimestamp(),
                badgePrinted: true,
                badgePrintedAt: serverTimestamp(),
                attended: true,
                attendedAt: serverTimestamp()
              }
            : {})
        });
        setStaffModalOpen(false);
        if (shouldPrint) {
          setPrintItems([
            mapStaffForPrint({
              id: docRef.id,
              ...payload
            })
          ]);
        }
      }
    } catch (err) {
      console.error('Error al guardar staff:', err);
      alert('No se pudo guardar el registro de staff: ' + err.message);
    } finally {
      setIsSavingStaff(false);
    }
  };

  const normSearchStr = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const filteredStaff = useMemo(() => {
    const q = normSearchStr(searchTerm);
    return staffList.filter(s => {
      const fullName = normSearchStr(`${s.nombre || ''} ${s.apellido || ''} ${s.name || ''}`);
      const rawSponsorName = sponsorsMap[s.sponsorId] || s.sponsorName || s.empresa || '';
      const sponsorName = normSearchStr(rawSponsorName);
      const email = normSearchStr(s.email);
      const company = normSearchStr(s.empresa);
      const phone = normSearchStr(s.telefono);
      const cargo = normSearchStr(s.cargo);

      const matchesSearch = !q ||
        fullName.includes(q) ||
        sponsorName.includes(q) ||
        email.includes(q) ||
        company.includes(q) ||
        phone.includes(q) ||
        cargo.includes(q);

      const matchesSponsor =
        sponsorFilter === 'all' ||
        s.sponsorId === sponsorFilter ||
        normalizeSponsorLabel(rawSponsorName) === sponsorFilter;
      return matchesSearch && matchesSponsor;
    });
  }, [staffList, sponsorsMap, searchTerm, sponsorFilter]);

  const unprintedFilteredStaff = useMemo(() => {
    return filteredStaff.filter(s => !(s.checkedIn || s.attended || s.badgePrinted));
  }, [filteredStaff]);

  const uniqueSponsorsInStaff = useMemo(() => {
    const byNormName = new Map();
    staffList.forEach(s => {
      const name = (sponsorsMap[s.sponsorId] || s.sponsorName || s.empresa || '').trim();
      if (!name) return;
      const norm = normalizeSponsorLabel(name);
      if (!norm || byNormName.has(norm)) return;
      byNormName.set(norm, {
        id: norm,
        name
      });
    });
    return Array.from(byNormName.values()).sort((a, b) => a.name.localeCompare(b.name));
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
              type="button"
              onClick={openCreateStaffModal}
              className="px-4 py-2 bg-[#0d47a1] hover:bg-[#0a3880] text-white border border-[#0d47a1] rounded-md transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm shadow-xs"
            >
              <Plus size={16} />
              + Registrar Staff
            </button>
            <button
              type="button"
              onClick={() => {
                if (unprintedFilteredStaff.length === 0) return;
                setPrintItems(unprintedFilteredStaff.map(mapStaffForPrint));
              }}
              disabled={unprintedFilteredStaff.length === 0}
              className="px-4 py-2 bg-[#f39200] hover:bg-[#d98200] text-black border border-[#f39200] rounded-md transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm shadow-xs disabled:opacity-50"
              title="Imprimir masivamente solo los gafetes de staff que aún no se han impreso"
            >
              <Printer size={16} />
              Imprimir Pendientes ({unprintedFilteredStaff.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (filteredStaff.length === 0) return;
                setPrintItems(filteredStaff.map(mapStaffForPrint));
              }}
              disabled={filteredStaff.length === 0}
              className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#0284c7] rounded-md transition-colors font-bold flex items-center gap-2 cursor-pointer text-sm shadow-xs disabled:opacity-50"
              title="Imprimir todos los gafetes del filtro actual (incluye pendientes y ya impresos)"
            >
              <Printer size={16} />
              Imprimir Filtrados ({filteredStaff.length})
            </button>
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
                    const fullName = `${staff.nombre || ''} ${staff.apellido || ''}`.trim() || staff.name || '';
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

                            {/* Editar Staff */}
                            <button
                              onClick={() => openEditStaffModal(staff)}
                              className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Editar Datos de Staff"
                            >
                              <Edit2 size={16} />
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

      {/* Modal para Registrar o Editar Staff en Puerta */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0d47a1] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserCheck size={22} />
                <div>
                  <h2 className="font-bold text-lg leading-tight">
                    {editingStaff ? 'Editar Acreditación de Staff' : 'Registrar Personal de Staff'}
                  </h2>
                  <p className="text-xs text-blue-100">
                    Acreditación directa para gafete térmico de STAFF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre y Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Carlos Mendoza"
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d47a1] focus:ring-2 focus:ring-[#0d47a1]/20 font-semibold text-slate-900"
                />
              </div>

              {/* Selección de Patrocinador / Organización */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Asignar a Patrocinador / Entidad
                  </label>
                  <select
                    value={staffForm.sponsorId}
                    onChange={(e) => {
                      const val = e.target.value;
                      let autoCompany = staffForm.empresa;
                      if (val === 'org_expoferre') {
                        autoCompany = 'Organización Expo Ferre';
                      } else if (val === 'custom') {
                        autoCompany = '';
                      } else if (sponsorsMap[val]) {
                        autoCompany = sponsorsMap[val];
                      }
                      setStaffForm(prev => ({
                        ...prev,
                        sponsorId: val,
                        empresa: autoCompany
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0d47a1]"
                  >
                    <option value="org_expoferre">⭐ Organización Expo Ferre</option>
                    <option value="custom">✏️ Otra empresa (escribir manual)</option>
                    <optgroup label="Patrocinadores Oficiales">
                      {allSponsorOptions.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {staffForm.sponsorId === 'custom' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Nombre de la Empresa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Escribe el nombre de la empresa o marca"
                      value={staffForm.empresa}
                      onChange={(e) => setStaffForm(prev => ({ ...prev, empresa: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d47a1]"
                    />
                  </div>
                )}
              </div>

              {/* Cargo / Rol en el Gafete */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Cargo / Función
                </label>
                <input
                  type="text"
                  placeholder="Ej. Staff de Stand, Logística, Seguridad, Protocolo..."
                  value={staffForm.cargo}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, cargo: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d47a1]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Staff de Stand', 'Logística', 'Staff Técnico', 'Protocolo', 'Seguridad', 'Asesor Comercial', 'Organización'].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setStaffForm(prev => ({ ...prev, cargo: role }))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                        staffForm.cargo === role
                          ? 'bg-[#0d47a1] text-white border-[#0d47a1]'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teléfono y Correo (Opcionales para registro rápido en puerta) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Teléfono / Celular <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 8888-8888"
                    value={staffForm.telefono}
                    onChange={(e) => setStaffForm(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d47a1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Correo Electrónico <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d47a1]"
                  />
                </div>
              </div>

              {/* Opción de imprimir gafete inmediatamente */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={staffForm.printNow}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, printNow: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <div className="text-xs">
                  <span className="font-bold text-emerald-900 block">
                    🖨️ Abrir impresión de gafete inmediatamente al guardar
                  </span>
                  <span className="text-emerald-700">
                    Marca automáticamente como asistido e imprime el sticker de STAFF.
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="px-5 py-2 rounded-lg bg-[#0d47a1] hover:bg-[#0a3880] text-white text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {staffForm.printNow ? <Printer size={16} /> : <UserCheck size={16} />}
                  <span>
                    {isSavingStaff
                      ? 'Guardando...'
                      : staffForm.printNow
                        ? 'Guardar e Imprimir Gafete'
                        : 'Guardar Staff'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
