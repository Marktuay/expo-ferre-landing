import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

export async function exportConsolidatedBaseToExcel() {
  const basePath = getEventBasePath();
  const consolidated = [];

  // 1. Preregistros
  try {
    const preregSnap = await getDocs(query(collection(db, `${basePath}/preregistrations`)));
    preregSnap.forEach(doc => {
      const d = doc.data();
      const nombreCompleto = d.name || `${d.nombre || d.firstName || ''} ${d.apellido || d.lastName || ''}`.trim() || 'Sin Nombre';
      consolidated.push({
        origen: 'Preregistro',
        nombre: nombreCompleto,
        correo: d.email || d.correo || 'N/A',
        empresa: d.company || d.empresa || 'N/A',
        empleados: d.tamanoEmpresa || d.companySize || d.empleados || d.cantEmpleados || 'N/A',
        tipoInvitacion: d.status === 'approved' ? 'Preregistro General (Aprobado)' : (d.status === 'no_show' ? 'Preregistro No Asistió' : 'Preregistro General'),
        ciudad: d.city || d.ciudad || d.departamento || d.pais || 'N/A',
        celular: d.phone || d.telefono || d.celular || 'N/A'
      });
    });
  } catch (err) {
    console.error("Error cargando preregistros para exportación:", err);
  }

  // 2. Patrocinadores
  try {
    const usersSnap = await getDocs(query(collection(db, `users`)));
    usersSnap.forEach(doc => {
      const d = doc.data();
      if (d.role === 'sponsor' || d.categoria || d.empresa) {
        const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.trim() || d.contact || d.empresa || 'Patrocinador';
        consolidated.push({
          origen: 'Patrocinador',
          nombre: nombreCompleto,
          correo: d.correo || d.email || 'N/A',
          empresa: d.empresa || d.company || 'N/A',
          empleados: d.empleados || d.tamanoEmpresa || d.companySize || 'N/A',
          tipoInvitacion: d.categoria ? `Patrocinador ${d.categoria}` : 'Patrocinador Oficial',
          ciudad: d.ciudad || d.city || d.departamento || 'Managua',
          celular: d.telefono || d.phone || d.celular || 'N/A'
        });
      }
    });
  } catch (err) {
    console.error("Error cargando patrocinadores para exportación:", err);
  }

  // 3. Invitados VIP
  try {
    const guestsSnap = await getDocs(query(collection(db, `${basePath}/guests`)));
    guestsSnap.forEach(doc => {
      const d = doc.data();
      const nombreCompleto = d.name || `${d.nombre || ''} ${d.apellido || ''}`.trim() || 'Invitado VIP';
      consolidated.push({
        origen: 'Invitado',
        nombre: nombreCompleto,
        correo: d.email || d.correo || 'N/A',
        empresa: d.company || d.empresa || d.sponsorCompany || 'N/A',
        empleados: d.tamanoEmpresa || d.empleados || d.companySize || 'N/A',
        tipoInvitacion: d.sponsorCompany ? `Invitado VIP (${d.sponsorCompany})` : 'Invitado VIP',
        ciudad: d.city || d.ciudad || d.departamento || 'N/A',
        celular: d.phone || d.telefono || d.celular || 'N/A'
      });
    });
  } catch (err) {
    console.error("Error cargando invitados para exportación:", err);
  }

  // 4. Staff
  try {
    const staffSnap = await getDocs(query(collection(db, `${basePath}/staff`)));
    staffSnap.forEach(doc => {
      const d = doc.data();
      const nombreCompleto = d.name || `${d.nombre || ''} ${d.apellido || ''}`.trim() || 'Staff';
      consolidated.push({
        origen: 'Staff',
        nombre: nombreCompleto,
        correo: d.email || d.correo || 'N/A',
        empresa: d.company || d.empresa || d.sponsorCompany || 'ExpoFerre',
        empleados: d.tamanoEmpresa || d.empleados || 'N/A',
        tipoInvitacion: d.role ? `Staff (${d.role})` : (d.sponsorCompany ? `Staff Patrocinador (${d.sponsorCompany})` : 'Staff Acreditado'),
        ciudad: d.city || d.ciudad || 'N/A',
        celular: d.phone || d.telefono || d.celular || 'N/A'
      });
    });
  } catch (err) {
    console.error("Error cargando staff para exportación:", err);
  }

  // 5. Conferencistas (Speakers)
  try {
    const speakersSnap = await getDocs(query(collection(db, `${basePath}/speakers`)));
    speakersSnap.forEach(doc => {
      const d = doc.data();
      const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.trim() || d.name || 'Conferencista';
      consolidated.push({
        origen: 'Conferencista',
        nombre: nombreCompleto,
        correo: d.email || d.correo || 'N/A',
        empresa: d.empresa || d.company || d.sponsorCompany || 'N/A',
        empleados: d.tamanoEmpresa || d.empleados || 'N/A',
        tipoInvitacion: d.titulo ? `Speaker - "${d.titulo}"` : 'Speaker / Conferencista',
        ciudad: d.ciudad || d.city || 'N/A',
        celular: d.telefono || d.phone || d.celular || 'N/A'
      });
    });
  } catch (err) {
    console.error("Error cargando conferencistas para exportación:", err);
  }

  // Map to exact required column names requested by user
  const dataToExport = consolidated.map(item => ({
    "Origen": item.origen,
    "Nombre": item.nombre,
    "Correo": item.correo,
    "Empresa": item.empresa,
    "Cantidad de empleados": item.empleados,
    "Tipo de invitacion": item.tipoInvitacion,
    "Ciudad": item.ciudad,
    "Celular": item.celular
  }));

  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Base Consolidada");
  
  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Base_Consolidada_ExpoFerre_${todayStr}.xlsx`);
}
