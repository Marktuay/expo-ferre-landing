/**
 * Extrae la fecha/hora de impresión o asistencia de un registro de Firestore.
 * Prioriza badgePrintedAt, luego checkInTime y attendedAt.
 */
export function getPrintDateObj(item) {
  if (!item) return null;
  if (item instanceof Date) {
    return isNaN(item.getTime()) ? null : item;
  }
  if (typeof item?.toDate === 'function') {
    const d = item.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  const raw = item.badgePrintedAt || item.checkInTime || item.attendedAt || null;
  if (!raw) return null;
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw?.toDate === 'function') {
    const d = raw.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw?.seconds === 'number') {
    return new Date(raw.seconds * 1000);
  }
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formato corto para mostrar junto al badge "✅ ASISTIÓ (IMPRESO)" en las tablas:
 * Ej: "10:45 a. m. (17/10)"
 */
export function formatPrintTime(item) {
  const date = getPrintDateObj(item);
  if (!date) return null;
  const timeStr = date.toLocaleTimeString('es-NI', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const dateStr = date.toLocaleDateString('es-NI', {
    day: '2-digit',
    month: '2-digit'
  });
  return `${timeStr} (${dateStr})`;
}

/**
 * Formato completo para tooltips y exportaciones a Excel:
 * Ej: "17/10/2026, 10:45:12 a. m."
 */
export function formatPrintDateTimeFull(item) {
  const date = getPrintDateObj(item);
  if (!date) return '';
  return date.toLocaleString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}
