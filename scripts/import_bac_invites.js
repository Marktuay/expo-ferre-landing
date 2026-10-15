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

// Lista de 21 contactos enviada por el usuario para BAC:
const rawBacList = [
  { nombre: "Leyla Vanessa", empresa: "MATERIALES DE CONSTRUC.LA FE", email: "leylalopezsevilla@gmail.com", telefono: "50586875839" },
  { nombre: "Jason Antonio", empresa: "FERRETERIA EL ESFUERZO", email: "dayananov82@yahoo.com", telefono: "50588693877" },
  { nombre: "Ronaldo Alberto", empresa: "FERRETER.HERMANOS GONZALEZ GARCIA", email: "gonzalezmonterreyr918@gmail.com", telefono: "50558587310" },
  { nombre: "Christian", empresa: "FERRETER.HERMANOS GONZALEZ GARCIA", email: "christian@eco-risk.net", telefono: "50588550711" },
  { nombre: "Sarai Elizabeth", empresa: "FERRETERÍA SÁNCHEZ #1", email: "guevarasarai601@gmail.com", telefono: "50557029018" },
  { nombre: "Julio Antonio", empresa: "FERRETERÍA SILVA", email: "js93774@gmail.com", telefono: "50589164801" },
  { nombre: "Ana", empresa: "FERRETERIA M Y R", email: "riveramolinarese@yahoo.es", telefono: "50586839640" },
  { nombre: "Vielka Dayana", empresa: "FERRETERIA LA GALO", email: "vidamarcela1980@gmail.com", telefono: "50581508129" },
  { nombre: "Oscar Isaac", empresa: "FERRETERIA JEHOVA JIREH", email: "oscarbravo231083@gmail.com", telefono: "50583957356" },
  { nombre: "Gilberto", empresa: "JOEL BONILLA MAT.DE CONSTRUCCION", email: "bonilla1047@hotmail.com", telefono: "50588401250" },
  { nombre: "Alam Moises", empresa: "MATERIALES DE CONSTRUC.SANCHEZ", email: "alamoises@yahoo.es", telefono: "50583973833" },
  { nombre: "Mirna", empresa: "LA ALFORJA", email: "Samir170905@gmail.com", telefono: "50587716012" },
  { nombre: "Arlen Rebeca", empresa: "FERRETERIA FLORES", email: "rebecafld@yahoo.com", telefono: "50585070274" },
  { nombre: "Andy Manuel", empresa: "HERRAMIENTAS GYP", email: "andygarcia1518@gmail.com", telefono: "50588605382" },
  { nombre: "Karen", empresa: "FERRETERIA YAHOSCA", email: "chevezkaren290@gmail.com", telefono: "50558636107" },
  { nombre: "Brayan", empresa: "FERRETERIA SOTELO", email: null, telefono: "50584757507" },
  { nombre: "Omar", empresa: "ACABADOS&MATERIALES VARGAS", email: "ocarrion01@hotmail.com", telefono: "50557346537" },
  { nombre: "Keyling", empresa: "EL CHELE FERRETERÍA", email: "keylingvargas10@gmail.com", telefono: "50588338524" },
  { nombre: "Daniel", empresa: "IMPORTACIONES BALLADARES", email: "dmartinex91@gmail.com", telefono: "50582572500" },
  { nombre: "Norman", empresa: "FERRETERIA CARO", email: "NORMANARANDA958@GMAIL.COM", telefono: "50587599017" },
  { nombre: "Mariela", empresa: "FERRETERIA SAN JUAN", email: "alvesa072015@gmail.com", telefono: "50587757015" }
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
  console.log(`=== AUDITORÍA Y CARGA DE INVITACIONES DIRECTAS: BAC ===`);
  console.log(`Contactos recibidos para procesar: ${rawBacList.length}`);

  const batch = writeBatch(db);
  const insertedDetails = [];

  for (const item of rawBacList) {
    const tokenId = generateUniqueToken();
    const docRef = doc(db, 'events/2026/directInvites', tokenId);
    const backupRef = doc(db, 'events/2026/directInvites_backup', tokenId);

    const docData = {
      token: tokenId,
      nombre: item.nombre.trim(),
      empresa: (item.empresa || 'Invitado BAC').trim(),
      email: item.email && item.email.toLowerCase() !== 'n/a' ? item.email.trim().toLowerCase() : null,
      telefono: formatPhoneE164(item.telefono),
      sponsorId: 'bac',
      sponsorName: 'BAC',
      sponsorStands: 'Stand 31',
      headerBannerUrl: 'https://cdn.jsdelivr.net/gh/Marktuay/expo-ferre-landing@main/public/headers/BAC.png',
      footerBannerUrl: 'https://expoferrenicaragua.com/email-footer.png',
      status: 'pending',
      createdBy: 'admin_bulk_import_bac',
      createdAt: serverTimestamp(),
      isBulkImport: true
    };

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
  console.log(`\n✅ ¡${insertedDetails.length} invitaciones insertadas y respaldadas exitosamente para BAC!`);

  console.log('\n--- DETALLE DE INVITACIONES CREADAS ---');
  insertedDetails.forEach((inv, idx) => {
    console.log(`${idx + 1}. [${inv.tokenId}] ${inv.nombre} | ${inv.empresa} | ${inv.telefono} | ${inv.email}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error('Error durante la inserción:', err);
  process.exit(1);
});
