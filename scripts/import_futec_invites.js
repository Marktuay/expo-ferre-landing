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

const rawFutecList = [
  { nombre: "Marco", empresa: "Ferreteria Marco Sánchez", email: null, telefono: "+50589030170" },
  { nombre: "Omar", empresa: "Ferretería Construye", email: "construyeferreteriaymas@gmail.com", telefono: "+50587963380" },
  { nombre: "Jose", empresa: "Ferreteria Audias", email: "joseaudiasb@gmail.com", telefono: "+50558154026" },
  { nombre: "Yahoska", empresa: "Ferretería El Norteño", email: null, telefono: "+50586909151" },
  { nombre: "Jessy", empresa: "Ferretería Masis", email: "anajhosselyngarcia@gmail.com", telefono: "+50582185913" },
  { nombre: "Dora", empresa: "Ferretería Bendaña", email: "dorahaydee1@icloud.com", telefono: "+50578331589" },
  { nombre: "Rafael", empresa: "Rafael Alfaro", email: "jezzennia13@gmail.com", telefono: "+50585391299" },
  { nombre: "Julissa", empresa: "Materiales de Construcción July", email: "aracellylopezcana1982@gmail.com", telefono: "+50587862891" },
  { nombre: "Owen", empresa: "Comercial Suárez", email: "suarezowen12@gmail.com", telefono: "+50586933528" },
  { nombre: "Isidro", empresa: "Ferreteria Reyes", email: null, telefono: "+50581002200" }
];

function generateUniqueToken() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `inv_${Date.now().toString(36)}_${rand}`;
}

async function run() {
  console.log(`=== INICIO DE IMPORTACIÓN ADITIVA: FUTEC ===`);
  console.log(`Total de contactos a procesar: ${rawFutecList.length}`);

  // 1. Consultar invitaciones existentes para verificar conteos y duplicados
  const colRef = collection(db, 'events/2026/directInvites');
  const snapBefore = await getDocs(colRef);
  console.log(`Total actual de invitaciones en la base de datos: ${snapBefore.size}`);

  const existingFutec = [];
  const allExistingPhones = new Set();
  const allExistingEmails = new Set();

  snapBefore.forEach(docSnap => {
    const data = docSnap.data();
    if (data.sponsorId === 'futec' || (data.sponsorName && data.sponsorName.toLowerCase().includes('futec'))) {
      existingFutec.push({ id: docSnap.id, ...data });
    }
    if (data.telefono) allExistingPhones.add(data.telefono.replace(/\D/g, ''));
    if (data.email) allExistingEmails.add(data.email.toLowerCase().trim());
  });

  console.log(`Invitaciones existentes de FUTEC actualmente: ${existingFutec.length}`);

  // 2. Filtrar duplicados dentro de FUTEC (100% aditivo, nunca sobrescribir)
  const toInsert = [];
  const skipped = [];

  for (const item of rawFutecList) {
    const cleanPhone = item.telefono ? item.telefono.replace(/\D/g, '') : null;
    const cleanEmail = item.email ? item.email.toLowerCase().trim() : null;

    // Verificar si ya existe exactamente en FUTEC
    const alreadyInFutec = existingFutec.some(ex => {
      const exPhone = ex.telefono ? ex.telefono.replace(/\D/g, '') : null;
      const exEmail = ex.email ? ex.email.toLowerCase().trim() : null;
      const phoneMatch = cleanPhone && exPhone && cleanPhone === exPhone;
      const emailMatch = cleanEmail && exEmail && cleanEmail === exEmail;
      return phoneMatch || emailMatch;
    });

    if (alreadyInFutec) {
      skipped.push({ ...item, motivo: 'Ya existe en la lista de FUTEC' });
    } else {
      toInsert.push(item);
    }
  }

  console.log(`Nuevos contactos listos para insertar en FUTEC: ${toInsert.length}`);
  console.log(`Contactos omitidos por duplicidad en FUTEC: ${skipped.length}`);

  if (toInsert.length === 0) {
    console.log('No hay contactos nuevos para agregar.');
    process.exit(0);
  }

  // 3. Inserción atómica en Firestore con WriteBatch
  const batch = writeBatch(db);
  const inserted = [];

  for (const item of toInsert) {
    const tokenId = generateUniqueToken();
    const docRef = doc(db, 'events/2026/directInvites', tokenId);

    const docData = {
      token: tokenId,
      nombre: item.nombre.trim(),
      empresa: item.empresa.trim(),
      email: item.email ? item.email.trim().toLowerCase() : null,
      telefono: item.telefono ? item.telefono.trim() : null,
      sponsorId: 'futec',
      sponsorName: 'FUTEC',
      sponsorStands: 'Stand 7',
      headerBannerUrl: '/email-header.png',
      footerBannerUrl: '/email-footer.png',
      status: 'pending',
      createdBy: 'admin_bulk_import_futec',
      createdAt: serverTimestamp(),
      isBulkImport: true
    };

    batch.set(docRef, docData);
    inserted.push({
      tokenId,
      nombre: item.nombre,
      empresa: item.empresa,
      telefono: item.telefono,
      email: item.email
    });
  }

  await batch.commit();
  console.log(`✅ ¡Lote de ${inserted.length} invitaciones insertado con éxito en Firestore!`);

  // 4. Verificación de totales post-inserción
  const snapAfter = await getDocs(colRef);
  console.log(`Total actualizado de invitaciones en la base de datos: ${snapAfter.size}`);

  const futecAfter = [];
  snapAfter.forEach(docSnap => {
    const data = docSnap.data();
    if (data.sponsorId === 'futec' || (data.sponsorName && data.sponsorName.toLowerCase().includes('futec'))) {
      futecAfter.push(docSnap.id);
    }
  });
  console.log(`Total actualizado de invitaciones para FUTEC: ${futecAfter.length}`);

  console.log('\n--- DETALLE DE INVITACIONES CREADAS ---');
  inserted.forEach((inv, idx) => {
    console.log(`${idx + 1}. [${inv.tokenId}] ${inv.nombre} (${inv.empresa}) - Tel: ${inv.telefono} - Email: ${inv.email || 'N/A'}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error('Error durante la importación:', err);
  process.exit(1);
});
