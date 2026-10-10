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

const rawCemexList = [
  { nombre: "Uriel Agustín", empresa: "Ferretería Diana", email: "urielpg83@hotmail.com", telefono: "+50584691311" },
  { nombre: "Martha Lorena", empresa: "Ferretería Diana", email: "urielpg83@hotmail.com", telefono: "+50584577742" },
  { nombre: "Patricia Mercedes", empresa: "Ferretería Valle", email: "blandonpatricia@hotmail.com", telefono: "+50589532752" },
  { nombre: "Francisco José", empresa: "Ferretería Valle", email: "fcorivera70@hotmail.com", telefono: "+50578720351" },
  { nombre: "Francisco Javier", empresa: "MC Pinos del Norte", email: "fcoleon1970@gmail.com", telefono: null },
  { nombre: "Carmen Irene", empresa: "MC Pinos del Norte", email: "fcoleon1970@gmail.com", telefono: null },
  { nombre: "Marvin Antonio", empresa: "Pinturas Meneses", email: "xavarbell85@hotmail.com", telefono: "+50584913575" },
  { nombre: "Javiera María", empresa: "Pinturas Meneses", email: "xavarbell85@hotmail.com", telefono: "+50587083498" },
  { nombre: "Luis Carlos", empresa: "Ferretería Ubeda", email: "lcua13@gmail.com", telefono: "+50585335454" },
  { nombre: "Gabriela José", empresa: "Ferretería Ubeda", email: "lcua13@gmail.com", telefono: "+50585335454" },
  { nombre: "Jacqueline", empresa: "Materiales de Construcción Martínez", email: "josemart8805@gmail.com", telefono: "+50584782985" },
  { nombre: "José Dolores", empresa: "Materiales de Construcción Martínez", email: "josemart8805@gmail.com", telefono: "+50588059421" },
  { nombre: "Francisco Xavier", empresa: "Ferretería Sacasa", email: "123sacasa@gmail.com", telefono: "+50558338979" },
  { nombre: "Andru Dehymon", empresa: "Ferretería Sacasa", email: "123sacasa@gmail.com", telefono: "+50558338979" },
  { nombre: "Julio", empresa: "Ferretería Digna", email: "ferreteriadigna@gmail.com", telefono: "+50583381432" },
  { nombre: "Digna María", empresa: "Ferretería Digna", email: "ferreteriadigna@gmail.com", telefono: "+50583381432" },
  { nombre: "Carlos Arturo", empresa: "Comercial Cruz", email: "casc41@yahoo.es", telefono: "+50582387867" },
  { nombre: "Isayana Valeria", empresa: "Comercial Cruz", email: "casc41@yahoo.es", telefono: "+50582387867" },
  { nombre: "Andrea Mercedes", empresa: "Ferretería Briohogar", email: "andreabriones69@gmail.com", telefono: "+50586887094" },
  { nombre: "Julia Magdalena", empresa: "Ferretería Briohogar", email: "andreabriones69@gmail.com", telefono: "+50588071916" }
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
  console.log(`=== INICIO DE IMPORTACIÓN ADITIVA: CEMEX ===`);
  console.log(`Total de contactos a procesar: ${rawCemexList.length}`);

  // 1. Consultar invitaciones existentes para verificar conteos y duplicados
  const colRef = collection(db, 'events/2026/directInvites');
  const snapBefore = await getDocs(colRef);
  console.log(`Total actual de invitaciones en la base de datos: ${snapBefore.size}`);

  const existingCemex = [];
  const allExistingPhones = new Map();
  const allExistingEmails = new Map();

  snapBefore.forEach(docSnap => {
    const data = docSnap.data();
    const isCemex = data.sponsorId === 'cemex' || (data.sponsorName && data.sponsorName.toLowerCase().includes('cemex'));
    if (isCemex) {
      existingCemex.push({ id: docSnap.id, ...data });
    }
    if (data.telefono) {
      const p = data.telefono.replace(/\D/g, '');
      if (p) allExistingPhones.set(p, { sponsor: data.sponsorName, nombre: data.nombre, empresa: data.empresa });
    }
    if (data.email) {
      const e = data.email.toLowerCase().trim();
      if (e) allExistingEmails.set(e, { sponsor: data.sponsorName, nombre: data.nombre, empresa: data.empresa });
    }
  });

  console.log(`Invitaciones existentes de CEMEX actualmente: ${existingCemex.length}`);

  // 2. Verificar duplicados dentro de CEMEX y entre otros patrocinadores
  const toInsert = [];
  const skipped = [];
  const crossAlerts = [];

  for (const item of rawCemexList) {
    const cleanPhone = item.telefono ? item.telefono.replace(/\D/g, '') : null;
    const cleanEmail = item.email ? item.email.toLowerCase().trim() : null;

    // Verificar si ya existe exactamente en CEMEX (mismo nombre y empresa/email/teléfono)
    const alreadyInCemex = existingCemex.some(ex => {
      const sameName = ex.nombre && ex.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim();
      const exPhone = ex.telefono ? ex.telefono.replace(/\D/g, '') : null;
      const exEmail = ex.email ? ex.email.toLowerCase().trim() : null;
      const phoneMatch = cleanPhone && exPhone && cleanPhone === exPhone;
      const emailMatch = cleanEmail && exEmail && cleanEmail === exEmail;
      return sameName && (phoneMatch || emailMatch);
    });

    if (alreadyInCemex) {
      skipped.push({ ...item, motivo: 'Ya existe en la lista de CEMEX' });
    } else {
      toInsert.push(item);
    }

    // Verificar si coincide con otro patrocinador (para alertar al organizador si aplica)
    if (cleanPhone && allExistingPhones.has(cleanPhone)) {
      const prev = allExistingPhones.get(cleanPhone);
      if (prev.sponsor && !prev.sponsor.toLowerCase().includes('cemex')) {
        crossAlerts.push({
          contacto: `${item.nombre} (${item.empresa})`,
          campo: `Teléfono: ${item.telefono}`,
          otroPatrocinador: `${prev.sponsor} (${prev.nombre} - ${prev.empresa})`
        });
      }
    }
    if (cleanEmail && allExistingEmails.has(cleanEmail)) {
      const prev = allExistingEmails.get(cleanEmail);
      if (prev.sponsor && !prev.sponsor.toLowerCase().includes('cemex')) {
        crossAlerts.push({
          contacto: `${item.nombre} (${item.empresa})`,
          campo: `Email: ${item.email}`,
          otroPatrocinador: `${prev.sponsor} (${prev.nombre} - ${prev.empresa})`
        });
      }
    }
  }

  if (crossAlerts.length > 0) {
    console.log(`\n⚠️ ALERTA DE COINCIDENCIAS CON OTROS PATROCINADORES (${crossAlerts.length}):`);
    crossAlerts.forEach((al, i) => {
      console.log(`  ${i + 1}. ${al.contacto} [${al.campo}] ya figura en: ${al.otroPatrocinador}`);
    });
  }

  console.log(`\nNuevos contactos listos para insertar en CEMEX: ${toInsert.length}`);
  console.log(`Contactos omitidos por duplicidad exacta en CEMEX: ${skipped.length}`);

  if (toInsert.length === 0) {
    console.log('No hay contactos nuevos para agregar a CEMEX.');
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
      sponsorId: 'cemex',
      sponsorName: 'CEMEX',
      sponsorStands: 'Stands 22, 23',
      headerBannerUrl: '/email-header.png',
      footerBannerUrl: '/email-footer.png',
      status: 'pending',
      createdBy: 'admin_bulk_import_cemex',
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
  console.log(`\n✅ ¡Lote de ${inserted.length} invitaciones insertado con éxito en Firestore!`);

  // 4. Verificación de totales post-inserción
  const snapAfter = await getDocs(colRef);
  console.log(`Total actualizado de invitaciones en la base de datos: ${snapAfter.size}`);

  const cemexAfter = [];
  snapAfter.forEach(docSnap => {
    const data = docSnap.data();
    if (data.sponsorId === 'cemex' || (data.sponsorName && data.sponsorName.toLowerCase().includes('cemex'))) {
      cemexAfter.push(docSnap.id);
    }
  });
  console.log(`Total actualizado de invitaciones para CEMEX: ${cemexAfter.length}`);

  console.log('\n--- DETALLE DE INVITACIONES CREADAS ---');
  inserted.forEach((inv, idx) => {
    console.log(`${idx + 1}. [${inv.tokenId}] ${inv.nombre} (${inv.empresa}) - Tel: ${inv.telefono || 'Sin teléfono'} - Email: ${inv.email || 'N/A'}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error('Error durante la importación:', err);
  process.exit(1);
});
