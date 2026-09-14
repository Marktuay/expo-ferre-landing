import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

const TARGET_COLLECTIONS = [
  'users',
  'stands',
  'preregistrations',
  'guests',
  'staff',
  'speakers',
  'contacts'
];

/**
 * Crea una copia de respaldo instantánea en Firestore de todas las colecciones principales del sistema.
 */
export async function createFullFirestoreBackup(db) {
  const basePath = getEventBasePath();
  const summary = {};
  let totalDocs = 0;
  const snapshotDate = new Date();
  const snapshotId = `snapshot_${snapshotDate.toISOString().replace(/[:.]/g, '-')}`;

  for (const colName of TARGET_COLLECTIONS) {
    const isGlobal = colName === 'users';
    const sourcePath = isGlobal ? 'users' : `${basePath}/${colName}`;
    const backupPath = isGlobal ? 'users_backup' : `${basePath}/${colName}_backup`;

    try {
      const snap = await getDocs(collection(db, sourcePath));
      let count = 0;

      if (!snap.empty) {
        for (const d of snap.docs) {
          const backupRef = doc(db, backupPath, d.id);
          await setDoc(backupRef, d.data(), { merge: true });

          // Guardar también una copia en el historial inmutable indexado por snapshotId
          const historyRef = doc(db, `firestore_snapshots/${snapshotId}/${colName}`, d.id);
          await setDoc(historyRef, d.data(), { merge: true });

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

  // Guardar metadata del snapshot
  const metaRef = doc(db, 'firestore_snapshots', snapshotId);
  await setDoc(metaRef, {
    snapshotId,
    createdAt: snapshotDate,
    totalDocuments: totalDocs,
    summary
  });

  return { snapshotId, totalDocs, summary };
}

/**
 * Restaura todas las colecciones activas en Firestore desde la última copia de respaldo.
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
