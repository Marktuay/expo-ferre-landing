import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';

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

// Lista de 4 contactos enviada por el usuario para Grupo Q:
const rawGrupoQList = [
  { nombre: "Steven", empresa: "G&R TECNOLOGIA", email: "steven.gaitan@gyr-tecnologia.com.ni", telefono: "50584728584" },
  { nombre: "Richard", empresa: "FERRETERIA BLAN CASA", email: "richardblandon96@gmail.com", telefono: "50587832020" },
  { nombre: "Edgardo", empresa: "FERRETERIA VALLE", email: "josevalle488.jrvp@gmail.com", telefono: "50586369095" },
  { nombre: "Fenix", empresa: "CONSTRUCCIONES DUARTE", email: "fenixduarte09@gmail.com", telefono: "50584379474" }
];

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

function formatPhoneE164(raw) {
  const norm8 = normalizePhone(raw);
  if (!norm8 || norm8.length < 8) return raw ? String(raw).trim() : null;
  return `+505${norm8}`;
}

function generateUniqueToken() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `inv_${Date.now().toString(36)}_${rand}`;
}

async function run() {
  console.log(`=== AUDITORÍA Y CARGA DE NUEVOS CONTACTOS: GRUPO Q (CHEVROLET) ===`);
  console.log(`Contactos recibidos para procesar: ${rawGrupoQList.length}`);

  // 1. Obtener todas las invitaciones directas existentes
  const directSnap = await getDocs(collection(db, 'events/2026/directInvites'));
  console.log(`Total de invitaciones directas en el sistema: ${directSnap.size}`);

  // 2. Obtener preregistros para evitar cruces
  const preregSnap = await getDocs(collection(db, 'events/2026/preregistrations'));
  console.log(`Total de preregistros en el sistema: ${preregSnap.size}`);

  const phoneMap = new Map();
  const emailMap = new Map();

  directSnap.forEach(d => {
    const data = d.data();
    const phone8 = normalizePhone(data.telefono || data.registeredPhone);
    const email = (data.email || data.registeredEmail || '').trim().toLowerCase();
    const info = {
      sponsor: data.sponsorName || data.sponsorId,
      nombre: data.nombre || data.registeredName,
      empresa: data.empresa || data.registeredCompany,
      collection: 'directInvites',
      id: d.id,
      status: data.status
    };
    if (phone8) phoneMap.set(phone8, info);
    if (email) emailMap.set(email, info);
  });

  preregSnap.forEach(d => {
    const data = d.data();
    const phone8 = normalizePhone(data.phone || data.telefono || data.celular);
    const email = (data.email || data.correo || '').trim().toLowerCase();
    const info = {
      sponsor: data.sponsorName || 'Preregistro Directo',
      nombre: data.name || `${data.nombre || ''} ${data.apellido || ''}`.trim(),
      empresa: data.company || data.empresa,
      collection: 'preregistrations',
      id: d.id,
      status: data.status
    };
    if (phone8 && !phoneMap.has(phone8)) phoneMap.set(phone8, info);
    if (email && !emailMap.has(email)) emailMap.set(email, info);
  });

  // 3. Evaluar cada uno de los contactos
  const toInsert = [];
  const skipped = [];
  const warnings = [];

  for (const item of rawGrupoQList) {
    const phone8 = normalizePhone(item.telefono);
    const cleanEmail = item.email ? item.email.trim().toLowerCase() : null;

    let duplicateMatch = null;

    if (phone8 && phoneMap.has(phone8)) {
      duplicateMatch = { ...phoneMap.get(phone8), matchedField: `Teléfono (***${phone8})` };
    } else if (cleanEmail && emailMap.has(cleanEmail)) {
      duplicateMatch = { ...emailMap.get(cleanEmail), matchedField: `Email (${cleanEmail})` };
    }

    if (duplicateMatch) {
      warnings.push({
        contacto: `${item.nombre} (${item.empresa || 'S/E'})`,
        alerta: `Coincide con registro previo: [${duplicateMatch.matchedField}] en ${duplicateMatch.sponsor} (${duplicateMatch.nombre} - ${duplicateMatch.empresa})`
      });
      skipped.push({
        contacto: `${item.nombre} (${item.empresa || 'S/E'})`,
        motivo: `Ya figura en el sistema: ${duplicateMatch.sponsor} (${duplicateMatch.nombre})`
      });
    } else {
      toInsert.push(item);
      if (phone8) phoneMap.set(phone8, { sponsor: 'Grupo Q (Chevrolet)', nombre: item.nombre, empresa: item.empresa });
      if (cleanEmail) emailMap.set(cleanEmail, { sponsor: 'Grupo Q (Chevrolet)', nombre: item.nombre, empresa: item.empresa });
    }
  }

  console.log(`\n--- RESULTADO DE LA AUDITORÍA ---`);
  console.log(`Nuevos contactos listos para insertar en Grupo Q: ${toInsert.length}`);
  console.log(`Contactos omitidos: ${skipped.length}`);

  if (skipped.length > 0) {
    console.log(`\nDetalle de omitidos:`);
    skipped.forEach((s, i) => console.log(`  ${i + 1}. ${s.contacto} -> ${s.motivo}`));
  }

  if (warnings.length > 0) {
    console.log(`\nAlertas:`);
    warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w.contacto} -> ${w.alerta}`));
  }

  if (toInsert.length === 0) {
    console.log('\nNo hay contactos nuevos por insertar.');
    process.exit(0);
  }

  // 4. Inserción atómica en directInvites y directInvites_backup
  const batch = writeBatch(db);
  const insertedDetails = [];

  for (const item of toInsert) {
    const tokenId = generateUniqueToken();
    const docRef = doc(db, 'events/2026/directInvites', tokenId);
    const backupRef = doc(db, 'events/2026/directInvites_backup', tokenId);

    const docData = {
      token: tokenId,
      nombre: item.nombre.trim(),
      empresa: item.empresa.trim(),
      email: item.email ? item.email.trim().toLowerCase() : null,
      telefono: formatPhoneE164(item.telefono),
      sponsorId: 'grupo_q',
      sponsorName: 'Grupo Q (Chevrolet)',
      sponsorStands: 'Área de Exhibición Exterior - Flota Chevrolet',
      headerBannerUrl: 'https://cdn.jsdelivr.net/gh/Marktuay/expo-ferre-landing@main/public/headers/CHEVROLET.png',
      footerBannerUrl: 'https://expoferrenicaragua.com/email-footer.png',
      status: 'pending',
      createdBy: 'admin_bulk_import_grupo_q',
      createdAt: serverTimestamp(),
      isBulkImport: true
    };

    batch.set(docRef, docData);
    batch.set(backupRef, docData);

    insertedDetails.push({
      id: tokenId,
      nombre: docData.nombre,
      empresa: docData.empresa,
      email: docData.email,
      telefono: docData.telefono,
      link: `https://expoferrenicaragua.com/invitacion/${tokenId}`
    });
  }

  await batch.commit();
  console.log(`\n✅ ${toInsert.length} invitaciones insertadas con éxito en directInvites y directInvites_backup.`);
  console.log(`\n--- LISTA DE ENLACES GENERADOS PARA GRUPO Q ---`);
  insertedDetails.forEach((d, i) => {
    console.log(`${i + 1}. ${d.nombre} | ${d.empresa} | ${d.email} | ${d.telefono}`);
    console.log(`   Enlace Gafete: ${d.link}\n`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error("Error fatal ejecutando la carga:", err);
  process.exit(1);
});
