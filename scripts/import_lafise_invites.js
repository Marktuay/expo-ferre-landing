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

// Lista original de 18 filas enviada por el usuario para LAFISE:
const rawLafiseList = [
  { nombre: "Josue Efrain", empresa: "FERRETERIA MEYRELIN", email: "JOSUE.BLANDON.JB@GMAIL.COM", telefono: "50586474802" },
  { nombre: "Edwin Jose", empresa: "FERRETERIA OSEJO JUNIOR", email: "GARCIAOSEJO@GMAIL.COM", telefono: "50583900486" },
  { nombre: "COMERCIAL FERRETERA,S.A", empresa: "COMERCIAL FERRETERA,S.A", email: "VENTAS.COFERSA18@GMAIL.COM", telefono: "50584965492" },
  { nombre: "Jahaxa de Los Angeles", empresa: "FERRETERIA RUIZ CARDOZA", email: "ANGELES2014CARDOZA@GMAIL.COM", telefono: "50588684573" },
  { nombre: "Luis Armando", empresa: "IMPORTACIONES BETANCO", email: "GERENCIA@IMPORTACIONESBETANCO.COM", telefono: "50588550246" },
  { nombre: "Luisa", empresa: "INDUSTRIAS EL AGUILA S.A", email: "ELAGUILASA3@GMAIL.COM", telefono: "50588507659" },
  { nombre: "Holma", empresa: "INVERSIONES BLANDON LEON S.A", email: "HOLMAN_BLANDON@HOTMAIL.COM", telefono: "50588539959" },
  { nombre: "Larry Antonio", empresa: "MULTISERVICIOS EL REY", email: "INVITELGERENCIA@GMAIL.COM", telefono: "50588802086" },
  { nombre: "Erick Antonio", empresa: "FERRETERIA GUADALUPE", email: "ERICKSANCHEZH@HOTMAIL.COM", telefono: "50557849444" },
  { nombre: "Danilo Encarnacion", empresa: "FERRETERIA LINDA VISTA S,A", email: "RAUL.SOMARRIBAM@YAHOO.COM", telefono: "50588525018" },
  { nombre: "Isaida Gonzalez", empresa: "FERRETERIA LITA", email: "ISAIDA_GONZALEZ@YAHOO.COM", telefono: "50588069612" },
  { nombre: "Keylin Yisselt", empresa: "FERRETERIA JIREH", email: "KEYLINSARAVIA1996@GMAIL.COM", telefono: "50557112712" },
  { nombre: "FERRETERIA LITA", empresa: "FERRETERIA LITA", email: "Isaida Gonzalez   isaida_gonzalez@yahoo.com", telefono: "50588069612" },
  { nombre: "Freddy Jose", empresa: "FERRETERIA SHEIDDY", email: "ARELISGUATEMALA66@GMAIL.COM", telefono: "50581767852" },
  { nombre: "Marlon Jhosep", empresa: "EL CHELE FERRETERIA", email: "MARLONVARGASRAMIREZ@GMAIL.COM", telefono: "50589887789" },
  { nombre: "Oscar Danilo", empresa: "FERRETERIA LA COMPLETA", email: "OSCARGAITANLOPEZ05@GMAIL.COM", telefono: "50586541725" },
  { nombre: "Julio", empresa: "LAFISE", email: "jvega@lafise.com", telefono: "50588827065" },
  { nombre: "Rey David", empresa: "LAFISE", email: "rdgonzalez@lafise.com", telefono: "50576526486" }
];

function extractEmail(raw) {
  if (!raw) return null;
  const match = String(raw).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase().trim() : null;
}

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
  console.log(`=== AUDITORÍA Y CARGA DE INVITACIONES DIRECTAS: LAFISE ===`);
  console.log(`Filas recibidas en la lista: ${rawLafiseList.length}`);

  // 1. Deduplicación interna de la lista recibida
  const seenEmailsInInput = new Set();
  const seenPhonesInInput = new Set();
  const uniqueInputList = [];
  const internalDuplicates = [];

  for (const item of rawLafiseList) {
    const cleanEmail = extractEmail(item.email);
    const normPhone = normalizePhone(item.telefono);

    if ((cleanEmail && seenEmailsInInput.has(cleanEmail)) || (normPhone && seenPhonesInInput.has(normPhone))) {
      internalDuplicates.push({ ...item, cleanEmail, normPhone });
      continue;
    }

    if (cleanEmail) seenEmailsInInput.add(cleanEmail);
    if (normPhone) seenPhonesInInput.add(normPhone);

    uniqueInputList.push({
      nombre: item.nombre.trim(),
      empresa: (item.empresa || 'Invitado LAFISE').trim(),
      email: cleanEmail,
      telefono: formatPhoneE164(item.telefono),
      normPhone
    });
  }

  console.log(`Duplicados dentro de la misma lista enviados (${internalDuplicates.length}):`);
  for (const dup of internalDuplicates) {
    console.log(`  - [OMITIDO DUPLICADO INTERNO] ${dup.nombre} | ${dup.empresa} | ${dup.cleanEmail} | ${dup.normPhone}`);
  }

  // 2. Consultar todos los documentos actuales en Firestore events/2026/directInvites
  const snap = await getDocs(collection(db, 'events/2026/directInvites'));
  const existingInvites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total de invitaciones actuales en Firestore: ${existingInvites.length}`);

  const existingLafiseInvites = existingInvites.filter(
    i => (i.sponsorId || '').toLowerCase() === 'lafise' || (i.sponsorName || '').toLowerCase().includes('lafise')
  );
  console.log(`Invitaciones actuales en la lista de LAFISE: ${existingLafiseInvites.length}`);

  const batch = writeBatch(db);
  const toInsert = [];
  const skippedExistingLafise = [];
  const crossSponsorMatches = [];

  for (const item of uniqueInputList) {
    // Verificar si ya existe en LAFISE
    const alreadyInLafise = existingLafiseInvites.find(ex => {
      const exEmail = extractEmail(ex.email);
      const exPhone = normalizePhone(ex.telefono);
      return (item.email && exEmail === item.email) || (item.normPhone && exPhone === item.normPhone);
    });

    if (alreadyInLafise) {
      skippedExistingLafise.push({ item, existing: alreadyInLafise });
      continue;
    }

    // Verificar si aparece en otra lista de patrocinador (solo informativo o según política)
    const inOtherSponsor = existingInvites.filter(ex => {
      const isLafise = (ex.sponsorId || '').toLowerCase() === 'lafise' || (ex.sponsorName || '').toLowerCase().includes('lafise');
      if (isLafise) return false;
      const exEmail = extractEmail(ex.email);
      const exPhone = normalizePhone(ex.telefono);
      return (item.email && exEmail === item.email) || (item.normPhone && exPhone === item.normPhone);
    });

    if (inOtherSponsor.length > 0) {
      crossSponsorMatches.push({
        item,
        sponsors: inOtherSponsor.map(o => `${o.sponsorName || 'General'} (${o.nombre})`)
      });
    }

    const tokenId = generateUniqueToken();
    const docRef = doc(db, 'events/2026/directInvites', tokenId);
    const backupRef = doc(db, 'events/2026/directInvites_backup', tokenId);

    const docData = {
      token: tokenId,
      nombre: item.nombre,
      empresa: item.empresa,
      email: item.email,
      telefono: item.telefono,
      sponsorId: 'lafise',
      sponsorName: 'LAFISE',
      sponsorStands: 'Stand 26',
      headerBannerUrl: 'https://cdn.jsdelivr.net/gh/Marktuay/expo-ferre-landing@main/public/headers/LAFISE.png',
      footerBannerUrl: 'https://expoferrenicaragua.com/email-footer.png',
      status: 'pending',
      createdBy: 'admin_bulk_import_lafise',
      createdAt: serverTimestamp(),
      isBulkImport: true
    };

    batch.set(docRef, docData);
    batch.set(backupRef, docData);
    toInsert.push({ tokenId, ...docData });
  }

  if (skippedExistingLafise.length > 0) {
    console.log(`\nYa existían en LAFISE y no se duplicaron (${skippedExistingLafise.length}):`);
    for (const s of skippedExistingLafise) {
      console.log(`  - ${s.item.nombre} (${s.item.email} / ${s.item.telefono}) -> ID existente: ${s.existing.id}`);
    }
  }

  if (crossSponsorMatches.length > 0) {
    console.log(`\nNota: Contactos que también aparecen invitados por otro patrocinador (${crossSponsorMatches.length}):`);
    for (const c of crossSponsorMatches) {
      console.log(`  - ${c.item.nombre} (${c.item.empresa}) -> También en: ${c.sponsors.join(', ')}`);
    }
  }

  if (toInsert.length > 0) {
    await batch.commit();
    console.log(`\n✅ Se insertaron exitosamente ${toInsert.length} invitados únicos en la lista de LAFISE:`);
    toInsert.forEach((ins, idx) => {
      console.log(`  ${idx + 1}. ${ins.nombre} | ${ins.empresa} | ${ins.email} | ${ins.telefono} (ID: ${ins.tokenId})`);
    });
  } else {
    console.log(`\nℹ️ No hubo nuevos registros por insertar (todos ya existían).`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Error ejecutando script LAFISE:", err);
  process.exit(1);
});
