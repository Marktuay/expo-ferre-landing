import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
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
 * de forma ultra rápida usando writeBatch, y además genera la descarga automática de un archivo .JSON con todos los datos.
 */
export async function createFullFirestoreBackup(db, { triggerDownload = true, onProgress } = {}) {
  const basePath = getEventBasePath();
  const summary = {};
  const exportData = {};
  let totalDocs = 0;
  const snapshotDate = new Date();
  const snapshotId = `snapshot_${snapshotDate.toISOString().replace(/[:.]/g, '-')}`;

  for (let i = 0; i < TARGET_COLLECTIONS.length; i++) {
    const colName = TARGET_COLLECTIONS[i];
    if (onProgress) {
      onProgress(`Respaldando ${colName} (${i + 1}/${TARGET_COLLECTIONS.length})...`);
    }

    const isGlobal = colName === 'users';
    const sourcePath = isGlobal ? 'users' : `${basePath}/${colName}`;
    const backupPath = isGlobal ? 'users_backup' : `${basePath}/${colName}_backup`;
    exportData[colName] = [];

    try {
      const snap = await getDocs(collection(db, sourcePath));
      let count = 0;

      if (!snap.empty) {
        let currentBatch = writeBatch(db);
        let opCount = 0;

        const maxOpsPerBatch = colName === 'sponsorSettings' ? 4 : 200;

        for (const d of snap.docs) {
          const docData = d.data();

          // 1. Guardar en colección de respaldo espejo (_backup)
          const backupRef = doc(db, backupPath, d.id);
          currentBatch.set(backupRef, docData, { merge: true });
          opCount++;

          // 2. Guardar en historial inmutable indexado por snapshotId
          const historyRef = doc(db, `firestore_snapshots/${snapshotId}/${colName}`, d.id);
          currentBatch.set(historyRef, docData, { merge: true });
          opCount++;

          // 3. Paquete JSON
          exportData[colName].push({
            id: d.id,
            ...docData
          });

          count++;

          // Límite de Firestore es 10MB por request (sponsorSettings tiene imágenes base64)
          if (opCount >= maxOpsPerBatch) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        }

        if (opCount > 0) {
          await currentBatch.commit();
        }
      }
      summary[colName] = count;
      totalDocs += count;
    } catch (err) {
      console.error(`Error respaldando colección ${colName}:`, err);
      summary[colName] = 0;
    }
  }

  if (onProgress) {
    onProgress('Registrando snapshot y generando archivo JSON...');
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
export async function restoreFullFirestoreBackup(db, { onProgress } = {}) {
  const basePath = getEventBasePath();
  const summary = {};
  let totalDocs = 0;

  for (let i = 0; i < TARGET_COLLECTIONS.length; i++) {
    const colName = TARGET_COLLECTIONS[i];
    if (onProgress) {
      onProgress(`Restaurando ${colName} (${i + 1}/${TARGET_COLLECTIONS.length})...`);
    }

    const isGlobal = colName === 'users';
    const activePath = isGlobal ? 'users' : `${basePath}/${colName}`;
    const backupPath = isGlobal ? 'users_backup' : `${basePath}/${colName}_backup`;

    try {
      const backupSnap = await getDocs(collection(db, backupPath));
      let count = 0;

      if (!backupSnap.empty) {
        let currentBatch = writeBatch(db);
        let opCount = 0;
        const maxOpsPerBatch = colName === 'sponsorSettings' ? 2 : 200;

        for (const d of backupSnap.docs) {
          const activeRef = doc(db, activePath, d.id);
          currentBatch.set(activeRef, d.data(), { merge: true });
          opCount++;
          count++;

          if (opCount >= maxOpsPerBatch) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        }

        if (opCount > 0) {
          await currentBatch.commit();
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
