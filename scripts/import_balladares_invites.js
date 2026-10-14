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

// Lista enviada por el usuario:
const rawBalladaresList = [
  { nombre: "Xochilt", empresa: "Comercializadora Castellon", email: "Xochilt.lopez.13@outlook.com", telefono: "50581448052" },
  { nombre: "Nestor", empresa: "Mini Ferretería Jireth", email: "Ferreteriajireh97@gmail.com", telefono: "50577904978" },
  { nombre: "Jackson", empresa: "Venta de Materiales Enmanuelito", email: "jassarysvaleskajarquinzamora@gmail.com", telefono: "50586378941" },
  { nombre: "Kelly", empresa: "Ferreteria Copimatsa", email: "kelly_ruiz13@yahoo.es", telefono: "50587200699" },
  { nombre: "Melissa", empresa: "Ferretería Guapilux", email: "melissagarcia.mg060203@gmail.com", telefono: "50587348627" },
  { nombre: "Anabell", empresa: "Ferreteria Valenzuela", email: "danilojar12@gmail.com", telefono: "50587257959" },
  { nombre: "Urania", empresa: "Ferreteria Zamora", email: "ucmc0115@gmail.com", telefono: "50582339413" },
  { nombre: "Tania", empresa: "", email: "tania15solano@hotmail.com", telefono: "50583917727" },
  { nombre: "Julio Andres", empresa: "", email: null, telefono: "50587521468" },
  { nombre: "Roberto", empresa: "Ferreteria Linda", email: "Ferreterialapista413@gmail.com", telefono: "50588426322" },
  { nombre: "Claudia", empresa: "Ferretería Flores", email: null, telefono: "505888829128" },
  { nombre: "Melba", empresa: "Ferretería El buen amigo", email: null, telefono: "50586235378" },
  { nombre: "Lilliam", empresa: "Ferreteria el Baratillo", email: null, telefono: "50582051382" }
];

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  // Extraer los últimos 8 dígitos (número local Nicaragua)
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
  console.log(`=== AUDITORÍA Y CARGA DE NUEVOS CONTACTOS: BALLADARES ===`);
  console.log(`Contactos recibidos para procesar: ${rawBalladaresList.length}`);

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

  // 3. Evaluar cada uno de los 13 contactos
  const toInsert = [];
  const skipped = [];
  const warnings = [];

  for (const item of rawBalladaresList) {
    const phone8 = normalizePhone(item.telefono);
    const cleanEmail = item.email ? item.email.trim().toLowerCase() : null;

    let duplicateMatch = null;

    if (phone8 && phoneMap.has(phone8)) {
      duplicateMatch = { ...phoneMap.get(phone8), matchedField: `Teléfono (***${phone8})` };
    } else if (cleanEmail && emailMap.has(cleanEmail)) {
      duplicateMatch = { ...emailMap.get(cleanEmail), matchedField: `Email (${cleanEmail})` };
    }

    if (duplicateMatch) {
      const isSameBalladares = (duplicateMatch.sponsor || '').toLowerCase().includes('balladares');
      if (isSameBalladares) {
        skipped.push({
          contacto: `${item.nombre} (${item.empresa || 'S/E'})`,
          motivo: `Ya registrado previamente en Balladares [${duplicateMatch.matchedField}] -> Doc: ${duplicateMatch.id}`
        });
      } else {
        warnings.push({
          contacto: `${item.nombre} (${item.empresa || 'S/E'})`,
          alerta: `Coincide con otro patrocinador/registro: [${duplicateMatch.matchedField}] en ${duplicateMatch.sponsor} (${duplicateMatch.nombre} - ${duplicateMatch.empresa})`
        });
        // Si es de otro patrocinador, ¿lo omitimos para proteger la exclusividad?
        // Sí, según política de des-duplicación entre patrocinadores
        skipped.push({
          contacto: `${item.nombre} (${item.empresa || 'S/E'})`,
          motivo: `Ya figura en otra lista: ${duplicateMatch.sponsor} (${duplicateMatch.nombre})`
        });
      }
    } else {
      toInsert.push(item);
      // Registrar en los mapas temporales para evitar duplicados dentro del mismo lote
      if (phone8) phoneMap.set(phone8, { sponsor: 'Importaciones Balladares Nicaragua', nombre: item.nombre, empresa: item.empresa });
      if (cleanEmail) emailMap.set(cleanEmail, { sponsor: 'Importaciones Balladares Nicaragua', nombre: item.nombre, empresa: item.empresa });
    }
  }

  console.log(`\n--- RESULTADO DE LA AUDITORÍA ---`);
  console.log(`Nuevos contactos listos para insertar en Balladares: ${toInsert.length}`);
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
      empresa: (item.empresa || '').trim(),
      email: item.email ? item.email.trim().toLowerCase() : null,
      telefono: formatPhoneE164(item.telefono),
      sponsorId: 'importaciones_balladares',
      sponsorName: 'Importaciones Balladares Nicaragua',
      sponsorStands: 'Stand 16, Stand 6',
      headerBannerUrl: 'https://cdn.jsdelivr.net/gh/Marktuay/expo-ferre-landing@main/public/headers/balladares.png',
      footerBannerUrl: 'https://expoferrenicaragua.com/email-footer.png',
      status: 'pending',
      createdBy: 'admin_bulk_import_balladares',
      createdAt: serverTimestamp(),
      isBulkImport: true
    };

    batch.set(docRef, docData);
    batch.set(backupRef, docData);

    insertedDetails.push({
      tokenId,
      nombre: docData.nombre,
      empresa: docData.empresa || 'N/A',
      email: docData.email || 'N/A',
      telefono: docData.telefono || 'N/A'
    });
  }

  await batch.commit();
  console.log(`\n✅ ¡${insertedDetails.length} invitaciones insertadas y respaldadas exitosamente en Balladares!`);

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
