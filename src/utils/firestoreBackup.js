import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

export const TARGET_COLLECTIONS = [
  'users',
  'stands',
  'preregistrations',
  'directInvites',
  'sponsorSettings',
  'juryEvaluations',
  'invitedJudges',
  'guests',
  'staff',
  'speakers',
  'contacts',
  'systemUsers'
];

/**
 * Crea una copia de respaldo instantánea en Firestore de todas las colecciones principales del sistema
 * y además genera la descarga automática de un archivo .JSON con todos los datos a la computadora.
 */
export async function createFullFirestoreBackup(db, { triggerDownload = true } = {}) {
  const basePath = getEventBasePath();
  const summary = {};
  const exportData = {};
  let totalDocs = 0;
  const snapshotDate = new Date();
  const snapshotId = `snapshot_${snapshotDate.toISOString().replace(/[:.]/g, '-')}`;

  for (const colName of TARGET_COLLECTIONS) {
    const isGlobal = colName === 'users';
    const sourcePath = isGlobal ? 'users' : `${basePath}/${colName}`;
    const backupPath = isGlobal ? 'users_backup' : `${basePath}/${colName}_backup`;
    exportData[colName] = [];

    try {
      const snap = await getDocs(collection(db, sourcePath));
      let count = 0;

      if (!snap.empty) {
        for (const d of snap.docs) {
          const docData = d.data();

          // 1. Guardar en colección de respaldo espejo (_backup)
          const backupRef = doc(db, backupPath, d.id);
          await setDoc(backupRef, docData, { merge: true });

          // 2. Guardar también una copia en el historial inmutable indexado por snapshotId
          const historyRef = doc(db, `firestore_snapshots/${snapshotId}/${colName}`, d.id);
          await setDoc(historyRef, docData, { merge: true });

          // 3. Agregar al paquete de datos para exportación JSON
          exportData[colName].push({
            id: d.id,
            ...docData
          });

          count++;
        }
      }
      summary[colName] = count;
      totalDocs += count;
    } catch (err) {
      console.error(`Error respaldando colección ${colName}:`, err);
      summary[colName] = 0;
    }
  }

  // Guardar metadata del snapshot en Firestore
  const metaRef = doc(db, 'firestore_snapshots', snapshotId);
  await setDoc(metaRef, {
    snapshotId,
    createdAt: snapshotDate,
    totalDocuments: totalDocs,
    summary
  });

  // 4. Descargar automáticamente el archivo JSON a la computadora para custodia offline segura
  if (triggerDownload && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const fullPackage = {
        meta: {
          platform: 'ExpoFerre 2026 Admin Intranet',
          snapshotId,
          createdAt: snapshotDate.toISOString(),
          totalDocuments: totalDocs,
          summary
        },
        data: exportData
      };

      const jsonStr = JSON.stringify(fullPackage, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ExpoFerre2026_Respaldo_Firestore_${snapshotDate.toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (dlErr) {
      console.warn('No se pudo disparar la descarga automática del JSON:', dlErr);
    }
  }

  return { snapshotId, totalDocs, summary };
}

/**
 * Restaura todas las colecciones activas en Firestore desde la última copia de respaldo (_backup).
 */
export async function restoreFullFirestoreBackup(db) {
  const basePath = getEventBasePath();
  const summary = {};
  let totalDocs = 0;

  for (const colName of TARGET_COLLECTIONS) {
    const isGlobal = colName === 'users';
    const activePath = isGlobal ? 'users' : `${basePath}/${colName}`;
    const backupPath = isGlobal ? 'users_backup' : `${basePath}/${colName}_backup`;

    try {
      const backupSnap = await getDocs(collection(db, backupPath));
      let count = 0;

      if (!backupSnap.empty) {
        for (const d of backupSnap.docs) {
          const activeRef = doc(db, activePath, d.id);
          await setDoc(activeRef, d.data(), { merge: true });
          count++;
        }
      }
      summary[colName] = count;
      totalDocs += count;
    } catch (err) {
      console.error(`Error restaurando colección ${colName}:`, err);
      summary[colName] = 0;
    }
  }

  return { totalDocs, summary };
}
