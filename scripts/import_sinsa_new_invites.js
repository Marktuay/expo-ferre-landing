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

// Lista de 11 contactos enviada por el usuario:
const rawSinsaList = [
  { nombre: "Ari", empresa: "SINSA", email: "ari.lopez@sinsa.com.ni", telefono: "50588625732" },
  { nombre: "Adolfo", empresa: "SINSA", email: "adolfo.lugo@sinsa.com.ni", telefono: "50575503721" },
  { nombre: "Mauricio", empresa: "SINSA", email: "mauricio.gutierrez@sinsa.com.ni", telefono: "50575305698" },
  { nombre: "Deborah", empresa: "SINSA", email: "deborah.agurto@sinsa.com.ni", telefono: "50575165418" },
  { nombre: "Cynthia", empresa: "SINSA", email: "cynthia.fitoria@sinsa.com.ni", telefono: "50578263570" },
  { nombre: "Carlos", empresa: "SINSA", email: "carlos.gonzalez@sinsa.com.ni", telefono: "50582525690" },
  { nombre: "Hazel", empresa: "SINSA", email: "hazel.cruz@sinsa.com", telefono: "50583937837" },
  { nombre: "Octavio", empresa: "SINSA", email: "octavio.palacios@sinsa.com.ni", telefono: "50576526327" },
  { nombre: "Luis Rafael", empresa: "SINSA", email: "lrsilva@sinsa.com", telefono: "50584353253" },
  { nombre: "Humberto", empresa: "Comasa", email: "humberto.calderon@sinsa.com.ni", telefono: "50575530811" },
  { nombre: "Diana", empresa: "Comasa", email: "diana.matamoros@sinsa.com.ni", telefono: "50589664987" }
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
  console.log(`=== AUDITORÍA Y CARGA DE NUEVOS CONTACTOS: SINSA ===`);
  console.log(`Contactos recibidos para procesar: ${rawSinsaList.length}`);

  // 1. Obtener todas las invitaciones directas existentes
  const directSnap = await getDocs(collection(db, 'events/2026/directInvites'));
  console.log(`Total de invitaciones directas en el sistema: ${directSnap.size}`);

  // 2. Obtener preregistros para evitar cruces con asistentes ya registrados
  const preregSnap = await getDocs(collection(db, 'events/2026/preregistrations'));
  console.log(`Total de preregistros en el sistema: ${preregSnap.size}`);

  const phoneMap = new Map(); // phone8 -> { sponsor, nombre, empresa, collection, id }
  const emailMap = new Map(); // email -> { sponsor, nombre, empresa, collection, id }

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

  // 3. Evaluar cada uno de los 11 contactos
  const toInsert = [];
  const skipped = [];
  const warnings = [];

  for (const item of rawSinsaList) {
    const phone8 = normalizePhone(item.telefono);
    const cleanEmail = item.email ? item.email.trim().toLowerCase() : null;

    let duplicateMatch = null;

    if (phone8 && phoneMap.has(phone8)) {
      duplicateMatch = { ...phoneMap.get(phone8), matchedField: `Teléfono (***${phone8})` };
    } else if (cleanEmail && emailMap.has(cleanEmail)) {
      duplicateMatch = { ...emailMap.get(cleanEmail), matchedField: `Email (${cleanEmail})` };
    }

    if (duplicateMatch) {
      const isSameSinsa = (duplicateMatch.sponsor || '').toLowerCase().includes('sinsa') ||
                          (duplicateMatch.sponsor || '').toLowerCase().includes('comasa');
      if (isSameSinsa) {
        skipped.push({
          contacto: `${item.nombre} (${item.empresa || 'S/E'})`,
          motivo: `Ya registrado previamente en SINSA/Comasa [${duplicateMatch.matchedField}] -> Doc: ${duplicateMatch.id}`
        });
      } else {
        warnings.push({
          contacto: `${item.nombre} (${item.empresa || 'S/E'})`,
          alerta: `Coincide con otro patrocinador/registro: [${duplicateMatch.matchedField}] en ${duplicateMatch.sponsor} (${duplicateMatch.nombre} - ${duplicateMatch.empresa})`
        });
        skipped.push({
          contacto: `${item.nombre} (${item.empresa || 'S/E'})`,
          motivo: `Ya figura en otra lista: ${duplicateMatch.sponsor} (${duplicateMatch.nombre})`
        });
      }
    } else {
      toInsert.push(item);
      // Registrar en los mapas temporales para evitar duplicados dentro del mismo lote
      if (phone8) phoneMap.set(phone8, { sponsor: 'SINSA', nombre: item.nombre, empresa: item.empresa });
      if (cleanEmail) emailMap.set(cleanEmail, { sponsor: 'SINSA', nombre: item.nombre, empresa: item.empresa });
    }
  }

  console.log(`\n--- RESULTADO DE LA AUDITORÍA ---`);
  console.log(`Nuevos contactos listos para insertar en SINSA: ${toInsert.length}`);
  console.log(`Contactos omitidos (ya existentes): ${skipped.length}`);

  if (skipped.length > 0) {
    console.log(`\nDetalle de omitidos:`);
    skipped.forEach((s, i) => console.log(`  ${i + 1}. ${s.contacto} -> ${s.motivo}`));
  }

  if (warnings.length > 0) {
    console.log(`\nAlertas de coincidencia con otros patrocinadores:`);
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
      empresa: (item.empresa || 'SINSA').trim(),
      email: item.email ? item.email.trim().toLowerCase() : null,
      telefono: formatPhoneE164(item.telefono),
      sponsorId: 'sinsa',
      sponsorName: 'SINSA',
      sponsorStands: 'Stands 1, 2, 3, 4',
      headerBannerUrl: 'https://cdn.jsdelivr.net/gh/Marktuay/expo-ferre-landing@main/public/headers/SINSA.png',
      footerBannerUrl: 'https://expoferrenicaragua.com/email-footer.png',
      status: 'pending',
      createdBy: 'admin_bulk_import_sinsa',
      createdAt: serverTimestamp(),
      isBulkImport: true
    };

    // Si pertenece a la división Comasa, registrar trazabilidad
    if (item.empresa && item.empresa.toLowerCase().includes('comasa')) {
      docData.division = 'COMASA (Mayorista)';
    }

    batch.set(docRef, docData);
    batch.set(backupRef, docData);

    insertedDetails.push({
      tokenId,
      nombre: docData.nombre,
      empresa: docData.empresa,
      email: docData.email || 'N/A',
      telefono: docData.telefono || 'N/A'
    });
  }

  await batch.commit();
  console.log(`\n✅ ¡${insertedDetails.length} invitaciones insertadas y respaldadas exitosamente en SINSA!`);

  console.log('\n--- DETALLE DE INVITACIONES CREADAS ---');
  insertedDetails.forEach((inv, idx) => {
    console.log(`${idx + 1}. [${inv.tokenId}] ${inv.nombre} | ${inv.empresa} | ${inv.telefono} | ${inv.email}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error('Error durante el proceso:', err);
  process.exit(1);
});
