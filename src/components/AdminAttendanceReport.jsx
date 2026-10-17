import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import { exportConsolidatedBaseToExcel } from '../utils/exportConsolidatedExcel';
import PrintableBadgeList from './PrintableBadgeList';

export default function AdminAttendanceReport({ onBack }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printItems, setPrintItems] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const basePath = getEventBasePath();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const consolidated = [];

    try {
      // 1. Preregistrations
      const registeredAttendeeIds = new Set();
      const preregSnap = await getDocs(query(collection(db, `${basePath}/preregistrations`)));
      preregSnap.forEach(doc => {
        const d = doc.data();
        registeredAttendeeIds.add(doc.id);
        const isVip = Boolean(
          d.isDirectInvite === true || 
          d.type === 'direct_invite' ||
          d.source === 'Invitación Directa' ||
          Boolean(d.inviteToken)
        );

        const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
        const attendedDate = d.checkInTime?.toDate?.() || d.attendedAt?.toDate?.() || d.badgePrintedAt?.toDate?.() || null;

        consolidated.push({
          id: doc.id,
          name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Sin Nombre',
          category: isVip ? 'Invitado VIP' : 'Preregistro (General)',
          contact: d.email || d.phone || 'N/A',
          company: d.company || 'N/A',
          position: d.position || d.cargo || d.puesto || '',
          cargo: d.position || d.cargo || d.puesto || '',
          checkedIn: isAttended,
          checkInTime: attendedDate,
          isVip: isVip,
          collection: 'preregistrations',
          raw: d
        });
      });

      // 2. Direct Invites (Patrocinadores)
      const directSnap = await getDocs(query(collection(db, `${basePath}/directInvites`)));
      directSnap.forEach(doc => {
        const d = doc.data();
        if (!d.registeredAttendeeId || !registeredAttendeeIds.has(d.registeredAttendeeId)) {
          const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
          const attendedDate = d.checkInTime?.toDate?.() || d.attendedAt?.toDate?.() || d.badgePrintedAt?.toDate?.() || null;
          consolidated.push({
            id: doc.id,
            name: d.registeredName || d.nombre || 'Invitado VIP',
            category: 'Invitado VIP',
            contact: d.email || d.telefono || 'N/A',
            company: d.registeredCompany || d.empresa || d.sponsorName || 'N/A',
            position: d.cargo || d.puesto || d.position || d.registeredPosition || '',
            cargo: d.cargo || d.puesto || d.position || d.registeredPosition || '',
            checkedIn: isAttended,
            checkInTime: attendedDate,
            isVip: true,
            sponsorName: d.sponsorName || '',
            collection: 'directInvites',
            registeredAttendeeId: d.registeredAttendeeId,
            raw: d
          });
        }
      });

      // 3. Sponsors (Users)
      const usersSnap = await getDocs(query(collection(db, `users`)));
      usersSnap.forEach(doc => {
        const d = doc.data();
        if (d.role === 'sponsor') {
          const rawPerson = `${d.nombre || d.name || ''} ${d.apellido || ''}`.trim();
          const comp = (d.empresa || d.company || '').trim();
          const hasRealPerson = rawPerson && rawPerson.toLowerCase() !== comp.toLowerCase();
          const displayName = hasRealPerson ? rawPerson : (comp ? `Resp. ${comp}` : 'Patrocinador');
          const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
          const attendedDate = d.checkInTime?.toDate?.() || d.attendedAt?.toDate?.() || d.badgePrintedAt?.toDate?.() || null;

          consolidated.push({
            id: doc.id,
            name: displayName,
            category: 'Patrocinador',
            contact: d.correo || d.email || d.telefono || 'N/A',
            company: comp || 'N/A',
            position: d.cargo || d.puesto || 'Patrocinador',
            cargo: d.cargo || d.puesto || 'Patrocinador',
            checkedIn: isAttended,
            checkInTime: attendedDate,
            collection: 'users',
            raw: d
          });
        }
      });

      // 4. Staff
      const staffSnap = await getDocs(query(collection(db, `${basePath}/staff`)));
      staffSnap.forEach(doc => {
        const d = doc.data();
        const staffName = d.name || (`${d.nombre || ''} ${d.apellido || ''}`).trim() || 'Staff';
        const staffComp = d.company || d.empresa || d.sponsorCompany || d.sponsorName || 'ExpoFerre';
        const staffContact = d.email || d.correo || d.phone || d.telefono || 'N/A';
        const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
        const attendedDate = d.checkInTime?.toDate?.() || d.attendedAt?.toDate?.() || d.badgePrintedAt?.toDate?.() || null;
        consolidated.push({
          id: doc.id,
          name: staffName,
          category: 'Staff Técnico',
          contact: staffContact,
          company: staffComp,
          position: d.cargo || d.tipoCargo || 'Staff',
          cargo: d.cargo || d.tipoCargo || 'Staff',
          checkedIn: isAttended,
          checkInTime: attendedDate,
          collection: 'staff',
          raw: d
        });
      });

      // 5. Speakers
      const speakersSnap = await getDocs(query(collection(db, `${basePath}/speakers`)));
      speakersSnap.forEach(doc => {
        const d = doc.data();
        const speakerName = d.name || (`${d.nombre || ''} ${d.apellido || ''}`).trim() || d.speaker || 'Conferencista';
        const speakerComp = d.company || d.empresa || d.sponsorCompany || d.sponsorName || (d.titulo ? `Tema: ${d.titulo}` : 'N/A');
        const speakerContact = d.email || d.correo || d.phone || d.telefono || 'N/A';
        const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
        const attendedDate = d.checkInTime?.toDate?.() || d.attendedAt?.toDate?.() || d.badgePrintedAt?.toDate?.() || null;
        consolidated.push({
          id: doc.id,
          name: speakerName,
          category: 'Conferencista',
          contact: speakerContact,
          company: speakerComp,
          position: d.cargo || 'Conferencista VIP',
          cargo: d.cargo || 'Conferencista VIP',
          checkedIn: isAttended,
          checkInTime: attendedDate,
          isVip: true,
          collection: 'speakers',
          raw: d
        });
      });

      // 6. Guests (Especiales)
      const guestsSnap = await getDocs(query(collection(db, `${basePath}/guests`)));
      guestsSnap.forEach(doc => {
        const d = doc.data();
        const guestName = d.name || (`${d.nombre || ''} ${d.apellido || ''}`).trim() || 'Invitado Especial';
        const guestComp = d.company || d.empresa || d.sponsorName || 'N/A';
        const guestContact = d.email || d.correo || d.phone || d.telefono || 'N/A';
        const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
        const attendedDate = d.checkInTime?.toDate?.() || d.attendedAt?.toDate?.() || d.badgePrintedAt?.toDate?.() || null;
        consolidated.push({
          id: doc.id,
          name: guestName,
          category: 'Invitado VIP',
          contact: guestContact,
          company: guestComp,
          position: d.cargo || d.position || d.puesto || '',
          cargo: d.cargo || d.position || d.puesto || '',
          checkedIn: isAttended,
          checkInTime: attendedDate,
          isVip: true,
          collection: 'guests',
          raw: d
        });
      });

      // 7. Jurados Calificadores VIP (invitedJudges + juryEvaluations)
      const seenJudgeKeys = new Set();
      const invitedJudgesSnap = await getDocs(query(collection(db, `${basePath}/invitedJudges`)));
      invitedJudgesSnap.forEach(doc => {
        const d = doc.data();
        const judgeName = (d.name || d.nombre || 'Jurado Calificador').trim();
        const key = (d.email || judgeName).toLowerCase().trim();
        if (key) seenJudgeKeys.add(key);
        const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
        const attendedDate = d.checkInTime?.toDate?.() || d.attendedAt?.toDate?.() || d.badgePrintedAt?.toDate?.() || null;
        consolidated.push({
          id: doc.id,
          name: judgeName,
          category: 'Jurado VIP',
          contact: d.email || d.phone || d.telefono || 'N/A',
          company: d.company || d.empresa || 'Comité Evaluador EXPO FERRE',
          position: 'Jurado Calificador VIP',
          cargo: 'Jurado Calificador VIP',
          checkedIn: isAttended,
          checkInTime: attendedDate,
          isVip: true,
          collection: 'invitedJudges',
          raw: d
        });
      });

      const juryEvalsSnap = await getDocs(query(collection(db, `${basePath}/juryEvaluations`)));
      juryEvalsSnap.forEach(doc => {
        const d = doc.data();
        const judgeName = (d.judgeName || d.name || 'Jurado Calificador').trim();
        const key = (d.judgeEmail || judgeName).toLowerCase().trim();
        if (key && seenJudgeKeys.has(key)) return;
        if (key) seenJudgeKeys.add(key);
        const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
        const attendedDate = d.checkInTime?.toDate?.() || d.attendedAt?.toDate?.() || d.badgePrintedAt?.toDate?.() || null;
        consolidated.push({
          id: doc.id,
          name: judgeName,
          category: 'Jurado VIP',
          contact: d.judgeEmail || d.judgePhone || 'N/A',
          company: d.judgeCompany || 'Comité Evaluador EXPO FERRE',
          position: 'Jurado Calificador VIP',
          cargo: 'Jurado Calificador VIP',
          checkedIn: isAttended,
          checkInTime: attendedDate,
          isVip: true,
          collection: 'juryEvaluations',
          raw: d
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
  }, [basePath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [isResetting, setIsResetting] = useState(false);

  const handlePrintBadge = async (item) => {
    // 1. Optimistic update in table
    setData(prev => prev.map(d => d.id === item.id ? { ...d, checkedIn: true, checkInTime: d.checkInTime || new Date() } : d));

    // 2. Prepare badge item with explicit collection
    const pos = item.position || item.cargo || item.puesto || item.raw?.cargo || item.raw?.position || item.raw?.puesto || '';
    const badgeItem = {
      id: item.id,
      name: item.name,
      company: item.company !== 'N/A' ? item.company : '',
      position: pos,
      cargo: pos,
      email: item.contact && item.contact.includes('@') ? item.contact : '',
      phone: item.contact && !item.contact.includes('@') && item.contact !== 'N/A' ? item.contact : '',
      roleLabel: item.category,
      collection: item.collection,
      registeredAttendeeId: item.registeredAttendeeId,
      isDirectInvite: item.isVip,
      isVip: item.isVip,
      ...(item.raw || {})
    };
    badgeItem.position = pos;
    badgeItem.cargo = pos;

    setPrintItems([badgeItem]);
  };

  const handleRevertCheckIn = async (item) => {
    if (!window.confirm(`¿Deseas desmarcar la asistencia de "${item.name}" para que vuelva a estar Pendiente?`)) return;

    try {
      const colPath = item.collection === 'users' ? 'users' : `${basePath}/${item.collection}`;
      const resetPayload = {
        checkedIn: false,
        checkInTime: null,
        badgePrinted: false,
        attended: false,
        attendedAt: null
      };

      if (item.collection === 'directInvites') {
        resetPayload.status = (item.raw?.registeredName || item.raw?.nombre) ? 'registered' : 'pending';
      }

      await updateDoc(doc(db, colPath, item.id), resetPayload);

      if (item.registeredAttendeeId) {
        try {
          await updateDoc(doc(db, `${basePath}/preregistrations`, item.registeredAttendeeId), resetPayload);
        } catch (_) {}
      }

      setData(prev => prev.map(d => d.id === item.id ? { ...d, checkedIn: false, checkInTime: null } : d));
    } catch (err) {
      console.error("Error al revertir checkin:", err);
      alert("Hubo un error al revertir el check-in: " + err.message);
    }
  };

  const handleResetAllAttendance = async () => {
    const checkedInCount = data.filter(d => d.checkedIn).length;
    if (checkedInCount === 0) {
      alert("No hay ningún check-in registrado actualmente.");
      return;
    }

    const confirmMsg = `⚠️ ATENCIÓN: Se van a limpiar las ${checkedInCount} asistencias registradas hoy durante las pruebas de impresión.\n\n¿Deseas reiniciar todas las asistencias a CERO para el inicio del evento mañana?\n\n(No te preocupes: NO se borrará ningún invitado ni registro, solo se regresa su estatus a Pendiente).`;
    if (!window.confirm(confirmMsg)) return;

    setIsResetting(true);
    try {
      const resetPayload = {
        checkedIn: false,
        checkInTime: null,
        badgePrinted: false,
        attended: false,
        attendedAt: null
      };

      // 1. Reset preregistrations
      const preregSnap = await getDocs(query(collection(db, `${basePath}/preregistrations`)));
      for (const d of preregSnap.docs) {
        const dt = d.data();
        if (dt.checkedIn || dt.attended || dt.badgePrinted) {
          await updateDoc(doc(db, `${basePath}/preregistrations`, d.id), resetPayload);
        }
      }

      // 2. Reset directInvites
      const directSnap = await getDocs(query(collection(db, `${basePath}/directInvites`)));
      for (const d of directSnap.docs) {
        const data = d.data();
        if (data.checkedIn || data.attended || data.badgePrinted || data.status === 'used') {
          await updateDoc(doc(db, `${basePath}/directInvites`, d.id), {
            ...resetPayload,
            status: (data.registeredName || data.nombre) ? 'registered' : 'pending'
          });
        }
      }

      // 3. Reset users (sponsors)
      const usersSnap = await getDocs(query(collection(db, `users`)));
      for (const d of usersSnap.docs) {
        const dt = d.data();
        if (dt.checkedIn || dt.attended || dt.badgePrinted) {
          await updateDoc(doc(db, `users`, d.id), resetPayload);
        }
      }

      // 4. Reset staff
      const staffSnap = await getDocs(query(collection(db, `${basePath}/staff`)));
      for (const d of staffSnap.docs) {
        const dt = d.data();
        if (dt.checkedIn || dt.attended || dt.badgePrinted) {
          await updateDoc(doc(db, `${basePath}/staff`, d.id), resetPayload);
        }
      }

      // 5. Reset speakers
      const speakersSnap = await getDocs(query(collection(db, `${basePath}/speakers`)));
      for (const d of speakersSnap.docs) {
        const dt = d.data();
        if (dt.checkedIn || dt.attended || dt.badgePrinted) {
          await updateDoc(doc(db, `${basePath}/speakers`, d.id), resetPayload);
        }
      }

      // 6. Reset guests
      const guestsSnap = await getDocs(query(collection(db, `${basePath}/guests`)));
      for (const d of guestsSnap.docs) {
        const dt = d.data();
        if (dt.checkedIn || dt.attended || dt.badgePrinted) {
          await updateDoc(doc(db, `${basePath}/guests`, d.id), resetPayload);
        }
      }

      // 7. Reset invitedJudges & juryEvaluations
      const invJudgesSnap = await getDocs(query(collection(db, `${basePath}/invitedJudges`)));
      for (const d of invJudgesSnap.docs) {
        const dt = d.data();
        if (dt.checkedIn || dt.attended || dt.badgePrinted) {
          await updateDoc(doc(db, `${basePath}/invitedJudges`, d.id), resetPayload);
        }
      }
      const evalJudgesSnap = await getDocs(query(collection(db, `${basePath}/juryEvaluations`)));
      for (const d of evalJudgesSnap.docs) {
        const dt = d.data();
        if (dt.checkedIn || dt.attended || dt.badgePrinted) {
          await updateDoc(doc(db, `${basePath}/juryEvaluations`, d.id), resetPayload);
        }
      }

      await fetchData();
      alert(`✅ ¡Asistencias reiniciadas exitosamente a 0! Las pruebas de hoy fueron limpiadas. Mañana iniciarán el evento con el conteo en blanco.`);
    } catch (err) {
      console.error("Error al reiniciar asistencias:", err);
      alert("Hubo un error al reiniciar asistencias: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

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
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
      XLSX.writeFile(wb, "Reporte_Asistencia_ExpoFerre.xlsx");
    });
  };

  const categories = ['ALL', 'Invitado VIP', 'Jurado VIP', 'Conferencista', 'Preregistro (General)', 'Patrocinador', 'Staff Técnico'];

  // --- Category Breakdown Calculations ---
  const vipData = data.filter(d => d.isVip);
  const preregData = data.filter(d => d.category === 'Preregistro (General)');
  const sponsorData = data.filter(d => d.category === 'Patrocinador');
  const staffData = data.filter(d => d.category === 'Staff Técnico');
  const speakerData = data.filter(d => d.category === 'Conferencista' || d.category === 'Jurado VIP');

  const vipCheckedIn = vipData.filter(d => d.checkedIn).length;
  const preregCheckedIn = preregData.filter(d => d.checkedIn).length;
  const sponsorCheckedIn = sponsorData.filter(d => d.checkedIn).length;
  const staffCheckedIn = staffData.filter(d => d.checkedIn).length;
  const speakerCheckedIn = speakerData.filter(d => d.checkedIn).length;

  // --- Global KPI & Heatmap Calculations ---
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

  if (printItems) {
    return (
      <PrintableBadgeList
        items={printItems}
        roleLabel={printItems[0]?.category || 'Asistente'}
        onClose={() => setPrintItems(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Reporte de Asistencia y Control de Catering</h1>
            <p className="text-body-lg text-secondary">Vista consolidada en tiempo real. Imprimir gafete registra el Check-In automáticamente.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleResetAllAttendance} 
              disabled={isResetting || isLoading}
              className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-300 rounded-md hover:bg-rose-100 transition-colors font-label-lg flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer shadow-2xs font-bold"
              title="Limpiar pruebas de impresión y reiniciar la asistencia a cero para mañana"
            >
              <span className={`material-symbols-outlined text-[18px] ${isResetting ? 'animate-spin' : ''}`}>
                {isResetting ? 'refresh' : 'restart_alt'}
              </span>
              {isResetting ? 'Reiniciando...' : 'Reiniciar a 0 (Limpiar Pruebas)'}
            </button>
            <button 
              onClick={fetchData} 
              disabled={isLoading}
              className="px-4 py-2 bg-white text-secondary border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Refrescar lista y métricas en tiempo real"
            >
              <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
              Refrescar
            </button>
            <button 
              onClick={exportConsolidatedBaseToExcel} 
              className="px-4 py-2 bg-[#16a34a] text-white rounded-md hover:bg-[#15803d] transition-colors font-label-lg flex items-center gap-2 text-sm cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exportar Base Consolidada (Excel)
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2 text-sm cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Volver
            </button>
          </div>
        </div>

        {/* Dashboard KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Funnel Card */}
          <div className="bg-white rounded-lg shadow-sm border border-outline-variant p-6 flex flex-col justify-center">
            <h3 className="text-secondary font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined">filter_alt</span> Embudo Global de Asistencia</h3>
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
                    style={{ height: `${Math.max(hr.heightPct, 2)}%` }}
                  ></div>
                  {/* Label */}
                  <span className="text-[10px] text-gray-500 mt-2">{hr.hourStr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Breakdown & Catering Target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Card 1: VIP Guests / Lunch Plates */}
          <div 
            onClick={() => setCategoryFilter(categoryFilter === 'Invitado VIP' ? 'ALL' : 'Invitado VIP')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              categoryFilter === 'Invitado VIP' 
                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500 shadow-md' 
                : 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/60 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🍽️</span>
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">Almuerzo</span>
            </div>
            <p className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Platos a Servir (VIP)</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-800">{vipCheckedIn}</span>
              <span className="text-xs text-emerald-700 font-bold">/ {vipData.length}</span>
            </div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{ width: `${vipData.length > 0 ? (vipCheckedIn / vipData.length) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-emerald-700 font-medium mt-1.5">
              {vipData.length > 0 ? ((vipCheckedIn / vipData.length) * 100).toFixed(0) : 0}% confirmados
            </p>
          </div>

          {/* Card 2: General Preregistrations */}
          <div 
            onClick={() => setCategoryFilter(categoryFilter === 'Preregistro (General)' ? 'ALL' : 'Preregistro (General)')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              categoryFilter === 'Preregistro (General)' 
                ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-500 shadow-md' 
                : 'bg-white border-outline-variant hover:bg-blue-50/40 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎟️</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">General</span>
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Asistentes Generales</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-[#283474]">{preregCheckedIn}</span>
              <span className="text-xs text-slate-500 font-bold">/ {preregData.length}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#283474] h-full transition-all duration-500"
                style={{ width: `${preregData.length > 0 ? (preregCheckedIn / preregData.length) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">
              {preregData.length > 0 ? ((preregCheckedIn / preregData.length) * 100).toFixed(0) : 0}% confirmados
            </p>
          </div>

          {/* Card 3: Sponsors */}
          <div 
            onClick={() => setCategoryFilter(categoryFilter === 'Patrocinador' ? 'ALL' : 'Patrocinador')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              categoryFilter === 'Patrocinador' 
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500 shadow-md' 
                : 'bg-white border-outline-variant hover:bg-amber-50/40 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🏢</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Stands</span>
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Patrocinadores</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-700">{sponsorCheckedIn}</span>
              <span className="text-xs text-slate-500 font-bold">/ {sponsorData.length}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-amber-600 h-full transition-all duration-500"
                style={{ width: `${sponsorData.length > 0 ? (sponsorCheckedIn / sponsorData.length) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">
              {sponsorData.length > 0 ? ((sponsorCheckedIn / sponsorData.length) * 100).toFixed(0) : 0}% confirmados
            </p>
          </div>

          {/* Card 4: Staff */}
          <div 
            onClick={() => setCategoryFilter(categoryFilter === 'Staff Técnico' ? 'ALL' : 'Staff Técnico')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              categoryFilter === 'Staff Técnico' 
                ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-500 shadow-md' 
                : 'bg-white border-outline-variant hover:bg-purple-50/40 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">👔</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Equipo</span>
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Staff Técnico</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-purple-700">{staffCheckedIn}</span>
              <span className="text-xs text-slate-500 font-bold">/ {staffData.length}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-purple-600 h-full transition-all duration-500"
                style={{ width: `${staffData.length > 0 ? (staffCheckedIn / staffData.length) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">
              {staffData.length > 0 ? ((staffCheckedIn / staffData.length) * 100).toFixed(0) : 0}% confirmados
            </p>
          </div>

          {/* Card 5: Speakers */}
          <div 
            onClick={() => setCategoryFilter(categoryFilter === 'Conferencista' ? 'ALL' : 'Conferencista')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              categoryFilter === 'Conferencista' 
                ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-500 shadow-md' 
                : 'bg-white border-outline-variant hover:bg-rose-50/40 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎤</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Charlas</span>
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Conferencistas</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-rose-700">{speakerCheckedIn}</span>
              <span className="text-xs text-slate-500 font-bold">/ {speakerData.length}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-rose-600 h-full transition-all duration-500"
                style={{ width: `${speakerData.length > 0 ? (speakerCheckedIn / speakerData.length) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">
              {speakerData.length > 0 ? ((speakerCheckedIn / speakerData.length) * 100).toFixed(0) : 0}% confirmados
            </p>
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
              className="px-4 py-2 border border-outline-variant rounded-md bg-white outline-none focus:border-primary w-full md:w-auto text-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'ALL' ? 'Todas las Categorías' : cat}</option>
              ))}
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-outline-variant rounded-md bg-white outline-none focus:border-primary w-full md:w-auto text-sm"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="CHECKED_IN">Ya ingresaron (Asistió)</option>
              <option value="PENDING">Pendientes (No asistió)</option>
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead className="bg-surface-variant/30 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Nombre</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Empresa</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Categoría</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Contacto</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Estado</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant">Hora Check-in</th>
                  <th className="p-4 font-bold text-on-surface border-b border-outline-variant text-right">Acción Gafete</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-secondary">
                      <span className="material-symbols-outlined animate-spin text-4xl mb-2">refresh</span>
                      <p>Cargando datos consolidados...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-secondary">
                      No se encontraron resultados que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={index} className="border-b border-outline-variant hover:bg-surface-variant/20 transition-colors">
                      <td className="p-4 font-medium text-on-surface">{item.name}</td>
                      <td className="p-4 text-secondary">{item.company}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          item.category === 'Invitado VIP'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.category === 'Jurado VIP'
                            ? 'bg-slate-900 text-amber-400 border border-amber-500'
                            : item.category === 'Patrocinador'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : item.category === 'Staff Técnico'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : item.category === 'Conferencista'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-primary/10 text-primary'
                        }`}>
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
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handlePrintBadge(item)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              item.checkedIn
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                : 'bg-[#283474] text-white hover:bg-[#1e2759] border border-[#283474]'
                            }`}
                            title={item.checkedIn ? "Reimprimir Gafete Térmico" : "Imprimir Gafete Térmico y Registrar Check-In Inmediato"}
                          >
                            <span className="material-symbols-outlined text-[16px]">print</span>
                            {item.checkedIn ? 'Reimprimir' : 'Imprimir'}
                          </button>
                          {item.checkedIn && (
                            <button
                              onClick={() => handleRevertCheckIn(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                              title="Desmarcar asistencia / Revertir prueba de impresión"
                            >
                              <span className="material-symbols-outlined text-[16px]">undo</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-outline-variant bg-surface-variant/10 text-sm text-secondary flex flex-col sm:flex-row justify-between gap-2">
            <span>Total listados: <strong className="text-on-surface">{filteredData.length}</strong></span>
            <div className="flex gap-4">
              <span>Asistieron en total: <strong className="text-[#16a34a]">{filteredData.filter(d => d.checkedIn).length}</strong></span>
              <span>Platos de Almuerzo Servidos: <strong className="text-emerald-700">{filteredData.filter(d => d.isVip && d.checkedIn).length}</strong></span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
