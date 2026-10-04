import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const firebaseConfig = {
  apiKey: "AIzaSyAQu0JsNZtGMIen7eTb4XWW2zxuMGRbX8o",
  authDomain: "expo-ferre-backend.firebaseapp.com",
  projectId: "expo-ferre-backend",
  storageBucket: "expo-ferre-backend.firebasestorage.app",
  messagingSenderId: "472537343080",
  appId: "1:472537343080:web:451f4087a26564fc9d87dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BASE_PATH = 'events/2026';

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

async function runAutoBackup() {
  const startTime = Date.now();
  console.log('====================================================');
  console.log(`[${new Date().toISOString()}] INICIANDO RESPALDO AUTOMÁTICO DE FIRESTORE (12 COLECCIONES)`);
  console.log('====================================================');

  const summary = {};
  const exportData = {};
  let totalDocs = 0;
  const snapshotDate = new Date();
  const dateStr = snapshotDate.toISOString().replace(/[:.]/g, '-');
  const snapshotId = `snapshot_${dateStr}`;

  for (let i = 0; i < TARGET_COLLECTIONS.length; i++) {
    const colName = TARGET_COLLECTIONS[i];
    const isGlobal = colName === 'users';
    const sourcePath = isGlobal ? 'users' : `${BASE_PATH}/${colName}`;
    const backupPath = isGlobal ? 'users_backup' : `${BASE_PATH}/${colName}_backup`;
    exportData[colName] = [];

    process.stdout.write(`[${i + 1}/12] Respaldando '${colName}'... `);

    try {
      const snap = await getDocs(collection(db, sourcePath));
      let count = 0;

      if (!snap.empty) {
        let currentBatch = writeBatch(db);
        let opCount = 0;

        const maxOpsPerBatch = colName === 'sponsorSettings' ? 4 : 200;

        for (const d of snap.docs) {
          const docData = d.data();

          // 1. Colección espejo (_backup)
          const backupRef = doc(db, backupPath, d.id);
          currentBatch.set(backupRef, docData, { merge: true });
          opCount++;

          // 2. Historial de snapshots
          const historyRef = doc(db, `firestore_snapshots/${snapshotId}/${colName}`, d.id);
          currentBatch.set(historyRef, docData, { merge: true });
          opCount++;

          // 3. Objeto para JSON
          exportData[colName].push({
            id: d.id,
            ...docData
          });

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
      console.log(`OK (${count} docs)`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      summary[colName] = 0;
    }
  }

  // Guardar metadata en Firestore
  const metaRef = doc(db, 'firestore_snapshots', snapshotId);
  await setDoc(metaRef, {
    snapshotId,
    createdAt: snapshotDate,
    totalDocuments: totalDocs,
    summary,
    trigger: 'automated_cron'
  });

  // Guardar archivo JSON local en carpeta /backups
  const backupsDir = path.join(rootDir, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const fileName = `ExpoFerre_Backup_${snapshotDate.toISOString().slice(0, 10)}_${dateStr.slice(11, 19)}.json`;
  const filePath = path.join(backupsDir, fileName);

  const payload = {
    meta: {
      platform: 'ExpoFerre 2026 Admin Automated Backup',
      snapshotId,
      createdAt: snapshotDate.toISOString(),
      totalDocuments: totalDocs,
      summary
    },
    data: exportData
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`💾 Archivo local generado con éxito: backups/${fileName}`);

  // Limpieza de respaldos antiguos (conservar los últimos 30 archivos)
  try {
    const existingFiles = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('ExpoFerre_Backup_') && f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (existingFiles.length > 30) {
      const filesToDelete = existingFiles.slice(30);
      for (const f of filesToDelete) {
        fs.unlinkSync(path.join(backupsDir, f.name));
        console.log(`🗑️ Eliminado respaldo antiguo: ${f.name}`);
      }
    }
  } catch (cleanErr) {
    console.warn('Advertencia limpiando respaldos antiguos:', cleanErr.message);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('====================================================');
  console.log(`✅ RESPALDO AUTOMÁTICO COMPLETADO EXITOSAMENTE`);
  console.log(`Total documentos protegidos: ${totalDocs}`);
  console.log(`Tiempo transcurrido: ${elapsed} segundos`);
  console.log('====================================================');

  process.exit(0);
}

runAutoBackup().catch((err) => {
  console.error('❌ Error fatal en respaldo automático:', err);
  process.exit(1);
});
