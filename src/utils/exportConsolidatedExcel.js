import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import { getPrintDateObj, formatPrintDateTimeFull } from './formatPrintTime';

/**
 * Exporta la base consolidada completa de EXPO FERRE 2026 tanto en formato Excel (.xlsx) como en CSV (.csv).
 * Incluye: Preregistros, Invitados VIP (Directos y Manuales), Patrocinadores, Staff, Conferencistas y Jurados,
 * con su estatus de asistencia y hora de impresión.
 */
export async function exportConsolidatedBaseToExcel(options = {}) {
  const format = options?.format || 'excel';
  const basePath = getEventBasePath();
  const consolidated = [];

  // Mapeo auxiliar de patrocinadores
  const sponsorsMap = {};
  try {
    const usersSnap = await getDocs(query(collection(db, 'users')));
    usersSnap.forEach(d => {
      const data = d.data();
      sponsorsMap[d.id] = data.empresa || data.nombre || 'Patrocinador';
    });
  } catch (err) {
    console.warn("No se pudo cargar mapa de patrocinadores:", err);
  }

  // 1. Preregistros Generales
  const registeredAttendeeIds = new Set();
  try {
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
      const attendedDate = getPrintDateObj(d);
      const nombreCompleto = d.name || `${d.firstName || d.nombre || ''} ${d.lastName || d.apellido || ''}`.trim() || 'Sin Nombre';

      consolidated.push({
        origen: isVip ? 'Invitado VIP (Directo)' : 'Preregistro General',
        nombre: nombreCompleto,
        empresa: d.company || d.empresa || 'N/A',
        cargo: d.position || d.cargo || d.puesto || 'N/A',
        estadoAsistencia: isAttended ? 'Asistió (Impreso)' : 'Pendiente',
        horaImpresion: attendedDate ? formatPrintDateTimeFull(attendedDate) : 'No impreso',
        correo: d.email || d.correo || 'N/A',
        celular: d.phone || d.telefono || d.celular || 'N/A',
        ciudad: d.city || d.ciudad || d.departamento || d.pais || 'N/A',
        empleados: d.tamanoEmpresa || d.companySize || d.empleados || d.cantEmpleados || 'N/A',
        patrocinadorDetalle: d.sponsorName || sponsorsMap[d.sponsorId] || d.invitadoPor || (isVip ? 'Invitación Directa' : 'Registro Web')
      });
    });
  } catch (err) {
    console.error("Error cargando preregistros:", err);
  }

  // 2. Invitaciones Directas (Patrocinadores y General)
  try {
    const directSnap = await getDocs(query(collection(db, `${basePath}/directInvites`)));
    directSnap.forEach(doc => {
      const d = doc.data();
      // Si ya está incluido vía preregistrations con su ID, omitir duplicado
      if (d.registeredAttendeeId && registeredAttendeeIds.has(d.registeredAttendeeId)) {
        return;
      }

      const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted || d.status === 'used');
      const attendedDate = getPrintDateObj(d);
      const nombreCompleto = d.registeredName || d.nombre || d.name || 'Invitado VIP';
      const spName = d.sponsorName || sponsorsMap[d.sponsorId] || (d.sponsorId === 'general' ? 'Organización General' : (d.sponsorId || 'N/A'));

      consolidated.push({
        origen: 'Invitado VIP (Patrocinador)',
        nombre: nombreCompleto,
        empresa: d.registeredCompany || d.empresa || spName || 'N/A',
        cargo: d.registeredPosition || d.cargo || d.position || 'Invitado Especial',
        estadoAsistencia: isAttended ? 'Asistió (Impreso)' : 'Pendiente',
        horaImpresion: attendedDate ? formatPrintDateTimeFull(attendedDate) : 'No impreso',
        correo: d.email || d.correo || 'N/A',
        celular: d.telefono || d.phone || d.celular || 'N/A',
        ciudad: d.ciudad || d.city || 'N/A',
        empleados: d.empleados || d.cantEmpleados || 'N/A',
        patrocinadorDetalle: spName
      });
    });
  } catch (err) {
    console.error("Error cargando invitaciones directas:", err);
  }

  // 3. Invitados Manuales VIP (guests)
  try {
    const guestsSnap = await getDocs(query(collection(db, `${basePath}/guests`)));
    guestsSnap.forEach(doc => {
      const d = doc.data();
      const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
      const attendedDate = getPrintDateObj(d);
      const nombreCompleto = d.name || `${d.nombre || ''} ${d.apellido || ''}`.trim() || 'Invitado Especial';
      const spName = d.sponsorName || d.sponsorCompany || sponsorsMap[d.sponsorId] || 'N/A';

      consolidated.push({
        origen: 'Invitado VIP (Manual)',
        nombre: nombreCompleto,
        empresa: d.company || d.empresa || spName,
        cargo: d.cargo || d.position || d.puesto || 'Invitado VIP',
        estadoAsistencia: isAttended ? 'Asistió (Impreso)' : 'Pendiente',
        horaImpresion: attendedDate ? formatPrintDateTimeFull(attendedDate) : 'No impreso',
        correo: d.email || d.correo || 'N/A',
        celular: d.phone || d.telefono || d.celular || 'N/A',
        ciudad: d.city || d.ciudad || d.departamento || 'N/A',
        empleados: d.tamanoEmpresa || d.empleados || d.companySize || 'N/A',
        patrocinadorDetalle: spName
      });
    });
  } catch (err) {
    console.error("Error cargando invitados manuales:", err);
  }

  // 4. Patrocinadores (users role === 'sponsor')
  try {
    const usersSnap = await getDocs(query(collection(db, 'users')));
    usersSnap.forEach(doc => {
      const d = doc.data();
      if (d.role === 'sponsor' || d.categoria || d.empresa) {
        const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
        const attendedDate = getPrintDateObj(d);
        const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.trim() || d.contact || d.empresa || 'Patrocinador';

        consolidated.push({
          origen: 'Patrocinador Oficial',
          nombre: nombreCompleto,
          empresa: d.empresa || d.company || 'N/A',
          cargo: d.cargo || 'Representante Oficial',
          estadoAsistencia: isAttended ? 'Asistió (Impreso)' : 'Pendiente',
          horaImpresion: attendedDate ? formatPrintDateTimeFull(attendedDate) : 'No impreso',
          correo: d.correo || d.email || 'N/A',
          celular: d.telefono || d.phone || d.celular || 'N/A',
          ciudad: d.ciudad || d.city || d.departamento || 'Managua',
          empleados: d.empleados || d.tamanoEmpresa || d.companySize || 'N/A',
          patrocinadorDetalle: d.categoria ? `Categoría: ${d.categoria}` : (d.standList ? `Stands: ${d.standList.join(', ')}` : 'Patrocinador')
        });
      }
    });
  } catch (err) {
    console.error("Error cargando patrocinadores:", err);
  }

  // 5. Staff Técnico y de Stand
  try {
    const staffSnap = await getDocs(query(collection(db, `${basePath}/staff`)));
    staffSnap.forEach(doc => {
      const d = doc.data();
      const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
      const attendedDate = getPrintDateObj(d);
      const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.trim() || d.name || 'Staff';
      const spName = d.sponsorName || sponsorsMap[d.sponsorId] || d.empresa || 'Organización';

      consolidated.push({
        origen: 'Staff de Stand / Técnico',
        nombre: nombreCompleto,
        empresa: d.empresa || d.company || spName,
        cargo: d.cargo || 'Staff de Stand',
        estadoAsistencia: isAttended ? 'Asistió (Impreso)' : 'Pendiente',
        horaImpresion: attendedDate ? formatPrintDateTimeFull(attendedDate) : 'No impreso',
        correo: d.email || d.correo || 'N/A',
        celular: d.telefono || d.phone || d.celular || 'N/A',
        ciudad: d.city || d.ciudad || 'N/A',
        empleados: d.empleados || 'N/A',
        patrocinadorDetalle: spName
      });
    });
  } catch (err) {
    console.error("Error cargando staff:", err);
  }

  // 6. Conferencistas (Speakers)
  try {
    const speakersSnap = await getDocs(query(collection(db, `${basePath}/speakers`)));
    speakersSnap.forEach(doc => {
      const d = doc.data();
      const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
      const attendedDate = getPrintDateObj(d);
      const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.trim() || d.name || 'Conferencista';

      consolidated.push({
        origen: 'Conferencista VIP',
        nombre: nombreCompleto,
        empresa: d.sponsorCompany || d.empresa || d.company || 'N/A',
        cargo: d.cargo || 'Conferencista VIP',
        estadoAsistencia: isAttended ? 'Asistió (Impreso)' : 'Pendiente',
        horaImpresion: attendedDate ? formatPrintDateTimeFull(attendedDate) : 'No impreso',
        correo: d.email || d.correo || 'N/A',
        celular: d.telefono || d.phone || d.celular || 'N/A',
        ciudad: d.ciudad || d.city || 'N/A',
        empleados: d.empleados || 'N/A',
        patrocinadorDetalle: d.titulo || d.tema ? `Tema: "${d.titulo || d.tema}"` : 'Conferencista'
      });
    });
  } catch (err) {
    console.error("Error cargando conferencistas:", err);
  }

  // 7. Jurados Calificadores VIP
  const seenJudgeKeys = new Set();
  try {
    const invJudgesSnap = await getDocs(query(collection(db, `${basePath}/invitedJudges`)));
    invJudgesSnap.forEach(doc => {
      const d = doc.data();
      const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
      const attendedDate = getPrintDateObj(d);
      const nombreCompleto = (d.name || d.nombre || 'Jurado Calificador').trim();
      const key = (d.email || nombreCompleto).toLowerCase().trim();
      if (key) seenJudgeKeys.add(key);

      consolidated.push({
        origen: 'Jurado Calificador VIP',
        nombre: nombreCompleto,
        empresa: d.company || d.empresa || 'Comité Evaluador EXPO FERRE',
        cargo: 'Jurado Calificador VIP',
        estadoAsistencia: isAttended ? 'Asistió (Impreso)' : 'Pendiente',
        horaImpresion: attendedDate ? formatPrintDateTimeFull(attendedDate) : 'No impreso',
        correo: d.email || 'N/A',
        celular: d.phone || d.telefono || 'N/A',
        ciudad: d.ciudad || d.city || 'N/A',
        empleados: 'N/A',
        patrocinadorDetalle: 'Comité de Jurados Oficial'
      });
    });

    const evalJudgesSnap = await getDocs(query(collection(db, `${basePath}/juryEvaluations`)));
    evalJudgesSnap.forEach(doc => {
      const d = doc.data();
      const nombreCompleto = (d.judgeName || d.name || 'Jurado Calificador').trim();
      const key = (d.judgeEmail || nombreCompleto).toLowerCase().trim();
      if (key && seenJudgeKeys.has(key)) return;
      if (key) seenJudgeKeys.add(key);

      const isAttended = Boolean(d.checkedIn || d.attended || d.badgePrinted);
      const attendedDate = getPrintDateObj(d);

      consolidated.push({
        origen: 'Jurado Calificador VIP',
        nombre: nombreCompleto,
        empresa: d.judgeCompany || 'Comité Evaluador EXPO FERRE',
        cargo: 'Jurado Calificador VIP',
        estadoAsistencia: isAttended ? 'Asistió (Impreso)' : 'Pendiente',
        horaImpresion: attendedDate ? formatPrintDateTimeFull(attendedDate) : 'No impreso',
        correo: d.judgeEmail || 'N/A',
        celular: d.judgePhone || 'N/A',
        ciudad: 'N/A',
        empleados: 'N/A',
        patrocinadorDetalle: 'Comité de Jurados Oficial'
      });
    });
  } catch (err) {
    console.error("Error cargando jurados:", err);
  }

  // Ordenar: primero los que asistieron (por fecha más reciente), luego el resto alfabéticamente
  consolidated.sort((a, b) => {
    if (a.estadoAsistencia.includes('Asistió') && !b.estadoAsistencia.includes('Asistió')) return -1;
    if (!a.estadoAsistencia.includes('Asistió') && b.estadoAsistencia.includes('Asistió')) return 1;
    return a.nombre.localeCompare(b.nombre);
  });

  // Mapear al formato tabular estructurado final
  const dataToExport = consolidated.map((item, idx) => ({
    "#": idx + 1,
    "Origen / Categoría": item.origen,
    "Nombre": item.nombre,
    "Empresa": item.empresa,
    "Cargo / Puesto": item.cargo,
    "Estado Asistencia": item.estadoAsistencia,
    "Hora de Impresión / Asistencia": item.horaImpresion,
    "Correo Electrónico": item.correo,
    "Teléfono / Celular": item.celular,
    "Ciudad": item.ciudad,
    "Cantidad de Empleados": item.empleados,
    "Patrocinador / Detalle": item.patrocinadorDetalle
  }));

  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  // Auto-ajustar anchos de columnas
  const colWidths = Object.keys(dataToExport[0] || {}).map(key => {
    const maxLen = Math.max(
      key.length,
      ...dataToExport.map(row => String(row[key] || '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Base Consolidada");
  
  const todayStr = new Date().toISOString().split('T')[0];
  const baseFileName = `Base_Consolidada_ExpoFerre_${todayStr}`;

  // 1. Descarga del archivo EXCEL (.xlsx)
  if (format === 'excel' || format === 'both') {
    XLSX.writeFile(workbook, `${baseFileName}.xlsx`);
  }

  // 2. Descarga del archivo CSV (.csv) con BOM UTF-8 (\uFEFF) para visualización perfecta de tildes y ñ
  if (format === 'csv' || format === 'both') {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.setAttribute('download', `${baseFileName}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
  }

  return {
    totalRecords: dataToExport.length,
    fileName: baseFileName,
    format
  };
}

/**
 * Exporta la base consolidada completa de EXPO FERRE 2026 exclusivamente en formato CSV (.csv)
 */
export async function exportConsolidatedBaseToCSV() {
  return exportConsolidatedBaseToExcel({ format: 'csv' });
}
